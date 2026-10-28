import { mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const VISUAL_DIR = 'tests/visual';

export function ensureVisualDir(): void {
  mkdirSync(VISUAL_DIR, { recursive: true });
}

export function watchPage(page: Page, errors: string[], label: string): void {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
}

export async function createRoom(page: Page, nickname: string): Promise<string> {
  await page.goto('/');
  await page.getByLabel('Nama kamu').fill(nickname);
  await page.getByRole('button', { name: /Buat room/ }).click();
  await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  await page.getByRole('button', { name: 'Salin link' }).waitFor();
  return new URL(page.url()).pathname.split('/').pop() as string;
}

export async function joinRoom(page: Page, code: string, nickname: string): Promise<void> {
  await page.goto(`/r/${code}`);
  await page.getByLabel('Nama kamu').fill(nickname);
  await page.getByRole('button', { name: 'Gabung', exact: true }).click();
  await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
}

export async function setRounds(page: Page, target: number): Promise<void> {
  const minus = page.getByRole('button', { name: 'Kurangi jumlah ronde' });
  const value = minus.locator('xpath=../span');
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if ((await value.innerText()).trim() === String(target)) {
      return;
    }
    await minus.click();
    await page.waitForTimeout(300);
  }
  throw new Error(`Could not set rounds to ${target}`);
}

async function readDrawerWord(page: Page): Promise<string> {
  const word = page.getByTestId('drawer-word');
  await word.waitFor({ timeout: 5_000 }).catch(() => undefined);
  return ((await word.innerText().catch(() => '')) ?? '').trim();
}

export async function chooseWord(page: Page): Promise<string> {
  const option = page.locator('button[aria-label^="Pilih kata"]').first();
  await option.waitFor();
  const label = await option.getAttribute('aria-label', { timeout: 5_000 }).catch(() => null);
  if (!label) {
    return readDrawerWord(page);
  }
  const word = label.replace('Pilih kata ', '').trim();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await option.click({ timeout: 5_000 });
      return word;
    } catch (error) {
      const stillChoosing = await option.isVisible().catch(() => false);
      if (!stillChoosing) {
        return (await readDrawerWord(page)) || word;
      }
      if (attempt === 3) {
        throw error;
      }
    }
  }
  return word;
}

export async function waitForWordChooser(pages: Page[], timeout = 20_000): Promise<Page> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const page of pages) {
      if (await page.locator('button[aria-label^="Pilih kata"]').first().isVisible().catch(() => false)) {
        return page;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Timed out waiting for a word chooser');
}

export async function readTeamColumns(page: Page, nicknames: string[]): Promise<Record<string, 'A' | 'B'>> {
  const result: Record<string, 'A' | 'B'> = {};
  const columns: { team: 'A' | 'B'; label: string }[] = [
    { team: 'A', label: 'Tim Biru' },
    { team: 'B', label: 'Tim Merah' }
  ];
  for (const column of columns) {
    const heading = page.getByRole('heading', { name: new RegExp(column.label) });
    const text = await heading.locator('xpath=..').innerText();
    for (const nickname of nicknames) {
      if (text.includes(nickname)) {
        result[nickname] = column.team;
      }
    }
  }
  return result;
}

export async function expectNoErrors(errors: string[]): Promise<void> {
  expect(errors, errors.join('\n')).toEqual([]);
}
