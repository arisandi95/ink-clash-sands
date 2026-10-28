import { Circle, Triangle } from 'lucide-react';
import type { Team, TeamScores } from '@inkclash/shared';
import { cn } from '../../lib/cn';

export interface ScoreboardProps {
  scores: TeamScores | null;
  drawingTeam?: Team | null;
  className?: string;
}

export function Scoreboard({ scores, drawingTeam, className }: ScoreboardProps) {
  if (!scores) {
    return null;
  }

  return (
    <div
      className={cn('flex items-center gap-1 rounded-control border border-line bg-panel-raised p-0.5', className)}
      aria-label={`Skor tim. Tim Biru ${scores.A}, Tim Merah ${scores.B}`}
    >
      <span
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-[7px] px-2 text-xs font-extrabold text-blue',
          drawingTeam === 'A' && 'bg-blue/10 ring-1 ring-blue/40'
        )}
      >
        <Circle size={10} aria-hidden="true" />
        Biru <span className="tabular">{scores.A}</span>
      </span>
      <span className="text-ink-soft" aria-hidden="true">
        /
      </span>
      <span
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-[7px] px-2 text-xs font-extrabold text-red',
          drawingTeam === 'B' && 'bg-red/10 ring-1 ring-red/40'
        )}
      >
        <Triangle size={10} aria-hidden="true" />
        Merah <span className="tabular">{scores.B}</span>
      </span>
    </div>
  );
}
