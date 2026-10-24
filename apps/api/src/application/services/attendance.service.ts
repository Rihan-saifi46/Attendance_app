import mongoose from 'mongoose';
import {
  AttendancePunchInput,
  AttendancePunchDto,
  TodayAttendanceDto,
  AttendanceHistoryQuery,
  AttendanceOverrideInput,
  ErrorCode,
  AuditAction,
  UserRole,
  UserRoleType
} from '@workforcepro/api-contracts';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import {
  AttendancePunchModel,
  IAttendancePunch
} from '../../infrastructure/database/models/attendancePunch.model.js';
import { DailyAttendanceModel } from '../../infrastructure/database/models/dailyAttendance.model.js';
import { EmployeeModel, IEmployee } from '../../infrastructure/database/models/employee.model.js';
import { BranchModel, IBranch } from '../../infrastructure/database/models/branch.model.js';
import { ShiftModel } from '../../infrastructure/database/models/shift.model.js';
import { storageService } from '../../infrastructure/storage/storage.service.js';
import { GeofenceService } from './geofence.service.js';
import { logAuditEvent } from '../../infrastructure/security/audit.service.js';

export class AttendanceService {
  /**
   * Records an attendance punch with geofence verification, selfie validation, and idempotency controls.
   */
  async recordPunch(
    companyId: string,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    input: AttendancePunchInput,
    ip?: string
  ): Promise<AttendancePunchDto> {
    // 1. Idempotency check: Return existing punch if retried with same idempotencyKey
    const existingPunch = await AttendancePunchModel.findOne({
      companyId,
      idempotencyKey: input.idempotencyKey
    });

    if (existingPunch) {
      return this.mapToPunchDto(existingPunch, companyId);
    }

    // 2. Resolve employee profile from userId
    const employee = await this.resolveEmployee(companyId, requestingUser.userId);
    if (!employee) {
      throw new AppError(
        404,
        ErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee profile not found in authorized company scope'
      );
    }

    // Validate employee active status
    if (employee.employmentStatus !== 'ACTIVE' && employee.employmentStatus !== 'PROBATION') {
      throw new AppError(
        403,
        ErrorCode.EMPLOYEE_NOT_ACTIVE,
        `Employee status is '${employee.employmentStatus}'. Attendance can only be recorded for active employees.`
      );
    }

    // 3. Resolve assigned branch and geofence configuration
    const branch = await BranchModel.findOne({
      _id: employee.branchId,
      companyId,
      isDeleted: false
    });

    if (!branch) {
      throw new AppError(
        404,
        ErrorCode.BRANCH_NOT_FOUND,
        'Assigned branch for employee was not found or has been deactivated'
      );
    }

    // Authoritative server timestamp (NTP synchronized backend clock)
    const serverTimestamp = new Date();
    const clientTimestamp = new Date(input.clientTimestamp);
    const clockSkewSeconds = Math.round(
      Math.abs(serverTimestamp.getTime() - clientTimestamp.getTime()) / 1000
    );

    const dateStr = serverTimestamp.toISOString().slice(0, 10);
    const retentionExpiresAt = new Date(serverTimestamp.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    // 4. Validate and save selfie in private object storage
    const storedPhoto = await storageService.validateAndSaveSelfie(
      companyId,
      input.selfieBase64,
      dateStr
    );

    // 5. Evaluate GPS & Geofence
    const branchLat = typeof branch.latitude === 'number' ? branch.latitude : 37.7749;
    const branchLon = typeof branch.longitude === 'number' ? branch.longitude : -122.4194;
    const branchRadius =
      typeof branch.geofenceRadiusMeters === 'number' ? branch.geofenceRadiusMeters : 200;

    const geoResult = GeofenceService.evaluateGeofence(
      input.latitude,
      input.longitude,
      input.accuracyMeters,
      branchLat,
      branchLon,
      branchRadius
    );

    // Rejection 5A: Accuracy is too poor (> 50m)
    if (!geoResult.isAccuracySufficient) {
      await this.saveRejectedPunch({
        companyId,
        employeeId: employee._id,
        userId: new mongoose.Types.ObjectId(requestingUser.userId),
        action: input.action,
        serverTimestamp,
        clientTimestamp,
        clockSkewSeconds,
        coordinates: {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters
        },
        branchId: branch._id,
        shiftId: employee.shiftId,
        distanceFromGeofenceMeters: geoResult.distanceMeters,
        isWithinGeofence: false,
        verificationOutcome: 'REJECTED_POOR_ACCURACY',
        photoKey: storedPhoto.photoKey,
        photoHash: storedPhoto.photoHash,
        deviceId: input.deviceId,
        idempotencyKey: input.idempotencyKey,
        rejectionReason: `Reported GPS accuracy of ${input.accuracyMeters}m exceeds maximum allowable threshold of 50m`,
        retentionExpiresAt
      });

      await logAuditEvent({
        companyId,
        userId: requestingUser.userId,
        userEmail: requestingUser.email,
        userRole: requestingUser.role,
        action: AuditAction.ATTENDANCE_REJECTED,
        resourceType: 'AttendancePunch',
        details: {
          reason: 'POOR_ACCURACY',
          accuracyMeters: input.accuracyMeters,
          action: input.action
        },
        ip
      });

      throw new AppError(
        400,
        ErrorCode.LOCATION_ACCURACY_TOO_POOR,
        `GPS accuracy of ${input.accuracyMeters}m is insufficient. Please move to an open area with clear sky view and retry.`
      );
    }

    // Rejection 5B: Coordinates outside geofence
    if (!geoResult.isWithinGeofence) {
      await this.saveRejectedPunch({
        companyId,
        employeeId: employee._id,
        userId: new mongoose.Types.ObjectId(requestingUser.userId),
        action: input.action,
        serverTimestamp,
        clientTimestamp,
        clockSkewSeconds,
        coordinates: {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters
        },
        branchId: branch._id,
        shiftId: employee.shiftId,
        distanceFromGeofenceMeters: geoResult.distanceMeters,
        isWithinGeofence: false,
        verificationOutcome: 'REJECTED_OUT_OF_RANGE',
        photoKey: storedPhoto.photoKey,
        photoHash: storedPhoto.photoHash,
        deviceId: input.deviceId,
        idempotencyKey: input.idempotencyKey,
        rejectionReason: `Distance of ${geoResult.distanceMeters}m exceeds branch geofence radius of ${geoResult.effectiveRadiusMeters}m`,
        retentionExpiresAt
      });

      await logAuditEvent({
        companyId,
        userId: requestingUser.userId,
        userEmail: requestingUser.email,
        userRole: requestingUser.role,
        action: AuditAction.ATTENDANCE_REJECTED,
        resourceType: 'AttendancePunch',
        details: {
          reason: 'GEOFENCE_VIOLATION',
          distanceMeters: geoResult.distanceMeters,
          effectiveRadiusMeters: geoResult.effectiveRadiusMeters,
          action: input.action
        },
        ip
      });

      throw new AppError(
        400,
        ErrorCode.GEOFENCE_VIOLATION,
        `You are outside your assigned branch geofence boundary (${geoResult.distanceMeters}m from branch; maximum allowable is ${geoResult.effectiveRadiusMeters}m).`
      );
    }

    // 6. Transition validation against DailyAttendance
    const dailyRecord = await DailyAttendanceModel.findOne({
      companyId,
      employeeId: employee._id,
      date: dateStr
    });

    if (input.action === 'CHECK_IN') {
      if (dailyRecord && dailyRecord.firstCheckIn?.punchId && !dailyRecord.lastCheckOut?.punchId) {
        await this.saveRejectedPunch({
          companyId,
          employeeId: employee._id,
          userId: new mongoose.Types.ObjectId(requestingUser.userId),
          action: input.action,
          serverTimestamp,
          clientTimestamp,
          clockSkewSeconds,
          coordinates: {
            latitude: input.latitude,
            longitude: input.longitude,
            accuracyMeters: input.accuracyMeters
          },
          branchId: branch._id,
          shiftId: employee.shiftId,
          distanceFromGeofenceMeters: geoResult.distanceMeters,
          isWithinGeofence: true,
          verificationOutcome: 'REJECTED_INVALID_TRANSITION',
          photoKey: storedPhoto.photoKey,
          photoHash: storedPhoto.photoHash,
          deviceId: input.deviceId,
          idempotencyKey: input.idempotencyKey,
          rejectionReason: 'Employee is already checked in for today',
          retentionExpiresAt
        });

        throw new AppError(
          409,
          ErrorCode.ALREADY_PUNCHED_IN,
          'You are already checked in for today. Check out before checking in again.'
        );
      }

      if (dailyRecord && dailyRecord.firstCheckIn?.punchId && dailyRecord.lastCheckOut?.punchId) {
        throw new AppError(
          409,
          ErrorCode.INVALID_ATTENDANCE_TRANSITION,
          'Daily attendance has already been completed with check-in and check-out for today.'
        );
      }
    } else if (input.action === 'CHECK_OUT') {
      if (!dailyRecord || !dailyRecord.firstCheckIn?.punchId) {
        await this.saveRejectedPunch({
          companyId,
          employeeId: employee._id,
          userId: new mongoose.Types.ObjectId(requestingUser.userId),
          action: input.action,
          serverTimestamp,
          clientTimestamp,
          clockSkewSeconds,
          coordinates: {
            latitude: input.latitude,
            longitude: input.longitude,
            accuracyMeters: input.accuracyMeters
          },
          branchId: branch._id,
          shiftId: employee.shiftId,
          distanceFromGeofenceMeters: geoResult.distanceMeters,
          isWithinGeofence: true,
          verificationOutcome: 'REJECTED_INVALID_TRANSITION',
          photoKey: storedPhoto.photoKey,
          photoHash: storedPhoto.photoHash,
          deviceId: input.deviceId,
          idempotencyKey: input.idempotencyKey,
          rejectionReason: 'Cannot check out without prior check-in for today',
          retentionExpiresAt
        });

        throw new AppError(
          400,
          ErrorCode.NOT_PUNCHED_IN,
          'Cannot check out without prior check-in for today.'
        );
      }

      if (dailyRecord.lastCheckOut?.punchId) {
        throw new AppError(
          409,
          ErrorCode.INVALID_ATTENDANCE_TRANSITION,
          'You have already checked out for today.'
        );
      }
    }

    // 7. Save Verified Attendance Punch
    const punch = new AttendancePunchModel({
      companyId,
      employeeId: employee._id,
      userId: requestingUser.userId,
      action: input.action,
      serverTimestamp,
      clientTimestamp,
      clockSkewSeconds,
      coordinates: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters
      },
      branchId: branch._id,
      shiftId: employee.shiftId,
      distanceFromGeofenceMeters: geoResult.distanceMeters,
      isWithinGeofence: true,
      verificationOutcome: 'VERIFIED',
      photoKey: storedPhoto.photoKey,
      photoHash: storedPhoto.photoHash,
      deviceId: input.deviceId,
      idempotencyKey: input.idempotencyKey,
      isOverridden: false,
      retentionExpiresAt
    });

    await punch.save();

    // 8. Update / create Daily Attendance record
    await this.updateDailyAttendance({
      companyId,
      employee,
      branch,
      dateStr,
      punch,
      serverTimestamp,
      geoResult
    });

    // 9. Audit event
    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action:
        input.action === 'CHECK_IN'
          ? AuditAction.ATTENDANCE_CHECK_IN
          : AuditAction.ATTENDANCE_CHECK_OUT,
      resourceType: 'AttendancePunch',
      resourceId: punch._id.toString(),
      details: {
        action: input.action,
        branchCode: branch.code,
        distanceMeters: geoResult.distanceMeters,
        accuracyMeters: input.accuracyMeters,
        clockSkewSeconds
      },
      ip
    });

    return this.mapToPunchDto(punch, companyId, employee, branch);
  }

  /**
   * Retrieves today's attendance state for the authenticated employee.
   */
  async getTodayAttendance(companyId: string, userId: string): Promise<TodayAttendanceDto> {
    const employee = await this.resolveEmployee(companyId, userId);
    if (!employee) {
      throw new AppError(404, ErrorCode.EMPLOYEE_NOT_FOUND, 'Employee profile not found');
    }

    const branch = await BranchModel.findOne({
      _id: employee.branchId,
      companyId,
      isDeleted: false
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    const [dailyRecord, punches] = await Promise.all([
      DailyAttendanceModel.findOne({
        companyId,
        employeeId: employee._id,
        date: todayStr
      }),
      AttendancePunchModel.find({
        companyId,
        employeeId: employee._id,
        serverTimestamp: {
          $gte: new Date(`${todayStr}T00:00:00.000Z`),
          $lte: new Date(`${todayStr}T23:59:59.999Z`)
        }
      }).sort({ serverTimestamp: 1 })
    ]);

    const hasCheckedIn = Boolean(dailyRecord?.firstCheckIn?.punchId);
    const hasCheckedOut = Boolean(dailyRecord?.lastCheckOut?.punchId);

    const punchDtos = await Promise.all(
      punches.map((p) => this.mapToPunchDto(p, companyId, employee, branch || undefined))
    );

    return {
      date: todayStr,
      status: dailyRecord?.status || 'NOT_STARTED',
      hasCheckedIn,
      hasCheckedOut,
      canCheckIn: !hasCheckedIn,
      canCheckOut: hasCheckedIn && !hasCheckedOut,
      checkInTime: dailyRecord?.firstCheckIn?.time?.toISOString() || null,
      checkOutTime: dailyRecord?.lastCheckOut?.time?.toISOString() || null,
      totalWorkMinutes: dailyRecord?.totalWorkMinutes || 0,
      punches: punchDtos,
      assignedBranch: branch
        ? {
            id: branch._id.toString(),
            name: branch.name,
            code: branch.code,
            latitude: typeof branch.latitude === 'number' ? branch.latitude : 37.7749,
            longitude: typeof branch.longitude === 'number' ? branch.longitude : -122.4194,
            geofenceRadiusMeters:
              typeof branch.geofenceRadiusMeters === 'number' ? branch.geofenceRadiusMeters : 200
          }
        : null
    };
  }

  /**
   * Retrieves recent attendance history (punches and daily records).
   */
  async getAttendanceHistory(
    companyId: string,
    requestingUser: { userId: string; role: UserRoleType },
    query: AttendanceHistoryQuery
  ): Promise<{ data: AttendancePunchDto[]; total: number; page: number; limit: number }> {
    const isPrivileged = (
      [
        UserRole.PLATFORM_ADMIN,
        UserRole.COMPANY_OWNER,
        UserRole.HR_ADMIN,
        UserRole.MANAGER
      ] as readonly string[]
    ).includes(requestingUser.role);

    let targetEmployeeId: string;
    if (query.employeeId && isPrivileged) {
      targetEmployeeId = query.employeeId;
    } else {
      const selfEmp = await this.resolveEmployee(companyId, requestingUser.userId);
      if (!selfEmp) {
        throw new AppError(404, ErrorCode.EMPLOYEE_NOT_FOUND, 'Employee profile not found');
      }
      targetEmployeeId = selfEmp._id.toString();
    }

    const filter: Record<string, unknown> = {
      companyId,
      employeeId: new mongoose.Types.ObjectId(targetEmployeeId)
    };

    if (query.startDate || query.endDate) {
      filter.serverTimestamp = {};
      if (query.startDate) {
        (filter.serverTimestamp as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.serverTimestamp as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [total, punches] = await Promise.all([
      AttendancePunchModel.countDocuments(filter),
      AttendancePunchModel.find(filter).sort({ serverTimestamp: -1 }).skip(skip).limit(limit)
    ]);

    const data = await Promise.all(punches.map((p) => this.mapToPunchDto(p, companyId)));

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Overrides attendance for an employee (administrative action).
   */
  async adminOverrideAttendance(
    companyId: string,
    adminUser: { userId: string; role: UserRoleType; email: string },
    input: AttendanceOverrideInput,
    ip?: string
  ): Promise<{ message: string; date: string; status: string }> {
    const isPrivileged = (
      [UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN] as readonly string[]
    ).includes(adminUser.role);

    if (!isPrivileged) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Only HR Administrators or Company Owners may override attendance records'
      );
    }

    const employee = await EmployeeModel.findOne({
      _id: input.employeeId,
      companyId,
      isDeleted: false
    });

    if (!employee) {
      throw new AppError(404, ErrorCode.EMPLOYEE_NOT_FOUND, 'Employee not found in company scope');
    }

    let daily = await DailyAttendanceModel.findOne({
      companyId,
      employeeId: employee._id,
      date: input.date
    });

    if (!daily) {
      daily = new DailyAttendanceModel({
        companyId,
        employeeId: employee._id,
        branchId: employee.branchId,
        shiftId: employee.shiftId,
        date: input.date,
        totalPunches: 0,
        totalWorkMinutes: input.status === 'PRESENT' ? 480 : input.status === 'HALF_DAY' ? 240 : 0
      });
    }

    daily.status = input.status;
    daily.isOverridden = true;
    daily.overrideReason = input.reason;
    daily.overrideBy = new mongoose.Types.ObjectId(adminUser.userId);
    daily.overrideAt = new Date();

    if (input.checkInTime) {
      daily.firstCheckIn = {
        punchId: new mongoose.Types.ObjectId(),
        time: new Date(input.checkInTime),
        coordinates: { latitude: 0, longitude: 0, accuracyMeters: 0 },
        photoKey: 'OVERRIDE',
        distanceMeters: 0
      };
    }
    if (input.checkOutTime) {
      daily.lastCheckOut = {
        punchId: new mongoose.Types.ObjectId(),
        time: new Date(input.checkOutTime),
        coordinates: { latitude: 0, longitude: 0, accuracyMeters: 0 },
        photoKey: 'OVERRIDE',
        distanceMeters: 0
      };
    }

    await daily.save();

    await logAuditEvent({
      companyId,
      userId: adminUser.userId,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: AuditAction.ATTENDANCE_OVERRIDE,
      resourceType: 'DailyAttendance',
      resourceId: daily._id.toString(),
      details: {
        employeeId: input.employeeId,
        date: input.date,
        status: input.status,
        reason: input.reason
      },
      ip
    });

    return {
      message: 'Attendance override successfully applied',
      date: input.date,
      status: input.status
    };
  }

  // Helper: Saves rejected punch attempt for security and audit trail
  private async saveRejectedPunch(params: {
    companyId: string;
    employeeId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    action: AttendancePunchInput['action'];
    serverTimestamp: Date;
    clientTimestamp: Date;
    clockSkewSeconds: number;
    coordinates: { latitude: number; longitude: number; accuracyMeters: number };
    branchId: mongoose.Types.ObjectId;
    shiftId?: mongoose.Types.ObjectId;
    distanceFromGeofenceMeters: number;
    isWithinGeofence: boolean;
    verificationOutcome: IAttendancePunch['verificationOutcome'];
    photoKey: string;
    photoHash: string;
    deviceId?: string;
    idempotencyKey: string;
    rejectionReason: string;
    retentionExpiresAt: Date;
  }): Promise<void> {
    const rejectedPunch = new AttendancePunchModel({
      ...params,
      isOverridden: false
    });
    await rejectedPunch.save();
  }

  // Helper: Updates or creates daily attendance record on punch
  private async updateDailyAttendance(params: {
    companyId: string;
    employee: IEmployee;
    branch: IBranch;
    dateStr: string;
    punch: IAttendancePunch;
    serverTimestamp: Date;
    geoResult: { distanceMeters: number };
  }): Promise<void> {
    const { companyId, employee, branch, dateStr, punch, serverTimestamp, geoResult } = params;

    let daily = await DailyAttendanceModel.findOne({
      companyId,
      employeeId: employee._id,
      date: dateStr
    });

    if (!daily) {
      daily = new DailyAttendanceModel({
        companyId,
        employeeId: employee._id,
        shiftId: employee.shiftId,
        branchId: branch._id,
        date: dateStr,
        totalPunches: 0,
        totalWorkMinutes: 0,
        lateMinutes: 0,
        isLate: false,
        isOverridden: false
      });
    }

    daily.totalPunches += 1;

    if (punch.action === 'CHECK_IN') {
      daily.firstCheckIn = {
        punchId: punch._id,
        time: serverTimestamp,
        coordinates: {
          latitude: punch.coordinates.latitude,
          longitude: punch.coordinates.longitude,
          accuracyMeters: punch.coordinates.accuracyMeters
        },
        photoKey: punch.photoKey,
        distanceMeters: geoResult.distanceMeters
      };
      daily.status = 'CHECKED_IN';

      // Check if late based on shift start time
      if (employee.shiftId) {
        const shift = await ShiftModel.findOne({ _id: employee.shiftId, companyId });
        if (shift && shift.startTime) {
          const [startHour, startMin] = shift.startTime.split(':').map(Number);
          const punchHour = serverTimestamp.getUTCHours();
          const punchMin = serverTimestamp.getUTCMinutes();
          const shiftMinutes =
            (startHour || 9) * 60 + (startMin || 0) + (shift.gracePeriodMinutes || 15);
          const punchMinutes = punchHour * 60 + punchMin;
          if (punchMinutes > shiftMinutes) {
            daily.isLate = true;
            daily.lateMinutes = punchMinutes - shiftMinutes;
          }
        }
      }
    } else if (punch.action === 'CHECK_OUT') {
      daily.lastCheckOut = {
        punchId: punch._id,
        time: serverTimestamp,
        coordinates: {
          latitude: punch.coordinates.latitude,
          longitude: punch.coordinates.longitude,
          accuracyMeters: punch.coordinates.accuracyMeters
        },
        photoKey: punch.photoKey,
        distanceMeters: geoResult.distanceMeters
      };

      if (daily.firstCheckIn?.time) {
        const durationMillis = serverTimestamp.getTime() - daily.firstCheckIn.time.getTime();
        daily.totalWorkMinutes = Math.max(0, Math.round(durationMillis / (1000 * 60)));
      }

      // Status determination
      if (daily.totalWorkMinutes >= 480) {
        daily.status = daily.isLate ? 'LATE' : 'PRESENT';
      } else if (daily.totalWorkMinutes >= 240) {
        daily.status = 'HALF_DAY';
      } else {
        daily.status = 'HALF_DAY';
      }
    }

    await daily.save();
  }

  // Helper: Resolves employee document from userId or employeeId
  private async resolveEmployee(companyId: string, userId: string): Promise<IEmployee | null> {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      const byUserId = await EmployeeModel.findOne({
        companyId,
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false
      });
      if (byUserId) return byUserId;

      const byId = await EmployeeModel.findOne({
        _id: new mongoose.Types.ObjectId(userId),
        companyId,
        isDeleted: false
      });
      if (byId) return byId;
    }
    return null;
  }

  // Helper: Maps punch model to AttendancePunchDto with short-lived authorized photo URL
  private async mapToPunchDto(
    punch: IAttendancePunch,
    companyId: string,
    cachedEmployee?: IEmployee,
    cachedBranch?: IBranch
  ): Promise<AttendancePunchDto> {
    let employeeName = 'Employee';
    let employeeCode = 'EMP-000';
    let branchName = 'Main Office';

    if (cachedEmployee) {
      employeeName = `${cachedEmployee.firstName} ${cachedEmployee.lastName}`.trim();
      employeeCode = cachedEmployee.employeeCode;
    } else {
      const emp = await EmployeeModel.findOne({ _id: punch.employeeId, companyId });
      if (emp) {
        employeeName = `${emp.firstName} ${emp.lastName}`.trim();
        employeeCode = emp.employeeCode;
      }
    }

    if (cachedBranch) {
      branchName = cachedBranch.name;
    } else {
      const b = await BranchModel.findOne({ _id: punch.branchId, companyId });
      if (b) {
        branchName = b.name;
      }
    }

    // Short-lived token for private photo access (15 minutes expiry)
    const token = storageService.generateShortLivedPhotoToken(companyId, punch.photoKey, 15);
    const authorizedPhotoUrl = `/api/v1/attendance/photos/${punch.photoKey}?token=${token}`;

    return {
      id: punch._id.toString(),
      companyId: punch.companyId.toString(),
      employeeId: punch.employeeId.toString(),
      employeeCode,
      employeeName,
      branchId: punch.branchId.toString(),
      branchName,
      shiftId: punch.shiftId ? punch.shiftId.toString() : undefined,
      action: punch.action,
      serverTimestamp: punch.serverTimestamp.toISOString(),
      clientTimestamp: punch.clientTimestamp.toISOString(),
      clockSkewSeconds: punch.clockSkewSeconds,
      coordinates: punch.coordinates,
      distanceFromGeofenceMeters: punch.distanceFromGeofenceMeters,
      isWithinGeofence: punch.isWithinGeofence,
      verificationOutcome: punch.verificationOutcome,
      photoKey: punch.photoKey,
      authorizedPhotoUrl,
      isOverridden: punch.isOverridden,
      rejectionReason: punch.rejectionReason,
      createdAt: punch.createdAt.toISOString()
    };
  }
}

export const attendanceService = new AttendanceService();
