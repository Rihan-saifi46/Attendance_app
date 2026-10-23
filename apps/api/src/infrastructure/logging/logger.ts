import pino from 'pino';
import { env } from '../../config/env.js';

const sensitiveFieldPaths = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  'bankDetails',
  'accountNumber',
  'panOrTaxId',
  'secret'
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: sensitiveFieldPaths,
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});
