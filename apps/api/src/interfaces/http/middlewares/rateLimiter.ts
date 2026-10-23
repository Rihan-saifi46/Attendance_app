import { Request, Response, NextFunction } from 'express';
import { ErrorCode, AuditAction } from '@workforcepro/api-contracts';
import { AppError } from './errorHandler.js';
import { logAuditEvent } from '../../../infrastructure/security/audit.service.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();
const loginFailureMap = new Map<string, { attempts: number; lockoutUntil: number }>();

/**
 * General IP-based rate limiting middleware.
 */
export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = ipRequestMap.get(ip);
    if (!record || now > record.resetTime) {
      ipRequestMap.set(ip, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    record.count++;
    if (record.count > options.maxRequests) {
      return next(
        new AppError(
          429,
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Too many requests from this IP. Please try again later.'
        )
      );
    }

    next();
  };
}

/**
 * Tracks failed login attempts and prevents brute-force abuse.
 * Max 5 failed attempts per 5 minutes per IP or email.
 */
export const loginAbuseGuard = {
  check(key: string): void {
    const entry = loginFailureMap.get(key);
    if (!entry) return;

    const now = Date.now();
    if (now < entry.lockoutUntil) {
      const waitSeconds = Math.ceil((entry.lockoutUntil - now) / 1000);
      throw new AppError(
        429,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        `Too many failed login attempts. Account temporarily locked. Please try again in ${waitSeconds} seconds.`
      );
    }

    if (now >= entry.lockoutUntil && entry.attempts >= 5) {
      loginFailureMap.delete(key);
    }
  },

  recordFailure(key: string, ip?: string, email?: string): void {
    const now = Date.now();
    const entry = loginFailureMap.get(key) || { attempts: 0, lockoutUntil: 0 };
    entry.attempts++;

    // Lockout for 5 minutes after 5 failed attempts
    if (entry.attempts >= 5) {
      entry.lockoutUntil = now + 5 * 60 * 1000;
      logAuditEvent({
        userEmail: email || null,
        action: AuditAction.RATE_LIMIT_EXCEEDED,
        details: { key, attempts: entry.attempts, lockoutMinutes: 5 },
        ip: ip || null
      }).catch(() => {});
    }

    loginFailureMap.set(key, entry);
  },

  recordSuccess(key: string): void {
    loginFailureMap.delete(key);
  },

  resetAll(): void {
    loginFailureMap.clear();
    ipRequestMap.clear();
  }
};
