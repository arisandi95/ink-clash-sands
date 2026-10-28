import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as createClient, type Socket } from 'socket.io-client';
import type { GameEngine } from '../../src/game/engine.js';
import { registerSocketHandlers } from '../../src/socket/handlers.js';
import type { IO } from '../../src/socket/types.js';

export interface CapturedEvent {
  event: string;
  payload: unknown;
}

export interface TestClient {
  socket: Socket;
  received: CapturedEvent[];
}

export interface TestServer {
  url: string;
  engine: GameEngine;
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestServer> {
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } }) as unknown as IO;
  const { GameEngine: Engine } = await import('../../src/game/engine.js');
  const engine = new Engine(io, {
    choosingMs: 250,
    turnEndMs: 120,
    reconnectGraceMs: 800,
    drawerSkipMs: 300
  });
  registerSocketHandlers(io, engine);
  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind test server');
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    engine,
    close: async () => {
      engine.shutdown();
      io.close();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  };
}

export async function connectClient(url: string): Promise<TestClient> {
  const socket = createClient(url, { transports: ['websocket'], forceNew: true });
  const received: CapturedEvent[] = [];
  socket.onAny((event: string, payload: unknown) => {
    received.push({ event, payload });
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), 4000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return { socket, received };
}

export function request(client: TestClient, event: string, payload?: unknown): Promise<any> {
  return new Promise((resolve) => {
    const emit = client.socket.emit.bind(client.socket) as (...args: unknown[]) => void;
    if (payload === undefined) {
      emit(event, resolve);
    } else {
      emit(event, payload, resolve);
    }
  });
}

export async function waitFor<T>(check: () => T | undefined | false, timeout = 5000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = check();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error('waitFor timeout');
}

export function latestEvent<T = any>(client: TestClient, event: string): T | undefined {
  for (let index = client.received.length - 1; index >= 0; index -= 1) {
    const entry = client.received[index];
    if (entry?.event === event) {
      return entry.payload as T;
    }
  }
  return undefined;
}

export async function waitForEvent<T = any>(
  client: TestClient,
  event: string,
  predicate: (payload: T) => boolean = () => true,
  timeout = 5000
): Promise<T> {
  return waitFor(() => {
    for (let index = client.received.length - 1; index >= 0; index -= 1) {
      const entry = client.received[index];
      if (entry?.event === event && predicate(entry.payload as T)) {
        return entry.payload as T;
      }
    }
    return undefined;
  }, timeout);
}

export async function closeClient(client: TestClient): Promise<void> {
  client.socket.removeAllListeners();
  client.socket.disconnect();
}
