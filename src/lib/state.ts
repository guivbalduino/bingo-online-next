// bingo-online-next/src/lib/state.ts

import { getInitialNumbers } from './config';

export interface BingoState {
    drawnNumbers: number[];
    remainingNumbers: number[];
    soundEnabled: boolean;
}

const STATE_KEY = 'bingoGameState';
const PREVIOUS_STATE_KEY = 'bingoPreviousGameState';

export function saveState(state: BingoState, key: string = STATE_KEY): void {
    try {
        localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save state to localStorage:', error);
    }
}

export function loadState(key: string = STATE_KEY): BingoState {
    try {
        const storedState = localStorage.getItem(key);
        if (storedState) {
            return JSON.parse(storedState) as BingoState;
        }
    } catch (error) {
        console.error('Failed to load state from localStorage:', error);
    }
    // Return initial state if loading fails or no state is found
    return {
        drawnNumbers: [],
        remainingNumbers: getInitialNumbers(),
        soundEnabled: true,
    };
}

export function saveCurrentAsPrevious(currentState: BingoState): void {
    saveState(currentState, PREVIOUS_STATE_KEY);
}

export function loadPreviousState(): BingoState {
    return loadState(PREVIOUS_STATE_KEY);
}
