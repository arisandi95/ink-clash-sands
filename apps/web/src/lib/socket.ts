import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomJoinedPayload, ServerToClientEvents } from '@inkclash/shared';
import { canvasBus } from './canvas/bus';
import { useAppStore } from './store';
import { sound } from './sound';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 700,
  reconnectionDelayMax: 4000
});

let initialized = false;

export function initSocket(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  const store = useAppStore.getState();
  sound.setEnabled(store.soundOn);
  useAppStore.subscribe((state, previous) => {
    if (state.soundOn !== previous.soundOn) {
      sound.setEnabled(state.soundOn);
    }
  });

  const syncTime = () => {
    socket.emit('time:sync', (response) => {
      useAppStore.getState().setServerOffset(response.serverNow - Date.now());
    });
  };

  socket.on('connect', () => {
    useAppStore.getState().setConnected(true);
    syncTime();
    const state = useAppStore.getState();
    if (state.roomCode && state.nickname) {
      emitWithAck<RoomJoinedPayload>('room:join', {
        code: state.roomCode,
        nickname: state.nickname,
        playerToken: state.token
      }).then((result) => {
        if (result.ok) {
          useAppStore.getState().setIdentity(result.playerId, result.code);
        } else if (result.code === 'room_not_found') {
          useAppStore.getState().setRoomLost(true);
        } else if (result.code !== 'session_replaced') {
          useAppStore.getState().pushToast(result.message, 'error');
        }
      });
    }
  });

  socket.on('disconnect', () => {
    useAppStore.getState().setConnected(false);
  });

  socket.on('room:state', (nextRoom) => {
    const previous = useAppStore.getState().room;
    useAppStore.getState().setRoom(nextRoom);
    if (nextRoom.phase === 'drawing' && previous?.phase === 'choosing_word') {
      sound.play('turn');
    }
    if (nextRoom.phase === 'game_end' && previous?.phase !== 'game_end') {
      sound.play('fanfare');
    }
  });

  socket.on('turn:word_options', (payload) => {
    useAppStore.getState().setWordOptions(payload);
  });

  socket.on('turn:word', (payload) => {
    useAppStore.getState().setMyWord(payload.word);
  });

  socket.on('hint:update', (payload) => {
    const room = useAppStore.getState().room;
    if (room) {
      useAppStore.getState().setRoom({ ...room, hint: payload.hint });
    }
  });

  socket.on('chat:message', (message) => {
    useAppStore.getState().addChat(message);
    if (message.kind === 'correct') {
      sound.play('correct');
    }
  });

  socket.on('guess:result', (payload) => {
    const state = useAppStore.getState();
    if (payload.status === 'close') {
      state.setGuessStatus('close');
      state.pushToast('Hampir benar!', 'info');
    } else if (payload.status === 'wrong') {
      state.setGuessStatus('wrong');
    } else {
      state.setGuessStatus(null);
    }
  });

  socket.on('draw:ops', (payload) => {
    canvasBus.emitOps(payload.ops);
  });

  socket.on('draw:full', (payload) => {
    canvasBus.emitFull(payload.ops);
  });

  socket.on('game:end', (payload) => {
    useAppStore.getState().setGameEnd(payload);
  });

  socket.on('error', (payload) => {
    useAppStore.getState().pushToast(payload.message, 'error');
  });

  socket.on('room:closed', (payload) => {
    useAppStore.getState().setRoomLost(true);
    useAppStore.getState().pushToast(payload.reason, 'error');
  });

  setInterval(syncTime, 30_000);
}

export type AckResult<T> = (T & { ok: true }) | { ok: false; code: string; message: string };

export function emitWithAck<T = object>(
  event: string,
  payload?: unknown,
  timeoutMs = 6000
): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, code: 'timeout', message: 'Server tidak merespons. Coba lagi.' });
      }
    }, timeoutMs);

    const callback = (result: AckResult<T>) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const emit = socket.emit.bind(socket) as (eventName: string, ...args: unknown[]) => void;
    if (payload === undefined) {
      emit(event, callback);
    } else {
      emit(event, payload, callback);
    }
  });
}
