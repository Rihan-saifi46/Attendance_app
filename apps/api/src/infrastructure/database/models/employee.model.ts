import mongoose, { Schema, Document, Model } from 'mongoose';
import { tenantScopedPlugin } from '../tenantPlugin.js';

export interface ISalaryDetails {
  salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY';
  baseRate: number;
  currency: string;
  bankName?: string;
  accountNumberEncrypted?: string;
  accountNumberMasked?: string;
  routingCode?: string;
  taxIdEncrypted?: string;
  taxIdMasked?: string;
}

export interface IEmployeeAddress {
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface IEmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  employeeCode: string;
  userId?: mongoose.Types.ObjectId | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: Date | null;
  joiningDate: Date;
  exitDate?: Date | null;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  employmentStatus: 'ACTIVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'RESIGNED' | 'TERMINATED';
  designation: string;
  departmentId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId | null;
  address?: IEmployeeAddress;
  emergencyContact?: IEmergencyContact;
  salaryDetails?: ISalaryDetails;
  avatarUrl?: string | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    employeeCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER']
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    joiningDate: {
      type: Date,
      required: true
    },
    exitDate: {
      type: Date,
      default: null
    },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME'
    },
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED'],
      default: 'ACTIVE'
    },
    designation: {
      type: String,
      required: true,
      trim: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
      index: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true }
    },
    salaryDetails: {
      salaryType: {
        type: String,
        enum: ['MONTHLY', 'DAILY', 'HOURLY'],
        default: 'MONTHLY'
      },
      baseRate: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      },
      bankName: { type: String, trim: true },
      accountNumberEncrypted: { type: String },
      accountNumberMasked: { type: String },
      routingCode: { type: String, trim: true },
      taxIdEncrypted: { type: String },
      taxIdMasked: { type: String }
    },
    avatarUrl: {
      type: String,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: any, options: any) {
        ret.id = ret._id ? String(ret._id) : ret.id;
        delete ret._id;
        delete ret.__v;
        // Strip sensitive financial / salary and private identity data in public projections
        if (!options?.includeSensitiveSalary) {
          delete ret.salaryDetails;
        } else if (ret.salaryDetails && typeof ret.salaryDetails === 'object') {
          delete ret.salaryDetails.accountNumberEncrypted;
          delete ret.salaryDetails.taxIdEncrypted;
        }
        return ret;
      }
    }
  }
);

employeeSchema.plugin(tenantScopedPlugin);

// Compound Unique Indexes within Company
employeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, branchId: 1 });
employeeSchema.index({ companyId: 1, departmentId: 1 });
employeeSchema.index({ companyId: 1, employmentStatus: 1 });

export const EmployeeModel: Model<IEmployee> =
  (mongoose.models.Employee as Model<IEmployee>) ||
  mongoose.model<IEmployee>('Employee', employeeSchema);
