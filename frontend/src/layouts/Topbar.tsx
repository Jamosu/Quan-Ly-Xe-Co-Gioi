import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  Search,
  ChevronDown,
  User,
  Shield,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { MOCK_SYSTEM_ALERTS } from '../api/mockData';

import { KlhHeaderFilter } from '../components/filters/KlhHeaderFilter';

export const Topbar: React.FC = () => {
  const { activeEmergencyCount } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  // Dynamic breadcrumb label
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between min-w-0">
      {/* Left / Center: Global 3 Complexes Filter */}
      <div className="flex items-center min-w-0 flex-1 mr-4">
        <KlhHeaderFilter />
      </div>

      {/* Right Actions: Notification & User */}
      <div className="flex items-center gap-3 shrink-0">

        {/* SOS Emergency Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 relative transition-colors"
            title="Thông báo & Cảnh báo"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {activeEmergencyCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white">
                {activeEmergencyCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900 font-heading">Cảnh báo vận hành cần xử lý</span>
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {MOCK_SYSTEM_ALERTS.length} mới
                  </span>
                </div>
                <NavLink
                  to="/canh-bao/chua-xu-ly"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  Xem tất cả
                </NavLink>
              </div>

              <div className="divide-y divide-slate-100 my-2 max-h-72 overflow-y-auto">
                {MOCK_SYSTEM_ALERTS.map((alert) => (
                  <div key={alert.id} className="py-2.5 hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-900">{alert.plateNumber}</span>
                      <span className="text-[10px] text-slate-400">{alert.occurredAt.slice(11, 16)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{alert.description}</p>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-1">📍 {alert.location}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-lg hover:bg-slate-50 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#dcebe4] text-[#135c3f] flex items-center justify-center font-bold text-xs shrink-0">
              LT
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">Chau Tiểu Long</div>
              <div className="text-[10px] text-slate-400">Quản trị hệ thống</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {/* User Profile Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="text-xs font-bold text-slate-800">Chau Tiểu Long</div>
                <div className="text-[10px] text-slate-400 truncate">long.ct@thacoagri.com.vn</div>
              </div>
              <NavLink
                to="/phan-quyen/nguoi-dung"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                Hồ sơ tài khoản
              </NavLink>
              <NavLink
                to="/phan-quyen/vai-tro"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Phân quyền vai trò
              </NavLink>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => setShowUserMenu(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

