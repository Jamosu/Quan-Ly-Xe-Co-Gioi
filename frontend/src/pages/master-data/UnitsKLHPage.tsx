import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Building2,
  Plus,
  Download,
  Truck,
  MapPin,
  Users,
} from 'lucide-react';

interface UnitKLHRecord {
  id: string;
  unitCode: string;
  unitName: string;
  manageTier: string;
  locationArea: string;
  areaHa: string;
  assignedVehicles: string;
  headOfficer: string;
  headTitle: string;
  status: 'active';
}

export const UnitsKLHPage: React.FC = () => {
  const [selectedUnit, setSelectedUnit] = useState<UnitKLHRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [unitsList, setUnitsList] = useState<UnitKLHRecord[]>([]);

  const columns: Column<UnitKLHRecord>[] = [
    {
      key: 'unitCode',
      title: 'MÃ ĐƠN VỊ',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.unitCode}</strong>,
    },
    { key: 'unitName', title: 'TÊN ĐƠN VỊ / XÍ NGHIỆP', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.unitName}</strong> },
    { key: 'manageTier', title: 'CẤP QUẢN LÝ', render: (row) => <Badge variant="blue">{row.manageTier}</Badge> },
    { key: 'locationArea', title: 'ĐỊA BÀN HOẠT ĐỘNG', render: (row) => <span className="text-xs text-slate-700">{row.locationArea}</span> },
    { key: 'areaHa', title: 'DIỆN TÍCH (HA)', render: (row) => <strong className="text-slate-900 text-xs">{row.areaHa}</strong> },
    {
      key: 'assignedVehicles',
      title: 'SỐ XE PHÂN BỔ',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-extrabold text-xs">{row.assignedVehicles}</strong>,
    },
    {
      key: 'headOfficer',
      title: 'GIÁM ĐỐC / TRƯỞNG ĐƠN VỊ',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.headOfficer}</span>
          <span className="text-[10px] text-slate-500">{row.headTitle}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: () => <Badge variant="green">Đang hoạt động</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Danh mục Đơn vị / KLH / Đội xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu trúc tổ chức phân cấp từ Tập đoàn THACO AGRI → Khu Liên Hợp → Xí nghiệp → Đội xe cơ giới.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất sơ đồ
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm đơn vị
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Toàn bộ tập đoàn · KLH Koun Mom (Rattanakiri)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng đơn vị trực thuộc"
          value={`${unitsList.length} đơn vị`}
          subValue="Toàn tập đoàn"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Xí nghiệp thành viên"
          value={`${unitsList.filter((u) => u.manageTier.includes('Xí nghiệp')).length} Xí nghiệp`}
          subValue="Trồng trọt & Chăn nuôi"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Đội xe cơ giới"
          value={`${unitsList.filter((u) => u.manageTier.includes('Đội xe')).length} Đội xe`}
          subValue="Cơ giới, Vận tải, Thủy lợi"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Cơ cấu tổ chức"
          value="Chuẩn THACO"
          subValue="Mô hình phân cấp 3 tầng"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Cây Cơ Cấu Tổ Chức Khu Liên Hợp, Xí Nghiệp & Đội Xe Cơ Giới"
        subtitle="Mô hình phân cấp quản trị phục vụ phân quyền dữ liệu và phân bổ phương tiện"
        columns={columns}
        data={unitsList}
        onRowClick={(row) => setSelectedUnit(row)}
      />

      {/* Detail Modal */}
      {selectedUnit && (
        <Modal
          isOpen={!!selectedUnit}
          onClose={() => setSelectedUnit(null)}
          title={`Đơn Vị: ${selectedUnit.unitName}`}
          subtitle={`Mã: ${selectedUnit.unitCode} | ${selectedUnit.manageTier}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Địa bàn hoạt động:</span> <b>{selectedUnit.locationArea}</b></div>
              <div className="flex justify-between"><span>Quy mô quản lý:</span> <b>{selectedUnit.areaHa}</b></div>
              <div className="flex justify-between"><span>Số xe cơ giới được phân bổ:</span> <strong className="text-emerald-700 text-sm">{selectedUnit.assignedVehicles}</strong></div>
              <div className="flex justify-between"><span>Người đứng đầu:</span> <b className="text-primary">{selectedUnit.headOfficer} ({selectedUnit.headTitle})</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedUnit(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Đơn Vị / Xí Nghiệp Mới"
        subtitle="Khai báo đơn vị thành viên vào cơ cấu tổ chức THACO AGRI"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên đơn vị / Xí nghiệp:</label>
            <input type="text" placeholder="Ví dụ: Xí nghiệp Chăn nuôi Bò Thịt 1" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cấp quản lý:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Cấp 1 (Khu Liên Hợp)</option>
                <option>Cấp 2 (Xí nghiệp)</option>
                <option>Cấp 3 (Đội xe)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Lãnh đạo phụ trách:</label>
              <input type="text" placeholder="Ví dụ: Nguyễn Văn Hải" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Đơn Vị</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
