import { RawWord } from "../types";

// Simple CSV parser that handles quoted fields
const parseCSV = (text: string): RawWord[] => {
  const lines = text.split('\n');
  const result: RawWord[] = [];
  
  // Skip header if it exists (assuming first row is header)
  const startIndex = lines[0].includes('Original') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex to split by comma but ignore commas inside quotes
    const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    
    if (matches && matches.length >= 4) {
      const original = matches[0].replace(/^"|"$/g, '');
      const furigana = matches[1].replace(/^"|"$/g, '');
      const english = matches[2].replace(/^"|"$/g, '');
      // Level is like "N1", "N2". We extract the number.
      const levelStr = matches[3].replace(/^"|"$/g, '').replace(/N/i, '');
      const level = parseInt(levelStr, 10);

      if (original && !isNaN(level)) {
        result.push({
          original,
          furigana,
          english,
          level
        });
      }
    }
  }
  return result;
};

export const getWordsFromCSV = async (targetLevel: number, excludeKanji: string[], count: number = 15): Promise<RawWord[]> => {
  try {
    const response = await fetch('/jlpt_vocab.csv');
    if (!response.ok) {
        throw new Error('Failed to fetch CSV');
    }
    const text = await response.text();
    const allWords = parseCSV(text);

    // Filter by level and exclusion list
    const candidates = allWords.filter(w => 
      w.level === targetLevel && !excludeKanji.includes(w.original)
    );

    // Shuffle and pick
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);

  } catch (error) {
    console.warn("Could not load words from CSV, falling back to AI generation:", error);
    return [];
  }
};
