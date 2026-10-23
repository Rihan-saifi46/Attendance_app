import { UserRoleType } from '@workforcepro/api-contracts';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRoleType;
        companyId: string;
        branchId?: string | null;
        tokenVersion: number;
      };
      companyId?: string;
    }
  }
}

export {};
