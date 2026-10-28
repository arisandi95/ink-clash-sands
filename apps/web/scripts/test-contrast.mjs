import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');

function readBlock(startPattern) {
  const start = css.indexOf(startPattern);
  if (start === -1) {
    throw new Error(`Missing token block: ${startPattern}`);
  }
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const block = css.slice(open + 1, close);
  const tokens = {};
  for (const match of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

const themes = {
  light: readBlock(':root,'),
  dark: readBlock("[data-theme='dark']")
};

const expected = {
  light: {
    wall: '#dce4ea',
    panel: '#f4f7f9',
    'panel-raised': '#ffffff',
    line: '#b8c4cd',
    ink: '#161a20',
    'ink-soft': '#4a5663',
    board: '#ffffff',
    'on-board': '#161a20',
    frame: '#aeb9c2',
    highlight: '#ffe14d',
    'on-highlight': '#161a20',
    'on-accent': '#ffffff',
    'marker-blue': '#1d4ed8',
    'marker-red': '#c92a1e',
    'marker-green': '#15803d'
  },
  dark: {
    wall: '#11161b',
    panel: '#1a2128',
    'panel-raised': '#222b34',
    line: '#33414d',
    ink: '#eef2f5',
    'ink-soft': '#a5b3bf',
    board: '#ffffff',
    'on-board': '#161a20',
    frame: '#5b6773',
    highlight: '#ffe14d',
    'on-highlight': '#161a20',
    'on-accent': '#161a20',
    'marker-blue': '#5b8cff',
    'marker-red': '#ff6a5e',
    'marker-green': '#4ade80'
  }
};

const pairs = [
  ['ink', 'wall', 4.5, 'page text'],
  ['ink', 'panel', 4.5, 'panel text'],
  ['ink', 'panel-raised', 4.5, 'raised text'],
  ['on-board', 'board', 4.5, 'board text'],  ['ink-soft', 'wall', 4.5, 'secondary text on wall'],
  ['ink-soft', 'panel', 4.5, 'secondary text on panel'],
  ['ink-soft', 'panel-raised', 4.5, 'secondary text on raised'],
  ['on-highlight', 'highlight', 4.5, 'primary button'],
  ['on-accent', 'marker-blue', 4.5, 'blue ribbon'],
  ['on-accent', 'marker-red', 4.5, 'red ribbon'],
  ['on-accent', 'marker-green', 4.5, 'green note'],
  ['marker-red', 'panel-raised', 4.5, 'error text'],
  ['marker-green', 'panel-raised', 4.5, 'success text'],
  ['marker-blue', 'panel', 3, 'blue icon'],
  ['marker-red', 'panel', 3, 'red icon'],
  ['marker-green', 'panel', 3, 'green icon'],
  ['ink', 'frame', 4.5, 'podium block text']
];

function luminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/../g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

let failures = 0;

for (const [theme, tokens] of Object.entries(themes)) {
  for (const [name, value] of Object.entries(expected[theme])) {
    if (tokens[name] !== value) {
      failures += 1;
      console.error(`FAIL ${theme}: token --${name} is ${tokens[name] ?? 'missing'}, expected ${value}`);
    }
  }

  for (const [foreground, background, minimum, label] of pairs) {
    const fg = tokens[foreground];
    const bg = tokens[background];
    if (!fg || !bg) {
      failures += 1;
      console.error(`FAIL ${theme}: missing pair ${foreground}/${background}`);
      continue;
    }
    const ratio = contrast(fg, bg);
    const status = ratio >= minimum ? 'ok  ' : 'FAIL';
    if (ratio < minimum) {
      failures += 1;
    }
    console.log(
      `${status} ${theme.padEnd(5)} ${label.padEnd(26)} ${foreground}/${background} ${ratio.toFixed(2)} (min ${minimum})`
    );
  }
}

console.log(`\n${failures === 0 ? 'All contrast checks passed.' : `${failures} contrast check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
