import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  UserCheck,
  Smartphone,
  AlertTriangle,
  Lock,
  Trash2,
  Check,
  Layers,
  Sparkles,
  Info,
  SlidersHorizontal,
} from 'lucide-react';

export type PermissionLevel =
  | 'FULL_WITH_DELETE' // Toàn quyền (Xem, Thêm, Sửa, XÓA)
  | 'MANAGE_NO_DELETE' // Điều hành (Xem, Thêm, Sửa - KHÔNG XÓA)
  | 'VIEW_ONLY' // Chỉ xem dữ liệu
  | 'MOBILE_APP_ONLY' // Dành riêng cho App Mobile Lái xe
  | 'NO_ACCESS'; // Không có quyền truy cập

export interface MenuPermissionRow {
  id: string;
  menuName: string;
  routePath: string;
  category: 'OPERATIONS' | 'TECHNICAL' | 'MASTER_DATA' | 'MOBILE';
  description: string;
  adminPermission: PermissionLevel;
  managerPermission: PermissionLevel;
  driverPermission: PermissionLevel;
  canAdminDelete: boolean;
  canManagerDelete: boolean;
}

const DEFAULT_MENU_PERMISSIONS: MenuPermissionRow[] = [
  {
    id: 'menu-dashboard',
    menuName: 'Bảng điều khiển & KPI tổng hợp',
    routePath: '/dashboard',
    category: 'OPERATIONS',
    description: 'Xem 5 thẻ KPI điều hành, biểu đồ năng suất máy kéo, bản đồ Live Fleet 3 Khu Liên Hợp',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'NO_ACCESS',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-gps',
    menuName: 'Giám sát GPS & Telemetry vệ tinh',
    routePath: '/gps/live',
    category: 'OPERATIONS',
    description: 'Bản đồ vị trí xe trực tuyến, xem lại lịch sử chạy vệt, cảnh báo quá tốc độ & hàng rào Geofence',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'NO_ACCESS',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-agriculture-dispatch',
    menuName: 'Kế hoạch & Điều xe Nông nghiệp',
    routePath: '/lenh-dieu-xe/lenh-nong-nghiep',
    category: 'OPERATIONS',
    description: 'Lập kế hoạch làm đất, phát hành lệnh cày bừa, gán máy kéo/nông cụ và nghiệm thu khối lượng GPS',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'MOBILE_APP_ONLY',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-construction-dispatch',
    menuName: 'Lệnh điều xe Công trình',
    routePath: '/lenh-dieu-xe/lenh-cong-trinh',
    category: 'OPERATIONS',
    description: 'Điều động máy thi công san gạt, đào mương, lu rung nền đường nội bộ lô thửa',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'MOBILE_APP_ONLY',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-transport-dispatch',
    menuName: 'Lệnh Vận chuyển nội bộ & Chuối XK',
    routePath: '/lenh-dieu-xe/lenh-noi-bo',
    category: 'OPERATIONS',
    description: 'Điều phối xe đầu kéo container chuối Dole, xe ben chở phân bón NPK & xe TMR thức ăn bò',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'MOBILE_APP_ONLY',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-workshop',
    menuName: 'Xưởng BTSC & Bảo trì 250h',
    routePath: '/xuong-btsc',
    category: 'TECHNICAL',
    description: 'Lịch bảo dưỡng định kỳ 250h máy kéo, quản lý xe nằm xưởng, phiếu BM02 & nợ phụ tùng',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'NO_ACCESS',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-fuel',
    menuName: 'Quản lý Nhiên liệu & Kho bồn',
    routePath: '/nhien-lieu',
    category: 'TECHNICAL',
    description: 'Theo dõi tồn bồn 45.000L, phát hành phiếu cấp dầu (PCD), đối soát cảm biến que đo với định mức',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'MOBILE_APP_ONLY',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-drivers',
    menuName: 'Hồ sơ Lái xe & Chấm điểm KPI',
    routePath: '/lai-xe/danh-sach',
    category: 'TECHNICAL',
    description: 'Quản lý hạn bằng lái GPLX, lịch khám sức khỏe, tổng kết 4 tiêu chí năng suất 25% tính thưởng',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'MOBILE_APP_ONLY',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-reports',
    menuName: 'Báo cáo & Thống kê đối sánh',
    routePath: '/bao-cao/so-sanh-klh',
    category: 'MASTER_DATA',
    description: 'Báo cáo tiến độ làm đất, báo cáo tiêu hao nhiên liệu, đối sánh chéo giữa Koun Mom, Snoul và Nam Lào',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'NO_ACCESS',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-catalogs',
    menuName: 'Danh mục Dữ liệu gốc hệ thống',
    routePath: '/danh-muc/quan-ly-du-an',
    category: 'MASTER_DATA',
    description: 'Danh mục dự án/đơn vị, định mức kỹ thuật, loại xe, chức danh và nông cụ phụ trợ',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'NO_ACCESS',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-permissions',
    menuName: 'Phân quyền, Tài khoản & Nhân sự',
    routePath: '/phan-quyen/nguoi-dung',
    category: 'MASTER_DATA',
    description: 'Cấp phát tài khoản người dùng, danh bạ nhân sự, ma trận vai trò RBAC và nhật ký Audit Trail',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'NO_ACCESS',
    canAdminDelete: true,
    canManagerDelete: false,
  },
  {
    id: 'menu-mobile-driver',
    menuName: 'Ứng dụng Di động Lái xe (Driver Mobile App)',
    routePath: '/mobile/driver',
    category: 'MOBILE',
    description: 'Chuyên biệt cho tài xế nhận lệnh, bắt đầu ca máy, chốt ODO, quét QR vòi bơm dầu và gửi tín hiệu SOS',
    adminPermission: 'FULL_WITH_DELETE',
    managerPermission: 'MANAGE_NO_DELETE',
    driverPermission: 'MOBILE_APP_ONLY',
    canAdminDelete: true,
    canManagerDelete: false,
  },
];

export const RolesMatrixPage: React.FC = () => {
  const [permissions, setPermissions] = useState<MenuPermissionRow[]>(DEFAULT_MENU_PERMISSIONS);
  const [activeRoleView, setActiveRoleView] = useState<'ALL' | 'ADMIN' | 'MANAGER' | 'DRIVER'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Update permission for a specific role and menu item
  const handlePermissionChange = (
    menuId: string,
    role: 'admin' | 'manager' | 'driver',
    newLevel: PermissionLevel
  ) => {
    setPermissions((prev) =>
      prev.map((item) => {
        if (item.id === menuId) {
          if (role === 'admin') {
            return {
              ...item,
              adminPermission: newLevel,
              canAdminDelete: newLevel === 'FULL_WITH_DELETE',
            };
          }
          if (role === 'manager') {
            return {
              ...item,
              managerPermission: newLevel,
              canManagerDelete: newLevel === 'FULL_WITH_DELETE',
            };
          }
          if (role === 'driver') {
            return {
              ...item,
              driverPermission: newLevel,
            };
          }
        }
        return item;
      })
    );
  };

  const handleResetDefault = () => {
    setPermissions(DEFAULT_MENU_PERMISSIONS);
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const filteredRows = permissions.filter((row) => {
    if (categoryFilter !== 'ALL' && row.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Ma Trận Phân Quyền Theo Menu Hệ Thống (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình quyền thao tác trên từng Menu: <b>Admin và Quản lý có quyền điều hành như nhau</b>,{' '}
            chức năng <b>XÓA dữ liệu chỉ dành riêng cho Admin</b>. Tài xế cơ giới <b>chỉ thao tác trên App Mobile</b>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 animate-in fade-in">
              ✓ Đã lưu cấu hình ma trận quyền!
            </span>
          )}
          <Button variant="outline" size="md" icon={<RotateCcw className="w-4 h-4" />} onClick={handleResetDefault}>
            Khôi phục chuẩn
          </Button>
          <Button variant="primary" size="md" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Lưu Ma Trận Quyền
          </Button>
        </div>
      </div>

      {/* Core Security Rule Alert Banner */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-emerald-50 to-amber-50 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-900 font-heading uppercase tracking-wide">
                  Quy định nghiệp vụ phân quyền THACO AGRI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-200 text-purple-900">
                  Chuẩn RBAC
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                • <b>Hiện tại Admin và Quản lý như nhau:</b> Đều có quyền xem, tạo kế hoạch, lập lệnh điều xe, duyệt lệnh, cấp phát nhiên liệu và xuất báo cáo.<br />
                • <b>Chức năng XÓA:</b> <u>Chỉ duy nhất Quản trị viên (Admin) có quyền XÓA</u> để ngăn ngừa việc hủy dữ liệu trái phép hoặc mất dấu vết kiểm toán.<br />
                • <b>Tài xế cơ giới:</b> <u>Chỉ có quyền đăng nhập App Mobile Lái xe</u>, hệ thống tự động chặn hoàn toàn truy cập Cổng thông tin Web.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label="Chính sách quyền điều hành"
          value="Admin & Quản lý như nhau"
          subValue="Đồng nhất quyền lập & duyệt lệnh"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
        <StatCard
          label="Chức năng XÓA dữ liệu"
          value="Chỉ Admin có quyền XÓA"
          subValue="Quản lý không có quyền xóa"
          icon={<Trash2 className="w-5 h-5" />}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-700"
        />
        <StatCard
          label="Tài khoản Tài xế"
          value="Chỉ App Mobile Lái xe"
          subValue="Chặn 100% truy cập Cổng Web"
          icon={<Smartphone className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Menu quản lý phân quyền"
          value={`${permissions.length} Menu chức năng`}
          subValue="Cho phép chọn select box quyền"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
      </KPIGrid>

      {/* Interactive Controls & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Chế độ xem:</span>
            <button
              type="button"
              onClick={() => setActiveRoleView('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRoleView === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toàn bộ Ma trận (3 Vai trò)
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleView('ADMIN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRoleView === 'ADMIN'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Chỉ Quản trị viên (Admin)
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleView('MANAGER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRoleView === 'MANAGER'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Chỉ Nhân sự quản lý (Manager)
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleView('DRIVER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRoleView === 'DRIVER'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Chỉ Tài xế (Driver App)
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Phân nhóm Menu:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Toàn bộ phân hệ ({permissions.length} menu)</option>
              <option value="OPERATIONS">Vận hành & Điều xe</option>
              <option value="TECHNICAL">Kỹ thuật, BTSC & Nhiên liệu</option>
              <option value="MASTER_DATA">Dữ liệu gốc & Báo cáo</option>
              <option value="MOBILE">Ứng dụng di động (Mobile App)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Table with SELECT BOXES on every menu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 font-heading">
              Bảng Chọn Quyền Thao Tác Bằng Select Box Trên Từng Menu
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bạn có thể bấm vào hộp chọn (Select Box) của từng vai trò để thay đổi quyền Xem, Thêm, Sửa, Xóa hoặc phân bổ cho Mobile App.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              <Trash2 className="w-3.5 h-3.5 text-purple-600" /> Admin: Có quyền XÓA
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <XCircle className="w-3.5 h-3.5 text-amber-600" /> Quản lý: Không được XÓA
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-72">Tên Menu & Đường Dẫn</th>

                {(activeRoleView === 'ALL' || activeRoleView === 'ADMIN') && (
                  <th className="py-3 px-4 w-64 bg-purple-50/50 text-purple-950 font-extrabold">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Select Box: Quản Trị Viên (Admin)</span>
                    </div>
                  </th>
                )}

                {(activeRoleView === 'ALL' || activeRoleView === 'MANAGER') && (
                  <th className="py-3 px-4 w-64 bg-emerald-50/50 text-emerald-950 font-extrabold">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Select Box: Nhân Sự Quản Lý</span>
                    </div>
                  </th>
                )}

                {(activeRoleView === 'ALL' || activeRoleView === 'DRIVER') && (
                  <th className="py-3 px-4 w-64 bg-amber-50/50 text-amber-950 font-extrabold">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-amber-600" />
                      <span>Select Box: Tài Xế (Driver)</span>
                    </div>
                  </th>
                )}

                <th className="py-3 px-4 text-center w-40">Quyền XÓA Dữ Liệu</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((item) => {
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Menu Name & Description */}
                    <td className="py-3 px-4 align-top">
                      <div className="space-y-1">
                        <strong className="text-slate-900 block font-bold text-xs">
                          {item.menuName}
                        </strong>
                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded inline-block font-semibold">
                          {item.routePath}
                        </span>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </td>

                    {/* Admin Permission Select Box */}
                    {(activeRoleView === 'ALL' || activeRoleView === 'ADMIN') && (
                      <td className="py-3 px-4 align-middle bg-purple-50/20">
                        <div className="space-y-1.5">
                          <select
                            value={item.adminPermission}
                            onChange={(e) =>
                              handlePermissionChange(item.id, 'admin', e.target.value as PermissionLevel)
                            }
                            className={`w-full p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              item.adminPermission === 'FULL_WITH_DELETE'
                                ? 'bg-purple-100 text-purple-900 border-purple-300 focus:border-purple-600'
                                : item.adminPermission === 'MANAGE_NO_DELETE'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : item.adminPermission === 'VIEW_ONLY'
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="FULL_WITH_DELETE">
                              ✓ Toàn quyền (Xem, Thêm, Sửa, XÓA)
                            </option>
                            <option value="MANAGE_NO_DELETE">
                              • Quản lý (Xem, Thêm, Sửa - KHÔNG XÓA)
                            </option>
                            <option value="VIEW_ONLY">👁 Chỉ xem dữ liệu (View Only)</option>
                            <option value="NO_ACCESS">⛔ Không có quyền truy cập</option>
                          </select>

                          <div className="flex items-center gap-1 text-[10px] text-purple-800 font-semibold">
                            <Check className="w-3 h-3 text-purple-600" />
                            <span>Có quyền XÓA và cấu hình toàn bộ</span>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Manager Permission Select Box */}
                    {(activeRoleView === 'ALL' || activeRoleView === 'MANAGER') && (
                      <td className="py-3 px-4 align-middle bg-emerald-50/20">
                        <div className="space-y-1.5">
                          <select
                            value={item.managerPermission}
                            onChange={(e) =>
                              handlePermissionChange(item.id, 'manager', e.target.value as PermissionLevel)
                            }
                            className={`w-full p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              item.managerPermission === 'MANAGE_NO_DELETE'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 focus:border-emerald-600'
                                : item.managerPermission === 'FULL_WITH_DELETE'
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : item.managerPermission === 'VIEW_ONLY'
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="MANAGE_NO_DELETE">
                              • Quản lý (Xem, Thêm, Sửa - KHÔNG XÓA)
                            </option>
                            <option value="FULL_WITH_DELETE">
                              ✓ Toàn quyền (Xem, Thêm, Sửa, XÓA)
                            </option>
                            <option value="VIEW_ONLY">👁 Chỉ xem dữ liệu (View Only)</option>
                            <option value="NO_ACCESS">⛔ Không có quyền truy cập</option>
                          </select>

                          <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Quyền điều hành như Admin · Không được XÓA</span>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Driver Permission Select Box */}
                    {(activeRoleView === 'ALL' || activeRoleView === 'DRIVER') && (
                      <td className="py-3 px-4 align-middle bg-amber-50/20">
                        <div className="space-y-1.5">
                          <select
                            value={item.driverPermission}
                            onChange={(e) =>
                              handlePermissionChange(item.id, 'driver', e.target.value as PermissionLevel)
                            }
                            className={`w-full p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              item.driverPermission === 'MOBILE_APP_ONLY'
                                ? 'bg-amber-100 text-amber-900 border-amber-300 focus:border-amber-600'
                                : item.driverPermission === 'NO_ACCESS'
                                ? 'bg-slate-100 text-slate-600 border-slate-300'
                                : 'bg-sky-100 text-sky-900 border-sky-300'
                            }`}
                          >
                            <option value="NO_ACCESS">
                              ⛔ Chặn truy cập Web (Không vào Web)
                            </option>
                            <option value="MOBILE_APP_ONLY">
                              📱 Thao tác trên App Mobile Lái xe
                            </option>
                            <option value="VIEW_ONLY">👁 Chỉ xem thông tin cá nhân</option>
                          </select>

                          <div className="flex items-center gap-1 text-[10px] text-amber-800 font-semibold">
                            <Smartphone className="w-3 h-3 text-amber-600" />
                            <span>
                              {item.driverPermission === 'MOBILE_APP_ONLY'
                                ? 'Tài xế thực hiện qua Smartphone'
                                : 'Chặn tuyệt đối trên Cổng Web'}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Delete Permission Status Comparison */}
                    <td className="py-3 px-4 text-center align-middle">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          <Trash2 className="w-2.5 h-2.5" /> Admin: Được XÓA
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <XCircle className="w-2.5 h-2.5 text-amber-600" /> Quản lý: CẤM XÓA
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Notice */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Mọi thay đổi trên Select Box sẽ áp dụng ngay vào phiên làm việc sau khi bấm nút <b>Lưu Ma Trận Quyền</b>.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleResetDefault}>
              Khôi phục mặc định
            </Button>
            <Button variant="primary" size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={handleSave}>
              Lưu phân quyền
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
