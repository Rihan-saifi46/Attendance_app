import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { UserRoleType } from '@workforcepro/api-contracts';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRoleType;
  companyId: string;
  branchId?: string | null;
  tokenVersion: number;
}

export function generateAccessToken(payload: AccessTokenPayload): {
  token: string;
  expiresInSeconds: number;
} {
  const expiresInSeconds = 15 * 60; // 15 minutes
  const options: SignOptions = {
    expiresIn: expiresInSeconds,
    issuer: 'workforcepro-api',
    audience: 'workforcepro-client'
  };

  const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  return { token, expiresInSeconds };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'workforcepro-api',
    audience: 'workforcepro-client'
  }) as AccessTokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): { token: string; hash: string } {
  // 256-bit cryptographically secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}
