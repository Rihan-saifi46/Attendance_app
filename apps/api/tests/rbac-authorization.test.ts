import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { ErrorCode, UserRole } from '@workforcepro/api-contracts';

describe('RBAC Authorization & Privilege Escalation Prevention', () => {
  const app = createApp();

  let ownerToken: string;
  let hrToken: string;
  let hrUserId: string;
  let employeeToken: string;
  let companyId: string;
  let branch1Id: string;
  let branch2Id: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // 1. Setup Company and Owner
    const reg = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'OmniCorp',
      subdomain: 'omnicorp',
      contactEmail: 'contact@omnicorp.test',
      adminFirstName: 'Olivia',
      adminLastName: 'Owner',
      adminEmail: 'olivia@omnicorp.test',
      adminPassword: 'Password123!@#'
    });

    ownerToken = reg.body.data.accessToken;
    companyId = reg.body.data.user.companyId;

    // 2. Create Two Branches
    const b1 = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ code: 'NORTH-01', name: 'North Branch', city: 'Seattle', country: 'US' });
    branch1Id = b1.body.data.id;

    const b2 = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ code: 'SOUTH-01', name: 'South Branch', city: 'Miami', country: 'US' });
    branch2Id = b2.body.data.id;

    // 3. Owner invites HR Admin
    const hrInvite = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'harold@omnicorp.test',
        firstName: 'Harold',
        lastName: 'HR',
        role: UserRole.HR_ADMIN,
        branchId: branch1Id
      });
    hrUserId = hrInvite.body.data.userId;

    const hrAccept = await request(app).post('/api/v1/auth/accept-invitation').send({
      token: hrInvite.body.data.invitationToken,
      password: 'HrPassword123!@#'
    });
    hrToken = hrAccept.body.data.accessToken;

    // 4. HR Admin invites Employee assigned to Branch 1
    const empInvite = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        email: 'edward@omnicorp.test',
        firstName: 'Edward',
        lastName: 'Emp',
        role: UserRole.EMPLOYEE,
        branchId: branch1Id
      });

    const empAccept = await request(app).post('/api/v1/auth/accept-invitation').send({
      token: empInvite.body.data.invitationToken,
      password: 'EmpPassword123!@#'
    });
    employeeToken = empAccept.body.data.accessToken;
  });

  it('RULE: Prevent user from elevating their own role (self-privilege escalation)', async () => {
    // HR Admin attempts to promote themselves to COMPANY_OWNER
    const res = await request(app)
      .patch(`/api/v1/companies/${companyId}/members/${hrUserId}/role`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        role: UserRole.COMPANY_OWNER
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN_ROLE_ASSIGNMENT);
    expect(res.body.error.message).toContain('Self-privilege escalation prohibited');
  });

  it('RULE: Prevent HR_ADMIN from assigning roles higher than their authority (COMPANY_OWNER)', async () => {
    // HR Admin attempts to invite a user with COMPANY_OWNER role
    const res = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        email: 'intruder@omnicorp.test',
        firstName: 'Ian',
        lastName: 'Intruder',
        role: UserRole.COMPANY_OWNER
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN_ROLE_ASSIGNMENT);
  });

  it('RULE: Disallow unprivileged employee from modifying company settings or inviting others', async () => {
    // Employee tries to update company settings
    const updateRes = await request(app)
      .patch(`/api/v1/companies/${companyId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Hacked by Employee' });

    expect(updateRes.status).toBe(403);
    expect(updateRes.body.error.code).toBe(ErrorCode.FORBIDDEN);

    // Employee tries to invite another user
    const inviteRes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        email: 'friend@omnicorp.test',
        firstName: 'Frank',
        lastName: 'Friend',
        role: UserRole.EMPLOYEE
      });

    expect(inviteRes.status).toBe(403);
    expect(inviteRes.body.error.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('RULE: Validate branch membership restricting employee to their assigned branch', async () => {
    // Employee assigned to Branch 1 accesses Branch 1 -> allowed
    const validBranchRes = await request(app)
      .get(`/api/v1/branches/${branch1Id}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(validBranchRes.status).toBe(200);
    expect(validBranchRes.body.data.id).toBe(branch1Id);

    // Employee accesses Branch 2 (which they do not belong to) -> rejected with 403
    const foreignBranchRes = await request(app)
      .get(`/api/v1/branches/${branch2Id}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(foreignBranchRes.status).toBe(403);
    expect(foreignBranchRes.body.error.code).toBe(ErrorCode.BRANCH_MEMBERSHIP_INVALID);
  });
});
