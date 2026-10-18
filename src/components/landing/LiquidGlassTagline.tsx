import React from 'react';

interface LiquidGlassTaglineProps {
  isVisible?: boolean;
  className?: string;
}

// Exact approved copy: "Intelligence ur way"
const TAGLINE_WORDS = [
  { text: 'Intelligence', startIndex: 0 },
  { text: 'ur', startIndex: 13 },
  { text: 'way', startIndex: 16 }
];

export const LiquidGlassTagline: React.FC<LiquidGlassTaglineProps> = ({
  isVisible = true,
  className = ''
}) => {
  return (
    <div
      aria-label="Intelligence ur way"
      className={`liquid-glass-tagline-container mt-5 sm:mt-7 select-text transition-all duration-1000 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 filter-none'
          : 'opacity-0 translate-y-4 blur-[2px]'
      } ${className}`}
    >
      <p className="liquid-glass-tagline flex items-center justify-center flex-wrap m-0 p-0">
        {TAGLINE_WORDS.map((wordObj, wordIdx) => (
          <span
            key={wordIdx}
            className="liquid-glass-word inline-flex items-center"
            style={{ marginRight: wordIdx < TAGLINE_WORDS.length - 1 ? '0.34em' : '0' }}
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
                  className="liquid-glass-char select-text text-lg sm:text-2xl md:text-[1.7rem] font-semibold tracking-[0.035em] leading-none"
                >
                  {char}
                </span>
              );
            })}
          </span>
        ))}
      </p>
    </div>
  );
};
