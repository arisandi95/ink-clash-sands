import { describe, expect, it } from 'vitest';
import { CATEGORIES, type Category } from '@inkclash/shared';
import { parseWordCsv, wordBank } from '../src/game/words.js';

describe('word bank', () => {
  it('loads at least 80 words for every thematic category', () => {
    for (const category of CATEGORIES) {
      if (category === 'umum') {
        continue;
      }
      expect(wordBank.count(category as Category)).toBeGreaterThanOrEqual(80);
    }
  });

  it('builds the umum category as the union of all categories', () => {
    const umum = new Set(wordBank.getWords('umum'));
    expect(umum.size).toBeGreaterThanOrEqual(320);
    expect(umum.has('kucing')).toBe(true);
    expect(umum.has('rendang')).toBe(true);
    expect(umum.has('javascript')).toBe(true);
  });

  it('picks three unique words outside the exclusion set', () => {
    const picks = wordBank.pick('hewan', new Set(), 3);
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
  });

  it('parses csv and reports invalid rows', () => {
    const result = parseWordCsv('kucing,hewan\nrendang,makanan-indonesia\nx,hewan\n,film\n');
    expect(result.entries).toHaveLength(2);
    expect(result.errors).toHaveLength(2);
  });
});
