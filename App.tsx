import React, { useState, useEffect, useRef } from 'react';
import { Word, AppMode } from './types';
import { fetchNewWords, generateImageForWord } from './services/geminiService';
import { Flashcard } from './components/Flashcard';
import { QuizMode } from './components/QuizMode';
import { WordList } from './components/WordList';
import { getAllWordsFromDB, saveWordsToDB } from './services/db';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [level, setLevel] = useState<number>(5);
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  
  // Session State
  const [currentSessionWords, setCurrentSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Ref to track if the session is active so we stop generating images if user quits
  const sessionActiveRef = useRef(false);

  // Initialize and Load Data
  useEffect(() => {
    // Load from IndexedDB
    getAllWordsFromDB().then(words => {
        setLearnedWords(words);
    }).catch(err => console.error("DB Load Error", err));

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  // Save to DB whenever learnedWords changes (Optimized to batch save if needed, but safe to call)
  useEffect(() => {
     if (learnedWords.length > 0) {
         saveWordsToDB(learnedWords).catch(e => console.error("Save failed", e));
     }
  }, [learnedWords]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
        alert("이 브라우저에서는 앱 설치를 직접 지원하지 않습니다. 브라우저 메뉴의 '앱 설치' 또는 '홈 화면에 추가'를 이용해주세요.");
    }
  };

  const startLearning = async () => {
    setLoading(true);
    setLoadingMessage("AI가 단어 리스트를 생성하고 있습니다...");
    sessionActiveRef.current = true;

    // Get list of existing kanji for this level
    const existingKanji = learnedWords
      .filter(w => w.level === level)
      .map(w => w.kanji);

    try {
        const newWords = await fetchNewWords(level, existingKanji);
        const total = newWords.length;
        
        for (let i = 0; i < total; i++) {
            if (!sessionActiveRef.current) break; 
            setLoadingMessage(`이미지 생성 중 (${i + 1}/${total})`);
            
            const word = newWords[i];
            if (word.imagePrompt) {
                 try {
                     const url = await generateImageForWord(word.imagePrompt);
                     if (url) word.imageUrl = url;
                 } catch (e) {
                     console.warn(`Failed to generate image`, e);
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
        alert("오류가 발생했습니다.");
    } finally {
        setLoading(false);
        setLoadingMessage("");
    }
  };

  const startReviewFlashcards = () => {
      if (learnedWords.length === 0) return;
      // Shuffle learned words for review
      const shuffled = [...learnedWords].sort(() => 0.5 - Math.random());
      setCurrentSessionWords(shuffled);
      setCurrentIndex(0);
      setMode(AppMode.REVIEW_FLASHCARD);
  }

  const handleFinishBatch = () => {
    sessionActiveRef.current = false;
    
    // Only add new words if we are in LEARN mode
    if (mode === AppMode.LEARN) {
        const newUniqueWords = currentSessionWords.filter(
          nw => !learnedWords.some(lw => lw.kanji === nw.kanji)
        ).map(w => ({ ...w, learnedAt: new Date().toISOString() }));
    
        setLearnedWords(prev => [...prev, ...newUniqueWords]);
    }
    
    setMode(AppMode.HOME);
    setCurrentSessionWords([]);
    setCurrentIndex(0);
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
          {deferredPrompt && (
              <button onClick={handleInstallClick} className="px-3 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors">
                  앱 설치
              </button>
          )}
          <button 
            onClick={() => { sessionActiveRef.current = false; setMode(AppMode.VOCABULARY); }}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            단어장 ({learnedWords.length})
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {mode === AppMode.HOME && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-y-auto">
            <div className="max-w-md w-full py-8">
              <h2 className="text-4xl font-bold text-indigo-900 mb-4">일본어 한자 마스터</h2>
              <p className="text-slate-500 mb-8 text-lg">AI와 함께 레벨별 한자를 학습하고 복습하세요.</p>
              
              {/* Learning Section */}
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
                      {loadingMessage}
                    </>
                  ) : (
                    "학습 시작하기"
                  )}
                </button>
              </div>

              {/* Review & Quiz Section */}
              <div className="grid gap-4">
                  <button
                    onClick={() => { sessionActiveRef.current = false; setMode(AppMode.QUIZ); }}
                    disabled={learnedWords.length < 4}
                    className={`
                        w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg shadow-md transition-all active:scale-95
                        ${learnedWords.length < 4 ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    퀴즈 풀기 🎮
                  </button>
                  
                  <button
                    onClick={startReviewFlashcards}
                    disabled={learnedWords.length === 0}
                    className={`
                        w-full bg-white border-2 border-indigo-100 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl text-lg transition-colors
                        ${learnedWords.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    복습하기 (카드) 🔄
                  </button>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 text-left">
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

        {/* Learning or Review Flashcard Mode */}
        {(mode === AppMode.LEARN || mode === AppMode.REVIEW_FLASHCARD) && currentSessionWords.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-100">
             <div className="w-full max-w-md mb-4 flex justify-between text-sm font-medium text-slate-500">
                <span>{mode === AppMode.LEARN ? 'Learning' : 'Review'} Session</span>
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
                onPrev={currentIndex > 0 ? () => setCurrentIndex(prev => prev - 1) : undefined}
                isLast={currentIndex === currentSessionWords.length - 1}
                isFirst={currentIndex === 0}
                onFinishBatch={handleFinishBatch}
             />
          </div>
        )}

        {mode === AppMode.QUIZ && (
          <QuizMode 
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