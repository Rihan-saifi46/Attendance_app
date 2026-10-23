import mongoose, { Schema, Query } from 'mongoose';

export interface TenantScopedOptions {
  bypassTenantCheck?: boolean;
}

/**
 * Global Mongoose plugin that enforces tenant isolation.
 * Every tenant-owned schema using this plugin MUST include `companyId` in query filters,
 * unless explicitly bypassed via query option `{ bypassTenantCheck: true }`
 * (e.g., system-level administration or tenant-unaware lookup like initial login).
 */
export function tenantScopedPlugin(schema: Schema): void {
  // Ensure companyId is defined on schema if not already
  if (!schema.path('companyId')) {
    schema.add({
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
      }
    });
  }

  const queryMethods = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'updateMany',
    'countDocuments',
    'deleteOne',
    'deleteMany'
  ] as const;

  queryMethods.forEach((method) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema.pre(method as any, function (this: Query<any, any>) {
      const filter = this.getFilter();
      const options = this.getOptions() as TenantScopedOptions | undefined;

      if (!options?.bypassTenantCheck) {
        if (!filter.companyId) {
          throw new Error(
            `[SECURITY] Cross-tenant query blocked: Missing mandatory companyId filter in ${schema.get('collection') || 'collection'}.${method}().`
          );
        }
      }
    });
  });
}
