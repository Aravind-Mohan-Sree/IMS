import mongoose from 'mongoose';

let isMongoConnected = false;

export const connectDB = async (): Promise<boolean> => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ims_db';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isMongoConnected = true;
    console.log(`MongoDB Connected successfully`);
    return true;
  } catch (err: any) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    isMongoConnected = false;
    return false;
  }
};

export const getIsMongoConnected = () => isMongoConnected;
