import { Router, Request, Response, NextFunction } from 'express';
import {
  registerCompanySchema,
  loginSchema,
  refreshTokenSchema,
  inviteEmployeeSchema,
  acceptInvitationSchema,
  createSuccessResponse,
  UserRole
} from '@workforcepro/api-contracts';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { authService } from '../../../application/services/auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/register-company',
  validateRequest({ body: registerCompanySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.registerCompany(req.body, req.ip, req.headers['user-agent']);
      res.status(201).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/login',
  validateRequest({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body, req.ip, req.headers['user-agent']);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/refresh',
  validateRequest({ body: refreshTokenSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refreshToken(req.body.refreshToken, req.ip);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await authService.logout(req.user.userId, req.user.companyId, req.ip);
      }
      res.status(200).json(createSuccessResponse({ loggedOut: true }));
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/invite',
  authenticate,
  authorize(UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: inviteEmployeeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return;
      const result = await authService.inviteEmployee(req.user, req.body, req.ip);
      res.status(201).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/accept-invitation',
  validateRequest({ body: acceptInvitationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.acceptInvitation(req.body, req.ip);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  res.status(200).json(createSuccessResponse({ user: req.user }));
});
