import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../types";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const fetchNewWords = async (level: number, existingKanji: string[]): Promise<Word[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. Returning mock data.");
    return getMockData(level);
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate 15 Japanese Kanji vocabulary cards appropriate for JLPT Level N${level}.
    Do not include these kanji: ${existingKanji.join(', ')}.
    
    The response must be a JSON object with a "words" array.
    Each word object should have:
    - kanji: The kanji word (e.g., "毎日").
    - hiragana: The reading STRICTLY in Japanese Hiragana (e.g., "まいにち"). CRITICAL: DO NOT use Korean Hangul, Katakana, or Romaji in this field. It must be Hiragana only.
    - romaji: The pronunciation in romaji (e.g., "mainichi").
    - meanings: An array of Korean meanings (strings).
    - exampleSentence: A simple example sentence using the word. CRITICAL: Put hiragana readings in brackets [] immediately after every Kanji word in the sentence to support furigana display. Example: "私[わたし]は学生[がくせい]です".
    - exampleMeaning: Korean translation of the sentence.
    - imagePrompt: A detailed visual description to generate a Japanese anime style illustration representing this word. (e.g. "anime style illustration of a cute cat sitting on a tatami mat", "anime style background of a japanese school").
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kanji: { type: Type.STRING },
                  hiragana: { type: Type.STRING, description: "Must be Japanese Hiragana characters only. No Korean." },
                  romaji: { type: Type.STRING },
                  meanings: { type: Type.ARRAY, items: { type: Type.STRING } },
                  exampleSentence: { type: Type.STRING },
                  exampleMeaning: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["kanji", "hiragana", "romaji", "meanings", "exampleSentence", "exampleMeaning", "imagePrompt"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const parsed = JSON.parse(jsonText);
    
    return parsed.words.map((w: any) => ({
      id: generateId(),
      kanji: w.kanji,
      hiragana: w.hiragana,
      romaji: w.romaji,
      meanings: w.meanings,
      level: level,
      exampleSentence: w.exampleSentence,
      exampleMeaning: w.exampleMeaning,
      imagePrompt: w.imagePrompt,
      imageUrl: undefined, // Image will be generated separately
      learnedAt: undefined
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    return getMockData(level);
  }
};

export const generateImageForWord = async (prompt: string): Promise<string | undefined> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return undefined;

    const ai = new GoogleGenAI({ apiKey });
    try {
        // Using Imagen 4 Fast model as requested for speed/quality balance
        // Appending style keywords to ensure anime style
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-fast-generate-001',
            prompt: prompt + ", Japanese anime style, studio ghibli style, vibrant colors, high quality, 2D animation",
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '4:3', 
            },
        });

        const base64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64) {
            return `data:image/jpeg;base64,${base64}`;
        }
    } catch (e) {
        console.error("Image generation failed:", e);
    }
    return undefined;
}

// Fallback data if API key is missing or fails
const getMockData = (level: number): Word[] => {
  return [
    {
      id: generateId(),
      kanji: "猫",
      hiragana: "ねこ",
      romaji: "neko",
      meanings: ["고양이"],
      level,
      exampleSentence: "猫[ねこ]が好[す]きです。",
      exampleMeaning: "고양이를 좋아합니다.",
      imagePrompt: "a cute cat, anime style",
      imageUrl: "https://via.placeholder.com/400x300?text=No+API+Key" 
    },
    {
      id: generateId(),
      kanji: "学校",
      hiragana: "がっこう",
      romaji: "gakkou",
      meanings: ["학교"],
      level,
      exampleSentence: "学校[がっこう]へ行[い]きます。",
      exampleMeaning: "학교에 갑니다.",
      imagePrompt: "a school building, anime style",
      imageUrl: "https://via.placeholder.com/400x300?text=No+API+Key"
    },
    {
      id: generateId(),
      kanji: "先生",
      hiragana: "せんせい",
      romaji: "sensei",
      meanings: ["선생님"],
      level,
      exampleSentence: "先生[せんせい]、おはようございます。",
      exampleMeaning: "선생님, 안녕하세요.",
      imagePrompt: "a teacher in classroom, anime style",
      imageUrl: "https://via.placeholder.com/400x300?text=No+API+Key"
    }
  ];
};