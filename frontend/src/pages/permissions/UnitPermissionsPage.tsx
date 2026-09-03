import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Building2,
  Save,
  RotateCcw,
  MapPin,
  Fuel,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface ScopeTierConfig {
  id: string;
  tierName: string;
  targetUser: string;
  targetNote: string;
  klhScope: string;
  klhNote: string;
  unitScope: string;
  unitNote: string;
  fleetScope: string;
  fleetNote: string;
  readOnlyScope: string;
  readOnlyNote: string;
}

const MOCK_SCOPE_TIERS: ScopeTierConfig[] = [
  {
    id: 'TIER-KLH',
    tierName: 'Phân quyền KLH',
    targetUser: 'vinh.tranquang (Trần Quang Vinh - Giám đốc Vận hành KLH)',
    targetNote: 'Mã nhân sự: NV-BGD-001.',
    klhScope: 'Khu Liên Hợp Koun Mom (Campuchia)',
    klhNote: 'Toàn quyền điều hành mọi đơn vị trong phạm vi KLH.',
    unitScope: 'Tất cả 4 Xí nghiệp thành viên + Xưởng BTSC + Kho Nhiên liệu',
    unitNote: 'XN Chuối 1, XN Chuối 2, XN Cây ăn trái, Ban Thủy lợi.',
    fleetScope: 'Toàn bộ 128 xe cơ giới đăng ký tại KLH Koun Mom',
    fleetNote: 'Có quyền điều chuyển tạm thời xe giữa các xí nghiệp.',
    readOnlyScope: 'Được xem dữ liệu benchmark của KLH Snuol và KLH Ia Puch',
    readOnlyNote: 'Dữ liệu đối soát phục vụ họp giao ban cấp Tập đoàn.',
  },
  {
    id: 'TIER-XN',
    tierName: 'Phân quyền Xí nghiệp',
    targetUser: 'hai.nguyenvan (Nguyễn Văn Hải - Quản đốc XN Chuối 1)',
    targetNote: 'Mã nhân sự: NV-QD-001.',
    klhScope: 'Khu Liên Hợp Koun Mom (Campuchia)',
    klhNote: 'Phạm vi cấp 1.',
    unitScope: 'Xí nghiệp Nông trường Chuối 1 (NT1)',
    unitNote: 'Được toàn quyền tạo Lệnh sản xuất, duyệt nghiệm thu diện tích cày bừa.',
    fleetScope: 'Đội Xe Cơ giới 1 (36 xe) + Đội Xe BVTV 1 (6 xe)',
    fleetNote: 'Các đội xe trực tiếp phục vụ Nông trường 1.',
    readOnlyScope: 'Chỉ đọc (Read-only) dữ liệu bản đồ toàn KLH để phối hợp tránh trùng lịch',
    readOnlyNote: 'Không thể duyệt lệnh cho Xí nghiệp Chuối 2 hoặc XN Cây ăn trái.',
  },
  {
    id: 'TIER-DX',
    tierName: 'Phân quyền Đội xe',
    targetUser: 'minh.nguyenvan (Nguyễn Văn Minh - Tổ trưởng Đội Cơ giới 1)',
    targetNote: 'Mã nhân sự: NV-0824.',
    klhScope: 'Khu Liên Hợp Koun Mom (Campuchia)',
    klhNote: 'Trực thuộc Nông trường Chuối 1.',
    unitScope: 'Đội Xe Cơ giới 1',
    unitNote: 'Quản lý trực tiếp danh sách 24 lái máy cày và 36 đầu xe cày bừa.',
    fleetScope: '36 xe cày bừa John Deere & Kubota của Đội 1',
    fleetNote: 'Nhận lệnh từ Quản đốc và phân công ca máy cụ thể.',
    readOnlyScope: 'Chỉ xem lịch làm việc của Đội Xe Cơ giới 2 để hỗ trợ khi cần',
    readOnlyNote: 'Không có quyền sửa đổi thông tin đội bạn.',
  },
  {
    id: 'TIER-LT',
    tierName: 'Phân quyền Lô thửa',
    targetUser: 'long.nguyenthanh (Nguyễn Thành Long - Giám sát Lô Phân khu A)',
    targetNote: 'Mã nhân sự: NV-GS-012.',
    klhScope: 'Khu Liên Hợp Koun Mom (Campuchia)',
    klhNote: 'Phạm vi phân khu A nông trường.',
    unitScope: 'Khu vực Lô Chuối A01 đến A42',
    unitNote: 'Giám sát chất lượng làm đất và ranh giới Geofence từng lô.',
    fleetScope: 'Các phương tiện được phân công vào làm việc tại Phân khu A',
    fleetNote: 'Theo dõi vết di chuyển GPS và tốc độ trong khu vực bờ lô.',
    readOnlyScope: 'Xem tổng quan bản đồ các phân khu lân cận',
    readOnlyNote: 'Phục vụ công tác phối hợp thủy lợi và đường hào ngăn cháy.',
  },
];

export const UnitPermissionsPage: React.FC = () => {
  const [activeTierIndex, setActiveTierIndex] = useState(1); // default: Phân quyền Xí nghiệp
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentTier = MOCK_SCOPE_TIERS[activeTierIndex];

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
            Phân quyền dữ liệu theo Đơn vị
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập nguyên tắc độc lập dữ liệu theo BRD: Mỗi xí nghiệp chỉ xem và thao tác dữ liệu đội xe của đơn vị mình.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<RotateCcw className="w-4 h-4" />}>
            Khôi phục mặc định
          </Button>
          <Button variant="primary" size="md" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Lưu phân quyền đơn vị
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Chọn tài khoản: hai.nguyenvan (Quản đốc XN Chuối 1) · Đang hiệu lực</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Đơn vị được phân quyền"
          value="Xí nghiệp Chuối 1"
          subValue="Toàn quyền quản lý 46 xe"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
          trend={{ value: "46 xe", isUp: true }}
        />
        <StatCard
          label="Lô thửa được giám sát"
          value="84 Lô canh tác"
          subValue="Phân khu A & B"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Trạm nhiên liệu được duyệt"
          value="Cột bơm T1 & Bồn NT1"
          subValue="Duyệt cấp dầu máy cày"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Quyền xem đơn vị khác"
          value="Chỉ xem tổng quan"
          subValue="Không can thiệp lệnh xe"
          icon={<Eye className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Settings Grid Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Left Navigation Tiers List */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1 md:col-span-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase px-3 py-2">
            Cấp Phân Quyền Dữ Liệu
          </div>
          {MOCK_SCOPE_TIERS.map((tier, idx) => (
            <button
              key={tier.id}
              onClick={() => setActiveTierIndex(idx)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-between ${
                activeTierIndex === idx
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{tier.tierName}</span>
              {activeTierIndex === idx && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          ))}
        </div>

        {/* Right Settings Configuration Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-3">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">
              Phân quyền phạm vi dữ liệu cho [{currentTier.tierName}]
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chỉ định danh mục xí nghiệp, đội xe và lô thửa mà tài khoản được quyền thao tác trực tiếp.
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tài khoản cán bộ</label>
              <input
                type="text"
                defaultValue={currentTier.targetUser}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentTier.targetNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Khu Liên Hợp trực thuộc</label>
              <input
                type="text"
                defaultValue={currentTier.klhScope}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentTier.klhNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Xí nghiệp được phân công phụ trách chính</label>
              <input
                type="text"
                defaultValue={currentTier.unitScope}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentTier.unitNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Đội xe cơ giới được quyền điều động</label>
              <input
                type="text"
                defaultValue={currentTier.fleetScope}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentTier.fleetNote}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Giới hạn xem dữ liệu ngoài phạm vi</label>
              <input
                type="text"
                defaultValue={currentTier.readOnlyScope}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white transition-colors"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {currentTier.readOnlyNote}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình phạm vi dữ liệu thành công!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Lưu ý: Thiết lập phân quyền dữ liệu tuân thủ nguyên tắc độc lập giữa các nông trường theo BRD.
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
