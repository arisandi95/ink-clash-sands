export interface PaletteColor {
  hex: string;
  name: string;
}

export const PALETTE: PaletteColor[] = [
  { hex: '#161A20', name: 'Hitam' },
  { hex: '#4B5563', name: 'Abu tua' },
  { hex: '#9CA3AF', name: 'Abu' },
  { hex: '#FFFFFF', name: 'Putih' },
  { hex: '#D92D20', name: 'Merah' },
  { hex: '#F97316', name: 'Oranye' },
  { hex: '#FACC15', name: 'Kuning' },
  { hex: '#84CC16', name: 'Hijau lemon' },
  { hex: '#15803D', name: 'Hijau' },
  { hex: '#0D9488', name: 'Tosca' },
  { hex: '#38BDF8', name: 'Biru langit' },
  { hex: '#1D4ED8', name: 'Biru' },
  { hex: '#7C3AED', name: 'Ungu' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#92400E', name: 'Cokelat' },
  { hex: '#F2C9A0', name: 'Kulit' }
];

export const BRUSH_SIZES = [2, 4, 8, 14, 24] as const;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const LAYER_COUNT = 3;
