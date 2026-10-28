import { describe, expect, it } from 'vitest';
import { guessScore } from '../src/game/scoring.js';
import { isCloseGuess, levenshtein, normalizeGuess } from '../src/game/normalize.js';

describe('scoring', () => {
  it('gives more points when answering early', () => {
    const early = guessScore(80_000, 80_000, 0);
    const late = guessScore(10_000, 80_000, 0);
    expect(early).toBeGreaterThan(late);
    expect(early).toBe(600);
  });

  it('applies a decreasing multiplier for later guessers', () => {
    const first = guessScore(40_000, 80_000, 0);
    const second = guessScore(40_000, 80_000, 1);
    const third = guessScore(40_000, 80_000, 2);
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(third);
  });

  it('never returns less than 50', () => {
    expect(guessScore(0, 80_000, 10)).toBeGreaterThanOrEqual(50);
  });
});

describe('guess normalization', () => {
  it('normalizes case, accents and punctuation', () => {
    expect(normalizeGuess('  Kucing!! ')).toBe('kucing');
    expect(normalizeGuess('Café  au   lait')).toBe('cafe au lait');
  });

  it('computes levenshtein distance', () => {
    expect(levenshtein('kucing', 'kucing')).toBe(0);
    expect(levenshtein('kucing', 'kucin')).toBe(1);
    expect(levenshtein('kucing', 'anjing')).toBe(3);
  });

  it('accepts one-character typos as close guesses', () => {
    expect(isCloseGuess('kucin', 'kucing')).toBe(true);
    expect(isCloseGuess('anjing', 'kucing')).toBe(false);
  });
});
