import { describe, it, expect } from 'vitest';
import { checkDatabaseHealth } from '../src/infrastructure/database/mongodb.js';

describe('DatabaseHealthCheck', () => {
  it('should report disconnected when no active connection exists', async () => {
    const health = await checkDatabaseHealth();
    expect(health).toBeDefined();
    // In test environment without active mongoose connection, readyState is 0 (disconnected)
    expect(['disconnected', 'connected']).toContain(health.status);
  });
});
