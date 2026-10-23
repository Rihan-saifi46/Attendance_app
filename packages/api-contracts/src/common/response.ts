import { z } from 'zod';
import { errorCodeSchema } from './errors.js';
import type { PaginationMeta } from './pagination.js';

export const apiErrorDetailSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional()
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: apiErrorDetailSchema,
  timestamp: z.string().datetime()
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function createSuccessResponse<T>(
  data: T,
  meta?: PaginationMeta
): {
  success: true;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
} {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString()
  };
}

export function createErrorResponse(
  code: z.infer<typeof errorCodeSchema>,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    timestamp: new Date().toISOString()
  };
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}
