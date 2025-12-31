"use client";

import { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { useSocket } from '@/lib/socket-context';
import CardVerificationGrid from './CardVerificationGrid';

interface PlayerSubmissionPanelProps {
    onClose: () => void;
}

export default function PlayerSubmissionPanel({ onClose }: PlayerSubmissionPanelProps) {
    const { socket, playerId } = useSocket();
    const [cardImage, setCardImage] = useState<string | null>(null);
    const [ocrNumbers, setOcrNumbers] = useState<number[] | null>(null);
    const [playerName, setPlayerName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCardImage(reader.result as string);
                handleImageUpload(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = async (imageBase64: string) => {
        if (!socket) {
            setError("Socket not connected");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            console.log("Starting OCR...");
            const worker = await createWorker('eng');

            // PSM 6 (Single Uniform Block) helps with Grid/Table layouts
            // PSM 6: Assume a single uniform block of text (good for grids)
            // This helps avoid treating the grid as complex columns
            await worker.setParameters({
                tessedit_pageseg_mode: '6',
            });

            const { data: { text } } = await worker.recognize(imageBase64);
            console.log("OCR Result:", text);

            await worker.terminate();

            const numbers = text.match(/\d+/g)?.map(Number).filter(n => n >= 1 && n <= 75) || [];
            const uniqueNumbers = Array.from(new Set(numbers));

            console.log("Extracted Numbers:", uniqueNumbers);

            if (uniqueNumbers.length === 0) {
                setError("Não conseguimos ler os números. Tente uma foto mais clara.");
                setOcrNumbers([]); // Allow manual
            } else {
                setOcrNumbers(uniqueNumbers);
            }

        } catch (err) {
            console.error("OCR failed:", err);
            setError("Falha ao ler a cartela. Preencha manualmente.");
            setOcrNumbers([]);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveCard = (numbers: number[]) => {
        if (socket && cardImage) {
            socket.emit('updateCard', {
                card: { numbers },
                cardImage: cardImage,
                name: playerName
            });
            onClose(); // Close the panel after saving
        }
    };

    const handleCancel = () => {
        setCardImage(null);
        setOcrNumbers(null);
        setError(null);
    };

    const generateRandomCard = () => {
        const getRandomNumbers = (min: number, max: number, count: number) => {
            const nums = new Set<number>();
            while (nums.size < count) {
                nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
            }
            return Array.from(nums).sort((a, b) => a - b);
        };

        const b = getRandomNumbers(1, 15, 5);
        const i = getRandomNumbers(16, 30, 5);
        const n = getRandomNumbers(31, 45, 4); // 4 numbers for N (freespace)
        const g = getRandomNumbers(46, 60, 5);
        const o = getRandomNumbers(61, 75, 5);

        setOcrNumbers([...b, ...i, ...n, ...g, ...o]);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header removed as it is provided by the container */}

            <div className="p-6 overflow-y-auto h-[calc(100vh-70px)]">
                {!ocrNumbers ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-full max-w-sm mb-8">
                            <label className="block text-gray-300 text-sm font-bold mb-2 text-left">Seu Nome (Opcional)</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Como quer ser chamado?"
                                className="w-full p-4 rounded-xl bg-gray-800 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all"
                            />
                        </div>

                        <input
                            id="card-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label
                            htmlFor="card-upload"
                            className="cursor-pointer bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-200 hover:scale-105 flex items-center gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {isUploading ? "Analisando..." : "Enviar Foto da Cartela"}
                        </label>
                        {cardImage && !isUploading && (
                            <div className="mt-4 w-full p-2 border border-gray-600 rounded-lg">
                                <img src={cardImage} alt="Preview da cartela" className="w-full h-auto rounded-md" />
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-700 w-full flex flex-col items-center">
                            <p className="text-gray-400 text-sm mb-3">Problemas com a foto?</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setOcrNumbers([])}
                                    className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-blue-600/50 hover:border-blue-400/50 text-gray-200 text-sm font-medium transition-all hover:scale-105 border border-gray-600 shadow-md"
                                >
                                    ✍️ Manual
                                </button>
                                <button
                                    onClick={generateRandomCard}
                                    className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-blue-600/50 hover:border-blue-400/50 text-white text-sm font-bold transition-all hover:scale-105 border border-gray-600 shadow-md flex items-center gap-2"
                                >
                                    🎲 Gerar Aleatória
                                </button>
                            </div>
                        </div>
                        {isUploading && <p className="mt-4 text-gray-300">Aguarde, estamos lendo sua cartela...</p>}
                        {error && <p className="mt-4 text-red-500">{error}</p>}
                    </div>
                ) : (
                    <CardVerificationGrid
                        initialNumbers={ocrNumbers}
                        onSave={handleSaveCard}
                        onCancel={handleCancel}
                    />
                )}
            </div>
        </div>
    );
}
