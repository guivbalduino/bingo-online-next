"use client";

import { useState, useEffect, useCallback } from "react";
import { BingoState, saveState, loadState, saveCurrentAsPrevious, loadPreviousState } from "@/lib/state";
import { getInitialNumbers, BINGO_COLUMNS } from "@/lib/config";


export default function Home() {
    const [gameState, setGameState] = useState<BingoState>({
        drawnNumbers: [],
        remainingNumbers: getInitialNumbers(),
        soundEnabled: true,
    });
    const [lastDrawnNumber, setLastDrawnNumber] = useState<number | null>(null);
    const [audioToPlay, setAudioToPlay] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false); // New state to track if client-side

    useEffect(() => {
        setIsClient(true); // Mark as client-side once mounted
        const loadedState = loadState();
        setGameState(loadedState);
        setLastDrawnNumber(loadedState.drawnNumbers.length > 0 ? loadedState.drawnNumbers[loadedState.drawnNumbers.length - 1] : null);
    }, []);

    useEffect(() => {
        if (isClient) { // Only save state if on client-side
            saveState(gameState);
        }
    }, [gameState, isClient]);

    useEffect(() => {
        if (audioToPlay && gameState.soundEnabled) {
            const audio = new Audio(audioToPlay);
            audio.play().catch(e => console.error("Error playing audio:", e));
            setAudioToPlay(null); // Clear audio after playing
        }
    }, [audioToPlay, gameState.soundEnabled]);

    const drawNumber = useCallback(() => {
        if (gameState.remainingNumbers.length > 0) {
            const randomIndex = Math.floor(Math.random() * gameState.remainingNumbers.length);
            const drawnNumber = gameState.remainingNumbers[randomIndex];

            const newDrawnNumbers = [...gameState.drawnNumbers, drawnNumber];
            const newRemainingNumbers = gameState.remainingNumbers.filter(n => n !== drawnNumber);

            setGameState(prev => ({
                ...prev,
                drawnNumbers: newDrawnNumbers,
                remainingNumbers: newRemainingNumbers,
            }));
            setLastDrawnNumber(drawnNumber);
            setAudioToPlay(`/audio/${drawnNumber}.wav`);
        }
    }, [gameState]);

    const resetGame = useCallback(() => {
        if (confirm("Are you sure you want to reset the game? This will save the current game as previous.")) {
            saveCurrentAsPrevious(gameState);
            setGameState({
                drawnNumbers: [],
                remainingNumbers: getInitialNumbers(),
                soundEnabled: true,
            });
            setLastDrawnNumber(null);
            setAudioToPlay(null);
        }
    }, [gameState]);

    const loadPreviousGame = useCallback(() => {
        if (confirm("Are you sure you want to load the previous game?")) {
            const previousState = loadPreviousState();
            setGameState(previousState);
            setLastDrawnNumber(previousState.drawnNumbers.length > 0 ? previousState.drawnNumbers[previousState.drawnNumbers.length - 1] : null);
            setAudioToPlay(null);
        }
    }, []);

    const toggleSound = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            soundEnabled: !prev.soundEnabled,
        }));
    }, []);

    const replayAudio = useCallback(() => {
        if (lastDrawnNumber !== null) {
            setAudioToPlay(`/audio/${lastDrawnNumber}.wav`);
        }
    }, [lastDrawnNumber]);

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
                    <p className="text-6xl font-bold">{lastDrawnNumber !== null ? lastDrawnNumber : '-'}</p>
                </div>

                <p className="text-lg">Números restantes: {gameState.remainingNumbers.length}</p>

                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                        checked={gameState.soundEnabled}
                        onChange={toggleSound}
                    />
                    <span className="label-text text-lg">Habilitar som</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={drawNumber}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-xl transition-colors disabled:opacity-50"
                        disabled={gameState.remainingNumbers.length === 0}
                    >
                        Sortear
                    </button>
                    <button
                        onClick={replayAudio}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg text-xl transition-colors disabled:opacity-50"
                        disabled={lastDrawnNumber === null}
                    >
                        Repetir
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={resetGame}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
                    >
                        Resetar
                    </button>
                    <button
                        onClick={loadPreviousGame}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
                    >
                        Carregar Anterior
                    </button>
                </div>

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
                                    const isLast = number === lastDrawnNumber;

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
        </div>
    );
}

