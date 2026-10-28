import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PublicRoomState } from '@inkclash/shared';
import {
  closeClient,
  connectClient,
  request,
  startTestServer,
  waitFor,
  waitForEvent,
  type TestClient,
  type TestServer
} from './helpers/test-server.js';

interface PlayerClient {
  client: TestClient;
  playerId: string;
  token: string;
  nickname: string;
}

describe('socket integration', () => {
  let server: TestServer;
  const clients: TestClient[] = [];

  beforeEach(async () => {
    server = await startTestServer();
  });

  afterEach(async () => {
    for (const client of clients) {
      await closeClient(client);
    }
    clients.length = 0;
    await server.close();
  });

  async function connect(): Promise<TestClient> {
    const client = await connectClient(server.url);
    clients.push(client);
    return client;
  }

  async function createPlayer(nickname: string, settings?: Record<string, unknown>): Promise<PlayerClient> {
    const client = await connect();
    const token = randomUUID();
    const ack = await request(client, 'room:create', { nickname, playerToken: token, settings });
    expect(ack.ok).toBe(true);
    return { client, playerId: ack.playerId, token, nickname };
  }

  async function joinPlayer(code: string, nickname: string): Promise<PlayerClient> {
    const client = await connect();
    const token = randomUUID();
    const ack = await request(client, 'room:join', { code, nickname, playerToken: token });
    expect(ack.ok).toBe(true);
    return { client, playerId: ack.playerId, token, nickname };
  }

  function stateOf(client: TestClient): PublicRoomState | undefined {
    const events = client.received.filter((entry) => entry.event === 'room:state');
    return events.at(-1)?.payload as PublicRoomState | undefined;
  }

  it('creates a room, joins players and keeps the secret word private', async () => {
    const host = await createPlayer('Host', { rounds: 1, drawSeconds: 60, category: 'hewan' });
    const code = (await waitFor(() => stateOf(host.client)?.code)) as string;
    const second = await joinPlayer(code, 'Budi');
    const third = await joinPlayer(code, 'Sari');

    const state = await waitFor(() => {
      const current = stateOf(host.client);
      return current && current.players.length === 3 ? current : undefined;
    });
    expect(state.hostId).toBe(host.playerId);

    const start = await request(host.client, 'game:start');
    expect(start.ok).toBe(true);

    const choosing = await waitFor(() => {
      const current = stateOf(host.client);
      return current?.phase === 'choosing_word' ? current : undefined;
    });
    expect(choosing.currentDrawerId).toBeTruthy();

    const players: PlayerClient[] = [host, second, third];
    const drawer = players.find((player) => player.playerId === choosing.currentDrawerId);
    expect(drawer).toBeDefined();
    if (!drawer) {
      return;
    }

    const options = await waitForEvent<{ words: string[] }>(drawer.client, 'turn:word_options');
    expect(options.words).toHaveLength(3);
    const choose = await request(drawer.client, 'word:choose', { index: 0 });
    expect(choose.ok).toBe(true);

    const drawing = await waitFor(() => {
      const current = stateOf(host.client);
      return current?.phase === 'drawing' ? current : undefined;
    });
    const wordEvent = await waitForEvent<{ word: string }>(drawer.client, 'turn:word');
    const word = wordEvent.word;
    expect(word.length).toBeGreaterThan(1);
    expect(drawing.hint.join('')).not.toBe(word);

    const nonDrawers = players.filter((player) => player.playerId !== drawer.playerId);
    for (const player of nonDrawers) {
      const leaked = player.client.received.some(
        (entry) =>
          entry.event !== 'game:end' &&
          JSON.stringify(entry.payload ?? {}).toLowerCase().includes(word.toLowerCase())
      );
      expect(leaked).toBe(false);
    }

    const forbiddenDraw = await request(nonDrawers[0]!.client, 'draw:ops', {
      ops: [
        {
          id: randomUUID(),
          t: 'stroke',
          layer: 0,
          color: '#161A20',
          size: 4,
          mode: 'draw',
          pts: [
            [10, 10],
            [20, 20]
          ]
        }
      ]
    });
    expect(forbiddenDraw.ok).toBe(false);
    expect(forbiddenDraw.code).toBe('not_drawer');

    for (const player of nonDrawers) {
      const guess = await request(player.client, 'guess:submit', { text: word });
      expect(guess.ok).toBe(true);
      expect(guess.status).toBe('correct');
    }

    const turnEnd = await waitFor(() => {
      const current = stateOf(host.client);
      return current?.phase === 'turn_end' ? current : undefined;
    });
    expect(turnEnd.revealedWord).toBe(word);
    expect(turnEnd.turnSummary?.word).toBe(word);
    expect(turnEnd.turnSummary?.results.length).toBeGreaterThan(0);
    expect(turnEnd.players.find((player) => player.id === drawer.playerId)?.score).toBeGreaterThan(0);
    await expect(
      waitFor(() => (stateOf(host.client)?.phase === 'choosing_word' ? true : undefined))
    ).resolves.toBe(true);
  });

  it('enforces team rules and hides guesses from the opposing team', async () => {
    const host = await createPlayer('Kapten', {
      rounds: 1,
      drawSeconds: 60,
      category: 'hewan',
      mode: 'team'
    });
    const code = (await waitFor(() => stateOf(host.client)?.code)) as string;
    const second = await joinPlayer(code, 'Budi');
    const third = await joinPlayer(code, 'Sari');
    const fourth = await joinPlayer(code, 'Tono');

    const lobby = await waitFor(() => {
      const current = stateOf(host.client);
      return current && current.players.length === 4 ? current : undefined;
    });
    expect(lobby.teamScores).toEqual({ A: 0, B: 0 });

    const start = await request(host.client, 'game:start');
    expect(start.ok).toBe(true);

    const choosing = await waitFor(() => {
      const current = stateOf(host.client);
      return current?.phase === 'choosing_word' ? current : undefined;
    });
    const players: PlayerClient[] = [host, second, third, fourth];
    const drawer = players.find((player) => player.playerId === choosing.currentDrawerId);
    expect(drawer).toBeDefined();
    if (!drawer) {
      return;
    }
    const drawerTeam = choosing.players.find((player) => player.id === drawer.playerId)?.team;
    const teammate = players.find(
      (player) =>
        player.playerId !== drawer.playerId &&
        choosing.players.find((entry) => entry.id === player.playerId)?.team === drawerTeam
    );
    const opponent = players.find(
      (player) =>
        player.playerId !== drawer.playerId &&
        choosing.players.find((entry) => entry.id === player.playerId)?.team !== drawerTeam
    );
    expect(teammate).toBeDefined();
    expect(opponent).toBeDefined();
    if (!teammate || !opponent) {
      return;
    }

    await waitForEvent(drawer.client, 'turn:word_options');
    await request(drawer.client, 'word:choose', { index: 0 });
    const word = (await waitForEvent<{ word: string }>(drawer.client, 'turn:word')).word;

    const opponentGuess = await request(opponent.client, 'guess:submit', { text: word });
    expect(opponentGuess.ok).toBe(false);
    expect(opponentGuess.code).toBe('watching');

    const wrongGuessText = 'tebakan yang sangat salah';
    const wrongGuess = await request(teammate.client, 'guess:submit', { text: wrongGuessText });
    expect(wrongGuess.ok).toBe(true);
    expect(['close', 'wrong']).toContain(wrongGuess.status);
    await waitForEvent<{ kind: string; text: string }>(
      teammate.client,
      'chat:message',
      (message) => message.kind === 'chat' && message.text === wrongGuessText
    );
    await new Promise((resolve) => setTimeout(resolve, 710));
    expect(
      opponent.client.received.some(
        (entry) =>
          entry.event === 'chat:message' &&
          (entry.payload as { text?: string }).text === wrongGuessText
      )
    ).toBe(false);

    const reconnectedOpponent = await connect();
    const reconnect = await request(reconnectedOpponent, 'room:join', {
      code,
      nickname: opponent.nickname,
      playerToken: opponent.token
    });
    expect(reconnect.ok).toBe(true);
    opponent.client = reconnectedOpponent;
    expect(
      reconnectedOpponent.received.some(
        (entry) =>
          entry.event === 'chat:message' &&
          (entry.payload as { text?: string }).text === wrongGuessText
      )
    ).toBe(false);
    const opponentChatBefore = opponent.client.received.filter(
      (entry) => entry.event === 'chat:message'
    ).length;

    const teammateGuess = await request(teammate.client, 'guess:submit', { text: word });
    expect(teammateGuess.ok).toBe(true);
    expect(teammateGuess.status).toBe('correct');

    const teamState = await waitFor(() => {
      const current = stateOf(host.client);
      return current?.phase === 'turn_end' ? current : undefined;
    });
    expect(teamState.teamScores).toBeTruthy();
    expect(teamState.teamScores?.[drawerTeam as 'A' | 'B']).toBeGreaterThan(0);

    const newMessages = opponent.client.received
      .filter((entry) => entry.event === 'chat:message')
      .slice(opponentChatBefore);
    const leakedCorrect = newMessages.some(
      (entry) => (entry.payload as { kind?: string }).kind === 'correct'
    );
    expect(leakedCorrect).toBe(false);
  });
});
