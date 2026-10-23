import { z } from 'zod';

export const employmentTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const employmentStatusSchema = z.enum([
  'ACTIVE',
  'PROBATION',
  'NOTICE_PERIOD',
  'RESIGNED',
  'TERMINATED'
]);
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;

export const salaryTypeSchema = z.enum(['MONTHLY', 'DAILY', 'HOURLY']);
export type SalaryType = z.infer<typeof salaryTypeSchema>;

export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);
export type Gender = z.infer<typeof genderSchema>;

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2),
  relation: z.string().trim().min(2),
  phone: z.string().trim().min(6)
});

export const addressSchema = z.object({
  street: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().min(2)
});

export const salaryDetailsSchema = z.object({
  salaryType: salaryTypeSchema,
  baseRate: z.number().nonnegative('Base rate must be non-negative'),
  currency: z.string().default('USD'),
  bankName: z.string().trim().optional(),
  accountNumberMasked: z.string().trim().optional(),
  routingCode: z.string().trim().optional(),
  taxIdMasked: z.string().trim().optional()
});

export type SalaryDetails = z.infer<typeof salaryDetailsSchema>;

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(2, 'Employee code must be at least 2 characters')
    .max(30)
    .toUpperCase(),
  userId: z.string().optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().min(6).max(20),
  gender: genderSchema.optional(),
  dateOfBirth: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  employmentType: employmentTypeSchema.default('FULL_TIME'),
  employmentStatus: employmentStatusSchema.default('ACTIVE'),
  designation: z.string().trim().min(1, 'Designation is required').max(100),
  departmentId: z.string().min(1, 'Department is required'),
  branchId: z.string().min(1, 'Branch is required'),
  shiftId: z.string().min(1, 'Shift schedule is required'),
  managerId: z.string().nullable().optional(),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  salaryDetails: z
    .object({
      salaryType: salaryTypeSchema,
      baseRate: z.number().nonnegative(),
      currency: z.string().default('USD'),
      bankName: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      routingCode: z.string().trim().optional(),
      taxId: z.string().trim().optional()
    })
    .optional()
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  gender: genderSchema.optional(),
  dateOfBirth: z.string().optional(),
  joiningDate: z.string().optional(),
  exitDate: z.string().nullable().optional(),
  employmentType: employmentTypeSchema.optional(),
  employmentStatus: employmentStatusSchema.optional(),
  designation: z.string().trim().min(1).max(100).optional(),
  departmentId: z.string().optional(),
  branchId: z.string().optional(),
  shiftId: z.string().optional(),
  managerId: z.string().nullable().optional(),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  salaryDetails: z
    .object({
      salaryType: salaryTypeSchema.optional(),
      baseRate: z.number().nonnegative().optional(),
      currency: z.string().optional(),
      bankName: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      routingCode: z.string().trim().optional(),
      taxId: z.string().trim().optional()
    })
    .optional(),
  updateReason: z.string().trim().max(250).optional()
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// Public profile visible to peers (no salary or identity info)
export const employeePublicDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  designation: z.string(),
  departmentId: z.string(),
  branchId: z.string(),
  employmentStatus: employmentStatusSchema,
  employmentType: employmentTypeSchema,
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string()
});

export type EmployeePublicDto = z.infer<typeof employeePublicDtoSchema>;

// Detail profile for privileged view or self-view
export const employeeDetailDtoSchema = employeePublicDtoSchema.extend({
  userId: z.string().nullable().optional(),
  phone: z.string().optional(),
  gender: genderSchema.optional(),
  dateOfBirth: z.string().nullable().optional(),
  joiningDate: z.string(),
  exitDate: z.string().nullable().optional(),
  shiftId: z.string(),
  managerId: z.string().nullable().optional(),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  salaryDetails: salaryDetailsSchema.optional(),
  updatedAt: z.string()
});

export type EmployeeDetailDto = z.infer<typeof employeeDetailDtoSchema>;

export const employeeQuerySchema = z.object({
  search: z.string().trim().optional(),
  departmentId: z.string().optional(),
  branchId: z.string().optional(),
  shiftId: z.string().optional(),
  employmentStatus: employmentStatusSchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['employeeCode', 'firstName', 'lastName', 'joiningDate', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>;
