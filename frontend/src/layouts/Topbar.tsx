import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  Search,
  ChevronDown,
  User,
  Shield,
  LogOut,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { useAppStore, HeaderAlert } from '../store/useAppStore';
import { MOCK_SYSTEM_ALERTS } from '../api/mockData';

import { KlhHeaderFilter } from '../components/filters/KlhHeaderFilter';
import { SosRescueModal } from '../components/dispatch/SosRescueModal';

export const Topbar: React.FC = () => {
  const {
    activeEmergencyCount,
    selectedKLH,
    isGlobalRefreshing,
    setGlobalRefreshing,
    headerAlert,
    setHeaderAlert,
  } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const location = useLocation();

  // Listen to custom header alert events from any page / component
  useEffect(() => {
    const handleCustomAlert = (event: Event) => {
      const customEvent = event as CustomEvent<HeaderAlert>;
      if (customEvent.detail) {
        setHeaderAlert(customEvent.detail);
      }
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      // Do not duplicate if already handled by axios interceptor
      if (reason?.isAxiosError) return;
      const message = reason?.message || (typeof reason === 'string' ? reason : 'Lỗi không xác định khi tải dữ liệu');
      setHeaderAlert({
        type: 'error',
        message: `Lỗi hệ thống: ${message}`,
      });
    };

    window.addEventListener('thaco_header_alert', handleCustomAlert);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('thaco_header_alert', handleCustomAlert);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [setHeaderAlert]);

  // Auto-dismiss success / info alerts after 4 seconds (error and warning persist until dismissed or refreshed)
  useEffect(() => {
    if (headerAlert && (headerAlert.type === 'success' || headerAlert.type === 'info')) {
      const timer = setTimeout(() => {
        setHeaderAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [headerAlert, setHeaderAlert]);

  const handleGlobalRefresh = () => {
    setGlobalRefreshing(true);

    // 1. Phát sự kiện làm mới dữ liệu cho các trang/component lắng nghe
    window.dispatchEvent(
      new CustomEvent('thaco_refresh_current_page', {
        detail: { pathname: location.pathname },
      })
    );

    // 2. Làm mới trang (reload) sau hiệu ứng xoay làm mới
    setTimeout(() => {
      window.location.reload();
    }, 350);
  };

  // Dynamic breadcrumb label
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between min-w-0">
      {/* Left / Center: Global 3 Complexes Filter + Global Refresh Button + Header Alert */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
        <KlhHeaderFilter />

        {/* Nút Load lại dữ liệu đặt cạnh ô chọn Khu liên hợp, vừa làm mới dữ liệu và làm mới trang luôn */}
        <button
          type="button"
          onClick={handleGlobalRefresh}
          disabled={isGlobalRefreshing}
          title="Làm mới dữ liệu và làm mới trang"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d2e4d8] bg-[#f0f6f2] hover:bg-[#e6f1e9] text-emerald-800 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw
            className={`h-4 w-4 text-emerald-700 transition-transform ${
              isGlobalRefreshing ? 'animate-spin text-emerald-600' : ''
            }`}
          />
        </button>

        {/* Thông báo lỗi / không có data / trạng thái ngay trên Header kế bên nút Refresh */}
        {headerAlert && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-left-2 duration-200 min-w-0 max-w-[240px] sm:max-w-sm md:max-w-md lg:max-w-xl ${
              headerAlert.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-rose-100'
                : headerAlert.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-amber-100'
                : headerAlert.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-100'
                : 'bg-blue-50 border-blue-300 text-blue-900 shadow-blue-100'
            }`}
          >
            {headerAlert.type === 'error' && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
            )}
            {headerAlert.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {headerAlert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            {headerAlert.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {headerAlert.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}

            <span
              className="truncate select-text"
              title={headerAlert.detail ? `${headerAlert.message} (${headerAlert.detail})` : headerAlert.message}
            >
              {headerAlert.message}
            </span>

            {headerAlert.type === 'error' && (
              <button
                type="button"
                onClick={handleGlobalRefresh}
                className="px-2 py-0.5 rounded-md bg-rose-200/80 hover:bg-rose-300 text-rose-900 font-bold text-[11px] shrink-0 transition-colors cursor-pointer ml-auto"
                title="Tải lại trang"
              >
                Tải lại
              </button>
            )}

            <button
              type="button"
              onClick={() => setHeaderAlert(null)}
              className={`p-1 rounded-md hover:bg-black/10 cursor-pointer shrink-0 transition-colors ${
                headerAlert.type === 'error'
                  ? 'text-rose-600 hover:text-rose-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right Actions: Notification & User */}
      <div className="flex items-center gap-2.5 shrink-0">

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

      {/* SOS Emergency Rescue Modal */}
      <SosRescueModal
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
      />
    </header>
  );
};

