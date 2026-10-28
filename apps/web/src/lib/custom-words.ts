import { LIMITS } from '@inkclash/shared';

export interface ParsedCustomWords {
  words: string[];
  invalid: string[];
  tooLong: string[];
  duplicates: string[];
  tooMany: boolean;
}

/**
 * Client-side helper (UX only). The server stays authoritative.
 * Splits raw user input by comma or newline, trims, lowercases, dedupes
 * and reports problems so the lobby can show Indonesian feedback.
 */
export function parseCustomWordsInput(raw: string): ParsedCustomWords {
  const parts = raw
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const seen = new Set<string>();
  const words: string[] = [];
  const invalid: string[] = [];
  const tooLong: string[] = [];
  const duplicates: string[] = [];
  let tooMany = false;

  for (const part of parts) {
    const normalized = part.toLowerCase().replace(/\s+/g, ' ');
    if (normalized.length > LIMITS.customWordMaxLen) {
      tooLong.push(part);
      continue;
    }
    if (normalized.length < LIMITS.customWordMinLen) {
      invalid.push(part);
      continue;
    }
    if (seen.has(normalized)) {
      duplicates.push(part);
      continue;
    }
    seen.add(normalized);
    words.push(normalized);
    if (words.length > LIMITS.maxCustomWords) {
      tooMany = true;
      words.pop();
    }
  }

  return { words, invalid, tooLong, duplicates, tooMany };
}

/**
 * Builds Indonesian feedback lines for the lobby based on the parsed input.
 * Server validation stays authoritative; this is only UX guidance.
 */
export function customWordsFeedback(parsed: ParsedCustomWords): string[] {
  const messages: string[] = [];
  if (parsed.invalid.length > 0) {
    messages.push(
      `Kata terlalu pendek (minimal ${LIMITS.customWordMinLen} karakter): ${parsed.invalid.join(', ')}.`
    );
  }
  if (parsed.tooLong.length > 0) {
    messages.push(
      `Kata terlalu panjang (maksimal ${LIMITS.customWordMaxLen} karakter): ${parsed.tooLong.join(', ')}.`
    );
  }
  if (parsed.duplicates.length > 0) {
    messages.push(`Kata duplikat dilewati: ${parsed.duplicates.join(', ')}.`);
  }
  if (parsed.tooMany) {
    messages.push(`Maksimal ${LIMITS.maxCustomWords} kata kustom per room.`);
  }
  return messages;
}
