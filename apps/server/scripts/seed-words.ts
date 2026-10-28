import { CATEGORIES, type Category } from '@inkclash/shared';
import { closeDb, initDb, isDbAvailable } from '../src/db/client.js';
import { upsertWords } from '../src/db/queries.js';
import { wordBank } from '../src/game/words.js';

async function main(): Promise<void> {
  const available = await initDb();
  if (!available || !isDbAvailable()) {
    console.error('MySQL tidak tersedia. Jalankan `pnpm db:up` lalu coba lagi.');
    process.exitCode = 1;
    return;
  }

  let total = 0;
  for (const category of CATEGORIES) {
    if (category === 'umum') {
      continue;
    }
    const words = wordBank.getWords(category);
    if (words.length === 0) {
      console.warn(`Kategori ${category} tidak punya kata.`);
      continue;
    }
    const entries = words.map((text) => ({ text, category: category as Category }));
    const inserted = await upsertWords(entries);
    total += inserted;
    console.log(`  ${category}: ${words.length} kata (${inserted} baris diproses)`);
  }
  console.log(`Selesai. ${total} baris kata diproses.`);
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
