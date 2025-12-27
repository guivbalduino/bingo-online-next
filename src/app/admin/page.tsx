"use client";

import { useState, useEffect, useCallback } from 'react';
import { BingoCard, saveCard, loadCard, clearCard } from '@/lib/card-state';
import { BingoState, loadState } from '@/lib/state';
import Tesseract from 'tesseract.js';
import CardVerificationGrid from '@/components/CardVerificationGrid';

const BINGO_GAME_STORAGE_KEY = 'bingoGameState';

// Custom hook to sync with the main game's state from localStorage
const useSyncGameState = () => {
    const [gameState, setGameState] = useState<BingoState | null>(null);

    const syncState = useCallback(() => {
        const state = loadState();
        setGameState(state);
    }, []);

    useEffect(() => {
        syncState();
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === BINGO_GAME_STORAGE_KEY) {
                syncState();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [syncState]);
    
    return gameState;
};

export default function AdminPage() {
  const [mode, setMode] = useState<'upload' | 'verify'>('upload');
  const [userCard, setUserCard] = useState<BingoCard | null>(null);
  const [ocrNumbers, setOcrNumbers] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const gameState = useSyncGameState();
  const drawnNumbers = gameState?.drawnNumbers ?? [];

  useEffect(() => {
    const loadedCard = loadCard();
    if (loadedCard) {
      setUserCard(loadedCard);
    }
  }, []);

  const handleClearCard = useCallback(() => {
      clearCard();
      setUserCard(null);
      setMode('upload');
  }, []);

  useEffect(() => {
      if (gameState && gameState.drawnNumbers.length === 0 && userCard) {
          console.log("Game was reset. Clearing user card.");
          handleClearCard();
      }
  }, [gameState, userCard, handleClearCard]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStatus('Iniciando o processamento da imagem...');

    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = async () => {
        try {
            setProcessingStatus('Pré-processando imagem...');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context.");

            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const color = avg > 128 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = color;
            }
            ctx.putImageData(imageData, 0, 0);
            
            setProcessingStatus('Reconhecendo números...');
            const result = await Tesseract.recognize(
                canvas, 'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setProcessingStatus(`Progresso: ${Math.round(m.progress * 100)}%`);
                        }
                    },
                    tessedit_char_whitelist: '0123456789',
                    psm: 6,
                }
            );

            const numbers = result.data.text.match(/\d+/g)?.map(Number) ?? [];
            const validNumbers = [...new Set(numbers.filter(n => n >= 1 && n <= 75))];
            
            setOcrNumbers(validNumbers);
            setMode('verify');

        } catch (error) {
            console.error("OCR Error:", error);
            alert("Ocorreu um erro ao processar a imagem.");
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };
    image.onerror = () => {
        setIsProcessing(false);
        setProcessingStatus('');
        alert("Não foi possível carregar o arquivo de imagem.");
    };
  };

  const handleSaveVerification = (finalNumbers: number[]) => {
    const newCard: BingoCard = { numbers: finalNumbers };
    saveCard(newCard);
    setUserCard(newCard);
    setMode('upload');
  };

  const handleCancelVerification = () => {
    setMode('upload');
    setOcrNumbers([]);
  };

  const renderCard = (card: BingoCard) => {
    const allNumbers = card.numbers;
    
    // Create a 25-element grid, inserting the FREE space in the middle (index 12)
    const gridItems: (number | 'FREE')[] = [
        ...allNumbers.slice(0, 12),
        'FREE',
        ...allNumbers.slice(12)
    ];

    return (
        <div className="grid grid-cols-5 gap-2 justify-center">
            {["B", "I", "N", "G", "O"].map(letter => (
                <div key={letter} className="text-center font-bold text-yellow-500 text-2xl mb-2">{letter}</div>
            ))}
            {gridItems.map((item, index) => {
                const cellIndex = index % 25; // Normalize index for a 5x5 grid
                const visualIndex = index >= 5 ? index -5 : index;
                if (item === 'FREE') {
                    return (
                        <div key="free" className="w-16 h-16 flex items-center justify-center rounded-lg font-bold bg-green-600 text-white shadow-md">
                            FREE
                        </div>
                    );
                }
                
                const number = item;
                const isDrawn = drawnNumbers.includes(number);
                
                return (
                    <div 
                        key={index} 
                        className={`w-16 h-16 flex items-center justify-center rounded-lg text-lg font-bold shadow-md ${isDrawn ? 'bg-green-500 text-white' : 'bg-gray-700'}`}
                    >
                        {number}
                    </div>
                );
            })}
        </div>
    );
  };

  const renderContent = () => {
    if (userCard) {
      return (
        <div className="flex flex-col items-center gap-4">
          {renderCard(userCard)}
          <button
            onClick={handleClearCard}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-4"
          >
            Remover Cartela
          </button>
        </div>
      );
    }

    if (mode === 'verify') {
      return (
        <CardVerificationGrid 
          initialNumbers={ocrNumbers}
          onSave={handleSaveVerification}
          onCancel={handleCancelVerification}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 p-8 rounded-lg">
          {isProcessing ? (
              <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                  <p className="text-center">{processingStatus}</p>
              </div>
          ) : (
              <>
                  <p className="mb-4 text-center">Nenhuma cartela carregada.</p>
                  <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors">
                      <span>Enviar Imagem</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
              </>
          )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center">Painel da Cartela</h1>
        <p className="text-center text-gray-400">Envie a foto da sua cartela e acompanhe o sorteio.</p>
      </header>

      <main className="flex-1 flex flex-col items-center gap-8">
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-center">Sua Cartela</h2>
          {renderContent()}
        </div>

        <div className="w-full max-w-3xl bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-center">Números Sorteados ({drawnNumbers.length})</h2>
            {drawnNumbers.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                    {drawnNumbers.slice().sort((a,b) => a-b).map(num => (
                        <div key={num} className="w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold bg-yellow-500 text-black shadow-md">
                            {num}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-400">Aguardando o início do sorteio...</p>
            )}
        </div>
      </main>
    </div>
  );
}
