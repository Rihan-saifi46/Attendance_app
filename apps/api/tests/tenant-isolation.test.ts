import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { CompanyModel } from '../src/infrastructure/database/models/company.model.js';
import { UserModel } from '../src/infrastructure/database/models/user.model.js';
import { BranchModel } from '../src/infrastructure/database/models/branch.model.js';
import { ErrorCode, UserRole } from '@workforcepro/api-contracts';

describe('Multi-Tenant Security & Isolation Enforcement', () => {
  const app = createApp();

  let tokenA: string;
  let companyAId: string;
  let branchAId: string;
  let employeeAId: string;

  let tokenB: string;
  let companyBId: string;
  let branchBId: string;
  let employeeBId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // 1. Setup Company A (Alpha Corp)
    const regA = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Alpha Corporation',
      subdomain: 'alpha-corp',
      contactEmail: 'contact@alpha.test',
      adminFirstName: 'Alice',
      adminLastName: 'Alpha',
      adminEmail: 'alice@alpha.test',
      adminPassword: 'Password123!@#'
    });
    tokenA = regA.body.data.accessToken;
    companyAId = regA.body.data.user.companyId;

    const branchARes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        code: 'ALPHA-01',
        name: 'Alpha Primary Office',
        city: 'New York',
        country: 'US'
      });
    branchAId = branchARes.body.data.id;

    const inviteARes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: 'emp-a@alpha.test',
        firstName: 'Arthur',
        lastName: 'Archer',
        role: UserRole.EMPLOYEE,
        branchId: branchAId
      });
    employeeAId = inviteARes.body.data.userId;

    // 2. Setup Company B (Beta Corp)
    const regB = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Beta Corporation',
      subdomain: 'beta-corp',
      contactEmail: 'contact@beta.test',
      adminFirstName: 'Bob',
      adminLastName: 'Beta',
      adminEmail: 'bob@beta.test',
      adminPassword: 'Password123!@#'
    });
    tokenB = regB.body.data.accessToken;
    companyBId = regB.body.data.user.companyId;

    const branchBRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        code: 'BETA-01',
        name: 'Beta Primary Office',
        city: 'San Francisco',
        country: 'US'
      });
    branchBId = branchBRes.body.data.id;

    const inviteBRes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        email: 'emp-b@beta.test',
        firstName: 'Betty',
        lastName: 'Baker',
        role: UserRole.EMPLOYEE,
        branchId: branchBId
      });
    employeeBId = inviteBRes.body.data.userId;
  });

  it('RULE 1: Prevent cross-company read when user A specifies Company B in URL parameter', async () => {
    // User A attempts to view Company B profile using Company B ID in route
    const res = await request(app)
      .get(`/api/v1/companies/${companyBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCode.CROSS_TENANT_ACCESS_DENIED);
  });

  it('RULE 2: Prevent cross-company member lookup across tenant boundaries', async () => {
    // 1. User A retrieves their own employee from Company A -> 200 OK
    const ownMemberRes = await request(app)
      .get(`/api/v1/companies/${companyAId}/members/${employeeAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ownMemberRes.status).toBe(200);
    expect(ownMemberRes.body.data.id).toBe(employeeAId);

    // 2. User A attempts to retrieve employee from Company B -> 404 NOT FOUND in Company A scope
    const crossRes = await request(app)
      .get(`/api/v1/companies/${companyAId}/members/${employeeBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(crossRes.status).toBe(404);
    expect(crossRes.body.success).toBe(false);
  });

  it('RULE 3: Prevent cross-company update of another company profile', async () => {
    // User A attempts to modify Company B name and email
    const res = await request(app)
      .patch(`/api/v1/companies/${companyBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Malicious Alpha Takeover',
        contactEmail: 'hacked@beta.test'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.CROSS_TENANT_ACCESS_DENIED);

    // Verify database integrity: Company B name remains unchanged
    const betaInDb = await CompanyModel.findById(companyBId);
    expect(betaInDb?.name).toBe('Beta Corporation');
    expect(betaInDb?.contactEmail).toBe('contact@beta.test');
  });

  it('RULE 4: Prevent cross-company branch lookup by ID', async () => {
    // User A attempts to inspect Branch B belonging to Company B
    const res = await request(app)
      .get(`/api/v1/branches/${branchBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.BRANCH_NOT_FOUND);
  });

  it('RULE 5: Prevent client from injecting companyId in request body to forge records in Company B', async () => {
    // User A attempts to create a branch inside Company B by explicitly passing companyId: companyBId
    const res = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        code: 'FORGED-01',
        name: 'Forged Infiltration Branch',
        city: 'Chicago',
        country: 'US',
        companyId: companyBId // Malicious payload
      });

    // The middleware blocks cross-tenant tampering or derives scope from authenticated token
    if (res.status === 201) {
      // If created, it must be strictly scoped to Company A, NEVER Company B
      expect(res.body.data.companyId).toBe(companyAId);
      expect(res.body.data.companyId).not.toBe(companyBId);

      // Verify in DB that Company B has no branch with code FORGED-01
      const branchInB = await BranchModel.findOne({
        companyId: companyBId,
        code: 'FORGED-01',
        isDeleted: false
      });
      expect(branchInB).toBeNull();
    } else {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCode.CROSS_TENANT_ACCESS_DENIED);
    }
  });

  it('RULE 6: Prevent modifying member roles across company boundaries', async () => {
    // User A attempts to promote Employee B to COMPANY_OWNER
    const res = await request(app)
      .patch(`/api/v1/companies/${companyBId}/members/${employeeBId}/role`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        role: UserRole.COMPANY_OWNER
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.CROSS_TENANT_ACCESS_DENIED);

    // Verify Employee B role was not altered
    const empBInDb = await UserModel.findById(employeeBId).setOptions({ bypassTenantCheck: true });
    expect(empBInDb?.role).toBe(UserRole.EMPLOYEE);
  });

  it('RULE 7: Database-level scoping plugin blocks unscoped queries without companyId', async () => {
    // Attempting a direct Mongoose find on a tenant-scoped model without companyId must throw
    await expect(async () => {
      await UserModel.find({ email: 'bob@beta.test' });
    }).rejects.toThrow(/Cross-tenant query blocked: Missing mandatory companyId filter/);
  });

  it('RULE 8: Member directory queries return only records from authorized company', async () => {
    const res = await request(app)
      .get(`/api/v1/companies/${companyAId}/members`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const members = res.body.data as Array<{ email: string; companyId: string }>;

    expect(members.length).toBeGreaterThan(0);
    // Every returned member must belong to Company A
    for (const member of members) {
      expect(member.companyId).toBe(companyAId);
      expect(member.email).not.toBe('bob@beta.test');
      expect(member.email).not.toBe('emp-b@beta.test');
    }
  });
});
