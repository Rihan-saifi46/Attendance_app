import { describe, it, expect } from 'vitest';
import { adminEnv } from '../config/env.js';

describe('AdminEnvironmentConfig', () => {
  it('should provide default API base URL and app environment', () => {
    expect(adminEnv).toBeDefined();
    expect(adminEnv.apiBaseUrl).toBeDefined();
    expect(typeof adminEnv.apiBaseUrl).toBe('string');
    expect(['development', 'production', 'test']).toContain(adminEnv.appEnv);
  });
});
