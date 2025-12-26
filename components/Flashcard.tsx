import React, { useState } from 'react';
import { Word } from '../types';
import { AudioButton } from './AudioButton';

interface FlashcardProps {
  word: Word;
  onNext: () => void;
  onPrev?: () => void;
  isLast: boolean;
  isFirst?: boolean;
  onFinishBatch: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ word, onNext, onPrev, isLast, isFirst = false, onFinishBatch }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Helper to parse "私[わたし]" into ruby tags
  const renderFurigana = (text: string) => {
    // Regex to match Kanji[Kana] pattern
    const parts = text.split(/(\p{sc=Han}+\[[^\]]+\])/u);
    
    return parts.map((part, index) => {
      const match = part.match(/(\p{sc=Han}+)\[([^\]]+)\]/u);
      if (match) {
        return (
          <ruby key={index} className="mx-0.5 font-normal">
            {match[1]}
            <rt className="text-xs text-indigo-600 select-none">{match[2]}</rt>
          </ruby>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Determine font size based on Kanji length to fit single line
  const getKanjiFontSize = (text: string) => {
    const len = text.length;
    if (len <= 1) return 'text-9xl';
    if (len === 2) return 'text-8xl';
    if (len === 3) return 'text-7xl';
    if (len === 4) return 'text-6xl';
    return 'text-5xl';
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    if (isLast) {
      onFinishBatch();
    } else {
      onNext();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onPrev) {
          setIsFlipped(false);
          onPrev();
      }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto h-[550px] perspective-1000">
      <div 
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* FRONT */}
        <div className="absolute w-full h-full bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col items-center justify-center backface-hidden p-8">
          <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-4">Level {word.level}</div>
          
          {/* Dynamic Kanji Size */}
          <div className={`w-full text-center font-bold text-slate-800 mb-8 font-serif whitespace-nowrap ${getKanjiFontSize(word.kanji)}`}>
            {word.kanji}
          </div>
          
          <div className="mt-4 text-slate-400 text-sm">카드를 터치하여 뒤집기</div>
          
          <div className="absolute bottom-6 right-6">
            <AudioButton text={word.kanji} className="bg-slate-100 text-slate-600" />
          </div>
        </div>

        {/* BACK */}
        <div className="absolute w-full h-full bg-white border border-indigo-100 rounded-2xl shadow-xl flex flex-col backface-hidden rotate-y-180 overflow-hidden">
          {/* Image Header */}
          <div className="h-48 w-full relative bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
            {word.imageUrl ? (
              <img src={word.imageUrl} alt={word.kanji} className="w-full h-full object-cover animate-fade-in" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                 <svg className="animate-spin h-8 w-8 text-indigo-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <span className="text-xs">AI가 이미지를 생성 중입니다...</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-full p-1 shadow z-10">
               <AudioButton text={word.kanji} />
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col overflow-y-auto">
            <div className="flex justify-between items-baseline mb-2">
              <h2 className="text-3xl font-bold text-indigo-700">{word.hiragana}</h2>
              <span className="text-slate-400 font-mono text-sm">{word.romaji}</span>
            </div>
            
            <div className="mb-4">
               {word.meanings.map((m, i) => (
                 <span key={i} className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm mr-2 mb-1">
                   {m}
                 </span>
               ))}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-400 font-bold mb-2 uppercase">Example</div>
              <div className="text-lg text-slate-800 mb-1 leading-relaxed">
                {renderFurigana(word.exampleSentence)}
                <AudioButton text={word.exampleSentence} className="inline-flex ml-2 align-middle w-6 h-6 p-0" />
              </div>
              <div className="text-sm text-slate-500">{word.exampleMeaning}</div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-2">
             <button
                onClick={handlePrev}
                disabled={!onPrev || isFirst}
                className={`flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors ${(!onPrev || isFirst) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
             >
                이전
             </button>
            <button 
              onClick={handleNext}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md"
            >
              {isLast ? "학습 완료" : "다음"}
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};