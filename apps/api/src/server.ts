import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './infrastructure/logging/logger.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/mongodb.js';

async function bootstrap() {
  logger.info(
    { environment: env.NODE_ENV, port: env.PORT },
    'Initializing WorkforcePro API service...'
  );

  // Attempt database connection in non-test mode (warn if unreachable, do not crash prematurely)
  try {
    await connectDatabase();
  } catch (err) {
    logger.warn({ err }, 'Initial database connection failed. Service running in degraded mode.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`WorkforcePro API listening on port ${env.PORT} (${env.API_BASE_URL})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down HTTP server and database...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Clean shutdown completed.');
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only start when invoked directly
if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.fatal({ err }, 'Fatal error during API bootstrap');
    process.exit(1);
  });
}
