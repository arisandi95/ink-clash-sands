import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CATEGORIES, type Category } from '@inkclash/shared';
import { closeDb, initDb, isDbAvailable } from '../src/db/client.js';
import { fetchActiveWords, upsertWords } from '../src/db/queries.js';
import { parseWordCsv } from '../src/game/words.js';

async function main(): Promise<void> {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: pnpm words:import <file.csv>');
    console.error('Format CSV: text,category (tanpa header, satu kata per baris).');
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    console.error(`File tidak ditemukan: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const { entries, errors } = parseWordCsv(content);
  if (errors.length > 0) {
    console.error('Ada baris yang tidak valid:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  if (entries.length === 0) {
    console.error('Tidak ada kata yang bisa diimpor.');
    process.exitCode = 1;
    return;
  }

  const available = await initDb();
  if (!available || !isDbAvailable()) {
    console.error('MySQL tidak tersedia. Jalankan `pnpm db:up` lalu coba lagi.');
    process.exitCode = 1;
    return;
  }

  const existing = await fetchActiveWords();
  const existingKeys = new Set(existing.map((row) => `${row.category}::${row.text.toLowerCase()}`));
  const fresh: { text: string; category: string }[] = [];
  const duplicates: string[] = [];
  for (const entry of entries) {
    const key = `${entry.category}::${entry.text}`;
    if (existingKeys.has(key)) {
      duplicates.push(`${entry.text} (${entry.category})`);
      continue;
    }
    existingKeys.add(key);
    fresh.push(entry);
  }

  if (fresh.length > 0) {
    await upsertWords(fresh);
  }

  for (const category of CATEGORIES) {
    if (category === 'umum') {
      continue;
    }
    const count = fresh.filter((entry) => entry.category === (category as Category)).length;
    if (count > 0) {
      console.log(`  ${category}: +${count}`);
    }
  }
  console.log(`${fresh.length} kata baru ditambahkan.`);
  if (duplicates.length > 0) {
    console.log(`${duplicates.length} kata dilewati karena sudah ada:`);
    for (const duplicate of duplicates.slice(0, 20)) {
      console.log(`  - ${duplicate}`);
    }
    if (duplicates.length > 20) {
      console.log(`  ... dan ${duplicates.length - 20} lainnya.`);
    }
  }
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
