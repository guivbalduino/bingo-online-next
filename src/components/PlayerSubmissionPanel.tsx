"use client";

import { useState } from 'react';
import { useSocket } from '@/lib/socket-context';
import CardVerificationGrid from './CardVerificationGrid';

interface PlayerSubmissionPanelProps {
    onClose: () => void;
}

export default function PlayerSubmissionPanel({ onClose }: PlayerSubmissionPanelProps) {
    const { socket, playerId } = useSocket();
    const [cardImage, setCardImage] = useState<string | null>(null);
    const [ocrNumbers, setOcrNumbers] = useState<number[] | null>(null);
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
            // This is a mock OCR call. In a real application, you would send the image
            // to a backend endpoint that performs OCR.
            // For this example, we'll simulate a successful OCR with some random numbers.
            console.log("Simulating OCR for player:", playerId);

            // Simulate a network delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            const mockOcrNumbers = Array.from({ length: 24 }, () => Math.floor(Math.random() * 75) + 1);

            setOcrNumbers(mockOcrNumbers);

        } catch (err) {
            console.error("OCR failed:", err);
            setError("Failed to read card. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveCard = (numbers: number[]) => {
        if (socket && cardImage) {
            socket.emit('updateCard', {
                card: { numbers },
                cardImage: cardImage,
            });
            onClose(); // Close the panel after saving
        }
    };

    const handleCancel = () => {
        setCardImage(null);
        setOcrNumbers(null);
        setError(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header removed as it is provided by the container */}

            <div className="p-6 overflow-y-auto h-[calc(100vh-70px)]">
                {!ocrNumbers ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <input
                            id="card-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label
                            htmlFor="card-upload"
                            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform duration-200 hover:scale-105"
                        >
                            {isUploading ? "Analisando..." : "Enviar Foto da Cartela"}
                        </label>
                        {cardImage && !isUploading && (
                            <div className="mt-4 w-full p-2 border border-gray-600 rounded-lg">
                                <img src={cardImage} alt="Preview da cartela" className="w-full h-auto rounded-md" />
                            </div>
                        )}
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
