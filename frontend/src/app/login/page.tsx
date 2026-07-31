'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { FiLock, FiMail, FiUser, FiBox, FiKey } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../lib/api';
import { loginSchema, registerSchema } from '../../lib/validationSchemas';
import { ForgotPasswordModal } from '../../components/ForgotPasswordModal';

export default function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const router = useRouter();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupCooldownTimer, setSignupCooldownTimer] = useState<number>(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // 1-second countdown timer for Sign Up OTP Resend
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (signupCooldownTimer > 0) {
      timerId = setInterval(() => {
        setSignupCooldownTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [signupCooldownTimer]);

  // Check Redis for active Sign Up OTP cooldown on email change
  const checkSignupCooldown = async (targetEmail: string) => {
    if (!targetEmail || !targetEmail.includes('@')) return;
    try {
      const res = await api.post('/auth/otp-cooldown', { email: targetEmail, type: 'signup' });
      if (res.data?.remainingSeconds > 0) {
        setSignupCooldownTimer(res.data.remainingSeconds);
        setSignupOtpSent(true);
      }
    } catch (_e) {
      // ignore
    }
  };

  if (loading || user) return null;

  const activeSchema = isRegisterMode ? registerSchema : loginSchema;

  const validateField = async (field: string, val: any) => {
    try {
      const payload = { name, email, password, [field]: val };
      await activeSchema.validateAt(field, payload);
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [field]: err.message }));
    }
  };

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    fieldName: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      try {
        const payload = { name, email, password, [fieldName]: target.value };
        await activeSchema.validateAt(fieldName, payload);
        setErrors(prev => ({ ...prev, [fieldName]: '' }));

        const form = target.form;
        if (form) {
          const elements = Array.from(
            form.querySelectorAll<HTMLElement>(
              'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
            )
          );
          const currentIndex = elements.indexOf(target);
          if (currentIndex >= 0 && currentIndex < elements.length - 1) {
            elements[currentIndex + 1].focus();
          } else if (currentIndex === elements.length - 1) {
            form.requestSubmit();
          }
        }
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message || '';
        setErrors(prev => ({ ...prev, [fieldName]: msg }));
      }
    }
  };

  const handleSendSignupOtp = async () => {
    setAuthError('');
    setErrors({});
    try {
      await registerSchema.validate({ name, email, password }, { abortEarly: false });
    } catch (valErr: any) {
      const fieldErrors: Record<string, string> = {};
      if (valErr.inner) {
        valErr.inner.forEach((err: any) => {
          if (err.path && !fieldErrors[err.path]) {
            fieldErrors[err.path] = err.message;
          }
        });
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await api.post('/auth/signup/send-otp', { name, email, password });
      toast.success('6-digit Sign Up OTP sent to your email!');
      setSignupOtpSent(true);
      if (res.data?.remainingSeconds) {
        setSignupCooldownTimer(res.data.remainingSeconds);
      } else {
        setSignupCooldownTimer(60);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setAuthError(msg);
      if (err.response?.data?.remainingSeconds) {
        setSignupCooldownTimer(err.response.data.remainingSeconds);
        setSignupOtpSent(true);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthError('');

    if (!isRegisterMode) {
      try {
        await loginSchema.validate({ email, password }, { abortEarly: false });
      } catch (valErr: any) {
        const fieldErrors: Record<string, string> = {};
        if (valErr.inner) {
          valErr.inner.forEach((err: any) => {
            if (err.path && !fieldErrors[err.path]) {
              fieldErrors[err.path] = err.message;
            }
          });
        }
        setErrors(fieldErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        await login(email, password);
        toast.success('Welcome back!');
        router.push('/dashboard');
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Invalid email or password';
        setAuthError(msg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Sign Up Mode Flow
    if (!signupOtpSent) {
      await handleSendSignupOtp();
      return;
    }

    if (!otp || otp.trim().length !== 6) {
      setErrors(prev => ({ ...prev, otp: '6-digit OTP code is required' }));
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password, otp.trim());
      toast.success('Registration successful!');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please verify your OTP.';
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-500/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3.5 bg-gradient-to-tr from-indigo-600 to-teal-500 rounded-2xl shadow-xl mb-3">
            <FiBox className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Inventory Management System
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isRegisterMode ? 'Create a new account' : 'Sign in to access your inventory'}
          </p>
          {authError && (
            <p className="text-xs text-rose-400 font-semibold mt-2 animate-fade-in bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
              {authError}
            </p>
          )}
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  maxLength={100}
                  value={name}
                  onKeyDown={e => handleKeyDown(e, 'name')}
                  onChange={e => {
                    setName(e.target.value);
                    setAuthError('');
                    validateField('name', e.target.value);
                  }}
                  placeholder="User"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-sm transition-colors ${
                    errors.name ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.name && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.name}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
              <input
                type="email"
                maxLength={100}
                value={email}
                onKeyDown={e => handleKeyDown(e, 'email')}
                onChange={e => {
                  const val = e.target.value;
                  setEmail(val);
                  setAuthError('');
                  validateField('email', val);
                  if (isRegisterMode) {
                    checkSignupCooldown(val);
                  }
                }}
                placeholder="user@domain.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-sm transition-colors ${
                  errors.email ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.email && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password *
              </label>
              {!isRegisterMode && (
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs font-medium text-teal-400 hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
              <input
                type="password"
                maxLength={128}
                value={password}
                onKeyDown={e => handleKeyDown(e, 'password')}
                onChange={e => {
                  setPassword(e.target.value);
                  setAuthError('');
                  validateField('password', e.target.value);
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-sm transition-colors ${
                  errors.password ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.password && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.password}</p>}
          </div>

          {/* OTP Code Field during Sign Up */}
          {isRegisterMode && signupOtpSent && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  6-Digit OTP Code *
                </label>
                <button
                  type="button"
                  disabled={isSendingOtp || signupCooldownTimer > 0}
                  onClick={handleSendSignupOtp}
                  className="text-xs font-medium text-teal-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSendingOtp
                    ? 'Sending OTP...'
                    : signupCooldownTimer > 0
                    ? `Resend OTP in ${signupCooldownTimer}s`
                    : 'Resend OTP'}
                </button>
              </div>
              <div className="relative">
                <FiKey className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => {
                    setOtp(e.target.value.replace(/[^0-9]/g, ''));
                    setErrors(prev => ({ ...prev, otp: '' }));
                    setAuthError('');
                  }}
                  placeholder="123456"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950 border rounded-xl text-slate-100 font-mono tracking-widest text-sm focus:outline-none transition-colors ${
                    errors.otp ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.otp && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.otp}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isSendingOtp}
            className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 text-sm disabled:opacity-50"
          >
            {isSubmitting || isSendingOtp
              ? 'Processing...'
              : !isRegisterMode
              ? 'Sign In'
              : !signupOtpSent
              ? 'Send OTP'
              : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isRegisterMode ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              const nextMode = !isRegisterMode;
              setIsRegisterMode(nextMode);
              setName('');
              setEmail('');
              setPassword('');
              setOtp('');
              setSignupOtpSent(false);
              setSignupCooldownTimer(0);
              setErrors({});
              setAuthError('');
              if (nextMode && email) {
                checkSignupCooldown(email);
              }
            }}
            className="font-semibold text-teal-400 hover:underline ml-1"
          >
            {isRegisterMode ? 'Sign In' : 'Register Now'}
          </button>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccess={resetEmail => {
          setEmail(resetEmail);
          setPassword('');
          setAuthError('');
        }}
      />
    </div>
  );
}
