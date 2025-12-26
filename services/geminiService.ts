import { GoogleGenAI, Type } from "@google/genai";
import { Word, RawWord } from "../types";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to compress image using Canvas
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 512; // Resize to max 512px (sufficient for phone screens)
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as JPEG with 60% quality (High compression)
          const compressed = canvas.toDataURL('image/jpeg', 0.6); 
          resolve(compressed);
      } else {
          resolve(base64Str); // Fallback
      }
    };

    img.onerror = () => {
        console.warn("Image compression failed, using original");
        resolve(base64Str);
    };
  });
};

export const fetchNewWords = async (level: number, existingKanji: string[], candidateWords: RawWord[] = []): Promise<Word[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. Returning mock data.");
    return getMockData(level);
  }

  const ai = new GoogleGenAI({ apiKey });

  let prompt = "";

  if (candidateWords.length > 0) {
      // Logic for when we have CSV data
      const wordListString = candidateWords.map(w => `${w.original} (${w.furigana}) - Meaning: ${w.english}`).join('\n');
      prompt = `
        Here is a list of Japanese words with their readings and English meanings:
        ${wordListString}

        For EACH word in this list, generate a JSON object.
        You must strictly follow the list order and contents.
        
        For each word, provide:
        - kanji: The provided Kanji.
        - hiragana: The provided reading (Hiragana only).
        - romaji: The romaji pronunciation.
        - meanings: Translate the English meaning to NATURAL KOREAN meanings (array of strings).
        - exampleSentence: A simple Japanese example sentence suitable for JLPT N${level}. CRITICAL: Put hiragana readings in brackets [] immediately after every Kanji word in the sentence. Example: "私[わたし]は学生[がくせい]です".
        - exampleMeaning: Korean translation of the sentence.
        - imagePrompt: A detailed visual description to generate a Japanese anime style illustration representing this word.
      `;
  } else {
      // Fallback logic (Old method)
      prompt = `
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
  }

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

export const generateImageForWord = async (prompt: string, retries = 5): Promise<string | undefined> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return undefined;

    const ai = new GoogleGenAI({ apiKey });
    let currentTry = 0;

    while (currentTry < retries) {
        try {
            // Using Imagen 4 Fast model for speed
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-fast-generate-001',
                prompt: prompt + ", Japanese anime style, studio ghibli style, vibrant colors, simple, minimalist background",
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '4:3', 
                },
            });

            const base64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (base64) {
                // Compress immediately before returning
                const compressed = await compressImage(`data:image/jpeg;base64,${base64}`);
                return compressed;
            }
            // If no image bytes but no error, break loop (unlikely)
            break; 

        } catch (e: any) {
            const errorMsg = e.message || JSON.stringify(e);
            
            // Check for Rate Limit (429) or Quota Exceeded
            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
                // Extract retry time if available (e.g. "retry in 19.98s")
                const retryMatch = errorMsg.match(/retry in ([0-9.]+)s/);
                let waitTime = 1000 * Math.pow(2, currentTry); // Default exponential backoff

                if (retryMatch && retryMatch[1]) {
                    // Add a small buffer (200ms) to the requested wait time
                    waitTime = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 200;
                }

                console.warn(`[Agent] Rate limit hit. Waiting ${waitTime}ms before retry ${currentTry + 1}/${retries}...`);
                await delay(waitTime);
                currentTry++;
                continue;
            }

            console.error("Image generation failed with non-retriable error:", e);
            return undefined;
        }
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