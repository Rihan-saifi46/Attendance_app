import { Router, Request, Response, NextFunction } from 'express';
import {
  updateCompanySchema,
  updateMemberRoleSchema,
  createSuccessResponse,
  UserRole
} from '@workforcepro/api-contracts';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize, enforceTenantScope } from '../middlewares/authorize.js';
import { companyService } from '../../../application/services/company.service.js';

export const companyRouter = Router();

// Apply authentication to all company routes
companyRouter.use(authenticate);

// 1. Get Company Details
companyRouter.get(
  '/:companyId',
  enforceTenantScope,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return;
      const companyId = req.params.companyId || req.companyId || '';
      const result = await companyService.getCompany(companyId, req.user);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

// 2. Update Company Details
companyRouter.patch(
  '/:companyId',
  enforceTenantScope,
  authorize(UserRole.COMPANY_OWNER),
  validateRequest({ body: updateCompanySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return;
      const companyId = req.params.companyId || req.companyId || '';
      const result = await companyService.updateCompany(companyId, req.body, req.user, req.ip);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

// 3. List Members in Company
companyRouter.get(
  '/:companyId/members',
  enforceTenantScope,
  authorize(UserRole.COMPANY_OWNER, UserRole.HR_ADMIN, UserRole.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return;
      const companyId = req.params.companyId || req.companyId || '';
      const result = await companyService.listMembers(companyId, req.user);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

// 4. Get Single Member
companyRouter.get(
  '/:companyId/members/:memberId',
  enforceTenantScope,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return;
      const companyId = req.params.companyId || req.companyId || '';
      const memberId = req.params.memberId || '';
      const result = await companyService.getMember(companyId, memberId, req.user);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

// 5. Update Member Role
companyRouter.patch(
  '/:companyId/members/:memberId/role',
  enforceTenantScope,
  authorize(UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: updateMemberRoleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return;
      const companyId = req.params.companyId || req.companyId || '';
      const memberId = req.params.memberId || '';
      const result = await companyService.updateMemberRole(
        companyId,
        memberId,
        req.body.role,
        req.user,
        req.ip
      );
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);
