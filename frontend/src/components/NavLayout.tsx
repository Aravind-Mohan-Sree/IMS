'use client';

import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface NavLayoutProps {
  children: React.ReactNode;
}

export const NavLayout: React.FC<NavLayoutProps> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Navbar
        onToggleMobileMenu={toggleMobileMenu}
        isMobileMenuOpen={isMobileOpen}
      />

      <div className="flex flex-1 relative overflow-hidden h-[calc(100vh-61px)]">
        {/* Sidebar (Desktop fixed + Mobile slide-over drawer) */}
        <Sidebar
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobileMenu}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto h-full w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
