import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { PublicRoomState, TurnResult } from '@inkclash/shared';
import { useCountUp } from '../../lib/clock';
import { StickyNote } from '../ui/StickyNote';

function ResultRow({ result, reduced }: { result: TurnResult; reduced: boolean }) {
  const score = useCountUp(result.gained, 600, !reduced);
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line/60 py-1 text-sm last:border-b-0">
      <span className="flex items-center gap-1.5 font-bold text-ink">
        <Check size={15} className="text-green" aria-hidden="true" />
        {result.nickname}
      </span>
      <span className="font-extrabold text-green tabular">+{score}</span>
    </li>
  );
}

export interface TurnOverlayProps {
  room: PublicRoomState;
  reducedMotion?: boolean;
}

export function TurnOverlay({ room, reducedMotion = false }: TurnOverlayProps) {
  const [dismissedTurn, setDismissedTurn] = useState<number | null>(null);
  const summary = room.turnSummary;

  useEffect(() => {
    if (room.phase !== 'turn_end') {
      setDismissedTurn(null);
    }
  }, [room.phase]);

  if (room.phase !== 'turn_end' || !summary || dismissedTurn === room.turnNumber) {
    return null;
  }

  const reasonText =
    summary.reason === 'all_guessed'
      ? 'Semua menebak dengan benar!'
      : summary.reason === 'drawer_left'
        ? 'Penggambar keluar.'
        : 'Waktu habis.';

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color:var(--overlay)] p-4">
      <div className="w-full max-w-md rounded-panel border border-line bg-panel-raised p-4 shadow-raised">
        <p className="text-sm font-bold text-ink-soft">{reasonText}</p>
        <StickyNote seed={`reveal-${room.round}-${room.turnNumber}`} className="mt-2 w-full px-4 py-3 text-center">
          <span className="block text-xs font-extrabold uppercase tracking-wide">Katanya</span>
          <span className="font-marker text-3xl leading-tight sm:text-4xl">{summary.word}</span>
        </StickyNote>
        {summary.results.length > 0 ? (
          <ul className="mt-3">
            {summary.results.map((result) => (
              <ResultRow key={result.playerId} result={result} reduced={reducedMotion} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">Belum ada yang menebak.</p>
        )}
        <button
          type="button"
          onClick={() => setDismissedTurn(room.turnNumber)}
          className="mt-3 w-full rounded-control border border-line py-2 text-sm font-bold text-ink-soft hover:text-ink"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
