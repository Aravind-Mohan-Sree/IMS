'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavLayout } from '../../components/NavLayout';
import { ExportToolbar } from '../../components/ExportToolbar';
import { CustomerModal, CustomerData } from '../../components/CustomerModal';
import { SettleDebtModal } from '../../components/SettleDebtModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useRouter } from 'next/navigation';
import {
  FiUsers,
  FiSearch,
  FiUserPlus,
  FiEdit,
  FiTrash2,
  FiPhone,
  FiMapPin,
  FiMail,
  FiCreditCard,
  FiLoader,
  FiX,
  FiChevronDown
} from 'react-icons/fi';
import api from '../../lib/api';
import { toast } from 'react-toastify';

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<any[]>([]);
  const [allCustomersForExport, setAllCustomersForExport] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCustomersCount, setTotalCustomersCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);

  // Settle Debt Modal State
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleCustomer, setSettleCustomer] = useState<{ id: string; name: string; currentBalance: number } | null>(null);

  // Delete confirmation modal state
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);

  // 300ms Debounce effect on search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchCustomers = useCallback(async (pageNum: number = 1, isAppend: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams();
      params.append('page', String(pageNum));
      params.append('limit', '15');
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await api.get(`/customers?${params.toString()}`);

      if (res.data && res.data.customers) {
        setCustomers(prev => {
          const combined = isAppend ? [...prev, ...res.data.customers] : res.data.customers;
          const seen = new Set();
          return combined.filter((c: any) => {
            const key = c.id || c._id;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
        setHasMore(res.data.hasMore);
        if (typeof res.data.total === 'number') {
          setTotalCustomersCount(res.data.total);
        }
      } else if (Array.isArray(res.data)) {
        const seen = new Set();
        const filtered = res.data.filter((c: any) => {
          const key = c.id || c._id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCustomers(filtered);
        setHasMore(false);
        setTotalCustomersCount(filtered.length);
      }
    } catch (_err) {
      toast.error('Failed to load customer directory');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch]);

  const fetchExportData = useCallback(async () => {
    try {
      const res = await api.get('/customers?all=true');
      setAllCustomersForExport(Array.isArray(res.data) ? res.data : res.data.customers || []);
    } catch (_err) {
      console.error('Failed to load customer export data');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setPage(1);
      fetchCustomers(1, false);
      fetchExportData();
    }
  }, [user, debouncedSearch, fetchCustomers, fetchExportData]);

  const loadNextPage = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCustomers(nextPage, true);
    }
  }, [hasMore, loading, loadingMore, page, fetchCustomers]);

  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadNextPage
  });

  const handleCreateNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSettleDebt = (customer: any) => {
    setSettleCustomer({
      id: customer.id,
      name: customer.name,
      currentBalance: customer.currentBalance
    });
    setIsSettleOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await api.delete(`/customers/${customerToDelete.id}`);
      toast.success(`Customer "${customerToDelete.name}" deleted`);
      setCustomerToDelete(null);
      setPage(1);
      fetchCustomers(1, false);
      fetchExportData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  if (authLoading || !user) return null;

  const exportHeaders = [
    { header: 'Customer Name', key: 'name' },
    { header: 'Mobile Number', key: 'mobile' },
    { header: 'Address', key: 'address' },
    { header: 'Email', key: 'email' },
    { header: 'Current Balance (₹)', key: 'currentBalance' }
  ];

  return (
    <NavLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5 flex-wrap">
            <FiUsers className="text-blue-400 shrink-0" /> Customer Management
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold rounded-full text-xs sm:text-sm">
              {totalCustomersCount} {totalCustomersCount === 1 ? 'Customer' : 'Customers'}
            </span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Manage customer contacts, addresses, mobile numbers, and ledger accounts.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30 shrink-0 w-full sm:w-auto"
        >
          <FiUserPlus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Export Toolbar */}
      <ExportToolbar
        reportType="customers"
        dataForExport={allCustomersForExport.length > 0 ? allCustomersForExport : customers}
        headersForExport={exportHeaders}
      />

      {/* Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-lg relative">
        <FiSearch className="absolute left-6 sm:left-7 top-6 sm:top-7 text-slate-500 w-4 h-4" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search customer by Name, Mobile Number, or Address..."
          className="w-full pl-9 sm:pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
        {searchTerm && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setSearchTerm('');
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            className="absolute right-6 sm:right-7 top-6 sm:top-7 text-slate-400 hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-800 transition-colors"
            title="Clear search"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Customers Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">Loading customer directory...</div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm px-4">
            No customers found matching search query.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider shadow-sm">
                <tr>
                  <th className="px-4 sm:px-5 py-3.5">Customer Name</th>
                  <th className="px-4 sm:px-5 py-3.5">Contact & Mobile</th>
                  <th className="px-4 sm:px-5 py-3.5">Address</th>
                  <th className="px-4 sm:px-5 py-3.5 text-right">Current Balance</th>
                  <th className="px-4 sm:px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c, idx) => (
                  <tr key={c.id || c._id || `cust_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-semibold text-white text-sm sm:text-base">{c.name}</div>
                      {c.notes && <div className="text-[11px] text-slate-400 mt-0.5">{c.notes}</div>}
                    </td>

                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center gap-2 text-slate-200 font-medium">
                        <FiPhone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{c.mobile}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <FiMail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-start gap-1.5 text-xs text-slate-300 max-w-[160px] sm:max-w-[180px] break-words leading-snug">
                        <FiMapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span>{c.address || 'No address provided'}</span>
                      </div>
                    </td>

                    <td className="px-4 sm:px-5 py-3.5 text-right">
                      <span
                        className={`font-bold text-sm sm:text-base ${
                          c.currentBalance > 0
                            ? 'text-amber-400'
                            : c.currentBalance < 0
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }`}
                      >
                        ₹{c.currentBalance ? c.currentBalance.toFixed(2) : '0.00'}
                      </span>
                    </td>

                    <td className="px-4 sm:px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {c.currentBalance > 0 && (
                          <button
                            onClick={() => handleSettleDebt(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-semibold transition-colors"
                            title="Record Cash Payment / Settle Debt"
                          >
                            <FiCreditCard className="w-3.5 h-3.5" /> Settle Debt
                          </button>
                        )}

                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setCustomerToDelete({ id: c.id, name: c.name })}
                          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete customer"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Infinite Scroll Trigger Sentinel */}
            <div ref={sentinelRef} className="py-4 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-blue-400">
                  <FiLoader className="w-4 h-4 animate-spin" /> Loading more customers...
                </div>
              )}
              {!hasMore && customers.length > 0 && (
                <div className="text-[11px] text-slate-500">All customer records loaded</div>
              )}
            </div>
          </div>
        )}
      </div>

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setPage(1);
          fetchCustomers(1, false);
          fetchExportData();
        }}
        initialCustomer={editingCustomer}
      />

      <SettleDebtModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        onSuccess={() => {
          setPage(1);
          fetchCustomers(1, false);
          fetchExportData();
        }}
        customer={settleCustomer}
      />

      <ConfirmModal
        isOpen={!!customerToDelete}
        title="Delete Customer Account"
        message={`Are you sure you want to delete customer account "${customerToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Customer"
        onConfirm={confirmDeleteCustomer}
        onCancel={() => setCustomerToDelete(null)}
      />
    </NavLayout>
  );
}
