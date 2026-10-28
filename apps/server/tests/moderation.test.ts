import { describe, expect, it } from 'vitest';
import { containsProfanity } from '../src/game/moderation.js';

describe('moderation', () => {
  it('blocks common Indonesian and English profanity', () => {
    expect(containsProfanity('dasar bangsat')).toBe(true);
    expect(containsProfanity('FUCK this')).toBe(true);
    expect(containsProfanity('kontol')).toBe(true);
  });

  it('allows normal conversation', () => {
    expect(containsProfanity('selamat pagi tim')).toBe(false);
    expect(containsProfanity('kucing lucu')).toBe(false);
  });
});
