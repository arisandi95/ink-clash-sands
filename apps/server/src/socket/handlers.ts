import { ZodError } from 'zod';
import {
  chatSendSchema,
  drawOpsSchema,
  guessSubmitSchema,
  roomCreateSchema,
  roomJoinSchema,
  roomSettingsSchema,
  teamSwitchSchema,
  wordChooseSchema,
  type Ack
} from '@inkclash/shared';
import { GameError } from '../game/room.js';
import type { GameEngine } from '../game/engine.js';
import type { GameSocket, IO } from './types.js';

function errorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Payload tidak valid.';
  }
  if (error instanceof GameError) {
    return error.message;
  }
  console.error('[socket] unexpected error', error);
  return 'Terjadi kesalahan di server.';
}

function errorCode(error: unknown): string {
  if (error instanceof GameError) {
    return error.code;
  }
  if (error instanceof ZodError) {
    return 'invalid_payload';
  }
  return 'internal_error';
}

function respondError<T>(ack: Ack<T> | undefined, error: unknown): void {
  if (ack) {
    ack({ ok: false, code: errorCode(error), message: errorMessage(error) });
  }
}

function playerIdFor(socket: GameSocket): string {
  const id = socket.data.playerId;
  if (!id) {
    throw new GameError('not_joined', 'Kamu belum bergabung ke room mana pun.');
  }
  return id;
}

export function registerSocketHandlers(io: IO, engine: GameEngine): void {
  io.on('connection', (socket) => {
    socket.on('time:sync', (ack) => {
      ack({ serverNow: Date.now() });
    });

    socket.on('room:create', (payload, ack) => {
      try {
        const data = roomCreateSchema.parse(payload);
        const result = engine.createRoom(socket.id, data.nickname, data.playerToken, data.settings, data.avatar);
        socket.data.playerId = result.playerId;
        socket.data.roomCode = result.code;
        ack({ ok: true, ...result });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('room:join', (payload, ack) => {
      try {
        const data = roomJoinSchema.parse(payload);
        const result = engine.joinRoom(socket.id, data.code, data.nickname, data.playerToken, { avatar: data.avatar });
        socket.data.playerId = result.playerId;
        socket.data.roomCode = result.code;
        ack({ ok: true, ...result });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('room:leave', () => {
      engine.leaveBySocket(socket.id);
      socket.data.playerId = undefined;
      socket.data.roomCode = undefined;
    });

    socket.on('room:settings', (payload, ack) => {
      try {
        const data = roomSettingsSchema.parse(payload);
        engine.updateSettings(playerIdFor(socket), data.settings);
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('team:switch', (payload, ack) => {
      try {
        const data = teamSwitchSchema.parse(payload);
        engine.switchTeam(playerIdFor(socket), data.team);
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('team:shuffle', (ack) => {
      try {
        engine.shuffleTeamsByHost(playerIdFor(socket));
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('game:start', (ack) => {
      void engine
        .startGame(playerIdFor(socket))
        .then(() => ack({ ok: true }))
        .catch((error: unknown) => respondError(ack, error));
    });

    socket.on('word:choose', (payload, ack) => {
      try {
        const data = wordChooseSchema.parse(payload);
        engine.chooseWord(playerIdFor(socket), data.index);
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('guess:submit', (payload, ack) => {
      try {
        const data = guessSubmitSchema.parse(payload);
        const outcome = engine.submitGuess(playerIdFor(socket), data.text);
        ack({ ok: true, ...outcome });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('chat:send', (payload, ack) => {
      try {
        const data = chatSendSchema.parse(payload);
        engine.sendChat(playerIdFor(socket), data.text);
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('draw:ops', (payload, ack) => {
      try {
        const data = drawOpsSchema.parse(payload);
        engine.addOps(playerIdFor(socket), data.ops);
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('draw:undo', (ack) => {
      try {
        engine.undo(playerIdFor(socket));
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('draw:redo', (ack) => {
      try {
        engine.redo(playerIdFor(socket));
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('draw:clear', (ack) => {
      try {
        engine.clearCanvas(playerIdFor(socket));
        ack({ ok: true });
      } catch (error) {
        respondError(ack, error);
      }
    });

    socket.on('disconnect', () => {
      engine.disconnectSocket(socket.id);
    });
  });
}
