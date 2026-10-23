import { z } from 'zod';

export const employeeHistoryTypeSchema = z.enum([
  'PROFILE_UPDATE',
  'ROLE_CHANGE',
  'DEPARTMENT_TRANSFER',
  'BRANCH_TRANSFER',
  'SHIFT_ASSIGNMENT',
  'SALARY_UPDATE',
  'STATUS_CHANGE'
]);

export type EmployeeHistoryType = z.infer<typeof employeeHistoryTypeSchema>;

export const employeeFieldDiffSchema = z.object({
  field: z.string(),
  oldValue: z.any().nullable().optional(),
  newValue: z.any().nullable().optional()
});

export type EmployeeFieldDiff = z.infer<typeof employeeFieldDiffSchema>;

export const employeeHistoryDtoSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  companyId: z.string(),
  changedByUserId: z.string(),
  changedByEmail: z.string(),
  changeType: employeeHistoryTypeSchema,
  diff: z.array(employeeFieldDiffSchema),
  reason: z.string().nullable().optional(),
  createdAt: z.string()
});

export type EmployeeHistoryDto = z.infer<typeof employeeHistoryDtoSchema>;
