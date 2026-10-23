import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId | null;
  userId?: mongoose.Types.ObjectId | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    userEmail: { type: String, default: null },
    userRole: { type: String, default: null },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, default: null },
    resourceId: { type: String, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Immutable rule: disallow update/delete queries on auditLogSchema
auditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany'],
  function () {
    throw new Error(
      '[SECURITY] Audit logs are strictly immutable. Update and delete operations are prohibited.'
    );
  }
);

auditLogSchema.index({ companyId: 1, timestamp: -1 });

export const AuditLogModel: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
