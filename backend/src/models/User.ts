import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  otpCode?: string;
  otpExpiresAt?: Date;
  otpLastSentAt?: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpLastSentAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.otpCode;
        delete ret.otpExpiresAt;
        delete ret.otpLastSentAt;
      }
    }
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
