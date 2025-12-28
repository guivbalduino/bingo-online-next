// src/lib/grid-utils.ts

export type Coordinate = [number, number];

const GRID_SIZE = 5;

// --- QUINA (Length 5) ---
const QUINA_HORIZONTAL_LINES: Coordinate[][] = [];
for (let i = 0; i < GRID_SIZE; i++) {
    const line: Coordinate[] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
        line.push([i, j]);
    }
    QUINA_HORIZONTAL_LINES.push(line);
}

const QUINA_VERTICAL_LINES: Coordinate[][] = [];
for (let i = 0; i < GRID_SIZE; i++) {
    const line: Coordinate[] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
        line.push([j, i]);
    }
    QUINA_VERTICAL_LINES.push(line);
}

const QUINA_DIAGONAL_LINES: Coordinate[][] = [
    // Main diagonal
    [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
    // Anti-diagonal
    [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]],
];

export const QUINA_LINES = {
    horizontal: QUINA_HORIZONTAL_LINES,
    vertical: QUINA_VERTICAL_LINES,
    diagonal: QUINA_DIAGONAL_LINES,
};


// --- TERÇO (Length 3) ---
const TERCO_HORIZONTAL_LINES: Coordinate[][] = [];
for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j <= GRID_SIZE - 3; j++) {
        TERCO_HORIZONTAL_LINES.push([[i, j], [i, j + 1], [i, j + 2]]);
    }
}

const TERCO_VERTICAL_LINES: Coordinate[][] = [];
for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j <= GRID_SIZE - 3; j++) {
        TERCO_VERTICAL_LINES.push([[j, i], [j + 1, i], [j + 2, i]]);
    }
}

const TERCO_DIAGONAL_LINES: Coordinate[][] = [];
for (let i = 0; i <= GRID_SIZE - 3; i++) {
    for (let j = 0; j <= GRID_SIZE - 3; j++) {
        TERCO_DIAGONAL_LINES.push([[i, j], [i + 1, j + 1], [i + 2, j + 2]]);
        TERCO_DIAGONAL_LINES.push([[i, j + 2], [i + 1, j + 1], [i + 2, j]]);
    }
}


export const TERCO_LINES = {
    horizontal: TERCO_HORIZONTAL_LINES,
    vertical: TERCO_VERTICAL_LINES,
    diagonal: TERCO_DIAGONAL_LINES,
};
