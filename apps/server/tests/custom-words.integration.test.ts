import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PublicRoomState } from '@inkclash/shared';
import { wordBank } from '../src/game/words.js';
import {
  closeClient,
  connectClient,
  latestEvent,
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

const CUSTOM_WORDS = ['apel', 'jeruk', 'pisang', 'mangga'];

describe('custom word rooms', () => {
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

  async function createPlayer(
    nickname: string,
    settings?: Record<string, unknown>
  ): Promise<{ player: PlayerClient; response: any }> {
    const client = await connect();
    const token = randomUUID();
    const response = await request(client, 'room:create', {
      nickname,
      playerToken: token,
      settings
    });
    return { player: { client, playerId: response.playerId, token, nickname }, response };
  }

  async function joinPlayer(code: string, nickname: string): Promise<PlayerClient> {
    const client = await connect();
    const token = randomUUID();
    const ack = await request(client, 'room:join', { code, nickname, playerToken: token });
    expect(ack.ok).toBe(true);
    return { client, playerId: ack.playerId, token, nickname };
  }

  function stateOf(client: TestClient): PublicRoomState | undefined {
    return latestEvent<PublicRoomState>(client, 'room:state');
  }

  async function waitForState(
    players: PlayerClient[],
    predicate: (state: PublicRoomState) => boolean,
    timeout = 8000
  ): Promise<PublicRoomState> {
    return waitFor(() => {
      for (const player of players) {
        const state = stateOf(player.client);
        if (state && predicate(state)) {
          return state;
        }
      }
      return undefined;
    }, timeout);
  }

  async function findDrawer(players: PlayerClient[]): Promise<PlayerClient> {
    const choosing = await waitForState(players, (state) => state.phase === 'choosing_word');
    const drawer = players.find((player) => player.playerId === choosing.currentDrawerId);
    expect(drawer).toBeDefined();
    return drawer as PlayerClient;
  }

  it('offers only room custom words and excludes words already used', async () => {
    const { player: host, response } = await createPlayer('Host', {
      rounds: 1,
      drawSeconds: 60,
      customWords: [' Apel ', 'JERUK', 'pisang', 'mangga', 'apel']
    });
    expect(response.ok).toBe(true);
    const code = (await waitFor(() => stateOf(host.client)?.code)) as string;
    const guest = await joinPlayer(code, 'Budi');
    const players = [host, guest];

    const lobby = await waitFor(() => {
      const current = stateOf(host.client);
      return current && current.players.length === 2 ? current : undefined;
    });
    expect(lobby.settings.customWords).toEqual(CUSTOM_WORDS);

    const start = await request(host.client, 'game:start');
    expect(start.ok).toBe(true);

    const drawer = await findDrawer(players);
    const guesser = players.find((player) => player.playerId !== drawer.playerId) as PlayerClient;
    const options = await waitForEvent<{ words: string[] }>(drawer.client, 'turn:word_options');
    expect(options.words).toHaveLength(3);
    for (const word of options.words) {
      expect(CUSTOM_WORDS).toContain(word);
    }

    const choose = await request(drawer.client, 'word:choose', { index: 0 });
    expect(choose.ok).toBe(true);
    const word = (await waitForEvent<{ word: string }>(drawer.client, 'turn:word')).word;
    expect(CUSTOM_WORDS).toContain(word);

    expect(drawer.client.received.some((entry) => entry.event === 'turn:word_options')).toBe(true);
    expect(guesser.client.received.some((entry) => entry.event === 'turn:word_options')).toBe(false);

    const guess = await request(guesser.client, 'guess:submit', { text: word });
    expect(guess.ok).toBe(true);
    expect(guess.status).toBe('correct');
    await waitFor(() => (stateOf(host.client)?.phase === 'turn_end' ? true : undefined));

    const secondChoosing = await waitForState(players, (state) => state.phase === 'choosing_word');
    const secondDrawer = players.find(
      (player) => player.playerId === secondChoosing.currentDrawerId
    ) as PlayerClient;
    const secondOptions = await waitForEvent<{ words: string[] }>(
      secondDrawer.client,
      'turn:word_options'
    );
    expect(secondOptions.words).not.toContain(word);
    expect(secondOptions.words.length).toBeGreaterThan(0);
    for (const option of secondOptions.words) {
      expect(CUSTOM_WORDS).toContain(option);
    }
  });

  it('falls back to the default category bank when the custom list is empty', async () => {
    const { player: host } = await createPlayer('Host', {
      rounds: 1,
      drawSeconds: 60,
      category: 'hewan',
      customWords: []
    });
    const code = (await waitFor(() => stateOf(host.client)?.code)) as string;
    const guest = await joinPlayer(code, 'Budi');
    const players = [host, guest];

    const lobby = await waitFor(() => {
      const current = stateOf(host.client);
      return current && current.players.length === 2 ? current : undefined;
    });
    expect(lobby.settings.customWords).toBeUndefined();

    expect((await request(host.client, 'game:start')).ok).toBe(true);
    const drawer = await findDrawer(players);
    const options = await waitForEvent<{ words: string[] }>(drawer.client, 'turn:word_options');
    expect(options.words).toHaveLength(3);
    for (const word of options.words) {
      expect(wordBank.has('hewan', word)).toBe(true);
    }
  });

  it('clears custom words and returns to the category bank when switched off', async () => {
    const { player: host } = await createPlayer('Host', {
      rounds: 1,
      drawSeconds: 60,
      category: 'hewan',
      customWords: ['apel', 'jeruk']
    });
    const code = (await waitFor(() => stateOf(host.client)?.code)) as string;
    const guest = await joinPlayer(code, 'Budi');
    const players = [host, guest];

    await waitFor(() => {
      const current = stateOf(host.client);
      return current && current.players.length === 2 ? current : undefined;
    });

    const off = await request(host.client, 'room:settings', { settings: { customWords: [] } });
    expect(off.ok).toBe(true);

    const lobby = await waitFor(() => {
      const current = stateOf(host.client);
      return current && current.players.length === 2 && !current.settings.customWords
        ? current
        : undefined;
    });
    expect(lobby.settings.customWords).toBeUndefined();

    expect((await request(host.client, 'game:start')).ok).toBe(true);
    const drawer = await findDrawer(players);
    const options = await waitForEvent<{ words: string[] }>(drawer.client, 'turn:word_options');
    expect(options.words).toHaveLength(3);
    for (const word of options.words) {
      expect(wordBank.has('hewan', word)).toBe(true);
    }
  });

  it('rejects invalid, too short, profane and oversized custom lists', async () => {
    const invalid = await createPlayer('Host', { customWords: ['!!'] });
    expect(invalid.response.ok).toBe(false);
    expect(invalid.response.code).toBe('invalid_custom_words');

    const profane = await createPlayer('Host', { customWords: ['anjing'] });
    expect(profane.response.ok).toBe(false);
    expect(profane.response.code).toBe('invalid_custom_words');

    const tooShort = await createPlayer('Host', { customWords: ['a'] });
    expect(tooShort.response.ok).toBe(false);
    expect(tooShort.response.code).toBe('invalid_payload');

    const tooMany = await createPlayer('Host', {
      customWords: Array.from({ length: 51 }, (_, index) => `kata${index + 1}`)
    });
    expect(tooMany.response.ok).toBe(false);
    expect(tooMany.response.code).toBe('invalid_payload');
  });

  it('only lets the host change custom words', async () => {
    const { player: host, response } = await createPlayer('Host', {
      customWords: ['apel', 'jeruk']
    });
    expect(response.ok).toBe(true);
    const code = (await waitFor(() => stateOf(host.client)?.code)) as string;
    const guest = await joinPlayer(code, 'Budi');
    await waitFor(() => {
      const current = stateOf(host.client);
      return current && current.players.length === 2 ? current : undefined;
    });

    const attempt = await request(guest.client, 'room:settings', {
      settings: { customWords: ['rahasia'] }
    });
    expect(attempt.ok).toBe(false);
    expect(attempt.code).toBe('not_host');

    const state = stateOf(host.client);
    expect(state?.settings.customWords).toEqual(['apel', 'jeruk']);
  });
});
