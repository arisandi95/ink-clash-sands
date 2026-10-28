import type { TextFont, TextOp } from '@inkclash/shared';

export interface TextFontOption {
  value: TextFont;
  label: string;
  family: string;
}

export const TEXT_FONT_OPTIONS: TextFontOption[] = [
  {
    value: 'sans',
    label: 'Sans',
    family: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
  },
  { value: 'marker', label: 'Marker', family: '"Permanent Marker", cursive' },
  { value: 'mono', label: 'Mono', family: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
];

export const TEXT_SIZES = [24, 40, 64] as const;

export function fontFamilyFor(font: TextFont): string {
  return TEXT_FONT_OPTIONS.find((option) => option.value === font)?.family ?? TEXT_FONT_OPTIONS[0].family;
}

export function drawText(context: CanvasRenderingContext2D, op: TextOp): void {
  context.save();
  context.fillStyle = op.color;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.font = `${op.size}px ${fontFamilyFor(op.font)}`;
  const lines = op.text.split('\n');
  const lineHeight = op.size * 1.2;
  lines.forEach((line, index) => {
    context.fillText(line, op.at[0], op.at[1] + index * lineHeight);
  });
  context.restore();
}
