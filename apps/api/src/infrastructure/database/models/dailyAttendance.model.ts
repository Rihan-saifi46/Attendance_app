import mongoose, { Schema, Document, Model } from 'mongoose';
import { tenantScopedPlugin } from '../tenantPlugin.js';

export interface IDailyAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  shiftId?: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  status: 'PRESENT' | 'HALF_DAY' | 'LATE' | 'ABSENT' | 'CHECKED_IN';
  firstCheckIn?: {
    punchId: mongoose.Types.ObjectId;
    time: Date;
    coordinates: {
      latitude: number;
      longitude: number;
      accuracyMeters: number;
    };
    photoKey: string;
    distanceMeters: number;
  };
  lastCheckOut?: {
    punchId: mongoose.Types.ObjectId;
    time: Date;
    coordinates: {
      latitude: number;
      longitude: number;
      accuracyMeters: number;
    };
    photoKey: string;
    distanceMeters: number;
  };
  totalPunches: number;
  totalWorkMinutes: number;
  lateMinutes: number;
  isLate: boolean;
  isOverridden: boolean;
  overrideReason?: string;
  overrideBy?: mongoose.Types.ObjectId;
  overrideAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const dailyAttendanceSchema = new Schema<IDailyAttendance>(
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
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift'
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    status: {
      type: String,
      enum: ['PRESENT', 'HALF_DAY', 'LATE', 'ABSENT', 'CHECKED_IN'],
      required: true,
      default: 'CHECKED_IN'
    },
    firstCheckIn: {
      punchId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePunch' },
      time: { type: Date },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracyMeters: { type: Number }
      },
      photoKey: { type: String },
      distanceMeters: { type: Number }
    },
    lastCheckOut: {
      punchId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePunch' },
      time: { type: Date },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracyMeters: { type: Number }
      },
      photoKey: { type: String },
      distanceMeters: { type: Number }
    },
    totalPunches: {
      type: Number,
      default: 0
    },
    totalWorkMinutes: {
      type: Number,
      default: 0
    },
    lateMinutes: {
      type: Number,
      default: 0
    },
    isLate: {
      type: Boolean,
      default: false
    },
    isOverridden: {
      type: Boolean,
      default: false
    },
    overrideReason: {
      type: String,
      trim: true
    },
    overrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    overrideAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

dailyAttendanceSchema.plugin(tenantScopedPlugin);

// Unique compound index: One daily attendance record per employee per date per tenant
dailyAttendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });
dailyAttendanceSchema.index({ companyId: 1, date: 1, status: 1 });

export const DailyAttendanceModel: Model<IDailyAttendance> =
  (mongoose.models.DailyAttendance as Model<IDailyAttendance>) ||
  mongoose.model<IDailyAttendance>('DailyAttendance', dailyAttendanceSchema);
