import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
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
  MapPin,
} from 'lucide-react';
import { useAppStore, HeaderAlert } from '../store/useAppStore';
import { apiClient } from '../api/client';

import { KlhHeaderFilter } from '../components/filters/KlhHeaderFilter';

const alertDisplayDate = (alert: { category?: string; metadataJson?: { expiryDate?: string } | null; createdAt?: string | Date }) => {
  if (alert.category === 'COMPLIANCE' && alert.metadataJson?.expiryDate) {
    const [year, month, day] = alert.metadataJson.expiryDate.split('-');
    return `${day}/${month}/${year}`;
  }
  return alert.createdAt
    ? new Date(alert.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : '';
};

export const Topbar: React.FC = () => {
  const {
    activeEmergencyCount,
    systemAlerts,
    selectedKLH,
    isGlobalRefreshing,
    setGlobalRefreshing,
    headerAlert,
    setHeaderAlert,
    setSystemAlerts,
    markAlertRead,
    currentUser,
    logout,
  } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Tự động đóng dropdown khi chuyển trang
  useEffect(() => {
    setShowNotifications(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // ── Fetch real alerts from /alerts API ──────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      const complexParam = selectedKLH !== 'ALL' ? selectedKLH : undefined;
      const res = await apiClient.get('/alerts', { params: { limit: 50, complexCode: complexParam } });
      const payload = res.data?.data || res.data;
      const items = Array.isArray(payload) ? payload : payload?.items || [];
      if (Array.isArray(items)) {
        setSystemAlerts(items);
      }
    } catch {
      // Silent fail – bell badge stays at 0 if API unreachable
    }
  }, [selectedKLH, setSystemAlerts]);

  useEffect(() => {
    void fetchAlerts();
    // Re-poll every 60 seconds to keep badge fresh
    const timer = setInterval(() => void fetchAlerts(), 60_000);
    const refresh = () => void fetchAlerts();
    window.addEventListener('thaco_alerts_refresh', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('thaco_alerts_refresh', refresh);
    };
  }, [fetchAlerts]);

  const unreadAlerts = systemAlerts.filter((alert) => !alert.isRead);
  const openAlert = async (alert: (typeof systemAlerts)[number]) => {
    if (!alert.isRead) {
      try {
        const response = await apiClient.patch(`/alerts/${alert.id}/read`);
        const payload = response.data?.data || response.data;
        markAlertRead(alert.id, payload?.readAt);
      } catch {
        return;
      }
    }
    setShowNotifications(false);
    navigate(`/canh-bao/chua-xu-ly?alertId=${alert.id}`);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'Quản trị viên', color: 'bg-purple-100 text-purple-800' };
      case 'FARM_MANAGER':
      case 'DISPATCHER':
      case 'WORKSHOP_MANAGER':
      case 'FUEL_STOREKEEPER':
        return { label: 'Nhân sự quản lý', color: 'bg-emerald-100 text-emerald-800' };
      case 'DRIVER':
        return { label: 'Tài xế', color: 'bg-amber-100 text-amber-800' };
      default:
        return { label: 'Người dùng', color: 'bg-slate-100 text-slate-800' };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);
  const displayName = currentUser?.fullName || currentUser?.username || 'Người dùng';
  const displayEmail = currentUser?.email || `${currentUser?.username || 'user'}@thacoagri.com.vn`;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'QL';

  const getKlhName = () => {
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.username === 'admin') {
      return 'Toàn bộ 3 KLH';
    }
    const raw = (currentUser?.assignedUnit || currentUser?.unit || currentUser?.complexName || currentUser?.complexCode || currentUser?.username || '').toUpperCase();
    if (raw.includes('SNOUL') || raw.includes('SN')) return 'KLH Snoul';
    if (raw.includes('NAMLAO') || raw.includes('NAM_LAO') || raw.includes('LAO') || raw.includes('NL')) return 'KLH Nam Lào';
    return 'KLH Koun Mom';
  };
  const klhName = getKlhName();

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

  // Tự động xóa cảnh báo cũ khi chuyển trang
  useEffect(() => {
    setHeaderAlert(null);
  }, [location.pathname, setHeaderAlert]);

  // Tự động ẩn thông báo: success/info sau 4s, error/warning sau 5s (người dùng không cần bấm tắt thủ công)
  useEffect(() => {
    if (headerAlert) {
      const duration = headerAlert.type === 'error' || headerAlert.type === 'warning' ? 5000 : 4000;
      const timer = setTimeout(() => {
        setHeaderAlert(null);
      }, duration);
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
        <div className="relative" ref={notificationRef}>
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
            <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-bold text-xs text-slate-900">Cảnh báo vận hành cần xử lý</span>
                  {unreadAlerts.length > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {unreadAlerts.length}
                    </span>
                  )}
                </div>
                <NavLink
                  to="/canh-bao/chua-xu-ly"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  Xem tất cả
                </NavLink>
              </div>

              {/* Alert list */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {unreadAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                    <p className="text-xs font-semibold text-slate-500">Không có cảnh báo tồn đọng</p>
                    <p className="text-[11px] text-slate-400">Hệ thống đang hoạt động an toàn</p>
                  </div>
                ) : (
                  unreadAlerts.slice(0, 8).map((alert, idx) => {
                    const isCrit = alert.severity === 'CRITICAL';
                    const isWarn = alert.severity === 'WARNING';
                    return (
                      <div
                        key={String(alert.id) || idx}
                        className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => void openAlert(alert)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black border ${
                            isCrit ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isWarn ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isCrit ? '!' : isWarn ? '⚠' : 'ℹ'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">{alert.title}</p>
                            {alert.vehicle?.plate && (
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <span className="font-mono font-semibold text-slate-700">{alert.vehicle.plate}</span>
                                {alert.location && <><span className="text-slate-300">·</span><MapPin className="w-2.5 h-2.5 text-slate-400" /><span className="truncate">{alert.location}</span></>}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {alertDisplayDate(alert)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {unreadAlerts.length > 8 && (
                <div className="px-4 py-2 border-t border-slate-100 text-center">
                  <NavLink to="/canh-bao/chua-xu-ly" onClick={() => setShowNotifications(false)}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline">
                    Xem thêm {unreadAlerts.length - 8} cảnh báo khác
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Profile */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-slate-50 transition-all text-left border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
              {initials}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                {displayName}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
                <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {klhName}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {/* User Profile Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="text-xs font-bold text-slate-800">{displayName}</div>
                <div className="text-[10px] text-slate-400 truncate">{displayEmail}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {klhName}
                  </span>
                </div>
              </div>
              <NavLink
                to="/phan-quyen/nguoi-dung"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                Quản lý người dùng
              </NavLink>
              <NavLink
                to="/phan-quyen/vai-tro"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Ma trận 3 vai trò
              </NavLink>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg text-left cursor-pointer transition-colors"
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
