import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { ErrorCode } from '@workforcepro/api-contracts';

describe('Departments & Shifts Management', () => {
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

    // Register Company A
    const regA = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Alpha Tech',
      subdomain: 'alpha-tech',
      contactEmail: 'admin@alpha.test',
      adminFirstName: 'Alice',
      adminLastName: 'Admin',
      adminEmail: 'alice@alpha.test',
      adminPassword: 'Password123!@#'
    });
    tokenA = regA.body.data.accessToken;
    companyAId = regA.body.data.user.companyId;

    // Register Company B
    const regB = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Beta Dynamics',
      subdomain: 'beta-dyn',
      contactEmail: 'admin@beta.test',
      adminFirstName: 'Bob',
      adminLastName: 'Beta',
      adminEmail: 'bob@beta.test',
      adminPassword: 'Password123!@#'
    });
    tokenB = regB.body.data.accessToken;
    companyBId = regB.body.data.user.companyId;
  });

  it('should create departments and enforce unique department code per company', async () => {
    // 1. Create Department in Company A
    const res1 = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Engineering',
        code: 'eng'
      });
    expect(res1.status).toBe(201);
    expect(res1.body.data.code).toBe('ENG');
    expect(res1.body.data.name).toBe('Engineering');
    expect(res1.body.data.companyId).toBe(companyAId);

    // 2. Reject duplicate code in Company A (case-insensitive)
    const dupRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Software Engineering',
        code: 'ENG'
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe(ErrorCode.DUPLICATE_DEPARTMENT_CODE);

    // 3. Allow same code in Company B (isolated namespace)
    const bRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: 'Engineering Division',
        code: 'ENG'
      });
    expect(bRes.status).toBe(201);
    expect(bRes.body.data.companyId).toBe(companyBId);
  });

  it('should create configurable shifts with weekly offs and timing thresholds', async () => {
    // 1. Create Shift in Company A
    const shiftRes = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'General Morning Shift',
        code: 'mgs-01',
        startTime: '09:00',
        endTime: '18:00',
        breakDurationMinutes: 60,
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayThresholdHours: 8.0,
        workDays: [1, 2, 3, 4, 5],
        weeklyOffs: [6, 7]
      });
    expect(shiftRes.status).toBe(201);
    expect(shiftRes.body.data.code).toBe('MGS-01');
    expect(shiftRes.body.data.weeklyOffs).toEqual([6, 7]);
    expect(shiftRes.body.data.gracePeriodMinutes).toBe(15);
    expect(shiftRes.body.data.companyId).toBe(companyAId);

    // 2. Reject duplicate shift code in Company A
    const dupShift = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Another Shift',
        code: 'MGS-01',
        startTime: '10:00',
        endTime: '19:00'
      });
    expect(dupShift.status).toBe(409);
    expect(dupShift.body.error.code).toBe(ErrorCode.DUPLICATE_SHIFT_CODE);

    // 3. List shifts in Company A returns only Company A shifts
    const listRes = await request(app)
      .get('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].code).toBe('MGS-01');

    // 4. Company B has 0 shifts initially
    const listB = await request(app).get('/api/v1/shifts').set('Authorization', `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    expect(listB.body.data.length).toBe(0);
  });
});
