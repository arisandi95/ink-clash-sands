import { randomUUID } from 'node:crypto';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  type Category,
  type ChatMessage,
  type DrawableOp,
  type GameEndPayload,
  type PublicPlayer,
  type PublicRoomState,
  type RankingEntry,
  type RoomJoinedPayload,
  type RoomSettings,
  type Team,
  type TeamScores,
  type TurnResult,
  type TurnSummary
} from '@inkclash/shared';
import {
  createGame,
  finishGame,
  saveGamePlayers,
  saveTurn
} from '../db/queries.js';
import { containsProfanity } from './moderation.js';
import { normalizeCustomWords, pickCustomWords } from './custom-words.js';
import { guessScore, DRAWER_BONUS } from './scoring.js';
import {
  buildHintTokens,
  pickRevealOrder,
  revealedSet,
  revealCount,
  wordLength
} from './hints.js';
import { isCloseGuess, normalizeGuess } from './normalize.js';
import { autoAssignTeams, buildTeamQueue, shuffleTeams, teamSizes } from './teams.js';
import { wordBank } from './words.js';
import { GameError, makePlayer, type Player, type Room } from './room.js';
import type { GameSocket, IO } from '../socket/types.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    const current = copy[index] as T;
    copy[index] = copy[swapWith] as T;
    copy[swapWith] = current;
  }
  return copy;
}

function generateCode(): string {
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function chatId(): string {
  return randomUUID();
}

export interface GuessOutcome {
  status: 'correct' | 'close' | 'wrong';
  score?: number;
  gained?: number;
}

export interface EngineTiming {
  choosingMs: number;
  turnEndMs: number;
  reconnectGraceMs: number;
  drawerSkipMs: number;
}

const DEFAULT_TIMING: EngineTiming = {
  choosingMs: LIMITS.choosingWordMs,
  turnEndMs: LIMITS.turnEndMs,
  reconnectGraceMs: LIMITS.reconnectGraceMs,
  drawerSkipMs: LIMITS.drawerDisconnectSkipMs
};

export class GameEngine {
  private readonly rooms = new Map<string, Room>();
  private readonly playerRoom = new Map<string, string>();
  private readonly socketPlayer = new Map<string, string>();
  private readonly rateLimits = new Map<string, number>();
  private readonly timing: EngineTiming;

  constructor(
    private readonly io: IO,
    options: Partial<EngineTiming> = {}
  ) {
    this.timing = { ...DEFAULT_TIMING, ...options };
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  getRoomForPlayer(playerId: string): Room | undefined {
    const code = this.playerRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.getRoomForPlayer(playerId)?.players.get(playerId);
  }

  getPlayerIdForSocket(socketId: string): string | undefined {
    return this.socketPlayer.get(socketId);
  }

  createRoom(
    socketId: string,
    nicknameRaw: string,
    token: string,
    settingsInput?: Partial<RoomSettings>,
    avatar?: string
  ): RoomJoinedPayload {
    const nickname = nicknameRaw.trim();
    if (containsProfanity(nickname)) {
      throw new GameError('bad_nickname', 'Nama ini tidak bisa dipakai.');
    }
    const settings = this.mergeSettings({ ...DEFAULT_SETTINGS, ...settingsInput });
    let code = generateCode();
    while (this.rooms.has(code)) {
      code = generateCode();
    }

    const room = this.createRoomObject(code, settings);
    this.rooms.set(code, room);

    const player = makePlayer({
      id: randomUUID(),
      token,
      nickname,
      avatar,
      socketId,
      team: null
    });
    room.players.set(player.id, player);
    room.hostId = player.id;
    this.playerRoom.set(player.id, code);
    this.socketPlayer.set(socketId, player.id);

    const socket = this.socket(socketId);
    socket?.join(code);

    this.pushChat(room, {
      id: chatId(),
      kind: 'info',
      text: `${nickname} membuat room ini.`,
      at: Date.now()
    });
    this.emitState(room);
    this.sendPrivateState(player, room);
    return { code, playerId: player.id, playerToken: token, avatar };
  }

  joinRoom(
    socketId: string,
    codeRaw: string,
    nicknameRaw: string,
    token: string,
    options: { allowNew?: boolean; avatar?: string } = {}
  ): RoomJoinedPayload {
    const code = codeRaw.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      throw new GameError('room_not_found', 'Room tidak ditemukan. Cek kodenya atau minta host mengirim ulang link.');
    }

    const existing = [...room.players.values()].find((player) => player.token === token);
    if (existing) {
      const previousSocketId = existing.socketId;
      if (previousSocketId && previousSocketId !== socketId) {
        const previousSocket = this.socket(previousSocketId);
        previousSocket?.leave(code);
        previousSocket?.emit('error', {
          code: 'session_replaced',
          message: 'Sesi ini dibuka di perangkat lain.'
        });
        this.socketPlayer.delete(previousSocketId);
      }
      existing.socketId = socketId;
      existing.connected = true;
      this.playerRoom.set(existing.id, code);
      this.socketPlayer.set(socketId, existing.id);
      this.clearPlayerTimers(room, existing.id);
      this.socket(socketId)?.join(code);
      this.sendChatHistory(socketId, room, existing);
      this.sendPrivateState(existing, room);
      this.emitState(room);
      return { code, playerId: existing.id, playerToken: existing.token, avatar: existing.avatar };
    }

    if (options.allowNew === false) {
      throw new GameError('room_not_found', 'Room tidak ditemukan.');
    }

    const nickname = nicknameRaw.trim();
    if (containsProfanity(nickname)) {
      throw new GameError('bad_nickname', 'Nama ini tidak bisa dipakai.');
    }
    const duplicate = [...room.players.values()].some(
      (player) => player.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (duplicate) {
      throw new GameError('nickname_taken', 'Nama ini sudah dipakai di room ini. Coba nama lain.');
    }
    if (room.players.size >= room.settings.maxPlayers) {
      throw new GameError('room_full', `Room sudah penuh (${room.settings.maxPlayers} pemain).`);
    }

    let team: Team | null = null;
    if (room.settings.mode === 'team') {
      const sizes = teamSizes([...room.players.values()]);
      team = sizes.A <= sizes.B ? 'A' : 'B';
    }

    const player = makePlayer({
      id: randomUUID(),
      token,
      nickname,
      avatar: options.avatar,
      socketId,
      team
    });
    room.players.set(player.id, player);
    this.playerRoom.set(player.id, code);
    this.socketPlayer.set(socketId, player.id);
    this.socket(socketId)?.join(code);

    if (!room.hostId || !room.players.has(room.hostId)) {
      room.hostId = player.id;
    }

    this.sendChatHistory(socketId, room, player);
    this.pushChat(room, {
      id: chatId(),
      kind: 'info',
      text: `${nickname} bergabung.`,
      at: Date.now()
    });
    this.sendPrivateState(player, room);
    this.emitState(room);
    return { code, playerId: player.id, playerToken: token, avatar: options.avatar };
  }

  leaveBySocket(socketId: string): void {
    const playerId = this.socketPlayer.get(socketId);
    if (!playerId) {
      return;
    }
    const room = this.getRoomForPlayer(playerId);
    this.socketPlayer.delete(socketId);
    if (!room) {
      this.playerRoom.delete(playerId);
      return;
    }
    this.removePlayer(room, playerId, 'left');
  }

  disconnectSocket(socketId: string): void {
    const playerId = this.socketPlayer.get(socketId);
    if (!playerId) {
      return;
    }
    this.socketPlayer.delete(socketId);
    const room = this.getRoomForPlayer(playerId);
    if (!room) {
      return;
    }
    const player = room.players.get(playerId);
    if (!player) {
      return;
    }
    player.connected = false;
    player.socketId = null;

    if (room.hostId === player.id) {
      const nextHost = [...room.players.values()]
        .filter((candidate) => candidate.connected && candidate.id !== player.id)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (nextHost) {
        room.hostId = nextHost.id;
      }
    }

    const removal = setTimeout(() => {
      room.disconnectTimers.delete(player.id);
      this.removePlayer(room, player.id, 'timeout');
    }, this.timing.reconnectGraceMs);
    room.disconnectTimers.set(player.id, removal);

    if (room.currentDrawerId === player.id && (room.phase === 'drawing' || room.phase === 'choosing_word')) {
      const skip = setTimeout(() => {
        room.drawerSkipTimers.delete(player.id);
        if (!player.connected && room.currentDrawerId === player.id) {
          if (room.phase === 'drawing') {
            this.endTurn(room, 'drawer_left');
          } else if (room.phase === 'choosing_word') {
            this.nextTurn(room);
          }
        }
      }, this.timing.drawerSkipMs);
      room.drawerSkipTimers.set(player.id, skip);
    }

    this.pushChat(room, {
      id: chatId(),
      kind: 'info',
      text: `${player.nickname} terputus.`,
      at: Date.now()
    });
    this.emitState(room);
  }

  updateSettings(playerId: string, patch: Partial<RoomSettings>): void {
    const room = this.requireRoom(playerId);
    this.requirePlayer(room, playerId);
    if (room.hostId !== playerId) {
      throw new GameError('not_host', 'Hanya host yang bisa mengubah pengaturan.');
    }
    if (room.phase !== 'lobby') {
      throw new GameError('wrong_phase', 'Pengaturan hanya bisa diubah di lobby.');
    }
    room.settings = this.mergeSettings({ ...room.settings, ...patch });

    if (room.settings.mode === 'team') {
      const assignments = autoAssignTeams([...room.players.values()]);
      for (const [id, team] of assignments) {
        const target = room.players.get(id);
        if (target) {
          target.team = team;
        }
      }
    } else {
      for (const target of room.players.values()) {
        target.team = null;
      }
    }
    this.emitState(room);
  }

  switchTeam(playerId: string, team: Team): void {
    const room = this.requireRoom(playerId);
    if (room.settings.mode !== 'team') {
      throw new GameError('not_team_mode', 'Room ini tidak memakai mode tim.');
    }
    if (room.phase !== 'lobby') {
      throw new GameError('wrong_phase', 'Tim hanya bisa dipilih di lobby.');
    }
    const player = this.requirePlayer(room, playerId);
    player.team = team;
    const sizes = teamSizes([...room.players.values()]);
    if (sizes.A > 0 && sizes.B > 0 && Math.abs(sizes.A - sizes.B) > 1) {
      // Keep the room playable: rebalance the player that just moved.
      const other: Team = team === 'A' ? 'B' : 'A';
      const target = [...room.players.values()]
        .filter((candidate) => candidate.team === team && candidate.id !== playerId)
        .sort((a, b) => b.joinedAt - a.joinedAt)[0];
      if (target) {
        target.team = other;
      }
    }
    this.emitState(room);
  }

  shuffleTeamsByHost(playerId: string): void {
    const room = this.requireRoom(playerId);
    if (room.hostId !== playerId) {
      throw new GameError('not_host', 'Hanya host yang bisa mengacak tim.');
    }
    if (room.phase !== 'lobby') {
      throw new GameError('wrong_phase', 'Tim hanya bisa diacak di lobby.');
    }
    if (room.settings.mode !== 'team') {
      throw new GameError('not_team_mode', 'Room ini tidak memakai mode tim.');
    }
    const assignments = shuffleTeams([...room.players.values()]);
    for (const [id, team] of assignments) {
      const player = room.players.get(id);
      if (player) {
        player.team = team;
      }
    }
    this.emitState(room);
  }

  async startGame(playerId: string): Promise<void> {
    const room = this.requireRoom(playerId);
    if (room.hostId !== playerId) {
      throw new GameError('not_host', 'Hanya host yang bisa memulai game.');
    }
    if (room.phase !== 'lobby' && room.phase !== 'game_end') {
      throw new GameError('wrong_phase', 'Game sudah berjalan.');
    }

    const connected = [...room.players.values()].filter((player) => player.connected);
    if (room.settings.mode === 'team') {
      if (connected.length < LIMITS.minPlayersTeam) {
        throw new GameError('not_enough_players', 'Butuh minimal 4 pemain untuk mode tim.');
      }
      const assignments = autoAssignTeams([...room.players.values()]);
      for (const [id, team] of assignments) {
        const player = room.players.get(id);
        if (player) {
          player.team = team;
        }
      }
      const sizes = teamSizes(connected);
      if (sizes.A < LIMITS.minTeamSize || sizes.B < LIMITS.minTeamSize) {
        throw new GameError('teams_unbalanced', 'Setiap tim butuh minimal 2 pemain.');
      }
      if (Math.abs(sizes.A - sizes.B) > 1) {
        throw new GameError('teams_unbalanced', 'Jumlah anggota tim harus seimbang (selisih maksimal 1).');
      }
    } else if (connected.length < LIMITS.minPlayersClassic) {
      throw new GameError('not_enough_players', 'Butuh minimal 2 pemain untuk memulai.');
    }

    this.clearAllTimers(room);
    room.phase = 'lobby';
    room.round = 1;
    room.turnIndex = 0;
    room.turnQueue = [];
    room.turnNumber = 0;
    room.turnTotal = 0;
    room.currentDrawerId = null;
    room.drawingTeam = null;
    room.word = null;
    room.wordChoices = null;
    room.usedWords.clear();
    room.revealOrder = [];
    room.revealedCount = 0;
    room.turnStartedAt = null;
    room.phaseEndsAt = 0;
    room.ops = [];
    room.opBytes = 0;
    room.redoStack = [];
    room.correctOrder = [];
    room.turnSummary = null;
    room.chat = [];
    for (const player of room.players.values()) {
      player.score = 0;
      player.guessed = false;
      player.gainedThisTurn = 0;
    }

    room.gameId = await createGame({
      roomCode: room.code,
      mode: room.settings.mode,
      category: room.settings.customWords && room.settings.customWords.length > 0
        ? 'custom'
        : room.settings.category,
      rounds: room.settings.rounds,
      drawSeconds: room.settings.drawSeconds,
      startedAt: new Date()
    });

    this.buildQueue(room);
    if (room.turnQueue.length === 0) {
      throw new GameError('not_enough_players', 'Belum ada pemain yang bisa menggambar.');
    }
    this.startTurn(room);
  }

  chooseWord(playerId: string, index: number): void {
    const room = this.requireRoom(playerId);
    if (room.phase !== 'choosing_word') {
      throw new GameError('wrong_phase', 'Saat ini tidak ada pilihan kata.');
    }
    if (room.currentDrawerId !== playerId) {
      throw new GameError('not_drawer', 'Hanya penggambar yang bisa memilih kata.');
    }
    const choices = room.wordChoices;
    if (!choices || choices.length === 0) {
      throw new GameError('no_words', 'Tidak ada kata yang tersedia.');
    }
    const word = choices[index] ?? choices[0];
    if (!word) {
      throw new GameError('no_words', 'Tidak ada kata yang tersedia.');
    }
    room.word = word;
    room.usedWords.add(word);
    room.wordChoices = null;
    this.startDrawing(room);
  }

  submitGuess(playerId: string, textRaw: string): GuessOutcome {
    const room = this.requireRoom(playerId);
    const player = this.requirePlayer(room, playerId);
    if (room.phase !== 'drawing') {
      throw new GameError('wrong_phase', 'Belum ada gambar untuk ditebak.');
    }
    this.checkRateLimit(playerId);
    if (player.id === room.currentDrawerId) {
      throw new GameError('drawer_guessing', 'Kamu sedang menggambar.');
    }
    if (player.guessed) {
      throw new GameError('already_guessed', 'Kamu sudah menebak dengan benar.');
    }
    if (room.settings.mode === 'team' && player.team !== room.drawingTeam) {
      throw new GameError('watching', 'Kamu sedang menonton giliran tim lain.');
    }
    if (!room.word) {
      throw new GameError('no_word', 'Belum ada kata.');
    }

    const now = Date.now();
    const guess = normalizeGuess(textRaw);
    const target = normalizeGuess(room.word);

    if (guess === target) {
      const remaining = Math.max(0, room.phaseEndsAt - now);
      const gained = guessScore(remaining, room.settings.drawSeconds * 1000, room.correctOrder.length);
      player.score += gained;
      player.guessed = true;
      player.gainedThisTurn += gained;
      room.correctOrder.push(player.id);

      const drawer = room.currentDrawerId ? room.players.get(room.currentDrawerId) : undefined;
      if (drawer) {
        drawer.score += DRAWER_BONUS;
        drawer.gainedThisTurn += DRAWER_BONUS;
      }

      const audience: Team | 'all' = room.settings.mode === 'team' ? (room.drawingTeam ?? 'all') : 'all';
      this.emitChat(
        room,
        {
          id: chatId(),
          kind: 'correct',
          nickname: player.nickname,
          text: `${player.nickname} menebak dengan benar!`,
          team: player.team ?? undefined,
          at: now
        },
        audience
      );
      this.emitToPlayer(player, 'guess:result', { status: 'correct', score: player.score, gained });
      this.emitState(room);

      const eligible = this.eligibleGuessers(room);
      if (eligible.length > 0 && eligible.every((candidate) => candidate.guessed)) {
        this.endTurn(room, 'all_guessed');
      }
      return { status: 'correct', score: player.score, gained };
    }

    if (isCloseGuess(textRaw, room.word)) {
      this.emitGuessChat(room, player, textRaw, now);
      this.emitToPlayer(player, 'guess:result', { status: 'close' });
      return { status: 'close' };
    }

    this.emitGuessChat(room, player, textRaw, now);
    this.emitToPlayer(player, 'guess:result', { status: 'wrong' });
    return { status: 'wrong' };
  }

  sendChat(playerId: string, textRaw: string): void {
    const room = this.requireRoom(playerId);
    const player = this.requirePlayer(room, playerId);
    this.checkRateLimit(playerId);
    const text = textRaw.trim();
    if (!text) {
      throw new GameError('empty_message', 'Pesan tidak boleh kosong.');
    }
    if (containsProfanity(text)) {
      throw new GameError('bad_words', 'Pesan ini tidak bisa dikirim.');
    }
    if (room.phase === 'drawing' && room.word) {
      const normalizedText = normalizeGuess(text);
      const normalizedWord = normalizeGuess(room.word);
      if (normalizedWord.length > 0 && normalizedText.includes(normalizedWord)) {
        throw new GameError('secret_word', 'Kata rahasia tidak boleh ditulis.');
      }
      if (room.settings.mode === 'team' && player.team !== room.drawingTeam) {
        throw new GameError('watching', 'Kamu sedang menonton giliran tim lain.');
      }

    }

    const message: ChatMessage = {
      id: chatId(),
      kind: 'chat',
      nickname: player.nickname,
      text,
      team: player.team ?? undefined,
      at: Date.now()
    };
    this.emitChat(room, message, this.chatAudience(room, player));
  }

  addOps(playerId: string, ops: DrawableOp[]): void {
    const room = this.requireRoom(playerId);
    const player = this.requirePlayer(room, playerId);
    if (room.phase !== 'drawing') {
      throw new GameError('wrong_phase', 'Gambar hanya bisa dikirim saat fase menggambar.');
    }
    if (room.currentDrawerId !== playerId) {
      throw new GameError('not_drawer', 'Hanya penggambar yang boleh mengirim gambar.');
    }
    if (ops.length === 0) {
      return;
    }
    const bytes = JSON.stringify(ops).length;
    if (room.ops.length + ops.length > 5000 || room.opBytes + bytes > 5 * 1024 * 1024) {
      throw new GameError('op_limit', 'Batas gambar untuk giliran ini tercapai.');
    }
    room.redoStack = [];
    room.ops.push(...ops);
    room.opBytes += bytes;

    const target = player.socketId ? this.io.to(room.code).except(player.socketId) : this.io.to(room.code);
    target.emit('draw:ops', { ops });
  }

  undo(playerId: string): void {
    const room = this.requireDrawingDrawer(playerId);
    const op = room.ops.pop();
    if (!op) {
      throw new GameError('nothing_to_undo', 'Belum ada yang bisa dibatalkan.');
    }
    room.redoStack.push(op);
    this.recalculateOps(room);
    this.emitFullOps(room);
  }

  redo(playerId: string): void {
    const room = this.requireDrawingDrawer(playerId);
    const op = room.redoStack.pop();
    if (!op) {
      throw new GameError('nothing_to_redo', 'Belum ada yang bisa diulang.');
    }
    room.ops.push(op);
    room.opBytes += JSON.stringify(op).length;
    this.emitFullOps(room);
  }

  clearCanvas(playerId: string): void {
    const room = this.requireDrawingDrawer(playerId);
    const op: DrawableOp = { id: randomUUID(), t: 'clear' };
    room.ops.push(op);
    room.opBytes += JSON.stringify(op).length;
    room.redoStack = [];
    this.emitFullOps(room);
  }

  private createRoomObject(code: string, settings: RoomSettings): Room {
    return {
      code,
      settings,
      players: new Map(),
      hostId: '',
      phase: 'lobby',
      round: 1,
      turnNumber: 0,
      turnTotal: 0,
      turnQueue: [],
      turnIndex: 0,
      currentDrawerId: null,
      drawingTeam: null,
      word: null,
      wordChoices: null,
      usedWords: new Set(),
      revealOrder: [],
      revealedCount: 0,
      turnStartedAt: null,
      phaseEndsAt: 0,
      ops: [],
      opBytes: 0,
      redoStack: [],
      correctOrder: [],
      turnSummary: null,
      gameId: null,
      timers: new Set(),
      disconnectTimers: new Map(),
      drawerSkipTimers: new Map(),
      chat: [],
      createdAt: Date.now(),
      cleanupTimer: null
    };
  }

  private mergeSettings(input: Partial<RoomSettings>): RoomSettings {
    const mode = input.mode === 'team' ? 'team' : 'classic';
    const category: Category = (input.category ?? DEFAULT_SETTINGS.category) as Category;
    const rounds = Math.min(LIMITS.maxRounds, Math.max(LIMITS.minRounds, Math.round(input.rounds ?? 3)));
    const drawSeconds = [60, 80, 100, 120].includes(input.drawSeconds ?? 80)
      ? (input.drawSeconds ?? 80)
      : 80;
    const maxPlayers = Math.min(
      LIMITS.maxMaxPlayers,
      Math.max(LIMITS.minMaxPlayers, Math.round(input.maxPlayers ?? 12))
    );
    const customWords = input.customWords
      ? normalizeCustomWords(input.customWords).words
      : undefined;
    const settings: RoomSettings = { mode, category, rounds, drawSeconds, maxPlayers };
    if (customWords && customWords.length > 0) {
      settings.customWords = customWords;
    }
    return settings;
  }

  private buildQueue(room: Room): void {
    const connected = [...room.players.values()].filter((player) => player.connected);
    if (room.settings.mode === 'team') {
      room.turnQueue = buildTeamQueue(connected, shuffleArray);
    } else {
      room.turnQueue = shuffleArray(connected.map((player) => player.id));
    }
    room.turnIndex = 0;
    room.turnTotal = room.turnQueue.length;
  }

  private pickWordChoices(room: Room): string[] {
    const customWords = room.settings.customWords ?? [];
    if (customWords.length > 0) {
      return pickCustomWords(customWords, room.usedWords, 3);
    }
    return wordBank.pick(room.settings.category, room.usedWords, 3);
  }

  private startTurn(room: Room): void {
    this.clearAllTimers(room);
    if (room.phase === 'game_end') {
      return;
    }

    while (true) {
      if (room.turnIndex >= room.turnQueue.length) {
        room.round += 1;
        if (room.round > room.settings.rounds) {
          void this.endGame(room);
          return;
        }
        this.buildQueue(room);
        if (room.turnQueue.length === 0) {
          void this.endGame(room);
          return;
        }
      }
      const candidateId = room.turnQueue[room.turnIndex];
      const candidate = candidateId ? room.players.get(candidateId) : undefined;
      if (!candidate || !candidate.connected) {
        room.turnIndex += 1;
        continue;
      }
      break;
    }

    const drawerId = room.turnQueue[room.turnIndex];
    const drawer = drawerId ? room.players.get(drawerId) : undefined;
    if (!drawer) {
      void this.endGame(room);
      return;
    }

    room.phase = 'choosing_word';
    room.currentDrawerId = drawer.id;
    room.drawingTeam = room.settings.mode === 'team' ? drawer.team : null;
    room.word = null;
    room.wordChoices = this.pickWordChoices(room);
    room.revealOrder = [];
    room.revealedCount = 0;
    room.turnStartedAt = null;
    room.phaseEndsAt = Date.now() + this.timing.choosingMs;
    room.ops = [];
    room.opBytes = 0;
    room.redoStack = [];
    room.correctOrder = [];
    room.turnSummary = null;
    room.turnNumber = room.turnIndex + 1;
    room.turnTotal = room.turnQueue.length;
    for (const player of room.players.values()) {
      player.guessed = false;
      player.gainedThisTurn = 0;
    }

    if (room.wordChoices.length === 0) {
      void this.endGame(room);
      return;
    }

    this.emitFullOps(room);
    this.emitState(room);
    if (drawer.socketId) {
      this.io.to(drawer.socketId).emit('turn:word_options', {
        words: room.wordChoices,
        phaseEndsAt: room.phaseEndsAt
      });
    }

    this.schedule(room, this.timing.choosingMs, () => {
      if (room.phase !== 'choosing_word' || room.currentDrawerId !== drawer.id) {
        return;
      }
      const choices = room.wordChoices ?? [];
      const word = choices[Math.floor(Math.random() * choices.length)] ?? choices[0];
      if (word) {
        room.word = word;
        room.usedWords.add(word);
        room.wordChoices = null;
        this.startDrawing(room);
      } else {
        this.nextTurn(room);
      }
    });
  }

  private startDrawing(room: Room): void {
    if (!room.word) {
      this.nextTurn(room);
      return;
    }
    room.phase = 'drawing';
    room.turnStartedAt = Date.now();
    room.phaseEndsAt = room.turnStartedAt + room.settings.drawSeconds * 1000;
    room.revealOrder = pickRevealOrder(room.word);
    room.revealedCount = 0;
    room.ops = [];
    room.opBytes = 0;
    room.redoStack = [];
    this.emitFullOps(room);

    const drawer = room.currentDrawerId ? room.players.get(room.currentDrawerId) : undefined;
    if (drawer) {
      this.emitToPlayer(drawer, 'turn:word', { word: room.word });
      this.pushChat(room, {
        id: chatId(),
        kind: 'info',
        text: `${drawer.nickname} sedang menggambar.`,
        at: Date.now()
      });
    }

    this.emitState(room);

    const duration = room.settings.drawSeconds * 1000;
    this.schedule(room, Math.floor(duration * 0.5), () => this.updateHint(room, 1));
    this.schedule(room, Math.floor(duration * 0.75), () => this.updateHint(room, 2));
    this.schedule(room, duration, () => {
      if (room.phase === 'drawing') {
        this.endTurn(room, 'time_up');
      }
    });
  }

  private updateHint(room: Room, stage: 1 | 2): void {
    if (room.phase !== 'drawing' || !room.word) {
      return;
    }
    if (room.revealedCount >= stage) {
      return;
    }
    room.revealedCount = stage;
    const count = revealCount(room.word, stage);
    const hint = buildHintTokens(room.word, revealedSet(room.revealOrder, count));
    this.io.to(room.code).emit('hint:update', { hint });
    this.emitState(room);
  }

  private endTurn(room: Room, reason: TurnSummary['reason']): void {
    if (room.phase !== 'drawing' && room.phase !== 'choosing_word') {
      return;
    }
    if (!room.word) {
      this.nextTurn(room);
      return;
    }
    this.clearAllTimers(room);

    const results: TurnResult[] = [...room.players.values()]
      .filter((player) => player.gainedThisTurn > 0)
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        gained: player.gainedThisTurn,
        score: player.score
      }))
      .sort((a, b) => b.gained - a.gained);

    room.phase = 'turn_end';
    room.phaseEndsAt = Date.now() + this.timing.turnEndMs;
    room.turnSummary = { word: room.word, reason, results };

    const text =
      reason === 'all_guessed'
        ? `Semua sudah menebak! Katanya: ${room.word}`
        : reason === 'drawer_left'
          ? `Penggambar keluar. Katanya: ${room.word}`
          : `Waktu habis. Katanya: ${room.word}`;

    this.pushChat(room, { id: chatId(), kind: 'info', text, at: Date.now() });
    this.emitState(room);
    this.persistTurn(room);

    this.schedule(room, this.timing.turnEndMs, () => this.nextTurn(room));
  }

  private nextTurn(room: Room): void {
    this.clearAllTimers(room);
    if (room.phase === 'game_end') {
      return;
    }
    room.word = null;
    room.wordChoices = null;
    room.turnSummary = null;
    room.turnIndex += 1;
    this.startTurn(room);
  }

  private async endGame(room: Room): Promise<void> {
    if (room.phase === 'game_end') {
      return;
    }
    this.clearAllTimers(room);
    room.phase = 'game_end';
    room.phaseEndsAt = 0;
    room.currentDrawerId = null;
    room.drawingTeam = null;
    room.word = null;
    room.wordChoices = null;
    room.turnSummary = null;

    const players = [...room.players.values()];
    const sorted = [...players].sort(
      (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname)
    );
    const ranking: RankingEntry[] = sorted.map((player, index) => ({
      playerId: player.id,
      nickname: player.nickname,
      score: player.score,
      rank: index + 1,
      team: player.team
    }));

    let teamScores: TeamScores | undefined;
    let winnerTeam: Team | null = null;
    if (room.settings.mode === 'team') {
      teamScores = this.computeTeamScores(room);
      if (teamScores.A > teamScores.B) {
        winnerTeam = 'A';
      } else if (teamScores.B > teamScores.A) {
        winnerTeam = 'B';
      }
    }

    const payload: GameEndPayload = { ranking, teamScores, winnerTeam };
    this.pushChat(room, {
      id: chatId(),
      kind: 'info',
      text: 'Game selesai!',
      at: Date.now()
    });
    this.emitState(room);
    this.io.to(room.code).emit('game:end', payload);

    const gameId = room.gameId;
    if (gameId) {
      void (async () => {
        await finishGame({
          gameId,
          endedAt: new Date(),
          winnerTeam,
          scoreTeamA: teamScores?.A ?? null,
          scoreTeamB: teamScores?.B ?? null
        });
        await saveGamePlayers(
          sorted.map((player, index) => ({
            gameId,
            nickname: player.nickname,
            team: player.team,
            score: player.score,
            rankPos: index + 1
          }))
        );
      })();
    }
  }

  private persistTurn(room: Room): void {
    if (!room.gameId || !room.word || !room.turnStartedAt) {
      return;
    }
    const drawer = room.currentDrawerId ? room.players.get(room.currentDrawerId) : undefined;
    if (!drawer) {
      return;
    }
    const word = room.word;
    void saveTurn({
      gameId: room.gameId,
      round: room.round,
      drawerNickname: drawer.nickname,
      word,
      drawingTeam: room.drawingTeam,
      correctGuessers: room.correctOrder.length,
      startedAt: new Date(room.turnStartedAt),
      endedAt: new Date()
    });
  }

  private removePlayer(room: Room, playerId: string, reason: 'left' | 'timeout'): void {
    const player = room.players.get(playerId);
    if (!player) {
      return;
    }
    this.clearPlayerTimers(room, playerId);
    this.rateLimits.delete(playerId);
    this.playerRoom.delete(playerId);
    if (player.socketId) {
      this.socketPlayer.delete(player.socketId);
      this.socket(player.socketId)?.leave(room.code);
    }
    room.players.delete(playerId);

    const wasDrawer = room.currentDrawerId === playerId;
    if (wasDrawer) {
      if (room.phase === 'drawing') {
        this.endTurn(room, 'drawer_left');
      } else if (room.phase === 'choosing_word') {
        this.nextTurn(room);
      }
    }

    if (room.hostId === playerId) {
      const nextHost = [...room.players.values()]
        .filter((candidate) => candidate.connected)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = nextHost?.id ?? '';
    }

    this.pushChat(room, {
      id: chatId(),
      kind: 'info',
      text:
        reason === 'timeout'
          ? `${player.nickname} keluar karena koneksi terputus.`
          : `${player.nickname} keluar.`,
      at: Date.now()
    });

    if (room.players.size === 0) {
      this.resetEmptyRoom(room);
    } else {
      this.emitState(room);
    }
  }

  private resetEmptyRoom(room: Room): void {
    this.clearAllTimers(room);
    const gameId = room.gameId;
    if (gameId && room.phase !== 'game_end') {
      const players = [...room.players.values()];
      void finishGame({
        gameId,
        endedAt: new Date(),
        winnerTeam: null,
        scoreTeamA: room.settings.mode === 'team' ? this.computeTeamScores(room).A : null,
        scoreTeamB: room.settings.mode === 'team' ? this.computeTeamScores(room).B : null
      });
      if (players.length > 0) {
        void saveGamePlayers(
          players.map((player, index) => ({
            gameId,
            nickname: player.nickname,
            team: player.team,
            score: player.score,
            rankPos: index + 1
          }))
        );
      }
    }
    room.phase = 'lobby';
    room.gameId = null;
    room.round = 1;
    room.turnNumber = 0;
    room.turnTotal = 0;
    room.turnQueue = [];
    room.turnIndex = 0;
    room.currentDrawerId = null;
    room.drawingTeam = null;
    room.word = null;
    room.wordChoices = null;
    room.usedWords.clear();
    room.revealOrder = [];
    room.revealedCount = 0;
    room.ops = [];
    room.opBytes = 0;
    room.redoStack = [];
    room.correctOrder = [];
    room.turnSummary = null;
    room.phaseEndsAt = 0;
    room.turnStartedAt = null;
    room.chat = [];

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
    }
    room.cleanupTimer = setTimeout(() => {
      this.rooms.delete(room.code);
    }, LIMITS.emptyRoomTtlMs);
  }

  private sendPrivateState(player: Player, room: Room): void {
    if (!player.socketId) {
      return;
    }
    this.io.to(player.socketId).emit('draw:full', { ops: room.ops });
    if (room.currentDrawerId === player.id) {
      if (room.phase === 'drawing' && room.word) {
        this.io.to(player.socketId).emit('turn:word', { word: room.word });
      }
      if (room.phase === 'choosing_word' && room.wordChoices) {
        this.io.to(player.socketId).emit('turn:word_options', {
          words: room.wordChoices,
          phaseEndsAt: room.phaseEndsAt
        });
      }
    }
  }

  private sendChatHistory(socketId: string, room: Room, player: Player): void {
    for (const entry of room.chat.slice(-60)) {
      if (entry.audience === 'all' || entry.audience === player.team) {
        this.io.to(socketId).emit('chat:message', entry.message);
      }
    }
  }

  private emitState(room: Room): void {
    this.io.to(room.code).emit('room:state', this.publicState(room));
  }

  publicState(room: Room): PublicRoomState {
    const now = Date.now();
    const players: PublicPlayer[] = [...room.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        team: player.team,
        score: player.score,
        connected: player.connected,
        isHost: player.id === room.hostId,
        guessed: player.guessed,
        drawing: player.id === room.currentDrawerId
      }));

    let hint: string[] = [];
    if (room.phase === 'drawing' && room.word) {
      const count = revealCount(room.word, room.revealedCount);
      hint = buildHintTokens(room.word, revealedSet(room.revealOrder, count));
    } else if (room.phase === 'turn_end' && room.word) {
      hint = buildHintTokens(room.word, new Set(room.revealOrder));
    }

    return {
      code: room.code,
      phase: room.phase,
      round: room.round,
      totalRounds: room.settings.rounds,
      turnNumber: room.turnNumber,
      turnTotal: room.turnTotal,
      players,
      settings: room.settings,
      hostId: room.hostId,
      currentDrawerId: room.currentDrawerId,
      wordLength: room.word ? wordLength(room.word) : 0,
      hint,
      phaseEndsAt: room.phaseEndsAt,
      turnStartedAt: room.turnStartedAt,
      teamScores: room.settings.mode === 'team' ? this.computeTeamScores(room) : null,
      drawingTeam: room.drawingTeam,
      revealedWord: room.phase === 'turn_end' ? (room.word ?? undefined) : undefined,
      turnSummary: room.phase === 'turn_end' ? (room.turnSummary ?? undefined) : undefined,
      serverNow: now
    };
  }

  private computeTeamScores(room: Room): TeamScores {
    const scores: TeamScores = { A: 0, B: 0 };
    for (const player of room.players.values()) {
      if (player.team === 'A') {
        scores.A += player.score;
      } else if (player.team === 'B') {
        scores.B += player.score;
      }
    }
    return scores;
  }

  private eligibleGuessers(room: Room): Player[] {
    return [...room.players.values()].filter((player) => {
      if (!player.connected || player.id === room.currentDrawerId) {
        return false;
      }
      if (room.settings.mode === 'team' && player.team !== room.drawingTeam) {
        return false;
      }
      return true;
    });
  }

  private requireRoom(playerId: string): Room {
    const room = this.getRoomForPlayer(playerId);
    if (!room) {
      throw new GameError('room_not_found', 'Room tidak ditemukan.');
    }
    return room;
  }

  private requirePlayer(room: Room, playerId: string): Player {
    const player = room.players.get(playerId);
    if (!player) {
      throw new GameError('player_not_found', 'Pemain tidak ditemukan.');
    }
    return player;
  }

  private requireDrawingDrawer(playerId: string): Room {
    const room = this.requireRoom(playerId);
    this.requirePlayer(room, playerId);
    if (room.phase !== 'drawing') {
      throw new GameError('wrong_phase', 'Aksi ini hanya bisa saat fase menggambar.');
    }
    if (room.currentDrawerId !== playerId) {
      throw new GameError('not_drawer', 'Hanya penggambar yang bisa melakukan ini.');
    }
    return room;
  }

  private checkRateLimit(playerId: string): void {
    const now = Date.now();
    const last = this.rateLimits.get(playerId) ?? 0;
    if (now - last < LIMITS.chatRateLimitMs) {
      throw new GameError('rate_limited', 'Terlalu cepat. Coba lagi sebentar.');
    }
    this.rateLimits.set(playerId, now);
  }

  private clearPlayerTimers(room: Room, playerId: string): void {
    const removal = room.disconnectTimers.get(playerId);
    if (removal) {
      clearTimeout(removal);
      room.disconnectTimers.delete(playerId);
    }
    const skip = room.drawerSkipTimers.get(playerId);
    if (skip) {
      clearTimeout(skip);
      room.drawerSkipTimers.delete(playerId);
    }
  }

  private clearAllTimers(room: Room): void {
    for (const timer of room.timers) {
      clearTimeout(timer);
    }
    room.timers.clear();
  }

  private schedule(room: Room, ms: number, callback: () => void): void {
    const timer = setTimeout(() => {
      room.timers.delete(timer);
      callback();
    }, ms);
    room.timers.add(timer);
  }

  private recalculateOps(room: Room): void {
    room.opBytes = room.ops.reduce((total, op) => total + JSON.stringify(op).length, 0);
  }

  private emitFullOps(room: Room): void {
    this.io.to(room.code).emit('draw:full', { ops: room.ops });
  }

  private emitToPlayer(
    player: Player,
    event: 'turn:word' | 'turn:word_options' | 'guess:result',
    payload: unknown
  ): void {
    if (!player.socketId) {
      return;
    }
    switch (event) {
      case 'turn:word':
        this.io.to(player.socketId).emit('turn:word', payload as { word: string });
        break;
      case 'turn:word_options':
        this.io
          .to(player.socketId)
          .emit('turn:word_options', payload as { words: string[]; phaseEndsAt: number });
        break;
      case 'guess:result':
        this.io
          .to(player.socketId)
          .emit('guess:result', payload as { status: 'correct' | 'close' | 'wrong'; score?: number; gained?: number });
        break;
      default:
        break;
    }
  }

  private emitChat(room: Room, message: ChatMessage, audience: Team | 'all'): void {
    room.chat.push({ message, audience });
    if (room.chat.length > 120) {
      room.chat.splice(0, room.chat.length - 120);
    }
    if (audience === 'all') {
      this.io.to(room.code).emit('chat:message', message);
      return;
    }
    for (const player of room.players.values()) {
      if (player.team === audience && player.socketId) {
        this.io.to(player.socketId).emit('chat:message', message);
      }
    }
  }

  private chatAudience(room: Room, player: Player): Team | 'all' {
    return room.settings.mode === 'team' && room.phase !== 'lobby' && room.phase !== 'game_end'
      ? (player.team ?? 'all')
      : 'all';
  }

  private emitGuessChat(room: Room, player: Player, text: string, at: number): void {
    this.emitChat(
      room,
      {
        id: chatId(),
        kind: 'chat',
        nickname: player.nickname,
        text: text.trim(),
        team: player.team ?? undefined,
        at
      },
      this.chatAudience(room, player)
    );
  }

  private pushChat(room: Room, message: ChatMessage): void {
    this.emitChat(room, message, 'all');
  }

  private socket(socketId: string): GameSocket | undefined {
    return this.io.sockets.sockets.get(socketId);
  }

  shutdown(): void {
    for (const room of this.rooms.values()) {
      this.clearAllTimers(room);
      for (const timer of room.disconnectTimers.values()) {
        clearTimeout(timer);
      }
      for (const timer of room.drawerSkipTimers.values()) {
        clearTimeout(timer);
      }
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
      }
    }
    this.rooms.clear();
  }
}
