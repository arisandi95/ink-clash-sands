import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

for (const candidate of [
  '.env',
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), 'apps/server/.env')
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default('inkclash'),
  DB_PASSWORD: z.string().default('inkclash'),
  DB_NAME: z.string().default('inkclash'),
  DB_DISABLED: z
    .string()
    .optional()
    .transform((value) => value === '1' || value === 'true')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development'
};

export type Config = typeof config;
