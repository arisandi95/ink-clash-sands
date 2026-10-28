import type {
  DrawableOp,
  RoomJoinedPayload,
  RoomSettings,
  Team
} from '@inkclash/shared';
import { canvasBus } from './canvas/bus';
import { navigate } from './router';
import { emitWithAck, socket } from './socket';
import { useAppStore } from './store';

function store() {
  return useAppStore.getState();
}

function enterRoom(room: RoomJoinedPayload): void {
  store().setIdentity(room.playerId, room.code, room.avatar);
  navigate(`/r/${room.code}`);
}

export async function createRoom(nickname: string, settings?: Partial<RoomSettings>, avatar?: string): Promise<boolean> {
  const trimmed = nickname.trim();
  store().setNickname(trimmed);
  if (avatar) {
    store().setAvatar(avatar);
  }
  const result = await emitWithAck<RoomJoinedPayload>('room:create', {
    nickname: trimmed,
    playerToken: store().token,
    avatar,
    settings
  });
  if (!result.ok) {
    store().pushToast(result.message, 'error');
    return false;
  }
  enterRoom(result);
  return true;
}

export async function joinRoom(code: string, nickname: string, avatar?: string): Promise<boolean> {
  const trimmed = nickname.trim();
  store().setNickname(trimmed);
  if (avatar) {
    store().setAvatar(avatar);
  }
  const result = await emitWithAck<RoomJoinedPayload>('room:join', {
    code: code.trim().toUpperCase(),
    nickname: trimmed,
    playerToken: store().token,
    avatar
  });
  if (!result.ok) {
    store().pushToast(result.message, 'error');
    return false;
  }
  enterRoom(result);
  return true;
}

export function leaveRoom(): void {
  socket.emit('room:leave');
  canvasBus.reset();
  store().resetRoom();
  store().setGameEnd(null);
  navigate('/');
}

export async function updateSettings(settings: Partial<RoomSettings>): Promise<void> {
  const result = await emitWithAck('room:settings', { settings });
  if (!result.ok) {
    store().pushToast(result.message, 'error');
  }
}

export async function switchTeam(team: Team): Promise<void> {
  const result = await emitWithAck('team:switch', { team });
  if (!result.ok) {
    store().pushToast(result.message, 'error');
  }
}

export async function shuffleTeams(): Promise<void> {
  const result = await emitWithAck('team:shuffle');
  if (!result.ok) {
    store().pushToast(result.message, 'error');
  }
}

export async function startGame(): Promise<void> {
  const result = await emitWithAck('game:start');
  if (!result.ok) {
    store().pushToast(result.message, 'error');
  }
}

export async function chooseWord(index: number): Promise<void> {
  const result = await emitWithAck('word:choose', { index });
  if (!result.ok) {
    store().pushToast(result.message, 'error');
  }
}

export async function submitGuess(text: string): Promise<void> {
  const result = await emitWithAck<{ status: 'correct' | 'close' | 'wrong'; score?: number; gained?: number }>(
    'guess:submit',
    { text }
  );
  if (!result.ok) {
    if (result.code !== 'rate_limited') {
      store().pushToast(result.message, 'error');
    }
    return;
  }
  if (result.status === 'close') {
    store().pushToast('Hampir benar!', 'info');
  } else if (result.status === 'wrong') {
    store().setGuessStatus('wrong');
  } else {
    store().setGuessStatus(null);
  }
}

export async function sendChat(text: string): Promise<void> {
  const result = await emitWithAck('chat:send', { text });
  if (!result.ok) {
    store().pushToast(result.message, 'error');
  }
}

export function sendDrawOps(ops: DrawableOp[]): void {
  void emitWithAck('draw:ops', { ops }).then((result) => {
    if (!result.ok && result.code !== 'rate_limited') {
      store().pushToast(result.message, 'error');
    }
  });
}

export async function undoDraw(): Promise<void> {
  const result = await emitWithAck('draw:undo');
  if (!result.ok && result.code !== 'nothing_to_undo') {
    store().pushToast(result.message, 'error');
  }
}

export async function redoDraw(): Promise<void> {
  const result = await emitWithAck('draw:redo');
  if (!result.ok && result.code !== 'nothing_to_redo') {
    store().pushToast(result.message, 'error');
  }
}

export async function clearCanvas(): Promise<void> {
  const result = await emitWithAck('draw:clear');
  if (!result.ok) {
    store().pushToast(result.message, 'error');
  }
}
