export const CATEGORIES = [
  'umum',
  'hewan',
  'makanan-indonesia',
  'film',
  'programming'
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  umum: 'Umum',
  hewan: 'Hewan',
  'makanan-indonesia': 'Makanan Indonesia',
  film: 'Film',
  programming: 'Programming'
};

export type Mode = 'classic' | 'team';
export type Team = 'A' | 'B';
export type Phase = 'lobby' | 'choosing_word' | 'drawing' | 'turn_end' | 'game_end';

export interface RoomSettings {
  mode: Mode;
  category: Category;
  rounds: number;
  drawSeconds: number;
  maxPlayers: number;
  customWords?: string[];
}

export const DEFAULT_SETTINGS: RoomSettings = {
  mode: 'classic',
  category: 'umum',
  rounds: 3,
  drawSeconds: 80,
  maxPlayers: 12
};

export const LIMITS = {
  minPlayersClassic: 2,
  minPlayersTeam: 4,
  minTeamSize: 2,
  maxRounds: 10,
  minRounds: 1,
  minDrawSeconds: 60,
  maxDrawSeconds: 120,
  minMaxPlayers: 2,
  maxMaxPlayers: 20,
  nicknameMin: 2,
  nicknameMax: 24,
  maxCustomWords: 50,
  customWordMinLen: 2,
  customWordMaxLen: 64,
  reconnectGraceMs: 30_000,
  drawerDisconnectSkipMs: 10_000,
  choosingWordMs: 15_000,
  turnEndMs: 6_000,
  chatRateLimitMs: 700,
  emptyRoomTtlMs: 5 * 60_000
} as const;

export interface PublicPlayer {
  id: string;
  nickname: string;
  avatar?: string;
  team: Team | null;
  score: number;
  connected: boolean;
  isHost: boolean;
  guessed: boolean;
  drawing: boolean;
}

export interface TeamScores {
  A: number;
  B: number;
}

export interface TurnResult {
  playerId: string;
  nickname: string;
  gained: number;
  score: number;
}

export interface TurnSummary {
  word: string;
  reason: 'all_guessed' | 'time_up' | 'drawer_left';
  results: TurnResult[];
}

export interface PublicRoomState {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  turnNumber: number;
  turnTotal: number;
  players: PublicPlayer[];
  settings: RoomSettings;
  hostId: string;
  currentDrawerId: string | null;
  wordLength: number;
  hint: string[];
  phaseEndsAt: number;
  turnStartedAt: number | null;
  teamScores: TeamScores | null;
  drawingTeam: Team | null;
  revealedWord?: string;
  turnSummary?: TurnSummary;
  serverNow: number;
}

export type ChatKind = 'chat' | 'system' | 'correct' | 'info';

export interface ChatMessage {
  id: string;
  kind: ChatKind;
  nickname?: string;
  text: string;
  team?: Team;
  at: number;
}

export interface RankingEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
  team: Team | null;
}

export interface GameEndPayload {
  ranking: RankingEntry[];
  teamScores?: TeamScores;
  winnerTeam?: Team | null;
}

export interface RoomJoinedPayload {
  code: string;
  playerId: string;
  playerToken: string;
  avatar?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
