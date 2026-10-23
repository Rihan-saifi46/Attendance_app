import mongoose, { Schema, Document, Model } from 'mongoose';
import { tenantScopedPlugin } from '../tenantPlugin.js';

export interface IBranch extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  timezone: string;
  isHeadquarters: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    street: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
    timezone: { type: String, default: 'UTC' },
    isHeadquarters: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

branchSchema.plugin(tenantScopedPlugin);

// Compound Unique Index: Code must be unique within the company
branchSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const BranchModel: Model<IBranch> =
  (mongoose.models.Branch as Model<IBranch>) || mongoose.model<IBranch>('Branch', branchSchema);
