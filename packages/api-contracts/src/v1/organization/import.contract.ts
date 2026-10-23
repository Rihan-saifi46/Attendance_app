import { z } from 'zod';
import {
  employmentTypeSchema,
  employmentStatusSchema,
  salaryTypeSchema
} from './employee.contract.js';

export const employeeImportRowSchema = z.object({
  employeeCode: z.string().trim().min(2).max(30).toUpperCase(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(6).max(20),
  designation: z.string().trim().min(1).max(100),
  departmentCode: z.string().trim().min(1).toUpperCase(),
  branchCode: z.string().trim().min(1).toUpperCase(),
  shiftCode: z.string().trim().min(1).toUpperCase(),
  joiningDate: z.string().min(1),
  employmentType: employmentTypeSchema.default('FULL_TIME'),
  employmentStatus: employmentStatusSchema.default('ACTIVE'),
  salaryType: salaryTypeSchema.default('MONTHLY'),
  baseRate: z.number().nonnegative().default(0)
});

export type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;

export const previewImportSchema = z.object({
  rows: z.array(z.record(z.any())).min(1, 'Import file cannot be empty')
});

export type PreviewImportInput = z.infer<typeof previewImportSchema>;

export const importRowErrorSchema = z.object({
  rowNumber: z.number(),
  employeeCode: z.string().optional(),
  email: z.string().optional(),
  field: z.string().optional(),
  message: z.string()
});

export type ImportRowError = z.infer<typeof importRowErrorSchema>;

export const importPreviewResponseSchema = z.object({
  totalRows: z.number(),
  validCount: z.number(),
  errorCount: z.number(),
  canCommit: z.boolean(),
  errors: z.array(importRowErrorSchema),
  previewRows: z.array(employeeImportRowSchema)
});

export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>;

export const commitImportSchema = z.object({
  rows: z.array(employeeImportRowSchema).min(1, 'No validated rows provided to commit')
});

export type CommitImportInput = z.infer<typeof commitImportSchema>;

export const importCommitResponseSchema = z.object({
  importedCount: z.number(),
  createdEmployees: z.array(
    z.object({
      id: z.string(),
      employeeCode: z.string(),
      name: z.string(),
      email: z.string()
    })
  )
});

export type ImportCommitResponse = z.infer<typeof importCommitResponseSchema>;
