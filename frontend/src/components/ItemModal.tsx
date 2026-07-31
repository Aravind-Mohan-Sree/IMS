'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiPackage, FiCheck } from 'react-icons/fi';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { itemSchema } from '../lib/validationSchemas';
import { SearchableSelect } from './ui/SearchableSelect';

export interface ItemData {
  id?: string;
  name: string;
  sku?: string;
  description: string;
  quantity: number;
  price: number;
  costPrice?: number;
  category: string;
  unit: string;
  minStockLevel: number;
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: ItemData | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItem
}) => {
  const [formData, setFormData] = useState<ItemData>({
    name: '',
    sku: '',
    description: '',
    quantity: 0,
    price: 0,
    costPrice: 0,
    category: '',
    unit: 'pcs',
    minStockLevel: 5
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Sync state when modal is toggled open or initialItem changes
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (initialItem) {
      setFormData({
        id: initialItem.id,
        name: initialItem.name || '',
        sku: initialItem.sku || '',
        description: initialItem.description || '',
        quantity: initialItem.quantity || 0,
        price: initialItem.price || 0,
        costPrice: initialItem.costPrice || 0,
        category: initialItem.category || '',
        unit: initialItem.unit || 'pcs',
        minStockLevel: initialItem.minStockLevel || 5
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        quantity: 10,
        price: 19.99,
        costPrice: 10.00,
        category: '',
        unit: 'pcs',
        minStockLevel: 5
      });
    }
  }, [initialItem, isOpen]);

  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Fetch Categories for SearchableSelect
  const fetchCategoryOptions = useCallback(async (search: string, page: number) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '15',
      search
    });
    const res = await api.get(`/categories?${params.toString()}`);
    const cats = res.data.categories || (Array.isArray(res.data) ? res.data : []);
    const options = cats.map((c: any) => ({
      label: c.name,
      value: c.name,
      raw: c
    }));
    return {
      options,
      hasMore: res.data.hasMore || false
    };
  }, []);

  if (!isOpen) return null;

  const validateField = async (field: string, updatedData: ItemData) => {
    try {
      await itemSchema.validateAt(field, updatedData);
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [field]: err.message }));
    }
  };

  const handleFieldChange = (field: keyof ItemData, value: any) => {
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
        await itemSchema.validateAt(fieldName, payload);
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
      await itemSchema.validate(formData, { abortEarly: false });
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

    if (formData.id && initialItem) {
      const isUnchanged =
        formData.name.trim() === (initialItem.name || '').trim() &&
        (formData.sku || '').trim() === (initialItem.sku || '').trim() &&
        formData.description.trim() === (initialItem.description || '').trim() &&
        formData.quantity === initialItem.quantity &&
        formData.price === initialItem.price &&
        (formData.costPrice || 0) === (initialItem.costPrice || 0) &&
        formData.category === initialItem.category &&
        formData.unit === initialItem.unit &&
        formData.minStockLevel === initialItem.minStockLevel;
      if (isUnchanged) {
        onClose();
        return;
      }
    }

    setSaving(true);
    try {
      if (formData.id) {
        await api.put(`/items/${formData.id}`, formData);
        toast.success('Item updated successfully!');
      } else {
        await api.post('/items', formData);
        toast.success('New item added to inventory!');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error saving item';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700/60 text-slate-100 rounded-2xl shadow-2xl max-w-xl w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-5 pr-8">
            <div className="p-2.5 sm:p-3 bg-teal-500/20 border border-teal-500/30 rounded-xl text-teal-400 shrink-0">
              <FiPackage className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">
                {formData.id ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">Manage item stock details, pricing, and category</p>
            </div>
          </div>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.name}
                  onKeyDown={e => handleKeyDown(e, 'name')}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  placeholder="e.g. Ergonomic Office Chair"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                    errors.name ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {errors.name && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  SKU / Product Code *
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={formData.sku}
                  onKeyDown={e => handleKeyDown(e, 'sku')}
                  onChange={e => handleFieldChange('sku', e.target.value)}
                  placeholder="e.g. SKU-1001"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                    errors.sku ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {errors.sku && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.sku}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={2}
                maxLength={200}
                value={formData.description}
                onKeyDown={e => handleKeyDown(e, 'description')}
                onChange={e => handleFieldChange('description', e.target.value)}
                placeholder="Item specifications, model, or details..."
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors resize-none ${
                  errors.description ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                }`}
              />
              {errors.description && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => handleKeyDown(e, 'price')}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      handleFieldChange('price', 0);
                      return;
                    }
                    const clean = raw.replace(/^0+(?=\d)/, '');
                    const parsed = parseFloat(clean);
                    handleFieldChange('price', isNaN(parsed) ? 0 : parsed);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                    errors.price ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {errors.price && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => handleKeyDown(e, 'costPrice')}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      handleFieldChange('costPrice', 0);
                      return;
                    }
                    const clean = raw.replace(/^0+(?=\d)/, '');
                    const parsed = parseFloat(clean);
                    handleFieldChange('costPrice', isNaN(parsed) ? 0 : parsed);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                    errors.costPrice ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {errors.costPrice && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.costPrice}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Quantity in Stock
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => handleKeyDown(e, 'quantity')}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      handleFieldChange('quantity', 0);
                      return;
                    }
                    const clean = raw.replace(/^0+(?=\d)/, '');
                    const parsed = parseInt(clean, 10);
                    handleFieldChange('quantity', isNaN(parsed) ? 0 : parsed);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                    errors.quantity ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {errors.quantity && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.quantity}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <SearchableSelect
                  value={formData.category}
                  onChange={val => handleFieldChange('category', val)}
                  fetchOptions={fetchCategoryOptions}
                  placeholder="Select..."
                  searchPlaceholder="Search category..."
                  clearable={false}
                  error={errors.category}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Unit *
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={formData.unit}
                  onKeyDown={e => handleKeyDown(e, 'unit')}
                  onChange={e => handleFieldChange('unit', e.target.value)}
                  placeholder="pcs, box, kg..."
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                    errors.unit ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {errors.unit && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.unit}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Min Stock Level
                </label>
                <input
                  type="number"
                  value={formData.minStockLevel}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => handleKeyDown(e, 'minStockLevel')}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      handleFieldChange('minStockLevel', 0);
                      return;
                    }
                    const clean = raw.replace(/^0+(?=\d)/, '');
                    const parsed = parseInt(clean, 10);
                    handleFieldChange('minStockLevel', isNaN(parsed) ? 0 : parsed);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                    errors.minStockLevel ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {errors.minStockLevel && <p className="text-rose-400 text-xs mt-1 font-medium">{errors.minStockLevel}</p>}
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
                className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors shadow-lg shadow-teal-600/30 disabled:opacity-50"
              >
                <FiCheck className="w-4 h-4" /> {saving ? 'Saving...' : formData.id ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
