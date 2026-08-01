'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavLayout } from '../../components/NavLayout';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiShoppingBag,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiCalendar,
  FiPrinter,
  FiX,
  FiAlertTriangle,
  FiSearch,
  FiChevronDown,
  FiLoader
} from 'react-icons/fi';
import api from '../../lib/api';
import { toast } from 'react-toastify';
import { formatDateTime } from '../../lib/formatters';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

interface CartItem {
  itemId: string;
  itemName: string;
  sku: string;
  maxQuantity: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function RecordSalePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [availableItems, setAvailableItems] = useState<any[]>([]);

  // Item Search state
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [debouncedItemSearch, setDebouncedItemSearch] = useState('');
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [itemPage, setItemPage] = useState(1);
  const [itemHasMore, setItemHasMore] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const itemSearchInputRef = useRef<HTMLInputElement>(null);

  const formatToHTMLDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Form Fields
  const [saleDate, setSaleDate] = useState(new Date());
  const [customerType, setCustomerType] = useState<'Cash' | 'Customer'>('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customNameError, setCustomNameError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Credit'>('Cash');
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(8);
  const [saleNotes, setSaleNotes] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Invoice Modal Result
  const [savedInvoice, setSavedInvoice] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // 300ms Debounce effect on item search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedItemSearch(itemSearchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [itemSearchTerm]);

  // Fetch Items batch with server pagination & debounced search
  const fetchItemsBatch = useCallback(async (search: string, pageNum: number, isAppend = false) => {
    try {
      setLoadingItems(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '15',
        search
      });
      const res = await api.get(`/items?${params.toString()}`);
      const batch = res.data.items || (Array.isArray(res.data) ? res.data : []);
      if (isAppend) {
        setAvailableItems(prev => [...prev, ...batch]);
      } else {
        setAvailableItems(batch);
      }
      setItemHasMore(res.data.hasMore || false);
    } catch (_err) {
      console.error('Error fetching item batch');
    } finally {
      setLoadingItems(false);
    }
  }, []);

  // Fetch Customers for SearchableSelect with 300ms debouncing and pagination
  const fetchCustomerOptions = useCallback(async (search: string, page: number) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '15',
      search
    });
    const res = await api.get(`/customers?${params.toString()}`);
    const custs = res.data.customers || (Array.isArray(res.data) ? res.data : []);
    const options = custs.map((c: any) => ({
      label: c.name,
      subLabel: `Mobile: ${c.mobile}`,
      value: c.id || c._id
    }));
    return {
      options,
      hasMore: res.data.hasMore || false
    };
  }, []);

  // Trigger item fetch on search or open
  useEffect(() => {
    if (isItemSearchOpen) {
      setItemPage(1);
      fetchItemsBatch(debouncedItemSearch, 1, false);
    }
  }, [debouncedItemSearch, isItemSearchOpen, fetchItemsBatch]);

  // Handle dropdown scroll for infinite loading
  const handleItemDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 15 && itemHasMore && !loadingItems) {
      const nextPage = itemPage + 1;
      setItemPage(nextPage);
      fetchItemsBatch(debouncedItemSearch, nextPage, true);
    }
  };

  // Click listener for item search container
  useEffect(() => {
    const handleClickContainer = (event: MouseEvent) => {
      if (itemDropdownRef.current && itemSearchInputRef.current) {
        const isInputClick = itemSearchInputRef.current.contains(event.target as Node);
        const isOutside = !itemDropdownRef.current.contains(event.target as Node);

        if (isOutside) {
          setIsItemSearchOpen(false);
          itemSearchInputRef.current.blur();
        } else if (!isInputClick) {
          const target = event.target as HTMLElement;
          const isDropdownOptionClick = target.closest('.item-dropdown-option');
          const isChevronClick = target.closest('.item-chevron-btn');
          const isClearClick = target.closest('.item-clear-btn');

          if (!isDropdownOptionClick && !isChevronClick && !isClearClick) {
            setIsItemSearchOpen(false);
            itemSearchInputRef.current.blur();
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickContainer);
    return () => document.removeEventListener('mousedown', handleClickContainer);
  }, []);

  const handleAddToCart = (item: any) => {
    if (item.quantity <= 0) {
      toast.warn(`"${item.name}" is out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex(c => c.itemId === item.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > item.quantity) {
        toast.warn(`Cannot add more than ${item.quantity} available stock for "${item.name}"`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      updatedCart[existingIndex].totalPrice = updatedCart[existingIndex].quantity * updatedCart[existingIndex].unitPrice;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          itemId: item.id,
          itemName: item.name,
          sku: item.sku || 'SKU-NONE',
          maxQuantity: item.quantity,
          quantity: 1,
          unitPrice: item.price,
          totalPrice: item.price
        }
      ]);
    }
    setItemSearchTerm('');
    setIsItemSearchOpen(false);
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.itemId === itemId) {
          const clampedQty = Math.max(1, Math.min(newQty, item.maxQuantity));
          return {
            ...item,
            quantity: clampedQty,
            totalPrice: clampedQty * item.unitPrice
          };
        }
        return item;
      })
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  // Computations
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const taxAmount = (subtotal - discount > 0) ? ((subtotal - discount) * taxPercent) / 100 : 0;
  const grandTotal = Math.max(0, subtotal - discount + taxAmount);

  const validateCustomCustomerName = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setCustomNameError('Customer name is required');
      return false;
    }
    if (trimmed.length < 2) {
      setCustomNameError('Customer name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 40) {
      setCustomNameError('Customer name cannot exceed 40 characters');
      return false;
    }
    setCustomNameError('');
    return true;
  };

  // Enter Key Focus Jump Handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

      // If user is in the Walk-In Customer Name field, validate before jumping
      const inputTarget = target as HTMLInputElement;
      if (customerType === 'Cash' && inputTarget.placeholder?.includes('Ajith')) {
        if (!validateCustomCustomerName(customCustomerName)) {
          return;
        }
      }

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
    }
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomNameError('');

    if (cart.length === 0) {
      toast.error('Cart is empty. Please add items to record sale.');
      return;
    }

    const customerName = customCustomerName.trim();
    const customerMobile = '';
    let customerIdToSave: string | undefined = undefined;

    if (customerType === 'Cash') {
      if (!validateCustomCustomerName(customCustomerName)) {
        return;
      }
    } else {
      if (!selectedCustomerId) {
        toast.error('Please select a registered customer');
        return;
      }
      customerIdToSave = selectedCustomerId;
    }

    // Require customer ID for Credit payment
    if (paymentMethod === 'Credit' && !customerIdToSave) {
      toast.error('Credit sales require selecting a Registered Customer so debt can be posted to their ledger.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        customerId: customerIdToSave,
        customerName: customerName || 'Walk-in Customer',
        customerMobile,
        date: saleDate,
        paymentMethod,
        discount,
        tax: taxAmount,
        notes: saleNotes && typeof saleNotes === 'string' ? saleNotes.trim() : '',
        items: cart.map(c => ({
          itemId: c.itemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice
        }))
      };

      const res = await api.post('/sales', payload);
      toast.success(`Sale recorded! Invoice #${res.data.invoiceNo}`);
      setSavedInvoice(res.data);

      setCart([]);
      setDiscount(0);
      fetchItemsBatch('', 1, false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error recording sale');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <NavLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <FiShoppingBag className="text-indigo-400 shrink-0" /> Record New Sale
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Create Point of Sale transactions, update inventory stock, and generate invoices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Selector & Cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Search Selector */}
          <div ref={itemDropdownRef} className="relative bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Inventory Items to Sell
            </label>
            <div className="relative w-full">
              <FiSearch className="absolute left-3.5 top-3.5 text-slate-500 w-4 h-4 pointer-events-none" />
              <input
                ref={itemSearchInputRef}
                type="text"
                value={itemSearchTerm}
                onKeyDown={handleKeyDown}
                onChange={e => {
                  setItemSearchTerm(e.target.value);
                  if (!isItemSearchOpen) setIsItemSearchOpen(true);
                }}
                onFocus={() => {
                  if (!isItemSearchOpen) setIsItemSearchOpen(true);
                }}
                placeholder="Type item name or SKU code to search stock..."
                className="w-full pl-10 pr-16 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <div className="absolute right-3 top-2.5 flex items-center justify-center z-10">
                {itemSearchTerm ? (
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setItemSearchTerm('');
                      setIsItemSearchOpen(true);
                      setTimeout(() => itemSearchInputRef.current?.focus(), 0);
                    }}
                    className="item-clear-btn p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
                    title="Clear search"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      if (isItemSearchOpen) {
                        setIsItemSearchOpen(false);
                        itemSearchInputRef.current?.blur();
                      } else {
                        setIsItemSearchOpen(true);
                        setTimeout(() => itemSearchInputRef.current?.focus(), 0);
                      }
                    }}
                    className="item-chevron-btn p-1 text-slate-400 hover:text-slate-200"
                    title="Toggle dropdown"
                  >
                    <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isItemSearchOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Dropdown Options */}
              {isItemSearchOpen && (
                <div
                  onScroll={handleItemDropdownScroll}
                  className="absolute left-0 right-0 w-full z-30 mt-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800/60"
                >
                  {availableItems.filter(item => !cart.some(c => c.itemId === (item.id || item._id))).length === 0 && !loadingItems ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matching items in stock
                    </div>
                  ) : (
                    availableItems
                      .filter(item => !cart.some(c => c.itemId === (item.id || item._id)))
                      .map(item => {
                        const isOutOfStock = item.quantity <= 0;
                        return (
                        <button
                          key={item.id || item._id}
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          disabled={isOutOfStock}
                          className="item-dropdown-option w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/80 transition-colors disabled:opacity-40"
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-100">{item.name}</div>
                            <div className="text-[11px] text-slate-400">
                              SKU: {item.sku || 'N/A'} • Category: {item.category}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs sm:text-sm font-extrabold text-teal-400">₹{item.price.toFixed(2)}</div>
                            <div className={`text-[11px] font-medium ${isOutOfStock ? 'text-rose-400' : 'text-slate-400'}`}>
                              {isOutOfStock ? 'Out of Stock' : `${item.quantity} in stock`}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                  {loadingItems && (
                    <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <FiLoader className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Loading items...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center justify-between">
              <span>Selected Sale Items ({cart.length})</span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </h3>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs sm:text-sm">
                No items added to sale yet. Search items above to build cart.
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900 shadow-sm">
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 pt-1 pl-2">Item</th>
                      <th className="pb-3 text-center">Unit Price</th>
                      <th className="pb-3 text-center">Qty</th>
                      <th className="pb-3 text-right">Subtotal</th>
                      <th className="pb-3 pr-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cart.map(c => (
                      <tr key={c.itemId} className="hover:bg-slate-800/30">
                        <td className="py-3 pl-2">
                          <div className="font-semibold text-slate-100">{c.itemName}</div>
                          <div className="text-[10px] text-slate-500">{c.sku}</div>
                        </td>
                        <td className="py-3 text-center font-medium text-slate-300">
                          ₹{c.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max={c.maxQuantity}
                            value={c.quantity}
                            onFocus={e => e.target.select()}
                            onKeyDown={handleKeyDown}
                            onChange={e => {
                              const raw = e.target.value;
                              if (raw === '') {
                                handleUpdateCartQty(c.itemId, 1);
                                return;
                              }
                              const clean = raw.replace(/^0+(?=\d)/, '');
                              const parsed = parseInt(clean, 10);
                              handleUpdateCartQty(c.itemId, isNaN(parsed) || parsed < 1 ? 1 : parsed);
                            }}
                            className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center font-semibold text-white focus:outline-none focus:border-indigo-500 text-xs"
                          />
                        </td>
                        <td className="py-3 text-right font-extrabold text-teal-400">
                          ₹{c.totalPrice.toFixed(2)}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(c.itemId)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer & Checkout Controls */}
        <div className="space-y-6">
          <form noValidate onSubmit={handleSubmitSale} className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4 sm:space-y-5">
            <h3 className="text-sm sm:text-base font-bold text-white border-b border-slate-800 pb-3">
              Customer & Payment Details
            </h3>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Sale Date & Time
              </label>
              <input
                type="datetime-local"
                required 
                value={formatToHTMLDateTime(saleDate)}
                max={formatToHTMLDateTime(new Date())}
                onClick={e => e.currentTarget.showPicker?.()}
                onKeyDown={handleKeyDown}
                onChange={e => {
                  if (e.target.value) {
                    setSaleDate(new Date(e.target.value));
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <CustomSelect
                options={[
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Credit/Debit Card', value: 'Card' },
                  { label: 'Bank Transfer', value: 'Bank Transfer' },
                  { label: 'Credit (Add to Customer Ledger)', value: 'Credit' }
                ]}
                value={paymentMethod}
                onChange={val => {
                  const methodVal = val as any;
                  setPaymentMethod(methodVal);
                  if (methodVal === 'Credit') {
                    setCustomerType('Customer');
                  }
                }}
              />
            </div>

            {/* Customer Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Customer
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  disabled={paymentMethod === 'Credit'}
                  onClick={() => {
                    setCustomerType('Cash');
                    setCustomNameError('');
                  }}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    customerType === 'Cash'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  } ${paymentMethod === 'Credit' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Walk-In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerType('Customer');
                    setCustomNameError('');
                  }}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    customerType === 'Customer'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Registered
                </button>
              </div>

              {customerType === 'Customer' ? (
                <div>
                  <SearchableSelect
                    value={selectedCustomerId}
                    onChange={val => setSelectedCustomerId(val)}
                    fetchOptions={fetchCustomerOptions}
                    placeholder="Select Customer..."
                    searchPlaceholder="Search registered customer..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={customCustomerName}
                    onKeyDown={handleKeyDown}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomCustomerName(val);
                      validateCustomCustomerName(val);
                    }}
                    placeholder="e.g. Ajith"
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none transition-colors ${
                      customNameError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {customNameError && <p className="text-rose-400 text-xs mt-1 font-medium">{customNameError}</p>}
                </div>
              )}
            </div>

            {/* Alert banner if Credit is selected without a Registered Customer */}
            {paymentMethod === 'Credit' && (!selectedCustomerId || customerType === 'Cash') && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2 animate-fade-in">
                <FiAlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Credit sales require selecting a <strong>Registered Customer</strong> to post to their ledger.</span>
              </div>
            )}

            {/* Discount & Tax */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onFocus={e => e.target.select()}
                  onKeyDown={handleKeyDown}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setDiscount(0);
                      return;
                    }
                    const clean = raw.replace(/^0+(?=\d)/, '');
                    setDiscount(parseFloat(clean) || 0);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Tax GST (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent}
                  onFocus={e => e.target.select()}
                  onKeyDown={handleKeyDown}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setTaxPercent(0);
                      return;
                    }
                    const clean = raw.replace(/^0+(?=\d)/, '');
                    setTaxPercent(parseFloat(clean) || 0);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            {/* Sale Notes (optional) */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Sale Notes (optional)</label>
              <textarea
                value={saleNotes}
                onChange={e => setSaleNotes(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add any remarks about this sale..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                rows={3}
              />
            </div>

            {/* Price Calculations Summary */}
            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-200">₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount Applied:</span>
                  <span>- ₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>GST Tax ({taxPercent}%):</span>
                <span className="font-semibold text-slate-200">+ ₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800/80">
                <span>Grand Total:</span>
                <span className="text-teal-400">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 text-xs sm:text-sm disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4" /> {saving ? 'Recording Sale...' : 'Complete & Print Invoice'}
            </button>
          </form>
        </div>
      </div>

      {/* Invoice Modal */}
      {savedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-3xl shadow-2xl max-w-lg w-full p-6 relative">

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <FiCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Sale Recorded Successfully!</h3>
              <p className="text-xs text-slate-400 mt-1">Invoice #{savedInvoice.invoiceNo}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs sm:text-sm mb-6">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Date & Time:</span>
                <span className="font-semibold text-slate-200">{formatDateTime(savedInvoice.createdAt || new Date())}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-200">{savedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-indigo-400">{savedInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base pt-1">
                <span className="text-slate-300">Total Billed:</span>
                <span className="text-teal-400">₹{savedInvoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors border border-slate-700"
              >
                <FiPrinter className="w-4 h-4 text-sky-400" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSavedInvoice(null)}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors shadow-lg shadow-indigo-600/30"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </NavLayout>
  );
}
