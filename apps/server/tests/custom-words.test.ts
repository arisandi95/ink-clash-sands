import { describe, expect, it } from 'vitest';
import { LIMITS } from '@inkclash/shared';
import { normalizeCustomWords, pickCustomWords } from '../src/game/custom-words.js';
import { GameError } from '../src/game/room.js';

function captureError(run: () => void): GameError {
  try {
    run();
  } catch (error) {
    if (error instanceof GameError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected normalizeCustomWords to throw');
}

describe('normalizeCustomWords', () => {
  it('trims, lowercases, collapses spaces and removes duplicates', () => {
    const result = normalizeCustomWords(['  Apel ', 'APEL', 'nasi   goreng', 'Pisang']);
    expect(result.words).toEqual(['apel', 'nasi goreng', 'pisang']);
  });

  it('returns an empty list when the input is undefined', () => {
    expect(normalizeCustomWords(undefined).words).toEqual([]);
  });

  it('skips blank entries', () => {
    expect(normalizeCustomWords(['apel', '   ', '', 'jeruk']).words).toEqual(['apel', 'jeruk']);
  });

  it('rejects words that are too short or have no letters', () => {
    expect(captureError(() => normalizeCustomWords(['a'])).code).toBe('invalid_custom_words');
    expect(captureError(() => normalizeCustomWords(['!!'])).code).toBe('invalid_custom_words');
  });

  it('rejects words longer than the maximum length', () => {
    const tooLong = 'a'.repeat(LIMITS.customWordMaxLen + 1);
    expect(captureError(() => normalizeCustomWords([tooLong])).code).toBe('invalid_custom_words');
  });

  it('rejects profanity', () => {
    const error = captureError(() => normalizeCustomWords(['anjing']));
    expect(error.code).toBe('invalid_custom_words');
    expect(error.message).toContain('tidak boleh dipakai');
  });

  it('rejects more than the maximum number of unique words', () => {
    const input = Array.from(
      { length: LIMITS.maxCustomWords + 1 },
      (_, index) => `kata${index + 1}`
    );
    const error = captureError(() => normalizeCustomWords(input));
    expect(error.code).toBe('invalid_custom_words');
    expect(error.message).toContain(String(LIMITS.maxCustomWords));
  });

  it('keeps exactly the maximum number of unique words', () => {
    const input = Array.from({ length: LIMITS.maxCustomWords }, (_, index) => `kata${index + 1}`);
    expect(normalizeCustomWords(input).words).toHaveLength(LIMITS.maxCustomWords);
  });
});

describe('pickCustomWords', () => {
  it('returns three unique words from the custom list', () => {
    const picks = pickCustomWords(['apel', 'jeruk', 'pisang', 'mangga'], new Set(), 3);
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
    for (const word of picks) {
      expect(['apel', 'jeruk', 'pisang', 'mangga']).toContain(word);
    }
  });

  it('excludes words that were already used', () => {
    const picks = pickCustomWords(['apel', 'jeruk', 'pisang', 'mangga'], new Set(['apel', 'jeruk']), 3);
    expect(picks.sort()).toEqual(['mangga', 'pisang']);
  });

  it('returns an empty list when every word has been used', () => {
    expect(pickCustomWords(['apel', 'jeruk'], new Set(['apel', 'jeruk']), 3)).toEqual([]);
  });
});
