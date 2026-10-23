import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createShiftSchema = z.object({
  name: z.string().trim().min(2, 'Shift name must be at least 2 characters').max(100),
  code: z.string().trim().min(2).max(20).toUpperCase(),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm format (24h)'),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:mm format (24h)'),
  breakDurationMinutes: z.number().int().min(0).max(240).default(60),
  gracePeriodMinutes: z.number().int().min(0).max(120).default(15),
  halfDayThresholdHours: z.number().min(1).max(24).default(4.5),
  fullDayThresholdHours: z.number().min(1).max(24).default(8.0),
  isNightShift: z.boolean().default(false),
  workDays: z
    .array(z.number().int().min(1).max(7))
    .min(1, 'Shift must have at least one work day')
    .default([1, 2, 3, 4, 5]),
  weeklyOffs: z.array(z.number().int().min(1).max(7)).default([6, 7])
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const updateShiftSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(20).toUpperCase().optional(),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm format (24h)').optional(),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:mm format (24h)').optional(),
  breakDurationMinutes: z.number().int().min(0).max(240).optional(),
  gracePeriodMinutes: z.number().int().min(0).max(120).optional(),
  halfDayThresholdHours: z.number().min(1).max(24).optional(),
  fullDayThresholdHours: z.number().min(1).max(24).optional(),
  isNightShift: z.boolean().optional(),
  workDays: z.array(z.number().int().min(1).max(7)).min(1).optional(),
  weeklyOffs: z.array(z.number().int().min(1).max(7)).optional(),
  isActive: z.boolean().optional()
});

export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;

export const shiftDtoSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  code: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakDurationMinutes: z.number(),
  gracePeriodMinutes: z.number(),
  halfDayThresholdHours: z.number(),
  fullDayThresholdHours: z.number(),
  isNightShift: z.boolean(),
  workDays: z.array(z.number()),
  weeklyOffs: z.array(z.number()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ShiftDto = z.infer<typeof shiftDtoSchema>;
