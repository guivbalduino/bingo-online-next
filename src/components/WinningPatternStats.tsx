"use client";

import { useMemo, useState, useEffect } from 'react';
import { BingoCard } from '@/lib/card-state';
import { WinningPattern, loadWinningPatterns } from '@/lib/winning-patterns';
import { QUINA_LINES, TERCO_LINES, Coordinate } from '@/lib/grid-utils';

interface WinningPatternStatsProps {
    card: BingoCard;
    drawnNumbers: number[];
}

// Helper function to check if a line (by coordinates) has been drawn
const hasLineBeenDrawn = (line: Coordinate[], grid: (number | 'FREE')[][], drawnNumbers: number[]): boolean => {
    const numbersToCheck = line.map(([r, c]) => grid[r][c]);
    return numbersToCheck.every(num => num === 'FREE' || (typeof num === 'number' && drawnNumbers.includes(num)));
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
    
    // Reconstruct the 5x5 grid from the flat 24-number array
    const grid: (number | 'FREE')[][] = useMemo(() => {
        const newGrid: (number | 'FREE')[][] = Array(5).fill(null).map(() => Array(5).fill(null));
        let cardIdx = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                // The center cell is always FREE
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
        const results: { [key: string]: { name: string, completed: boolean } } = {};

        for (const pattern of activePatterns) {
            if (!pattern.enabled) continue;

            let completed = false;

            switch (pattern.id) {
                case '4_corners':
                    const corners: Coordinate[] = [[0, 0], [0, 4], [4, 0], [4, 4]];
                    completed = hasLineBeenDrawn(corners, grid, drawnNumbers);
                    break;
                
                case 'full_card':
                    const allCardCoordinates: Coordinate[] = [];
                    for(let r=0; r<5; r++) {
                        for(let c=0; c<5; c++) {
                            if (r !== 2 || c !== 2) { // Exclude FREE space
                                allCardCoordinates.push([r, c]);
                            }
                        }
                    }
                    completed = hasLineBeenDrawn(allCardCoordinates, grid, drawnNumbers);
                    break;

                case 'quina':
                    let quinaCompleted = false;
                    if (pattern.subPatterns?.find(sp => sp.id === 'quina_horizontal')?.enabled) {
                        if (QUINA_LINES.horizontal.some(line => hasLineBeenDrawn(line, grid, drawnNumbers))) quinaCompleted = true;
                    }
                    if (!quinaCompleted && pattern.subPatterns?.find(sp => sp.id === 'quina_vertical')?.enabled) {
                         if (QUINA_LINES.vertical.some(line => hasLineBeenDrawn(line, grid, drawnNumbers))) quinaCompleted = true;
                    }
                    if (!quinaCompleted && pattern.subPatterns?.find(sp => sp.id === 'quina_diagonal')?.enabled) {
                        if (QUINA_LINES.diagonal.some(line => hasLineBeenDrawn(line, grid, drawnNumbers))) quinaCompleted = true;
                    }
                    completed = quinaCompleted;
                    break;
                
                case 'terco':
                     let tercoCompleted = false;
                      if (pattern.subPatterns?.find(sp => sp.id === 'terco_horizontal')?.enabled) {
                        if (TERCO_LINES.horizontal.some(line => hasLineBeenDrawn(line, grid, drawnNumbers))) tercoCompleted = true;
                    }
                    if (!tercoCompleted && pattern.subPatterns?.find(sp => sp.id === 'terco_vertical')?.enabled) {
                         if (TERCO_LINES.vertical.some(line => hasLineBeenDrawn(line, grid, drawnNumbers))) tercoCompleted = true;
                    }
                    if (!tercoCompleted && pattern.subPatterns?.find(sp => sp.id === 'terco_diagonal')?.enabled) {
                        if (TERCO_LINES.diagonal.some(line => hasLineBeenDrawn(line, grid, drawnNumbers))) tercoCompleted = true;
                    }
                    completed = tercoCompleted;
                    break;
            }
            results[pattern.id] = { name: pattern.name, completed };
        }

        return results;
    }, [grid, drawnNumbers, activePatterns]);

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
