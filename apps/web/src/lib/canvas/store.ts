import type { TextFont } from '@inkclash/shared';
import { create } from 'zustand';
import { PALETTE } from './palette';

export type Tool = 'brush' | 'eraser' | 'fill' | 'line' | 'rect' | 'ellipse' | 'text';

const RECENT_KEY = 'inkclash:recentColors';

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === 'string').slice(0, 8);
  } catch {
    return [];
  }
}

function persistRecent(colors: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(colors));
  } catch {
    // ignore
  }
}

interface CanvasState {
  tool: Tool;
  color: string;
  size: number;
  fillShape: boolean;
  textFont: TextFont;
  textSize: number;
  activeLayer: number;
  visible: [boolean, boolean, boolean];
  recentColors: string[];
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setFillShape: (value: boolean) => void;
  setTextFont: (font: TextFont) => void;
  setTextSize: (size: number) => void;
  setActiveLayer: (layer: number) => void;
  toggleLayer: (layer: number) => void;
  setVisible: (layer: number, visible: boolean) => void;
  syncVisible: (visible: [boolean, boolean, boolean]) => void;
  resetVisibility: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  tool: 'brush',
  color: PALETTE[0]?.hex ?? '#161A20',
  size: 4,
  fillShape: false,
  textFont: 'sans',
  textSize: 40,
  activeLayer: 0,
  visible: [true, true, true],
  recentColors: readRecent(),
  setTool: (tool) => set({ tool }),
  setColor: (color) => {
    const recent = [color, ...get().recentColors.filter((entry) => entry !== color)].slice(0, 8);
    persistRecent(recent);
    set({ color, recentColors: recent, tool: get().tool === 'eraser' ? 'brush' : get().tool });
  },
  setSize: (size) => set({ size }),
  setFillShape: (fillShape) => set({ fillShape }),
  setTextFont: (textFont) => set({ textFont }),
  setTextSize: (textSize) => set({ textSize }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  toggleLayer: (layer) => {
    const visible = [...get().visible] as [boolean, boolean, boolean];
    visible[layer] = !visible[layer];
    set({ visible });
  },
  setVisible: (layer, value) => {
    const visible = [...get().visible] as [boolean, boolean, boolean];
    visible[layer] = value;
    set({ visible });
  },
  syncVisible: (visible) => set({ visible }),
  resetVisibility: () => set({ visible: [true, true, true] })
}));
