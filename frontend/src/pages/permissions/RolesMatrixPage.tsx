import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Shield,
  Save,
  RotateCcw,
  Fuel,
  BellRing,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

interface RoleConfig {
  id: string;
  roleName: string;
  groupTitle: string;
  groupNote: string;
  dispatchRights: string;
  dispatchNote: string;
  fuelRights: string;
  fuelNote: string;
  alertRights: string;
  alertNote: string;
  exportRights: string;
  exportNote: string;
}

const MOCK_ROLES_CONFIG: RoleConfig[] = [
  {
    id: 'ROLE-ADMIN',
    roleName: 'Quản trị viên (Admin)',
    groupTitle: 'Quản trị viên Hệ thống (Super Admin)',
    groupNote: 'Toàn quyền cấu hình người dùng, danh mục, phân quyền và giám sát hệ thống.',
    dispatchRights: 'Toàn quyền tạo, duyệt, hủy và can thiệp mọi lệnh điều động xe toàn tập đoàn',
    dispatchNote: 'Bao gồm quyền cấu hình bypass quy trình khi có chỉ đạo khẩn từ Lãnh đạo.',
    fuelRights: 'Toàn quyền xem, điều chỉnh định mức và xem báo cáo nhiên liệu toàn bộ các KLH',
    fuelNote: 'Ghi log Audit Trail toàn bộ các thay đổi định mức.',
    alertRights: 'Tiếp nhận và xử lý toàn bộ các cảnh báo mức Đỏ, Vàng, Xanh trên toàn hệ thống',
    alertNote: 'Có quyền cấu hình lại ngưỡng kích hoạt cảnh báo.',
    exportRights: 'Toàn quyền xuất tất cả báo cáo và sao lưu dữ liệu toàn hệ thống',
    exportNote: 'Chỉ định kỳ lưu trữ đám mây bảo mật.',
  },
  {
    id: 'ROLE-BGD',
    roleName: 'Ban Giám Đốc KLH',
    groupTitle: 'Ban Giám Đốc Khu Liên Hợp',
    groupNote: 'Xem toàn bộ dashboard điều hành, duyệt kế hoạch sản xuất tuần/tháng và các đề xuất vượt định mức.',
    dispatchRights: 'Xem toàn bộ lệnh điều xe của các xí nghiệp trực thuộc; phê duyệt lệnh điều xe công tác ngoại tỉnh',
    dispatchNote: 'Không trực tiếp lập lệnh vận hành hằng ngày.',
    fuelRights: 'Xem toàn bộ báo cáo đối soát nhiên liệu, ký duyệt thanh quyết toán tiền thưởng tiết kiệm dầu',
    fuelNote: 'Phê duyệt cấp bổ sung nhiên liệu ngoài kế hoạch.',
    alertRights: 'Nhận thông báo các cảnh báo nghiêm trọng (Mức Đỏ: Sụt dầu >15L, SOS tai nạn)',
    alertNote: 'Chỉ đạo trực tiếp các bộ phận xử lý hiện trường.',
    exportRights: 'Xuất toàn bộ báo cáo tổng hợp, báo cáo so sánh KLH dạng PDF/Excel',
    exportNote: 'Báo cáo hợp nhất phục vụ họp giao ban Tập đoàn.',
  },
  {
    id: 'ROLE-QD',
    roleName: 'Quản đốc Nông trường',
    groupTitle: 'Quản đốc Xí nghiệp Nông trường',
    groupNote: 'Nhóm chịu trách nhiệm trực tiếp điều hành sản xuất tại Nông trường 1 & 2.',
    dispatchRights: 'Được tạo kế hoạch tuần/ngày, tạo lệnh cày bừa, duyệt nghiệm thu khối lượng GPS',
    dispatchNote: 'Được phép điều chỉnh kế hoạch khi có mưa dông kèm lưu vết Audit.',
    fuelRights: 'Được xem báo cáo đối chiếu tiêu hao nhiên liệu của đội xe trực thuộc đơn vị',
    fuelNote: 'Không được duyệt phiếu xuất nhập kho bồn xăng dầu trung tâm.',
    alertRights: 'Tiếp nhận cảnh báo vi phạm tốc độ, cảnh báo ra khỏi Geofence của tài xế đơn vị',
    alertNote: 'Được quyền xác nhận giải trình và đóng cảnh báo hợp lệ.',
    exportRights: 'Được xuất file Excel báo cáo sản xuất, năng suất ca máy theo lô thửa',
    exportNote: 'Không được xóa dữ liệu lịch sử hệ thống.',
  },
  {
    id: 'ROLE-DP',
    roleName: 'Điều phối viên Vận tải',
    groupTitle: 'Điều phối viên Trung tâm Vận tải & Logistics',
    groupNote: 'Phụ trách điều phối đội xe tải Howo, Hino, xe ben chở chuối và vật tư giữa Packhouse và nông trường.',
    dispatchRights: 'Lập Lệnh vận chuyển nội bộ (LVC), gán tài xế, chỉ định tuyến đường và packhouse đích',
    dispatchNote: 'Theo dõi tiến độ thực hiện chuyến xe trên bản đồ GPS realtime.',
    fuelRights: 'Xem báo cáo tiêu hao theo chuyến vận chuyển và số km lăn bánh thực tế',
    fuelNote: 'Đối chiếu phiếu cân điện tử với khối lượng chuyên chở.',
    alertRights: 'Xử lý các cảnh báo chạy sai tuyến đường, dừng đỗ lâu ngoài quy định và quá tốc độ',
    alertNote: 'Liên lạc trực tiếp bộ đàm / điện thoại với lái xe.',
    exportRights: 'Xuất bảng kê chuyến vận chuyển theo ngày/ca làm việc',
    exportNote: 'Chuyển kế toán logistics nghiệm thu.',
  },
  {
    id: 'ROLE-KT',
    roleName: 'Kế toán Nhiên liệu',
    groupTitle: 'Kế toán Nhiên liệu & Vật tư',
    groupNote: 'Kiểm soát số liệu xuất nhập tồn bồn chứa, đối chiếu cảm biến que đo với hóa đơn trạm cấp phát.',
    dispatchRights: 'Xem thông tin lệnh điều xe để đối chiếu định mức khoán ca máy/chuyến',
    dispatchNote: 'Không có quyền tạo hoặc chỉnh sửa lệnh điều xe.',
    fuelRights: 'Toàn quyền duyệt phiếu cấp dầu (PCD), lập bảng đối chiếu tiêu hao và tính tiền thưởng tiết kiệm',
    fuelNote: 'Khóa sổ số liệu nhiên liệu cuối tháng.',
    alertRights: 'Nhận thông báo tức thì các sự kiện sụt giảm dầu bất thường (>5 Lít)',
    alertNote: 'Yêu cầu lái xe và thợ máy ký biên bản giải trình.',
    exportRights: 'Xuất báo cáo tài chính tiêu hao nhiên liệu và chứng từ xuất kho ERP SAP',
    exportNote: 'Dữ liệu hạch toán giá thành nông sản.',
  },
  {
    id: 'ROLE-BTSC',
    roleName: 'Trưởng xưởng BTSC',
    groupTitle: 'Trưởng xưởng Bảo trì & Sửa chữa Cơ giới',
    groupNote: 'Quản lý tiếp nhận sự cố, lập phiếu giao việc BM02, theo dõi tiến độ sửa chữa và kho phụ tùng.',
    dispatchRights: 'Tạo Lệnh điều xe cứu hộ kỹ thuật, điều động thợ sửa lưu động ra hiện trường lô thửa',
    dispatchNote: 'Cập nhật trạng thái xe nằm xưởng vào hệ thống.',
    fuelRights: 'Xem lượng dầu cấp phát cho xe cứu hộ và máy nổ xưởng',
    fuelNote: 'Theo dõi dầu nhớt bôi trơn thay thế theo định kỳ BDC.',
    alertRights: 'Tiếp nhận cảnh báo SOS hỏng hóc, sự cố nhiệt độ động cơ cao và que đo dầu mất nguồn',
    alertNote: 'Điều phối tổ thợ máy xử lý trong vòng 15 phút.',
    exportRights: 'Xuất báo cáo chi phí sửa chữa, giờ công thợ máy và vòng quay phụ tùng',
    exportNote: 'Phục vụ thanh quyết toán chi phí BTSC.',
  },
];

export const RolesMatrixPage: React.FC = () => {
  const [activeRoleIndex, setActiveRoleIndex] = useState(2); // default: Quản đốc
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentRole = MOCK_ROLES_CONFIG[activeRoleIndex];

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Vai trò & Ma trận phân quyền (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình ma trận 6 nhóm quyền: Quản trị, Quản đốc, Điều phối, Lái xe, Kế toán, Xưởng; phân quyền báo cáo & cảnh báo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<RotateCcw className="w-4 h-4" />}>
            Khôi phục mặc định
          </Button>
          <Button variant="primary" size="md" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Lưu phân quyền
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Nhóm vai trò: 6 nhóm chuẩn (RBAC)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng nhóm vai trò"
          value="6 nhóm quyền"
          subValue="Admin, GĐ, QĐ, ĐP, KT, Xưởng"
          icon={<Shield className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
          trend={{ value: "RBAC Chuẩn", isUp: true }}
        />
        <StatCard
          label="Quyền xem báo cáo nhiên liệu"
          value="Phân cấp"
          subValue="Kế toán, Giám đốc, Quản đốc"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Quyền xử lý cảnh báo"
          value="Theo vai trò"
          subValue="Điều phối, Quản đốc, Trưởng xưởng"
          icon={<BellRing className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Quyền tạo lệnh điều xe"
          value="Chủ động"
          subValue="Theo kế hoạch phân bổ"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Settings Grid Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Left Navigation Roles List */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1 md:col-span-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase px-3 py-2">
            Danh Sách 6 Vai Trò Chuẩn
          </div>
          {MOCK_ROLES_CONFIG.map((role, idx) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleIndex(idx)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-between ${
                activeRoleIndex === idx
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{role.roleName}</span>
              {activeRoleIndex === idx && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          ))}
        </div>

        {/* Right Settings Configuration Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-3">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">
              Cấu hình ma trận quyền cho nhóm [{currentRole.roleName}]
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentRole.groupNote}
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tên nhóm quyền</label>
              <input
                type="text"
                defaultValue={currentRole.groupTitle}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentRole.groupNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Quyền lập kế hoạch & Lệnh sản xuất</label>
              <input
                type="text"
                defaultValue={currentRole.dispatchRights}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentRole.dispatchNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Quyền xem báo cáo nhiên liệu</label>
              <input
                type="text"
                defaultValue={currentRole.fuelRights}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentRole.fuelNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Quyền tiếp nhận & Xử lý cảnh báo</label>
              <input
                type="text"
                defaultValue={currentRole.alertRights}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentRole.alertNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Quyền xuất dữ liệu</label>
              <input
                type="text"
                defaultValue={currentRole.exportRights}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentRole.exportNote}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình phân quyền thành công!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Lưu ý: Thay đổi phân quyền sẽ có hiệu lực ngay trong phiên đăng nhập tiếp theo.
              </span>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {}}>
                Khôi phục mặc định
              </Button>
              <Button variant="primary" size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={handleSave}>
                Lưu cấu hình
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
