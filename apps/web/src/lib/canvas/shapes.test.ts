import { describe, expect, it, vi } from 'vitest';
import { constrainShape, traceShape } from './shapes';

function createContext() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    rect: vi.fn(),
    ellipse: vi.fn()
  } as unknown as CanvasRenderingContext2D;
}

describe('traceShape', () => {
  it('traces a line between both points', () => {
    const context = createContext();
    traceShape(context, { kind: 'line', a: [10, 20], b: [30, 40] });
    expect(context.beginPath).toHaveBeenCalledOnce();
    expect(context.moveTo).toHaveBeenCalledWith(10, 20);
    expect(context.lineTo).toHaveBeenCalledWith(30, 40);
  });

  it('normalizes rectangle coordinates', () => {
    const context = createContext();
    traceShape(context, { kind: 'rect', a: [40, 60], b: [10, 20] });
    expect(context.rect).toHaveBeenCalledWith(10, 20, 30, 40);
  });

  it('traces an ellipse centered between the points', () => {
    const context = createContext();
    traceShape(context, { kind: 'ellipse', a: [0, 0], b: [40, 20] });
    expect(context.ellipse).toHaveBeenCalledWith(20, 10, 20, 10, 0, 0, Math.PI * 2);
  });
});

describe('constrainShape', () => {
  it('returns the raw end point without shift', () => {
    expect(constrainShape('line', [0, 0], [13, 7], false)).toEqual([13, 7]);
  });

  it('snaps lines to 45 degree steps with shift', () => {
    const [x, y] = constrainShape('line', [0, 0], [10, 2], true);
    expect(x).toBeCloseTo(Math.hypot(10, 2));
    expect(y).toBeCloseTo(0);
  });

  it('keeps rectangles square with shift', () => {
    expect(constrainShape('rect', [10, 10], [30, 20], true)).toEqual([30, 30]);
  });

  it('preserves direction when an axis has no movement', () => {
    expect(constrainShape('ellipse', [0, 0], [0, 15], true)).toEqual([15, 15]);
  });
});
