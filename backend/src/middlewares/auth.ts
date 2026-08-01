import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { connectDB } from '../config/db';

export const getAccessTokenSecret = () =>
  process.env.ACCESS_TOKEN_SECRET || 'ims_access_token_secret_key_2026';

export const getRefreshTokenSecret = () =>
  process.env.REFRESH_TOKEN_SECRET || 'ims_refresh_token_secret_key_2026';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  await connectDB();
  
  // Extract token from cookies first, or fallback to Authorization header
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, getAccessTokenSecret()) as {
      id: string;
      email: string;
      role: string;
      name: string;
    };

    // Verify user still exists in MongoDB database
    const userExists = await UserModel.exists({ _id: decoded.id });
    if (!userExists) {
      res.clearCookie('accessToken', COOKIE_OPTIONS);
      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      return res.status(401).json({ message: 'User account no longer exists in database.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Access token expired or invalid.', code: 'TOKEN_EXPIRED' });
  }
};
