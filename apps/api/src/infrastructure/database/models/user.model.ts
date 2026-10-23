import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole, UserRoleType } from '@workforcepro/api-contracts';
import { tenantScopedPlugin } from '../tenantPlugin.js';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED';
  branchId?: mongoose.Types.ObjectId | null;
  departmentId?: mongoose.Types.ObjectId | null;
  boundDeviceId?: string | null;
  deviceModel?: string | null;
  deviceBoundAt?: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  passwordChangedAt?: Date | null;
  refreshTokenHash?: string | null;
  tokenVersion: number;
  invitationToken?: string | null;
  invitationExpiresAt?: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
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
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'INVITED', 'SUSPENDED'],
      default: 'ACTIVE'
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    boundDeviceId: {
      type: String,
      default: null
    },
    deviceModel: {
      type: String,
      default: null
    },
    deviceBoundAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    lastLoginIp: {
      type: String,
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    refreshTokenHash: {
      type: String,
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 1
    },
    invitationToken: {
      type: String,
      default: null,
      index: true
    },
    invitationExpiresAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const record = ret as Record<string, unknown>;
        delete record.passwordHash;
        delete record.refreshTokenHash;
        delete record.invitationToken;
        return record;
      }
    }
  }
);

// Apply tenant scoping plugin
userSchema.plugin(tenantScopedPlugin);

// Compound Unique Index: One email per company
userSchema.index({ companyId: 1, email: 1 }, { unique: true });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, branchId: 1 });

export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema);
