
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  playerId: string | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null, playerId: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    // Generate or retrieve persistent Player ID
    let storedId = localStorage.getItem('bingo_playerId');
    if (!storedId) {
      storedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('bingo_playerId', storedId);
    }
    setPlayerId(storedId);

    // Initialize the socket
    const socketInstance = io({
      path: "/api/socket",
      addTrailingSlash: false,
    });

    // Ensure the API route is hit to start the server
    fetch('/api/socket').catch(err => console.error("Failed to init socket server", err));

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      // Do not overwrite persistent ID with socket ID
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, playerId }}>
      {children}
    </SocketContext.Provider>
  );
};
