import { Router, Request, Response } from 'express';
import { env } from '../../../config/env.js';
import { checkDatabaseHealth } from '../../../infrastructure/database/mongodb.js';
import { HealthCheckResponse, OverallStatus } from '@workforcepro/api-contracts';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const memUsage = process.memoryUsage();

  let overallStatus: OverallStatus = 'ok';
  if (dbHealth.status === 'error') {
    overallStatus = 'error';
  } else if (dbHealth.status !== 'connected') {
    overallStatus = 'degraded';
  }

  const payload: HealthCheckResponse = {
    status: overallStatus,
    version: '0.1.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    services: {
      database: dbHealth,
      memory: {
        heapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100
      }
    }
  };

  const statusCode = overallStatus === 'error' ? 503 : 200;
  res.status(statusCode).json(payload);
});
