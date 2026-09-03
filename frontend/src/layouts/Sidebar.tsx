import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  Truck,
  FileSpreadsheet,
  Users,
  Wrench,
  Fuel,
  BarChart3,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Headphones,
  BellRing,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface NavItem {
  label: string;
  path: string;
}

interface NavGroup {
  id: string;
  icon: React.ReactNode;
  title: string;
  path?: string;
  badge?: number;
  badgeColor?: string;
  children?: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar, activeEmergencyCount } = useAppStore();
  const location = useLocation();

  const NAV_MODULES: NavGroup[] = [
    {
      id: 'dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      title: 'Dashboard',
      path: '/dashboard',
    },
    {
      id: 'gps',
      icon: <Navigation className="w-4 h-4" />,
      title: 'Giám sát GPS trực tuyến',
      children: [
        { label: 'Bản đồ GPS realtime', path: '/gps/realtime' },
        { label: 'Playback hành trình', path: '/gps/playback' },
        { label: 'Vùng giám sát (Geofence)', path: '/gps/geofence' },
        { label: 'Cảnh báo tốc độ & Vùng', path: '/gps/speed-alert' },
        { label: 'Nhật ký mất sóng offline', path: '/gps/offline-logs' },
      ],
    },
    {
      id: 'fleet',
      icon: <Truck className="w-4 h-4" />,
      title: 'Quản lý đội xe',
      children: [
        { label: 'Xe cơ giới', path: '/doi-xe/ho-so-xe' },
        { label: 'Thiết bị & nông cụ', path: '/doi-xe/thiet-bi' },
        { label: 'Phân bổ xe đơn vị', path: '/doi-xe/phan-xe' },
        { label: 'Thiết bị GPS & Cảm biến', path: '/doi-xe/gps-cam-bien' },
        { label: 'Lịch sử biến động xe', path: '/doi-xe/lich-su' },
      ],
    },
    {
      id: 'dispatch',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      title: 'Lệnh điều xe & Vận hành',
      children: [
        { label: 'Kế hoạch sản xuất', path: '/lenh-dieu-xe/ke-hoach' },
        { label: 'Lệnh điều xe', path: '/lenh-dieu-xe/danh-sach' },
        { label: 'Lệnh vận chuyển nội bộ', path: '/lenh-dieu-xe/van-chuyen' },
        { label: 'Xác nhận khối lượng & Cân', path: '/lenh-dieu-xe/phieu-can' },
      ],
    },
    {
      id: 'drivers',
      icon: <Users className="w-4 h-4" />,
      title: 'Quản lý lái xe',
      children: [
        { label: 'Hồ sơ lái xe & Thợ máy', path: '/lai-xe/ho-so' },
        { label: 'Phân công lái xe theo ca', path: '/lai-xe/phan-cong' },
        { label: 'Quản lý GPLX & Hạn SK', path: '/lai-xe/quan-ly-gplx' },
        { label: 'Lịch sử vi phạm', path: '/lai-xe/vi-pham' },
        { label: 'Bảng xếp hạng KPI thi đua', path: '/lai-xe/kpi' },
      ],
    },
    {
      id: 'workshop',
      icon: <Wrench className="w-4 h-4" />,
      title: 'Xưởng BTSC',
      children: [
        { label: 'Kế hoạch bảo trì (250h)', path: '/xuong-btsc/ke-hoach' },
        { label: 'Tiếp nhận báo hỏng', path: '/xuong-btsc/yeu-cau' },
        { label: 'Phiếu sửa chữa & Vật tư', path: '/xuong-btsc/phieu-sua-chua' },
        { label: 'Theo dõi tiến độ xưởng (Kanban)', path: '/xuong-btsc/tien-do' },
        { label: 'Đăng kiểm & Bảo hiểm', path: '/xuong-btsc/dang-kiem' },
      ],
    },
    {
      id: 'fuel',
      icon: <Fuel className="w-4 h-4" />,
      title: 'Quản lý nhiên liệu xe',
      children: [
        { label: 'Mức dầu bình xe (Que đo GPS)', path: '/nhien-lieu/ton-kho' },
        { label: 'Cấp phát dầu tại xe & Lô', path: '/nhien-lieu/phieu-cap' },
        { label: 'Định mức tiêu hao theo xe', path: '/nhien-lieu/dinh-muc' },
        { label: 'Đối chiếu GPS vs Que đo dầu', path: '/nhien-lieu/doi-chieu' },
        { label: 'Cảnh báo sụt dầu & Hút trộm', path: '/nhien-lieu/canh-bao-sut-dau' },
      ],
    },
    {
      id: 'alerts',
      icon: <BellRing className="w-4 h-4" />,
      title: 'Cảnh báo & Thông báo',
      children: [
        { label: 'Cảnh báo chưa xử lý (SOS)', path: '/canh-bao/chua-xu-ly' },
        { label: 'Lịch sử cảnh báo', path: '/canh-bao/lich-su' },
        { label: 'Cấu hình ngưỡng an toàn', path: '/canh-bao/cau-hinh' },
        { label: 'Thống kê tần suất vi phạm', path: '/canh-bao/thong-ke' },
      ],
    },
    {
      id: 'reports',
      icon: <BarChart3 className="w-4 h-4" />,
      title: 'Báo cáo hợp nhất',
      children: [
        { label: 'Báo cáo năng suất xe', path: '/bao-cao/nang-suat' },
        { label: 'Hành trình & Vi phạm', path: '/bao-cao/hanh-trinh-vi-pham' },
        { label: 'Báo cáo KPI lái xe', path: '/bao-cao/kpi-lai-xe' },
        { label: 'Báo cáo tiêu hao nhiên liệu', path: '/bao-cao/nhien-lieu' },
        { label: 'Báo cáo chi phí BTSC', path: '/bao-cao/chi-phi-btsc' },
        { label: 'So sánh giữa các KLH', path: '/bao-cao/so-sanh-klh' },
      ],
    },
    {
      id: 'master-data',
      icon: <Database className="w-4 h-4" />,
      title: 'Danh mục hệ thống',
      children: [
        { label: 'Danh mục quản lý dự án', path: '/danh-muc/quan-ly-du-an' },
        { label: 'Chức danh', path: '/danh-muc/chuc-danh' },
        { label: 'Chủng loại xe', path: '/danh-muc/loai-xe' },
        { label: 'Loại công việc & Lệnh', path: '/danh-muc/loai-cong-viec' },
        { label: 'Lô thửa & Tuyến đường', path: '/danh-muc/lo-thua-tuyen-duong' },
        { label: 'Vật tư & Phụ tùng BTSC', path: '/danh-muc/vat-tu-phu-tung' },
        { label: 'Định mức kỹ thuật', path: '/danh-muc/dinh-muc-ky-thuat' },
      ],
    },
    {
      id: 'permissions',
      icon: <ShieldCheck className="w-4 h-4" />,
      title: 'Phân quyền hệ thống',
      children: [
        { label: 'Quản lý nhân viên', path: '/phan-quyen/nhan-vien' },
        { label: 'Người dùng & Tài khoản', path: '/phan-quyen/nguoi-dung' },
        { label: 'Vai trò & Ma trận quyền', path: '/phan-quyen/vai-tro' },
        { label: 'Phân quyền theo đơn vị', path: '/phan-quyen/don-vi' },
        { label: 'Nhật ký hệ thống (Audit)', path: '/phan-quyen/audit' },
      ],
    },
  ];

  // Accordion state - auto collapses when navigating to dashboard
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (location.pathname === '/dashboard' || location.pathname === '/') {
      return {};
    }
    const initial: Record<string, boolean> = {};
    NAV_MODULES.forEach((mod) => {
      const isChildActive = mod.children?.some((c) => location.pathname === c.path || (c.path !== '/dashboard' && location.pathname.startsWith(c.path)));
      if (isChildActive) initial[mod.id] = true;
    });
    return initial;
  });

  // Sync menu state with active route
  React.useEffect(() => {
    if (location.pathname === '/dashboard' || location.pathname === '/') {
      setOpenGroups({});
    } else {
      const activeGroup = NAV_MODULES.find((mod) =>
        mod.children?.some((c) => location.pathname === c.path || (c.path !== '/dashboard' && location.pathname.startsWith(c.path)))
      );
      if (activeGroup) {
        setOpenGroups({ [activeGroup.id]: true });
      }
    }
  }, [location.pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const willOpen = !prev[id];
      if (willOpen) {
        return { [id]: true };
      }
      return {};
    });
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-[#0A321A] text-slate-200 transition-all duration-250 ease-in-out border-r border-[#134D2A] ${
        isSidebarCollapsed ? 'w-[74px]' : 'w-[270px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-3.5 border-b border-white/10 shrink-0 justify-between bg-[#082815]">
        <NavLink
          to="/dashboard"
          onClick={() => setOpenGroups({})}
          className="flex items-center gap-2 overflow-hidden text-decoration-none"
        >
          {isSidebarCollapsed ? (
            <img
              src="/logo-white-fix.png"
              alt="THACO AGRI"
              className="h-6 w-auto max-w-[40px] object-contain shrink-0"
            />
          ) : (
            <img
              src="/logo-white-fix.png"
              alt="THACO AGRI"
              className="h-6 max-w-[185px] w-auto object-contain block shrink-0"
            />
          )}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors shrink-0"
          title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links Scrollable Area */}
      <nav className="flex-1 overflow-y-auto sidebar-scrollbar px-2 py-3 space-y-1">
        {NAV_MODULES.map((group) => {
          // Direct Link (e.g. Dashboard)
          if (!group.children || group.children.length === 0) {
            const isDirectActive = location.pathname === (group.path || '/dashboard');

            return (
              <div key={group.id} className="mb-0.5">
                <NavLink
                  to={group.path || '/dashboard'}
                  onClick={() => {
                    setOpenGroups({});
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isDirectActive
                      ? 'bg-[#154E2C] text-[#B8D83D] font-bold shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isDirectActive ? 'text-[#B8D83D]' : 'text-slate-400'}>
                      {group.icon}
                    </span>
                    {!isSidebarCollapsed && <span className="truncate">{group.title}</span>}
                  </div>

                  {!isSidebarCollapsed && group.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${group.badgeColor || 'bg-slate-700 text-white'}`}>
                      {group.badge}
                    </span>
                  )}
                </NavLink>
              </div>
            );
          }

          // Expandable Group with Sub-items
          const isGroupOpen = !!openGroups[group.id];
          const hasActiveChild = group.children.some((c) => location.pathname === c.path || (c.path !== '/dashboard' && location.pathname.startsWith(c.path)));

          return (
            <div key={group.id} className="mb-0.5">
              <button
                onClick={() => {
                  if (isSidebarCollapsed) toggleSidebar();
                  toggleGroup(group.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  hasActiveChild
                    ? 'bg-[#154E2C] text-[#B8D83D] font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`${hasActiveChild ? 'text-[#B8D83D]' : 'text-slate-400'}`}>
                    {group.icon}
                  </span>
                  {!isSidebarCollapsed && <span className="truncate">{group.title}</span>}
                </div>

                {!isSidebarCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {group.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${group.badgeColor || 'bg-slate-700 text-white'}`}>
                        {group.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isGroupOpen ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </div>
                )}
              </button>

              {/* Sub-items */}
              {!isSidebarCollapsed && isGroupOpen && (
                <div className="pl-8 pr-1 py-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {group.children.map((child) => {
                    const isChildActive = location.pathname === child.path;
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={`block px-2.5 py-1.5 rounded-lg text-[11px] transition-all relative ${
                          isChildActive
                            ? 'text-white font-bold bg-white/10 before:content-[""] before:absolute before:left-[-8px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#B8D83D]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                      >
                        {child.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Support Footer */}
      {!isSidebarCollapsed ? (
        <div className="p-3 border-t border-white/10 bg-[#082815]/70 shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
            <Headphones className="w-4 h-4 text-[#B8D83D] shrink-0" />
            <div className="flex-1 truncate">
              <div className="text-[11px] font-bold text-white">Hỗ trợ vận hành IT</div>
              <div className="text-[10px] text-slate-400">Ext: 8888 | 028 3999 8888</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-white/10 flex justify-center bg-[#082815]/70 shrink-0">
          <Headphones className="w-4 h-4 text-[#B8D83D]" />
        </div>
      )}
    </aside>
  );
};
