import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  subdomain: string;
  legalRegistrationNumber?: string;
  contactEmail: string;
  contactPhone?: string;
  country: string;
  timezone: string;
  currency: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
  settings: {
    allowMockGpsForTesting: boolean;
    enforceDeviceBinding: boolean;
    requireSelfieForPunch: boolean;
    gracePeriodMinutesDefault: number;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    legalRegistrationNumber: { type: String, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    country: { type: String, default: 'US' },
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'],
      default: 'ACTIVE'
    },
    settings: {
      allowMockGpsForTesting: { type: Boolean, default: false },
      enforceDeviceBinding: { type: Boolean, default: true },
      requireSelfieForPunch: { type: Boolean, default: true },
      gracePeriodMinutesDefault: { type: Number, default: 15 }
    },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

companySchema.index({ status: 1 });

export const CompanyModel: Model<ICompany> =
  (mongoose.models.Company as Model<ICompany>) ||
  mongoose.model<ICompany>('Company', companySchema);
