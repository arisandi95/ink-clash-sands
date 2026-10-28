import type {
  ChatMessage,
  DrawableOp,
  Phase,
  RoomSettings,
  Team,
  TurnSummary
} from '@inkclash/shared';

export interface Player {
  id: string;
  token: string;
  nickname: string;
  avatar?: string;
  socketId: string | null;
  team: Team | null;
  score: number;
  connected: boolean;
  joinedAt: number;
  guessed: boolean;
  gainedThisTurn: number;
}

export interface Room {
  code: string;
  settings: RoomSettings;
  players: Map<string, Player>;
  hostId: string;
  phase: Phase;
  round: number;
  turnNumber: number;
  turnTotal: number;
  turnQueue: string[];
  turnIndex: number;
  currentDrawerId: string | null;
  drawingTeam: Team | null;
  word: string | null;
  wordChoices: string[] | null;
  usedWords: Set<string>;
  revealOrder: number[];
  revealedCount: 0 | 1 | 2;
  turnStartedAt: number | null;
  phaseEndsAt: number;
  ops: DrawableOp[];
  opBytes: number;
  redoStack: DrawableOp[];
  correctOrder: string[];
  turnSummary: TurnSummary | null;
  gameId: number | null;
  timers: Set<NodeJS.Timeout>;
  disconnectTimers: Map<string, NodeJS.Timeout>;
  drawerSkipTimers: Map<string, NodeJS.Timeout>;
  chat: { message: ChatMessage; audience: Team | 'all' }[];
  createdAt: number;
  cleanupTimer: NodeJS.Timeout | null;
}

export class GameError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export function makePlayer(input: {
  id: string;
  token: string;
  nickname: string;
  avatar?: string;
  socketId: string;
  team: Team | null;
}): Player {
  return {
    id: input.id,
    token: input.token,
    nickname: input.nickname,
    avatar: input.avatar,
    socketId: input.socketId,
    team: input.team,
    score: 0,
    connected: true,
    joinedAt: Date.now(),
    guessed: false,
    gainedThisTurn: 0
  };
}
