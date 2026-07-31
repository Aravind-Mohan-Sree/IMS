'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid,
  FiPackage,
  FiUsers,
  FiShoppingBag,
  FiTrendingUp,
  FiFileText,
  FiBookOpen,
  FiX
} from 'react-icons/fi';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile
}) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: FiGrid },
    { label: 'Inventory Items', href: '/inventory', icon: FiPackage },
    { label: 'Customers', href: '/customers', icon: FiUsers },
    { label: 'Record Sale (POS)', href: '/sales', icon: FiShoppingBag },
    { label: 'Sales Report', href: '/reports/sales', icon: FiTrendingUp },
    { label: 'Items Report', href: '/reports/items', icon: FiFileText },
    { label: 'Customer Ledger', href: '/reports/customer-ledger', icon: FiBookOpen }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`bg-slate-900/95 border-r border-slate-800/80 flex flex-col p-4 shrink-0 print:hidden shadow-xl transition-all duration-300 ${
          /* Desktop fixed sidebar */
          'hidden md:flex md:w-64 md:h-full'
        } ${
          /* Mobile slide-over drawer */
          isMobileOpen
            ? '!flex fixed top-0 left-0 bottom-0 z-50 w-72 h-full animate-slide-in-left'
            : ''
        }`}
      >
        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between md:hidden pb-3 mb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Navigation Menu</span>
          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-3 hidden md:block">
          Navigation
        </div>

        <nav className="space-y-1 overflow-y-auto flex-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800/80 px-1">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-400">
            <p className="font-semibold text-slate-200 mb-1">IMS Active System</p>
            <p className="text-[11px] text-slate-400">CRUD • POS • Reports • Export</p>
          </div>
        </div>
      </aside>
    </>
  );
};
