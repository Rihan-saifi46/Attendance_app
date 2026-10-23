import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './interfaces/http/middlewares/requestLogger.js';
import { errorHandler } from './interfaces/http/middlewares/errorHandler.js';
import { healthRouter } from './interfaces/http/routes/health.routes.js';
import { ErrorCode, createErrorResponse } from '@workforcepro/api-contracts';

export function createApp(): Express {
  const app = express();

  // 1. Security & Edge Headers
  app.use(helmet());

  const allowedOrigins = env.CORS_ORIGIN_WHITELIST.split(',').map(s => s.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) in non-production
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not permitted by CORS`));
      }
    },
    credentials: true
  }));

  // 2. Request Body Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. Structured Request Logging
  app.use(requestLogger);

  // 4. Base Routes
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  // 5. 404 Route Not Found Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json(
      createErrorResponse(
        ErrorCode.NOT_FOUND,
        `Cannot ${req.method} ${req.path}`
      )
    );
  });

  // 6. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
