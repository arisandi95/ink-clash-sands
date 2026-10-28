import { describe, expect, it } from 'vitest';
import { FILL_TOLERANCE, floodFillMask, hexToRgb } from './floodFill';

function solidData(width: number, height: number, rgba: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data.set(rgba, index * 4);
  }
  return data;
}

describe('hexToRgb', () => {
  it('parses a six digit hex color', () => {
    expect(hexToRgb('#ff0080')).toEqual({ r: 255, g: 0, b: 128 });
  });
});

describe('floodFillMask', () => {
  it('fills every contiguous pixel of the target color', () => {
    const data = solidData(4, 3, [255, 255, 255, 255]);
    const mask = floodFillMask(data, 4, 3, 0, 0);
    expect(Array.from(mask)).toEqual(Array.from({ length: 12 }, () => 1));
  });

  it('stops at pixels that differ from the target color', () => {
    const data = solidData(3, 3, [255, 255, 255, 255]);
    data.set([255, 0, 0, 255], (1 * 3 + 1) * 4);
    const mask = floodFillMask(data, 3, 3, 0, 0, 0);
    expect(mask[4]).toBe(0);
    expect(mask.reduce((total, value) => total + value, 0)).toBe(8);
  });

  it('only fills the region reachable from the start point', () => {
    const data = solidData(3, 3, [0, 0, 0, 255]);
    for (let y = 0; y < 3; y += 1) {
      data.set([255, 255, 255, 255], (y * 3 + 1) * 4);
    }
    const mask = floodFillMask(data, 3, 3, 0, 0, 0);
    expect(Array.from(mask)).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0]);
  });

  it('honors the color tolerance', () => {
    const data = solidData(2, 1, [100, 100, 100, 255]);
    data.set([100 + FILL_TOLERANCE, 100, 100, 255], 4);
    expect(floodFillMask(data, 2, 1, 0, 0, FILL_TOLERANCE).reduce((a, b) => a + b, 0)).toBe(2);
    expect(floodFillMask(data, 2, 1, 0, 0, 0).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('returns an empty mask for coordinates outside the canvas', () => {
    const data = solidData(2, 2, [255, 255, 255, 255]);
    expect(Array.from(floodFillMask(data, 2, 2, -1, 0))).toEqual([0, 0, 0, 0]);
    expect(Array.from(floodFillMask(data, 2, 2, 2, 1))).toEqual([0, 0, 0, 0]);
  });
});
