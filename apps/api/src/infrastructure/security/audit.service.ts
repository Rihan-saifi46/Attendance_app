import mongoose from 'mongoose';
import { AuditLogModel } from '../database/models/auditLog.model.js';
import { logger } from '../logging/logger.js';
import { AuditActionType } from '@workforcepro/api-contracts';

export interface AuditLogParams {
  companyId?: string | mongoose.Types.ObjectId | null;
  userId?: string | mongoose.Types.ObjectId | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: AuditActionType | string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const doc = new AuditLogModel({
      companyId: params.companyId ? new mongoose.Types.ObjectId(String(params.companyId)) : null,
      userId: params.userId ? new mongoose.Types.ObjectId(String(params.userId)) : null,
      userEmail: params.userEmail || null,
      userRole: params.userRole || null,
      action: params.action,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      details: params.details || {},
      ip: params.ip || null,
      userAgent: params.userAgent || null,
      timestamp: new Date()
    });

    await doc.save();
    logger.info(
      { action: params.action, user: params.userEmail, company: params.companyId },
      'Security audit log recorded'
    );
  } catch (err) {
    // Audit logging must be non-blocking to critical path, but must log error
    logger.error({ err, action: params.action }, 'Failed to persist audit log entry');
  }
}
