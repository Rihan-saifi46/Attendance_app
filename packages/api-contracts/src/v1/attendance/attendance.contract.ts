import { z } from 'zod';

export const punchActionSchema = z.enum(['CHECK_IN', 'CHECK_OUT']);
export type PunchAction = z.infer<typeof punchActionSchema>;

export const verificationOutcomeSchema = z.enum([
  'VERIFIED',
  'REJECTED_OUT_OF_RANGE',
  'REJECTED_POOR_ACCURACY',
  'REJECTED_MISSING_PHOTO',
  'REJECTED_INVALID_TRANSITION',
  'REJECTED_EMPLOYEE_INACTIVE'
]);
export type VerificationOutcome = z.infer<typeof verificationOutcomeSchema>;

export const attendancePunchInputSchema = z.object({
  action: punchActionSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0, 'Accuracy meters must be non-negative'),
  selfieBase64: z.string().min(10, 'Selfie image data is required'),
  clientTimestamp: z.string().min(10, 'Client timestamp is required'),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, 'Valid idempotency key is required to prevent duplicate punches'),
  deviceId: z.string().trim().optional()
});
export type AttendancePunchInput = z.infer<typeof attendancePunchInputSchema>;

export const attendancePunchCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number()
});

export const attendancePunchDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  employeeId: z.string(),
  employeeCode: z.string(),
  employeeName: z.string(),
  branchId: z.string(),
  branchName: z.string(),
  shiftId: z.string().optional(),
  action: punchActionSchema,
  serverTimestamp: z.string(),
  clientTimestamp: z.string(),
  clockSkewSeconds: z.number(),
  coordinates: attendancePunchCoordinatesSchema,
  distanceFromGeofenceMeters: z.number(),
  isWithinGeofence: z.boolean(),
  verificationOutcome: verificationOutcomeSchema,
  photoKey: z.string(),
  authorizedPhotoUrl: z.string(),
  isOverridden: z.boolean().default(false),
  rejectionReason: z.string().optional(),
  createdAt: z.string()
});
export type AttendancePunchDto = z.infer<typeof attendancePunchDtoSchema>;

export const assignedBranchInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  geofenceRadiusMeters: z.number()
});
export type AssignedBranchInfo = z.infer<typeof assignedBranchInfoSchema>;

export const todayAttendanceDtoSchema = z.object({
  date: z.string(),
  status: z.string(),
  hasCheckedIn: z.boolean(),
  hasCheckedOut: z.boolean(),
  canCheckIn: z.boolean(),
  canCheckOut: z.boolean(),
  checkInTime: z.string().nullable(),
  checkOutTime: z.string().nullable(),
  totalWorkMinutes: z.number(),
  punches: z.array(attendancePunchDtoSchema),
  assignedBranch: assignedBranchInfoSchema.nullable()
});
export type TodayAttendanceDto = z.infer<typeof todayAttendanceDtoSchema>;

export const attendanceHistoryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employeeId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});
export type AttendanceHistoryQuery = z.infer<typeof attendanceHistoryQuerySchema>;

export const attendanceOverrideInputSchema = z.object({
  employeeId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  status: z.enum(['PRESENT', 'HALF_DAY', 'LATE', 'ABSENT']),
  reason: z.string().trim().min(3, 'Override reason must be at least 3 characters'),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional()
});
export type AttendanceOverrideInput = z.infer<typeof attendanceOverrideInputSchema>;
