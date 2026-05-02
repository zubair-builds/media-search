import React from 'react';

interface HighlightTextProps {
  text: string;
  keyword: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Keyword-in-Context highlighter component.
// It wraps matches in <mark> tags. If the text is long (>100 chars),
// it slices a window around the match to save screen real estate.
export const HighlightText: React.FC<HighlightTextProps> = ({ text, keyword }) => {
  if (!keyword) return <>{text}</>;

  const escapedKeyword = escapeRegExp(keyword);
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = text.split(regex);

  const matchIndex = parts.findIndex(p => p.toLowerCase() === keyword.toLowerCase());

  if (matchIndex !== -1 && text.length > 100) {
    const windowSize = 40;
    let startText = parts.slice(0, matchIndex).join('');
    let endText = parts.slice(matchIndex + 1).join('');

    startText = startText.length > windowSize ? '...' + startText.slice(-windowSize) : startText;
    endText = endText.length > windowSize ? endText.slice(0, windowSize) + '...' : endText;

    return (
      <>
        {startText}
        <mark className="bg-yellow-200 px-1 rounded text-gray-900 font-semibold">{parts[matchIndex]}</mark>
        {endText}
      </>
    );
  }

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-200 px-1 rounded text-gray-900 font-semibold">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};
