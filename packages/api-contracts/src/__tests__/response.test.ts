import { describe, it, expect } from 'vitest';
import {
  createSuccessResponse,
  createErrorResponse,
  apiErrorResponseSchema
} from '../common/response.js';
import { ErrorCode } from '../common/errors.js';
import { createPaginationMeta } from '../common/pagination.js';

describe('ResponseContract', () => {
  it('should generate a valid success envelope with data and metadata', () => {
    const meta = createPaginationMeta({ page: 1, limit: 10, total: 25 });
    const response = createSuccessResponse({ id: '123', name: 'Acme Corp' }, meta);

    expect(response.success).toBe(true);
    expect(response.data.id).toBe('123');
    expect(response.meta?.totalPages).toBe(3);
    expect(response.meta?.hasNextPage).toBe(true);
    expect(response.meta?.hasPrevPage).toBe(false);
    expect(typeof response.timestamp).toBe('string');
  });

  it('should generate and validate standard error envelopes', () => {
    const errorResponse = createErrorResponse(
      ErrorCode.GEOFENCE_VIOLATION,
      'User is outside authorized perimeter',
      { distanceMeters: 145.2, allowedRadiusMeters: 100 }
    );

    const validation = apiErrorResponseSchema.safeParse(errorResponse);
    expect(validation.success).toBe(true);
    expect(errorResponse.error.code).toBe(ErrorCode.GEOFENCE_VIOLATION);
    expect(errorResponse.error.details?.distanceMeters).toBe(145.2);
  });
});
