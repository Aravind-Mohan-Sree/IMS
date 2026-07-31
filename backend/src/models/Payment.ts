import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Cheque';
  reference?: string;
  notes?: string;
  createdAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Bank Transfer', 'Cheque'], default: 'Cash' },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' }
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

export const PaymentModel = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
