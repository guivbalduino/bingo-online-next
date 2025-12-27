"use client";

import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';

const BINGO_COLUMNS: Record<number, { min: number; max: number; label: string }> = {
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

// --- Reusable Draggable Component ---
function Draggable({ id, data, children }: { id: string; data: object; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id, data });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 1000 } : {};

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {children}
        </div>
    );
}

function BankColumn({ id, colLabel, children }: { id: string; colLabel: string; children: React.ReactNode; }) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className="flex flex-col items-center p-2 rounded-md min-w-[70px]">
            <p className="font-bold text-yellow-500 mb-2">{colLabel}</p>
            <div className="flex flex-col gap-2 h-48 overflow-y-auto p-1">
                {children}
            </div>
        </div>
    );
}

export default function CardVerificationGrid({ initialNumbers, onSave, onCancel }: CardVerificationGridProps) {
    const [grid, setGrid] = useState<(number | null)[][]>([]);
    const [availableNumbers, setAvailableNumbers] = useState<Record<string, number[]>>({});
    const [activeNumber, setActiveNumber] = useState<number | null>(null);

    const sensors = useSensors(useSensor(PointerSensor));

    useEffect(() => {
        const newGrid = Array(5).fill(null).map(() => Array(5).fill(null));
        const availableBank: Record<string, number[]> = { B: [], I: [], N: [], G: [], O: [] };
        const placedOcrNumbers = new Set<number>();

        initialNumbers.sort((a, b) => a - b).forEach(num => {
            for (let cIdx = 0; cIdx < 5; cIdx++) {
                const colInfo = BINGO_COLUMNS[cIdx];
                if (num >= colInfo.min && num <= colInfo.max) {
                    for (let rIdx = 0; rIdx < 5; rIdx++) {
                        if (newGrid[rIdx][cIdx] === null && (rIdx !== 2 || cIdx !== 2)) {
                            if (!placedOcrNumbers.has(num)) {
                                newGrid[rIdx][cIdx] = num;
                                placedOcrNumbers.add(num);
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        });

        for (let cIdx = 0; cIdx < 5; cIdx++) {
            const colInfo = BINGO_COLUMNS[cIdx];
            for (let num = colInfo.min; num <= colInfo.max; num++) {
                if (!placedOcrNumbers.has(num)) {
                    availableBank[colInfo.label].push(num);
                }
            }
        }
        
        setGrid(newGrid);
        setAvailableNumbers(availableBank);
    }, [initialNumbers]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveNumber(event.active.data.current?.number);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveNumber(null);
        const { active, over } = event;

        if (!over || !active.data.current) return;

        const sourceId = active.id as string;
        const targetId = over.id as string;
        const draggedNumber = active.data.current.number as number;

        if (sourceId === targetId) return;

        const isSourceCell = sourceId.startsWith('cell-');
        const isTargetCell = targetId.startsWith('cell-');

        const newGrid = grid.map(r => [...r]);
        const newAvailable = JSON.parse(JSON.stringify(availableNumbers));

        // --- All drag-and-drop cases ---

        if (isTargetCell) {
            const [, r, c] = targetId.split('-');
            const rIdx = Number(r);
            const cIdx = Number(c);
            const numberInTarget = newGrid[rIdx][cIdx];

            // Validate dragged number can be placed in target column
            const targetColInfo = BINGO_COLUMNS[cIdx];
            if (draggedNumber < targetColInfo.min || draggedNumber > targetColInfo.max) {
                alert(`Número ${draggedNumber} não pertence à coluna ${targetColInfo.label}.`);
                return;
            }
            
            if (isSourceCell) {
                // == Case: Cell -> Cell ==
                const [, sr, sc] = sourceId.split('-');
                const sourceRIdx = Number(sr);
                const sourceCIdx = Number(sc);

                if (numberInTarget) {
                    // Validate if the number in target can be moved to the source column
                    const sourceColInfo = BINGO_COLUMNS[sourceCIdx];
                    if (numberInTarget < sourceColInfo.min || numberInTarget > sourceColInfo.max) {
                        alert(`Não é possível trocar. O número de destino ${numberInTarget} não pertence à coluna de origem (${sourceColInfo.label}).`);
                        return;
                    }
                }
                
                // Perform swap
                newGrid[rIdx][cIdx] = draggedNumber;
                newGrid[sourceRIdx][sourceCIdx] = numberInTarget;
                setGrid(newGrid);

            } else {
                // == Case: Bank -> Cell ==
                const sourceBankLabel = sourceId.split('-')[1];
                
                // Remove from bank
                newAvailable[sourceBankLabel] = newAvailable[sourceBankLabel].filter((n: number) => n !== draggedNumber);
                
                // Place in grid
                newGrid[rIdx][cIdx] = draggedNumber;
                
                // Move occupant to bank
                if (numberInTarget) {
                    const occupantCol = Object.values(BINGO_COLUMNS).find(c => numberInTarget >= c.min && numberInTarget <= c.max);
                    if (occupantCol) {
                        newAvailable[occupantCol.label].push(numberInTarget);
                        newAvailable[occupantCol.label].sort((a: number, b: number) => a - b);
                    }
                }
                setGrid(newGrid);
                setAvailableNumbers(newAvailable);
            }

        } else { // Target is a bank
            const targetBankLabel = targetId.split('-')[1] || '';
            const targetColKey = Object.keys(BINGO_COLUMNS).find(key => BINGO_COLUMNS[Number(key)].label === targetBankLabel);

            if (targetColKey === undefined) return;
            
            const targetColInfo = BINGO_COLUMNS[Number(targetColKey)];
            if (draggedNumber < targetColInfo.min || draggedNumber > targetColInfo.max) {
                 alert(`Número ${draggedNumber} não pode ser movido para a coluna ${targetBankLabel}.`);
                 return;
            }

            if (isSourceCell) {
                // == Case: Cell -> Bank ==
                const [, r, c] = sourceId.split('-');
                const rIdx = Number(r);
                const cIdx = Number(c);

                // Remove from grid
                newGrid[rIdx][cIdx] = null;
                // Add to bank
                newAvailable[targetBankLabel].push(draggedNumber);
                newAvailable[targetBankLabel].sort((a: number, b: number) => a - b);
                
                setGrid(newGrid);
                setAvailableNumbers(newAvailable);

            } else {
                // == Case: Bank -> Bank ==
                const sourceBankLabel = sourceId.split('-')[1];

                if (sourceBankLabel !== targetBankLabel) {
                    // Remove from source bank
                    newAvailable[sourceBankLabel] = newAvailable[sourceBankLabel].filter((n: number) => n !== draggedNumber);
                    // Add to target bank
                    newAvailable[targetBankLabel].push(draggedNumber);
                    newAvailable[targetBankLabel].sort((a: number, b: number) => a - b);
                    setAvailableNumbers(newAvailable);
                }
            }
        }
    };
    
    const handleSave = () => {
        const finalNumbers: number[] = [];
        for (const row of grid) {
            for (const cell of row) {
                if (cell !== null) finalNumbers.push(cell);
            }
        }
        if (finalNumbers.length !== 24) {
            alert(`A cartela deve ter 24 números preenchidos. Você tem ${finalNumbers.length}.`);
            return;
        }
        onSave(finalNumbers);
    };

    const Cell = ({ r, c }: { r: number, c: number }) => {
        const number = grid[r]?.[c];
        const id = `cell-${r}-${c}`;
        const { setNodeRef, isOver } = useDroppable({ id });

        const content = number ? (
            <Draggable id={id} data={{ number }}>
                <div className="w-12 h-12 flex items-center justify-center font-bold text-lg cursor-grab bg-gray-800 rounded-md">
                    {number}
                </div>
            </Draggable>
        ) : null;
        
        return (
            <div ref={setNodeRef} className={`w-12 h-12 rounded-md ${isOver ? 'bg-blue-900' : 'bg-gray-600'}`}>
                {content}
            </div>
        );
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col items-center gap-4 p-4 bg-gray-700 rounded-lg w-full">
                <h3 className="text-xl font-bold">Verifique sua Cartela</h3>
                <p className="text-center text-sm text-gray-300 mb-2">Arraste os números para a posição correta.</p>
                
                {/* Grid */}
                <div className="grid grid-cols-5 gap-1 mb-6">
                    {Object.values(BINGO_COLUMNS).map(c => <div key={c.label} className="text-center font-bold text-yellow-500 text-xl">{c.label}</div>)}
                    {Array.from({ length: 5 }).map((_, r) => 
                        Array.from({ length: 5 }).map((_, c) => 
                            r === 2 && c === 2
                            ? <div key="free" className="w-12 h-12 flex items-center justify-center bg-green-600 rounded-md font-bold">FREE</div>
                            : <Cell key={`${r}-${c}`} r={r} c={c} />
                        )
                    )}
                </div>

                {/* Available Numbers Bank */}
                <div className="w-full mt-4 border-t border-gray-600 pt-4">
                    <h4 className="text-lg font-semibold text-center mb-4">Números Disponíveis</h4>
                    <div className="flex justify-around flex-wrap gap-2">
                        {Object.keys(availableNumbers).map(colLabel => (
                            <BankColumn key={colLabel} id={`bank-${colLabel}`} colLabel={colLabel}>
                                {availableNumbers[colLabel].map(num => (
                                    <Draggable key={num} id={`bank-${colLabel}-${num}`} data={{ number: num }}>
                                        <div className="w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold bg-blue-500 text-white cursor-grab">
                                            {num}
                                        </div>
                                    </Draggable>
                                ))}
                            </BankColumn>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
                    <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6">Salvar</button>
                </div>
            </div>

            <DragOverlay>
                {activeNumber ? (
                    <div className="w-12 h-12 flex items-center justify-center font-bold text-lg bg-blue-600 rounded-full shadow-lg">
                        {activeNumber}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}