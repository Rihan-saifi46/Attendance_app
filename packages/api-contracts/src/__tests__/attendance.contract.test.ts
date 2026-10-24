import { describe, it, expect } from 'vitest';
import {
  attendancePunchInputSchema,
  attendancePunchDtoSchema,
  todayAttendanceDtoSchema,
  attendanceOverrideInputSchema,
  ErrorCode
} from '../index.js';

describe('Attendance API Contracts', () => {
  it('should validate a valid punch in request payload', () => {
    const validPayload = {
      action: 'CHECK_IN' as const,
      latitude: 37.7749,
      longitude: -122.4194,
      accuracyMeters: 12.5,
      selfieBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAA...',
      clientTimestamp: '2026-10-24T09:00:00.000Z',
      idempotencyKey: 'idemp-uuid-12345678',
      deviceId: 'device-test-android-01'
    };

    const parsed = attendancePunchInputSchema.parse(validPayload);
    expect(parsed.action).toBe('CHECK_IN');
    expect(parsed.accuracyMeters).toBe(12.5);
    expect(parsed.idempotencyKey).toBe('idemp-uuid-12345678');
  });

  it('should reject invalid coordinates and missing idempotency keys', () => {
    expect(() =>
      attendancePunchInputSchema.parse({
        action: 'CHECK_IN',
        latitude: 105, // Invalid: > 90
        longitude: -122.4194,
        accuracyMeters: 10,
        selfieBase64: 'sampledata',
        clientTimestamp: '2026-10-24T09:00:00.000Z',
        idempotencyKey: 'idemp-key-valid'
      })
    ).toThrow();

    expect(() =>
      attendancePunchInputSchema.parse({
        action: 'CHECK_IN',
        latitude: 37.7749,
        longitude: -122.4194,
        accuracyMeters: -5, // Invalid: < 0
        selfieBase64: 'sampledata',
        clientTimestamp: '2026-10-24T09:00:00.000Z',
        idempotencyKey: 'idemp-key-valid'
      })
    ).toThrow();

    expect(() =>
      attendancePunchInputSchema.parse({
        action: 'CHECK_IN',
        latitude: 37.7749,
        longitude: -122.4194,
        accuracyMeters: 10,
        selfieBase64: '', // Missing
        clientTimestamp: '2026-10-24T09:00:00.000Z',
        idempotencyKey: 'idemp-key-valid'
      })
    ).toThrow();
  });

  it('should parse attendance punch DTO and today attendance status', () => {
    const dto = attendancePunchDtoSchema.parse({
      id: 'punch-1',
      companyId: 'comp-1',
      employeeId: 'emp-1',
      employeeCode: 'EMP-001',
      employeeName: 'Sarah Connor',
      branchId: 'branch-1',
      branchName: 'Headquarters',
      action: 'CHECK_IN',
      serverTimestamp: '2026-10-24T09:01:00.000Z',
      clientTimestamp: '2026-10-24T09:00:58.000Z',
      clockSkewSeconds: 2,
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracyMeters: 8
      },
      distanceFromGeofenceMeters: 15.2,
      isWithinGeofence: true,
      verificationOutcome: 'VERIFIED',
      photoKey: 'photo-uuid-1',
      authorizedPhotoUrl: '/api/v1/attendance/photos/photo-uuid-1?token=sample',
      isOverridden: false,
      createdAt: '2026-10-24T09:01:00.000Z'
    });

    expect(dto.verificationOutcome).toBe('VERIFIED');
    expect(dto.isWithinGeofence).toBe(true);

    const todayDto = todayAttendanceDtoSchema.parse({
      date: '2026-10-24',
      status: 'CHECKED_IN',
      hasCheckedIn: true,
      hasCheckedOut: false,
      canCheckIn: false,
      canCheckOut: true,
      checkInTime: '2026-10-24T09:01:00.000Z',
      checkOutTime: null,
      totalWorkMinutes: 0,
      punches: [dto],
      assignedBranch: {
        id: 'branch-1',
        name: 'Headquarters',
        code: 'HQ-01',
        latitude: 37.7749,
        longitude: -122.4194,
        geofenceRadiusMeters: 200
      }
    });

    expect(todayDto.canCheckOut).toBe(true);
    expect(todayDto.canCheckIn).toBe(false);
  });

  it('should validate admin override input and export error codes', () => {
    const override = attendanceOverrideInputSchema.parse({
      employeeId: 'emp-1',
      date: '2026-10-23',
      status: 'PRESENT',
      reason: 'Employee on approved client site visit',
      checkInTime: '2026-10-23T09:00:00.000Z',
      checkOutTime: '2026-10-23T18:00:00.000Z'
    });

    expect(override.status).toBe('PRESENT');
    expect(ErrorCode.GEOFENCE_VIOLATION).toBe('GEOFENCE_VIOLATION');
    expect(ErrorCode.LOCATION_ACCURACY_TOO_POOR).toBe('LOCATION_ACCURACY_TOO_POOR');
    expect(ErrorCode.MISSING_ATTENDANCE_PHOTO).toBe('MISSING_ATTENDANCE_PHOTO');
    expect(ErrorCode.INVALID_ATTENDANCE_TRANSITION).toBe('INVALID_ATTENDANCE_TRANSITION');
  });
});
