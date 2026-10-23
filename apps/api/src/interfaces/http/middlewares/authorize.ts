import { Request, Response, NextFunction } from 'express';
import { UserRole, UserRoleType, ErrorCode, AuditAction } from '@workforcepro/api-contracts';
import { AppError } from './errorHandler.js';
import { logAuditEvent } from '../../../infrastructure/security/audit.service.js';
import { BranchModel } from '../../../infrastructure/database/models/branch.model.js';
import mongoose from 'mongoose';

/**
 * Enforces role-based access control (RBAC).
 */
export function authorize(...allowedRoles: UserRoleType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, ErrorCode.UNAUTHORIZED, 'Authentication required'));
    }

    // Platform administrator has super-user override
    if (req.user.role === UserRole.PLATFORM_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Access denied: Role ${req.user.role} is not authorized for this resource`
        )
      );
    }

    next();
  };
}

/**
 * Enforces strict multi-tenant isolation.
 * Security Rules:
 * 1. Never trust companyId supplied by the client.
 * 2. If client attempts to specify a different companyId in params, query, or body, block with 403.
 * 3. Enforce req.companyId as the single source of truth.
 */
export function enforceTenantScope(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || !req.companyId) {
    return next(new AppError(401, ErrorCode.UNAUTHORIZED, 'Authentication required'));
  }

  // PLATFORM_ADMIN can cross-inspect if explicit, otherwise scoped
  if (req.user.role === UserRole.PLATFORM_ADMIN) {
    return next();
  }

  const clientSuppliedCompanyId =
    req.params.companyId || req.query.companyId || (req.body && req.body.companyId);

  if (clientSuppliedCompanyId && String(clientSuppliedCompanyId) !== req.companyId) {
    // Audit security event
    logAuditEvent({
      companyId: req.companyId,
      userId: req.user.userId,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: AuditAction.CROSS_TENANT_ACCESS_BLOCKED,
      resourceType: 'Company',
      resourceId: String(clientSuppliedCompanyId),
      details: {
        attemptedCompanyId: String(clientSuppliedCompanyId),
        actualCompanyId: req.companyId,
        path: req.path,
        method: req.method
      },
      ip: req.ip
    }).catch(() => {});

    return next(
      new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited: You cannot access or modify records of another company.'
      )
    );
  }

  // Force override to server-derived companyId
  if (req.params.companyId) {
    req.params.companyId = req.companyId;
  }
  if (req.body && typeof req.body === 'object') {
    req.body.companyId = req.companyId;
  }

  next();
}

/**
 * Validates that branchId belongs to the user's company, and that
 * branch-scoped roles (e.g. Employee, Manager) are assigned to that branch.
 */
export function validateBranchAccess(req: Request, _res: Response, next: NextFunction): void {
  const branchId = req.params.branchId || (req.body && req.body.branchId);
  if (!branchId) {
    return next();
  }

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return next(new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid branch ID format'));
  }

  BranchModel.findOne({ _id: branchId, companyId: req.companyId, isDeleted: false })
    .then((branch) => {
      if (!branch) {
        return next(
          new AppError(
            404,
            ErrorCode.BRANCH_NOT_FOUND,
            'Branch not found in authorized company scope'
          )
        );
      }

      // If user is Employee/Manager and has branch restriction, ensure they belong to this branch
      if (
        (req.user?.role === UserRole.EMPLOYEE || req.user?.role === UserRole.MANAGER) &&
        req.user.branchId &&
        req.user.branchId !== branch._id.toString()
      ) {
        return next(
          new AppError(
            403,
            ErrorCode.BRANCH_MEMBERSHIP_INVALID,
            'You do not have access permissions for this branch'
          )
        );
      }

      next();
    })
    .catch(next);
}
