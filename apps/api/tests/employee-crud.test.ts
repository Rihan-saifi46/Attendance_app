import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './testHelper.js';
import { ErrorCode } from '@workforcepro/api-contracts';

describe('Employee Profiles & Directory CRUD', () => {
  const app = createApp();
  let token: string;
  let branchId: string;
  let departmentId: string;
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
      companyName: 'Omega Technologies',
      subdomain: 'omega-tech',
      contactEmail: 'admin@omega.test',
      adminFirstName: 'Olivia',
      adminLastName: 'Owner',
      adminEmail: 'olivia@omega.test',
      adminPassword: 'Password123!@#'
    });
    token = reg.body.data.accessToken;

    // 2. Setup Branch (retrieve default HQ branch created on registration)
    const branchListRes = await request(app)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`);
    branchId = branchListRes.body.data[0].id;

    // 3. Setup Department
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Product Engineering',
        code: 'ENG'
      });
    departmentId = deptRes.body.data.id;

    // 4. Setup Shift
    const shiftRes = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'General Shift',
        code: 'GEN',
        startTime: '09:00',
        endTime: '18:00'
      });
    shiftId = shiftRes.body.data.id;
  });

  it('should create an employee profile and enforce unique employeeCode and email', async () => {
    // 1. Create Manager Employee
    const emp1 = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeCode: 'emp-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@omega.test',
        phone: '+1-555-0101',
        joiningDate: '2026-01-01',
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        designation: 'Engineering Manager',
        departmentId,
        branchId,
        shiftId,
        salaryDetails: {
          salaryType: 'MONTHLY',
          baseRate: 9500
        }
      });
    expect(emp1.status).toBe(201);
    expect(emp1.body.data.employeeCode).toBe('EMP-001');
    expect(emp1.body.data.salaryDetails?.salaryType).toBe('MONTHLY');
    expect(emp1.body.data.salaryDetails?.baseRate).toBe(9500);
    const managerId = emp1.body.data.id;

    // 2. Create Reportee with managerId
    const emp2 = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeCode: 'EMP-002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@omega.test',
        phone: '+1-555-0102',
        joiningDate: '2026-02-01',
        designation: 'Frontend Engineer',
        departmentId,
        branchId,
        shiftId,
        managerId,
        salaryDetails: {
          salaryType: 'HOURLY',
          baseRate: 50
        }
      });
    expect(emp2.status).toBe(201);
    expect(emp2.body.data.managerId).toBe(managerId);

    // 3. Reject duplicate employeeCode
    const dupCode = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeCode: 'EMP-001',
        firstName: 'Duplicate',
        lastName: 'Code',
        email: 'other@omega.test',
        phone: '+1-555-0199',
        joiningDate: '2026-03-01',
        designation: 'QA Engineer',
        departmentId,
        branchId,
        shiftId
      });
    expect(dupCode.status).toBe(409);
    expect(dupCode.body.error.code).toBe(ErrorCode.DUPLICATE_EMPLOYEE_CODE);

    // 4. Reject duplicate email
    const dupEmail = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeCode: 'EMP-003',
        firstName: 'Duplicate',
        lastName: 'Email',
        email: 'john.doe@omega.test',
        phone: '+1-555-0199',
        joiningDate: '2026-03-01',
        designation: 'QA Engineer',
        departmentId,
        branchId,
        shiftId
      });
    expect(dupEmail.status).toBe(409);
    expect(dupEmail.body.error.code).toBe(ErrorCode.USER_ALREADY_EXISTS);
  });

  it('should prevent circular reporting manager loops (employee reporting to themselves)', async () => {
    // 1. Create an employee
    const emp = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeCode: 'EMP-100',
        firstName: 'Self',
        lastName: 'Report',
        email: 'self@omega.test',
        phone: '+1-555-0155',
        joiningDate: '2026-01-01',
        designation: 'DevOps Engineer',
        departmentId,
        branchId,
        shiftId
      });
    expect(emp.status).toBe(201);
    const empId = emp.body.data.id;

    // 2. Attempt to update managerId to own ID
    const circularRes = await request(app)
      .patch(`/api/v1/employees/${empId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        managerId: empId
      });
    expect(circularRes.status).toBe(400);
    expect(circularRes.body.error.code).toBe(ErrorCode.CIRCULAR_REPORTING_MANAGER);
  });

  it('should support search, filtering, and pagination over employee directory', async () => {
    // Populate 3 employees
    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employeeCode: `EMP-0${i}0`,
          firstName: i === 1 ? 'Charlie' : i === 2 ? 'David' : 'Emma',
          lastName: 'Worker',
          email: `worker${i}@omega.test`,
          phone: `+1-555-000${i}`,
          joiningDate: `2026-0${i}-01`,
          designation: i === 1 ? 'Backend' : 'Frontend',
          employmentStatus: i === 3 ? 'PROBATION' : 'ACTIVE',
          departmentId,
          branchId,
          shiftId
        });
    }

    // Search by name
    const searchRes = await request(app)
      .get('/api/v1/employees?search=Charlie')
      .set('Authorization', `Bearer ${token}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].firstName).toBe('Charlie');

    // Filter by status
    const filterRes = await request(app)
      .get('/api/v1/employees?employmentStatus=PROBATION')
      .set('Authorization', `Bearer ${token}`);
    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data.length).toBe(1);
    expect(filterRes.body.data[0].firstName).toBe('Emma');

    // Pagination: page 1 limit 2
    const paginatedRes = await request(app)
      .get('/api/v1/employees?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(paginatedRes.status).toBe(200);
    expect(paginatedRes.body.data.length).toBe(2);
    expect(paginatedRes.body.meta.total).toBe(3);
    expect(paginatedRes.body.meta.totalPages).toBe(2);
    expect(paginatedRes.body.meta.hasNextPage).toBe(true);
  });
});
