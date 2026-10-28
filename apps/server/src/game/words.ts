import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, type Category } from '@inkclash/shared';
import { fetchActiveWords } from '../db/queries.js';

const WORD_FILES: Record<Exclude<Category, 'umum'>, string> = {
  hewan: 'hewan.txt',
  'makanan-indonesia': 'makanan-indonesia.txt',
  film: 'film.txt',
  programming: 'programming.txt'
};

function wordFileCandidates(file: string): string[] {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.resolve(moduleDir, '../../words', file),
    path.resolve(process.cwd(), 'apps/server/words', file),
    path.resolve(process.cwd(), 'words', file)
  ];
}

function readWordFile(file: string): string[] {
  for (const candidate of wordFileCandidates(file)) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line.length >= 2 && line.length <= 64 && !line.startsWith('#'));
    }
  }
  return [];
}

export function normalizeWord(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isValidWord(text: string): boolean {
  const normalized = normalizeWord(text);
  return normalized.length >= 2 && normalized.length <= 64 && /\p{L}/u.test(normalized);
}

export class WordBank {
  private readonly categories = new Map<Category, Set<string>>();
  private loadedFromDb = false;

  constructor() {
    for (const category of CATEGORIES) {
      this.categories.set(category, new Set());
    }
    for (const [category, file] of Object.entries(WORD_FILES) as [Exclude<Category, 'umum'>, string][]) {
      const bank = this.categories.get(category);
      for (const word of readWordFile(file)) {
        bank?.add(word);
      }
    }
  }

  async refreshFromDb(): Promise<void> {
    try {
      const rows = await fetchActiveWords();
      if (rows.length === 0) {
        return;
      }
      for (const row of rows) {
        const category = row.category as Category;
        if (!this.categories.has(category) || category === 'umum') {
          continue;
        }
        this.categories.get(category)?.add(normalizeWord(row.text));
      }
      this.loadedFromDb = true;
    } catch (error) {
      console.warn('[words] gagal memuat kata dari MySQL, memakai bank bawaan.', error);
    }
  }

  isLoadedFromDb(): boolean {
    return this.loadedFromDb;
  }

  count(category: Category): number {
    return this.getWords(category).length;
  }

  getWords(category: Category): string[] {
    if (category === 'umum') {
      const all = new Set<string>();
      for (const [key, bank] of this.categories) {
        if (key === 'umum') {
          continue;
        }
        for (const word of bank) {
          all.add(word);
        }
      }
      return [...all];
    }
    return [...(this.categories.get(category) ?? new Set<string>())];
  }

  add(category: Category, word: string): boolean {
    if (category === 'umum' || !isValidWord(word)) {
      return false;
    }
    const bank = this.categories.get(category);
    if (!bank) {
      return false;
    }
    const normalized = normalizeWord(word);
    if (bank.has(normalized)) {
      return false;
    }
    bank.add(normalized);
    return true;
  }

  pick(category: Category, exclude: Set<string>, count = 3): string[] {
    let pool = this.getWords(category).filter((word) => !exclude.has(word));
    if (pool.length < count) {
      pool = this.getWords(category);
    }
    const shuffled = [...pool];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapWith = Math.floor(Math.random() * (index + 1));
      const current = shuffled[index] as string;
      shuffled[index] = shuffled[swapWith] as string;
      shuffled[swapWith] = current;
    }
    return shuffled.slice(0, count);
  }

  has(category: Category, word: string): boolean {
    return this.getWords(category).includes(normalizeWord(word));
  }
}

export function parseWordCsv(content: string): { entries: { text: string; category: string }[]; errors: string[] } {
  const entries: { text: string; category: string }[] = [];
  const errors: string[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const parts = trimmed.split(',').map((part) => part.trim());
    if (parts.length < 2) {
      errors.push(`Baris ${index + 1}: format harus text,category`);
      return;
    }
    const [textRaw, categoryRaw] = parts;
    const text = normalizeWord(textRaw ?? '');
    const category = (categoryRaw ?? '').toLowerCase() as Category;
    if (!isValidWord(text)) {
      errors.push(`Baris ${index + 1}: kata tidak valid ("${textRaw ?? ''}")`);
      return;
    }
    if (!CATEGORIES.includes(category) || category === 'umum') {
      errors.push(`Baris ${index + 1}: kategori tidak dikenal ("${categoryRaw ?? ''}")`);
      return;
    }
    entries.push({ text, category });
  });
  return { entries, errors };
}

export const wordBank = new WordBank();
