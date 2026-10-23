import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logging/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request completed with 5xx');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Request completed with 4xx');
    } else {
      logger.info(logData, 'HTTP Request completed');
    }
  });

  next();
}
