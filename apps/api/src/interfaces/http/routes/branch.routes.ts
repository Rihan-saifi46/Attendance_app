import { Router, Request, Response, NextFunction } from 'express';
import { createBranchSchema, createSuccessResponse, UserRole } from '@workforcepro/api-contracts';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize, enforceTenantScope, validateBranchAccess } from '../middlewares/authorize.js';
import { branchService } from '../../../application/services/branch.service.js';

export const branchRouter = Router();

branchRouter.use(authenticate);
branchRouter.use(enforceTenantScope);

branchRouter.post(
  '/',
  authorize(UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: createBranchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await branchService.createBranch(req.companyId, req.body, req.user, req.ip);
      res.status(201).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

branchRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.companyId) return;
    const result = await branchService.listBranches(req.companyId, req.user);
    res.status(200).json(createSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

branchRouter.get(
  '/:branchId',
  validateBranchAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const branchId = req.params.branchId || '';
      const result = await branchService.getBranch(req.companyId, branchId, req.user);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);
