'use client';

import React, { useState, useEffect } from 'react';
import { FiUserPlus, FiCheck } from 'react-icons/fi';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { customerSchema } from '../lib/validationSchemas';

export interface CustomerData {
  id?: string;
  name: string;
  address: string;
  mobile: string;
  email?: string;
  notes?: string;
  openingBalance?: number;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: CustomerData | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer
}) => {
  const [formData, setFormData] = useState<CustomerData>({
    name: '',
    address: '',
    mobile: '',
    email: '',
    notes: '',
    openingBalance: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (initialCustomer) {
      setFormData({
        id: initialCustomer.id,
        name: initialCustomer.name || '',
        address: initialCustomer.address || '',
        mobile: initialCustomer.mobile || '',
        email: initialCustomer.email || '',
        notes: initialCustomer.notes || '',
        openingBalance: initialCustomer.openingBalance || 0
      });
    } else {
      setFormData({
        name: '',
        address: '',
        mobile: '',
        email: '',
        notes: '',
        openingBalance: 0
      });
    }
  }, [initialCustomer, isOpen]);

  if (!isOpen) return null;

  const validateField = async (field: string, updatedData: CustomerData) => {
    try {
      await customerSchema.validateAt(field, updatedData);
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [field]: err.message }));
    }
  };

  const handleFieldChange = (field: keyof CustomerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    validateField(field as string, updatedData);
  };

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    fieldName: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      try {
        const payload = { ...formData, [fieldName]: target.value };
        await customerSchema.validateAt(fieldName, payload);
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
      await customerSchema.validate(formData, { abortEarly: false });
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

    if (formData.id && initialCustomer) {
      const isUnchanged =
        formData.name.trim() === (initialCustomer.name || '').trim() &&
        formData.address.trim() === (initialCustomer.address || '').trim() &&
        formData.mobile.trim() === (initialCustomer.mobile || '').trim() &&
        (formData.email || '').trim() === (initialCustomer.email || '').trim() &&
        (formData.notes || '').trim() === (initialCustomer.notes || '').trim() &&
        (formData.openingBalance || 0) === (initialCustomer.openingBalance || 0);
      if (isUnchanged) {
        onClose();
        return;
      }
    }

    setSaving(true);
    try {
      if (formData.id) {
        await api.put(`/customers/${formData.id}`, formData);
        toast.success('Customer details updated!');
      } else {
        await api.post('/customers', formData);
        toast.success('New customer created successfully!');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error saving customer';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/60 text-slate-100 rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="p-2.5 sm:p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
            <FiUserPlus className="w-5 sm:w-6 h-5 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">
              {formData.id ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">Enter customer contact and ledger information</p>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Customer / Business Name *
            </label>
            <input
              type="text"
              maxLength={40}
              value={formData.name}
              onKeyDown={e => handleKeyDown(e, 'name')}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder="e.g. Ajith/Acme Corporation"
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                errors.name ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-blue-500'
              }`}
            />
            {errors.name && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                maxLength={15}
                value={formData.mobile}
                onKeyDown={e => handleKeyDown(e, 'mobile')}
                onChange={e => handleFieldChange('mobile', e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                  errors.mobile ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              {errors.mobile && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.mobile}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                maxLength={50}
                value={formData.email}
                onKeyDown={e => handleKeyDown(e, 'email')}
                onChange={e => handleFieldChange('email', e.target.value)}
                placeholder="customer@domain.com"
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                  errors.email ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              {errors.email && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Address
            </label>
            <textarea
              rows={2}
              maxLength={150}
              value={formData.address}
              onKeyDown={e => handleKeyDown(e, 'address')}
              onChange={e => handleFieldChange('address', e.target.value)}
              placeholder="Street address, city, state..."
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors resize-none ${
                errors.address ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-blue-500'
              }`}
            />
            {errors.address && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                disabled={!!formData.id}
                step="0.01"
                value={formData.openingBalance}
                onFocus={e => e.target.select()}
                onKeyDown={e => handleKeyDown(e, 'openingBalance')}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') {
                    handleFieldChange('openingBalance', 0);
                    return;
                  }
                  const clean = raw.replace(/^0+(?=\d)/, '');
                  const parsed = parseFloat(clean);
                  handleFieldChange('openingBalance', isNaN(parsed) ? 0 : parsed);
                }}
                placeholder="0.00"
                className={`w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500 ${
                  formData.id ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              {errors.openingBalance && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.openingBalance}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Notes / Remarks
              </label>
              <input
                type="text"
                maxLength={200}
                value={formData.notes}
                onKeyDown={e => handleKeyDown(e, 'notes')}
                onChange={e => handleFieldChange('notes', e.target.value)}
                placeholder="Payment terms, special instructions..."
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                  errors.notes ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              {errors.notes && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.notes}</p>}
            </div>
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
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4" /> {saving ? 'Saving...' : formData.id ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
