"use client";

import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket-context';
import WinningPatternStats from '@/components/WinningPatternStats';

// Interfaces should be shared, but for simplicity, we define them here again
interface BingoCard {
    numbers: number[];
}

interface Player {
    id: string;
    card?: BingoCard;
    cardImage?: string;
    name?: string;
    online?: boolean;
}

interface DirectionalPattern {
    enabled: boolean;
    horizontal: boolean;
    vertical: boolean;
    diagonal: boolean;
}

interface GameState {
    drawnNumbers: number[];
    remainingNumbers: number[];
    lastDrawnNumber: number | null;
    winningPatterns: {
        full_card: boolean;
        four_corners: boolean;
        quina: DirectionalPattern;
        terco: DirectionalPattern;
    };
}

export default function AdminPage() {
    const { socket } = useSocket();
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [verifiedPassword, setVerifiedPassword] = useState('');
    const [showSettings, setShowSettings] = useState(false);






    useEffect(() => {
        // Aggressive persistence check
        const checkAuth = () => {
            const local = localStorage.getItem('admin_password');
            const session = sessionStorage.getItem('admin_password');

            if (local) return local;
            if (session) return session;

            // Check cookies as last resort
            if (document.cookie.includes('admin_session=true')) {
                // return 'admin'; // Assume default if cookie exists but no pass? Risky.
            }
            return null;
        };

        const stored = checkAuth();
        if (stored) {
            setVerifiedPassword(stored);
            setIsAuthenticated(true);

            // Sync storages
            if (!localStorage.getItem('admin_password')) localStorage.setItem('admin_password', stored);
            if (!sessionStorage.getItem('admin_password')) sessionStorage.setItem('admin_password', stored);
        }
    }, []);

    useEffect(() => {
        if (socket) {
            // Request initial data
            socket.on('players', (allPlayers: Player[]) => {
                setPlayers(allPlayers);
            });
            socket.on('gameState', (initialGameState: GameState) => {
                setGameState(initialGameState);
            });

            socket.on('newPlayer', (newPlayer: Player) => {
                setPlayers(prev => [...prev, newPlayer]);
            });

            socket.on('playerUpdated', (updatedPlayer: Player) => {
                setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
            });

            socket.on('playerDisconnected', (playerId: string) => {
                setPlayers(prev => prev.filter(p => p.id !== playerId));
            });

            socket.on('numberDrawn', (data: { gameState: GameState }) => {
                setGameState(data.gameState);
            });

            socket.on('gameReset', (newGameState: GameState) => {
                setGameState(newGameState);
                // Reload players as their cards are cleared on the server
                socket.emit('getPlayers');
            });


            return () => {
                socket.off('players');
                socket.off('newPlayer');
                socket.off('playerUpdated');
                socket.off('playerDisconnected');
                socket.off('gameState');
                socket.off('numberDrawn');
                socket.off('gameReset');
            };
        }
    }, [socket]);

    const handleAuth = () => {
        const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin';
        if (password === 'admin' || password === adminPass) {

            // Save everywhere to be sure
            try {
                localStorage.setItem('admin_password', password);
                sessionStorage.setItem('admin_password', password);
            } catch (e) {
                console.error("Storage failed", e);
            }
            document.cookie = "admin_session=true; path=/; max-age=31536000";

            setVerifiedPassword(password);
            setIsAuthenticated(true);
            setPassword('');
        } else {
            alert('Incorrect password');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="p-8 bg-gray-800 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 rounded bg-gray-700 text-white"
                        placeholder="Password"
                    />
                    <button onClick={handleAuth} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                        Enter
                    </button>
                </div>
            </div>
        );
    }


    const togglePattern = (category: string, subKey?: string) => {
        if (!gameState || !socket || !isAuthenticated) return;

        const currentPatterns = gameState.winningPatterns;
        const newPatterns = { ...currentPatterns };
        const target = newPatterns[category as keyof typeof newPatterns];

        if (typeof target === 'boolean') {
            // Simple pattern (full_card, four_corners)
            // @ts-ignore
            newPatterns[category] = !target;
        } else if (typeof target === 'object') {
            // Complex pattern (quina, terco)
            if (subKey) {
                // @ts-ignore
                newPatterns[category] = {
                    ...target,
                    [subKey]: !target[subKey as keyof typeof target]
                };
            } else {
                // Toggle main enabled
                // @ts-ignore
                newPatterns[category] = {
                    ...target,
                    enabled: !target.enabled
                };
            }
        }

        socket.emit('updatePatterns', { password: verifiedPassword, patterns: newPatterns });
    };

    const drawNumber = () => {
        if (socket && isAuthenticated) {
            socket.emit('drawNumber', { password: verifiedPassword });
        }
    };

    const resetGame = () => {
        if (socket && isAuthenticated && confirm("Tem certeza que deseja resetar o jogo?")) {
            socket.emit('resetGame', { password: verifiedPassword });
        }
    };

    const renderPlayerCard = (player: Player) => {
        if (!player.card) {
            return (
                <div className="text-center p-4">
                    <p className="text-gray-400">No card submitted</p>
                </div>
            )
        }

        const gridItems: (number | 'FREE')[] = [
            ...player.card.numbers.slice(0, 12),
            'FREE',
            ...player.card.numbers.slice(12)
        ];

        return (
            <div className="grid grid-cols-5 gap-1">
                {gridItems.map((item, index) => {
                    if (item === 'FREE') {
                        return (
                            <div key="free" className="w-10 h-10 flex items-center justify-center rounded-md font-bold bg-green-600 text-white shadow-sm text-xs">
                                FREE
                            </div>
                        );
                    }
                    const isDrawn = gameState?.drawnNumbers.includes(item);
                    return (
                        <div key={index} className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-bold ${isDrawn ? 'bg-green-500' : 'bg-gray-600'}`}>
                            {item}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                    <p className="text-gray-400">View all player cards and game stats.</p>
                </div>

            </header>

            <main className="flex-1 flex flex-col gap-8">



                <div className="w-full bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4">Player Cards ({players.filter(p => p.card).length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {players.map(player => (
                            <div key={player.id} className="bg-gray-700 rounded-lg p-4 flex flex-col gap-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{player.name || `Jogador ${player.id.slice(0, 4)}`}</h3>
                                        <p className="text-xs text-gray-400 truncate w-40" title={player.id}>ID: {player.id}</p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${player.online !== false ? 'bg-green-500' : 'bg-red-500'}`} title={player.online !== false ? "Online" : "Offline"} />
                                </div>
                                {player.cardImage && (
                                    <div className="w-full h-40 overflow-hidden rounded-md">
                                        <img src={player.cardImage} alt="Player Card" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {renderPlayerCard(player)}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-3xl bg-gray-800 p-6 rounded-lg shadow-lg self-center">
                    <h2 className="text-2xl font-semibold mb-4 text-center">Drawn Numbers ({gameState?.drawnNumbers.length ?? 0})</h2>
                    {gameState && gameState.drawnNumbers.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-2">
                            {gameState.drawnNumbers.slice().sort((a, b) => a - b).map(num => (
                                <div key={num} className="w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold bg-yellow-500 text-black shadow-md">
                                    {num}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400">Waiting for the game to start...</p>
                    )}
                </div>
            </main>
            {/* Fixed Gear Button */}
            <button
                onClick={() => setShowSettings(!showSettings)}
                className={`fixed top-6 right-6 z-[60] bg-gray-800 p-3 rounded-full shadow-2xl border border-purple-500 hover:bg-gray-700 hover:border-purple-400 transition-all duration-300 hover:rotate-90 group ${showSettings ? 'translate-x-[calc(4rem-100vw)] md:-translate-x-[32rem]' : ''}`}
                title={showSettings ? "Fechar Configurações" : "Abrir Configurações"}
            >
                {showSettings ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400 group-hover:text-purple-300 shadow-inner" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400 group-hover:text-purple-300 shadow-inner" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )}
            </button>

            {/* Settings Drawer */}
            <div className={`fixed right-0 top-0 h-full w-full md:w-[32rem] bg-gray-900 shadow-2xl transform transition-transform duration-300 z-50 border-l border-purple-500/30 ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center p-6 border-b border-purple-500/20 bg-gray-800/50 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-3xl text-purple-400 animate-spin-slow">⚙️</span>
                        Configurações
                    </h2>
                    <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 h-[calc(100vh-90px)] overflow-y-auto custom-scrollbar">
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-purple-500/30 shadow-inner">
                        <h3 className="text-lg font-semibold mb-6 text-purple-300 uppercase tracking-wider text-sm border-b border-purple-500/20 pb-2">Padrões de Vitória</h3>

                        {gameState?.winningPatterns ? (
                            <div className="space-y-8">
                                {/* Simple Patterns */}
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex flex-col items-center justify-center cursor-pointer bg-gray-900/80 p-4 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-800 transition-all group h-32">
                                        <input
                                            type="checkbox"
                                            checked={gameState.winningPatterns.full_card}
                                            onChange={() => togglePattern('full_card')}
                                            className="form-checkbox h-6 w-6 text-purple-600 rounded-md bg-gray-800 border-gray-600 mb-3 group-hover:scale-110 transition-transform"
                                        />
                                        <span className="font-bold text-center">Cartela Cheia</span>
                                    </label>
                                    <label className="flex flex-col items-center justify-center cursor-pointer bg-gray-900/80 p-4 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-800 transition-all group h-32">
                                        <input
                                            type="checkbox"
                                            checked={gameState.winningPatterns.four_corners}
                                            onChange={() => togglePattern('four_corners')}
                                            className="form-checkbox h-6 w-6 text-purple-600 rounded-md bg-gray-800 border-gray-600 mb-3 group-hover:scale-110 transition-transform"
                                        />
                                        <span className="font-bold text-center">4 Cantos</span>
                                    </label>
                                </div>

                                {/* Quina */}
                                <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
                                    <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
                                        <label className="flex items-center space-x-3 cursor-pointer group">
                                            <div
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gameState.winningPatterns.quina.enabled ? 'bg-green-500' : 'bg-gray-700'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={gameState.winningPatterns.quina.enabled}
                                                    onChange={() => togglePattern('quina')}
                                                    className="sr-only"
                                                />
                                                <div className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gameState.winningPatterns.quina.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </div>
                                            <span className="text-lg font-bold group-hover:text-green-400 transition-colors">Quina</span>
                                        </label>
                                    </div>
                                    <div className="space-y-3 pl-2">
                                        {['horizontal', 'vertical', 'diagonal'].map(dir => (
                                            <div key={dir} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                <span className="capitalize text-gray-300">{dir}</span>
                                                <button
                                                    onClick={() => togglePattern('quina', dir)}
                                                    disabled={!gameState.winningPatterns.quina.enabled}
                                                    className={`
                                                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                                                        ${(gameState.winningPatterns.quina as any)[dir] ? 'bg-green-600' : 'bg-gray-700'}
                                                        ${!gameState.winningPatterns.quina.enabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-green-700'}
                                                    `}
                                                >
                                                    <span
                                                        className={`
                                                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                                            ${(gameState.winningPatterns.quina as any)[dir] ? 'translate-x-6' : 'translate-x-1'}
                                                        `}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Terço */}
                                <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
                                    <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
                                        <label className="flex items-center space-x-3 cursor-pointer group">
                                            <div
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gameState.winningPatterns.terco.enabled ? 'bg-yellow-500' : 'bg-gray-700'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={gameState.winningPatterns.terco.enabled}
                                                    onChange={() => togglePattern('terco')}
                                                    className="sr-only"
                                                />
                                                <div className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gameState.winningPatterns.terco.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </div>
                                            <span className="text-lg font-bold group-hover:text-yellow-400 transition-colors">Terço</span>
                                        </label>
                                    </div>
                                    <div className="space-y-3 pl-2">
                                        {['horizontal', 'vertical', 'diagonal'].map(dir => (
                                            <div key={dir} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                <span className="capitalize text-gray-300">{dir}</span>
                                                <button
                                                    onClick={() => togglePattern('terco', dir)}
                                                    disabled={!gameState.winningPatterns.terco.enabled}
                                                    className={`
                                                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                                                        ${(gameState.winningPatterns.terco as any)[dir] ? 'bg-yellow-600' : 'bg-gray-700'}
                                                        ${!gameState.winningPatterns.terco.enabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-yellow-700'}
                                                    `}
                                                >
                                                    <span
                                                        className={`
                                                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                                            ${(gameState.winningPatterns.terco as any)[dir] ? 'translate-x-6' : 'translate-x-1'}
                                                        `}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-10 text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-2"></div>
                                <p>Carregando...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
