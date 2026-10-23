import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../src/interfaces/http/middlewares/validateRequest.js';
import { errorHandler } from '../src/interfaces/http/middlewares/errorHandler.js';
import {
  apiErrorResponseSchema,
  ErrorCode,
  createSuccessResponse
} from '@workforcepro/api-contracts';

describe('RequestValidationMiddleware', () => {
  const app = express();
  app.use(express.json());

  const sampleBodySchema = z.object({
    name: z.string().min(3, 'Name must have at least 3 characters'),
    quantity: z.number().positive('Quantity must be greater than zero')
  });

  app.post(
    '/test-validate',
    validateRequest({ body: sampleBodySchema }),
    (req: Request, res: Response) => {
      res.status(200).json(createSuccessResponse(req.body));
    }
  );

  app.use(errorHandler);

  it('should reject invalid payload with 400 and structured validation issues', async () => {
    const res = await request(app).post('/test-validate').send({
      name: 'ab',
      quantity: -5
    });

    expect(res.status).toBe(400);
    const parsed = apiErrorResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(res.body.error.message).toBe('Invalid request payload or parameters');
    expect(res.body.error.details?.issues).toBeInstanceOf(Array);
    expect((res.body.error.details?.issues as unknown[]).length).toBe(2);
  });

  it('should accept valid payload and pass to handler', async () => {
    const res = await request(app).post('/test-validate').send({
      name: 'WorkforcePro Admin',
      quantity: 42
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('WorkforcePro Admin');
    expect(res.body.data.quantity).toBe(42);
  });
});
