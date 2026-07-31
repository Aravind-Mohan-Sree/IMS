'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiUser, FiBox, FiMenu, FiX } from 'react-icons/fi';
import Link from 'next/link';
import { ConfirmModal } from './ConfirmModal';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false
}) => {
  const { user, logout } = useAuth();
  const [isConfirmSignOutOpen, setIsConfirmSignOutOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Toggle */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-colors"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          )}

          {/* Logo & Branding */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-teal-500 rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <FiBox className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent leading-none">
                INVENTORY HUB
              </h1>
              <span className="text-[9px] sm:text-[10px] font-semibold text-teal-400 tracking-wider uppercase block mt-0.5">
                Management Suite
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/80 border border-slate-800/90 px-2.5 sm:px-3.5 py-1.5 rounded-full">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs sm:text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <p className="text-xs font-semibold text-slate-100 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-mono capitalize">{user.role}</p>
              </div>
              <button
                onClick={() => setIsConfirmSignOutOpen(true)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-full transition-colors"
                title="Sign out of system"
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-md"
            >
              <FiUser className="w-4 h-4" /> Sign In
            </Link>
          )}
        </div>
      </header>

      <ConfirmModal
        isOpen={isConfirmSignOutOpen}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of the system?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={() => {
          setIsConfirmSignOutOpen(false);
          logout();
        }}
        onCancel={() => setIsConfirmSignOutOpen(false)}
      />
    </>
  );
};
