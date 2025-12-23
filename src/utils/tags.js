export function tokenizeText(input) {
  const cleaned = (input || '').trim();
  if (!cleaned) return [];

  const emojiMatches = cleaned.match(/[\p{Emoji}\u2600-\u27BF]/gu) || [];
  const words = cleaned
    .replace(/[\p{Emoji}\u2600-\u27BF]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `#${word.toLowerCase()}`);

  return [...words, ...emojiMatches];
}

export function ensureTags(content, fallbackTitle = '') {
  const tokens = tokenizeText(content || '');
  const titleTokens = tokenizeText(fallbackTitle || '');
  const defaults = ['#bulle', '#réseau', '✨'];
  if (tokens.length > 0) return tokens;
  if (titleTokens.length > 0) return titleTokens;
  return defaults;
}
