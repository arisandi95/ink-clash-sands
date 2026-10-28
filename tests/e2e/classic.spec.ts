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

test('classic game: three players finish a round and see the podium', async ({ browser }) => {
  test.setTimeout(180_000);
  ensureVisualDir();
  const errors: string[] = [];
  const names = ['Rani', 'Budi', 'Sari'];
  const contexts = await Promise.all(
    names.map(() => browser.newContext({ viewport: { width: 1280, height: 800 } }))
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  pages.forEach((page, index) => watchPage(page, errors, names[index] as string));

  const [host, guestA, guestB] = pages as [
    (typeof pages)[number],
    (typeof pages)[number],
    (typeof pages)[number]
  ];

  const code = await createRoom(host, 'Rani');
  await joinRoom(guestA, code, 'Budi');
  await joinRoom(guestB, code, 'Sari');
  await host.getByText('Sari').first().waitFor();
  await host.screenshot({ path: `${VISUAL_DIR}/lobby-classic.png` });

  await setRounds(host, 1);
  await host.getByRole('button', { name: 'Mulai game' }).click();

  for (let turn = 0; turn < names.length; turn += 1) {
    const drawer = await waitForWordChooser(pages);
    const guessers = pages.filter((page) => page !== drawer);
    if (turn === 0) {
      await drawer.screenshot({ path: `${VISUAL_DIR}/game-word-choice.png` });
    }
    const word = await chooseWord(drawer);
    await drawer.getByText('Kamu menggambar').waitFor();
    await drawer.screenshot({ path: `${VISUAL_DIR}/game-drawer.png` });
    await guessers[0]?.screenshot({ path: `${VISUAL_DIR}/game-guesser.png` });

    for (const guesser of guessers) {
      const input = guesser.locator('#chat-input');
      await expect(input).toBeEnabled();
      await expect(input).toHaveAttribute('placeholder', 'Tulis tebakanmu…');
      await input.fill(word);
      await input.press('Enter');
    }

    await expect(drawer.getByText('Semua menebak dengan benar!')).toBeVisible();
    await expect(drawer.getByText('Katanya', { exact: true })).toBeVisible();
    await drawer.screenshot({ path: `${VISUAL_DIR}/turn-end.png` });
  }

  const podium = host.getByRole('dialog', { name: 'Hasil akhir game' });
  await expect(podium).toBeVisible({ timeout: 20_000 });
  await expect(podium.getByText('Game selesai!')).toBeVisible();
  for (const name of names) {
    await expect(podium.getByText(name, { exact: true }).first()).toBeVisible();
  }
  expect(await podium.locator('ol li').count()).toBe(3);
  await host.screenshot({ path: `${VISUAL_DIR}/classic-podium.png` });

  await expectNoErrors(errors);
  await Promise.all(contexts.map((context) => context.close()));
});
