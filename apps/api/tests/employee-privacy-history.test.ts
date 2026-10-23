import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';

describe('Employee Field-Level Privacy & History Audit Trail', () => {
  const app = createApp();
  let ownerToken: string;
  let employeeToken: string;
  let branchId: string;
  let departmentId: string;
  let shiftId: string;
  let employeeRecordId: string;
  let peerRecordId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // 1. Register Company & Owner
    const reg = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Shield Financial',
      subdomain: 'shield-fin',
      contactEmail: 'admin@shield.test',
      adminFirstName: 'Sam',
      adminLastName: 'Shield',
      adminEmail: 'sam@shield.test',
      adminPassword: 'Password123!@#'
    });
    ownerToken = reg.body.data.accessToken;

    // 2. Setup Branch, Department, Shift
    const branchRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ code: 'NYC-01', name: 'NYC Office', city: 'New York', country: 'US' });
    branchId = branchRes.body.data.id;

    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Finance', code: 'FIN' });
    departmentId = deptRes.body.data.id;

    const shiftRes = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Day', code: 'DAY', startTime: '09:00', endTime: '17:00' });
    shiftId = shiftRes.body.data.id;

    // 3. Create regular Employee User (via invite & accept)
    const inviteRes = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'regular.emp@shield.test',
        firstName: 'Regular',
        lastName: 'Employee',
        role: 'EMPLOYEE',
        branchId
      });
    const invitationToken = inviteRes.body.data.invitationToken;

    const acceptRes = await request(app).post('/api/v1/auth/accept-invitation').send({
      token: invitationToken,
      password: 'Password123!@#'
    });
    employeeToken = acceptRes.body.data.accessToken;
    const employeeUserId = acceptRes.body.data.user.id;

    // 4. Create Employee Record for Regular Employee
    const empRes = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        employeeCode: 'EMP-900',
        userId: employeeUserId,
        firstName: 'Regular',
        lastName: 'Employee',
        email: 'regular.emp@shield.test',
        phone: '+1-555-0900',
        joiningDate: '2026-01-01',
        designation: 'Financial Analyst',
        departmentId,
        branchId,
        shiftId,
        salaryDetails: {
          salaryType: 'MONTHLY',
          baseRate: 7500,
          accountNumber: '1234567890'
        }
      });
    employeeRecordId = empRes.body.data.id;

    // 5. Create Peer Employee Record (no userId bound)
    const peerRes = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        employeeCode: 'EMP-901',
        firstName: 'Peer',
        lastName: 'Colleague',
        email: 'peer@shield.test',
        phone: '+1-555-0901',
        joiningDate: '2026-01-01',
        designation: 'Senior Accountant',
        departmentId,
        branchId,
        shiftId,
        salaryDetails: {
          salaryType: 'MONTHLY',
          baseRate: 12000,
          accountNumber: '9876543210'
        }
      });
    peerRecordId = peerRes.body.data.id;
  });

  it('should never expose sensitive salary or bank details to unprivileged peers', async () => {
    // 1. Regular employee requests the employee directory
    const listRes = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(listRes.status).toBe(200);

    // Peer record in list must NOT have salaryDetails
    const peerInList = listRes.body.data.find(
      (e: { id: string; salaryDetails?: unknown }) => e.id === peerRecordId
    );
    expect(peerInList).toBeDefined();
    expect(peerInList.salaryDetails).toBeUndefined();

    // 2. Regular employee requests peer record directly by ID
    const peerDetail = await request(app)
      .get(`/api/v1/employees/${peerRecordId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(peerDetail.status).toBe(200);
    expect(peerDetail.body.data.salaryDetails).toBeUndefined();

    // 3. Regular employee requests their OWN profile -> salaryDetails ARE included
    const selfDetail = await request(app)
      .get(`/api/v1/employees/${employeeRecordId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(selfDetail.status).toBe(200);
    expect(selfDetail.body.data.salaryDetails).toBeDefined();
    expect(selfDetail.body.data.salaryDetails.baseRate).toBe(7500);
    expect(selfDetail.body.data.salaryDetails.accountNumberMasked).toBe('****7890');

    // 4. Company owner requests peer record -> salaryDetails ARE included
    const ownerPeerDetail = await request(app)
      .get(`/api/v1/employees/${peerRecordId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerPeerDetail.status).toBe(200);
    expect(ownerPeerDetail.body.data.salaryDetails).toBeDefined();
    expect(ownerPeerDetail.body.data.salaryDetails.baseRate).toBe(12000);
  });

  it('should track employee change history when authorized profile updates occur', async () => {
    // 1. Owner updates employee designation, salary base rate, and adds reason
    const updateRes = await request(app)
      .patch(`/api/v1/employees/${employeeRecordId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        designation: 'Lead Financial Analyst',
        salaryDetails: {
          salaryType: 'MONTHLY',
          baseRate: 8500
        },
        updateReason: 'Annual performance promotion'
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.designation).toBe('Lead Financial Analyst');
    expect(updateRes.body.data.salaryDetails.baseRate).toBe(8500);

    // 2. Retrieve history audit entries
    const historyRes = await request(app)
      .get(`/api/v1/employees/${employeeRecordId}/history`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2); // initial creation + update

    const latest = historyRes.body.data[0];
    expect(latest.reason).toBe('Annual performance promotion');
    const salaryDiff = latest.diff.find((d: { field: string }) => d.field === 'salary');
    expect(salaryDiff).toBeDefined();
    expect(salaryDiff.oldValue).toContain('7500');
    expect(salaryDiff.newValue).toContain('8500');
  });
});
