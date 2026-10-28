import { Check, Eye, EyeOff, Layers } from 'lucide-react';
import { useCanvasStore } from '../../lib/canvas/store';
import { sendDrawOps } from '../../lib/actions';
import { IconButton } from '../ui/IconButton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { cn } from '../../lib/cn';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function LayerPanel() {
  const activeLayer = useCanvasStore((state) => state.activeLayer);
  const visible = useCanvasStore((state) => state.visible);
  const setActiveLayer = useCanvasStore((state) => state.setActiveLayer);

  const toggle = (layer: number) => {
    const next = !useCanvasStore.getState().visible[layer];
    useCanvasStore.getState().setVisible(layer, next);
    sendDrawOps([
      {
        id: newId(),
        t: 'layer_visibility',
        layer,
        visible: next
      }
    ]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton label="Layer" icon={<Layers size={19} />} />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-56">
        <p className="mb-2 text-sm font-extrabold text-ink">Layer</p>
        <ul className="flex flex-col gap-1">
          {[2, 1, 0].map((layer) => (
            <li
              key={layer}
              className={cn(
                'flex items-center gap-1 rounded-control border px-2 py-1',
                activeLayer === layer ? 'border-ink bg-highlight/30' : 'border-line'
              )}
            >
              <button
                type="button"
                onClick={() => setActiveLayer(layer)}
                className="flex flex-1 items-center gap-2 text-left text-sm font-bold text-ink"
                aria-pressed={activeLayer === layer}
              >
                {activeLayer === layer ? <Check size={14} aria-hidden="true" /> : <span className="w-3.5" />}
                Layer {layer + 1}
              </button>
              <button
                type="button"
                onClick={() => toggle(layer)}
                aria-label={visible[layer] ? `Sembunyikan layer ${layer + 1}` : `Tampilkan layer ${layer + 1}`}
                aria-pressed={!visible[layer]}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-ink-soft hover:bg-panel hover:text-ink"
              >
                {visible[layer] ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
