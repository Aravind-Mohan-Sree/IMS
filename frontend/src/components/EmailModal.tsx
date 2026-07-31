'use client';

import React, { useState } from 'react';
import { FiMail, FiSend, FiCheckCircle } from 'react-icons/fi';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { emailReportSchema } from '../lib/validationSchemas';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: string;
  defaultSubject?: string;
  reportType?: string;
  customerId?: string;
  saleId?: string;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  defaultRecipient = '',
  defaultSubject = 'Inventory System Report',
  reportType = 'General Report',
  customerId,
  saleId
}) => {
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(
    `Dear Recipient,\n\nPlease find attached the ${reportType} generated from our Inventory Management System.\n\nBest regards,\nIMS Operations`
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setRecipient(defaultRecipient || '');
      setSubject(defaultSubject || 'Inventory System Report');
      setErrors({});
    }
  }, [isOpen, defaultRecipient, defaultSubject]);

  if (!isOpen) return null;

  const validateField = async (field: string, val: any) => {
    try {
      const payload = { recipient, subject, message, [field]: val };
      await emailReportSchema.validateAt(field, payload);
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [field]: err.message }));
    }
  };

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    fieldName: string
  ) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      try {
        const payload = { recipient, subject, message, [fieldName]: target.value };
        await emailReportSchema.validateAt(fieldName, payload);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      await emailReportSchema.validate({ recipient, subject, message }, { abortEarly: false });
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

    setSending(true);
    try {
      await api.post('/export/email', {
        email: recipient,
        subject,
        message,
        reportType,
        customerId,
        saleId
      });
      toast.success(`Email report successfully sent to ${recipient}!`);
      onClose();
    } catch (_err: unknown) {
      toast.error(`Failed to send email report to ${recipient}`);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/60 text-slate-100 rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="p-2.5 sm:p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
            <FiMail className="w-5 sm:w-6 h-5 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Email Report / Document</h3>
            <p className="text-xs sm:text-sm text-slate-400">Send PDF/Excel attachments directly via email</p>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Recipient Email Address *
            </label>
            <input
              type="email"
              maxLength={100}
              value={recipient}
              onKeyDown={e => handleKeyDown(e, 'recipient')}
              onChange={e => {
                setRecipient(e.target.value);
                validateField('recipient', e.target.value);
              }}
              placeholder="e.g. client@example.com"
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                errors.recipient ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {errors.recipient && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.recipient}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Subject Line *
            </label>
            <input
              type="text"
              maxLength={150}
              value={subject}
              onKeyDown={e => handleKeyDown(e, 'subject')}
              onChange={e => {
                setSubject(e.target.value);
                validateField('subject', e.target.value);
              }}
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                errors.subject ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {errors.subject && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.subject}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Message Body *
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={message}
              onKeyDown={e => handleKeyDown(e, 'message')}
              onChange={e => {
                setMessage(e.target.value);
                validateField('message', e.target.value);
              }}
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors resize-none ${
                errors.message ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {errors.message && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.message}</p>}
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Attachment auto-generated as PDF for: <strong className="text-slate-200">{reportType}</strong></span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <FiSend className="w-4 h-4" /> Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
