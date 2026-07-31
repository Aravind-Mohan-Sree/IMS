import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  mobile: string;
  email: string;
  notes?: string;
  openingBalance: number;
  currentBalance: number;
  createdAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

CustomerSchema.index({ userId: 1, mobile: 1 }, { unique: true });
CustomerSchema.index({ name: 'text', mobile: 'text', address: 'text' });

export const CustomerModel = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
