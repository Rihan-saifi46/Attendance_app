import { z } from 'zod';

export const serviceStatusSchema = z.enum(['connected', 'disconnected', 'connecting', 'error', 'disabled']);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const overallStatusSchema = z.enum(['ok', 'degraded', 'error']);
export type OverallStatus = z.infer<typeof overallStatusSchema>;

export const healthCheckResponseSchema = z.object({
  status: overallStatusSchema,
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  environment: z.string(),
  services: z.object({
    database: z.object({
      status: serviceStatusSchema,
      latencyMs: z.number().nonnegative().optional()
    }),
    memory: z.object({
      heapUsedMb: z.number().nonnegative(),
      heapTotalMb: z.number().nonnegative(),
      rssMb: z.number().nonnegative()
    })
  })
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
