import type { PublicPlayer } from '@inkclash/shared';
import { NameTag } from '../ui/NameTag';

export interface PlayerListProps {
  players: PublicPlayer[];
  selfId: string | null;
}

export function PlayerList({ players, selfId }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));

  return (
    <>
      <aside className="hidden h-full min-h-0 flex-col rounded-panel border border-line bg-panel/70 p-2 lg:flex">
        <h2 className="px-1 pb-2 text-sm font-extrabold text-ink">
          Pemain <span className="text-ink-soft tabular">({players.length})</span>
        </h2>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {sorted.map((player) => (
            <NameTag key={player.id} player={player} isSelf={player.id === selfId} />
          ))}
        </div>
      </aside>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin lg:hidden" aria-label="Daftar pemain">
        {sorted.map((player) => (
          <NameTag key={player.id} player={player} isSelf={player.id === selfId} compact />
        ))}
      </div>
    </>
  );
}
