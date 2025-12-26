import React, { useState, useEffect, useRef } from 'react';
import { Word, AppMode } from './types';
import { fetchNewWords, generateImageForWord } from './services/geminiService';
import { Flashcard } from './components/Flashcard';
import { ReviewMode } from './components/ReviewMode';
import { WordList } from './components/WordList';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [level, setLevel] = useState<number>(5);
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  const [currentSessionWords, setCurrentSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // Ref to track if the session is active so we stop generating images if user quits
  const sessionActiveRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kanji-master-learned');
    if (saved) {
      try {
        setLearnedWords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved words");
      }
    }
  }, []);

  // Save to localStorage whenever learnedWords changes
  // FIX: Handle QuotaExceededError because Base64 images are large
  useEffect(() => {
    try {
      localStorage.setItem('kanji-master-learned', JSON.stringify(learnedWords));
    } catch (e) {
      console.warn("Storage quota exceeded. Trying to save without images.", e);
      try {
        // Create a copy without image URLs to save space
        const wordsWithoutImages = learnedWords.map(w => {
           const { imageUrl, ...rest } = w;
           return rest;
        });
        localStorage.setItem('kanji-master-learned', JSON.stringify(wordsWithoutImages));
      } catch (retryError) {
        console.error("Failed to save words even without images", retryError);
      }
    }
  }, [learnedWords]);

  const startLearning = async () => {
    setLoading(true);
    setLoadingMessage("AI가 단어 리스트를 생성하고 있습니다...");
    sessionActiveRef.current = true;

    // Get list of existing kanji for this level
    const existingKanji = learnedWords
      .filter(w => w.level === level)
      .map(w => w.kanji);

    try {
        // 1. Fetch Text Content
        const newWords = await fetchNewWords(level, existingKanji);
        
        // 2. Generate ALL images sequentially
        const total = newWords.length;
        
        for (let i = 0; i < total; i++) {
            if (!sessionActiveRef.current) break; // User cancelled

            // Simplified loading message as requested
            setLoadingMessage(`이미지 생성 중 (${i + 1}/${total})`);
            
            const word = newWords[i];
            if (word.imagePrompt) {
                 try {
                     const url = await generateImageForWord(word.imagePrompt);
                     if (url) {
                        word.imageUrl = url;
                     }
                 } catch (e) {
                     console.warn(`Failed to generate image for ${word.kanji}`, e);
                     // Continue without image or use placeholder if needed
                 }
            }
        }

        if (sessionActiveRef.current) {
            setCurrentSessionWords(newWords);
            setCurrentIndex(0);
            setMode(AppMode.LEARN);
        }
    } catch (error) {
        console.error("Error during session setup", error);
        alert("학습 세션을 생성하는 중 오류가 발생했습니다.");
    } finally {
        setLoading(false);
        setLoadingMessage("");
    }
  };

  const handleFinishBatch = () => {
    sessionActiveRef.current = false;
    // Add current session words to learned list, avoiding duplicates just in case
    const newUniqueWords = currentSessionWords.filter(
      nw => !learnedWords.some(lw => lw.kanji === nw.kanji)
    ).map(w => ({ ...w, learnedAt: new Date().toISOString() }));

    // Reset session state to ensure clean transition
    setCurrentSessionWords([]);
    setCurrentIndex(0);

    setLearnedWords(prev => [...prev, ...newUniqueWords]);
    setMode(AppMode.HOME);
  };

  const handleGoHome = () => {
      sessionActiveRef.current = false;
      setMode(AppMode.HOME);
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={handleGoHome}
        >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">漢</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">Kanji Master AI</h1>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => { sessionActiveRef.current = false; setMode(AppMode.VOCABULARY); }}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            단어장 ({learnedWords.length})
          </button>
          <button 
             onClick={() => { sessionActiveRef.current = false; setMode(AppMode.REVIEW); }}
             className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors sm:hidden"
          >
            복습
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {mode === AppMode.HOME && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="max-w-md w-full">
              <h2 className="text-4xl font-bold text-indigo-900 mb-4">일본어 한자 마스터</h2>
              <p className="text-slate-500 mb-8 text-lg">AI와 함께 레벨별 한자를 학습하고 복습하세요.</p>
              
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">학습 레벨 선택 (JLPT)</label>
                <div className="flex justify-between gap-2 mb-6">
                  {[5, 4, 3, 2, 1].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`
                        flex-1 h-12 rounded-lg font-bold text-lg transition-all
                        ${level === lvl 
                          ? 'bg-indigo-600 text-white shadow-md scale-105' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }
                      `}
                    >
                      N{lvl}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={startLearning}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {loadingMessage || "AI가 단어 생성 중..."}
                    </>
                  ) : (
                    "학습 시작하기"
                  )}
                </button>
              </div>

              {/* Review Button Center */}
              <div className="mb-8">
                 <button
                    onClick={() => { sessionActiveRef.current = false; setMode(AppMode.REVIEW); }}
                    disabled={learnedWords.length === 0}
                    className={`
                        w-full border-2 border-indigo-100 bg-white hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl text-lg transition-colors
                        ${learnedWords.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-200'}
                    `}
                 >
                    복습하기
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="text-2xl font-bold text-indigo-600 mb-1">{learnedWords.length}</div>
                    <div className="text-sm text-slate-500">학습한 단어</div>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="text-2xl font-bold text-rose-500 mb-1">
                        {learnedWords.length > 0 
                            ? `N${learnedWords[learnedWords.length-1].level}` 
                            : '-'}
                    </div>
                    <div className="text-sm text-slate-500">최근 레벨</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.LEARN && currentSessionWords.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-100">
             <div className="w-full max-w-md mb-4 flex justify-between text-sm font-medium text-slate-500">
                <span>Session Progress</span>
                <span>{currentIndex + 1} / {currentSessionWords.length}</span>
             </div>
             {/* Progress Bar */}
             <div className="w-full max-w-md bg-slate-200 rounded-full h-2 mb-8">
                <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / currentSessionWords.length) * 100}%` }}
                ></div>
             </div>

             <Flashcard 
                word={currentSessionWords[currentIndex]}
                onNext={() => setCurrentIndex(prev => prev + 1)}
                isLast={currentIndex === currentSessionWords.length - 1}
                onFinishBatch={handleFinishBatch}
             />
          </div>
        )}

        {mode === AppMode.REVIEW && (
          <ReviewMode 
            words={learnedWords}
            onExit={handleGoHome}
          />
        )}

        {mode === AppMode.VOCABULARY && (
          <div className="flex-1 p-4 sm:p-6 bg-slate-50 overflow-hidden">
             <WordList 
                words={learnedWords}
                onClose={handleGoHome}
             />
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}