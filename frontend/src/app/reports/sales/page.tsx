'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavLayout } from '../../../components/NavLayout';
import { ExportToolbar } from '../../../components/ExportToolbar';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiTrendingUp,
  FiCalendar,
  FiShoppingBag,
  FiAward,
  FiEye,
  FiX,
  FiUser,
  FiCheckCircle,
  FiFileText,
  FiSearch
} from 'react-icons/fi';
import api from '../../../lib/api';
import { formatDateTime, getLocalDateStr } from '../../../lib/formatters';

const getInitialDates = () => {
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const firstDayOfMonthStr = `${year}-${month}-01`;
  return { todayStr, firstDayOfMonthStr };
};

const getPaymentMethodBadgeClass = (method: string) => {
  switch (method) {
    case 'Cash':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'Credit':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'UPI':
      return 'bg-teal-500/20 text-teal-400 border border-teal-500/30';
    case 'Card':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case 'Bank Transfer':
      return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
    default:
      return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
  }
};

export default function SalesReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dateDefaults] = useState(getInitialDates);
  const [startDate, setStartDate] = useState(dateDefaults.firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(dateDefaults.todayStr);
  const [debouncedStartDate, setDebouncedStartDate] = useState(dateDefaults.firstDayOfMonthStr);
  const [debouncedEndDate, setDebouncedEndDate] = useState(dateDefaults.todayStr);

  const [reportData, setReportData] = useState<any>({
    summary: {
      totalSalesCount: 0,
      totalRevenue: 0,
      totalDiscount: 0,
      totalTax: 0,
      totalItemsSold: 0,
      averageOrderValue: 0
    },
    topSellingItems: [],
    sales: []
  });
  const [loading, setLoading] = useState(true);

  // Infinite Scroll State for Itemized Transactions Log Table
  const [salesPage, setSalesPage] = useState(1);
  const [hasMoreSales, setHasMoreSales] = useState(false);
  const [loadingMoreSales, setLoadingMoreSales] = useState(false);

  // Selected Sale Details Modal & Table Search State
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [salesSearch, setSalesSearch] = useState('');
  const [debouncedSalesSearch, setDebouncedSalesSearch] = useState('');
  const salesInputRef = useRef<HTMLInputElement>(null);

  const [dateError, setDateError] = useState('');

  // 300ms Debounce effect on date range & search inputs
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setDateError('Start date cannot be after end date');
      return;
    }
    setDateError('');
    const handler = setTimeout(() => {
      setDebouncedStartDate(startDate);
      setDebouncedEndDate(endDate > dateDefaults.todayStr ? dateDefaults.todayStr : endDate);
      setDebouncedSalesSearch(salesSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [startDate, endDate, salesSearch, dateDefaults.todayStr]);

  const fetchReport = useCallback(async () => {
    if (debouncedStartDate && debouncedEndDate && debouncedStartDate > debouncedEndDate) {
      return;
    }
    try {
      setLoading(true);
      setSalesPage(1);
      const params = new URLSearchParams();
      if (debouncedStartDate) params.append('startDate', debouncedStartDate);
      if (debouncedEndDate) params.append('endDate', debouncedEndDate);
      if (debouncedSalesSearch) params.append('search', debouncedSalesSearch);
      params.append('page', '1');
      params.append('limit', '15');

      const res = await api.get(`/reports/sales?${params.toString()}`);
      setReportData(res.data || {});
      setHasMoreSales(res.data.hasMore || false);
    } catch (_err) {
      console.error('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  }, [debouncedStartDate, debouncedEndDate, debouncedSalesSearch]);

  const loadMoreSales = useCallback(async () => {
    if (!hasMoreSales || loadingMoreSales) return;
    try {
      setLoadingMoreSales(true);
      const nextPage = salesPage + 1;
      const params = new URLSearchParams();
      if (debouncedStartDate) params.append('startDate', debouncedStartDate);
      if (debouncedEndDate) params.append('endDate', debouncedEndDate);
      if (debouncedSalesSearch) params.append('search', debouncedSalesSearch);
      params.append('page', String(nextPage));
      params.append('limit', '15');

      const res = await api.get(`/reports/sales?${params.toString()}`);
      const newSales = res.data.sales || [];
      setReportData((prev: any) => ({
        ...prev,
        sales: [...(prev.sales || []), ...newSales]
      }));
      setSalesPage(nextPage);
      setHasMoreSales(res.data.hasMore || false);
    } catch (_err) {
      console.error('Error fetching next page of sales report');
    } finally {
      setLoadingMoreSales(false);
    }
  }, [hasMoreSales, loadingMoreSales, salesPage, debouncedStartDate, debouncedEndDate]);

  const handleSalesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasMoreSales && !loadingMoreSales) {
        loadMoreSales();
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
      fetchReport();
    }
  }, [user, fetchReport]);

  if (authLoading || !user) return null;

  const exportHeaders = [
    { header: 'Invoice No', key: 'invoiceNo' },
    { header: 'Sale Date', key: 'date' },
    { header: 'Customer', key: 'customerName' },
    { header: 'Payment Method', key: 'paymentMethod' },
    { header: 'Subtotal (₹)', key: 'subtotal' },
    { header: 'Tax (₹)', key: 'tax' },
    { header: 'Total (₹)', key: 'totalAmount' }
  ];

  return (
    <NavLayout>
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5 flex-wrap">
          <FiTrendingUp className="text-emerald-400 shrink-0" /> Sales Report & Analytics
          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold rounded-full text-xs sm:text-sm">
            {reportData.summary?.totalSalesCount || 0} {(reportData.summary?.totalSalesCount || 0) === 1 ? 'Sale' : 'Sales'}
          </span>
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Comprehensive report of sales revenue, sales, sale averages, and top selling products.
        </p>
      </div>

      {/* Export Toolbar */}
      <ExportToolbar
        reportType="sales"
        startDate={debouncedStartDate}
        endDate={debouncedEndDate}
        dataForExport={reportData.sales}
        headersForExport={exportHeaders}
      />

      {/* Date Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs sm:text-sm font-semibold text-slate-300">Filter Sales by Date Range:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div>
            <input
              type="date"
              value={startDate}
              max={dateDefaults.todayStr}
              onClick={e => e.currentTarget.showPicker?.()}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>
          <span className="text-slate-500 text-xs font-bold">TO</span>
          <div>
            <input
              type="date"
              value={endDate}
              max={dateDefaults.todayStr}
              onClick={e => e.currentTarget.showPicker?.()}
              onChange={e => {
                const val = e.target.value;
                setEndDate(val > dateDefaults.todayStr ? dateDefaults.todayStr : val);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate(dateDefaults.firstDayOfMonthStr);
                setEndDate(dateDefaults.todayStr);
                setDateError('');
              }}
              className="px-3 py-2 text-xs text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      {dateError && (
        <p className="text-xs text-rose-400 font-medium px-1 -mt-1">{dateError}</p>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">
                ₹{reportData.summary?.totalRevenue?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FiTrendingUp className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {reportData.summary?.periodSalesCount ?? 0}
              </h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <FiShoppingBag className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Sale Value</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-teal-400 mt-1">
                ₹{reportData.summary?.averageOrderValue?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-teal-500/20 text-teal-400 rounded-xl">
              <FiTrendingUp className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Units Sold</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {reportData.summary?.totalItemsSold || 0}
              </h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-500/20 text-amber-400 rounded-xl">
              <FiAward className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Products & Detailed Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <FiAward className="text-amber-400" /> Top Selling Items
          </h3>

          {reportData.topSellingItems?.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No products sold in selected period.</div>
          ) : (
            <div className="space-y-3">
              {reportData.topSellingItems?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                  <div>
                    <div className="font-semibold text-xs text-white">{item.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-teal-400">₹{item.revenue.toFixed(2)}</div>
                    <div className="text-[11px] text-slate-400">{item.quantity} sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          {(() => {
            const filteredSalesList = (reportData.sales || []).filter((s: any) => {
              if (!salesSearch.trim()) return true;
              const q = salesSearch.toLowerCase();
              return (
                s.invoiceNo?.toLowerCase().includes(q) ||
                s.customerName?.toLowerCase().includes(q) ||
                s.paymentMethod?.toLowerCase().includes(q) ||
                s.items?.some((it: any) => it.itemName?.toLowerCase().includes(q) || it.sku?.toLowerCase().includes(q))
              );
            });

            const displayCount = salesSearch.trim()
              ? filteredSalesList.length
              : (reportData.summary?.periodSalesCount ?? 0);

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white">Itemized Transactions Log</h3>
                    <span className="px-2.5 py-0.5 bg-slate-800 text-teal-400 font-semibold rounded-full text-xs border border-slate-700/50">
                      {displayCount} {displayCount === 1 ? 'Sale' : 'Sales'}
                    </span>
                  </div>
                  <div className="relative min-w-[200px] sm:min-w-[240px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      ref={salesInputRef}
                      type="text"
                      placeholder="Search invoice, customer..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                    {salesSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSalesSearch('');
                          salesInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                        title="Clear search"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500">Loading sales report...</div>
                ) : reportData.sales?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">No transactions recorded for this period.</div>
                ) : filteredSalesList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">No sales match your search.</div>
                ) : (
                  <div
                    onScroll={handleSalesScroll}
                    className="max-h-[500px] overflow-y-auto overflow-x-auto"
                  >
                    <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[550px]">
                      <thead className="sticky top-0 z-10 bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider shadow-sm">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 rounded-l-xl">Invoice No</th>
                          <th className="px-3 sm:px-4 py-3">Date & Time</th>
                          <th className="px-3 sm:px-4 py-3">Customer</th>
                          <th className="px-3 sm:px-4 py-3">Payment</th>
                          <th className="px-3 sm:px-4 py-3 text-right">Total Amount</th>
                          <th className="px-3 sm:px-4 py-3 text-center rounded-r-xl">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredSalesList.map((s: any, idx: number) => (
                          <tr key={s.id || s._id || `sale_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 sm:px-4 py-3 font-mono font-semibold text-indigo-400 whitespace-nowrap">{s.invoiceNo}</td>
                            <td className="px-3 sm:px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDateTime(s.saleDate || s.date, s.createdAt)}</td>
                            <td className="px-3 sm:px-4 py-3 font-medium text-slate-200 whitespace-nowrap">{s.customerName}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getPaymentMethodBadgeClass(s.paymentMethod)}`}>
                                {s.paymentMethod}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right font-bold text-emerald-400 whitespace-nowrap">₹{s.totalAmount?.toFixed(2)}</td>
                            <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => setSelectedSale(s)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors"
                              >
                                <FiEye className="w-3.5 h-3.5" /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {loadingMoreSales && (
                      <div className="py-2 text-center text-xs font-semibold text-teal-400 animate-pulse">
                        Fetching next page from server...
                      </div>
                    )}
                    {hasMoreSales && !loadingMoreSales && (
                      <div className="py-2 text-center text-[11px] text-slate-500 font-medium">
                        Scroll to load more ({reportData.sales?.length || 0} of {reportData.summary?.totalSalesCount || 0} loaded)
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex-none p-4 sm:p-5 border-b border-slate-800">
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">Transaction Breakdown</span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiFileText className="text-teal-400" /> Invoice #{selectedSale.invoiceNo}
              </h3>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Customer Name</span>
                  <span className="font-semibold text-slate-200">{selectedSale.customerName}</span>
                  {selectedSale.customerMobile && (
                    <span className="text-slate-400 block text-[11px] font-mono mt-0.5">{selectedSale.customerMobile}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Date & Time</span>
                  <span className="font-medium text-slate-300">{formatDateTime(selectedSale.saleDate || selectedSale.date, selectedSale.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Payment Method</span>
                  <span className="font-semibold text-teal-400">{selectedSale.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Total Billed</span>
                  <span className="font-extrabold text-emerald-400 text-sm">₹{selectedSale.totalAmount?.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itemized Purchased Products</h4>
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
                      {selectedSale.items?.map((it: any, i: number) => (
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

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-200">₹{(selectedSale.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="font-medium text-amber-400">-₹{(selectedSale.discount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (GST 18%)</span>
                  <span className="font-medium text-slate-200">₹{(selectedSale.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-800 font-extrabold text-sm text-emerald-400">
                  <span>Grand Total</span>
                  <span>₹{selectedSale.totalAmount?.toFixed(2)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <div className="text-xs text-slate-400 italic bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  Note: {selectedSale.notes}
                </div>
              )}
            </div>

            {/* Pinned Footer */}
            <div className="flex-none p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </NavLayout>
  );
}
