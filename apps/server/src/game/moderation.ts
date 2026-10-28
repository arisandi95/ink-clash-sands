import { normalizeGuess } from './normalize.js';

const BLOCKED_WORDS = [
  'anjing',
  'babi',
  'bangsat',
  'bajingan',
  'brengsek',
  'keparat',
  'kontol',
  'memek',
  'ngentot',
  'pepek',
  'tai',
  'titit',
  'sialan',
  'goblok',
  'idiot',
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'whore',
  'slut',
  'nigger',
  'faggot'
];

const BLOCKED_SET = new Set(BLOCKED_WORDS);

export function containsProfanity(value: string): boolean {
  const normalized = normalizeGuess(value);
  if (!normalized) {
    return false;
  }
  if (BLOCKED_SET.has(normalized) || BLOCKED_SET.has(normalized.replace(/\s+/g, ''))) {
    return true;
  }
  return normalized.split(' ').some((token) => BLOCKED_SET.has(token));
}

export function assertCleanNickname(nickname: string): boolean {
  return !containsProfanity(nickname);
}
