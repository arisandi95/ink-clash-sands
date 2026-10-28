import { expect, test } from '@playwright/test';
import {
  VISUAL_DIR,
  chooseWord,
  createRoom,
  ensureVisualDir,
  expectNoErrors,
  joinRoom,
  waitForWordChooser,
  watchPage
} from './helpers';

const CUSTOM_WORDS = ['melon', 'semangka', 'anggur', 'pepaya'];

test('host plays a round using custom words instead of a default category', async ({ browser }) => {
  test.setTimeout(120_000);
  ensureVisualDir();
  const errors: string[] = [];
  const names = ['Rani', 'Budi'];
  const contexts = await Promise.all(
    names.map(() => browser.newContext({ viewport: { width: 1280, height: 800 } }))
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  pages.forEach((page, index) => watchPage(page, errors, names[index] as string));

  const [host, guest] = pages as [(typeof pages)[number], (typeof pages)[number]];

  const code = await createRoom(host, 'Rani');
  await joinRoom(guest, code, 'Budi');
  await host.getByText('Budi').first().waitFor();

  await host.getByText('Kata kustom', { exact: true }).click();
  const wordsInput = host.getByLabel('Masukkan kata (pisahkan dengan koma atau baris baru)');
  await wordsInput.fill(CUSTOM_WORDS.join('\n'));
  await expect(host.getByText('4/50 kata')).toBeVisible();
  await host.screenshot({ path: `${VISUAL_DIR}/lobby-custom-words.png` });

  await host.getByRole('button', { name: 'Mulai game' }).click();

  const drawer = await waitForWordChooser(pages);
  const guesser = pages.find((page) => page !== drawer) as (typeof pages)[number];
  const labels = await drawer
    .locator('button[aria-label^="Pilih kata"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
  expect(labels).toHaveLength(3);
  for (const label of labels) {
    expect(CUSTOM_WORDS).toContain(label.replace('Pilih kata ', '').trim());
  }

  const word = await chooseWord(drawer);
  expect(CUSTOM_WORDS).toContain(word);
  await drawer.getByText('Kamu menggambar').waitFor();

  const guessInput = guesser.locator('#chat-input');
  await expect(guessInput).toBeEnabled();
  await guessInput.fill(word);
  await guessInput.press('Enter');

  await expect(drawer.getByText('Semua menebak dengan benar!')).toBeVisible();
  await expect(drawer.getByText('Katanya', { exact: true })).toBeVisible();

  await expectNoErrors(errors);
  await Promise.all(contexts.map((context) => context.close()));
});
