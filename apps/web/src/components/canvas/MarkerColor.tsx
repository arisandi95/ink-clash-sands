import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';
import { Tooltip } from '../ui/Tooltip';
import type { PaletteColor } from '../../lib/canvas/palette';

export interface MarkerColorProps {
  color: PaletteColor;
  active: boolean;
  onSelect: (hex: string) => void;
}

export function MarkerColor({ color, active, onSelect }: MarkerColorProps) {
  const style = {
    '--marker-color': color.hex
  } as CSSProperties;

  return (
    <Tooltip label={color.name}>
      <button
        type="button"
        aria-label={`Warna ${color.name}`}
        aria-pressed={active}
        onClick={() => onSelect(color.hex)}
        style={style}
        className={cn(
          'group relative flex h-12 w-6 shrink-0 flex-col items-center justify-end pb-0.5 transition-transform duration-150 ease-pop',
          active ? '-translate-y-2' : 'hover:-translate-y-1'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-1/2 top-0 h-3.5 w-4 -translate-x-1/2 rounded-t-[3px] border border-black/10 transition-transform duration-150',
            active && '-translate-y-1 rotate-[-8deg]'
          )}
          style={{ backgroundColor: 'var(--marker-color)' }}
        />
        <span
          aria-hidden="true"
          className="h-8 w-3.5 rounded-b-[3px] rounded-t-[2px] border border-line bg-board shadow-[1px_1px_0_rgba(0,0,0,0.12)]"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full border border-black/20"
          style={{ backgroundColor: 'var(--marker-color)' }}
        />
      </button>
    </Tooltip>
  );
}
