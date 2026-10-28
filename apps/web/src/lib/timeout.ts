import type { Phase } from '@inkclash/shared';

export const TIMEOUT_WARNING_MS = 5_000;

export interface TimeoutWarningConditions {
  phase: Phase;
  remainingMs: number;
  isDrawer: boolean;
  isWatcher: boolean;
  guessed: boolean;
  hasWordOptions: boolean;
}

export function canShowTimeoutWarning(conditions: TimeoutWarningConditions): boolean {
  const { phase, remainingMs, isDrawer, isWatcher, guessed, hasWordOptions } = conditions;

  if (remainingMs <= 0 || remainingMs > TIMEOUT_WARNING_MS) {
    return false;
  }

  if (phase === 'drawing') {
    return !isDrawer && !isWatcher && !guessed;
  }

  if (phase === 'choosing_word') {
    return isDrawer && hasWordOptions;
  }

  return false;
}
