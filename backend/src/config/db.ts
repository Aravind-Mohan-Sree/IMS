import mongoose from 'mongoose';
// import 'dotenv/config';

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ims_db';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async (): Promise<boolean> => {
  if (cached.conn) {
    return true;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', false);
    
    const opts = {
      bufferCommands: false, 
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(mongoURI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    console.log(`MongoDB Connected successfully`);
    return true;
  } catch (err: any) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    cached.promise = null; 
    return false;
  }
};

export const getIsMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};
