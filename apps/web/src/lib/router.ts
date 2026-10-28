import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('popstate', callback);
  window.addEventListener('inkclash:navigate', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('inkclash:navigate', callback);
  };
}

function getSnapshot(): string {
  return window.location.pathname;
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => '/');
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  if (options.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new Event('inkclash:navigate'));
}

export function roomCodeFromPath(path: string): string | null {
  const match = /^\/r\/([A-Za-z0-9]{6})\/?$/.exec(path);
  return match?.[1]?.toUpperCase() ?? null;
}
