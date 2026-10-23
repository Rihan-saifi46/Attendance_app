import { Router, Request, Response, NextFunction } from 'express';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  EmployeeQueryInput,
  previewImportSchema,
  commitImportSchema,
  createSuccessResponse,
  createPaginationMeta,
  UserRole
} from '@workforcepro/api-contracts';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize, enforceTenantScope } from '../middlewares/authorize.js';
import { employeeService } from '../../../application/services/employee.service.js';

export const employeeRouter = Router();

employeeRouter.use(authenticate);
employeeRouter.use(enforceTenantScope);

// Bulk Import Preview
employeeRouter.post(
  '/import/preview',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: previewImportSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await employeeService.previewBulkImport(req.companyId, req.body.rows);
      res.status(200).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

// Bulk Import Commit
employeeRouter.post(
  '/import/commit',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: commitImportSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await employeeService.commitBulkImport(
        req.companyId,
        req.body.rows,
        req.user,
        req.ip
      );
      res.status(201).json(createSuccessResponse(result));
    } catch (err) {
      next(err);
    }
  }
);

// Create Employee
employeeRouter.post(
  '/',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN),
  validateRequest({ body: createEmployeeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await employeeService.createEmployee(
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

// Search, Filter, Paginate Employees
employeeRouter.get(
  '/',
  validateRequest({ query: employeeQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const { data, pagination } = await employeeService.getEmployees(
        req.companyId,
        req.query as unknown as EmployeeQueryInput,
        req.user
      );
      const meta = createPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.totalItems
      });
      res.status(200).json(createSuccessResponse(data, meta));
    } catch (err) {
      next(err);
    }
  }
);

// Get Employee by ID
employeeRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.companyId) return;
    const result = await employeeService.getEmployeeById(
      req.companyId,
      req.params.id || '',
      req.user
    );
    res.status(200).json(createSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

// Update Employee
employeeRouter.patch(
  '/:id',
  authorize(UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN, UserRole.MANAGER),
  validateRequest({ body: updateEmployeeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.companyId) return;
      const result = await employeeService.updateEmployee(
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

// Get Employee History
employeeRouter.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.companyId) return;
    const result = await employeeService.getEmployeeHistory(
      req.companyId,
      req.params.id || '',
      req.user
    );
    res.status(200).json(createSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});
