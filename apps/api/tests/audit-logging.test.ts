import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { AuditLogModel } from '../src/infrastructure/database/models/auditLog.model.js';
import { AuditAction, UserRole } from '@workforcepro/api-contracts';

describe('Audit Logging & Tamper-Resistance', () => {
  const app = createApp();

  let tokenA: string;
  let companyAId: string;
  let tokenB: string;
  let companyBId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const regA = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Audit Company A',
      subdomain: 'audit-a',
      contactEmail: 'contact@audit-a.test',
      adminFirstName: 'Arthur',
      adminLastName: 'Audit',
      adminEmail: 'arthur@audit-a.test',
      adminPassword: 'Password123!@#'
    });
    tokenA = regA.body.data.accessToken;
    companyAId = regA.body.data.user.companyId;

    const regB = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Audit Company B',
      subdomain: 'audit-b',
      contactEmail: 'contact@audit-b.test',
      adminFirstName: 'Beatrice',
      adminLastName: 'Audit',
      adminEmail: 'beatrice@audit-b.test',
      adminPassword: 'Password123!@#'
    });
    tokenB = regB.body.data.accessToken;
    companyBId = regB.body.data.user.companyId;
  });

  it('should record audit events for security-sensitive actions and isolate logs by tenant', async () => {
    // 1. Company A invites employee
    await request(app).post('/api/v1/auth/invite').set('Authorization', `Bearer ${tokenA}`).send({
      email: 'invited@audit-a.test',
      firstName: 'Ian',
      lastName: 'Invited',
      role: UserRole.EMPLOYEE
    });

    // 2. Company A tries cross-tenant access to Company B (triggers CROSS_TENANT_ACCESS_BLOCKED audit)
    await request(app)
      .get(`/api/v1/companies/${companyBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // 3. Query audit logs for Company A
    const logsResA = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(logsResA.status).toBe(200);
    expect(logsResA.body.success).toBe(true);
    const logsA = logsResA.body.data as Array<{ action: string; companyId: string }>;

    expect(logsA.length).toBeGreaterThanOrEqual(3);
    const actionsA = logsA.map((l) => l.action);
    expect(actionsA).toContain(AuditAction.COMPANY_REGISTERED);
    expect(actionsA).toContain(AuditAction.EMPLOYEE_INVITED);
    expect(actionsA).toContain(AuditAction.CROSS_TENANT_ACCESS_BLOCKED);

    // All logs returned to Company A must belong strictly to Company A
    for (const log of logsA) {
      expect(log.companyId).toBe(companyAId);
      expect(log.companyId).not.toBe(companyBId);
    }

    // 4. Query audit logs for Company B
    const logsResB = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(logsResB.status).toBe(200);
    const logsB = logsResB.body.data as Array<{ action: string; companyId: string }>;
    const actionsB = logsB.map((l) => l.action);
    // Company B must NOT see Company A's employee invite or cross-tenant block
    expect(actionsB).not.toContain(AuditAction.EMPLOYEE_INVITED);
    expect(actionsB).not.toContain(AuditAction.CROSS_TENANT_ACCESS_BLOCKED);
  });

  it('should enforce audit log immutability (block updates and deletes)', async () => {
    const log = new AuditLogModel({
      action: 'SYSTEM_BOOT',
      details: { init: true }
    });
    await log.save();

    // Attempt to update audit log
    await expect(async () => {
      await AuditLogModel.updateOne({ _id: log._id }, { action: 'TAMPERED_ACTION' });
    }).rejects.toThrow(/Audit logs are strictly immutable/);

    // Attempt to delete audit log
    await expect(async () => {
      await AuditLogModel.deleteOne({ _id: log._id });
    }).rejects.toThrow(/Audit logs are strictly immutable/);
  });
});
