import React from 'react';
import { Word } from '../types';
import { AudioButton } from './AudioButton';

interface WordListProps {
  words: Word[];
  onClose: () => void;
}

export const WordList: React.FC<WordListProps> = ({ words, onClose }) => {
  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">내 단어장</h2>
            <p className="text-slate-500 text-sm mt-1">총 {words.length}개의 단어를 학습했습니다.</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-800 px-4 py-2">닫기</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {words.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p>아직 학습한 단어가 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {words.map((word) => (
              <div key={word.id} className="border border-slate-100 rounded-lg p-4 hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-3xl font-bold text-indigo-900">{word.kanji}</div>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">N{word.level}</span>
                </div>
                <div className="text-lg font-semibold text-indigo-600 mb-1">{word.hiragana}</div>
                <div className="text-sm text-slate-500 mb-2 font-mono">{word.romaji}</div>
                <div className="text-slate-800 font-medium">{word.meanings.join(', ')}</div>
                
                <div className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AudioButton text={word.kanji} className="w-8 h-8 p-1 bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};