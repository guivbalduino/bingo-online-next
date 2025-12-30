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
    }
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
interface Player {
  id: string;
  card?: BingoCard;
  cardImage?: string;
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
}

// In-memory "database"
const players = new Map<string, Player>();

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
  return state;
};

let gameState: GameState = loadInitialState();

export default function socketHandler(req: NextApiRequest, res: SocketResponse) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
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
    console.log(`New client connected: ${socket.id}`);

    // Create a new player
    const newPlayer: Player = { id: socket.id };
    players.set(socket.id, newPlayer);

    // Send the current game state to the new client
    socket.emit("gameState", gameState);
    // Send the current list of players to the new client
    socket.emit("players", Array.from(players.values()));
    // Broadcast the new player to all other clients
    socket.broadcast.emit("newPlayer", newPlayer);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      players.delete(socket.id);
      io.emit("playerDisconnected", socket.id);
    });

    socket.on("drawNumber", (data?: { password?: string }) => {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
      if (data?.password !== adminPassword) {
        console.log(`Unauthorized draw attempt from ${socket.id}`);
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      console.log("Command received: drawNumber");
      if (gameState.remainingNumbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * gameState.remainingNumbers.length);
        const drawnNumber = gameState.remainingNumbers[randomIndex];

        gameState.drawnNumbers.push(drawnNumber);
        gameState.remainingNumbers = gameState.remainingNumbers.filter(
          (n) => n !== drawnNumber
        );
        gameState.lastDrawnNumber = drawnNumber;

        console.log(`Number drawn: ${drawnNumber}, Remaining: ${gameState.remainingNumbers.length}`);

        saveGame(gameState);

        io.emit("numberDrawn", {
          drawnNumber,
          gameState,
        });
      } else {
        console.log("No numbers remaining to draw.");
      }
    });

    socket.on("resetGame", (data?: { password?: string }) => {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
      if (data?.password !== adminPassword) {
        console.log(`Unauthorized reset attempt from ${socket.id}`);
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      console.log("Command received: resetGame");
      gameState = {
        drawnNumbers: [],
        remainingNumbers: Array.from({ length: 75 }, (_, i) => i + 1),
        lastDrawnNumber: null,
        winningPatterns: gameState.winningPatterns
      };
      // also clear all player cards
      players.forEach(p => {
        p.card = undefined;
        p.cardImage = undefined;
      });

      saveGame(gameState);

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
      saveGame(gameState);
      io.emit("gameState", gameState);
    });

    socket.on("getPlayer", (playerId: string, callback: (player: Player | null) => void) => {
      const player = players.get(playerId);
      callback(player ?? null);
    });

    socket.on("updateCard", (cardData: { card: BingoCard, cardImage: string }) => {
      const player = players.get(socket.id);
      if (player) {
        player.card = cardData.card;
        player.cardImage = cardData.cardImage;
        io.emit("playerUpdated", player);
      }
    });

  });

  res.end();
}

