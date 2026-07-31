'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { NavLayout } from '../../../components/NavLayout';
import { ExportToolbar } from '../../../components/ExportToolbar';
import { SettleDebtModal } from '../../../components/SettleDebtModal';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FiBookOpen,
  FiPhone,
  FiMapPin,
  FiMail,
  FiCalendar,
  FiCreditCard,
  FiSearch,
  FiChevronDown,
  FiCheck,
  FiX,
  FiEye,
  FiFileText
} from 'react-icons/fi';
import api from '../../../lib/api';
import { formatDateTime } from '../../../lib/formatters';

function CustomerLedgerContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCustomerId = searchParams.get('customerId');

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  // Server-side Infinite Scroll & Search State for Statement Table
  const [ledgerPage, setLedgerPage] = useState(1);
  const [hasMoreLedger, setHasMoreLedger] = useState(false);
  const [loadingMoreLedger, setLoadingMoreLedger] = useState(false);

  // Settle Debt Modal & Entry Details State
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [debouncedLedgerSearch, setDebouncedLedgerSearch] = useState('');
  const ledgerInputRef = useRef<HTMLInputElement>(null);

  // 300ms Debounce effect on ledger search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLedgerSearch(ledgerSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [ledgerSearch]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      const custs = res.data || [];
      setCustomers(custs);

      setSelectedCustomerId(prev => {
        if (prev && custs.some((c: any) => c.id === prev)) {
          return prev;
        }
        if (queryCustomerId && custs.some((c: any) => c.id === queryCustomerId)) {
          return queryCustomerId;
        }
        return '';
      });
    } catch (_err) {
      console.error('Error fetching customer list');
    }
  }, [queryCustomerId]);

  const fetchLedger = useCallback(async (custID: string, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }
      setLedgerPage(1);
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '15');
      if (debouncedLedgerSearch) params.append('search', debouncedLedgerSearch);

      const res = await api.get(`/reports/customer-ledger/${custID}?${params.toString()}`);
      setLedgerData(res.data);
      setHasMoreLedger(res.data.hasMore || false);
    } catch (_err) {
      console.error('Error fetching customer ledger statement');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [debouncedLedgerSearch]);

  const loadMoreLedger = useCallback(async () => {
    if (!selectedCustomerId || !hasMoreLedger || loadingMoreLedger) return;
    try {
      setLoadingMoreLedger(true);
      const nextPage = ledgerPage + 1;
      const params = new URLSearchParams();
      params.append('page', String(nextPage));
      params.append('limit', '15');
      if (debouncedLedgerSearch) params.append('search', debouncedLedgerSearch);

      const res = await api.get(`/reports/customer-ledger/${selectedCustomerId}?${params.toString()}`);
      const newEntries = res.data.ledger || [];
      setLedgerData((prev: any) => ({
        ...prev,
        ledger: [...(prev?.ledger || []), ...newEntries]
      }));
      setLedgerPage(nextPage);
      setHasMoreLedger(res.data.hasMore || false);
    } catch (_err) {
      console.error('Error fetching next page of customer ledger');
    } finally {
      setLoadingMoreLedger(false);
    }
  }, [selectedCustomerId, hasMoreLedger, loadingMoreLedger, ledgerPage, debouncedLedgerSearch]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasMoreLedger && !loadingMoreLedger) {
        loadMoreLedger();
      }
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user, loadCustomers]);

  // Initial customer account selection fetch
  useEffect(() => {
    if (selectedCustomerId) {
      fetchLedger(selectedCustomerId, true);
    } else {
      setLedgerData(null);
    }
  }, [selectedCustomerId]);

  // Debounced search typing fetch (without unmounting component card)
  useEffect(() => {
    if (selectedCustomerId) {
      fetchLedger(selectedCustomerId, false);
    }
  }, [debouncedLedgerSearch]);

  const fetchCustomerOptions = useCallback(async (search: string, pageNum: number) => {
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: '15',
      search
    });
    const res = await api.get(`/customers?${params.toString()}`);
    const custs = res.data.customers || (Array.isArray(res.data) ? res.data : []);
    const options = custs.map((c: any) => ({
      label: `${c.name} (${c.mobile})`,
      value: c.id || c._id,
      subLabel: `${c.address ? c.address + ' • ' : ''}${c.email || ''}`
    }));
    return {
      options,
      hasMore: res.data.hasMore || false
    };
  }, []);

  const exportHeaders = [
    { header: 'Date', key: 'date' },
    { header: 'Reference', key: 'reference' },
    { header: 'Description', key: 'description' },
    { header: 'Debit / Billed (₹)', key: 'debit' },
    { header: 'Credit / Paid (₹)', key: 'credit' },
    { header: 'Running Balance (₹)', key: 'balance' }
  ];

  if (authLoading || !user) return null;

  return (
    <NavLayout>
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <FiBookOpen className="text-indigo-400 shrink-0" /> Customer Transaction Ledger
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Complete statement of customer transactions, billing, payments, and outstanding balances.
        </p>
      </div>

      {/* Export Toolbar */}
      {ledgerData && (
        <ExportToolbar
          reportType="ledger"
          customerId={selectedCustomerId}
          customerEmail={ledgerData.customer?.email}
          dataForExport={ledgerData.ledger}
          headersForExport={exportHeaders}
        />
      )}

      {/* Customer Search & Selection Component */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg space-y-3">
        <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider">
          Search & Select Customer Account
        </label>

        <SearchableSelect
          value={selectedCustomerId}
          onChange={val => setSelectedCustomerId(val)}
          fetchOptions={fetchCustomerOptions}
          placeholder="Select Customer Account..."
          searchPlaceholder="Search customer by name, mobile, email..."
          clearable={false}
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading ledger statement...</div>
      ) : !ledgerData ? (
        <div className="py-12 text-center text-xs text-slate-400">Search and select a customer above to display ledger.</div>
      ) : (
        <div className="space-y-6">
          {/* Customer Profile & Balance Overview Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* Profile */}
            <div className="md:col-span-2 p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                  {ledgerData.customer?.name}
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold rounded-full text-xs">
                    {ledgerData.summary?.totalEntriesCount || 0} {(ledgerData.summary?.totalEntriesCount || 0) === 1 ? 'Transaction' : 'Transactions'}
                  </span>
                </h3>
                {ledgerData.summary?.currentBalance > 0 && (
                  <button
                    onClick={() => setIsSettleOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30"
                  >
                    <FiCreditCard className="w-4 h-4" /> Settle Debt
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <FiPhone className="text-indigo-400 shrink-0" />
                  <span>{ledgerData.customer?.mobile || 'N/A'}</span>
                </div>
                {ledgerData.customer?.email && (
                  <div className="flex items-center gap-2">
                    <FiMail className="text-teal-400 shrink-0" />
                    <span>{ledgerData.customer?.email}</span>
                  </div>
                )}
                {ledgerData.customer?.address && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <FiMapPin className="text-rose-400 shrink-0 mt-0.5" />
                    <span>{ledgerData.customer?.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Balance Summary Box */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Current Outstanding Balance
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  ₹{ledgerData.summary?.currentBalance?.toFixed(2) || '0.00'}
                </h3>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-400">
                <span>Total Billed: ₹{ledgerData.summary?.totalBilled?.toFixed(2)}</span>
                <span>Total Paid: ₹{ledgerData.summary?.totalPaid?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                  <FiCalendar className="text-teal-400" /> Account Activity & Transactions Statement
                  <span className="px-2 py-0.5 bg-slate-800 text-teal-400 font-semibold rounded-full text-xs">
                    {ledgerSearch.trim() ? (ledgerData.summary?.searchEntriesCount ?? 0) : (ledgerData.summary?.totalEntriesCount ?? 0)} {(ledgerSearch.trim() ? (ledgerData.summary?.searchEntriesCount ?? 0) : (ledgerData.summary?.totalEntriesCount ?? 0)) === 1 ? 'Transaction' : 'Transactions'}
                  </span>
                </h3>
                {tableLoading && (
                  <span className="text-[11px] text-teal-400 font-semibold animate-pulse">Searching...</span>
                )}
              </div>
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  ref={ledgerInputRef}
                  type="text"
                  placeholder="Search statement..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerSearch('');
                      ledgerInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                    title="Clear search"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {ledgerData.ledger?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No transactions recorded for this customer account.
              </div>
            ) : (
              <div
                onScroll={handleScroll}
                className="max-h-[500px] overflow-y-auto overflow-x-auto"
              >
                <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[650px]">
                  <thead className="sticky top-0 z-10 bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider shadow-sm">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 rounded-l-xl">Date & Time</th>
                      <th className="px-3 sm:px-4 py-3">Ref / Invoice</th>
                      <th className="px-3 sm:px-4 py-3">Type</th>
                      <th className="px-3 sm:px-4 py-3 text-right">Debit (Billed)</th>
                      <th className="px-3 sm:px-4 py-3 text-right">Credit (Paid)</th>
                      <th className="px-3 sm:px-4 py-3 text-right">Running Balance</th>
                      <th className="px-3 sm:px-4 py-3 text-center rounded-r-xl">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ledgerData.ledger?.map((entry: any, idx: number) => (
                      <tr key={entry.id || `entry_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 sm:px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDateTime(entry.paymentDate || entry.saleDate || entry.date, entry.createdAtDate || entry.createdAt)}</td>
                        <td className="px-3 sm:px-4 py-3 font-mono text-xs font-semibold text-indigo-400 whitespace-nowrap">
                          {entry.reference}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            entry.type === 'Sale' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            entry.type === 'Payment' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right font-bold text-amber-400 whitespace-nowrap">
                          {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                          {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right font-extrabold text-white whitespace-nowrap">
                          ₹{entry.balance.toFixed(2)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedEntry(entry)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors"
                          >
                            <FiEye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loadingMoreLedger && (
                  <div className="py-2 text-center text-xs font-semibold text-teal-400 animate-pulse">
                    Fetching next statement page from server...
                  </div>
                )}
                {hasMoreLedger && !loadingMoreLedger && (
                  <div className="py-2 text-center text-[11px] text-slate-500 font-medium">
                    Scroll to load more ({ledgerData.ledger?.length || 0} of {ledgerData.summary?.totalEntriesCount || 0} loaded)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ledger Entry Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex-none p-4 sm:p-5 border-b border-slate-800">
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">Statement Entry Details</span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiFileText className="text-teal-400" /> Ref: {selectedEntry.reference}
              </h3>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Transaction Type</span>
                  <span className="font-semibold text-teal-400">{selectedEntry.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Date & Time</span>
                  <span className="font-medium text-slate-300">{formatDateTime(selectedEntry.paymentDate || selectedEntry.saleDate || selectedEntry.date, selectedEntry.createdAtDate || selectedEntry.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Debit (Billed)</span>
                  <span className="font-bold text-amber-400">{selectedEntry.debit > 0 ? `₹${selectedEntry.debit.toFixed(2)}` : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Credit (Paid)</span>
                  <span className="font-bold text-emerald-400">{selectedEntry.credit > 0 ? `₹${selectedEntry.credit.toFixed(2)}` : '-'}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Running Ledger Balance</span>
                  <span className="font-extrabold text-white text-base">₹{selectedEntry.balance.toFixed(2)}</span>
                </div>
              </div>

              {/* Sale Itemized Products Breakdown */}
              {selectedEntry.type === 'Sale' && selectedEntry.items && selectedEntry.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchased Products Breakdown</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="px-3 py-2">Item Name</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                        {selectedEntry.items.map((it: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-200">{it.itemName}</div>
                              <div className="text-[10px] font-mono text-slate-500">{it.sku}</div>
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-teal-400">x{it.quantity}</td>
                            <td className="px-3 py-2 text-right text-slate-400">₹{it.unitPrice?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-200">₹{it.totalPrice?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Breakdown if Sale */}
              {selectedEntry.type === 'Sale' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-200">₹{(selectedEntry.subtotal || selectedEntry.debit || 0).toFixed(2)}</span>
                  </div>
                  {selectedEntry.discount !== undefined && (
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span className="font-medium text-amber-400">-₹{(selectedEntry.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedEntry.tax !== undefined && (
                    <div className="flex justify-between">
                      <span>Tax (GST 18%)</span>
                      <span className="font-medium text-slate-200">₹{(selectedEntry.tax || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-slate-800 font-extrabold text-sm text-emerald-400">
                    <span>Invoice Total Billed</span>
                    <span>₹{(selectedEntry.totalAmount || selectedEntry.debit || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description & Notes</span>
                <div className="p-3 bg-slate-950 text-slate-300 text-xs rounded-xl border border-slate-800 leading-relaxed">
                  {selectedEntry.description}
                  {selectedEntry.notes && (
                    <div className="mt-1 text-slate-400 italic">Note: {selectedEntry.notes}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="flex-none p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {ledgerData?.customer && (
        <SettleDebtModal
          isOpen={isSettleOpen}
          onClose={() => setIsSettleOpen(false)}
          onSuccess={() => {
            loadCustomers();
            if (selectedCustomerId) fetchLedger(selectedCustomerId);
          }}
          customer={{
            id: ledgerData.customer.id || ledgerData.customer._id,
            name: ledgerData.customer.name,
            currentBalance: ledgerData.summary?.currentBalance || 0
          }}
        />
      )}
    </NavLayout>
  );
}

export default function CustomerLedgerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs uppercase font-semibold">Loading Ledger...</div>}>
      <CustomerLedgerContent />
    </Suspense>
  );
}
