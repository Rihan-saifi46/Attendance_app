import mongoose from 'mongoose';
import crypto from 'node:crypto';
import {
  RegisterCompanyInput,
  LoginInput,
  InviteEmployeeInput,
  AcceptInvitationInput,
  AuthResponseData,
  UserRole,
  UserRoleType,
  canAssignRole,
  ErrorCode,
  AuditAction
} from '@workforcepro/api-contracts';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import { CompanyModel } from '../../infrastructure/database/models/company.model.js';
import { UserModel } from '../../infrastructure/database/models/user.model.js';
import { BranchModel } from '../../infrastructure/database/models/branch.model.js';
import { hashPassword, verifyPassword } from '../../infrastructure/security/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken
} from '../../infrastructure/security/tokens.js';
import { logAuditEvent } from '../../infrastructure/security/audit.service.js';
import { loginAbuseGuard } from '../../interfaces/http/middlewares/rateLimiter.js';

export class AuthService {
  async registerCompany(
    dto: RegisterCompanyInput,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponseData> {
    const existingCompany = await CompanyModel.findOne({
      subdomain: dto.subdomain.toLowerCase(),
      isDeleted: false
    });

    if (existingCompany) {
      throw new AppError(
        409,
        ErrorCode.SUBDOMAIN_ALREADY_EXISTS,
        `Subdomain '${dto.subdomain}' is already registered. Please choose another.`
      );
    }

    // 1. Create Company
    const company = new CompanyModel({
      name: dto.companyName,
      subdomain: dto.subdomain.toLowerCase(),
      legalRegistrationNumber: dto.legalRegistrationNumber,
      contactEmail: dto.contactEmail.toLowerCase(),
      contactPhone: dto.contactPhone,
      timezone: dto.timezone || 'UTC',
      currency: dto.currency || 'USD',
      status: 'ACTIVE'
    });
    await company.save();

    // 2. Create Default Headquarters Branch
    const hqBranch = new BranchModel({
      companyId: company._id,
      code: 'HQ-01',
      name: `${dto.companyName} Headquarters`,
      city: 'Headquarters',
      country: company.country,
      timezone: company.timezone,
      isHeadquarters: true
    });
    await hqBranch.save();

    // 3. Create Company Owner User
    const passwordHash = await hashPassword(dto.adminPassword);
    const { token: refreshToken, hash: refreshTokenHash } = generateRefreshToken();

    const user = new UserModel({
      companyId: company._id,
      email: dto.adminEmail.toLowerCase(),
      passwordHash,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      role: UserRole.COMPANY_OWNER,
      status: 'ACTIVE',
      branchId: hqBranch._id,
      refreshTokenHash,
      tokenVersion: 1
    });
    await user.save();

    // 4. Generate Access Token
    const { token: accessToken, expiresInSeconds } = generateAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: company._id.toString(),
      branchId: hqBranch._id.toString(),
      tokenVersion: user.tokenVersion
    });

    // 5. Audit Log
    await logAuditEvent({
      companyId: company._id,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.COMPANY_REGISTERED,
      resourceType: 'Company',
      resourceId: company._id.toString(),
      details: { companyName: company.name, subdomain: company.subdomain },
      ip,
      userAgent
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: company._id.toString(),
        companyName: company.name,
        companySubdomain: company.subdomain,
        branchId: hqBranch._id.toString()
      }
    };
  }

  async login(dto: LoginInput, ip?: string, userAgent?: string): Promise<AuthResponseData> {
    const rateLimitKey = `${ip || 'unknown'}:${dto.email.toLowerCase()}`;
    loginAbuseGuard.check(rateLimitKey);

    let targetCompanyId: mongoose.Types.ObjectId | undefined;
    let companyName = '';
    let companySubdomain = '';

    if (dto.companySubdomain) {
      const company = await CompanyModel.findOne({
        subdomain: dto.companySubdomain.toLowerCase(),
        isDeleted: false
      });
      if (!company) {
        loginAbuseGuard.recordFailure(rateLimitKey, ip, dto.email);
        throw new AppError(404, ErrorCode.TENANT_NOT_FOUND, 'Company subdomain not found');
      }
      targetCompanyId = company._id;
      companyName = company.name;
      companySubdomain = company.subdomain;
    }

    // Lookup user (with bypassTenantCheck if subdomain was not provided, or scoped if provided)
    const userQuery: Record<string, unknown> = {
      email: dto.email.toLowerCase(),
      isDeleted: false
    };
    if (targetCompanyId) {
      userQuery.companyId = targetCompanyId;
    }

    const user = await UserModel.findOne(userQuery).setOptions({
      bypassTenantCheck: !targetCompanyId
    });

    if (!user) {
      loginAbuseGuard.recordFailure(rateLimitKey, ip, dto.email);
      await logAuditEvent({
        action: AuditAction.AUTH_LOGIN_FAILED,
        userEmail: dto.email.toLowerCase(),
        details: { reason: 'User not found' },
        ip,
        userAgent
      });
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Verify Password
    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      loginAbuseGuard.recordFailure(rateLimitKey, ip, dto.email);
      await logAuditEvent({
        companyId: user.companyId,
        userId: user._id,
        userEmail: user.email,
        action: AuditAction.AUTH_LOGIN_FAILED,
        details: { reason: 'Incorrect password' },
        ip,
        userAgent
      });
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Check Status
    if (user.status !== 'ACTIVE') {
      throw new AppError(
        401,
        ErrorCode.ACCOUNT_INACTIVE,
        `Account status is ${user.status}. Please contact administrator.`
      );
    }

    // Resolve company details if not resolved via subdomain
    if (!companyName) {
      const company = await CompanyModel.findById(user.companyId);
      if (!company || company.isDeleted || company.status === 'SUSPENDED') {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Company account is inactive or suspended');
      }
      companyName = company.name;
      companySubdomain = company.subdomain;
    }

    // Clear failed attempts upon success
    loginAbuseGuard.recordSuccess(rateLimitKey);

    // Rotate refresh token & update login telemetry
    const { token: refreshToken, hash: refreshTokenHash } = generateRefreshToken();
    user.refreshTokenHash = refreshTokenHash;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip || null;

    // Device binding logic
    if (dto.deviceId) {
      if (!user.boundDeviceId) {
        user.boundDeviceId = dto.deviceId;
        user.deviceModel = dto.deviceModel || null;
        user.deviceBoundAt = new Date();
      }
    }

    await user.save();

    const { token: accessToken, expiresInSeconds } = generateAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId.toString(),
      branchId: user.branchId ? user.branchId.toString() : null,
      tokenVersion: user.tokenVersion
    });

    await logAuditEvent({
      companyId: user.companyId,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.AUTH_LOGIN_SUCCESS,
      ip,
      userAgent
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId.toString(),
        companyName,
        companySubdomain,
        branchId: user.branchId ? user.branchId.toString() : null
      }
    };
  }

  async refreshToken(refreshTokenStr: string, ip?: string): Promise<AuthResponseData> {
    const hash = hashToken(refreshTokenStr);
    const user = await UserModel.findOne({
      refreshTokenHash: hash,
      isDeleted: false
    }).setOptions({ bypassTenantCheck: true });

    if (!user) {
      throw new AppError(401, ErrorCode.TOKEN_REVOKED, 'Invalid or revoked refresh token');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(401, ErrorCode.ACCOUNT_INACTIVE, 'Account is not active');
    }

    const company = await CompanyModel.findById(user.companyId);
    if (!company || company.isDeleted || company.status === 'SUSPENDED') {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Company account is inactive or suspended');
    }

    // Rotate refresh token
    const { token: newRefreshToken, hash: newHash } = generateRefreshToken();
    user.refreshTokenHash = newHash;
    await user.save();

    const { token: accessToken, expiresInSeconds } = generateAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId.toString(),
      branchId: user.branchId ? user.branchId.toString() : null,
      tokenVersion: user.tokenVersion
    });

    await logAuditEvent({
      companyId: user.companyId,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.AUTH_TOKEN_REFRESH,
      ip
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresInSeconds,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId.toString(),
        companyName: company.name,
        companySubdomain: company.subdomain,
        branchId: user.branchId ? user.branchId.toString() : null
      }
    };
  }

  async logout(userId: string, companyId: string, ip?: string): Promise<void> {
    const user = await UserModel.findOne({
      _id: userId,
      companyId,
      isDeleted: false
    });

    if (user) {
      user.refreshTokenHash = null;
      user.tokenVersion += 1; // Immediately invalidates any current access tokens
      await user.save();

      await logAuditEvent({
        companyId: user.companyId,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: AuditAction.AUTH_LOGOUT,
        ip
      });
    }
  }

  async inviteEmployee(
    inviter: { userId: string; role: UserRoleType; companyId: string; email: string },
    dto: InviteEmployeeInput,
    ip?: string
  ): Promise<{ userId: string; email: string; role: string; invitationToken: string }> {
    // Privilege escalation prevention: User cannot assign roles equal or higher than their own
    if (!canAssignRole(inviter.role, dto.role)) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN_ROLE_ASSIGNMENT,
        `Role ${inviter.role} is not permitted to invite or assign role ${dto.role}`
      );
    }

    // Verify uniqueness of email in this company
    const existing = await UserModel.findOne({
      companyId: inviter.companyId,
      email: dto.email.toLowerCase(),
      isDeleted: false
    });

    if (existing) {
      throw new AppError(
        409,
        ErrorCode.USER_ALREADY_EXISTS,
        'An employee with this email already exists in this company'
      );
    }

    // If branchId is provided, ensure it belongs to inviter's company
    let branchIdObj: mongoose.Types.ObjectId | null = null;
    if (dto.branchId) {
      const branch = await BranchModel.findOne({
        _id: dto.branchId,
        companyId: inviter.companyId,
        isDeleted: false
      });
      if (!branch) {
        throw new AppError(
          404,
          ErrorCode.BRANCH_NOT_FOUND,
          'Branch not found in authorized company scope'
        );
      }
      branchIdObj = branch._id;
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Placeholder password hash until invitation accepted
    const dummyHash = await hashPassword(crypto.randomBytes(20).toString('hex'));

    const invitedUser = new UserModel({
      companyId: inviter.companyId,
      email: dto.email.toLowerCase(),
      passwordHash: dummyHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      status: 'INVITED',
      branchId: branchIdObj,
      invitationToken,
      invitationExpiresAt,
      tokenVersion: 1
    });

    await invitedUser.save();

    await logAuditEvent({
      companyId: inviter.companyId,
      userId: inviter.userId,
      userEmail: inviter.email,
      userRole: inviter.role,
      action: AuditAction.EMPLOYEE_INVITED,
      resourceType: 'User',
      resourceId: invitedUser._id.toString(),
      details: { invitedEmail: dto.email, assignedRole: dto.role },
      ip
    });

    return {
      userId: invitedUser._id.toString(),
      email: invitedUser.email,
      role: invitedUser.role,
      invitationToken
    };
  }

  async acceptInvitation(dto: AcceptInvitationInput, ip?: string): Promise<AuthResponseData> {
    const user = await UserModel.findOne({
      invitationToken: dto.token,
      status: 'INVITED',
      isDeleted: false
    }).setOptions({ bypassTenantCheck: true });

    if (!user) {
      throw new AppError(404, ErrorCode.INVITATION_NOT_FOUND, 'Invalid invitation token');
    }

    if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
      throw new AppError(400, ErrorCode.INVITATION_EXPIRED, 'Invitation has expired');
    }

    const passwordHash = await hashPassword(dto.password);
    const { token: refreshToken, hash: refreshTokenHash } = generateRefreshToken();

    user.passwordHash = passwordHash;
    user.status = 'ACTIVE';
    user.invitationToken = null;
    user.invitationExpiresAt = null;
    user.refreshTokenHash = refreshTokenHash;
    user.lastLoginAt = new Date();
    await user.save();

    const company = await CompanyModel.findById(user.companyId);

    const { token: accessToken, expiresInSeconds } = generateAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId.toString(),
      branchId: user.branchId ? user.branchId.toString() : null,
      tokenVersion: user.tokenVersion
    });

    await logAuditEvent({
      companyId: user.companyId,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.INVITATION_ACCEPTED,
      ip
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId.toString(),
        companyName: company?.name || 'WorkforcePro Company',
        companySubdomain: company?.subdomain || '',
        branchId: user.branchId ? user.branchId.toString() : null
      }
    };
  }
}

export const authService = new AuthService();
