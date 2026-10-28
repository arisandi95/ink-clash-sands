import { create } from 'zustand';
import type {
  ChatMessage,
  GameEndPayload,
  PublicRoomState,
  RoomSettings
} from '@inkclash/shared';

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

export interface WordOptionsState {
  words: string[];
  phaseEndsAt: number;
}

const TOKEN_KEY = 'inkclash:playerToken';
const NICK_KEY = 'inkclash:nickname';
const AVATAR_KEY = 'inkclash:avatar';
const ROOM_KEY = 'inkclash:roomCode';
const SOUND_KEY = 'inkclash:sound';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

function newToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `t-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function toastId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface AppState {
  connected: boolean;
  connectionLost: boolean;
  playerId: string | null;
  nickname: string;
  avatar: string;
  token: string;
  roomCode: string | null;
  room: PublicRoomState | null;
  wordOptions: WordOptionsState | null;
  myWord: string | null;
  chat: ChatMessage[];
  gameEnd: GameEndPayload | null;
  roomLost: boolean;
  serverOffset: number;
  toasts: Toast[];
  soundOn: boolean;
  lastGuess: { status: 'close' | 'wrong'; at: number } | null;

  setConnected: (connected: boolean) => void;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: string) => void;
  setIdentity: (playerId: string, roomCode: string, avatar?: string) => void;
  setRoomCode: (code: string | null) => void;
  setRoom: (room: PublicRoomState | null) => void;
  setWordOptions: (options: WordOptionsState | null) => void;
  setMyWord: (word: string | null) => void;
  addChat: (message: ChatMessage) => void;
  clearChat: () => void;
  setGameEnd: (payload: GameEndPayload | null) => void;
  setRoomLost: (lost: boolean) => void;
  setServerOffset: (offset: number) => void;
  setGuessStatus: (status: 'close' | 'wrong' | null) => void;
  setSoundOn: (on: boolean) => void;
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  resetRoom: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  connected: false,
  connectionLost: false,
  playerId: null,
  nickname: safeGet(NICK_KEY) ?? '',
  avatar: safeGet(AVATAR_KEY) ?? '',
  token: safeGet(TOKEN_KEY) ?? newToken(),
  roomCode: safeGet(ROOM_KEY),
  room: null,
  wordOptions: null,
  myWord: null,
  chat: [],
  gameEnd: null,
  roomLost: false,
  serverOffset: 0,
  toasts: [],
  soundOn: safeGet(SOUND_KEY) === '1',
  lastGuess: null,

  setConnected: (connected) =>
    set((state) => ({
      connected,
      connectionLost: connected ? false : state.room !== null
    })),
  setNickname: (nickname) => {
    safeSet(NICK_KEY, nickname);
    set({ nickname });
  },
  setAvatar: (avatar) => {
    safeSet(AVATAR_KEY, avatar);
    set({ avatar });
  },
  setIdentity: (playerId, roomCode, avatar) => {
    safeSet(ROOM_KEY, roomCode);
    safeSet(TOKEN_KEY, get().token);
    if (avatar !== undefined) {
      safeSet(AVATAR_KEY, avatar);
      set({ avatar });
    }
    set({ playerId, roomCode });
  },
  setRoomCode: (roomCode) => {
    safeSet(ROOM_KEY, roomCode);
    set({ roomCode });
  },
  setRoom: (room) =>
    set((state) => {
      const next: Partial<AppState> = { room, connectionLost: room ? false : state.connectionLost };
      if (room) {
        next.serverOffset = room.serverNow - Date.now();
        next.roomLost = false;
      }
      if (!room || room.phase !== 'choosing_word') {
        next.wordOptions = null;
      }
      if (!room || room.phase !== 'drawing') {
        next.myWord = null;
      }
      return next;
    }),
  setWordOptions: (wordOptions) => set({ wordOptions }),
  setMyWord: (myWord) => set({ myWord }),
  addChat: (message) =>
    set((state) => {
      if (state.chat.some((entry) => entry.id === message.id)) {
        return state;
      }
      return { chat: [...state.chat, message].slice(-200) };
    }),
  clearChat: () => set({ chat: [] }),
  setGameEnd: (gameEnd) => set({ gameEnd }),
  setRoomLost: (roomLost) => {
    if (roomLost) {
      safeSet(ROOM_KEY, null);
    }
    set({ roomLost, room: roomLost ? null : get().room });
  },
  setServerOffset: (serverOffset) => set({ serverOffset }),
  setGuessStatus: (status) => set({ lastGuess: status ? { status, at: Date.now() } : null }),
  setSoundOn: (soundOn) => {
    safeSet(SOUND_KEY, soundOn ? '1' : '0');
    set({ soundOn });
  },
  pushToast: (message, tone = 'info') => {
    const id = toastId();
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }].slice(-4) }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 4000);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  resetRoom: () => {
    safeSet(ROOM_KEY, null);
    safeSet(AVATAR_KEY, null);
    set({
      room: null,
      playerId: null,
      roomCode: null,
      avatar: '',
      wordOptions: null,
      myWord: null,
      chat: [],
      gameEnd: null,
      roomLost: false
    });
  }
}));

export function useSettings(): RoomSettings | null {
  return useAppStore((state) => state.room?.settings ?? null);
}
