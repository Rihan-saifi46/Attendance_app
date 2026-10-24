import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './interfaces/http/middlewares/requestLogger.js';
import { errorHandler } from './interfaces/http/middlewares/errorHandler.js';
import { createRateLimiter } from './interfaces/http/middlewares/rateLimiter.js';
import { healthRouter } from './interfaces/http/routes/health.routes.js';
import { authRouter } from './interfaces/http/routes/auth.routes.js';
import { companyRouter } from './interfaces/http/routes/company.routes.js';
import { branchRouter } from './interfaces/http/routes/branch.routes.js';
import { departmentRouter } from './interfaces/http/routes/department.routes.js';
import { shiftRouter } from './interfaces/http/routes/shift.routes.js';
import { employeeRouter } from './interfaces/http/routes/employee.routes.js';
import { auditRouter } from './interfaces/http/routes/audit.routes.js';
import { attendanceRouter } from './interfaces/http/routes/attendance.routes.js';
import { ErrorCode, createErrorResponse } from '@workforcepro/api-contracts';

export function createApp(): Express {
  const app = express();

  // 1. Security & Edge Headers
  app.use(helmet());

  const allowedOrigins = env.CORS_ORIGIN_WHITELIST.split(',').map((s) => s.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) in non-production
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not permitted by CORS`));
        }
      },
      credentials: true
    })
  );

  // 2. Request Body Parsers (10MB to accommodate high-res selfie uploads)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Structured Request Logging & Edge Rate Limiting
  app.use(requestLogger);
  app.use(createRateLimiter({ windowMs: 60 * 1000, maxRequests: 200 }));

  // 4. API Routes
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/companies', companyRouter);
  app.use('/api/v1/branches', branchRouter);
  app.use('/api/v1/departments', departmentRouter);
  app.use('/api/v1/shifts', shiftRouter);
  app.use('/api/v1/employees', employeeRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/audit-logs', auditRouter);

  // 5. 404 Route Not Found Handler
  app.use((req: Request, res: Response) => {
    res
      .status(404)
      .json(createErrorResponse(ErrorCode.NOT_FOUND, `Cannot ${req.method} ${req.path}`));
  });

  // 6. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
