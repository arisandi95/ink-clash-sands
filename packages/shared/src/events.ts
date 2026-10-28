import { z } from 'zod';
import { drawableOpSchema, type DrawableOp } from './ops.js';
import {
  CATEGORIES,
  type ChatMessage,
  type ErrorPayload,
  type GameEndPayload,
  type PublicRoomState,
  type RoomJoinedPayload
} from './types.js';

export type Ack<T = object> = (
  result: (T & { ok: true }) | { ok: false; code: string; message: string }
) => void;

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, 'Nama minimal 2 karakter.')
  .max(24, 'Nama maksimal 24 karakter.')
  .regex(/^[\p{L}\p{N} ._-]+$/u, 'Nama hanya boleh berisi huruf, angka, spasi, titik, garis bawah, dan strip.');

export const playerTokenSchema = z.string().min(8).max(80);
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, 'Kode room harus 6 karakter.');

export const settingsSchema = z.object({
  mode: z.enum(['classic', 'team']),
  category: z.enum(CATEGORIES),
  rounds: z.number().int().min(1).max(10),
  drawSeconds: z.union([z.literal(60), z.literal(80), z.literal(100), z.literal(120)]),
  maxPlayers: z.number().int().min(2).max(20),
  customWords: z
    .array(
      z
        .string()
        .trim()
        .min(2, 'Kata kustom minimal 2 karakter.')
        .max(64, 'Kata kustom maksimal 64 karakter.')
    )
    .max(50, 'Maksimal 50 kata kustom per room.')
    .optional()
});

export const settingsPatchSchema = settingsSchema.partial();

export const roomCreateSchema = z.object({
  nickname: nicknameSchema,
  playerToken: playerTokenSchema,
  avatar: z.string().min(1).max(32).optional(),
  settings: settingsSchema.partial().optional()
});

export const roomJoinSchema = z.object({
  code: roomCodeSchema,
  nickname: nicknameSchema,
  playerToken: playerTokenSchema,
  avatar: z.string().min(1).max(32).optional()
});

export const roomSettingsSchema = z.object({
  settings: settingsPatchSchema
});

export const teamSwitchSchema = z.object({
  team: z.enum(['A', 'B'])
});

export const wordChooseSchema = z.object({
  index: z.number().int().min(0).max(2)
});

export const guessSubmitSchema = z.object({
  text: z.string().trim().min(1).max(80)
});

export const chatSendSchema = z.object({
  text: z.string().trim().min(1).max(240)
});

export const drawOpsSchema = z.object({
  ops: z.array(drawableOpSchema).min(1).max(60)
});

export interface TimeSyncResponse {
  serverNow: number;
}

export interface WordOptionsPayload {
  words: string[];
  phaseEndsAt: number;
}

export interface GuessResultPayload {
  status: 'close' | 'wrong' | 'correct';
  score?: number;
  gained?: number;
}

export interface ClientToServerEvents {
  'time:sync': (ack: (response: TimeSyncResponse) => void) => void;
  'room:create': (payload: z.infer<typeof roomCreateSchema>, ack: Ack<RoomJoinedPayload>) => void;
  'room:join': (payload: z.infer<typeof roomJoinSchema>, ack: Ack<RoomJoinedPayload>) => void;
  'room:leave': () => void;
  'room:settings': (payload: z.infer<typeof roomSettingsSchema>, ack: Ack) => void;
  'team:switch': (payload: z.infer<typeof teamSwitchSchema>, ack: Ack) => void;
  'team:shuffle': (ack: Ack) => void;
  'game:start': (ack: Ack) => void;
  'word:choose': (payload: z.infer<typeof wordChooseSchema>, ack: Ack) => void;
  'guess:submit': (payload: z.infer<typeof guessSubmitSchema>, ack: Ack<GuessResultPayload>) => void;
  'chat:send': (payload: z.infer<typeof chatSendSchema>, ack: Ack) => void;
  'draw:ops': (payload: z.infer<typeof drawOpsSchema>, ack: Ack) => void;
  'draw:undo': (ack: Ack) => void;
  'draw:redo': (ack: Ack) => void;
  'draw:clear': (ack: Ack) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: PublicRoomState) => void;
  'turn:word_options': (payload: WordOptionsPayload) => void;
  'turn:word': (payload: { word: string }) => void;
  'hint:update': (payload: { hint: string[] }) => void;
  'chat:message': (message: ChatMessage) => void;
  'guess:result': (payload: GuessResultPayload) => void;
  'draw:ops': (payload: { ops: DrawableOp[] }) => void;
  'draw:full': (payload: { ops: DrawableOp[] }) => void;
  'game:end': (payload: GameEndPayload) => void;
  'error': (payload: ErrorPayload) => void;
  'room:closed': (payload: { reason: string }) => void;
}

export type SettingsInput = z.infer<typeof settingsSchema>;
export type RoomCreateInput = z.infer<typeof roomCreateSchema>;
export type RoomJoinInput = z.infer<typeof roomJoinSchema>;
export type GuessSubmitInput = z.infer<typeof guessSubmitSchema>;
export type DrawOpsInput = z.infer<typeof drawOpsSchema>;
