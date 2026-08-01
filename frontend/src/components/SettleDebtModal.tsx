'use client';

import React, { useState } from 'react';
import { FiCheck, FiCalendar, FiCreditCard } from 'react-icons/fi';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { settleDebtSchema } from '../lib/validationSchemas';
import { CustomSelect } from './ui/CustomSelect';

interface SettleDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: {
    id: string;
    name: string;
    currentBalance: number;
  } | null;
}

export const SettleDebtModal: React.FC<SettleDebtModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customer
}) => {
  const formatToHTMLDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

  const [amount, setAmount] = useState<number>(customer?.currentBalance || 0);
  const [date, setDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Sync default amount when customer prop changes
  React.useEffect(() => {
    if (customer) {
      setAmount(customer.currentBalance > 0 ? customer.currentBalance : 0);
      setErrors({});
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const validateField = async (field: string, val: any) => {
    try {
      const payload = { amount, date, paymentMethod, notes, [field]: val };
      await settleDebtSchema.validateAt(field, payload);
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
        const payload = { amount, date, paymentMethod, notes, [fieldName]: target.value };
        await settleDebtSchema.validateAt(fieldName, payload);
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
      await settleDebtSchema.validate({ amount, date, paymentMethod, notes }, { abortEarly: false });
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

    setSaving(true);
    try {
      const res = await api.post(`/customers/${customer.id}/payments`, {
        amount,
        date,
        paymentMethod,
        reference,
        notes
      });

      toast.success(res.data.message || `Payment of ₹${amount.toFixed(2)} received from ${customer.name}!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error recording debt payment';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/60 text-slate-100 rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="p-2.5 sm:p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
            <FiCreditCard className="w-5 sm:w-6 h-5 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Settle Customer Debt</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Record cash, card, or bank settlement received from <strong className="text-white">{customer.name}</strong>
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-400">Current Outstanding Debt:</span>
          <span className="font-extrabold text-amber-400 text-base sm:text-lg">₹{customer.currentBalance.toFixed(2)}</span>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onFocus={e => e.target.select()}
              onKeyDown={e => handleKeyDown(e, 'amount')}
              onChange={e => {
                const raw = e.target.value;
                if (raw === '') {
                  setAmount(0);
                  validateField('amount', 0);
                  return;
                }
                const clean = raw.replace(/^0+(?=\d)/, '');
                const val = parseFloat(clean) || 0;
                setAmount(val);
                validateField('amount', val);
              }}
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 font-extrabold text-base focus:outline-none transition-colors ${
                errors.amount ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {errors.amount && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.amount}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Payment Date & Time
              </label>
              <input
                type="datetime-local"
                value={formatToHTMLDateTime(date)}
                max={formatToHTMLDateTime(new Date())}
                onClick={e => e.currentTarget.showPicker?.()}
                onKeyDown={e => handleKeyDown(e, 'date')}
                onChange={e => {
                  const value = e.target.value; 
                  if (value) {
                    const parsedDate = new Date(value);
                    setDate(parsedDate);
                    validateField('date', parsedDate);
                  } else {
                    validateField('date', null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none cursor-pointer ${
                  errors.date ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              {errors.date && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <CustomSelect
                options={[
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Credit/Debit Card', value: 'Card' },
                  { label: 'Bank Transfer', value: 'Bank Transfer' },
                  { label: 'Cheque', value: 'Cheque' }
                ]}
                value={paymentMethod}
                onChange={val => {
                  setPaymentMethod(val as any);
                  validateField('paymentMethod', val);
                }}
                error={errors.paymentMethod}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Reference / Receipt No (Optional)
            </label>
            <input
              type="text"
              maxLength={50}
              value={reference}
              onKeyDown={e => handleKeyDown(e, 'reference')}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. REC-9821 or Bank Ref #1029"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Notes / Remarks
            </label>
            <input
              type="text"
              maxLength={300}
              value={notes}
              onKeyDown={e => handleKeyDown(e, 'notes')}
              onChange={e => {
                setNotes(e.target.value);
                validateField('notes', e.target.value);
              }}
              placeholder="Partial debt payment, cash settlement..."
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none ${
                errors.notes ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {errors.notes && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.notes}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4" /> {saving ? 'Recording Payment...' : 'Record Payment Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
