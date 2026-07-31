import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  description: string;
  quantity: number;
  price: number;
  costPrice: number;
  category: string;
  unit: string;
  minStockLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0, default: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    category: { type: String, default: 'General', trim: true },
    unit: { type: String, default: 'pcs', trim: true },
    minStockLevel: { type: Number, default: 5 }
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

ItemSchema.index({ userId: 1, sku: 1 }, { unique: true });
ItemSchema.index({ name: 'text', description: 'text', sku: 'text' });

export const ItemModel = mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema);
