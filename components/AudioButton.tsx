import React, { useCallback } from 'react';

interface AudioButtonProps {
  text: string;
  lang?: string;
  className?: string;
  label?: string;
}

export const AudioButton: React.FC<AudioButtonProps> = ({ 
  text, 
  lang = 'ja-JP', 
  className = "",
  label
}) => {
  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip if clicked inside card
    
    // Clean text for speech (remove brackets for furigana)
    const cleanText = text.replace(/\[.*?\]/g, '');

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.cancel(); // Stop previous
      window.speechSynthesis.speak(utterance);
    } else {
      alert("이 브라우저는 음성 합성을 지원하지 않습니다.");
    }
  }, [text, lang]);

  return (
    <button 
      onClick={handlePlay}
      className={`flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
      title="발음 듣기"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
      {label && <span className="ml-1 text-sm">{label}</span>}
    </button>
  );
};