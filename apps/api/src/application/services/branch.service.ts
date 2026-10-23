import mongoose from 'mongoose';
import {
  CreateBranchInput,
  BranchDto,
  UserRole,
  UserRoleType,
  ErrorCode,
  AuditAction
} from '@workforcepro/api-contracts';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import { BranchModel, IBranch } from '../../infrastructure/database/models/branch.model.js';
import { logAuditEvent } from '../../infrastructure/security/audit.service.js';

export class BranchService {
  async createBranch(
    companyId: string,
    dto: CreateBranchInput,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<BranchDto> {
    const existing = await BranchModel.findOne({
      companyId,
      code: dto.code.toUpperCase(),
      isDeleted: false
    });

    if (existing) {
      throw new AppError(
        409,
        ErrorCode.CONFLICT,
        `Branch code '${dto.code}' already exists in this company`
      );
    }

    const branch = new BranchModel({
      companyId,
      code: dto.code.toUpperCase(),
      name: dto.name,
      street: dto.street,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      timezone: dto.timezone || 'UTC',
      isHeadquarters: dto.isHeadquarters || false
    });

    await branch.save();

    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.BRANCH_CREATED,
      resourceType: 'Branch',
      resourceId: branch._id.toString(),
      details: { code: branch.code, name: branch.name },
      ip
    });

    return this.mapBranchToDto(branch);
  }

  async listBranches(
    companyId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<BranchDto[]> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    const branches = await BranchModel.find({ companyId, isDeleted: false }).sort({ code: 1 });
    return branches.map((b) => this.mapBranchToDto(b));
  }

  async getBranch(
    companyId: string,
    branchId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<BranchDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid branch ID');
    }

    const branch = await BranchModel.findOne({ _id: branchId, companyId, isDeleted: false });
    if (!branch) {
      throw new AppError(
        404,
        ErrorCode.BRANCH_NOT_FOUND,
        'Branch not found in authorized company scope'
      );
    }

    return this.mapBranchToDto(branch);
  }

  private mapBranchToDto(branch: IBranch): BranchDto {
    return {
      id: branch._id.toString(),
      companyId: branch.companyId.toString(),
      code: branch.code,
      name: branch.name,
      city: branch.city,
      country: branch.country,
      timezone: branch.timezone,
      isHeadquarters: branch.isHeadquarters,
      createdAt: branch.createdAt.toISOString()
    };
  }
}

export const branchService = new BranchService();
