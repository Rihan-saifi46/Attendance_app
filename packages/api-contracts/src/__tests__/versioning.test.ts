import { describe, it, expect } from 'vitest';
import { v1, ErrorCode, createSuccessResponse, healthCheckResponseSchema } from '../index.js';

describe('VersionedApiContracts (v1)', () => {
  it('should expose v1 namespace with identical contract definitions', () => {
    expect(v1).toBeDefined();
    expect(v1.ErrorCode).toBe(ErrorCode);
    expect(v1.createSuccessResponse).toBe(createSuccessResponse);
    expect(v1.healthCheckResponseSchema).toBe(healthCheckResponseSchema);
  });

  it('should validate HealthCheckResponse using v1 schema', () => {
    const validHealth = {
      status: 'ok',
      version: '0.1.0',
      uptimeSeconds: 120,
      timestamp: new Date().toISOString(),
      environment: 'test',
      services: {
        database: { status: 'connected', latencyMs: 5 },
        memory: { heapUsedMb: 12.5, heapTotalMb: 25.0, rssMb: 40.0 }
      }
    };

    const result = v1.healthCheckResponseSchema.safeParse(validHealth);
    expect(result.success).toBe(true);
  });
});
