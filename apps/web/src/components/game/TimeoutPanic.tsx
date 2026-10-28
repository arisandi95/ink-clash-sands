import { useEffect, useRef, useState } from 'react';
import type { Phase } from '@inkclash/shared';
import { prefersReducedMotion, useCountdown } from '../../lib/clock';
import { canShowTimeoutWarning } from '../../lib/timeout';
import { TimeoutAnimation } from '../../lib/timeoutAnimation';
import { cn } from '../../lib/cn';

export interface TimeoutPanicProps {
  endsAt: number;
  phase: Phase;
  round: number;
  isDrawer: boolean;
  isWatcher: boolean;
  guessed: boolean;
  hasWordOptions: boolean;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => setReduced(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return reduced;
}

export function TimeoutPanic({
  endsAt,
  phase,
  round,
  isDrawer,
  isWatcher,
  guessed,
  hasWordOptions
}: TimeoutPanicProps) {
  const { remainingMs } = useCountdown(endsAt);
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(false);
  const shownRound = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const eligible = canShowTimeoutWarning({
    phase,
    remainingMs,
    isDrawer,
    isWatcher,
    guessed,
    hasWordOptions
  });

  useEffect(() => {
    if (!eligible || reducedMotion) {
      setShown(false);
      return;
    }
    if (shownRound.current === round) {
      return;
    }
    shownRound.current = round;
    setShown(true);
  }, [eligible, reducedMotion, round]);

  const active = eligible && shown && !reducedMotion;

  useEffect(() => {
    if (!active) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let animation: TimeoutAnimation | null = null;
    try {
      animation = new TimeoutAnimation(canvas);
      animation.start();
    } catch {
      animation = null;
    }

    return () => {
      animation?.dispose();
    };
  }, [active]);

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {active ? 'Cepat! Waktu hampir habis…' : ''}
      </div>
      <div
        data-testid="timeout-panic"
        data-active={active ? 'true' : 'false'}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-2 top-2 z-20 select-none rounded-panel border border-line bg-panel-raised/90 p-1.5 shadow-raised backdrop-blur-sm transition-[opacity,transform] duration-300 ease-out sm:right-3 sm:top-3',
          active ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        )}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="block h-[82px] w-[104px] sm:h-[104px] sm:w-[130px]"
        />
        <p className="mt-0.5 w-[104px] text-center text-[10px] font-extrabold leading-tight text-ink sm:w-[130px] sm:text-[11px]">
          Cepat! Waktu hampir habis…
        </p>
      </div>
    </>
  );
}
