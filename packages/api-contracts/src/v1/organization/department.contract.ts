import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name must be at least 2 characters').max(100),
  code: z
    .string()
    .trim()
    .min(2, 'Department code must be at least 2 characters')
    .max(20)
    .toUpperCase(),
  parentDepartmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional()
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(20).toUpperCase().optional(),
  parentDepartmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const departmentDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  code: z.string(),
  parentDepartmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type DepartmentDto = z.infer<typeof departmentDtoSchema>;
