import mongoose, { Schema, Document, Model } from 'mongoose';
import { tenantScopedPlugin } from '../tenantPlugin.js';
import { PunchAction, VerificationOutcome } from '@workforcepro/api-contracts';

export interface IAttendancePunch extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: PunchAction;
  serverTimestamp: Date;
  clientTimestamp: Date;
  clockSkewSeconds: number;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  branchId: mongoose.Types.ObjectId;
  shiftId?: mongoose.Types.ObjectId;
  distanceFromGeofenceMeters: number;
  isWithinGeofence: boolean;
  verificationOutcome: VerificationOutcome;
  photoKey: string;
  photoHash: string;
  deviceId?: string;
  idempotencyKey: string;
  rejectionReason?: string;
  isOverridden: boolean;
  overriddenBy?: mongoose.Types.ObjectId;
  overrideReason?: string;
  overrideAt?: Date;
  retentionExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attendancePunchSchema = new Schema<IAttendancePunch>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT'],
      required: true
    },
    serverTimestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    clientTimestamp: {
      type: Date,
      required: true
    },
    clockSkewSeconds: {
      type: Number,
      required: true,
      default: 0
    },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracyMeters: { type: Number, required: true }
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift'
    },
    distanceFromGeofenceMeters: {
      type: Number,
      required: true
    },
    isWithinGeofence: {
      type: Boolean,
      required: true
    },
    verificationOutcome: {
      type: String,
      enum: [
        'VERIFIED',
        'REJECTED_OUT_OF_RANGE',
        'REJECTED_POOR_ACCURACY',
        'REJECTED_MISSING_PHOTO',
        'REJECTED_INVALID_TRANSITION',
        'REJECTED_EMPLOYEE_INACTIVE'
      ],
      required: true
    },
    photoKey: {
      type: String,
      required: true
    },
    photoHash: {
      type: String,
      required: true
    },
    deviceId: {
      type: String,
      trim: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    isOverridden: {
      type: Boolean,
      default: false
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    overrideReason: {
      type: String,
      trim: true
    },
    overrideAt: {
      type: Date
    },
    retentionExpiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

attendancePunchSchema.plugin(tenantScopedPlugin);

// Compound Indexes for fast employee query, audit reporting, and idempotency
attendancePunchSchema.index({ companyId: 1, employeeId: 1, serverTimestamp: -1 });
attendancePunchSchema.index({ companyId: 1, idempotencyKey: 1 }, { unique: true });
attendancePunchSchema.index({ companyId: 1, verificationOutcome: 1, serverTimestamp: -1 });
attendancePunchSchema.index({ retentionExpiresAt: 1 }); // for automated retention cleanup

export const AttendancePunchModel: Model<IAttendancePunch> =
  (mongoose.models.AttendancePunch as Model<IAttendancePunch>) ||
  mongoose.model<IAttendancePunch>('AttendancePunch', attendancePunchSchema);
