import type { ShapeOp } from '@inkclash/shared';

export function traceShape(
  context: CanvasRenderingContext2D,
  op: Pick<ShapeOp, 'kind' | 'a' | 'b'>
): void {
  const [ax, ay] = op.a;
  const [bx, by] = op.b;
  context.beginPath();
  if (op.kind === 'line') {
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    return;
  }
  if (op.kind === 'rect') {
    context.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
    return;
  }
  const cx = (ax + bx) / 2;
  const cy = (ay + by) / 2;
  const rx = Math.abs(bx - ax) / 2;
  const ry = Math.abs(by - ay) / 2;
  context.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
}

export function drawShape(context: CanvasRenderingContext2D, op: ShapeOp): void {
  context.save();
  context.strokeStyle = op.color;
  context.fillStyle = op.color;
  context.lineWidth = op.size;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  traceShape(context, op);
  if (op.kind === 'line') {
    context.stroke();
  } else if (op.fill) {
    context.fill();
  } else {
    context.stroke();
  }
  context.restore();
}

export function constrainShape(
  kind: ShapeOp['kind'],
  start: [number, number],
  end: [number, number],
  shiftKey: boolean
): [number, number] {
  if (!shiftKey) {
    return end;
  }
  if (kind === 'line') {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const length = Math.hypot(dx, dy);
    return [start[0] + Math.cos(angle) * length, start[1] + Math.sin(angle) * length];
  }
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return [start[0] + Math.sign(dx || 1) * size, start[1] + Math.sign(dy || 1) * size];
}
