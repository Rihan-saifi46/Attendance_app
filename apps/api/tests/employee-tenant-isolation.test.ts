import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { ErrorCode } from '@workforcepro/api-contracts';

describe('Employee Multi-Tenant Isolation Enforcement', () => {
  const app = createApp();
  let tokenA: string;
  let branchAId: string;
  let deptAId: string;
  let shiftAId: string;

  let tokenB: string;
  let branchBId: string;
  let deptBId: string;
  let shiftBId: string;
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
      companyName: 'Alpha Corp',
      subdomain: 'alpha-corp',
      contactEmail: 'admin@alpha.test',
      adminFirstName: 'Alice',
      adminLastName: 'Alpha',
      adminEmail: 'alice@alpha.test',
      adminPassword: 'Password123!@#'
    });
    tokenA = regA.body.data.accessToken;

    const bA = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ code: 'A-HQ', name: 'Alpha HQ', city: 'Boston', country: 'US' });
    branchAId = bA.body.data.id;

    const dA = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Alpha Eng', code: 'A-ENG' });
    deptAId = dA.body.data.id;

    const sA = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Alpha Day', code: 'A-DAY', startTime: '09:00', endTime: '17:00' });
    shiftAId = sA.body.data.id;

    await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        employeeCode: 'EMP-A01',
        firstName: 'Arthur',
        lastName: 'Alpha',
        email: 'arthur@alpha.test',
        phone: '1112223333',
        joiningDate: '2026-01-01',
        designation: 'Engineer',
        departmentId: deptAId,
        branchId: branchAId,
        shiftId: shiftAId,
        salaryDetails: { salaryType: 'MONTHLY', baseRate: 10000 }
      });

    // 2. Setup Company B (Beta LLC)
    const regB = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Beta LLC',
      subdomain: 'beta-llc',
      contactEmail: 'admin@beta.test',
      adminFirstName: 'Bob',
      adminLastName: 'Beta',
      adminEmail: 'bob@beta.test',
      adminPassword: 'Password123!@#'
    });
    tokenB = regB.body.data.accessToken;

    const bB = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ code: 'B-HQ', name: 'Beta HQ', city: 'Seattle', country: 'US' });
    branchBId = bB.body.data.id;

    const dB = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Beta Ops', code: 'B-OPS' });
    deptBId = dB.body.data.id;

    const sB = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Beta Night', code: 'B-NIGHT', startTime: '22:00', endTime: '06:00' });
    shiftBId = sB.body.data.id;

    const empB = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        employeeCode: 'EMP-B01',
        firstName: 'Beatrice',
        lastName: 'Beta',
        email: 'beatrice@beta.test',
        phone: '4445556666',
        joiningDate: '2026-01-01',
        designation: 'Supervisor',
        departmentId: deptBId,
        branchId: branchBId,
        shiftId: shiftBId,
        salaryDetails: { salaryType: 'MONTHLY', baseRate: 15000 }
      });
    employeeBId = empB.body.data.id;
  });

  it('should prevent User A from reading Company B employee by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/employees/${employeeBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.EMPLOYEE_NOT_FOUND);
  });

  it('should prevent User A from updating Company B employee profile', async () => {
    const res = await request(app)
      .patch(`/api/v1/employees/${employeeBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        designation: 'Hacked Title'
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.EMPLOYEE_NOT_FOUND);
  });

  it('should prevent Company A from linking an employee to Company B department or branch', async () => {
    // Attempt to create Company A employee referencing Company B department
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        employeeCode: 'EMP-A02',
        firstName: 'Cross',
        lastName: 'Tenant',
        email: 'cross@alpha.test',
        phone: '9998887777',
        joiningDate: '2026-01-01',
        designation: 'Specialist',
        departmentId: deptBId, // Belongs to Company B!
        branchId: branchAId,
        shiftId: shiftAId
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.DEPARTMENT_NOT_FOUND);
  });

  it('should prevent User A from reading Company B employee history', async () => {
    const res = await request(app)
      .get(`/api/v1/employees/${employeeBId}/history`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.EMPLOYEE_NOT_FOUND);
  });

  it('should guarantee directory queries strictly isolate records between tenants', async () => {
    const resA = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.data.length).toBe(1);
    expect(resA.body.data[0].employeeCode).toBe('EMP-A01');

    const resB = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.data.length).toBe(1);
    expect(resB.body.data[0].employeeCode).toBe('EMP-B01');
  });
});
