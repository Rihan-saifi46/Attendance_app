import { z } from 'zod';
import { userRoleSchema } from '../auth/roles.js';

export const companyStatusSchema = z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED']);

export const companyDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  legalRegistrationNumber: z.string().optional(),
  contactEmail: z.string(),
  contactPhone: z.string().optional(),
  country: z.string(),
  timezone: z.string(),
  currency: z.string(),
  status: companyStatusSchema,
  createdAt: z.string()
});

export type CompanyDto = z.infer<typeof companyDtoSchema>;

export const updateCompanySchema = z.object({
  name: z.string().trim().min(2).optional(),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().min(6).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional()
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const companyMemberDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleSchema,
  status: z.enum(['ACTIVE', 'INACTIVE', 'INVITED', 'SUSPENDED']),
  branchId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string()
});

export type CompanyMemberDto = z.infer<typeof companyMemberDtoSchema>;

export const updateMemberRoleSchema = z.object({
  role: userRoleSchema
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const createBranchSchema = z.object({
  code: z.string().trim().min(2).max(20).toUpperCase(),
  name: z.string().trim().min(2),
  street: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().min(2),
  timezone: z.string().default('UTC'),
  isHeadquarters: z.boolean().default(false)
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const branchDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  code: z.string(),
  name: z.string(),
  city: z.string(),
  country: z.string(),
  timezone: z.string(),
  isHeadquarters: z.boolean(),
  createdAt: z.string()
});

export type BranchDto = z.infer<typeof branchDtoSchema>;
