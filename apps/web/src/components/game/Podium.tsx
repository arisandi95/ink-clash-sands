import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { GameEndPayload, PublicRoomState } from '@inkclash/shared';
import { Circle, Triangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { StickyNote } from '../ui/StickyNote';
import { PALETTE } from '../../lib/canvas/palette';
import { prefersReducedMotion, useCountUp } from '../../lib/clock';
import { cn } from '../../lib/cn';

function TeamCard({
  team,
  score,
  winner
}: {
  team: 'A' | 'B';
  score: number;
  winner: boolean;
}) {
  return (
    <StickyNote
      seed={`team-${team}`}
      tone={winner ? 'yellow' : 'plain'}
      className={cn('w-full px-4 py-3 text-center', winner && 'outline outline-2 outline-highlight')}
    >
      <span className="flex items-center justify-center gap-1 text-xs font-extrabold uppercase tracking-wide">
        {team === 'A' ? <Circle size={12} aria-hidden="true" /> : <Triangle size={12} aria-hidden="true" />}
        Tim {team === 'A' ? 'Biru' : 'Merah'}
      </span>
      <span className="mt-1 block font-marker text-4xl leading-none tabular">{score}</span>
      {winner ? <span className="mt-1 block text-xs font-extrabold">Pemenang</span> : null}
    </StickyNote>
  );
}

function RankingBlock({ name, score, rank }: { name: string; score: number; rank: number }) {
  const value = useCountUp(score, 600, !prefersReducedMotion());
  const height = rank === 1 ? 'h-36' : rank === 2 ? 'h-24' : 'h-16';
  return (
    <div className="flex w-24 flex-col items-center justify-end gap-1 sm:w-28">
      <span className="max-w-full truncate text-sm font-extrabold text-ink">{name}</span>
      <span className="text-xs font-bold text-ink-soft tabular">{value} poin</span>
      <div
        className={cn(
          'flex w-full items-start justify-center rounded-t-[4px] border border-line bg-highlight pt-1 font-marker text-2xl text-on-highlight',
          height,
          rank === 1 && 'bg-highlight',
          rank === 2 && 'bg-panel',
          rank === 3 && 'bg-frame'
        )}
      >
        {rank}
      </div>
    </div>
  );
}

export interface PodiumProps {
  room: PublicRoomState;
  payload: GameEndPayload;
  onRematch: () => void;
  onLeave: () => void;
  isHost: boolean;
}

export function Podium({ room, payload, onRematch, onLeave, isHost }: PodiumProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || prefersReducedMotion()) {
      return;
    }
    fired.current = true;
    const colors = PALETTE.map((entry) => entry.hex);
    confetti({
      particleCount: 110,
      spread: 70,
      origin: { y: 0.65 },
      colors,
      disableForReducedMotion: true
    });
  }, []);

  const top = payload.ranking.slice(0, 3);
  const teamWinner = payload.winnerTeam;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[color:var(--overlay)] p-4 pt-10 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hasil akhir game"
        className="w-full max-w-2xl rounded-panel border border-line bg-panel p-5 shadow-raised"
      >
        <h2 className="text-center font-marker text-4xl leading-tight text-ink">Game selesai!</h2>
        <p className="mt-1 text-center text-sm font-bold text-ink-soft">
          Ronde {room.totalRounds} selesai. Ini hasilnya.
        </p>

        {room.settings.mode === 'team' && payload.teamScores ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <TeamCard team="A" score={payload.teamScores.A} winner={teamWinner === 'A'} />
            <TeamCard team="B" score={payload.teamScores.B} winner={teamWinner === 'B'} />
          </div>
        ) : null}

        <div className="mt-6 flex items-end justify-center gap-2 border-b border-line pb-0">
          {top.length === 0 ? (
            <p className="py-6 text-sm text-ink-soft">Belum ada skor.</p>
          ) : (
            [...top].reverse().map((entry) => (
              <RankingBlock key={entry.playerId} name={entry.nickname} score={entry.score} rank={entry.rank} />
            ))
          )}
        </div>

        <ol className="mx-auto mt-4 max-w-md">
          {payload.ranking.map((entry) => (
            <li key={entry.playerId} className="flex items-center gap-2 border-b border-line/60 py-1 text-sm last:border-0">
              <span className="w-5 text-right font-extrabold text-ink-soft tabular">{entry.rank}</span>
              <span className="flex-1 truncate font-bold text-ink">{entry.nickname}</span>
              {entry.team ? (
                <span className="text-xs font-bold text-ink-soft">
                  {entry.team === 'A' ? 'Tim Biru' : 'Tim Merah'}
                </span>
              ) : null}
              <span className="font-extrabold tabular">{entry.score}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {isHost ? <Button onClick={onRematch}>Main lagi</Button> : null}
          <Button variant="secondary" onClick={onLeave}>
            Keluar
          </Button>
        </div>
        {!isHost ? (
          <p className="mt-2 text-center text-xs text-ink-soft">Menunggu host memulai game baru.</p>
        ) : null}
      </div>
    </div>
  );
}
