import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { UserModel } from '../src/infrastructure/database/models/user.model.js';
import { ErrorCode, UserRole } from '@workforcepro/api-contracts';
import { loginAbuseGuard } from '../src/interfaces/http/middlewares/rateLimiter.js';

describe('Authentication & Membership Lifecycle', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    loginAbuseGuard.resetAll();
  });

  it('should successfully register a company and return sanitized credentials', async () => {
    const res = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Acme Technologies',
      subdomain: 'acme-tech',
      contactEmail: 'contact@acme.test',
      adminFirstName: 'Alice',
      adminLastName: 'Smith',
      adminEmail: 'alice@acme.test',
      adminPassword: 'Password123!@#'
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.expiresInSeconds).toBe(900);
    expect(res.body.data.user.email).toBe('alice@acme.test');
    expect(res.body.data.user.role).toBe(UserRole.COMPANY_OWNER);
    expect(res.body.data.user.companySubdomain).toBe('acme-tech');

    // Security Rule: Do not expose secrets or password hashes in responses
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('refreshTokenHash');

    // Verify database record has secure salted hash
    const userInDb = await UserModel.findOne({ email: 'alice@acme.test' }).setOptions({
      bypassTenantCheck: true
    });
    expect(userInDb).toBeDefined();
    expect(userInDb!.passwordHash).not.toBe('Password123!@#');
    expect(userInDb!.passwordHash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash format
  });

  it('should prevent duplicate subdomain registration', async () => {
    await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'First Acme',
      subdomain: 'duplicate-sub',
      contactEmail: 'admin1@acme.test',
      adminFirstName: 'Bob',
      adminLastName: 'Jones',
      adminEmail: 'bob@acme.test',
      adminPassword: 'Password123!@#'
    });

    const duplicateRes = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Second Acme',
      subdomain: 'duplicate-sub',
      contactEmail: 'admin2@acme.test',
      adminFirstName: 'Charlie',
      adminLastName: 'Brown',
      adminEmail: 'charlie@acme.test',
      adminPassword: 'Password123!@#'
    });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe(ErrorCode.SUBDOMAIN_ALREADY_EXISTS);
  });

  it('should authenticate user and handle invalid credentials correctly', async () => {
    // 1. Register company
    await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Apex Corp',
      subdomain: 'apex',
      contactEmail: 'contact@apex.test',
      adminFirstName: 'David',
      adminLastName: 'Miller',
      adminEmail: 'david@apex.test',
      adminPassword: 'Password123!@#'
    });

    // 2. Successful login
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'david@apex.test',
      password: 'Password123!@#',
      companySubdomain: 'apex'
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();

    // 3. Login with wrong password
    const wrongPassRes = await request(app).post('/api/v1/auth/login').send({
      email: 'david@apex.test',
      password: 'WrongPassword999!',
      companySubdomain: 'apex'
    });

    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
  });

  it('should rotate refresh token and revoke old tokens on refresh', async () => {
    const regRes = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Nexus Corp',
      subdomain: 'nexus',
      contactEmail: 'contact@nexus.test',
      adminFirstName: 'Eve',
      adminLastName: 'Adams',
      adminEmail: 'eve@nexus.test',
      adminPassword: 'Password123!@#'
    });

    const initialRefreshToken = regRes.body.data.refreshToken;

    // First refresh: should succeed and provide new tokens
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    const newRefreshToken = refreshRes.body.data.refreshToken;
    expect(newRefreshToken).not.toBe(initialRefreshToken);

    // Replay attack with initial refresh token: MUST fail
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.code).toBe(ErrorCode.TOKEN_REVOKED);
  });

  it('should revoke access token upon user logout', async () => {
    const regRes = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Secure Inc',
      subdomain: 'secure',
      contactEmail: 'contact@secure.test',
      adminFirstName: 'Frank',
      adminLastName: 'Castle',
      adminEmail: 'frank@secure.test',
      adminPassword: 'Password123!@#'
    });

    const accessToken = regRes.body.data.accessToken;

    // Verify access token works on /auth/me
    const meBefore = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meBefore.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    // Access with old access token must now be blocked
    const meAfter = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meAfter.status).toBe(401);
    expect(meAfter.body.error.code).toBe(ErrorCode.TOKEN_REVOKED);
  });

  it('should support inviting employees and accepting invitations', async () => {
    const regRes = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Initech',
      subdomain: 'initech',
      contactEmail: 'contact@initech.test',
      adminFirstName: 'Bill',
      adminLastName: 'Lumbergh',
      adminEmail: 'bill@initech.test',
      adminPassword: 'Password123!@#'
    });

    const ownerToken = regRes.body.data.accessToken;

    // Invite new employee
    const inviteRes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'peter@initech.test',
        firstName: 'Peter',
        lastName: 'Gibbons',
        role: UserRole.EMPLOYEE
      });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.success).toBe(true);
    const invitationToken = inviteRes.body.data.invitationToken;
    expect(invitationToken).toBeDefined();

    // Accept invitation
    const acceptRes = await request(app).post('/api/v1/auth/accept-invitation').send({
      token: invitationToken,
      password: 'PeterPassword123!@#'
    });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.user.email).toBe('peter@initech.test');
    expect(acceptRes.body.data.user.role).toBe(UserRole.EMPLOYEE);

    // Peter logs in with new password
    const peterLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'peter@initech.test',
      password: 'PeterPassword123!@#',
      companySubdomain: 'initech'
    });

    expect(peterLogin.status).toBe(200);
    expect(peterLogin.body.data.user.email).toBe('peter@initech.test');
  });

  it('should trigger login abuse protection after 5 consecutive failures', async () => {
    // Attempt 5 failed logins with same email
    for (let i = 0; i < 5; i++) {
      const failRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'target@victim.test',
          password: `BadAttempt${i}!@#`
        });
      expect(failRes.status).toBe(401);
    }

    // 6th attempt must be locked out with 429
    const lockedRes = await request(app).post('/api/v1/auth/login').send({
      email: 'target@victim.test',
      password: 'BadAttempt6!@#'
    });

    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
  });
});
