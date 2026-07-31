import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ISale extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  invoiceNo: string;
  customerId: string | null;
  customerName: string;
  customerMobile?: string;
  saleDate: Date;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Credit';
  notes?: string;
  createdAt: Date;
}

const SaleItemSchema: Schema = new Schema({
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
}, { _id: false });

const SaleSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoiceNo: { type: String, required: true },
    customerId: { type: String, default: null },
    customerName: { type: String, required: true, default: 'Cash Customer' },
    customerMobile: { type: String, default: '' },
    saleDate: { type: Date, required: true, default: Date.now },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Bank Transfer', 'Credit'], default: 'Cash' },
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

SaleSchema.index({ userId: 1, invoiceNo: 1 }, { unique: true });

export const SaleModel = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);
