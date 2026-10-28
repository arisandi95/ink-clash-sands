import { describe, expect, it } from 'vitest';
import {
  buildHintTokens,
  letterIndexes,
  pickRevealOrder,
  revealCount,
  revealedSet,
  wordLength
} from '../src/game/hints.js';

describe('hints', () => {
  it('counts only letters and numbers', () => {
    expect(wordLength('nasi goreng')).toBe(10);
    expect(letterIndexes('a-b c')).toEqual([0, 2, 4]);
  });

  it('masks hidden letters but keeps spaces and punctuation', () => {
    expect(buildHintTokens('nasi goreng', new Set())).toEqual([
      '_',
      '_',
      '_',
      '_',
      ' ',
      '_',
      '_',
      '_',
      '_',
      '_',
      '_'
    ]);
    expect(buildHintTokens('up', new Set([0]))).toEqual(['u', '_']);
  });

  it('never reveals the whole word', () => {
    for (const word of ['kucing', 'nasi goreng', 'api', 'go']) {
      expect(revealCount(word, 1)).toBeLessThan(wordLength(word));
      expect(revealCount(word, 2)).toBeLessThan(wordLength(word));
    }
  });

  it('reveals letters in stages', () => {
    const order = pickRevealOrder('kucing');
    expect(revealedSet(order, 2).size).toBe(2);
    const hint = buildHintTokens('kucing', revealedSet(order, 2));
    expect(hint.filter((token) => token !== '_')).toHaveLength(2);
  });
});
