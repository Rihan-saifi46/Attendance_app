import mongoose from 'mongoose';
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentDto,
  UserRole,
  UserRoleType,
  ErrorCode,
  AuditAction
} from '@workforcepro/api-contracts';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import {
  DepartmentModel,
  IDepartment
} from '../../infrastructure/database/models/department.model.js';
import { logAuditEvent } from '../../infrastructure/security/audit.service.js';

export class DepartmentService {
  async createDepartment(
    companyId: string,
    dto: CreateDepartmentInput,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<DepartmentDto> {
    const existing = await DepartmentModel.findOne({
      companyId,
      code: dto.code.toUpperCase(),
      isDeleted: false
    });

    if (existing) {
      throw new AppError(
        409,
        ErrorCode.DUPLICATE_DEPARTMENT_CODE,
        `Department code '${dto.code}' already exists in this company`
      );
    }

    const department = new DepartmentModel({
      companyId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      parentDepartmentId: dto.parentDepartmentId || null,
      managerId: dto.managerId || null,
      isActive: true
    });

    await department.save();

    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.DEPARTMENT_CREATED,
      resourceType: 'Department',
      resourceId: department._id.toString(),
      details: { code: department.code, name: department.name },
      ip
    });

    return this.mapToDto(department);
  }

  async listDepartments(
    companyId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<DepartmentDto[]> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    const departments = await DepartmentModel.find({ companyId, isDeleted: false }).sort({
      name: 1
    });
    return departments.map((d) => this.mapToDto(d));
  }

  async getDepartment(
    companyId: string,
    departmentId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<DepartmentDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid department ID');
    }

    const department = await DepartmentModel.findOne({
      _id: departmentId,
      companyId,
      isDeleted: false
    });

    if (!department) {
      throw new AppError(
        404,
        ErrorCode.DEPARTMENT_NOT_FOUND,
        'Department not found in authorized company scope'
      );
    }

    return this.mapToDto(department);
  }

  async updateDepartment(
    companyId: string,
    departmentId: string,
    dto: UpdateDepartmentInput,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<DepartmentDto> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid department ID');
    }

    const department = await DepartmentModel.findOne({
      _id: departmentId,
      companyId,
      isDeleted: false
    });

    if (!department) {
      throw new AppError(
        404,
        ErrorCode.DEPARTMENT_NOT_FOUND,
        'Department not found in authorized company scope'
      );
    }

    if (dto.code && dto.code.toUpperCase() !== department.code) {
      const duplicate = await DepartmentModel.findOne({
        companyId,
        code: dto.code.toUpperCase(),
        _id: { $ne: departmentId },
        isDeleted: false
      });
      if (duplicate) {
        throw new AppError(
          409,
          ErrorCode.DUPLICATE_DEPARTMENT_CODE,
          `Department code '${dto.code}' already exists in this company`
        );
      }
      department.code = dto.code.toUpperCase();
    }

    if (dto.name !== undefined) department.name = dto.name;
    if (dto.parentDepartmentId !== undefined) {
      department.parentDepartmentId = dto.parentDepartmentId
        ? new mongoose.Types.ObjectId(dto.parentDepartmentId)
        : null;
    }
    if (dto.managerId !== undefined) {
      department.managerId = dto.managerId ? new mongoose.Types.ObjectId(dto.managerId) : null;
    }
    if (dto.isActive !== undefined) department.isActive = dto.isActive;

    await department.save();

    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.DEPARTMENT_UPDATED,
      resourceType: 'Department',
      resourceId: department._id.toString(),
      details: { changes: dto },
      ip
    });

    return this.mapToDto(department);
  }

  private mapToDto(department: IDepartment): DepartmentDto {
    return {
      id: department._id.toString(),
      companyId: department.companyId.toString(),
      name: department.name,
      code: department.code,
      parentDepartmentId: department.parentDepartmentId
        ? department.parentDepartmentId.toString()
        : null,
      managerId: department.managerId ? department.managerId.toString() : null,
      isActive: department.isActive,
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString()
    };
  }
}

export const departmentService = new DepartmentService();
