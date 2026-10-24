import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { ErrorCode } from '@workforcepro/api-contracts';
import { BranchModel } from '../src/infrastructure/database/models/branch.model.js';
import { EmployeeModel } from '../src/infrastructure/database/models/employee.model.js';
import { AttendancePunchModel } from '../src/infrastructure/database/models/attendancePunch.model.js';
import { DailyAttendanceModel } from '../src/infrastructure/database/models/dailyAttendance.model.js';

const SAMPLE_VALID_SELFIE =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('Attendance Lifecycle State Machine & Multi-Tenant Security', () => {
  const app = createApp();

  // Tenant A: Quantum Dynamics
  let tokenA: string;
  let companyIdA: string;
  let branchIdA: string;
  let employeeIdA: string;
  let userIdA: string;

  // Tenant B: Nebula Cyber
  let tokenB: string;
  let companyIdB: string;
  let branchIdB: string;
  let userIdB: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // 1. Setup Tenant A
    const regA = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Quantum Dynamics',
      subdomain: 'quantum-dyn',
      contactEmail: 'admin@quantum.test',
      adminFirstName: 'Quinn',
      adminLastName: 'Owner',
      adminEmail: 'quinn@quantum.test',
      adminPassword: 'Password123!@#'
    });
    tokenA = regA.body.data.accessToken;
    companyIdA = regA.body.data.user.companyId;
    userIdA = regA.body.data.user.id;

    const branchesResA = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenA}`);
    branchIdA = branchesResA.body.data[0].id;

    await BranchModel.findOneAndUpdate(
      { _id: branchIdA, companyId: companyIdA },
      {
        latitude: 40.7128,
        longitude: -74.006,
        geofenceRadiusMeters: 150
      }
    );

    const deptResA = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Robotics', code: 'ROB' });

    const shiftResA = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Day Shift', code: 'DAY', startTime: '08:30', endTime: '17:30' });

    const empResA = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        employeeCode: 'EMP-Q1',
        userId: userIdA,
        firstName: 'Quinn',
        lastName: 'Owner',
        email: 'quinn@quantum.test',
        phone: '2125550100',
        designation: 'Managing Director',
        branchId: branchIdA,
        departmentId: deptResA.body.data.id,
        shiftId: shiftResA.body.data.id,
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        joiningDate: '2026-01-01',
        salaryDetails: {
          salaryType: 'MONTHLY',
          baseRate: 9000
        }
      });
    employeeIdA = empResA.body.data.id;

    // 2. Setup Tenant B
    const regB = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Nebula Cyber',
      subdomain: 'nebula-cyber',
      contactEmail: 'admin@nebula.test',
      adminFirstName: 'Nathan',
      adminLastName: 'Drake',
      adminEmail: 'nathan@nebula.test',
      adminPassword: 'Password123!@#'
    });
    tokenB = regB.body.data.accessToken;
    companyIdB = regB.body.data.user.companyId;
    userIdB = regB.body.data.user.id;

    const branchesResB = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${tokenB}`);
    branchIdB = branchesResB.body.data[0].id;

    await BranchModel.findOneAndUpdate(
      { _id: branchIdB, companyId: companyIdB },
      {
        latitude: 51.5074,
        longitude: -0.1278,
        geofenceRadiusMeters: 150
      }
    );

    const deptResB = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Security Operations', code: 'SOC' });

    const shiftResB = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Standard Shift', code: 'STD', startTime: '09:00', endTime: '18:00' });

    const empResB = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        employeeCode: 'EMP-N1',
        userId: userIdB,
        firstName: 'Nathan',
        lastName: 'Drake',
        email: 'nathan@nebula.test',
        phone: '442079460000',
        designation: 'Security Lead',
        branchId: branchIdB,
        departmentId: deptResB.body.data.id,
        shiftId: shiftResB.body.data.id,
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        joiningDate: '2026-01-01',
        salaryDetails: {
          salaryType: 'MONTHLY',
          baseRate: 7500
        }
      });
  });

  it('RULE 1: Should prevent duplicate Check-In when employee is already checked in', async () => {
    // 1. Initial check-in
    const firstRes = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'CHECK_IN',
        latitude: 40.7128,
        longitude: -74.006,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-t1-first'
      });
    expect(firstRes.status).toBe(201);

    // 2. Second check-in attempt on same day
    const secondRes = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'CHECK_IN',
        latitude: 40.7128,
        longitude: -74.006,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-t1-duplicate'
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe(ErrorCode.ALREADY_PUNCHED_IN);
    expect(secondRes.body.error.message).toContain('already checked in');
  });

  it('RULE 2: Should prevent Check-Out without prior Check-In on the same day', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'CHECK_OUT',
        latitude: 40.7128,
        longitude: -74.006,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-t2-invalid-checkout'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.NOT_PUNCHED_IN);
    expect(res.body.error.message).toContain('Cannot check out without prior check-in');
  });

  it('RULE 3: Should support retry without duplicate punch using idempotencyKey', async () => {
    const idempotencyKey = 'idemp-retry-consistent-key-123';

    // 1. First punch call
    const res1 = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'CHECK_IN',
        latitude: 40.7128,
        longitude: -74.006,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey
      });
    expect(res1.status).toBe(201);
    const initialPunchId = res1.body.data.id;

    // 2. Client retry with identical idempotencyKey (e.g. mobile app network timeout retry)
    const res2 = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'CHECK_IN',
        latitude: 40.7128,
        longitude: -74.006,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey
      });

    // Should return existing punch without creating another record
    expect(res2.status).toBe(201);
    expect(res2.body.data.id).toBe(initialPunchId);

    // Verify only ONE punch exists in the database
    const totalPunches = await AttendancePunchModel.countDocuments({
      companyId: companyIdA,
      idempotencyKey
    });
    expect(totalPunches).toBe(1);
  });

  it('RULE 4: Should reject punch attempt when employee status is inactive', async () => {
    // Terminate employee
    await EmployeeModel.findOneAndUpdate(
      { _id: employeeIdA, companyId: companyIdA },
      {
        employmentStatus: 'TERMINATED'
      }
    );

    const res = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'CHECK_IN',
        latitude: 40.7128,
        longitude: -74.006,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-inactive-emp'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.EMPLOYEE_NOT_ACTIVE);
    expect(res.body.error.message).toContain('TERMINATED');
  });

  it('RULE 5: Multi-Tenant Security — Strict isolation of attendance operations across tenants', async () => {
    // 1. Tenant A performs a valid check-in
    const punchA = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'CHECK_IN',
        latitude: 40.7128,
        longitude: -74.006,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-tenant-a-punch'
      });
    expect(punchA.status).toBe(201);
    const photoKeyA = punchA.body.data.photoKey;

    // 2. Tenant B requests attendance history — should NOT see Tenant A punches
    const historyB = await request(app)
      .get('/api/v1/attendance/history')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(historyB.status).toBe(200);
    expect(historyB.body.data.length).toBe(0);

    // 3. Tenant B attempts to fetch Tenant A private photo (isolated per tenant)
    const crossTenantPhotoRes = await request(app)
      .get(`/api/v1/attendance/photos/${photoKeyA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(crossTenantPhotoRes.status).toBe(404); // Properly hidden and not found in Tenant B scope

    // 4. Tenant B attempts to override Tenant A employee attendance
    const overrideRes = await request(app)
      .post('/api/v1/attendance/override')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        employeeId: employeeIdA,
        date: new Date().toISOString().slice(0, 10),
        status: 'PRESENT',
        reason: 'Malicious cross-tenant override attempt'
      });
    expect(overrideRes.status).toBe(404); // Tenant isolation hides Tenant A employee from Tenant B
  });

  it('RULE 6: Administrative override should update daily status with reason and audit trail', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const overrideRes = await request(app)
      .post('/api/v1/attendance/override')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        employeeId: employeeIdA,
        date: todayStr,
        status: 'PRESENT',
        reason: 'Employee was representing company at client headquarters',
        checkInTime: `${todayStr}T09:00:00.000Z`,
        checkOutTime: `${todayStr}T18:00:00.000Z`
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.data.status).toBe('PRESENT');

    // Verify DailyAttendance record was updated with override details
    const daily = await DailyAttendanceModel.findOne({
      companyId: companyIdA,
      employeeId: employeeIdA,
      date: todayStr
    });
    expect(daily).toBeDefined();
    expect(daily!.isOverridden).toBe(true);
    expect(daily!.overrideReason).toBe('Employee was representing company at client headquarters');
  });
});
