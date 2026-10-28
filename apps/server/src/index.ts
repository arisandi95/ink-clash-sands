import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import { config } from './config.js';
import { closeDb, initDb, isDbAvailable } from './db/client.js';
import { fetchLeaderboard } from './db/queries.js';
import { GameEngine } from './game/engine.js';
import { wordBank } from './game/words.js';
import { printServerInfo } from './lan.js';
import { registerSocketHandlers } from './socket/handlers.js';
import type { IO } from './socket/types.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

const httpServer = createServer(app);
const io: IO = new Server(httpServer, {
  cors: config.isDevelopment ? { origin: true } : undefined,
  maxHttpBufferSize: 1_000_000
});

const engine = new GameEngine(io);
registerSocketHandlers(io, engine);

function findWebDist(): string | null {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, '../../web/dist'),
    path.resolve(moduleDir, '../../../web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), 'web/dist')
  ];
  return candidates.find((candidate) => existsSync(path.join(candidate, 'index.html'))) ?? null;
}

const webDist = findWebDist();

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    rooms: engine.getRoomCount(),
    db: isDbAvailable(),
    words: {
      total: wordBank.count('umum'),
      hewan: wordBank.count('hewan'),
      makanan: wordBank.count('makanan-indonesia'),
      film: wordBank.count('film'),
      programming: wordBank.count('programming')
    }
  });
});

app.get('/api/qr', async (req, res) => {
  const text = typeof req.query.text === 'string' ? req.query.text.slice(0, 512) : '';
  if (!text) {
    res.status(400).json({ error: 'Parameter text wajib diisi.' });
    return;
  }
  try {
    const buffer = await QRCode.toBuffer(text, { type: 'png', width: 360, margin: 1 });
    res.type('png').set('Cache-Control', 'public, max-age=3600').send(buffer);
  } catch {
    res.status(500).json({ error: 'Gagal membuat QR.' });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const rows = await fetchLeaderboard(20);
    res.json({ rows });
  } catch {
    res.json({ rows: [] });
  }
});

if (webDist) {
  app.use(express.static(webDist, { index: false, maxAge: config.isProduction ? '1h' : 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
      next();
      return;
    }
    res.sendFile(path.join(webDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res
      .type('text/plain')
      .send('InkClash server berjalan. Di mode dev, buka http://localhost:5173. Jalankan pnpm build untuk menyajikan UI dari port ini.');
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[http] error', err);
  res.status(500).json({ error: 'Terjadi kesalahan di server.' });
});

const server = httpServer.listen(config.PORT, config.HOST, async () => {
  await initDb();
  await wordBank.refreshFromDb();
  printServerInfo(config.PORT, config.HOST);
  if (!isDbAvailable()) {
    console.warn('  MySQL tidak aktif: hasil game tidak akan tersimpan, bank kata bawaan tetap dipakai.');
  }
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`\n[server] ${signal} diterima, menutup dengan rapi...`);
  engine.shutdown();
  io.close();
  server.close(() => {
    void closeDb().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
