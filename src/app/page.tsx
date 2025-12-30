"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/lib/socket-context";
import { getInitialNumbers, BINGO_COLUMNS } from "@/lib/config";
import PlayerCardPanel from "@/components/PlayerCardPanel";
import PlayerSubmissionPanel from "@/components/PlayerSubmissionPanel";

// Define interfaces directly in the component or import them if they are shared
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

interface BingoCard {
    numbers: number[];
}

interface Player {
    id: string;
    card?: BingoCard;
    cardImage?: string;
}

export default function Home() {
    const { socket, playerId } = useSocket();
    const [gameState, setGameState] = useState<GameState>({
        drawnNumbers: [],
        remainingNumbers: getInitialNumbers(),
        lastDrawnNumber: null,
        winningPatterns: {
            full_card: true,
            four_corners: true,
            quina: { enabled: true, horizontal: true, vertical: true, diagonal: true },
            terco: { enabled: true, horizontal: true, vertical: true, diagonal: true }
        }
    });
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [audioToPlay, setAudioToPlay] = useState<string | null>(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [password, setPassword] = useState('');
    const [verifiedPassword, setVerifiedPassword] = useState('');

    const [isPlayerPanelOpen, setIsPlayerPanelOpen] = useState(false);
    const [player, setPlayer] = useState<Player | null>(null);


    useEffect(() => {
        if (socket) {
            socket.on('gameState', (newGameState: GameState) => {
                setGameState(newGameState);
            });

            socket.on('numberDrawn', (data: { drawnNumber: number; gameState: GameState }) => {
                setGameState(data.gameState);
                if (soundEnabled) {
                    setAudioToPlay(`/audio/${data.drawnNumber}.wav`);
                }
            });

            socket.on('gameReset', (newGameState: GameState) => {
                setGameState(newGameState);
                setAudioToPlay(null);
            });

            socket.on('error', (err: { message: string }) => {
                console.error("Socket error:", err);
                if (err.message === "Unauthorized") {
                    alert("Sessão expirada ou senha incorreta. Por favor faça login novamente.");
                    setIsAdmin(false);
                    setVerifiedPassword('');
                }
            });

            // Listen for updates on the current player
            socket.on('playerUpdated', (updatedPlayer: Player) => {
                if (updatedPlayer.id === playerId) {
                    setPlayer(updatedPlayer);
                }
            });

            // Request current player's data when socket connects
            if (playerId) {
                socket.emit('getPlayer', playerId, (playerData: Player) => {
                    setPlayer(playerData);
                });
            }

            return () => {
                socket.off('gameState');
                socket.off('numberDrawn');
                socket.off('gameReset');
                socket.off('playerUpdated');
                socket.off('error');
            };
        }
    }, [socket, soundEnabled, playerId]);


    useEffect(() => {
        if (audioToPlay) {
            const audio = new Audio(audioToPlay);
            audio.play().catch(e => console.error("Error playing audio:", e));
            setAudioToPlay(null);
        }
    }, [audioToPlay]);

    const drawNumber = useCallback(() => {
        console.log("drawNumber called. isAdmin:", isAdmin, "Socket:", socket?.connected);

        if (!socket) {
            alert("Erro: Socket não inicializado.");
            return;
        }
        if (!socket.connected) {
            alert("Erro: Socket desconectado. Tente recarregar a página.");
            return;
        }
        if (!isAdmin) {
            alert("Erro: Você não é admin.");
            return;
        }

        console.log("Emitting drawNumber with password:", verifiedPassword);
        socket.emit('drawNumber', { password: verifiedPassword });
    }, [socket, isAdmin, verifiedPassword]);

    const resetGame = useCallback(() => {
        if (socket && isAdmin && confirm("Are you sure you want to reset the game? This will clear all player cards.")) {
            socket.emit('resetGame', { password: verifiedPassword });
        }
    }, [socket, isAdmin, verifiedPassword]);


    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => !prev);
    }, []);

    const replayAudio = useCallback(() => {
        if (gameState.lastDrawnNumber !== null) {
            setAudioToPlay(`/audio/${gameState.lastDrawnNumber}.wav`);
        }
    }, [gameState.lastDrawnNumber]);


    const handleAdminLogin = () => {
        // In a real application, this would be a proper authentication request
        if (password === 'admin') {
            setIsAdmin(true);
            setVerifiedPassword(password);
            setShowAdminLogin(false);
            setPassword('');
        } else {
            alert('Incorrect password');
        }
    };


    // Calculate statistics for the sidebar
    const stats = Object.fromEntries(
        Object.keys(BINGO_COLUMNS).map(label => [label, 0])
    );
    gameState.drawnNumbers.forEach(number => {
        for (const label in BINGO_COLUMNS) {
            const [start, end] = BINGO_COLUMNS[label];
            if (number >= start && number <= end) {
                stats[label]++;
                break;
            }
        }
    });

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-900 text-white font-sans">
            {/* Sidebar / Controls */}
            <aside className="lg:w-1/4 p-4 bg-gray-800 shadow-lg flex flex-col space-y-4">
                <h1 className="text-3xl font-bold text-center mb-4">Bingo Online 🎰</h1>

                {/* Last Number Display */}
                <div className="last-number-container-custom">
                    <h2 className="text-xl font-semibold">Último Número</h2>
                    <p className="text-6xl font-bold">{gameState.lastDrawnNumber !== null ? gameState.lastDrawnNumber : '-'}</p>
                </div>

                <p className="text-lg">Números restantes: {gameState.remainingNumbers.length}</p>

                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                        checked={soundEnabled}
                        onChange={toggleSound}
                    />
                    <span className="label-text text-lg">Habilitar som</span>
                </label>

                <div className="text-xs text-gray-400">
                    STATUS: {socket && socket.connected ? <span className="text-green-500">CONECTADO ({socket.id})</span> : <span className="text-red-500">DESCONECTADO</span>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={drawNumber}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-xl transition-colors disabled:opacity-50"
                        disabled={!isAdmin || gameState.remainingNumbers.length === 0}
                    >
                        Sortear
                    </button>
                    <button
                        onClick={replayAudio}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg text-xl transition-colors disabled:opacity-50"
                        disabled={gameState.lastDrawnNumber === null}
                    >
                        Repetir
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    <button
                        onClick={resetGame}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
                        disabled={!isAdmin}
                    >
                        Resetar
                    </button>
                </div>

                {/* Admin Login */}
                {!isAdmin && (
                    <div className="mt-4">
                        <button onClick={() => setShowAdminLogin(!showAdminLogin)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">
                            Login (Admin)
                        </button>
                        {showAdminLogin && (
                            <div className="mt-2 p-4 bg-gray-700 rounded-lg">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 rounded bg-gray-800 text-white"
                                    placeholder="Password"
                                />
                                <button onClick={handleAdminLogin} className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                                    Entrar
                                </button>
                            </div>
                        )}
                    </div>
                )}


                {/* Statistics Section */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <h3 className="text-2xl font-semibold mb-3 text-center">Estatísticas</h3>
                    <div className="grid grid-cols-5 gap-2 text-center">
                        {Object.entries(stats).map(([label, count]) => (
                            <div key={label} className="bg-gray-700 p-2 rounded-md">
                                <p className="font-bold text-lg">{label}</p>
                                <p className="text-xl">{count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Floating Toggle Button for Player Card */}
            <button
                onClick={() => setIsPlayerPanelOpen(!isPlayerPanelOpen)}
                className={`fixed right-0 bottom-8 bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-l-full shadow-2xl transition-transform duration-300 z-[60] flex items-center justify-center hover:pr-6 group ${isPlayerPanelOpen ? 'translate-x-[calc(4rem-100vw)] md:-translate-x-[28rem]' : ''
                    }`}
                title={isPlayerPanelOpen ? "Fechar Minha Cartela" : "Abrir Minha Cartela"}
            >
                <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="3" y1="15" x2="21" y2="15" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                        <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                    <span className="text-[10px] uppercase font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-14 bg-black/80 px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                        {isPlayerPanelOpen ? 'Fechar' : 'Minha Cartela'}
                    </span>
                </div>
            </button>

            {/* Main Content / Bingo Grid */}
            <main className="flex-1 p-4 flex flex-col items-center">
                <h2 className="text-3xl font-bold mb-6">Tabela de Números</h2>
                <div className="w-full max-w-5xl">
                    {Object.entries(BINGO_COLUMNS).map(([label, [start, end]]) => (
                        <div key={label} className="flex items-center mb-2">
                            <div className="bingo-label-custom bg-gray-700 rounded-full mr-2 shadow-md">
                                {label}
                            </div>
                            <div className="flex flex-wrap flex-1 gap-1">
                                {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(number => {
                                    const isDrawn = gameState.drawnNumbers.includes(number);
                                    const isLast = number === gameState.lastDrawnNumber;

                                    return (
                                        <div
                                            key={number}
                                            className={`
                                                w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold shadow-md
                                                ${isDrawn ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}
                                                ${isLast ? 'ring-4 ring-yellow-300 ring-offset-2 ring-offset-gray-900' : ''}
                                            `}
                                        >
                                            {number}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Drawn Numbers Display */}
                {gameState.drawnNumbers.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-700 w-full max-w-5xl">
                        <h2 className="text-3xl font-bold mb-4 text-center">Números Sorteados</h2>
                        <div className="flex flex-wrap justify-center gap-2">
                            {gameState.drawnNumbers.sort((a, b) => a - b).map(number => (
                                <div
                                    key={`drawn-${number}`}
                                    className="w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold bg-yellow-500 text-black shadow-md"
                                >
                                    {number}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            {/* Sliding Drawer Panel */}
            <div
                className={`fixed right-0 top-0 h-full w-full md:w-[28rem] bg-gray-800 shadow-2xl transform transition-transform duration-300 z-50 ${isPlayerPanelOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Close Button Header - visible mainly on mobile or as standard UI */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Minha Cartela</h2>
                    <button onClick={() => setIsPlayerPanelOpen(false)} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="h-[calc(100%-60px)] overflow-y-auto">
                    {player?.card
                        ? <PlayerCardPanel drawnNumbers={gameState.drawnNumbers} patterns={gameState.winningPatterns} />
                        : <PlayerSubmissionPanel onClose={() => setIsPlayerPanelOpen(false)} />
                    }
                </div>
            </div>
        </div>
    );
}

