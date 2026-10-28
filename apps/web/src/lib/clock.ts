import { useEffect, useRef, useState } from 'react';
import { useAppStore } from './store';

export function useServerNow(intervalMs = 250): number {
  const offset = useAppStore((state) => state.serverOffset);
  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    setNow(Date.now() + offset);
    const timer = setInterval(() => {
      setNow(Date.now() + offset);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [offset, intervalMs]);

  return now;
}

export function useCountdown(endsAt: number, intervalMs = 250): { remainingMs: number; seconds: number } {
  const now = useServerNow(intervalMs);
  const remainingMs = Math.max(0, endsAt - now);
  return { remainingMs, seconds: Math.ceil(remainingMs / 1000) };
}

export function useCountUp(target: number, duration = 600, enabled = true): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (target - from) * progress));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }
    };
  }, [target, duration, enabled]);

  return value;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
