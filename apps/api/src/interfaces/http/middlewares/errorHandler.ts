import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorCode, createErrorResponse } from '@workforcepro/api-contracts';
import { logger } from '../../../infrastructure/logging/logger.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: keyof typeof ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: keyof typeof ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedIssues = err.errors.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));

    logger.warn({ path: req.path, issues: formattedIssues }, 'Validation error intercepted');
    res.status(400).json(
      createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request payload or parameters',
        { issues: formattedIssues }
      )
    );
    return;
  }

  // 2. Custom Domain / Application Errors
  if (err instanceof AppError) {
    logger.warn({ path: req.path, code: err.code, message: err.message }, 'Application error intercepted');
    res.status(err.statusCode).json(
      createErrorResponse(err.code, err.message, err.details)
    );
    return;
  }

  // 3. Syntax / JSON Parsing Errors
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    logger.warn({ path: req.path, err }, 'Malformed JSON body');
    res.status(400).json(
      createErrorResponse(ErrorCode.BAD_REQUEST, 'Malformed JSON payload')
    );
    return;
  }

  // 4. Uncaught Internal Server Errors
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled internal server error');
  res.status(500).json(
    createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected internal server error occurred'
    )
  );
}
