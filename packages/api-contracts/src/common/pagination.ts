import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean()
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export function createPaginationMeta(params: {
  page: number;
  limit: number;
  total: number;
}): PaginationMeta {
  const totalPages = Math.ceil(params.total / params.limit) || 0;
  return {
    page: params.page,
    limit: params.limit,
    total: params.total,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPrevPage: params.page > 1
  };
}
