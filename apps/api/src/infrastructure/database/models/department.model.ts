import mongoose, { Schema, Document, Model } from 'mongoose';
import { tenantScopedPlugin } from '../tenantPlugin.js';

export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  parentDepartmentId?: mongoose.Types.ObjectId | null;
  managerId?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
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
    parentDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
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

departmentSchema.plugin(tenantScopedPlugin);

// Compound Unique Index: Code must be unique within the company
departmentSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const DepartmentModel: Model<IDepartment> =
  (mongoose.models.Department as Model<IDepartment>) ||
  mongoose.model<IDepartment>('Department', departmentSchema);
