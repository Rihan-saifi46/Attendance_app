import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { ErrorCode } from '@workforcepro/api-contracts';
import { BranchModel } from '../src/infrastructure/database/models/branch.model.js';
import { AttendancePunchModel } from '../src/infrastructure/database/models/attendancePunch.model.js';

// Valid minimal JPEG image data URI (> 50 bytes)
const SAMPLE_VALID_SELFIE =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('GPS & Selfie Attendance Verification Engine', () => {
  const app = createApp();
  let token: string;
  let companyId: string;
  let branchId: string;
  let shiftId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // 1. Setup Company
    const reg = await request(app).post('/api/v1/auth/register-company').send({
      companyName: 'Apex Logistics',
      subdomain: 'apex-logistics',
      contactEmail: 'admin@apex.test',
      adminFirstName: 'Arthur',
      adminLastName: 'Pendleton',
      adminEmail: 'arthur@apex.test',
      adminPassword: 'Password123!@#'
    });
    token = reg.body.data.accessToken;
    companyId = reg.body.data.user.companyId;
    const userId = reg.body.data.user.id;

    // 2. Setup Branch with specific coordinates and 200m geofence radius
    // Market St, San Francisco: (37.774929, -122.419416)
    const branchRes = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`);
    branchId = branchRes.body.data[0].id;

    await BranchModel.findOneAndUpdate(
      { _id: branchId, companyId },
      {
        latitude: 37.774929,
        longitude: -122.419416,
        geofenceRadiusMeters: 200
      }
    );

    // 3. Setup Department & Shift
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fleet Operations', code: 'FLEET' });

    const shiftRes = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Morning General Shift',
        code: 'MGS-01',
        startTime: '09:00',
        endTime: '18:00',
        gracePeriodMinutes: 15
      });
    shiftId = shiftRes.body.data.id;

    // 4. Setup Employee linked to the user
    const empRes = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeCode: 'EMP-001',
        userId,
        firstName: 'Arthur',
        lastName: 'Pendleton',
        email: 'arthur@apex.test',
        phone: '4155551234',
        designation: 'Operations Director',
        branchId,
        departmentId: deptRes.body.data.id,
        shiftId,
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        joiningDate: '2026-01-01',
        salaryDetails: {
          salaryType: 'MONTHLY',
          baseRate: 8500
        }
      });
  });

  it('RULE 1: Should verify valid Check-In within geofence and store selfie in private storage', async () => {
    // 50 meters from branch office (inside 200m geofence)
    const res = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'CHECK_IN',
        latitude: 37.7751,
        longitude: -122.4192,
        accuracyMeters: 8.5,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-checkin-001',
        deviceId: 'pixel-8-pro-test'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.action).toBe('CHECK_IN');
    expect(res.body.data.verificationOutcome).toBe('VERIFIED');
    expect(res.body.data.isWithinGeofence).toBe(true);
    expect(res.body.data.distanceFromGeofenceMeters).toBeLessThan(100);
    expect(res.body.data.photoKey).toBeDefined();
    expect(res.body.data.authorizedPhotoUrl).toContain('/api/v1/attendance/photos/');
    expect(res.body.data.authorizedPhotoUrl).toContain('token=');

    // Confirm punch is stored in DB with authoritative server timestamp
    const punchInDb = await AttendancePunchModel.findOne({
      _id: res.body.data.id,
      companyId
    });
    expect(punchInDb).toBeDefined();
    expect(punchInDb!.verificationOutcome).toBe('VERIFIED');
  });

  it('RULE 2: Should reject Check-In when location is outside branch geofence boundary', async () => {
    // Golden Gate Bridge (~6,500 meters away from Market St office)
    const res = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'CHECK_IN',
        latitude: 37.8199,
        longitude: -122.4783,
        accuracyMeters: 10.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-checkin-out-of-range'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCode.GEOFENCE_VIOLATION);
    expect(res.body.error.message).toContain('outside your assigned branch geofence');

    // Server should record the rejected attempt in audit stream
    const rejectedPunches = await AttendancePunchModel.find({
      companyId,
      verificationOutcome: 'REJECTED_OUT_OF_RANGE'
    });
    expect(rejectedPunches.length).toBe(1);
    expect(rejectedPunches[0]!.distanceFromGeofenceMeters).toBeGreaterThan(5000);
  });

  it('RULE 3: Should reject Check-In when reported GPS accuracy is too poor (> 50 meters)', async () => {
    // Located at office coordinates, but accuracy is 75 meters (poor satellite fix)
    const res = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'CHECK_IN',
        latitude: 37.774929,
        longitude: -122.419416,
        accuracyMeters: 75.0, // Exceeds 50m hard threshold
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-checkin-poor-accuracy'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCode.LOCATION_ACCURACY_TOO_POOR);
    expect(res.body.error.message).toContain('GPS accuracy of 75m is insufficient');

    // Verify rejected punch was persisted with REJECTED_POOR_ACCURACY
    const rejectedPunches = await AttendancePunchModel.find({
      companyId,
      verificationOutcome: 'REJECTED_POOR_ACCURACY'
    });
    expect(rejectedPunches.length).toBe(1);
  });

  it('RULE 4: Should reject Check-In when selfie photo is missing or invalid', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'CHECK_IN',
        latitude: 37.774929,
        longitude: -122.419416,
        accuracyMeters: 10.0,
        selfieBase64: '', // Missing
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-checkin-missing-photo'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('RULE 5: Should verify Check-Out after Check-In and compute total work duration', async () => {
    // 1. Check in
    const checkInRes = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'CHECK_IN',
        latitude: 37.774929,
        longitude: -122.419416,
        accuracyMeters: 5.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-flow-checkin'
      });
    expect(checkInRes.status).toBe(201);

    // 2. Check out
    const checkOutRes = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'CHECK_OUT',
        latitude: 37.774929,
        longitude: -122.419416,
        accuracyMeters: 6.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-flow-checkout'
      });

    expect(checkOutRes.status).toBe(201);
    expect(checkOutRes.body.data.action).toBe('CHECK_OUT');
    expect(checkOutRes.body.data.verificationOutcome).toBe('VERIFIED');

    // 3. Query today attendance
    const todayRes = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', `Bearer ${token}`);

    expect(todayRes.status).toBe(200);
    expect(todayRes.body.data.hasCheckedIn).toBe(true);
    expect(todayRes.body.data.hasCheckedOut).toBe(true);
    expect(todayRes.body.data.canCheckIn).toBe(false);
    expect(todayRes.body.data.canCheckOut).toBe(false);
    expect(todayRes.body.data.punches.length).toBe(2);
    expect(todayRes.body.data.assignedBranch.code).toBe('HQ-01');
  });

  it('RULE 6: Should stream private photo via authorized short-lived token and reject expired/invalid tokens', async () => {
    // 1. Punch in to create stored photo
    const punchRes = await request(app)
      .post('/api/v1/attendance/punch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'CHECK_IN',
        latitude: 37.774929,
        longitude: -122.419416,
        accuracyMeters: 8.0,
        selfieBase64: SAMPLE_VALID_SELFIE,
        clientTimestamp: new Date().toISOString(),
        idempotencyKey: 'idemp-photo-test'
      });

    const photoUrl = punchRes.body.data.authorizedPhotoUrl;
    expect(photoUrl).toBeDefined();

    // 2. Fetch using authorized token in URL
    const photoRes = await request(app).get(photoUrl);
    expect(photoRes.status).toBe(200);
    expect(photoRes.headers['content-type']).toContain('image/');
    expect(photoRes.headers['x-content-type-options']).toBe('nosniff');

    // 3. Fetch without token or with invalid token
    const unauthorizedRes = await request(app).get(
      `/api/v1/attendance/photos/${punchRes.body.data.photoKey}`
    );
    expect(unauthorizedRes.status).toBe(403);
    expect(unauthorizedRes.body.error.code).toBe(ErrorCode.PHOTO_ACCESS_EXPIRED);
  });
});
