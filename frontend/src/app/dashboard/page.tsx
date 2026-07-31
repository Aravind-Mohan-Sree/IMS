'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { NavLayout } from '../../components/NavLayout';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiPackage,
  FiAlertTriangle,
  FiUsers,
  FiPlus,
  FiShoppingBag,
  FiArrowRight,
  FiTrendingUp
} from 'react-icons/fi';
import api from '../../lib/api';
import Link from 'next/link';
import { formatDateTime, getLocalDateStr } from '../../lib/formatters';

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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalItems: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    totalCustomers: 0,
    salesToday: 0
  });

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsRes, custRes, salesRes] = await Promise.all([
        api.get('/items'),
        api.get('/customers'),
        api.get('/sales')
      ]);

      const items = itemsRes.data || [];
      const customers = custRes.data || [];
      const sales = salesRes.data || [];

      const totalVal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
      const lowStock = items.filter((item: any) => item.quantity <= item.minStockLevel).length;

      const todayStr = getLocalDateStr();
      const todaySalesVal = sales
        .filter((s: any) => s.date === todayStr)
        .reduce((sum: number, s: any) => sum + s.totalAmount, 0);

      setStats({
        totalItems: items.length,
        totalStockValue: totalVal,
        lowStockCount: lowStock,
        totalCustomers: customers.length,
        salesToday: todaySalesVal
      });

      setRecentSales(sales.slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
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
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  if (authLoading || !user) return null;

  return (
    <NavLayout>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 p-5 sm:p-6 rounded-3xl border border-indigo-500/20 shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            Welcome back, {user.name}! 👋
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Here is your inventory overview and real-time sales summary.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/sales"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex-1 sm:flex-initial"
          >
            <FiShoppingBag className="w-4 h-4" /> Record New Sale
          </Link>
          <Link
            href="/inventory"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all flex-1 sm:flex-initial"
          >
            <FiPlus className="w-4 h-4 text-teal-400" /> Add Item
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Items</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.totalItems}</h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <FiPackage className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 sm:mt-3">Catalog inventory count</p>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inventory Value</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">₹{stats.totalStockValue.toFixed(2)}</h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FiTrendingUp className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 sm:mt-3">Total valuation of in-stock items</p>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Alert</p>
              <h3 className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">{stats.lowStockCount}</h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <FiAlertTriangle className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 sm:mt-3">Items below minimum stock level</p>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Customers</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.totalCustomers}</h3>
            </div>
            <div className="p-2.5 sm:p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <FiUsers className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 sm:mt-3">Customer directory database</p>
        </div>
      </div>

      {/* Recent Sales Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Recent Sales Activity</h3>
            <p className="text-xs text-slate-400">Latest transactions recorded in system</p>
          </div>
          <Link
            href="/reports/sales"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View All <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading recent sales...</div>
        ) : recentSales.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No sales transactions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[550px]">
              <thead className="bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3 sm:px-4 py-3">Invoice No</th>
                  <th className="px-3 sm:px-4 py-3">Date & Time</th>
                  <th className="px-3 sm:px-4 py-3">Customer</th>
                  <th className="px-3 sm:px-4 py-3">Payment</th>
                  <th className="px-3 sm:px-4 py-3 text-right">Items</th>
                  <th className="px-3 sm:px-4 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 sm:px-4 py-3 font-mono font-semibold text-indigo-400">{s.invoiceNo}</td>
                    <td className="px-3 sm:px-4 py-3 text-slate-400 text-xs">{formatDateTime(s.saleDate || s.date, s.createdAt)}</td>
                    <td className="px-3 sm:px-4 py-3 font-medium text-slate-200">{s.customerName}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-lg ${getPaymentMethodBadgeClass(s.paymentMethod)}`}>
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right text-slate-400">{s.items.length}</td>
                    <td className="px-3 sm:px-4 py-3 text-right font-bold text-white">₹{s.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </NavLayout>
  );
}
