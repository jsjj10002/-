
export interface Word {
  id: string;
  kanji: string;
  hiragana: string;
  romaji: string;
  meanings: string[];
  level: number;
  exampleSentence: string; // Should be formatted like "私[わたし]は..." for parsing
  exampleMeaning: string;
  imagePrompt?: string; // Prompt for generating the image
  imageUrl?: string;
  learnedAt?: string; // ISO Date string
}

export enum AppMode {
  HOME = 'HOME',
  LEARN = 'LEARN',
  QUIZ = 'QUIZ',
  REVIEW_FLASHCARD = 'REVIEW_FLASHCARD',
  VOCABULARY = 'VOCABULARY'
}

export enum ReviewType {
  KANJI_TO_HIRAGANA = 'KANJI_TO_HIRAGANA',
  KANJI_TO_MEANING = 'KANJI_TO_MEANING'
}

export interface UserProgress {
  learnedWords: Word[];
  totalLearned: number;
}