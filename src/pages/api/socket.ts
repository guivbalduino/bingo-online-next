import { Server, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'game-state.json');

const saveGame = (state: GameState) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save game state:", err);
  }
};

const loadGame = (): GameState => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load game state:", err);
  }
  return {
    drawnNumbers: [],
    remainingNumbers: Array.from({ length: 75 }, (_, i) => i + 1),
    lastDrawnNumber: null,
    winningPatterns: {
      full_card: true,
      four_corners: true,
      quina: { enabled: true, horizontal: true, vertical: true, diagonal: true },
      terco: { enabled: true, horizontal: true, vertical: true, diagonal: true }
    },
    players: {}
  };
};

// Add a custom property to the Socket server interface
interface SocketServer extends HTTPServer {
  io?: Server;
}

// Add a custom property to the NextApiResponse interface
interface SocketResponse extends NextApiResponse {
  socket: NetSocket & {
    server: SocketServer;
  };
}

// Game state interfaces
// Game state interfaces
interface Player {
  id: string;
  socketId: string;
  name: string;
  card?: BingoCard;
  cardImage?: string;
  online: boolean;
}

interface BingoCard {
  numbers: number[];
}

interface DirectionalPattern {
  enabled: boolean;
  horizontal: boolean;
  vertical: boolean;
  diagonal: boolean;
}

interface WinningPatternsConfig {
  full_card: boolean;
  four_corners: boolean;
  quina: DirectionalPattern;
  terco: DirectionalPattern;
}

interface GameState {
  drawnNumbers: number[];
  remainingNumbers: number[];
  lastDrawnNumber: number | null;
  winningPatterns: WinningPatternsConfig;
  players: Record<string, Player>; // Persistence
}

// In-memory "database"
let players = new Map<string, Player>();
const socketToPlayerId = new Map<string, string>();

// Helper to handle loading with legacy check
const loadInitialState = (): GameState => {
  const state = loadGame();

  // Migration logic: Check if pattern config is missing or uses old boolean format
  if (!state.winningPatterns || typeof (state.winningPatterns as any).quina === 'boolean') {
    state.winningPatterns = {
      full_card: true,
      four_corners: true,
      quina: { enabled: true, horizontal: true, vertical: true, diagonal: true },
      terco: { enabled: true, horizontal: true, vertical: true, diagonal: true }
    };
  }

  // Load players from state
  if (state.players) {
    Object.values(state.players).forEach(p => {
      // Reset socketId and online status on load
      p.online = false;
      players.set(p.id, p);
    });
  } else {
    state.players = {};
  }

  return state;
};

let gameState: GameState = loadInitialState();

const persistState = () => {
  // Convert Map to Record
  gameState.players = Object.fromEntries(players);
  saveGame(gameState);
};

export default function socketHandler(req: NextApiRequest, res: SocketResponse) {
  if (res.socket.server.io) {
    // console.log("Socket is already running");
    res.end();
    return;
  }

  console.log("Setting up Socket.IO");
  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
  });
  res.socket.server.io = io;

  io.on("connection", (socket: Socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on("registerPlayer", (data: { playerId: string, name?: string }) => {
      const { playerId, name } = data;
      let player = players.get(playerId);
      let isNew = false;

      if (player) {
        // Reconnection
        console.log(`Player reconnected: ${player.name} (${playerId})`);
        player.socketId = socket.id;
        player.online = true;
        if (name) player.name = name;
      } else {
        // New Player
        console.log(`New player attempt: ${playerId}`);
        isNew = true;
        player = {
          id: playerId,
          socketId: socket.id,
          name: name || `Jogador ${playerId.slice(0, 4)}`,
          online: true
        };
        players.set(playerId, player);
      }

      socketToPlayerId.set(socket.id, playerId);
      persistState();

      // Send current state to THIS client
      socket.emit("gameState", gameState);
      socket.emit("players", Array.from(players.values()));

      // Broadcast
      if (isNew) {
        socket.broadcast.emit("newPlayer", player);
      } else {
        io.emit("playerUpdated", player);
      }
    });

    socket.on("disconnect", () => {
      const playerId = socketToPlayerId.get(socket.id);
      if (playerId) {
        const player = players.get(playerId);
        if (player) {
          player.online = false;
          io.emit("playerUpdated", player);
          persistState();
          console.log(`Player offline: ${player.name}`);
        }
        socketToPlayerId.delete(socket.id);
      }
    });

    socket.on("drawNumber", (data?: { password?: string }) => {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
      if (data?.password !== adminPassword) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      if (gameState.remainingNumbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * gameState.remainingNumbers.length);
        const drawnNumber = gameState.remainingNumbers[randomIndex];

        gameState.drawnNumbers.push(drawnNumber);
        gameState.remainingNumbers = gameState.remainingNumbers.filter(
          (n) => n !== drawnNumber
        );
        gameState.lastDrawnNumber = drawnNumber;

        persistState();

        io.emit("numberDrawn", {
          drawnNumber,
          gameState,
        });
      }
    });

    socket.on("resetGame", (data?: { password?: string }) => {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
      if (data?.password !== adminPassword) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      gameState.drawnNumbers = [];
      gameState.remainingNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
      gameState.lastDrawnNumber = null;

      // Reset cards but KEEP players and names
      players.forEach(p => {
        p.card = undefined;
        p.cardImage = undefined;
      });
      persistState();

      io.emit("gameReset", gameState);
      io.emit("players", Array.from(players.values()));
    });

    socket.on("updatePatterns", (data: { password?: string, patterns: WinningPatternsConfig }) => {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
      if (data?.password !== adminPassword) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }
      gameState.winningPatterns = data.patterns;
      persistState();
      io.emit("gameState", gameState);
    });

    socket.on("updateCard", (cardData: { card: BingoCard, cardImage: string, name?: string }) => {
      const playerId = socketToPlayerId.get(socket.id);
      if (playerId) {
        const player = players.get(playerId);
        if (player) {
          player.card = cardData.card;
          player.cardImage = cardData.cardImage;
          if (cardData.name) player.name = cardData.name;

          io.emit("playerUpdated", player);
          persistState();
        }
      }
    });

  });

  res.end();
}

