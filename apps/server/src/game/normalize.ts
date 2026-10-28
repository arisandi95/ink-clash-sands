export function normalizeGuess(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

export function isCloseGuess(guess: string, word: string): boolean {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedWord = normalizeGuess(word);
  if (!normalizedGuess || !normalizedWord) {
    return false;
  }
  if (Math.abs(normalizedGuess.length - normalizedWord.length) > 1) {
    return false;
  }
  return levenshtein(normalizedGuess, normalizedWord) <= 1;
}
