'use client';

import React, { useState, useEffect } from 'react';
import { FiMail, FiLock, FiKey } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../lib/api';
import { forgotPasswordSchema, resetPasswordSchema } from '../lib/validationSchemas';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [serverError, setServerError] = useState('');
  const [cooldownTimer, setCooldownTimer] = useState<number>(0);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // 1-second countdown timer effect
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (cooldownTimer > 0) {
      timerId = setInterval(() => {
        setCooldownTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [cooldownTimer]);

  // Check Redis cooldown for email when navigating to step 2
  const checkRedisCooldown = async (targetEmail: string) => {
    if (!targetEmail) return;
    try {
      const res = await api.post('/auth/otp-cooldown', { email: targetEmail, type: 'forgot' });
      if (res.data?.remainingSeconds > 0) {
        setCooldownTimer(res.data.remainingSeconds);
      }
    } catch (_e) {
      // ignore
    }
  };

  // Reset form inputs & step every time modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setOtp('');
      setNewPassword('');
      setErrors({});
      setServerError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setErrors({});
    setServerError('');
    onClose();
  };

  const validateField = async (field: string, val: any) => {
    try {
      if (step === 1) {
        await forgotPasswordSchema.validateAt(field, { email, [field]: val });
      } else {
        await resetPasswordSchema.validateAt(field, { email, otp, newPassword, [field]: val });
      }
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [field]: err.message }));
    }
  };

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>,
    fieldName: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      try {
        if (step === 1) {
          await forgotPasswordSchema.validateAt(fieldName, { email, [fieldName]: target.value });
        } else {
          await resetPasswordSchema.validateAt(fieldName, { email, otp, newPassword, [fieldName]: target.value });
        }
        setErrors(prev => ({ ...prev, [fieldName]: '' }));

        const form = target.form;
        if (form) {
          const elements = Array.from(
            form.querySelectorAll<HTMLElement>(
              'input:not([type="hidden"]):not([disabled])'
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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    try {
      await forgotPasswordSchema.validate({ email }, { abortEarly: false });
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
      const res = await api.post('/auth/forgot-password', { email });
      toast.success('6-digit OTP code sent to your email!');
      if (res.data.remainingSeconds) {
        setCooldownTimer(res.data.remainingSeconds);
      } else {
        setCooldownTimer(60);
      }
      setStep(2);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP code';
      setServerError(errorMsg);
      if (err.response?.data?.remainingSeconds) {
        setCooldownTimer(err.response.data.remainingSeconds);
        setStep(2);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownTimer > 0) return;
    setServerError('');
    setIsResending(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success('A new 6-digit OTP code has been sent to your email!');
      if (res.data.remainingSeconds) {
        setCooldownTimer(res.data.remainingSeconds);
      } else {
        setCooldownTimer(60);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to resend OTP code';
      setServerError(errorMsg);
      if (err.response?.data?.remainingSeconds) {
        setCooldownTimer(err.response.data.remainingSeconds);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    try {
      await resetPasswordSchema.validate({ email, otp, newPassword }, { abortEarly: false });
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
      const res = await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success(res.data.message || 'Password reset successfully!');
      onSuccess(email);
      handleClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password';
      setServerError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl max-w-md w-full p-6 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <FiKey className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reset Password</h3>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Enter your registered email' : 'Verify OTP & set new password'}
              </p>
            </div>
          </div>
        </div>

        {serverError && (
          <p className="text-xs text-rose-400 font-semibold mb-4 animate-fade-in bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg text-center">
            {serverError}
          </p>
        )}

        {step === 1 ? (
          <form noValidate onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
                <input
                  type="email"
                  maxLength={50}
                  value={email}
                  onKeyDown={e => handleKeyDown(e, 'email')}
                  onChange={e => {
                    setEmail(e.target.value);
                    setServerError('');
                    validateField('email', e.target.value);
                  }}
                  placeholder="user@domain.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-sm transition-colors ${
                    errors.email ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.email && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.email}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending OTP...' : 'Send OTP Code'}
              </button>
            </div>
          </form>
        ) : (
          <form noValidate onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  6-Digit OTP Code *
                </label>
                <button
                  type="button"
                  disabled={isResending || cooldownTimer > 0}
                  onClick={handleResendOtp}
                  className="text-xs font-medium text-teal-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                >
                  {isResending
                    ? 'Resending OTP...'
                    : cooldownTimer > 0
                    ? `Resend OTP in ${cooldownTimer}s`
                    : 'Resend OTP'}
                </button>
              </div>
              <div className="relative">
                <FiKey className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onKeyDown={e => handleKeyDown(e, 'otp')}
                  onChange={e => {
                    setOtp(e.target.value);
                    setServerError('');
                    validateField('otp', e.target.value);
                  }}
                  placeholder="123456"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950 border rounded-xl text-slate-100 font-mono tracking-widest text-sm focus:outline-none transition-colors ${
                    errors.otp ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.otp && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.otp}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                New Password *
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
                <input
                  type="password"
                  maxLength={64}
                  value={newPassword}
                  onKeyDown={e => handleKeyDown(e, 'newPassword')}
                  onChange={e => {
                    setNewPassword(e.target.value);
                    setServerError('');
                    validateField('newPassword', e.target.value);
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none text-sm transition-colors ${
                    errors.newPassword ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.newPassword && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.newPassword}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
