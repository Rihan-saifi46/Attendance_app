import { describe, it, expect } from 'vitest';
import {
  createDepartmentSchema,
  createShiftSchema,
  createEmployeeSchema,
  employeeImportRowSchema
} from '../v1/organization/index.js';

describe('Organization Contracts Specification', () => {
  it('should validate valid department input', () => {
    const valid = createDepartmentSchema.safeParse({
      name: 'Engineering',
      code: 'eng'
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.code).toBe('ENG');
    }
  });

  it('should validate valid shift configuration with weekly offs', () => {
    const valid = createShiftSchema.safeParse({
      name: 'General Day Shift',
      code: 'gen-01',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      gracePeriodMinutes: 15,
      workDays: [1, 2, 3, 4, 5],
      weeklyOffs: [6, 7]
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.code).toBe('GEN-01');
      expect(valid.data.weeklyOffs).toEqual([6, 7]);
    }
  });

  it('should reject invalid shift times', () => {
    const invalid = createShiftSchema.safeParse({
      name: 'Bad Shift',
      code: 'BAD-01',
      startTime: '25:99',
      endTime: '18:00'
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate employee creation input with salary details', () => {
    const valid = createEmployeeSchema.safeParse({
      employeeCode: 'emp-001',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@company.com',
      phone: '+1-555-0199',
      joiningDate: '2026-01-15',
      designation: 'Staff Engineer',
      departmentId: 'dept-123',
      branchId: 'branch-123',
      shiftId: 'shift-123',
      salaryDetails: {
        salaryType: 'MONTHLY',
        baseRate: 8500
      }
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.employeeCode).toBe('EMP-001');
      expect(valid.data.salaryDetails?.salaryType).toBe('MONTHLY');
    }
  });

  it('should validate import rows and detect invalid emails or codes', () => {
    const validRow = employeeImportRowSchema.safeParse({
      employeeCode: 'emp-002',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@company.com',
      phone: '1234567890',
      designation: 'Developer',
      departmentCode: 'eng',
      branchCode: 'hq',
      shiftCode: 'gen',
      joiningDate: '2026-02-01',
      salaryType: 'HOURLY',
      baseRate: 45
    });
    expect(validRow.success).toBe(true);
    if (validRow.success) {
      expect(validRow.data.employeeCode).toBe('EMP-002');
      expect(validRow.data.departmentCode).toBe('ENG');
    }

    const invalidRow = employeeImportRowSchema.safeParse({
      employeeCode: '',
      email: 'not-an-email'
    });
    expect(invalidRow.success).toBe(false);
  });
});
