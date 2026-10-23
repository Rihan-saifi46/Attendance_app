import { Router, Request, Response, NextFunction } from 'express';
import { createSuccessResponse, UserRole } from '@workforcepro/api-contracts';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize, enforceTenantScope } from '../middlewares/authorize.js';
import { AuditLogModel } from '../../../infrastructure/database/models/auditLog.model.js';

export const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(enforceTenantScope);

auditRouter.get(
  '/',
  authorize(UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.companyId) return;

      const logs = await AuditLogModel.find({
        companyId: req.companyId
      })
        .sort({ timestamp: -1 })
        .limit(100);

      const mapped = logs.map((log) => ({
        id: log._id.toString(),
        companyId: log.companyId ? log.companyId.toString() : null,
        userId: log.userId ? log.userId.toString() : null,
        userEmail: log.userEmail,
        userRole: log.userRole,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        details: log.details,
        ip: log.ip,
        timestamp: log.timestamp.toISOString()
      }));

      res.status(200).json(createSuccessResponse(mapped));
    } catch (err) {
      next(err);
    }
  }
);
