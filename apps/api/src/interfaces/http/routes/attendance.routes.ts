import { Router, Request, Response, NextFunction } from 'express';
import {
  attendancePunchInputSchema,
  attendanceHistoryQuerySchema,
  attendanceOverrideInputSchema,
  AttendanceHistoryQuery,
  createSuccessResponse,
  createPaginationMeta,
  ErrorCode,
  UserRole
} from '@workforcepro/api-contracts';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize, enforceTenantScope } from '../middlewares/authorize.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { attendanceService } from '../../../application/services/attendance.service.js';
import { storageService } from '../../../infrastructure/storage/storage.service.js';
import { AppError } from '../middlewares/errorHandler.js';
import { verifyAccessToken } from '../../../infrastructure/security/tokens.js';

export const attendanceRouter = Router();

/**
 * POST /api/v1/attendance/punch
 * Captures check-in / check-out punch with GPS geofence and selfie verification.
 */
attendanceRouter.post(
  '/punch',
  authenticate,
  enforceTenantScope,
  validateRequest({ body: attendancePunchInputSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const punch = await attendanceService.recordPunch(req.companyId, req.user, req.body, req.ip);
      res.status(201).json(createSuccessResponse(punch));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/attendance/today
 * Returns today's attendance state, times, and geofence configuration for the authenticated employee.
 */
attendanceRouter.get(
  '/today',
  authenticate,
  enforceTenantScope,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const today = await attendanceService.getTodayAttendance(req.companyId, req.user.userId);
      res.status(200).json(createSuccessResponse(today));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/attendance/history
 * Returns paginated attendance punch history for the employee.
 */
attendanceRouter.get(
  '/history',
  authenticate,
  enforceTenantScope,
  validateRequest({ query: attendanceHistoryQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const query = req.query as unknown as AttendanceHistoryQuery;
      const history = await attendanceService.getAttendanceHistory(req.companyId, req.user, query);
      const meta = createPaginationMeta({
        page: history.page,
        limit: history.limit,
        total: history.total
      });
      res.status(200).json(createSuccessResponse(history.data, meta));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/attendance/photos/:photoKey
 * Serves private attendance selfie through short-lived signed tokens or authenticated sessions.
 * Never publicly exposes files.
 */
attendanceRouter.get(
  '/photos/:photoKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const photoKey = req.params.photoKey as string;
      const queryToken = req.query.token as string | undefined;
      const authHeader = req.headers.authorization;

      let authorizedCompanyId: string | null = null;

      if (queryToken) {
        // Validate short-lived HMAC signed token
        try {
          const parts = queryToken.split('.');
          if (parts[0]) {
            const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
            if (payload && payload.companyId) {
              const isValid = storageService.verifyPhotoToken(
                queryToken,
                payload.companyId,
                photoKey
              );
              if (isValid) {
                authorizedCompanyId = payload.companyId;
              }
            }
          }
        } catch {
          // Token malformed
        }
      }

      if (!authorizedCompanyId && authHeader && authHeader.startsWith('Bearer ')) {
        // Validate active JWT session
        try {
          const jwtToken = authHeader.substring(7);
          const payload = verifyAccessToken(jwtToken);
          authorizedCompanyId = payload.companyId;
        } catch {
          // Invalid JWT
        }
      }

      if (!authorizedCompanyId) {
        throw new AppError(
          403,
          ErrorCode.PHOTO_ACCESS_EXPIRED,
          'Photo access token has expired or is unauthorized'
        );
      }

      const streamResult = await storageService.getPhotoStream(authorizedCompanyId, photoKey);
      if (!streamResult) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Attendance photo not found');
      }

      res.setHeader('Content-Type', streamResult.mimeType);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      streamResult.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/attendance/override
 * Allows HR Administrators / Company Owners to manually adjust an attendance record.
 */
attendanceRouter.post(
  '/override',
  authenticate,
  enforceTenantScope,
  authorize(UserRole.COMPANY_OWNER, UserRole.HR_ADMIN, UserRole.PLATFORM_ADMIN),
  validateRequest({ body: attendanceOverrideInputSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await attendanceService.adminOverrideAttendance(
        req.companyId,
        req.user,
        req.body,
        req.ip
      );
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);
