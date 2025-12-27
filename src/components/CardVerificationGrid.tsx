"use client";

import { useState, useEffect } from 'react';

// Define column ranges for validation
const BINGO_COLUMNS: Record<number, { min: number, max: number, label: string }> = {
    0: { min: 1, max: 15, label: 'B' },
    1: { min: 16, max: 30, label: 'I' },
    2: { min: 31, max: 45, label: 'N' },
    3: { min: 46, max: 60, label: 'G' },
    4: { min: 61, max: 75, label: 'O' },
};

interface CardVerificationGridProps {
  initialNumbers: number[];
  onSave: (numbers: number[]) => void;
  onCancel: () => void;
}

export default function CardVerificationGrid({ initialNumbers, onSave, onCancel }: CardVerificationGridProps) {
    const emptyGrid = Array(5).fill(null).map(() => Array(5).fill(''));
    const [grid, setGrid] = useState<(string)[][]>(emptyGrid);

    useEffect(() => {
        const newGrid = Array(5).fill(null).map(() => Array(5).fill(''));
        const placedNumbers = new Set<number>();

        initialNumbers.forEach(num => {
            for (let col = 0; col < 5; col++) {
                if (num >= BINGO_COLUMNS[col].min && num <= BINGO_COLUMNS[col].max) {
                    for (let row = 0; row < 5; row++) {
                        // Place in the first available slot in the correct column
                        if (newGrid[row][col] === '' && !placedNumbers.has(num)) {
                           if (row === 2 && col === 2) continue; // Skip center
                           newGrid[row][col] = String(num);
                           placedNumbers.add(num);
                           break; // Move to the next number
                        }
                    }
                    break; // Move to the next number
                }
            }
        });
        setGrid(newGrid);
    }, [initialNumbers]);
    
    const handleInputChange = (value: string, row: number, col: number) => {
        // Allow only digits and limit length
        const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 2);
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = sanitizedValue;
        setGrid(newGrid);
    };

    const handleSave = () => {
        const finalNumbers: number[] = [];
        const uniqueCheck = new Set<number>();
        let hasError = false;

        grid.forEach((row, rIdx) => {
            row.forEach((cell, cIdx) => {
                if (rIdx === 2 && cIdx === 2) return; // Skip free space

                const num = parseInt(cell, 10);
                const colInfo = BINGO_COLUMNS[cIdx];

                if (isNaN(num) || num < colInfo.min || num > colInfo.max) {
                    hasError = true;
                    alert(`Número inválido na coluna ${colInfo.label}. O número '${cell}' não é permitido. Por favor, corrija.`);
                    return;
                }
                if (uniqueCheck.has(num)) {
                    hasError = true;
                    alert(`Número duplicado encontrado: ${num}. Por favor, corrija.`);
                    return;
                }
                
                finalNumbers.push(num);
                uniqueCheck.add(num);
            });
            if(hasError) return;
        });

        if (hasError) return;

        if (finalNumbers.length !== 24) {
            alert(`A cartela deve ter 24 números. Você inseriu ${finalNumbers.length}. Por favor, preencha todos os campos.`);
            return;
        }

        onSave(finalNumbers);
    };

    return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-700 rounded-lg w-full">
        <h3 className="text-xl font-bold">Verifique e Corrija a Cartela</h3>
        <p className="text-center text-sm text-gray-300 mb-2">
            O sistema pré-preencheu onde conseguiu. Corrija ou preencha os campos e salve.
        </p>
        
        <div className="grid grid-cols-5 gap-1">
            {Object.values(BINGO_COLUMNS).map(col => (
                <div key={col.label} className="text-center font-bold text-yellow-500 text-xl">{col.label}</div>
            ))}
            {grid.map((row, rIdx) => 
                row.map((cell, cIdx) => {
                    if (rIdx === 2 && cIdx === 2) {
                        return (
                            <div key={`${rIdx}-${cIdx}`} className="w-12 h-12 flex items-center justify-center bg-green-600 rounded-md font-bold">
                                FREE
                            </div>
                        );
                    }
                    return (
                        <input
                            key={`${rIdx}-${cIdx}`}
                            type="text"
                            value={cell}
                            onChange={(e) => handleInputChange(e.target.value, rIdx, cIdx)}
                            className="w-12 h-12 text-center bg-gray-800 text-white rounded-md text-lg font-semibold border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                            maxLength={2}
                        />
                    );
                })
            )}
        </div>

        <div className="flex gap-4 mt-4">
            <button
                onClick={onCancel}
                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
                Cancelar
            </button>
            <button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
                Salvar Cartela
            </button>
        </div>
    </div>
  );
}