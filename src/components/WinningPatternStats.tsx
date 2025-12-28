"use client";

import { useMemo, useState, useEffect } from 'react';
import { BingoCard } from '@/lib/card-state';
import { WinningPattern, loadWinningPatterns } from '@/lib/winning-patterns';

interface WinningPatternStatsProps {
    card: BingoCard;
    drawnNumbers: number[];
}

// Helper function to check if a set of numbers has been drawn
const hasBeenDrawn = (numbersToCheck: (number | 'FREE')[], drawnNumbers: number[]): boolean => {
    return numbersToCheck.every(num => num === 'FREE' || drawnNumbers.includes(num));
};

// Generates all possible lines of a given length for a grid
const getLines = (grid: (number | 'FREE')[][], length: number) => {
    const lines = { horizontal: [], vertical: [], diagonal: [] };

    // Horizontal and Vertical lines
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j <= 5 - length; j++) {
            lines.horizontal.push(grid[i].slice(j, j + length));
            const verticalSlice = [];
            for (let k = 0; k < length; k++) {
                verticalSlice.push(grid[j + k][i]);
            }
            lines.vertical.push(verticalSlice);
        }
    }
    
    // Diagonal lines
    for (let i = 0; i <= 5 - length; i++) {
        const diag1 = [];
        const diag2 = [];
        for (let k = 0; k < length; k++) {
            diag1.push(grid[i + k][i + k]);
            diag2.push(grid[i + k][(5 - 1 - i) - k]);
        }
        lines.diagonal.push(diag1);
        lines.diagonal.push(diag2);
    }
    // Add remaining anti-diagonals for smaller lengths
    if (length < 5) {
        for (let i = 1; i <= 5 - length; i++) {
            const antiDiag = [];
            for (let k = 0; k < length; k++) {
                antiDiag.push(grid[i + k][(5 - 1) - k]);
            }
            lines.diagonal.push(antiDiag);
        }
    }
    return lines;
};


export default function WinningPatternStats({ card, drawnNumbers }: WinningPatternStatsProps) {
    const [activePatterns, setActivePatterns] = useState(() => loadWinningPatterns());

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'bingoWinningPatterns') {
                setActivePatterns(loadWinningPatterns());
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
    
    const grid: (number | 'FREE')[][] = useMemo(() => {
        const newGrid: (number | 'FREE')[][] = Array(5).fill(null).map(() => Array(5).fill(null));
        let cardIdx = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (r === 2 && c === 2) {
                    newGrid[r][c] = 'FREE';
                } else {
                    newGrid[r][c] = card.numbers[cardIdx++];
                }
            }
        }
        return newGrid;
    }, [card]);


    const stats = useMemo(() => {
        const results: { [key: string]: { name: string, completed: boolean, completedCount: number } } = {};

        for (const pattern of activePatterns) {
            if (!pattern.enabled) continue;

            let completed = false;
            let completedCount = 0;

            switch (pattern.id) {
                case '4_corners':
                    const corners = [grid[0][0], grid[0][4], grid[4][0], grid[4][4]];
                    completed = hasBeenDrawn(corners, drawnNumbers);
                    break;
                
                case 'full_card':
                    completed = hasBeenDrawn(card.numbers, drawnNumbers);
                    break;

                case 'quina':
                    const quinaLines = getLines(grid, 5);
                    let quinaCompleted = false;
                    if (pattern.subPatterns?.find(sp => sp.id === 'quina_horizontal')?.enabled) {
                        if (quinaLines.horizontal.some(line => hasBeenDrawn(line, drawnNumbers))) quinaCompleted = true;
                    }
                    if (!quinaCompleted && pattern.subPatterns?.find(sp => sp.id === 'quina_vertical')?.enabled) {
                         if (quinaLines.vertical.some(line => hasBeenDrawn(line, drawnNumbers))) quinaCompleted = true;
                    }
                    if (!quinaCompleted && pattern.subPatterns?.find(sp => sp.id === 'quina_diagonal')?.enabled) {
                        if (quinaLines.diagonal.some(line => hasBeenDrawn(line, drawnNumbers))) quinaCompleted = true;
                    }
                    completed = quinaCompleted;
                    break;
                
                case 'terco':
                     const tercoLines = getLines(grid, 3);
                     let tercoCompleted = false;
                      if (pattern.subPatterns?.find(sp => sp.id === 'terco_horizontal')?.enabled) {
                        if (tercoLines.horizontal.some(line => hasBeenDrawn(line, drawnNumbers))) tercoCompleted = true;
                    }
                    if (!tercoCompleted && pattern.subPatterns?.find(sp => sp.id === 'terco_vertical')?.enabled) {
                         if (tercoLines.vertical.some(line => hasBeenDrawn(line, drawnNumbers))) tercoCompleted = true;
                    }
                    if (!tercoCompleted && pattern.subPatterns?.find(sp => sp.id === 'terco_diagonal')?.enabled) {
                        if (tercoLines.diagonal.some(line => hasBeenDrawn(line, drawnNumbers))) tercoCompleted = true;
                    }
                    completed = tercoCompleted;
                    break;
            }
            results[pattern.id] = { name: pattern.name, completed, completedCount: 0 }; // Set count to 0 as it's not needed
        }

        return results;
    }, [grid, drawnNumbers, activePatterns, card.numbers]);

    return (
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-center">Estatísticas da Cartela</h2>
            <div className="space-y-3">
                {Object.values(stats).map((stat, index) => (
                    <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${stat.completed ? 'bg-green-600' : 'bg-gray-700'}`}>
                        <span className="font-bold">{stat.name}</span>
                        <span className={`font-semibold ${stat.completed ? 'text-white' : 'text-gray-400'}`}>
                            {stat.completed ? 'Completo' : 'Incompleto'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
