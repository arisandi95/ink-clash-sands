import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '../config.js';
import * as schema from './schema.js';

let pool: mysql.Pool | null = null;
let db: MySql2Database<typeof schema> | null = null;
let available = false;
let initPromise: Promise<boolean> | null = null;
let warned = false;

export type Database = MySql2Database<typeof schema>;

export async function initDb(): Promise<boolean> {
  if (config.DB_DISABLED) {
    return false;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      pool = mysql.createPool({
        host: config.DB_HOST,
        port: config.DB_PORT,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        waitForConnections: true,
        connectionLimit: 6,
        connectTimeout: 2000,
        dateStrings: false
      });
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      db = drizzle(pool, { schema, mode: 'default' });
      available = true;
      return true;
    } catch (error) {
      if (!warned) {
        warned = true;
        console.warn(
          '[db] MySQL tidak tersedia. Game tetap berjalan dengan bank kata bawaan.',
          error instanceof Error ? error.message : error
        );
      }
      if (pool) {
        await pool.end().catch(() => undefined);
        pool = null;
      }
      db = null;
      available = false;
      return false;
    }
  })();

  return initPromise;
}

export function isDbAvailable(): boolean {
  return available && db !== null;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database is not available');
  }
  return db;
}

export function getPool(): mysql.Pool | null {
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end().catch(() => undefined);
  }
  pool = null;
  db = null;
  available = false;
}
