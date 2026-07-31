'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiX } from 'react-icons/fi';

export interface SelectOption {
  label: string;
  value: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  error,
  disabled = false,
  clearable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const visibleOptions = options.filter(o => o.value !== value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none transition-all ${
          error ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500 hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </span>

        {/* Clear Button (X) replaces Chevron when value selected */}
        <div className="flex items-center justify-center shrink-0 ml-2">
          {clearable && value ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <FiX className="w-4 h-4" />
            </span>
          ) : (
            <FiChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1 animate-fade-in max-h-60 overflow-y-auto">
          {visibleOptions.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-slate-500 text-center">No other options</div>
          ) : (
            visibleOptions.map((option, idx) => (
              <button
                key={`${option.value}_${idx}`}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm text-left text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate w-full">
                  {option.icon}
                  <div className="truncate w-full font-medium">
                    <div>{option.label}</div>
                    {option.subLabel && <div className="text-[11px] text-slate-400 font-normal">{option.subLabel}</div>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="text-rose-400 text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
};
