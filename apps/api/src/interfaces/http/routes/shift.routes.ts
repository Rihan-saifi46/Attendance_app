import { Router, Request, Response, NextFunction } from 'express';
import {
  createShiftSchema,
  updateShiftSchema,
  createSuccessResponse,
  UserRole
} from '@workforcepro/api-contracts';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize, enforceTenantScope } from '../middlewares/authorize.js';
import { shiftService } from '../../../application/services/shift.service.js';

export const shiftRouter = Router();

shiftRouter.use(authenticate);
shiftRouter.use(enforceTenantScope);

shiftRouter.post(
  '/',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: createShiftSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await shiftService.createShift(req.companyId, req.body, req.user, req.ip);
      res.status(201).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

shiftRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.companyId) return;
    const result = await shiftService.listShifts(req.companyId, req.user);
    res.status(200).json(createSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

shiftRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.companyId) return;
    const result = await shiftService.getShift(req.companyId, req.params.id || '', req.user);
    res.status(200).json(createSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

shiftRouter.patch(
  '/:id',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: updateShiftSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await shiftService.updateShift(
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
