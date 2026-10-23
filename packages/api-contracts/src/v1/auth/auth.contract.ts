import { z } from 'zod';
import { userRoleSchema } from './roles.js';

export const passwordValidationSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerCompanySchema = z.object({
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters'),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(30, 'Subdomain must be at most 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain may only contain lowercase letters, numbers, and hyphens'),
  legalRegistrationNumber: z.string().trim().min(2).optional(),
  contactEmail: z.string().trim().email('Invalid contact email'),
  contactPhone: z.string().trim().min(6).optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  adminFirstName: z.string().trim().min(1, 'First name is required'),
  adminLastName: z.string().trim().min(1, 'Last name is required'),
  adminEmail: z.string().trim().email('Invalid administrator email'),
  adminPassword: passwordValidationSchema
});

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  companySubdomain: z.string().trim().toLowerCase().optional(),
  deviceId: z.string().trim().optional(),
  deviceModel: z.string().trim().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required')
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const authUserSummarySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleSchema,
  companyId: z.string(),
  companyName: z.string(),
  companySubdomain: z.string(),
  branchId: z.string().nullable().optional()
});

export type AuthUserSummary = z.infer<typeof authUserSummarySchema>;

export const authResponseDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresInSeconds: z.number().int().positive(),
  user: authUserSummarySchema
});

export type AuthResponseData = z.infer<typeof authResponseDataSchema>;

export const inviteEmployeeSchema = z.object({
  email: z.string().trim().email('Invalid invitation email'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  role: userRoleSchema,
  branchId: z.string().trim().optional(),
  departmentId: z.string().trim().optional()
});

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required'),
  password: passwordValidationSchema
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
