export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

export const FILL_TOLERANCE = 32;

function matches(
  data: Uint8ClampedArray,
  index: number,
  target: Rgb,
  targetAlpha: number,
  tolerance: number
): boolean {
  const alpha = data[index + 3] ?? 0;
  if (targetAlpha === 0) {
    return alpha <= tolerance;
  }
  if (alpha === 0) {
    return false;
  }
  return (
    Math.abs((data[index] ?? 0) - target.r) <= tolerance &&
    Math.abs((data[index + 1] ?? 0) - target.g) <= tolerance &&
    Math.abs((data[index + 2] ?? 0) - target.b) <= tolerance &&
    Math.abs(alpha - targetAlpha) <= tolerance
  );
}

export function floodFillMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance = FILL_TOLERANCE
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const x = Math.floor(startX);
  const y = Math.floor(startY);
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return mask;
  }

  const startIndex = (y * width + x) * 4;
  const target: Rgb = {
    r: data[startIndex] ?? 0,
    g: data[startIndex + 1] ?? 0,
    b: data[startIndex + 2] ?? 0
  };
  const targetAlpha = data[startIndex + 3] ?? 0;

  const stack: number[] = [y * width + x];
  while (stack.length > 0) {
    const position = stack.pop() as number;
    if (mask[position] === 1) {
      continue;
    }
    const px = position % width;
    const py = Math.floor(position / width);
    const dataIndex = position * 4;
    if (!matches(data, dataIndex, target, targetAlpha, tolerance)) {
      continue;
    }
    mask[position] = 1;
    if (px > 0) {
      stack.push(position - 1);
    }
    if (px < width - 1) {
      stack.push(position + 1);
    }
    if (py > 0) {
      stack.push(position - width);
    }
    if (py < height - 1) {
      stack.push(position + width);
    }
  }

  return mask;
}

export function maskToImageData(
  mask: Uint8Array,
  width: number,
  height: number,
  color: Rgb
): ImageData {
  const image = new ImageData(width, height);
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== 1) {
      continue;
    }
    const dataIndex = index * 4;
    image.data[dataIndex] = color.r;
    image.data[dataIndex + 1] = color.g;
    image.data[dataIndex + 2] = color.b;
    image.data[dataIndex + 3] = 255;
  }
  return image;
}

export function fillCanvasAt(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorHex: string,
  width: number,
  height: number,
  tolerance = FILL_TOLERANCE
): Uint8Array {
  const image = context.getImageData(0, 0, width, height);
  const mask = floodFillMask(image.data, width, height, x, y, tolerance);
  const color = hexToRgb(colorHex);
  const filled = maskToImageData(mask, width, height, color);
  context.putImageData(filled, 0, 0);
  return mask;
}
