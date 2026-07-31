'use client';

import React, { useState, useEffect } from 'react';
import { FiFolderPlus, FiCheck } from 'react-icons/fi';
import api from '../lib/api';
import { toast } from 'react-toastify';

export interface CategoryData {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (catName?: string, isEdit?: boolean) => void;
  initialCategory?: CategoryData | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCategory
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const descRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialCategory) {
      setName(initialCategory.name || '');
      setDescription(initialCategory.description || '');
      setError('');
    } else {
      setName('');
      setDescription('');
      setError('');
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const validateName = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setError('Category name is required');
      return false;
    }
    if (trimmed.length < 2) {
      setError('Category name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 30) {
      setError('Category name cannot exceed 30 characters');
      return false;
    }
    setError('');
    return true;
  };
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    validateName(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (validateName(name)) {
        descRef.current?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name)) return;

    if (initialCategory && (initialCategory.id || initialCategory._id)) {
      const isUnchanged =
        name.trim() === (initialCategory.name || '').trim() &&
        description.trim() === (initialCategory.description || '').trim();
      if (isUnchanged) {
        onClose();
        return;
      }
    }

    setSaving(true);
    try {
      if (initialCategory && (initialCategory.id || initialCategory._id)) {
        const catId = initialCategory.id || initialCategory._id;
        const res = await api.put(`/categories/${catId}`, {
          name: name.trim(),
          description: description.trim()
        });
        toast.success(`Category "${res.data.name}" updated successfully!`);
        onSuccess(res.data.name, true);
      } else {
        const res = await api.post('/categories', {
          name: name.trim(),
          description: description.trim()
        });
        toast.success(`Category "${res.data.name}" created successfully!`);
        onSuccess(res.data.name, false);
      }
      setName('');
      setDescription('');
      setError('');
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error saving category';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/60 text-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 relative">
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="p-2.5 sm:p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
            <FiFolderPlus className="w-5 sm:w-6 h-5 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">
              {initialCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              {initialCategory ? 'Modify existing category details' : 'Create a new item category for stock organization'}
            </p>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Category Name *
            </label>
            <input
              type="text"
              maxLength={30}
              value={name}
              onKeyDown={handleKeyDown}
              onChange={handleNameChange}
              placeholder="e.g. Hardware, Groceries, Plumbing..."
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 focus:outline-none text-sm transition-colors ${
                error ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {error && <p className="text-rose-400 text-xs mt-1 font-medium">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              ref={descRef}
              rows={2}
              maxLength={150}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of items under this category..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none text-sm transition-colors resize-none"
            />
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
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4" /> {saving ? 'Saving...' : initialCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
