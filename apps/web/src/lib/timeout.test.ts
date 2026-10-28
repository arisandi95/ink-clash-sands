import { describe, expect, it } from 'vitest';
import { canShowTimeoutWarning, TIMEOUT_WARNING_MS } from './timeout';

const base = {
  phase: 'drawing' as const,
  remainingMs: TIMEOUT_WARNING_MS,
  isDrawer: false,
  isWatcher: false,
  guessed: false,
  hasWordOptions: false
};

describe('canShowTimeoutWarning', () => {
  it('shows for a guesser in the final five seconds', () => {
    expect(canShowTimeoutWarning(base)).toBe(true);
  });

  it('does not show before the final five seconds', () => {
    expect(canShowTimeoutWarning({ ...base, remainingMs: TIMEOUT_WARNING_MS + 1 })).toBe(false);
  });

  it('does not show when time is up', () => {
    expect(canShowTimeoutWarning({ ...base, remainingMs: 0 })).toBe(false);
  });

  it('does not show for the drawer or a watcher', () => {
    expect(canShowTimeoutWarning({ ...base, isDrawer: true })).toBe(false);
    expect(canShowTimeoutWarning({ ...base, isWatcher: true })).toBe(false);
  });

  it('does not show after the guesser answered correctly', () => {
    expect(canShowTimeoutWarning({ ...base, guessed: true })).toBe(false);
  });

  it('shows only the drawer while a word is still being chosen', () => {
    const choosing = { ...base, phase: 'choosing_word' as const, isDrawer: true, hasWordOptions: true };
    expect(canShowTimeoutWarning(choosing)).toBe(true);
    expect(canShowTimeoutWarning({ ...choosing, hasWordOptions: false })).toBe(false);
    expect(canShowTimeoutWarning({ ...choosing, isDrawer: false })).toBe(false);
  });

  it('does not show outside drawing and choosing phases', () => {
    expect(canShowTimeoutWarning({ ...base, phase: 'turn_end' })).toBe(false);
    expect(canShowTimeoutWarning({ ...base, phase: 'game_end' })).toBe(false);
    expect(canShowTimeoutWarning({ ...base, phase: 'lobby' })).toBe(false);
  });
});
