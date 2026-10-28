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

test('mobile drawer uses the marker tray and opens the chat sheet', async ({ browser }) => {
  test.setTimeout(180_000);
  ensureVisualDir();
  const errors: string[] = [];
  const hostContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  watchPage(host, errors, 'mobile');
  watchPage(guest, errors, 'guest');

  let attempts = 0;
  let hostIsDrawer = false;
  while (!hostIsDrawer && attempts < 6) {
    attempts += 1;
    if (attempts > 1) {
      await host.goto('/');
      await guest.goto('/');
    }
    const code = await createRoom(host, 'Rani');
    await joinRoom(guest, code, 'Budi');
    await host.getByText('Budi').first().waitFor();
    await setRounds(host, 1);
    await host.getByRole('button', { name: 'Mulai game' }).click();
    const drawer = await waitForWordChooser([host, guest]);
    hostIsDrawer = drawer === host;
    if (!hostIsDrawer) {
      await host.getByRole('button', { name: 'Keluar room' }).click();
      await guest.getByRole('button', { name: 'Keluar room' }).click();
      await host.waitForTimeout(400);
    }
  }

  expect(hostIsDrawer, 'host should draw in one of the attempts').toBe(true);
  await chooseWord(host);
  await host.getByText('Kamu menggambar').waitFor();

  await expect(host.getByText('Baki spidol')).toBeVisible();
  const eraser = host.getByRole('button', { name: 'Penghapus' });
  await eraser.click();
  await expect(eraser).toHaveAttribute('aria-pressed', 'true');
  await expect(host.getByRole('button', { name: /Undo/ })).toBeVisible();

  await host.screenshot({ path: `${VISUAL_DIR}/game-mobile-drawer.png` });

  await host.getByRole('button', { name: 'Buka chat' }).click();
  await expect(host.getByRole('heading', { name: 'Chat & tebakan' })).toBeVisible();
  await expect(host.locator('#chat-input')).toBeDisabled();
  await host.getByRole('button', { name: 'Tutup chat' }).click();
  await expect(host.getByRole('heading', { name: 'Chat & tebakan' })).toHaveCount(0);

  await expectNoErrors(errors);
  await Promise.all([hostContext.close(), guestContext.close()]);
});
