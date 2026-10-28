import { useState } from 'react';
import {
  Brush,
  Circle,
  Eraser,
  PaintBucket,
  Redo2,
  Slash,
  Square,
  Trash2,
  Type,
  Undo2
} from 'lucide-react';
import { PALETTE } from '../../lib/canvas/palette';
import { useCanvasStore, type Tool } from '../../lib/canvas/store';
import { clearCanvas, redoDraw, undoDraw } from '../../lib/actions';
import { cn } from '../../lib/cn';
import { MarkerColor } from './MarkerColor';
import { BrushTips } from './BrushTips';
import { LayerPanel } from './LayerPanel';
import { TextOptions } from './TextOptions';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const TOOLS: { value: Tool; label: string; shortcut: string; icon: typeof Brush }[] = [
  { value: 'brush', label: 'Kuas', shortcut: 'B', icon: Brush },
  { value: 'eraser', label: 'Penghapus', shortcut: 'E', icon: Eraser },
  { value: 'fill', label: 'Ember cat', shortcut: 'G', icon: PaintBucket },
  { value: 'line', label: 'Garis', shortcut: 'L', icon: Slash },
  { value: 'rect', label: 'Kotak', shortcut: 'R', icon: Square },
  { value: 'ellipse', label: 'Lingkaran', shortcut: 'O', icon: Circle },
  { value: 'text', label: 'Teks', shortcut: 'T', icon: Type }
];

export function MarkerTray() {
  const tool = useCanvasStore((state) => state.tool);
  const color = useCanvasStore((state) => state.color);
  const fillShape = useCanvasStore((state) => state.fillShape);
  const recentColors = useCanvasStore((state) => state.recentColors);
  const setTool = useCanvasStore((state) => state.setTool);
  const setColor = useCanvasStore((state) => state.setColor);
  const setFillShape = useCanvasStore((state) => state.setFillShape);
  const [clearOpen, setClearOpen] = useState(false);
  const shapeTool = tool === 'line' || tool === 'rect' || tool === 'ellipse';

  return (
    <>
      <div className="rounded-tray border border-line/60 bg-frame px-2 py-2 shadow-raised">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/70">Baki spidol</span>
          <span className="hidden text-[10px] font-bold text-ink/60 lg:inline">B E G L R O T&nbsp;&nbsp; [ ]&nbsp;&nbsp; Ctrl+Z</span>
          <div className="lg:hidden">
            <BrushTips />
          </div>
        </div>
        <div className="flex items-end gap-2 overflow-x-auto pb-1 scrollbar-thin lg:flex-wrap lg:overflow-visible lg:pb-0">
          <div className="flex shrink-0 flex-col gap-1 rounded-control border border-line bg-panel-raised p-1.5">
            <div className="flex items-end gap-1">
              {PALETTE.map((entry) => (
                <MarkerColor
                  key={entry.hex}
                  color={entry}
                  active={entry.hex.toLowerCase() === color.toLowerCase()}
                  onSelect={setColor}
                />
              ))}
              <div className="ml-1 flex flex-col items-center gap-1">
                <label
                  className="relative flex h-11 w-6 cursor-pointer items-center justify-center"
                  title="Warna kustom"
                >
                  <span
                    aria-hidden="true"
                    className="h-8 w-3.5 rounded-b-[3px] rounded-t-[2px] border border-line"
                    style={{
                      background:
                        'conic-gradient(var(--marker-red), var(--highlight), var(--marker-green), var(--marker-blue), var(--marker-red))'
                    }}
                  />
                  <span className="sr-only">Pilih warna kustom</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Warna kustom"
                  />
                </label>
                <div className="flex gap-1">
                  {recentColors.slice(0, 8).map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      aria-label={`Warna terakhir ${entry}`}
                      onClick={() => setColor(entry)}
                      className={cn(
                        'h-2.5 w-2.5 rounded-full border border-black/20',
                        entry.toLowerCase() === color.toLowerCase() && 'ring-2 ring-ink'
                      )}
                      style={{ backgroundColor: entry }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 items-center lg:flex">
            <BrushTips />
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-control border border-line bg-panel-raised p-1">
            {TOOLS.map((entry) => {
              const Icon = entry.icon;
              return (
                <IconButton
                  key={entry.value}
                  label={entry.label}
                  shortcut={entry.shortcut}
                  active={tool === entry.value}
                  onClick={() => setTool(entry.value)}
                  icon={<Icon size={19} />}
                />
              );
            })}
            {shapeTool ? (
              <button
                type="button"
                onClick={() => setFillShape(!fillShape)}
                aria-pressed={fillShape}
                className={cn(
                  'ml-1 h-9 rounded-[7px] border border-line px-2 text-xs font-bold text-ink-soft hover:text-ink',
                  fillShape && 'border-ink bg-highlight text-on-highlight'
                )}
              >
                {fillShape ? 'Isi' : 'Garis tepi'}
              </button>
            ) : null}
          </div>

          {tool === 'text' ? (
            <div className="flex shrink-0 items-center">
              <TextOptions />
            </div>
          ) : null}

          <div className="flex shrink-0 items-center gap-1">
            <LayerPanel />
          </div>

          <div className="sticky right-0 ml-auto flex shrink-0 items-center gap-1 rounded-control border border-line bg-panel-raised p-1">
            <IconButton label="Undo" shortcut="Ctrl+Z" onClick={() => void undoDraw()} icon={<Undo2 size={19} />} />
            <IconButton
              label="Redo"
              shortcut="Ctrl+Shift+Z"
              onClick={() => void redoDraw()}
              icon={<Redo2 size={19} />}
            />
            <IconButton
              label="Bersihkan papan"
              tone="red"
              onClick={() => setClearOpen(true)}
              icon={<Trash2 size={19} />}
            />
          </div>
        </div>
      </div>

      <Modal
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Hapus seluruh gambar?"
        description="Semua layer akan dikosongkan. Tindakan ini masih bisa dibatalkan dengan Undo."
        footer={
          <>
            <Button variant="secondary" onClick={() => setClearOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void clearCanvas();
                setClearOpen(false);
              }}
            >
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Gambar akan hilang dari papan semua pemain.</p>
      </Modal>
    </>
  );
}
