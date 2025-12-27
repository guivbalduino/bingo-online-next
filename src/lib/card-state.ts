const BINGO_CARD_STORAGE_KEY = 'bingoCardState';

export interface BingoCard {
  // A simple 1D array of numbers is easier to work with.
  // The grid structure can be rebuilt in the UI.
  numbers: number[];
  // We can add more metadata if needed, like the image source.
  imageSrc?: string; 
}

// Save the user's card to localStorage
export const saveCard = (card: BingoCard): void => {
  try {
    const cardState = JSON.stringify(card);
    localStorage.setItem(BINGO_CARD_STORAGE_KEY, cardState);
  } catch (e) {
    console.error("Error saving card state to localStorage", e);
  }
};

// Load the user's card from localStorage
export const loadCard = (): BingoCard | null => {
  try {
    const cardState = localStorage.getItem(BINGO_CARD_STORAGE_KEY);
    if (cardState === null) {
      return null;
    }
    return JSON.parse(cardState);
  } catch (e) {
    console.error("Error loading card state from localStorage", e);
    return null;
  }
};

// Clear the user's card from localStorage
export const clearCard = (): void => {
  try {
    localStorage.removeItem(BINGO_CARD_STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing card state from localStorage", e);
  }
};
