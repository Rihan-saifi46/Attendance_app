import { describe, it, expect } from 'vitest';
import { healthCheckResponseSchema } from '../health/health.contract.js';

describe('HealthCheckResponseContract', () => {
  it('should validate a healthy payload correctly', () => {
    const validPayload = {
      status: 'ok',
      version: '0.1.0',
      uptimeSeconds: 120.45,
      timestamp: new Date().toISOString(),
      environment: 'development',
      services: {
        database: {
          status: 'connected',
          latencyMs: 12
        },
        memory: {
          heapUsedMb: 45.2,
          heapTotalMb: 90.1,
          rssMb: 120.5
        }
      }
    };

    const parsed = healthCheckResponseSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid service status', () => {
    const invalidPayload = {
      status: 'ok',
      version: '0.1.0',
      uptimeSeconds: 50,
      timestamp: new Date().toISOString(),
      environment: 'test',
      services: {
        database: {
          status: 'non_existent_status'
        },
        memory: {
          heapUsedMb: 10,
          heapTotalMb: 20,
          rssMb: 30
        }
      }
    };

    const parsed = healthCheckResponseSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
