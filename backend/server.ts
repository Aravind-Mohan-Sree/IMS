import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes';
import itemRoutes from './src/routes/itemRoutes';
import customerRoutes from './src/routes/customerRoutes';
import saleRoutes from './src/routes/saleRoutes';
import reportRoutes from './src/routes/reportRoutes';
import exportRoutes from './src/routes/exportRoutes';
import categoryRoutes from './src/routes/categoryRoutes';
import { connectDB } from './src/config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with credentials support for HttpOnly cookies
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/categories', categoryRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Connect to MongoDB
connectDB();

// Export the app for Vercel Serverless
export default app;

// Start the server locally only in development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`IMS Backend Server running on port ${PORT}`);
  });
}
