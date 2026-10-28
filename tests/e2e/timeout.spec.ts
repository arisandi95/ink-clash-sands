import { expect, test } from '@playwright/test';
import {
  VISUAL_DIR,
  chooseWord,
  createRoom,
  ensureVisualDir,
  expectNoErrors,
  joinRoom,
  setRounds,
  waitForWordChooser,
  watchPage
} from './helpers';

const DRAW_SECONDS = 80;
const JUMP_MS = DRAW_SECONDS * 1000 - 7_000;

async function jumpClock(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate((jump) => {
    const real = Date.now.bind(Date);
    Date.now = () => real() + jump;
  }, JUMP_MS);
}

test('timeout panic renders for guessers only', async ({ browser }) => {
  test.setTimeout(120_000);
  ensureVisualDir();
  const errors: string[] = [];
  const viewport = { width: 1280, height: 800 };
  const contexts = await Promise.all([
    browser.newContext({ viewport }),
    browser.newContext({ viewport }),
    browser.newContext({ viewport })
  ]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  pages.forEach((page, index) => watchPage(page, errors, `player-${index}`));

  const [host, guestA, guestB] = pages as [
    (typeof pages)[number],
    (typeof pages)[number],
    (typeof pages)[number]
  ];

  const code = await createRoom(host, 'Rani');
  await joinRoom(guestA, code, 'Budi');
  await joinRoom(guestB, code, 'Sari');
  await host.getByText('Sari').first().waitFor();
  await setRounds(host, 1);
  await host.getByRole('button', { name: 'Mulai game' }).click();

  const drawer = await waitForWordChooser(pages);
  const guessers = pages.filter((page) => page !== drawer);
  const word = await chooseWord(drawer);
  await drawer.getByText('Kamu menggambar').waitFor();

  const normal = guessers[0]!;
  await jumpClock(normal);
  await normal.waitForTimeout(1_500);
  const overlay = normal.getByTestId('timeout-panic');
  await expect(overlay).toHaveAttribute('data-active', 'true', { timeout: 8_000 });
  await normal.screenshot({ path: `${VISUAL_DIR}/timeout-panic-light.png` });

  await normal.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await normal.mouse.move(640, 520);
  await normal.waitForTimeout(600);
  await expect(overlay).toHaveAttribute('data-active', 'true');
  await normal.screenshot({ path: `${VISUAL_DIR}/timeout-panic-dark.png` });

  await expect(drawer.getByTestId('timeout-panic')).toHaveAttribute('data-active', 'false');

  await normal.emulateMedia({ reducedMotion: 'reduce' });
  await normal.waitForTimeout(400);
  await expect(overlay).toHaveAttribute('data-active', 'false');
  await normal.emulateMedia({ reducedMotion: 'no-preference' });
  await normal.waitForTimeout(400);
  await expect(overlay).toHaveAttribute('data-active', 'false');

  const other = guessers[1]!;
  await jumpClock(other);
  await other.waitForTimeout(1_500);
  const otherOverlay = other.getByTestId('timeout-panic');
  await expect(otherOverlay).toHaveAttribute('data-active', 'true', { timeout: 8_000 });
  await other.locator('#chat-input').fill(word);
  await other.locator('#chat-input').press('Enter');
  await expect(otherOverlay).toHaveAttribute('data-active', 'false', { timeout: 10_000 });

  await expectNoErrors(errors);
  await Promise.all(contexts.map((context) => context.close()));
});
