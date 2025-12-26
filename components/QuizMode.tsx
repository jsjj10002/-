import React, { useState, useEffect, useMemo } from 'react';
import { Word } from '../types';
import { AudioButton } from './AudioButton';

interface QuizModeProps {
  words: Word[];
  onExit: () => void;
}

type QuizType = 'MATCHING' | 'TYPING' | 'SENTENCE' | 'LISTENING';

export const QuizMode: React.FC<QuizModeProps> = ({ words, onExit }) => {
  const TOTAL_ROUNDS = 10;
  const [currentRound, setCurrentRound] = useState(1);
  const [currentType, setCurrentType] = useState<QuizType>('MATCHING');
  
  // Game States
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  
  // Matching State
  const [matchingLeft, setMatchingLeft] = useState<Word[]>([]);
  const [matchingRight, setMatchingRight] = useState<{id: string, text: string, type: 'HIRAGANA'|'MEANING'}[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Typing State
  const [typingInput, setTypingInput] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<'NONE'|'CORRECT'|'WRONG'>('NONE');

  // Sentence State
  const [sentenceBlocks, setSentenceBlocks] = useState<{id: number, text: string}[]>([]);
  const [userSentence, setUserSentence] = useState<{id: number, text: string}[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<'NONE'|'CORRECT'|'WRONG'>('NONE');

  // Listening State
  const [listeningOptions, setListeningOptions] = useState<Word[]>([]);
  const [listeningFeedback, setListeningFeedback] = useState<'NONE'|'CORRECT'|'WRONG'>('NONE');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
      setupRound();
  }, []);

  const setupRound = () => {
    if (words.length === 0) return;
    
    // Pick a random quiz type
    const types: QuizType[] = ['MATCHING', 'TYPING', 'SENTENCE', 'LISTENING'];
    const nextType = types[Math.floor(Math.random() * types.length)];
    setCurrentType(nextType);
    
    // Select primary word for non-matching types
    const randomWord = words[Math.floor(Math.random() * words.length)];
    setCurrentWord(randomWord);

    // Reset states
    setTypingInput('');
    setTypingFeedback('NONE');
    setSentenceFeedback('NONE');
    setListeningFeedback('NONE');
    setSelectedOption(null);
    setUserSentence([]);

    if (nextType === 'MATCHING') {
        // Setup matching game (mini version with 3 pairs)
        const pool = [...words].sort(() => 0.5 - Math.random()).slice(0, 3);
        setMatchingLeft(pool);
        setMatchingRight(pool.map(w => ({
            id: w.id,
            text: Math.random() > 0.5 ? w.hiragana : w.meanings[0],
            type: 'HIRAGANA'
        })).sort(() => 0.5 - Math.random()) as any);
        setMatchingPairs([]);
        setSelectedLeft(null);
    } else if (nextType === 'SENTENCE') {
        // Clean sentence: remove furigana
        const cleanSentence = randomWord.exampleSentence.replace(/\[.*?\]/g, '');
        // Naive split by spaces or just chars or simple segmentation
        // Since we don't have a tokenizer, we'll try to split by the word itself + particles
        // Simplified: Split into chunks of 2-4 chars
        const chunks = [];
        let remaining = cleanSentence;
        while(remaining.length > 0) {
            const len = Math.floor(Math.random() * 3) + 2; // 2 to 4
            chunks.push(remaining.slice(0, len));
            remaining = remaining.slice(len);
        }
        
        setSentenceBlocks(chunks.map((t, i) => ({id: i, text: t})).sort(() => 0.5 - Math.random()));
    } else if (nextType === 'LISTENING') {
        // 1 correct + 3 wrong options
        const wrongOptions = words.filter(w => w.id !== randomWord.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        const options = [randomWord, ...wrongOptions].sort(() => 0.5 - Math.random());
        setListeningOptions(options);
    }
  };

  const handleNext = () => {
      if (currentRound < TOTAL_ROUNDS) {
          setCurrentRound(prev => prev + 1);
          setupRound();
      } else {
          onExit();
      }
  };

  // --- Handlers ---

  // MATCHING
  const handleMatchLeft = (id: string) => { if (!matchingPairs.includes(id)) setSelectedLeft(id); };
  const handleMatchRight = (id: string) => {
      if (!selectedLeft || matchingPairs.includes(id)) return;
      if (selectedLeft === id) {
          const newPairs = [...matchingPairs, id];
          setMatchingPairs(newPairs);
          setSelectedLeft(null);
          if (newPairs.length === matchingLeft.length) {
              setTimeout(handleNext, 1000);
          }
      } else {
          const el = document.getElementById(`right-${id}`);
          el?.classList.add('animate-shake');
          setTimeout(() => el?.classList.remove('animate-shake'), 500);
          setSelectedLeft(null);
      }
  };

  // TYPING
  const checkTyping = () => {
      if (!currentWord) return;
      if (typingInput.trim() === currentWord.hiragana) {
          setTypingFeedback('CORRECT');
          setTimeout(handleNext, 1500);
      } else {
          setTypingFeedback('WRONG');
      }
  };

  // SENTENCE
  const toggleSentenceBlock = (block: {id: number, text: string}, isUsed: boolean) => {
      if (isUsed) {
          // Return to pool
          setUserSentence(prev => prev.filter(b => b.id !== block.id));
          setSentenceBlocks(prev => [...prev, block]);
      } else {
          // Add to sentence
          setSentenceBlocks(prev => prev.filter(b => b.id !== block.id));
          setUserSentence(prev => [...prev, block]);
      }
  };
  const checkSentence = () => {
      if (!currentWord) return;
      const attempt = userSentence.map(b => b.text).join('');
      const target = currentWord.exampleSentence.replace(/\[.*?\]/g, '');
      if (attempt === target) {
          setSentenceFeedback('CORRECT');
          setTimeout(handleNext, 1500);
      } else {
          setSentenceFeedback('WRONG');
      }
  };

  // LISTENING
  const checkListening = (selectedId: string) => {
      if (!currentWord) return;
      setSelectedOption(selectedId);
      if (selectedId === currentWord.id) {
          setListeningFeedback('CORRECT');
          setTimeout(handleNext, 1500);
      } else {
          setListeningFeedback('WRONG');
      }
  };


  if (words.length < 4) {
      return <div className="p-8 text-center">단어가 부족합니다. 최소 4개 이상의 단어를 학습해주세요.<br/><button onClick={onExit} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">돌아가기</button></div>;
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 w-full relative">
       {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800">퀴즈</h2>
            <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1 rounded-full">
                {currentRound} / {TOTAL_ROUNDS}
            </span>
        </div>
        <button onClick={onExit} className="text-slate-500 hover:text-slate-700">나가기</button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center w-full">
          
          {currentType === 'MATCHING' && (
              <div className="w-full">
                  <h3 className="text-xl text-center mb-6 font-bold text-slate-700">짝 맞추기</h3>
                  <div className="flex gap-4">
                      <div className="flex flex-col gap-3 w-1/2">
                          {matchingLeft.map(w => (
                              <button key={w.id} 
                                  onClick={() => handleMatchLeft(w.id)}
                                  disabled={matchingPairs.includes(w.id)}
                                  className={`p-4 rounded-xl border-2 font-bold text-xl transition-all ${matchingPairs.includes(w.id) ? 'opacity-0' : selectedLeft === w.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'bg-white border-slate-200'}`}
                              >{w.kanji}</button>
                          ))}
                      </div>
                      <div className="flex flex-col gap-3 w-1/2">
                          {matchingRight.map(item => (
                              <button key={item.id} id={`right-${item.id}`}
                                  onClick={() => handleMatchRight(item.id)}
                                  disabled={matchingPairs.includes(item.id)}
                                  className={`p-4 rounded-xl border-2 transition-all ${matchingPairs.includes(item.id) ? 'opacity-0' : 'bg-white border-slate-200'}`}
                              >{item.text}</button>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {currentType === 'TYPING' && currentWord && (
              <div className="w-full max-w-md text-center">
                   <h3 className="text-lg text-slate-500 mb-2">히라가나를 입력하세요</h3>
                   <div className="text-6xl font-bold text-slate-800 mb-8">{currentWord.kanji}</div>
                   
                   <input 
                      type="text" 
                      value={typingInput}
                      onChange={(e) => setTypingInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && checkTyping()}
                      placeholder="예: わたし"
                      className={`w-full p-4 text-center text-2xl border-2 rounded-xl outline-none transition-colors mb-4 ${typingFeedback === 'WRONG' ? 'border-red-400 bg-red-50' : typingFeedback === 'CORRECT' ? 'border-green-400 bg-green-50' : 'border-slate-300 focus:border-indigo-500'}`}
                   />
                   
                   {typingFeedback === 'CORRECT' && <div className="text-green-600 font-bold text-lg animate-bounce">정답입니다!</div>}
                   {typingFeedback === 'WRONG' && <div className="text-red-500 font-bold mb-2">오답입니다. 정답: {currentWord.hiragana}</div>}

                   <button onClick={checkTyping} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">확인</button>
              </div>
          )}

          {currentType === 'SENTENCE' && currentWord && (
              <div className="w-full max-w-md">
                   <h3 className="text-lg text-slate-500 mb-4 text-center">문장을 완성하세요</h3>
                   <div className="bg-slate-100 p-4 rounded-xl mb-6 text-center text-slate-700 font-medium">
                       {currentWord.exampleMeaning}
                   </div>

                   {/* Answer Area */}
                   <div className="min-h-[80px] border-b-2 border-indigo-100 mb-6 flex flex-wrap gap-2 p-2 items-center justify-center">
                       {userSentence.map(block => (
                           <button key={block.id} onClick={() => toggleSentenceBlock(block, true)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold animate-fade-in">
                               {block.text}
                           </button>
                       ))}
                   </div>

                   {/* Block Pool */}
                   <div className="flex flex-wrap gap-2 justify-center mb-8">
                       {sentenceBlocks.map(block => (
                           <button key={block.id} onClick={() => toggleSentenceBlock(block, false)} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg font-bold hover:bg-slate-50 shadow-sm">
                               {block.text}
                           </button>
                       ))}
                   </div>

                   {sentenceFeedback === 'CORRECT' && <div className="text-center text-green-600 font-bold text-lg animate-bounce mb-4">정답입니다!</div>}
                   {sentenceFeedback === 'WRONG' && <div className="text-center text-red-500 font-bold mb-4">다시 시도해보세요.</div>}

                   <button onClick={checkSentence} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">확인</button>
              </div>
          )}

          {currentType === 'LISTENING' && currentWord && (
              <div className="w-full max-w-md text-center">
                  <h3 className="text-lg text-slate-500 mb-6">발음을 듣고 알맞은 단어를 고르세요</h3>
                  
                  <div className="mb-8">
                       <button 
                         onClick={() => {
                             // Force play audio
                             const u = new SpeechSynthesisUtterance(currentWord.kanji);
                             u.lang = 'ja-JP';
                             window.speechSynthesis.speak(u);
                         }}
                         className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mx-auto hover:bg-indigo-200 transition-colors"
                       >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                           </svg>
                       </button>
                       <p className="mt-2 text-sm text-slate-400">클릭하여 다시 듣기</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      {listeningOptions.map(opt => (
                          <button 
                              key={opt.id}
                              onClick={() => checkListening(opt.id)}
                              disabled={listeningFeedback === 'CORRECT'}
                              className={`p-4 border-2 rounded-xl font-bold text-lg transition-all
                                  ${selectedOption === opt.id 
                                      ? (listeningFeedback === 'CORRECT' && opt.id === currentWord.id ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700')
                                      : 'bg-white border-slate-200 hover:border-indigo-300'
                                  }
                              `}
                          >
                              {opt.meanings[0]}
                          </button>
                      ))}
                  </div>
              </div>
          )}

      </div>
      
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out; }
      `}</style>
    </div>
  );
};