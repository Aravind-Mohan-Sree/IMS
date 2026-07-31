'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuthSession = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
      }
    } catch (_err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData } = res.data;
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string, otp: string) => {
    const res = await api.post('/auth/register', { name, email, password, otp });
    const { user: userData } = res.data;
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_e) {
      console.error('Logout request failed');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
