import mongoose, { Schema, Document, Model } from 'mongoose';
import { tenantScopedPlugin } from '../tenantPlugin.js';

export interface IShift extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  gracePeriodMinutes: number;
  halfDayThresholdHours: number;
  fullDayThresholdHours: number;
  isNightShift: boolean;
  workDays: number[];
  weeklyOffs: number[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    },
    breakDurationMinutes: {
      type: Number,
      default: 60
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15
    },
    halfDayThresholdHours: {
      type: Number,
      default: 4.5
    },
    fullDayThresholdHours: {
      type: Number,
      default: 8.0
    },
    isNightShift: {
      type: Boolean,
      default: false
    },
    workDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5]
    },
    weeklyOffs: {
      type: [Number],
      default: [6, 7]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

shiftSchema.plugin(tenantScopedPlugin);

// Compound Unique Index: Code must be unique within the company
shiftSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const ShiftModel: Model<IShift> =
  (mongoose.models.Shift as Model<IShift>) || mongoose.model<IShift>('Shift', shiftSchema);
