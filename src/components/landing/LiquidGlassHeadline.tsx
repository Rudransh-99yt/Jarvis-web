import React from 'react';

interface LiquidGlassHeadlineProps {
  visibleWordsCount: number;
  className?: string;
}

// Exact approved copy: "Your mind with more possibilities everyday"
const HEADLINE_WORDS = [
  { text: 'Your', startIndex: 0 },
  { text: 'mind', startIndex: 5 },
  { text: 'with', startIndex: 10 },
  { text: 'more', startIndex: 15 },
  { text: 'possibilities', startIndex: 20 },
  { text: 'everyday', startIndex: 34 }
];

export const LiquidGlassHeadline: React.FC<LiquidGlassHeadlineProps> = ({
  visibleWordsCount,
  className = ''
}) => {
  return (
    <h1
      aria-label="Your mind with more possibilities everyday"
      className={`liquid-glass-headline flex items-center justify-center flex-wrap text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.5rem] font-extrabold tracking-[-0.035em] leading-[1.08] select-text m-0 p-0 ${className}`}
    >
      {HEADLINE_WORDS.map((wordObj, wordIdx) => {
        const isVisible = visibleWordsCount > wordIdx;
        return (
          <span
            key={wordIdx}
            className={`inline-flex items-center transition-all duration-700 ease-out select-text ${
              isVisible
                ? 'opacity-100 translate-y-0 filter-none'
                : 'opacity-0 translate-y-5 blur-[2px]'
            }`}
            style={{
              marginRight: wordIdx < HEADLINE_WORDS.length - 1 ? '0.24em' : '0'
            }}
          >
            {wordObj.text.split('').map((char, charIdx) => {
              const globalIndex = wordObj.startIndex + charIdx;
              return (
                <span
                  key={charIdx}
                  data-char={char}
                  style={
                    {
                      '--char-index': globalIndex
                    } as React.CSSProperties
                  }
                  className="liquid-glass-headline-char inline-block select-text"
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
};
