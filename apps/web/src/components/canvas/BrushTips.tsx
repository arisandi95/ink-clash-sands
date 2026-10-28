import { BRUSH_SIZES } from '../../lib/canvas/palette';
import { cn } from '../../lib/cn';
import { useCanvasStore } from '../../lib/canvas/store';
import { Tooltip } from '../ui/Tooltip';

export function BrushTips() {
  const size = useCanvasStore((state) => state.size);
  const setSize = useCanvasStore((state) => state.setSize);

  return (
    <div className="flex shrink-0 items-end gap-0.5 rounded-control border border-line bg-panel-raised px-1 py-1">
      {BRUSH_SIZES.map((value) => (
        <Tooltip key={value} label={`Ukuran ${value}px`}>
          <button
            type="button"
            aria-label={`Ukuran kuas ${value} piksel`}
            aria-pressed={size === value}
            onClick={() => setSize(value)}
            className={cn(
              'flex h-9 w-7 items-center justify-center rounded-[7px] text-ink transition-colors hover:bg-panel',
              size === value && 'bg-highlight'
            )}
          >
            <span
              aria-hidden="true"
              className="rounded-full bg-ink"
              style={{ width: Math.min(18, value), height: Math.min(18, value) }}
            />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
