import pino, { DestinationStream, LoggerOptions } from 'pino';
import { env } from '../../config/env.js';

export const sensitiveFieldPaths = [
  'password',
  '*.password',
  '*.*.password',
  'passwordHash',
  '*.passwordHash',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'authorization',
  '*.authorization',
  'req.headers.authorization',
  'headers.authorization',
  'cookie',
  '*.cookie',
  'req.headers.cookie',
  'headers.cookie',
  'bankDetails',
  '*.bankDetails',
  'accountNumber',
  '*.accountNumber',
  'panOrTaxId',
  '*.panOrTaxId',
  'secret',
  '*.secret',
  '*.*.secret'
];

export function createLogger(options?: LoggerOptions, destination?: DestinationStream) {
  const isDev = env.NODE_ENV === 'development';
  return pino(
    {
      level: options?.level || env.LOG_LEVEL,
      redact: {
        paths: sensitiveFieldPaths,
        censor: '[REDACTED]'
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport:
        isDev && !destination
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
              }
            }
          : undefined,
      ...options
    },
    destination
  );
}

export const logger = createLogger();
