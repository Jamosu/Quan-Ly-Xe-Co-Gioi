import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumb } from './Breadcrumb';
import { useAppStore } from '../store/useAppStore';

export const MainLayout: React.FC = () => {
  const { isSidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-[#F4F6F5] text-slate-800 flex flex-col antialiased">
      {/* Dynamic Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? 'pl-[74px]' : 'pl-[270px]'
        }`}
      >
        {/* Sticky Topbar */}
        <Topbar />

        {/* Dynamic Page Body with Breadcrumbs */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 w-full max-w-[1680px] mx-auto min-w-0">
          <Breadcrumb />
          <Outlet />
        </main>

        {/* Footer info */}
        <footer className="py-3.5 px-6 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/60 shrink-0">
          THACO AGRI © 2026 - Hệ Thống Điều Hành & Giám Sát Xe Cơ Giới Nông Nghiệp Khép Kín
        </footer>
      </div>
    </div>
  );
};
