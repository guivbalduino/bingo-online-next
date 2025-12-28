// src/lib/winning-patterns.ts

export interface SubPattern {
    id: string;
    name: string;
    enabled: boolean;
}

export interface WinningPattern {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    subPatterns?: SubPattern[];
}

export const defaultWinningPatterns: WinningPattern[] = [
    {
        id: '4_corners',
        name: '4 Cantos',
        description: 'Marcar os 4 números dos cantos da cartela.',
        enabled: true,
    },
    {
        id: 'terco',
        name: 'Terço',
        description: 'Marcar 3 números em linha.',
        enabled: true,
        subPatterns: [
            { id: 'terco_horizontal', name: 'Horizontal', enabled: true },
            { id: 'terco_vertical', name: 'Vertical', enabled: true },
            { id: 'terco_diagonal', name: 'Diagonal', enabled: true },
        ],
    },
    {
        id: 'quina',
        name: 'Quina',
        description: 'Marcar 5 números em linha.',
        enabled: true,
        subPatterns: [
            { id: 'quina_horizontal', name: 'Horizontal', enabled: true },
            { id: 'quina_vertical', name: 'Vertical', enabled: true },
            { id: 'quina_diagonal', name: 'Diagonal', enabled: true },
        ],
    },
    {
        id: 'full_card',
        name: 'Cartela Cheia',
        description: 'Marcar todos os 24 números da cartela.',
        enabled: true,
    },
];

const WINNING_PATTERNS_STORAGE_KEY = 'bingoWinningPatterns';

export const saveWinningPatterns = (patterns: WinningPattern[]): void => {
    try {
        localStorage.setItem(WINNING_PATTERNS_STORAGE_KEY, JSON.stringify(patterns));
    } catch (e) {
        console.error("Error saving winning patterns to localStorage", e);
    }
};

export const loadWinningPatterns = (): WinningPattern[] => {
    try {
        const patternsState = localStorage.getItem(WINNING_PATTERNS_STORAGE_KEY);
        if (patternsState) {
            // Here you might want to merge the loaded state with the default state
            // to ensure new patterns or subpatterns are added automatically.
            const loaded = JSON.parse(patternsState);
            const merged = defaultWinningPatterns.map(defPattern => {
                const found = loaded.find((p: WinningPattern) => p.id === defPattern.id);
                if (found) {
                    // Merge subpatterns as well
                    if (defPattern.subPatterns) {
                        found.subPatterns = defPattern.subPatterns.map(defSub => {
                            const foundSub = found.subPatterns?.find((sp: SubPattern) => sp.id === defSub.id);
                            return foundSub || defSub;
                        });
                    }
                    return found;
                }
                return defPattern;
            });
            return merged;
        }
    } catch (e) {
        console.error("Error loading winning patterns from localStorage", e);
    }
    return defaultWinningPatterns;
};
