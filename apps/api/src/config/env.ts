import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

const currentEnv = process.env.NODE_ENV || 'development';

// 1. Load environment-specific file if exists (.env.test, .env.development, etc.)
const envSpecificFile = path.resolve(process.cwd(), `.env.${currentEnv}`);
if (fs.existsSync(envSpecificFile)) {
  dotenv.config({ path: envSpecificFile });
}

// 2. Load root / default .env as fallback
dotenv.config();

const isTest = currentEnv === 'test';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_BASE_URL: z.string().url().default('http://localhost:5000'),
  MONGODB_URI: z
    .string()
    .min(1)
    .default(
      isTest
        ? 'mongodb://127.0.0.1:27017/workforcepro_test'
        : 'mongodb://127.0.0.1:27017/workforcepro_dev'
    ),
  MONGODB_DEBUG: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  CORS_ORIGIN_WHITELIST: z.string().default('http://localhost:3000,http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default(isTest ? 'silent' : 'info'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default('test-jwt-access-secret-minimum-32-chars-long-placeholder!'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default('test-jwt-refresh-secret-minimum-32-chars-long-placeholder!'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d')
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`[CONFIG] Invalid environment configuration: ${errorDetails}`);
  }
  return result.data;
}

export const env = validateEnv();
