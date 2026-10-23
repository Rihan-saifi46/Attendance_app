import mongoose, { Schema, Document, Model } from 'mongoose';
import { tenantScopedPlugin } from '../tenantPlugin.js';

export interface IEmployeeFieldDiff {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface IEmployeeHistory extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  changedByUserId: mongoose.Types.ObjectId;
  changedByEmail: string;
  changeType: string;
  diff: IEmployeeFieldDiff[];
  reason?: string | null;
  createdAt: Date;
}

const employeeHistorySchema = new Schema<IEmployeeHistory>(
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
    changedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedByEmail: {
      type: String,
      required: true,
      trim: true
    },
    changeType: {
      type: String,
      required: true,
      enum: [
        'PROFILE_UPDATE',
        'ROLE_CHANGE',
        'DEPARTMENT_TRANSFER',
        'BRANCH_TRANSFER',
        'SHIFT_ASSIGNMENT',
        'SALARY_UPDATE',
        'STATUS_CHANGE'
      ]
    },
    diff: [
      {
        field: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed }
      }
    ],
    reason: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

employeeHistorySchema.plugin(tenantScopedPlugin);

// Compound Index: History retrieval for an employee in a company
employeeHistorySchema.index({ companyId: 1, employeeId: 1, createdAt: -1 });

export const EmployeeHistoryModel: Model<IEmployeeHistory> =
  (mongoose.models.EmployeeHistory as Model<IEmployeeHistory>) ||
  mongoose.model<IEmployeeHistory>('EmployeeHistory', employeeHistorySchema);
