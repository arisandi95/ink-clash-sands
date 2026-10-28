import { normalizeGuess } from './normalize.js';

export function letterIndexes(word: string): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < word.length; index += 1) {
    const char = word[index] ?? '';
    if (/[\p{L}\p{N}]/u.test(char)) {
      indexes.push(index);
    }
  }
  return indexes;
}

export function wordLength(word: string): number {
  return letterIndexes(word).length;
}

export function revealCount(word: string, stage: 0 | 1 | 2): number {
  const total = wordLength(word);
  if (total <= 1) {
    return 0;
  }
  if (stage === 0) {
    return 0;
  }
  const raw = stage === 1 ? Math.floor(total / 3) : Math.floor((total * 2) / 3);
  const minimum = stage === 1 ? 1 : 2;
  return Math.min(total - 1, Math.max(minimum, raw));
}

export function buildHintTokens(word: string, revealed: Set<number>): string[] {
  const tokens: string[] = [];
  for (let index = 0; index < word.length; index += 1) {
    const char = word[index] ?? '';
    if (char === ' ') {
      tokens.push(' ');
      continue;
    }
    if (/[\p{L}\p{N}]/u.test(char)) {
      tokens.push(revealed.has(index) ? char : '_');
      continue;
    }
    tokens.push(char);
  }
  return tokens;
}

export function maskWord(word: string): string[] {
  return buildHintTokens(word, new Set());
}

export function pickRevealOrder(word: string): number[] {
  const indexes = letterIndexes(word);
  const normalized = normalizeGuess(word);
  const order = [...indexes];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    const current = order[index] as number;
    order[index] = order[swapWith] as number;
    order[swapWith] = current;
  }
  if (normalized.length === 0) {
    return order;
  }
  return order;
}

export function revealedSet(order: number[], count: number): Set<number> {
  return new Set(order.slice(0, count));
}
