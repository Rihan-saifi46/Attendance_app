import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';
import { ServiceStatus } from '@workforcepro/api-contracts';

let isConnecting = false;

export async function connectDatabase(): Promise<typeof mongoose | null> {
  if (mongoose.connection.readyState === 1) {
    logger.debug('Database already connected.');
    return mongoose;
  }

  if (isConnecting) {
    logger.debug('Database connection already in progress.');
    return null;
  }

  try {
    isConnecting = true;
    logger.info({ uri: env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') }, 'Connecting to MongoDB...');

    if (env.MONGODB_DEBUG) {
      mongoose.set('debug', true);
    }

    const instance = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    logger.info('MongoDB connected successfully.');
    return instance;
  } catch (err) {
    logger.error({ err }, 'Failed to connect to MongoDB.');
    throw err;
  } finally {
    isConnecting = false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected.');
  }
}

export async function checkDatabaseHealth(): Promise<{ status: ServiceStatus; latencyMs?: number }> {
  const readyState = mongoose.connection.readyState;

  switch (readyState) {
    case 1: { // Connected
      try {
        const start = Date.now();
        if (mongoose.connection.db) {
          await mongoose.connection.db.admin().ping();
          const latencyMs = Date.now() - start;
          return { status: 'connected', latencyMs };
        }
        return { status: 'connected' };
      } catch {
        return { status: 'error' };
      }
    }
    case 2:
      return { status: 'connecting' };
    case 0:
    case 3:
    default:
      return { status: 'disconnected' };
  }
}

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error event triggered.');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Disconnected.');
});
