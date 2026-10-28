import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

for (const candidate of [
  '.env',
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), 'apps/server/.env')
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
  }
}

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './migrations',
  dbCredentials: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'inkclash',
    password: process.env.DB_PASSWORD ?? 'inkclash',
    database: process.env.DB_NAME ?? 'inkclash'
  }
});
