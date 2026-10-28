import { TEXT_FONT_OPTIONS, TEXT_SIZES } from '../../lib/canvas/text';
import { useCanvasStore } from '../../lib/canvas/store';
import { cn } from '../../lib/cn';
import { Tooltip } from '../ui/Tooltip';

export function TextOptions() {
  const textFont = useCanvasStore((state) => state.textFont);
  const textSize = useCanvasStore((state) => state.textSize);
  const setTextFont = useCanvasStore((state) => state.setTextFont);
  const setTextSize = useCanvasStore((state) => state.setTextSize);

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-control border border-line bg-panel-raised p-1">
      {TEXT_FONT_OPTIONS.map((option) => (
        <Tooltip key={option.value} label={`Font ${option.label}`}>
          <button
            type="button"
            aria-label={`Font ${option.label}`}
            aria-pressed={textFont === option.value}
            onClick={() => setTextFont(option.value)}
            className={cn(
              'h-9 rounded-[7px] px-2 text-sm text-ink transition-colors hover:bg-panel',
              textFont === option.value && 'bg-highlight text-on-highlight'
            )}
            style={{ fontFamily: option.family }}
          >
            {option.label}
          </button>
        </Tooltip>
      ))}
      <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-line" />
      {TEXT_SIZES.map((value) => (
        <Tooltip key={value} label={`Ukuran teks ${value}px`}>
          <button
            type="button"
            aria-label={`Ukuran teks ${value} piksel`}
            aria-pressed={textSize === value}
            onClick={() => setTextSize(value)}
            className={cn(
              'h-9 w-8 rounded-[7px] text-xs font-bold text-ink transition-colors hover:bg-panel',
              textSize === value && 'bg-highlight text-on-highlight'
            )}
          >
            {value}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
