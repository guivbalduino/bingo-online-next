// bingo-online-next/src/lib/config.ts

export const MIN_NUMBER = 1;
export const MAX_NUMBER = 75;

export const BINGO_COLUMNS: { [key: string]: [number, number] } = {
    'B': [1, 15],
    'I': [16, 30],
    'N': [31, 45],
    'G': [46, 60],
    'O': [61, 75]
};

export function getInitialNumbers(): number[] {
    return Array.from({ length: MAX_NUMBER - MIN_NUMBER + 1 }, (_, i) => i + MIN_NUMBER);
}
