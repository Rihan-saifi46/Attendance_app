import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { apiErrorResponseSchema, ErrorCode } from '@workforcepro/api-contracts';

describe('ErrorHandling', () => {
  const app = createApp();

  it('GET /unknown-route should return 404 with standard ApiErrorResponse envelope', async () => {
    const res = await request(app).get('/unknown-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCode.NOT_FOUND);

    const parsed = apiErrorResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });
});
