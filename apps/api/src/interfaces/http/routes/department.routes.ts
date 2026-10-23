import { Router, Request, Response, NextFunction } from 'express';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createSuccessResponse,
  UserRole
} from '@workforcepro/api-contracts';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize, enforceTenantScope } from '../middlewares/authorize.js';
import { departmentService } from '../../../application/services/department.service.js';

export const departmentRouter = Router();

departmentRouter.use(authenticate);
departmentRouter.use(enforceTenantScope);

departmentRouter.post(
  '/',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: createDepartmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await departmentService.createDepartment(
        req.companyId,
        req.body,
        req.user,
        req.ip
      );
      res.status(201).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

departmentRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.companyId) return;
    const result = await departmentService.listDepartments(req.companyId, req.user);
    res.status(200).json(createSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

departmentRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.companyId) return;
    const result = await departmentService.getDepartment(
      req.companyId,
      req.params.id || '',
      req.user
    );
    res.status(200).json(createSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

departmentRouter.patch(
  '/:id',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: updateDepartmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await departmentService.updateDepartment(
        req.companyId,
        req.params.id || '',
        req.body,
        req.user,
        req.ip
      );
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);
