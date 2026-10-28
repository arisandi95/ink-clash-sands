import { LIMITS } from '@inkclash/shared';
import { containsProfanity } from './moderation.js';
import { isValidWord, normalizeWord } from './words.js';
import { GameError } from './room.js';

export interface CustomWordsResult {
  words: string[];
}

/**
 * Normalizes and validates a room custom word list.
 * Words are trimmed, lowercased, deduplicated and capped at LIMITS.maxCustomWords.
 * Throws GameError when a word is invalid or contains profanity.
 */
export function normalizeCustomWords(input: readonly string[] | undefined): CustomWordsResult {
  if (!input) {
    return { words: [] };
  }
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of input) {
    const normalized = normalizeWord(raw ?? '');
    if (!normalized) {
      continue;
    }
    if (!isValidWord(normalized)) {
      throw new GameError(
        'invalid_custom_words',
        `Kata kustom "${raw}" tidak valid (minimal ${LIMITS.customWordMinLen} karakter, maksimal ${LIMITS.customWordMaxLen} karakter, hanya huruf/angka).`
      );
    }
    if (containsProfanity(normalized)) {
      throw new GameError('invalid_custom_words', `Kata kustom "${raw}" tidak boleh dipakai.`);
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    words.push(normalized);
    if (words.length > LIMITS.maxCustomWords) {
      throw new GameError(
        'invalid_custom_words',
        `Maksimal ${LIMITS.maxCustomWords} kata kustom per room.`
      );
    }
  }
  return { words };
}

/**
 * Picks up to `count` words from the custom list, excluding already used words.
 */
export function pickCustomWords(
  customWords: readonly string[],
  exclude: ReadonlySet<string>,
  count = 3
): string[] {
  const pool = customWords.filter((word) => !exclude.has(word));
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index] as string;
    shuffled[index] = shuffled[swapWith] as string;
    shuffled[swapWith] = current;
  }
  return shuffled.slice(0, count);
}
