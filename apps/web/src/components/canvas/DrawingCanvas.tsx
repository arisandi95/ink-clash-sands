import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_TEXT_LENGTH, type DrawableOp, type ShapeOp } from '@inkclash/shared';
import { useAppStore } from '../../lib/store';
import { useCanvasStore } from '../../lib/canvas/store';
import { canvasBus } from '../../lib/canvas/bus';
import { sendDrawOps, undoDraw, redoDraw } from '../../lib/actions';
import {
  applyOp,
  compositeLayers,
  createLayerCanvases,
  drawStroke,
  replayOps,
  type LayerCanvases
} from '../../lib/canvas/render';
import { constrainShape, drawShape } from '../../lib/canvas/shapes';
import { fontFamilyFor } from '../../lib/canvas/text';
import { CANVAS_HEIGHT, CANVAS_WIDTH, BRUSH_SIZES, LAYER_COUNT } from '../../lib/canvas/palette';

interface StrokeSession {
  pointerId: number;
  layer: number;
  color: string;
  size: number;
  mode: 'draw' | 'erase';
  points: [number, number][];
  last: [number, number];
}

interface ShapeSession {
  pointerId: number;
  kind: ShapeOp['kind'];
  start: [number, number];
  end: [number, number];
  layer: number;
  color: string;
  size: number;
  fill: boolean;
}

interface TextDraft {
  at: [number, number];
  value: string;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface DrawingCanvasProps {
  canDraw: boolean;
  drawerName?: string;
}

export function DrawingCanvas({ canDraw, drawerName }: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<LayerCanvases | null>(null);
  const visibleRef = useRef<boolean[]>([true, true, true]);
  const rafRef = useRef<number | null>(null);
  const dprRef = useRef<number>(1);
  const strokeRef = useRef<StrokeSession | null>(null);
  const shapeRef = useRef<ShapeSession | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canDrawRef = useRef(canDraw);
  const placeholderRef = useRef<HTMLSpanElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textDraftRef = useRef<TextDraft | null>(null);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [canvasScale, setCanvasScale] = useState({ x: 1, y: 1 });

  const phase = useAppStore((state) => state.room?.phase);
  const visible = useCanvasStore((state) => state.visible);
  const tool = useCanvasStore((state) => state.tool);
  const color = useCanvasStore((state) => state.color);
  const textFont = useCanvasStore((state) => state.textFont);
  const textSize = useCanvasStore((state) => state.textSize);
  const canDrawNow = canDraw && phase === 'drawing';

  useEffect(() => {
    canDrawRef.current = canDrawNow;
  }, [canDrawNow]);

  const requestRender = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = displayRef.current;
      const layers = layersRef.current;
      if (!canvas || !layers) {
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }
      const dpr = dprRef.current;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      compositeLayers(context, layers, visibleRef.current);
    });
  }, []);

  const setHasContent = useCallback((hasContent: boolean) => {
    placeholderRef.current?.classList.toggle('hidden', hasContent);
  }, []);

  const clearPreview = useCallback(() => {
    const preview = previewRef.current;
    const context = preview?.getContext('2d');
    if (!preview || !context) {
      return;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, preview.width, preview.height);
    context.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
  }, []);

  const updateTextDraft = useCallback((next: TextDraft | null) => {
    textDraftRef.current = next;
    setTextDraft(next);
  }, []);

  const cancelTextDraft = useCallback(() => {
    textDraftRef.current = null;
    setTextDraft(null);
  }, []);

  const commitTextDraft = useCallback(() => {
    const draft = textDraftRef.current;
    textDraftRef.current = null;
    setTextDraft(null);
    if (!draft) {
      return;
    }
    const text = draft.value.trim();
    if (!text) {
      return;
    }
    const store = useCanvasStore.getState();
    const op: DrawableOp = {
      id: randomId(),
      t: 'text',
      layer: store.activeLayer,
      at: draft.at,
      text,
      color: store.color,
      size: store.textSize,
      font: store.textFont
    };
    const layers = layersRef.current;
    if (layers) {
      applyOp(layers, visibleRef.current, op);
    }
    setHasContent(true);
    requestRender();
    sendDrawOps([op]);
  }, [requestRender, setHasContent]);

  const applyFull = useCallback(
    (ops: DrawableOp[]) => {
      const layers = layersRef.current;
      if (!layers) {
        return;
      }
      strokeRef.current = null;
      shapeRef.current = null;
      clearPreview();
      const nextVisible = replayOps(layers, ops);
      visibleRef.current = nextVisible;
      useCanvasStore.getState().syncVisible(nextVisible as [boolean, boolean, boolean]);
      setHasContent(ops.length > 0);
      requestRender();
    },
    [clearPreview, requestRender, setHasContent]
  );

  useEffect(() => {
    const layers = createLayerCanvases();
    layersRef.current = layers;

    const display = displayRef.current;
    const preview = previewRef.current;
    if (display) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      dprRef.current = dpr;
      display.width = Math.floor(CANVAS_WIDTH * dpr);
      display.height = Math.floor(CANVAS_HEIGHT * dpr);
    }
    if (preview) {
      const dpr = dprRef.current;
      preview.width = Math.floor(CANVAS_WIDTH * dpr);
      preview.height = Math.floor(CANVAS_HEIGHT * dpr);
    }

    const unsubscribeOps = canvasBus.onOps((ops) => {
      const current = layersRef.current;
      if (!current) {
        return;
      }
      for (const op of ops) {
        applyOp(current, visibleRef.current, op);
      }
      if (ops.length > 0) {
        setHasContent(true);
      }
      requestRender();
    });
    const unsubscribeFull = canvasBus.onFull((ops) => {
      applyFull(ops);
    });

    requestRender();

    return () => {
      unsubscribeOps();
      unsubscribeFull();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [applyFull, requestRender]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setCanvasScale({
        x: rect.width > 0 ? rect.width / CANVAS_WIDTH : 1,
        y: rect.height > 0 ? rect.height / CANVAS_HEIGHT : 1
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    visibleRef.current = [...visible];
    requestRender();
  }, [visible, requestRender]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!canDrawRef.current) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const store = useCanvasStore.getState();
      const key = event.key.toLowerCase();
      const shortcuts: Record<string, () => void> = {
        b: () => store.setTool('brush'),
        e: () => store.setTool('eraser'),
        g: () => store.setTool('fill'),
        l: () => store.setTool('line'),
        r: () => store.setTool('rect'),
        o: () => store.setTool('ellipse'),
        t: () => store.setTool('text')
      };
      if (shortcuts[key]) {
        event.preventDefault();
        shortcuts[key]?.();
        return;
      }
      if (key === '[' || key === ']') {
        event.preventDefault();
        const current = BRUSH_SIZES.indexOf(store.size as (typeof BRUSH_SIZES)[number]);
        const index = Math.max(0, Math.min(BRUSH_SIZES.length - 1, current + (key === ']' ? 1 : -1)));
        store.setSize(BRUSH_SIZES[index] as number);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          void redoDraw();
        } else {
          void undoDraw();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toLogical = useCallback((event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = displayRef.current;
    if (!canvas) {
      return [0, 0];
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return [Math.round(Math.max(0, Math.min(CANVAS_WIDTH, x))), Math.round(Math.max(0, Math.min(CANVAS_HEIGHT, y)))];
  }, []);

  const flushStroke = useCallback(() => {
    const session = strokeRef.current;
    if (!session || session.points.length === 0) {
      return;
    }
    const points = session.points;
    const op: DrawableOp = {
      id: randomId(),
      t: 'stroke',
      layer: session.layer,
      color: session.color,
      size: session.size,
      mode: session.mode,
      pts: points
    };
    sendDrawOps([op]);
    session.points = [session.last];
  }, []);

  const endStroke = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    flushStroke();
    strokeRef.current = null;
  }, [flushStroke]);

  const updateCursor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const cursor = cursorRef.current;
    const canvas = displayRef.current;
    if (!cursor || !canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const size = useCanvasStore.getState().size;
    const scale = rect.width / CANVAS_WIDTH;
    const visualSize = Math.max(6, size * scale);
    cursor.style.width = `${visualSize}px`;
    cursor.style.height = `${visualSize}px`;
    cursor.style.left = `${event.clientX - rect.left}px`;
    cursor.style.top = `${event.clientY - rect.top}px`;
    cursor.style.opacity = '1';
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDrawRef.current) {
      return;
    }
    if (event.button !== 0 && event.pointerType === 'mouse') {
      return;
    }
    event.preventDefault();
    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    const store = useCanvasStore.getState();
    const layers = layersRef.current;
    if (!layers) {
      return;
    }
    const point = toLogical(event);

    if (store.tool === 'text') {
      updateTextDraft({ at: point, value: '' });
      requestAnimationFrame(() => textInputRef.current?.focus());
      return;
    }

    if (store.tool === 'fill') {
      const op: DrawableOp = {
        id: randomId(),
        t: 'fill',
        layer: store.activeLayer,
        at: point,
        color: store.color
      };
      applyOp(layers, visibleRef.current, op);
      requestRender();
      sendDrawOps([op]);
      return;
    }

    if (store.tool === 'line' || store.tool === 'rect' || store.tool === 'ellipse') {
      shapeRef.current = {
        pointerId: event.pointerId,
        kind: store.tool,
        start: point,
        end: point,
        layer: store.activeLayer,
        color: store.color,
        size: store.size,
        fill: store.fillShape
      };
      return;
    }

    const mode: 'draw' | 'erase' = store.tool === 'eraser' ? 'erase' : 'draw';
    strokeRef.current = {
      pointerId: event.pointerId,
      layer: store.activeLayer,
      color: store.color,
      size: store.size,
      mode,
      points: [point],
      last: point
    };
    const context = layers[store.activeLayer]?.getContext('2d');
    if (context) {
      drawStroke(context, {
        id: 'local',
        t: 'stroke',
        layer: store.activeLayer,
        color: store.color,
        size: store.size,
        mode,
        pts: [point]
      });
      requestRender();
    }
    if (!flushTimerRef.current) {
      flushTimerRef.current = setInterval(flushStroke, 40);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (canDrawRef.current) {
      updateCursor(event);
    }
    const shape = shapeRef.current;
    if (shape && shape.pointerId === event.pointerId) {
      const raw = toLogical(event);
      shape.end = constrainShape(shape.kind, shape.start, raw, event.shiftKey);
      const preview = previewRef.current;
      const context = preview?.getContext('2d');
      if (preview && context) {
        clearPreview();
        drawShape(context, {
          id: 'preview',
          t: 'shape',
          layer: shape.layer,
          kind: shape.kind,
          a: shape.start,
          b: shape.end,
          color: shape.color,
          size: shape.size,
          fill: shape.fill
        });
      }
      return;
    }

    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) {
      return;
    }
    const point = toLogical(event);
    const previous = stroke.last;
    if (point[0] === previous[0] && point[1] === previous[1]) {
      return;
    }
    stroke.points.push(point);
    stroke.last = point;
    const context = layersRef.current?.[stroke.layer]?.getContext('2d');
    if (context) {
      drawStroke(context, {
        id: 'local',
        t: 'stroke',
        layer: stroke.layer,
        color: stroke.color,
        size: stroke.size,
        mode: stroke.mode,
        pts: [previous, point]
      });
      requestRender();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const shape = shapeRef.current;
    if (shape && shape.pointerId === event.pointerId) {
      shapeRef.current = null;
      clearPreview();
      const layers = layersRef.current;
      if (layers) {
        const op: DrawableOp = {
          id: randomId(),
          t: 'shape',
          layer: shape.layer,
          kind: shape.kind,
          a: shape.start,
          b: shape.end,
          color: shape.color,
          size: shape.size,
          fill: shape.fill
        };
        applyOp(layers, visibleRef.current, op);
        requestRender();
        sendDrawOps([op]);
      }
      return;
    }
    const stroke = strokeRef.current;
    if (stroke && stroke.pointerId === event.pointerId) {
      endStroke();
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (shapeRef.current?.pointerId === event.pointerId) {
      shapeRef.current = null;
      clearPreview();
    }
    if (strokeRef.current?.pointerId === event.pointerId) {
      endStroke();
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-board bg-board">
      <canvas
        ref={displayRef}
        role="img"
        aria-label={drawerName ? `Papan gambar ${drawerName}` : 'Papan gambar'}
        className="block h-full w-full touch-none"
        style={{ cursor: canDrawNow ? (tool === 'text' ? 'text' : 'none') : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => {
          const cursor = cursorRef.current;
          if (cursor) {
            cursor.style.opacity = '0';
          }
        }}
      />
      <canvas
        ref={previewRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block h-full w-full"
      />
      {textDraft ? (
        <input
          ref={textInputRef}
          value={textDraft.value}
          onChange={(event) => updateTextDraft({ at: textDraft.at, value: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTextDraft();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              cancelTextDraft();
            }
          }}
          onBlur={commitTextDraft}
          autoFocus
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Tulis teks…"
          aria-label="Teks di papan"
          className="absolute z-10 m-0 min-w-[2ch] border-0 bg-transparent p-0 outline-none"
          style={{
            left: `${textDraft.at[0] * canvasScale.x}px`,
            top: `${textDraft.at[1] * canvasScale.y}px`,
            color,
            fontFamily: fontFamilyFor(textFont),
            fontSize: `${textSize * canvasScale.y}px`,
            lineHeight: 1.2
          }}
        />
      ) : null}
      {canDrawNow && tool !== 'text' ? (
        <div
          ref={cursorRef}
          aria-hidden="true"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink opacity-0 transition-opacity duration-100"
          style={{ boxShadow: '0 0 0 2px var(--board)' }}
        />
      ) : null}
      {!canDrawNow && phase !== 'choosing_word' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            ref={placeholderRef}
            className="rounded-full bg-panel/80 px-3 py-1 text-xs font-bold text-ink-soft"
          >
            Menunggu gambar pertama…
          </span>
        </div>
      ) : null}
    </div>
  );
}

export { LAYER_COUNT };
