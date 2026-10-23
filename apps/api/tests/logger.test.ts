import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { createLogger } from '../src/infrastructure/logging/logger.js';

describe('LoggerSensitiveDataRedaction', () => {
  it('should redact sensitive fields at root and nested levels', async () => {
    let capturedLog = '';
    const dest = new Writable({
      write(chunk, _encoding, callback) {
        capturedLog += chunk.toString();
        callback();
      }
    });

    const testLogger = createLogger({ level: 'info' }, dest);

    testLogger.info(
      {
        user: 'employee-123',
        password: 'plainTextPassword123!',
        token: 'eySecretJwtToken',
        nested: {
          secret: 'super-sensitive-api-key',
          password: 'anotherNestedPassword'
        },
        nonSensitive: 'public-data'
      },
      'User credentials payload test'
    );

    expect(capturedLog).toBeDefined();
    expect(capturedLog.length).toBeGreaterThan(0);

    const parsed = JSON.parse(capturedLog);
    expect(parsed.user).toBe('employee-123');
    expect(parsed.nonSensitive).toBe('public-data');

    // Sensitive data must NEVER appear
    expect(parsed.password).toBe('[REDACTED]');
    expect(parsed.token).toBe('[REDACTED]');
    expect(parsed.nested.secret).toBe('[REDACTED]');
    expect(parsed.nested.password).toBe('[REDACTED]');

    expect(capturedLog.includes('plainTextPassword123!')).toBe(false);
    expect(capturedLog.includes('super-sensitive-api-key')).toBe(false);
    expect(capturedLog.includes('eySecretJwtToken')).toBe(false);
  });
});
