import { Check, Crown, Pencil, Triangle, Circle, WifiOff } from 'lucide-react';
import type { PublicPlayer } from '@inkclash/shared';
import { Avatar } from './Avatar';
import { cn } from '../../lib/cn';

export interface NameTagProps {
  player: PublicPlayer;
  isSelf?: boolean;
  compact?: boolean;
  className?: string;
}

export function NameTag({ player, isSelf, compact = false, className }: NameTagProps) {
  const online = player.connected;
  const ribbon =
    player.team === 'A' ? 'bg-blue text-on-accent' : player.team === 'B' ? 'bg-red text-on-accent' : 'bg-ink-soft text-panel-raised';

  if (compact) {
    return (
      <div
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel-raised pl-0.5 pr-2',
          !online && 'opacity-50',
          isSelf && 'border-ink',
          className
        )}
        title={player.nickname}
      >
        <Avatar nickname={player.nickname} seed={player.avatar} size={28} />
        <span className="max-w-[72px] truncate text-xs font-extrabold">{player.nickname}</span>
        <span className="text-xs font-bold text-ink-soft tabular">{player.score}</span>
        {player.guessed ? <Check size={12} className="text-green" aria-label="Sudah menebak" /> : null}
      </div>
    );
  }

  return (
    <article
      className={cn(
        'relative w-full overflow-hidden rounded-[6px] border border-line bg-panel-raised shadow-note',
        !online && 'opacity-55',
        isSelf && 'border-ink ring-1 ring-ink',
        className
      )}
    >
      <div className={cn('flex items-center justify-between px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]', ribbon)}>
        <span>Halo, nama saya</span>
        {player.team ? (
          <span className="inline-flex items-center gap-1">
            {player.team === 'A' ? <Circle size={9} aria-hidden="true" /> : <Triangle size={9} aria-hidden="true" />}
            Tim {player.team === 'A' ? 'Biru' : 'Merah'}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Avatar nickname={player.nickname} seed={player.avatar} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold leading-tight text-ink">
            {player.nickname}
            {isSelf ? <span className="ml-1 text-[10px] font-bold text-ink-soft">(kamu)</span> : null}
          </p>
          <p className="text-xs font-bold text-ink-soft tabular">{player.score} poin</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {player.isHost ? <Crown size={14} className="text-ink-soft" aria-label="Host" /> : null}
          {player.drawing ? <Pencil size={14} className="text-blue" aria-label="Sedang menggambar" /> : null}
          {player.guessed ? <Check size={14} className="text-green" aria-label="Sudah menebak" /> : null}
          {!online ? <WifiOff size={14} className="text-red" aria-label="Terputus" /> : null}
        </div>
      </div>
    </article>
  );
}
