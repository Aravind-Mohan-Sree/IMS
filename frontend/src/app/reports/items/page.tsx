'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavLayout } from '../../../components/NavLayout';
import { ExportToolbar } from '../../../components/ExportToolbar';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiPackage,
  FiDollarSign,
  FiBarChart2,
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiX,
  FiFileText,
  FiTag,
  FiTrendingUp,
  FiGrid,
  FiSearch
} from 'react-icons/fi';
import api from '../../../lib/api';

export default function ItemsReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reportData, setReportData] = useState<any>({
    summary: {
      totalItems: 0,
      totalQuantity: 0,
      totalRetailValue: 0,
      totalCostValue: 0,
      potentialProfit: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    },
    categoryBreakdown: [],
    lowStockItems: [],
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedItemReport, setSelectedItemReport] = useState<any | null>(null);

  // Category search, pagination & infinite scroll states
  const [categorySearch, setCategorySearch] = useState('');
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState('');
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [catPage, setCatPage] = useState(1);
  const [catHasMore, setCatHasMore] = useState(true);
  const [catTotal, setCatTotal] = useState(0);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // 300ms Debounce effect on category search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  // Fetch Category Valuation batches from server
  const fetchCategoryValuationBatch = useCallback(async (search: string, pageNum: number, isAppend = false) => {
    try {
      setLoadingCategories(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '15',
        search
      });
      const res = await api.get(`/reports/category-valuation?${params.toString()}`);
      const batch = res.data.categories || [];
      if (isAppend) {
        setCategories(prev => [...prev, ...batch]);
      } else {
        setCategories(batch);
      }
      setCatHasMore(res.data.hasMore || false);
      setCatTotal(res.data.total || 0);
    } catch (_err) {
      console.error('Failed to fetch category valuation batch');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Fetch category valuation on search change or initial mount
  useEffect(() => {
    if (user) {
      setCatPage(1);
      fetchCategoryValuationBatch(debouncedCategorySearch, 1, false);
    }
  }, [user, debouncedCategorySearch, fetchCategoryValuationBatch]);

  // Infinite Scroll Listener for Category Valuation List
  const handleCategoryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 15 && catHasMore && !loadingCategories) {
      const nextPage = catPage + 1;
      setCatPage(nextPage);
      fetchCategoryValuationBatch(debouncedCategorySearch, nextPage, true);
    }
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/items');
      setReportData(res.data || {});
    } catch (_err) {
      console.error('Failed to load items report');
    } finally {
      setLoading(false);
    }
  }, []);

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
    { header: 'SKU', key: 'sku' },
    { header: 'Item Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'In Stock Qty', key: 'quantity' },
    { header: 'Selling Price (₹)', key: 'price' },
    { header: 'Cost Price (₹)', key: 'costPrice' }
  ];

  return (
    <NavLayout>
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <FiFileText className="text-teal-400 shrink-0" /> Inventory & Items Report
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Stock valuation analysis, low stock warnings, cost breakdown, and category statistics.
        </p>
      </div>

      {/* Export Toolbar */}
      <ExportToolbar
        reportType="items_report"
        dataForExport={reportData.categoryBreakdown}
        headersForExport={exportHeaders}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Retail Valuation</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-teal-400 mt-1">
                ₹{reportData.summary?.totalRetailValue?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-teal-500/20 text-teal-400 rounded-xl">
              <FiTag className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Estimated Total Stock Value</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">₹{reportData.summary?.totalCostValue?.toFixed(2) || '0.00'}</h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <FiTrendingUp className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Potential Profit</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">
                ₹{reportData.summary?.potentialProfit?.toFixed(2) || '0.00'}
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-rose-400 mt-1">
                {reportData.summary?.lowStockCount || 0}
              </h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-rose-500/20 text-rose-400 rounded-xl">
              <FiAlertTriangle className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Low Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <FiGrid className="text-indigo-400" /> Category Valuation
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {catTotal} Categories
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-2.5 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
            <input
              ref={categoryInputRef}
              type="text"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {categorySearch && (
              <button
                type="button"
                onClick={() => {
                  setCategorySearch('');
                  categoryInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Viewport Container with Infinite Scroll */}
          <div
            onScroll={handleCategoryScroll}
            className="max-h-[380px] overflow-y-auto space-y-2.5 p-1 pr-1.5"
          >
            {categories.length === 0 && !loadingCategories ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No matching categories found
              </div>
            ) : (
              categories.map((cat: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors shadow-sm"
                >
                  <div>
                    <div className="font-semibold text-xs text-white">{cat.category}</div>
                    <div className="text-[11px] text-slate-400">{cat.count} item(s) • {cat.totalQty} total pcs</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-teal-400">₹{cat.value.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
            {loadingCategories && (
              <div className="py-2 text-center text-[11px] text-slate-400 font-medium">
                Loading categories...
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <FiAlertTriangle className="text-amber-400" /> Reorder Level & Low Stock Alerts
          </h3>

          {reportData.lowStockItems?.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
              <FiCheckCircle className="w-4 h-4" /> All inventory items are sufficiently stocked above minimum levels.
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[550px]">
                <thead className="sticky top-0 z-10 bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider shadow-sm">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 rounded-l-xl">Item Name</th>
                    <th className="px-3 sm:px-4 py-3">Category</th>
                    <th className="px-3 sm:px-4 py-3 text-center">Qty</th>
                    <th className="px-3 sm:px-4 py-3 text-right">Status</th>
                    <th className="px-3 sm:px-4 py-3 text-center rounded-r-xl">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reportData.lowStockItems?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-semibold text-white whitespace-nowrap">{item.name}</td>
                      <td className="px-3 sm:px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{item.category}</td>
                      <td className="px-3 sm:px-4 py-3 text-center font-bold text-rose-400 whitespace-nowrap">{item.quantity}</td>
                      <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                        <span className="px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                          Reorder Required
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedItemReport(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors"
                        >
                          <FiEye className="w-3.5 h-3.5" /> View
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

      {/* Item Details Modal */}
      {selectedItemReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">Product Inventory Status</span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiPackage className="text-teal-400" /> {selectedItemReport.name}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Category</span>
                <span className="font-semibold text-slate-200">{selectedItemReport.category}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider">SKU</span>
                <span className="font-mono text-indigo-400 font-semibold">{selectedItemReport.sku || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Current Stock Qty</span>
                <span className="font-extrabold text-rose-400 text-sm">{selectedItemReport.quantity} {selectedItemReport.unit || 'pcs'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Min Stock Limit</span>
                <span className="font-semibold text-slate-300">{selectedItemReport.minStockLevel} {selectedItemReport.unit || 'pcs'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Selling Price</span>
                <span className="font-bold text-emerald-400">₹{(selectedItemReport.price || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider">Cost Price</span>
                <span className="font-medium text-slate-400">₹{(selectedItemReport.costPrice || 0).toFixed(2)}</span>
              </div>
            </div>

            {selectedItemReport.description && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Description</span>
                <div className="p-3 bg-slate-950 text-slate-300 text-xs rounded-xl border border-slate-800 leading-relaxed">
                  {selectedItemReport.description}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItemReport(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
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
