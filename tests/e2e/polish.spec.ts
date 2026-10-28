import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
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

function watchExternalRequests(page: Page, problems: string[]): void {
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http')) {
      return;
    }
    const origin = new URL(url).origin;
    if (origin !== 'http://127.0.0.1:3000') {
      problems.push(`external request: ${url}`);
    }
  });
}

test('landing renders without overflow or external requests at every breakpoint', async ({ browser }) => {
  ensureVisualDir();
  const errors: string[] = [];
  const sizes = [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1920, height: 1080 }
  ];

  for (const size of sizes) {
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    watchPage(page, errors, `landing-${size.width}`);
    watchExternalRequests(page, errors);
    await page.goto('/');
    await page.getByRole('button', { name: /Buat room/ }).waitFor();
    await page.evaluate(() => document.fonts.ready);

    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    expect(overflow.document, `document overflow at ${size.width}px`).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.body, `body overflow at ${size.width}px`).toBeLessThanOrEqual(overflow.viewport);

    await page.screenshot({ path: `${VISUAL_DIR}/landing-${size.width}.png` });
    await context.close();
  }

  await expectNoErrors(errors);
});

test('landing renders in the Malam theme', async ({ browser }) => {
  ensureVisualDir();
  const errors: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const page = await context.newPage();
  watchPage(page, errors, 'landing-dark');
  watchExternalRequests(page, errors);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('inkclash:theme', 'dark');
    } catch {
      // ignore
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Buat room/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: `${VISUAL_DIR}/landing-1280-dark.png` });
  await expectNoErrors(errors);
  await context.close();
});

test('tablet game keeps the player strip on top and the chat panel on the right', async ({ browser }) => {
  test.setTimeout(120_000);
  ensureVisualDir();
  const errors: string[] = [];
  const hostContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  watchPage(host, errors, 'host');
  watchPage(guest, errors, 'guest');

  const code = await createRoom(host, 'Rani');
  await joinRoom(guest, code, 'Budi');
  await host.getByText('Budi').first().waitFor();

  await setRounds(host, 1);
  await host.getByRole('button', { name: 'Mulai game' }).click();

  const drawer = await waitForWordChooser([host, guest]);
  await chooseWord(drawer);
  await drawer.getByText('Kamu menggambar').waitFor();

  await expect(host.getByRole('heading', { name: 'Chat & tebakan' })).toBeVisible();
  await expect(host.locator('[aria-label="Daftar pemain"]')).toBeVisible();
  await expect(host.getByRole('button', { name: 'Buka chat' })).toHaveCount(0);

  await host.screenshot({ path: `${VISUAL_DIR}/game-tablet-768.png` });
  await expectNoErrors(errors);
  await Promise.all([hostContext.close(), guestContext.close()]);
});
