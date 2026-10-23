import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file if available
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_BASE_URL: z.string().url().default('http://localhost:5000'),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/workforcepro_dev'),
  MONGODB_DEBUG: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  CORS_ORIGIN_WHITELIST: z.string().default('http://localhost:3000,http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`[CONFIG] Invalid environment configuration: ${errorDetails}`);
  }
  return result.data;
}

export const env = validateEnv();
