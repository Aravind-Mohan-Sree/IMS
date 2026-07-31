import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    description: { type: String, default: '', trim: true, maxlength: 150 }
  },
  { timestamps: true }
);

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const CategoryModel = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
