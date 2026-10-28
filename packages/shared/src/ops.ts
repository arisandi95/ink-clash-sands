import { z } from 'zod';

export const LOGICAL_WIDTH = 800;
export const LOGICAL_HEIGHT = 600;
export const MAX_LAYERS = 3;
export const MAX_OPS = 5000;
export const MAX_OP_BYTES = 5 * 1024 * 1024;
export const MAX_STROKE_POINTS = 1200;
export const MAX_TEXT_LENGTH = 200;

export const TEXT_FONTS = ['sans', 'marker', 'mono'] as const;

export const textFontSchema = z.enum(TEXT_FONTS);

export const pointSchema = z.tuple([
  z.number().finite().min(-1000).max(2000),
  z.number().finite().min(-1000).max(2000)
]);

export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6 digit hex value');

export const layerSchema = z.number().int().min(0).max(MAX_LAYERS - 1);
const brushSizeSchema = z.number().int().min(1).max(64);
const opIdSchema = z.string().min(1).max(80);

export const strokeOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('stroke'),
  layer: layerSchema,
  color: colorSchema,
  size: brushSizeSchema,
  mode: z.enum(['draw', 'erase']),
  pts: z.array(pointSchema).min(1).max(MAX_STROKE_POINTS)
});

export const shapeOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('shape'),
  layer: layerSchema,
  kind: z.enum(['line', 'rect', 'ellipse']),
  a: pointSchema,
  b: pointSchema,
  color: colorSchema,
  size: brushSizeSchema,
  fill: z.boolean()
});

export const textOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('text'),
  layer: layerSchema,
  at: pointSchema,
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  color: colorSchema,
  size: z.number().int().min(8).max(120),
  font: textFontSchema
});

export const fillOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('fill'),
  layer: layerSchema,
  at: pointSchema,
  color: colorSchema
});

export const clearOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('clear')
});

export const undoOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('undo'),
  target: z.string().min(1).max(80)
});

export const redoOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('redo'),
  target: z.string().min(1).max(80)
});

export const layerVisibilityOpSchema = z.object({
  id: opIdSchema,
  t: z.literal('layer_visibility'),
  layer: layerSchema,
  visible: z.boolean()
});

export const opSchema = z.discriminatedUnion('t', [
  strokeOpSchema,
  shapeOpSchema,
  textOpSchema,
  fillOpSchema,
  clearOpSchema,
  undoOpSchema,
  redoOpSchema,
  layerVisibilityOpSchema
]);

export const drawableOpSchema = z.discriminatedUnion('t', [
  strokeOpSchema,
  shapeOpSchema,
  textOpSchema,
  fillOpSchema,
  clearOpSchema,
  layerVisibilityOpSchema
]);

export const opBatchSchema = z.object({
  ops: z.array(drawableOpSchema).min(1).max(60)
});

export type Point = z.infer<typeof pointSchema>;
export type StrokeOp = z.infer<typeof strokeOpSchema>;
export type ShapeOp = z.infer<typeof shapeOpSchema>;
export type TextFont = z.infer<typeof textFontSchema>;
export type TextOp = z.infer<typeof textOpSchema>;
export type FillOp = z.infer<typeof fillOpSchema>;
export type ClearOp = z.infer<typeof clearOpSchema>;
export type UndoOp = z.infer<typeof undoOpSchema>;
export type RedoOp = z.infer<typeof redoOpSchema>;
export type LayerVisibilityOp = z.infer<typeof layerVisibilityOpSchema>;
export type Op = z.infer<typeof opSchema>;
export type DrawableOp = z.infer<typeof drawableOpSchema>;
