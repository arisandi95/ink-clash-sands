import type { PublicRoomState } from '@inkclash/shared';
import { useCountdown } from '../../lib/clock';
import { StickyNote } from '../ui/StickyNote';
import type { WordOptionsState } from '../../lib/store';

export interface WordChoiceOverlayProps {
  room: PublicRoomState;
  options: WordOptionsState | null;
  isDrawer: boolean;
  onChoose: (index: number) => void;
}

export function WordChoiceOverlay({ room, options, isDrawer, onChoose }: WordChoiceOverlayProps) {
  const { seconds } = useCountdown(options?.phaseEndsAt ?? room.phaseEndsAt);
  if (room.phase !== 'choosing_word') {
    return null;
  }
  const drawer = room.players.find((player) => player.id === room.currentDrawerId);

  if (!isDrawer || !options) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-board/70 p-4">
        <div className="rounded-panel border border-line bg-panel-raised px-4 py-3 text-center shadow-raised">
          <p className="text-sm font-extrabold text-ink">
            {drawer ? `${drawer.nickname} sedang memilih kata` : 'Sedang memilih kata'}
          </p>
          <p className="mt-0.5 text-xs font-bold text-ink-soft tabular">{seconds} detik</p>
        </div>      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-board/85 p-4">
      <h2 className="text-center text-lg font-extrabold text-on-board">Pilih kata untuk digambar</h2>
      <div className="flex w-full max-w-xl flex-wrap items-center justify-center gap-3 sm:gap-5">
        {options.words.map((word, index) => (
          <StickyNote
            key={`${word}-${index}`}
            seed={`${word}-${room.turnNumber}`}
            onClick={() => onChoose(index)}
            ariaLabel={`Pilih kata ${word}`}
            className="min-w-[120px] px-4 py-5 text-center"
          >
            <span className="font-marker text-2xl leading-tight sm:text-3xl">{word}</span>
          </StickyNote>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm font-bold text-on-board">
        <span className="tabular">{seconds} detik</span>
        <span aria-hidden="true">·</span>
        <span>Pilih otomatis jika waktu habis</span>
      </div>
    </div>
  );
}
