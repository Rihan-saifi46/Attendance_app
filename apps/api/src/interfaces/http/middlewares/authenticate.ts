import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '@workforcepro/api-contracts';
import { AppError } from './errorHandler.js';
import { verifyAccessToken } from '../../../infrastructure/security/tokens.js';
import { UserModel } from '../../../infrastructure/database/models/user.model.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(401, ErrorCode.UNAUTHORIZED, 'Authentication required: Missing Bearer token')
    );
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = verifyAccessToken(token);

    // Fetch user with bypassTenantCheck because user lookup by _id is before tenant context is set
    const user = await UserModel.findById(payload.sub).setOptions({ bypassTenantCheck: true });
    if (!user || user.isDeleted) {
      return next(new AppError(401, ErrorCode.UNAUTHORIZED, 'User account no longer exists'));
    }

    if (user.status !== 'ACTIVE') {
      return next(
        new AppError(401, ErrorCode.ACCOUNT_INACTIVE, `Account status is ${user.status}`)
      );
    }

    // Verify token version (immediate revocation on logout or password reset)
    if (user.tokenVersion !== payload.tokenVersion) {
      return next(new AppError(401, ErrorCode.TOKEN_REVOKED, 'Session has expired or was revoked'));
    }

    // Security Rule: Derive the authorized company scope strictly from authenticated membership
    const companyIdStr = user.companyId.toString();

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: companyIdStr,
      branchId: user.branchId ? user.branchId.toString() : null,
      tokenVersion: user.tokenVersion
    };

    req.companyId = companyIdStr;

    next();
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name: string }).name === 'TokenExpiredError'
    ) {
      return next(new AppError(401, ErrorCode.TOKEN_EXPIRED, 'Access token has expired'));
    }
    return next(new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid or malformed access token'));
  }
}
