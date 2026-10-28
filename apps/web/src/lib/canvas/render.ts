import type { DrawableOp } from '@inkclash/shared';
import { CANVAS_HEIGHT, CANVAS_WIDTH, LAYER_COUNT } from './palette';
import { fillCanvasAt, hexToRgb, floodFillMask, maskToImageData } from './floodFill';
import { drawShape } from './shapes';
import { drawText } from './text';

export type LayerCanvases = HTMLCanvasElement[];

export function createLayerCanvases(): LayerCanvases {
  return Array.from({ length: LAYER_COUNT }, () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    return canvas;
  });
}

export function clearLayers(layers: LayerCanvases): void {
  for (const layer of layers) {
    const context = layer.getContext('2d');
    context?.clearRect(0, 0, layer.width, layer.height);
  }
}

export function compositeLayers(
  target: CanvasRenderingContext2D,
  layers: LayerCanvases,
  visible: boolean[]
): void {
  target.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  layers.forEach((layer, index) => {
    if (visible[index] === false) {
      return;
    }
    target.drawImage(layer, 0, 0);
  });
}

function strokePath(context: CanvasRenderingContext2D, points: [number, number][]): void {
  if (points.length === 0) {
    return;
  }
  const first = points[0] as [number, number];
  context.beginPath();
  context.moveTo(first[0], first[1]);
  if (points.length === 1) {
    context.lineTo(first[0] + 0.01, first[1] + 0.01);
    return;
  }
  if (points.length === 2) {
    const second = points[1] as [number, number];
    context.lineTo(second[0], second[1]);
    return;
  }
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index] as [number, number];
    const next = points[index + 1] as [number, number];
    const midX = (current[0] + next[0]) / 2;
    const midY = (current[1] + next[1]) / 2;
    context.quadraticCurveTo(current[0], current[1], midX, midY);
  }
  const last = points[points.length - 1] as [number, number];
  context.lineTo(last[0], last[1]);
}

export function drawStroke(
  context: CanvasRenderingContext2D,
  op: Extract<DrawableOp, { t: 'stroke' }>
): void {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = op.size;
  if (op.mode === 'erase') {
    context.globalCompositeOperation = 'destination-out';
    context.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = op.color;
  }
  strokePath(context, op.pts as [number, number][]);
  context.stroke();
  context.restore();
}

function fillOnLayers(
  layers: LayerCanvases,
  visible: boolean[],
  layerIndex: number,
  x: number,
  y: number,
  color: string
): void {
  const merged = document.createElement('canvas');
  merged.width = CANVAS_WIDTH;
  merged.height = CANVAS_HEIGHT;
  const mergedContext = merged.getContext('2d');
  if (!mergedContext) {
    return;
  }
  compositeLayers(mergedContext, layers, visible);
  const image = mergedContext.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const mask = floodFillMask(image.data, CANVAS_WIDTH, CANVAS_HEIGHT, x, y);
  const target = layers[layerIndex];
  const targetContext = target?.getContext('2d');
  if (!targetContext) {
    return;
  }
  const filled = maskToImageData(mask, CANVAS_WIDTH, CANVAS_HEIGHT, hexToRgb(color));
  const temp = document.createElement('canvas');
  temp.width = CANVAS_WIDTH;
  temp.height = CANVAS_HEIGHT;
  temp.getContext('2d')?.putImageData(filled, 0, 0);
  targetContext.drawImage(temp, 0, 0);
}

export function applyOp(
  layers: LayerCanvases,
  visible: boolean[],
  op: DrawableOp
): void {
  switch (op.t) {
    case 'stroke': {
      const context = layers[op.layer]?.getContext('2d');
      if (context) {
        drawStroke(context, op);
      }
      break;
    }
    case 'shape': {
      const context = layers[op.layer]?.getContext('2d');
      if (context) {
        drawShape(context, op);
      }
      break;
    }
    case 'text': {
      const context = layers[op.layer]?.getContext('2d');
      if (context) {
        drawText(context, op);
      }
      break;
    }
    case 'fill':
      fillOnLayers(layers, visible, op.layer, op.at[0], op.at[1], op.color);
      break;
    case 'clear':
      clearLayers(layers);
      break;
    case 'layer_visibility':
      visible[op.layer] = op.visible;
      break;
    default:
      break;
  }
}

export function replayOps(
  layers: LayerCanvases,
  ops: DrawableOp[]
): boolean[] {
  const visible = [true, true, true];
  clearLayers(layers);
  for (const op of ops) {
    applyOp(layers, visible, op);
  }
  return visible;
}

export function fillDirect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
): void {
  fillCanvasAt(context, x, y, color, CANVAS_WIDTH, CANVAS_HEIGHT);
}
