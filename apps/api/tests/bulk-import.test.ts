import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
describe('Bulk Employee Import & Preview Engine', () => {
  const app = createApp();
  let token: string;

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
      adminFirstName: 'Adam',
      adminLastName: 'Apex',
      adminEmail: 'adam@apex.test',
      adminPassword: 'Password123!@#'
    });
    token = reg.body.data.accessToken;

    // 2. Setup Branch, Department, Shift
    await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'MAIN-01', name: 'Main Hub', city: 'Chicago', country: 'US' });

    await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fleet Operations', code: 'FLEET' });

    await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'General', code: 'GEN', startTime: '08:00', endTime: '17:00' });

    // 3. Insert an existing employee in DB to test DB duplicate detection
    await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeCode: 'EXIST-01',
        firstName: 'Existing',
        lastName: 'Member',
        email: 'exist@apex.test',
        phone: '1234567890',
        joiningDate: '2026-01-01',
        designation: 'Dispatcher',
        departmentId: (
          await request(app).get('/api/v1/departments').set('Authorization', `Bearer ${token}`)
        ).body.data[0].id,
        branchId: (
          await request(app).get('/api/v1/branches').set('Authorization', `Bearer ${token}`)
        ).body.data[0].id,
        shiftId: (await request(app).get('/api/v1/shifts').set('Authorization', `Bearer ${token}`))
          .body.data[0].id
      });
  });

  it('should generate a comprehensive validation preview and error report for invalid batches', async () => {
    const rawBatch = [
      // Row 1: Valid row
      {
        employeeCode: 'EMP-101',
        firstName: 'Tom',
        lastName: 'Brown',
        email: 'tom@apex.test',
        phone: '5551112222',
        designation: 'Driver',
        departmentCode: 'FLEET',
        branchCode: 'MAIN-01',
        shiftCode: 'GEN',
        joiningDate: '2026-03-01',
        salaryType: 'DAILY',
        baseRate: 200
      },
      // Row 2: In-file duplicate employeeCode (duplicates Row 1)
      {
        employeeCode: 'EMP-101',
        firstName: 'Copy',
        lastName: 'Cat',
        email: 'copy@apex.test',
        phone: '5551113333',
        designation: 'Driver',
        departmentCode: 'FLEET',
        branchCode: 'MAIN-01',
        shiftCode: 'GEN'
      },
      // Row 3: DB duplicate employeeCode (EXIST-01 already in DB)
      {
        employeeCode: 'EXIST-01',
        firstName: 'Clone',
        lastName: 'User',
        email: 'clone@apex.test',
        phone: '5551114444',
        designation: 'Driver',
        departmentCode: 'FLEET',
        branchCode: 'MAIN-01',
        shiftCode: 'GEN'
      },
      // Row 4: Non-existent department code
      {
        employeeCode: 'EMP-104',
        firstName: 'Anna',
        lastName: 'Taylor',
        email: 'anna@apex.test',
        phone: '5551115555',
        designation: 'Analyst',
        departmentCode: 'NON_EXISTENT_DEPT',
        branchCode: 'MAIN-01',
        shiftCode: 'GEN'
      }
    ];

    const previewRes = await request(app)
      .post('/api/v1/employees/import/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: rawBatch });

    expect(previewRes.status).toBe(200);
    const data = previewRes.body.data;
    expect(data.totalRows).toBe(4);
    expect(data.validCount).toBe(1);
    expect(data.errorCount).toBe(3);
    expect(data.canCommit).toBe(false);

    // Verify error report details
    expect(
      data.errors.some(
        (e: { rowNumber: number; message: string }) =>
          e.rowNumber === 2 && e.message.includes('Duplicate employee code')
      )
    ).toBe(true);
    expect(
      data.errors.some(
        (e: { rowNumber: number; message: string }) =>
          e.rowNumber === 3 && e.message.includes('already exists in company database')
      )
    ).toBe(true);
    expect(
      data.errors.some(
        (e: { rowNumber: number; message: string }) =>
          e.rowNumber === 4 && e.message.includes('Department code')
      )
    ).toBe(true);
  });

  it('should successfully commit valid import rows and create employee records', async () => {
    const validBatch = [
      {
        employeeCode: 'BULK-001',
        firstName: 'Liam',
        lastName: 'Miller',
        email: 'liam@apex.test',
        phone: '5558881111',
        designation: 'Fleet Coordinator',
        departmentCode: 'FLEET',
        branchCode: 'MAIN-01',
        shiftCode: 'GEN',
        joiningDate: '2026-03-10',
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        salaryType: 'MONTHLY',
        baseRate: 6000
      },
      {
        employeeCode: 'BULK-002',
        firstName: 'Sophia',
        lastName: 'Davis',
        email: 'sophia@apex.test',
        phone: '5558882222',
        designation: 'Fleet Specialist',
        departmentCode: 'FLEET',
        branchCode: 'MAIN-01',
        shiftCode: 'GEN',
        joiningDate: '2026-03-15',
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        salaryType: 'MONTHLY',
        baseRate: 6200
      }
    ];

    // 1. Preview returns canCommit: true
    const previewRes = await request(app)
      .post('/api/v1/employees/import/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: validBatch });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.canCommit).toBe(true);
    expect(previewRes.body.data.validCount).toBe(2);

    // 2. Commit import
    const commitRes = await request(app)
      .post('/api/v1/employees/import/commit')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: validBatch });
    expect(commitRes.status).toBe(201);
    expect(commitRes.body.data.importedCount).toBe(2);
    expect(commitRes.body.data.createdEmployees.length).toBe(2);

    // 3. Verify employees exist in directory
    const listRes = await request(app)
      .get('/api/v1/employees?search=Miller')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].employeeCode).toBe('BULK-001');
  });
});
