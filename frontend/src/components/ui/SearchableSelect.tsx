'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiChevronDown, FiPlus, FiLoader, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';

export interface SearchableOption {
  label: string;
  value: string;
  subLabel?: string;
  raw?: any;
  [key: string]: any;
}

interface SearchableSelectProps {
  value: string;
  onChange: (val: string, option?: SearchableOption) => void;
  fetchOptions: (search: string, page: number) => Promise<{ options: SearchableOption[]; hasMore: boolean }>;
  placeholder?: string;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  onEditOption?: (option: SearchableOption) => void;
  onDeleteOption?: (option: SearchableOption) => void;
  className?: string;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  fetchOptions,
  placeholder = 'Search & select...',
  searchPlaceholder = 'Search & select...',
  onAddNew,
  addNewLabel = 'Add New',
  onEditOption,
  onDeleteOption,
  className = '',
  error,
  disabled = false,
  clearable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async (search: string, pageNum: number, append = false) => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true;
      setLoading(true);
      const res = await fetchOptions(search, pageNum);
      setOptions(prev => {
        const combined = append ? [...prev, ...res.options] : res.options;
        const seen = new Set();
        return combined.filter(o => {
          if (!o || o.value === undefined || o.value === null) return false;
          const keyStr = String(o.value);
          if (seen.has(keyStr)) return false;
          seen.add(keyStr);
          return true;
        });
      });
      setHasMore(res.hasMore);

      if (value) {
        const found = res.options.find(o => o.value === value);
        if (found) {
          setSelectedLabel(found.label);
        }
      }
    } catch (err) {
      console.error('Error fetching options in SearchableSelect:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchOptions, value]);

  // Initial & search & page trigger
  useEffect(() => {
    if (isOpen) {
      loadData(debouncedSearch, page, page > 1);
    }
  }, [isOpen, debouncedSearch, page]);

  // Sync selected display label when value or options change externally
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
    } else if (value === 'All Categories' || value === 'All') {
      setSelectedLabel('All Categories');
    } else {
      const found = options.find(
        o => String(o.value).trim().toLowerCase() === String(value).trim().toLowerCase()
      );
      if (found) {
        setSelectedLabel(found.label);
      }
    }
  }, [value, options]);

  // Handle click outside or container background
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && inputRef.current) {
        const target = e.target as HTMLElement;
        const isInputClick = inputRef.current.contains(target);
        const isOutside = !containerRef.current.contains(target);

        const isOptionClick = target.closest('.searchable-select-option');
        const isChevronClick = target.closest('.searchable-select-chevron');
        const isClearClick = target.closest('.searchable-select-clear');

        if (isChevronClick || isClearClick || isOptionClick) {
          return;
        }

        if (isOutside || !isInputClick) {
          setIsOpen(false);
          setSearchTerm('');
          inputRef.current.blur();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Infinite Scroll Listener
  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 15) {
      setPage(prev => prev + 1);
    }
  };

  const handleSelect = (option: SearchableOption) => {
    setSelectedLabel(option.label);
    setSearchTerm('');
    onChange(option.value, option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (searchTerm.trim() !== '') {
      setSearchTerm('');
    } else if (clearable) {
      setSelectedLabel('');
      setSearchTerm('');
      onChange('', undefined);
    }
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => {
      if (prev) {
        setSearchTerm('');
        inputRef.current?.blur();
        return false;
      } else {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
        return true;
      }
    });
  };

  const hasActiveSelectionOrSearch =
    searchTerm.trim() !== '' || (clearable && !!value && value !== 'All' && value !== 'All Categories');

  const displayInputValue = isOpen
    ? searchTerm
    : (selectedLabel || (value && value !== 'All' ? value : '') || (placeholder || searchPlaceholder));

  // Exclude currently selected option AND locally filter options by search term
  const visibleOptions = options
    .filter(o => {
      if (!value && !selectedLabel) return true;
      const valMatch = value ? String(o.value).trim().toLowerCase() === String(value).trim().toLowerCase() : false;
      const labelMatch = selectedLabel ? String(o.label).trim().toLowerCase() === String(selectedLabel).trim().toLowerCase() : false;
      return !valMatch && !labelMatch;
    })
    .filter(o => !searchTerm.trim() || o.label.toLowerCase().includes(searchTerm.toLowerCase().trim()));

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Unified Search Input Box acting as trigger & search bar */}
      <div className="relative w-full">
        <FiSearch className="absolute left-3.5 top-3 text-slate-500 w-4 h-4 pointer-events-none z-10" />
        
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          maxLength={100}
          value={displayInputValue}
          onFocus={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={selectedLabel || placeholder || searchPlaceholder}
          className={`w-full pl-10 pr-10 py-2 bg-slate-950 border rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none transition-all ${
            error ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500 hover:border-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        />

        {/* Right Action: Clear Button (X) replaces Chevron ONLY when search text or clearable value is active */}
        <div className="absolute right-3 top-2 flex items-center justify-center z-10">
          {hasActiveSelectionOrSearch ? (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors searchable-select-clear"
              title="Clear search/selection"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleChevronClick}
              className="p-1 text-slate-400 hover:text-slate-200 searchable-select-chevron"
              title="Toggle dropdown"
            >
              <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Options Dropdown List (Matched to exact width of search bar) */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1 animate-fade-in">
          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                onAddNew();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm text-teal-400 hover:bg-slate-800/80 transition-colors font-medium border-b border-slate-800 text-left cursor-pointer searchable-select-option"
            >
              <FiPlus className="w-4 h-4" />
              <span>{addNewLabel}</span>
            </button>
          )}

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-60 overflow-y-auto divide-y divide-slate-800/40"
          >
            {visibleOptions.length === 0 && !loading ? (
              <div className="px-3.5 py-3 text-xs text-slate-500 text-center">
                {searchTerm.trim() !== '' ? 'No matching items found' : 'No items available'}
              </div>
            ) : (
              visibleOptions.map((option, idx) => (
                <div
                  key={`${option.value}_${idx}`}
                  onClick={() => handleSelect(option)}
                  className="searchable-select-option w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800/80 transition-colors text-left cursor-pointer group"
                >
                  <div className="flex-1 truncate pr-2">
                    <div className="text-xs sm:text-sm font-medium text-slate-200 truncate group-hover:text-white">
                      {option.label}
                    </div>
                    {option.subLabel && (
                      <div className="text-[11px] text-slate-400 truncate">
                        {option.subLabel}
                      </div>
                    )}
                  </div>

                  {!(option.value === 'All' || option.value === 'All Categories' || !option.raw) && (onEditOption || onDeleteOption) && (
                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      {onEditOption && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onEditOption(option);
                            setIsOpen(false);
                          }}
                          className="p-1 text-slate-400 hover:text-teal-400 rounded-md hover:bg-slate-700/60 transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteOption && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteOption(option);
                            setIsOpen(false);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-700/60 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center justify-center py-2 text-xs text-slate-400 gap-2">
                <FiLoader className="w-3.5 h-3.5 animate-spin" />
                <span>Loading options...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-rose-400 text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
};
