import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { healthCheckResponseSchema } from '@workforcepro/api-contracts';

describe('HealthCheckEndpoint', () => {
  const app = createApp();

  it('GET /health should return 200 or 503 and valid health contract schema', async () => {
    const res = await request(app).get('/health');

    // Status can be 200 (ok or degraded if db disconnected)
    expect([200, 503]).toContain(res.status);

    const parseResult = healthCheckResponseSchema.safeParse(res.body);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.version).toBe('0.1.0');
      expect(typeof parseResult.data.uptimeSeconds).toBe('number');
      expect(parseResult.data.services).toBeDefined();
    }
  });

  it('GET /api/v1/health should also return valid health contract', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(healthCheckResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
