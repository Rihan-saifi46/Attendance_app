import { z } from 'zod';

export const AuditAction = {
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  COMPANY_REGISTERED: 'COMPANY_REGISTERED',
  COMPANY_UPDATED: 'COMPANY_UPDATED',
  EMPLOYEE_INVITED: 'EMPLOYEE_INVITED',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  BRANCH_CREATED: 'BRANCH_CREATED',
  DEPARTMENT_CREATED: 'DEPARTMENT_CREATED',
  DEPARTMENT_UPDATED: 'DEPARTMENT_UPDATED',
  SHIFT_CREATED: 'SHIFT_CREATED',
  SHIFT_UPDATED: 'SHIFT_UPDATED',
  EMPLOYEE_CREATED: 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED: 'EMPLOYEE_UPDATED',
  EMPLOYEES_IMPORTED: 'EMPLOYEES_IMPORTED',
  ATTENDANCE_CHECK_IN: 'ATTENDANCE_CHECK_IN',
  ATTENDANCE_CHECK_OUT: 'ATTENDANCE_CHECK_OUT',
  ATTENDANCE_REJECTED: 'ATTENDANCE_REJECTED',
  ATTENDANCE_OVERRIDE: 'ATTENDANCE_OVERRIDE',
  PHOTO_ACCESSED: 'PHOTO_ACCESSED',
  ATTENDANCE_RETENTION_PURGE: 'ATTENDANCE_RETENTION_PURGE',
  CROSS_TENANT_ACCESS_BLOCKED: 'CROSS_TENANT_ACCESS_BLOCKED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export const auditLogDtoSchema = z.object({
  id: z.string(),
  companyId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  userRole: z.string().nullable().optional(),
  action: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  ip: z.string().optional(),
  timestamp: z.string()
});

export type AuditLogDto = z.infer<typeof auditLogDtoSchema>;
