'use client';

import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/60 text-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl shrink-0">
            <FiAlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-lg shadow-rose-600/30"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
