import mongoose from 'mongoose';
import {
  CompanyDto,
  UpdateCompanyInput,
  CompanyMemberDto,
  UserRole,
  UserRoleType,
  canAssignRole,
  ErrorCode,
  AuditAction
} from '@workforcepro/api-contracts';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import { CompanyModel } from '../../infrastructure/database/models/company.model.js';
import { UserModel, IUser } from '../../infrastructure/database/models/user.model.js';
import { logAuditEvent } from '../../infrastructure/security/audit.service.js';

export class CompanyService {
  async getCompany(
    companyId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<CompanyDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    const company = await CompanyModel.findOne({ _id: companyId, isDeleted: false });
    if (!company) {
      throw new AppError(404, ErrorCode.TENANT_NOT_FOUND, 'Company not found');
    }

    return {
      id: company._id.toString(),
      name: company.name,
      subdomain: company.subdomain,
      legalRegistrationNumber: company.legalRegistrationNumber,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      country: company.country,
      timezone: company.timezone,
      currency: company.currency,
      status: company.status,
      createdAt: company.createdAt.toISOString()
    };
  }

  async updateCompany(
    companyId: string,
    dto: UpdateCompanyInput,
    requestingUser: { userId: string; role: UserRoleType; companyId: string; email: string },
    ip?: string
  ): Promise<CompanyDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    const company = await CompanyModel.findOne({ _id: companyId, isDeleted: false });
    if (!company) {
      throw new AppError(404, ErrorCode.TENANT_NOT_FOUND, 'Company not found');
    }

    if (dto.name) company.name = dto.name;
    if (dto.contactEmail) company.contactEmail = dto.contactEmail;
    if (dto.contactPhone) company.contactPhone = dto.contactPhone;
    if (dto.timezone) company.timezone = dto.timezone;
    if (dto.currency) company.currency = dto.currency;

    await company.save();

    await logAuditEvent({
      companyId: company._id,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.COMPANY_UPDATED,
      resourceType: 'Company',
      resourceId: company._id.toString(),
      details: { updatedFields: Object.keys(dto) },
      ip
    });

    return {
      id: company._id.toString(),
      name: company.name,
      subdomain: company.subdomain,
      legalRegistrationNumber: company.legalRegistrationNumber,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      country: company.country,
      timezone: company.timezone,
      currency: company.currency,
      status: company.status,
      createdAt: company.createdAt.toISOString()
    };
  }

  async listMembers(
    companyId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<CompanyMemberDto[]> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    const users = await UserModel.find({ companyId, isDeleted: false }).sort({ createdAt: -1 });

    return users.map((u) => this.mapUserToMemberDto(u));
  }

  async getMember(
    companyId: string,
    memberId: string,
    requestingUser: { companyId: string; role: UserRoleType }
  ): Promise<CompanyMemberDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid member ID');
    }

    const user = await UserModel.findOne({ _id: memberId, companyId, isDeleted: false });
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Member not found within company');
    }

    return this.mapUserToMemberDto(user);
  }

  async updateMemberRole(
    companyId: string,
    memberId: string,
    newRole: UserRoleType,
    requestingUser: { userId: string; role: UserRoleType; companyId: string; email: string },
    ip?: string
  ): Promise<CompanyMemberDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    // Rule: Prevent users from assigning themselves privileged roles
    if (requestingUser.userId === memberId && newRole !== requestingUser.role) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN_ROLE_ASSIGNMENT,
        'Self-privilege escalation prohibited: You cannot modify your own role.'
      );
    }

    // Rule: Actor must have authority to assign newRole
    if (!canAssignRole(requestingUser.role, newRole)) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN_ROLE_ASSIGNMENT,
        `Role ${requestingUser.role} cannot assign role ${newRole}`
      );
    }

    const targetUser = await UserModel.findOne({ _id: memberId, companyId, isDeleted: false });
    if (!targetUser) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Member not found');
    }

    // Rule: Cannot demote or alter someone with equal or higher authority
    if (
      requestingUser.role !== UserRole.PLATFORM_ADMIN &&
      targetUser.role === UserRole.COMPANY_OWNER &&
      requestingUser.role !== UserRole.COMPANY_OWNER
    ) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN_ROLE_ASSIGNMENT,
        'Cannot modify the role of a Company Owner'
      );
    }

    const previousRole = targetUser.role;
    targetUser.role = newRole;
    targetUser.tokenVersion += 1; // Invalidate current tokens so new role takes effect on next auth
    await targetUser.save();

    await logAuditEvent({
      companyId: targetUser.companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.ROLE_UPDATED,
      resourceType: 'User',
      resourceId: targetUser._id.toString(),
      details: { memberEmail: targetUser.email, previousRole, newRole },
      ip
    });

    return this.mapUserToMemberDto(targetUser);
  }

  private mapUserToMemberDto(user: IUser): CompanyMemberDto {
    return {
      id: user._id.toString(),
      companyId: user.companyId.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      branchId: user.branchId ? user.branchId.toString() : null,
      departmentId: user.departmentId ? user.departmentId.toString() : null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString()
    };
  }
}

export const companyService = new CompanyService();
