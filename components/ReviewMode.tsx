import React, { useState, useEffect, useMemo } from 'react';
import { Word } from '../types';

interface ReviewModeProps {
  words: Word[];
  onExit: () => void;
}

interface ReviewItem {
  word: Word;
  targetType: 'HIRAGANA' | 'MEANING';
}

export const ReviewMode: React.FC<ReviewModeProps> = ({ words, onExit }) => {
  const TOTAL_ROUNDS = 10;
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]); // Array of matched IDs
  
  // Game state
  const [shuffledLeft, setShuffledLeft] = useState<Word[]>([]);
  const [shuffledRight, setShuffledRight] = useState<ReviewItem[]>([]);

  // Prepare a round
  const setupRound = () => {
    if (words.length === 0) return;

    // Pick 5 random words from learned words (allow duplicates if not enough words)
    const roundWords: Word[] = [];
    const pool = [...words];
    
    for (let i = 0; i < 5; i++) {
      if (pool.length === 0) {
        // Refill pool if empty (for small vocabularies)
        pool.push(...words);
      }
      const randomIndex = Math.floor(Math.random() * pool.length);
      roundWords.push(pool[randomIndex]);
      // Remove from pool to avoid duplicates within a single round if possible
      pool.splice(randomIndex, 1); 
    }

    // Left side is just the words
    const newLeft = [...roundWords].sort(() => 0.5 - Math.random());
    
    // Right side mixes meanings and hiragana randomly
    const newRight: ReviewItem[] = roundWords.map(w => ({
      word: w,
      targetType: (Math.random() > 0.5 ? 'HIRAGANA' : 'MEANING') as 'HIRAGANA' | 'MEANING'
    })).sort(() => 0.5 - Math.random());

    setShuffledLeft(newLeft);
    setShuffledRight(newRight);
    setMatchedPairs([]);
    setSelectedLeft(null);
  };

  // Initial setup
  useEffect(() => {
    setupRound();
  }, [words]);

  const handleLeftClick = (id: string) => {
    if (matchedPairs.includes(id)) return;
    setSelectedLeft(id);
  };

  const handleRightClick = (id: string) => {
    if (!selectedLeft || matchedPairs.includes(id)) return;

    if (selectedLeft === id) {
      // Match!
      setMatchedPairs(prev => [...prev, id]);
      setSelectedLeft(null);
    } else {
      // Wrong
      const box = document.getElementById(`right-${id}`);
      if (box) {
        box.classList.add('animate-shake');
        setTimeout(() => box.classList.remove('animate-shake'), 500);
      }
      setSelectedLeft(null);
    }
  };

  const handleNextRound = () => {
    if (currentRound < TOTAL_ROUNDS) {
      setCurrentRound(prev => prev + 1);
      setupRound();
    } else {
      // Finished all rounds
      onExit();
    }
  };

  const isRoundComplete = useMemo(() => {
    return shuffledLeft.length > 0 && matchedPairs.length === shuffledLeft.length;
  }, [matchedPairs, shuffledLeft]);

  if (words.length < 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h3 className="text-xl font-bold text-slate-700 mb-4">단어가 없습니다</h3>
        <p className="text-slate-500 mb-6">학습을 먼저 진행해주세요.</p>
        <button onClick={onExit} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">돌아가기</button>
      </div>
    );
  }

  // Common styling for consistency
  const cardBaseClass = "w-full h-24 flex items-center justify-center rounded-xl border-2 shadow-sm transition-all duration-200 px-2";

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800">복습 모드</h2>
            <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1 rounded-full">
                Round {currentRound} / {TOTAL_ROUNDS}
            </span>
        </div>
        <button onClick={onExit} className="text-slate-500 hover:text-slate-700">나가기</button>
      </div>

      <div className="flex-1 flex gap-4 md:gap-8 justify-center items-start overflow-y-auto">
        {/* LEFT COLUMN (KANJI) */}
        <div className="flex flex-col gap-4 w-1/2">
          {shuffledLeft.map(word => {
            const isMatched = matchedPairs.includes(word.id);
            const isSelected = selectedLeft === word.id;
            
            return (
              <button
                key={word.id}
                onClick={() => handleLeftClick(word.id)}
                disabled={isMatched}
                className={`
                  ${cardBaseClass} text-2xl font-bold
                  ${isMatched 
                    ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-default opacity-50' 
                    : isSelected 
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-700' 
                      : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-800 hover:shadow-md'
                  }
                `}
              >
                {word.kanji}
              </button>
            );
          })}
        </div>

        {/* RIGHT COLUMN (TARGET - MIXED) */}
        <div className="flex flex-col gap-4 w-1/2">
          {shuffledRight.map(item => {
            const { word, targetType } = item;
            const isMatched = matchedPairs.includes(word.id);
            
            return (
              <button
                id={`right-${word.id}`}
                key={word.id}
                onClick={() => handleRightClick(word.id)}
                disabled={isMatched}
                className={`
                  ${cardBaseClass}
                  ${isMatched
                    ? 'bg-green-50 border-green-200 text-green-300 cursor-default opacity-50'
                    : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-700 hover:shadow-md'
                  }
                `}
              >
                {targetType === 'HIRAGANA' ? (
                  <span className="text-xl font-bold truncate text-slate-700">{word.hiragana}</span>
                ) : (
                  <span className="text-md sm:text-lg line-clamp-2 leading-tight text-slate-600 font-medium">{word.meanings.join(', ')}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isRoundComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent pointer-events-none">
           {/* Overlay container enabling pointer events only for the button */}
           <div className="pointer-events-auto animate-bounce-in">
             {currentRound < TOTAL_ROUNDS ? (
               <button 
                onClick={handleNextRound}
                className="group bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-6 shadow-2xl transition-transform hover:scale-110 flex items-center justify-center"
                title="다음 라운드"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                 </svg>
               </button>
             ) : (
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center border border-indigo-100">
                    <div className="text-5xl mb-4">🏆</div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">복습 완료!</h3>
                    <p className="text-slate-500 mb-6">오늘의 복습 세션을 마쳤습니다.</p>
                    <button 
                        onClick={onExit}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-md w-full"
                    >
                        메인으로
                    </button>
                </div>
             )}
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out;
        }
        .animate-bounce-in {
            animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); opacity: 1; }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};