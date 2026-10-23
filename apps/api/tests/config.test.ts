import { describe, it, expect } from 'vitest';
import { env } from '../src/config/env.js';

describe('EnvironmentConfiguration', () => {
  it('should validate and provide required configuration parameters', () => {
    expect(env).toBeDefined();
    expect(env.NODE_ENV).toBe('test');
    expect(typeof env.PORT).toBe('number');
    expect(env.MONGODB_URI).toContain('workforcepro_test');
    expect(env.LOG_LEVEL).toBe('silent');
    expect(typeof env.CORS_ORIGIN_WHITELIST).toBe('string');
  });
});
