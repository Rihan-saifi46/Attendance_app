import mongoose from 'mongoose';
import {
  CreateShiftInput,
  UpdateShiftInput,
  ShiftDto,
  UserRole,
  UserRoleType,
  ErrorCode,
  AuditAction
} from '@workforcepro/api-contracts';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import { ShiftModel, IShift } from '../../infrastructure/database/models/shift.model.js';
import { logAuditEvent } from '../../infrastructure/security/audit.service.js';

export class ShiftService {
  async createShift(
    companyId: string,
    dto: CreateShiftInput,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<ShiftDto> {
    const existing = await ShiftModel.findOne({
      companyId,
      code: dto.code.toUpperCase(),
      isDeleted: false
    });

    if (existing) {
      throw new AppError(
        409,
        ErrorCode.DUPLICATE_SHIFT_CODE,
        `Shift code '${dto.code}' already exists in this company`
      );
    }

    const shift = new ShiftModel({
      companyId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      startTime: dto.startTime,
      endTime: dto.endTime,
      breakDurationMinutes: dto.breakDurationMinutes ?? 60,
      gracePeriodMinutes: dto.gracePeriodMinutes ?? 15,
      halfDayThresholdHours: dto.halfDayThresholdHours ?? 4.5,
      fullDayThresholdHours: dto.fullDayThresholdHours ?? 8.0,
      isNightShift: dto.isNightShift ?? false,
      workDays: dto.workDays ?? [1, 2, 3, 4, 5],
      weeklyOffs: dto.weeklyOffs ?? [6, 7],
      isActive: true
    });

    await shift.save();

    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.SHIFT_CREATED,
      resourceType: 'Shift',
      resourceId: shift._id.toString(),
      details: {
        code: shift.code,
        name: shift.name,
        timings: `${shift.startTime}-${shift.endTime}`
      },
      ip
    });

    return this.mapToDto(shift);
  }

  async listShifts(
    companyId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<ShiftDto[]> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    const shifts = await ShiftModel.find({ companyId, isDeleted: false }).sort({ name: 1 });
    return shifts.map((s) => this.mapToDto(s));
  }

  async getShift(
    companyId: string,
    shiftId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<ShiftDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(shiftId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid shift ID');
    }

    const shift = await ShiftModel.findOne({ _id: shiftId, companyId, isDeleted: false });
    if (!shift) {
      throw new AppError(
        404,
        ErrorCode.SHIFT_NOT_FOUND,
        'Shift not found in authorized company scope'
      );
    }

    return this.mapToDto(shift);
  }

  async updateShift(
    companyId: string,
    shiftId: string,
    dto: UpdateShiftInput,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<ShiftDto> {
    if (!mongoose.Types.ObjectId.isValid(shiftId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid shift ID');
    }

    const shift = await ShiftModel.findOne({ _id: shiftId, companyId, isDeleted: false });
    if (!shift) {
      throw new AppError(
        404,
        ErrorCode.SHIFT_NOT_FOUND,
        'Shift not found in authorized company scope'
      );
    }

    if (dto.code && dto.code.toUpperCase() !== shift.code) {
      const duplicate = await ShiftModel.findOne({
        companyId,
        code: dto.code.toUpperCase(),
        _id: { $ne: shiftId },
        isDeleted: false
      });
      if (duplicate) {
        throw new AppError(
          409,
          ErrorCode.DUPLICATE_SHIFT_CODE,
          `Shift code '${dto.code}' already exists in this company`
        );
      }
      shift.code = dto.code.toUpperCase();
    }

    if (dto.name !== undefined) shift.name = dto.name;
    if (dto.startTime !== undefined) shift.startTime = dto.startTime;
    if (dto.endTime !== undefined) shift.endTime = dto.endTime;
    if (dto.breakDurationMinutes !== undefined)
      shift.breakDurationMinutes = dto.breakDurationMinutes;
    if (dto.gracePeriodMinutes !== undefined) shift.gracePeriodMinutes = dto.gracePeriodMinutes;
    if (dto.halfDayThresholdHours !== undefined)
      shift.halfDayThresholdHours = dto.halfDayThresholdHours;
    if (dto.fullDayThresholdHours !== undefined)
      shift.fullDayThresholdHours = dto.fullDayThresholdHours;
    if (dto.isNightShift !== undefined) shift.isNightShift = dto.isNightShift;
    if (dto.workDays !== undefined) shift.workDays = dto.workDays;
    if (dto.weeklyOffs !== undefined) shift.weeklyOffs = dto.weeklyOffs;
    if (dto.isActive !== undefined) shift.isActive = dto.isActive;

    await shift.save();

    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.SHIFT_UPDATED,
      resourceType: 'Shift',
      resourceId: shift._id.toString(),
      details: { changes: dto },
      ip
    });

    return this.mapToDto(shift);
  }

  private mapToDto(shift: IShift): ShiftDto {
    return {
      id: shift._id.toString(),
      companyId: shift.companyId.toString(),
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDurationMinutes: shift.breakDurationMinutes,
      gracePeriodMinutes: shift.gracePeriodMinutes,
      halfDayThresholdHours: shift.halfDayThresholdHours,
      fullDayThresholdHours: shift.fullDayThresholdHours,
      isNightShift: shift.isNightShift,
      workDays: shift.workDays,
      weeklyOffs: shift.weeklyOffs,
      isActive: shift.isActive,
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString()
    };
  }
}

export const shiftService = new ShiftService();
