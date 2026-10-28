import { useEffect, useRef, useState } from 'react';
import { useCountdown } from '../../lib/clock';
import { useAppStore } from '../../lib/store';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/cn';

export interface TimerLineProps {
  endsAt: number;
  totalMs: number;
  paused?: boolean;
}

export function TimerLine({ endsAt, totalMs, paused = false }: TimerLineProps) {
  const { remainingMs, seconds } = useCountdown(endsAt);
  const soundOn = useAppStore((state) => state.soundOn);
  const lastTick = useRef<number>(seconds);
  const [announcement, setAnnouncement] = useState('');

  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const tone = ratio > 0.5 ? 'bg-green' : ratio > 0.2 ? 'bg-highlight' : 'bg-red';

  useEffect(() => {
    if (paused) {
      return;
    }
    if (seconds !== lastTick.current) {
      lastTick.current = seconds;
      if (seconds === 30 || seconds === 10 || seconds === 5) {
        setAnnouncement(`${seconds} detik tersisa`);
      }
      if (soundOn && seconds <= 5 && seconds > 0) {
        sound.play('tick');
      }
    }
  }, [seconds, soundOn, paused]);

  return (
    <div className="flex w-full items-center gap-3">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-line/60">
        <div
          className={cn('h-full rounded-full transition-[width,background-color] duration-200 ease-linear', tone)}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className={cn('w-8 text-right text-sm font-extrabold tabular text-ink', seconds <= 10 && 'text-red')}>
        {paused ? '—' : seconds}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
