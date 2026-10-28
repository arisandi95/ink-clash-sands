import { expect, test } from '@playwright/test';
import {
  VISUAL_DIR,
  chooseWord,
  createRoom,
  ensureVisualDir,
  expectNoErrors,
  joinRoom,
  readTeamColumns,
  setRounds,
  waitForWordChooser,
  watchPage
} from './helpers';

test('team mode: 2 vs 2 game restricts guessing and shows team podium', async ({ browser }) => {
  test.setTimeout(180_000);
  ensureVisualDir();
  const errors: string[] = [];
  const names = ['Rani', 'Budi', 'Sari', 'Dani'];
  const contexts = await Promise.all(
    names.map(() => browser.newContext({ viewport: { width: 1280, height: 800 } }))
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  pages.forEach((page, index) => watchPage(page, errors, names[index] as string));

  const [host, guestA, guestB, guestC] = pages as [
    (typeof pages)[number],
    (typeof pages)[number],
    (typeof pages)[number],
    (typeof pages)[number]
  ];

  const code = await createRoom(host, 'Rani');
  await joinRoom(guestA, code, 'Budi');
  await joinRoom(guestB, code, 'Sari');
  await joinRoom(guestC, code, 'Dani');
  await host.getByText('Dani').first().waitFor();

  await host.getByText('Tim', { exact: true }).click();
  await expect(host.getByRole('heading', { name: /Tim Biru/ })).toBeVisible();
  const teams = await readTeamColumns(host, names);
  expect(Object.keys(teams)).toHaveLength(4);

  await setRounds(host, 1);
  await host.screenshot({ path: `${VISUAL_DIR}/lobby-team.png` });
  const start = host.getByRole('button', { name: 'Mulai game' });
  await expect(start).toBeEnabled();
  await start.click();

  for (let turn = 0; turn < names.length; turn += 1) {
    const drawer = await waitForWordChooser(pages);
    const drawerName = names[pages.indexOf(drawer)] as string;
    const drawingTeam = teams[drawerName] as 'A' | 'B';
    const teammateName = names.find(
      (name) => name !== drawerName && teams[name] === drawingTeam
    ) as string;
    const teammate = pages[names.indexOf(teammateName)] as (typeof pages)[number];
    const watchers = pages.filter(
      (page) => page !== drawer && page !== teammate
    );

    const word = await chooseWord(drawer);
    await drawer.getByText('Kamu menggambar').waitFor();
    await drawer.screenshot({ path: `${VISUAL_DIR}/game-team-drawer.png` });

    const teamLabel = drawingTeam === 'A' ? 'Biru' : 'Merah';
    for (const watcher of watchers) {
      await expect(watcher.getByText(`Menonton giliran Tim ${teamLabel}`).first()).toBeVisible();
      await expect(watcher.locator('#chat-input')).toBeDisabled();
    }
    await watchers[0]?.screenshot({ path: `${VISUAL_DIR}/game-spectator.png` });

    const input = teammate.locator('#chat-input');
    await expect(input).toBeEnabled();
    await expect(input).toHaveAttribute('placeholder', 'Tulis tebakanmu…');
    await input.fill(word);
    await input.press('Enter');
    await expect(drawer.getByText('Katanya', { exact: true })).toBeVisible();
  }

  const podium = host.getByRole('dialog', { name: 'Hasil akhir game' });
  await expect(podium).toBeVisible({ timeout: 20_000 });
  await expect(podium.getByText('Tim Biru').first()).toBeVisible();
  await expect(podium.getByText('Tim Merah').first()).toBeVisible();
  expect(await podium.getByText('Pemenang').count()).toBeLessThanOrEqual(1);
  expect(await podium.locator('ol li').count()).toBe(4);
  await host.screenshot({ path: `${VISUAL_DIR}/team-podium.png` });

  await expectNoErrors(errors);
  await Promise.all(contexts.map((context) => context.close()));
});
