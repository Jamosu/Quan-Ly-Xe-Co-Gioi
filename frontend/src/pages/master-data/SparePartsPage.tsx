import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Package,
  Plus,
  Download,
  Droplet,
  Filter,
  Wrench,
  CheckCircle2,
} from 'lucide-react';

interface SparePartRecord {
  id: string;
  partCodeERP: string;
  partName: string;
  category: string;
  manufacturer: string;
  unit: string;
  compatibleVehicle: string;
  unitPriceVND: string;
  status: 'active' | 'out_of_stock';
}

export const SparePartsPage: React.FC = () => {
  const [selectedPart, setSelectedPart] = useState<SparePartRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [partsList, setPartsList] = useState<SparePartRecord[]>([]);

  const columns: Column<SparePartRecord>[] = [
    {
      key: 'partCodeERP',
      title: 'MÃ VẬT TƯ (ERP)',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.partCodeERP}</strong>,
    },
    { key: 'partName', title: 'TÊN PHỤ TÙNG / QUY CÁCH', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.partName}</strong> },
    { key: 'category', title: 'NHÓM VẬT TƯ', render: (row) => <Badge variant="blue">{row.category}</Badge> },
    { key: 'manufacturer', title: 'HÃNG SẢN XUẤT', render: (row) => <span className="text-xs text-slate-700">{row.manufacturer}</span> },
    { key: 'unit', title: 'ĐƠN VỊ TÍNH', render: (row) => <span className="text-xs font-semibold text-slate-600">{row.unit}</span> },
    { key: 'compatibleVehicle', title: 'XE ÁP DỤNG CHÍNH', render: (row) => <span className="text-xs text-slate-800">{row.compatibleVehicle}</span> },
    {
      key: 'unitPriceVND',
      title: 'ĐƠN GIÁ (VNĐ)',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-bold text-xs">{row.unitPriceVND}</strong>,
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: () => <Badge variant="green">Đang dùng</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Danh mục Vật tư & Phụ tùng BTSC
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chuẩn hóa danh mục mã phụ tùng thay thế tiêu chuẩn, dầu nhớt bôi trơn và lốp xe theo quy chuẩn THACO AGRI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất bảng giá vật tư
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm phụ tùng
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tất cả 345 mã phụ tùng · Kho BTSC Trung tâm</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng mã phụ tùng"
          value={`${partsList.length} mã`}
          subValue="Chuẩn mã ERP SAP"
          icon={<Package className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Nhóm Dầu nhớt bôi trơn"
          value={`${partsList.filter((p) => p.category.toLowerCase().includes('dầu')).length} mã`}
          subValue="15W-40, Thủy lực 68, Mỡ"
          icon={<Droplet className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Nhóm Lọc & Gioăng phớt"
          value={`${partsList.filter((p) => p.category.toLowerCase().includes('lọc')).length} mã`}
          subValue="Donaldson, Kubota, Howo"
          icon={<Filter className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Nhóm Lốp xe & Cơ khí"
          value={`${partsList.filter((p) => p.category.toLowerCase().includes('lốp') || p.category.toLowerCase().includes('nông cụ')).length} mã`}
          subValue="Lốp, dao cắt, xích tải"
          icon={<Wrench className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Mục Vật Tư Phụ Tùng & Dầu Mỡ Phục Vụ Bảo Dưỡng Sửa Chữa"
        subtitle="Chuẩn hóa theo mã định danh vật tư ERP SAP THACO AGRI"
        columns={columns}
        data={partsList}
        onRowClick={(row) => setSelectedPart(row)}
      />

      {/* Detail Modal */}
      {selectedPart && (
        <Modal
          isOpen={!!selectedPart}
          onClose={() => setSelectedPart(null)}
          title={`Phụ Tùng: ${selectedPart.partName}`}
          subtitle={`Mã ERP: ${selectedPart.partCodeERP} | ${selectedPart.category}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Hãng sản xuất:</span> <b>{selectedPart.manufacturer}</b></div>
              <div className="flex justify-between"><span>Đơn giá tham chiếu:</span> <strong className="text-emerald-700 text-sm">{selectedPart.unitPriceVND} / {selectedPart.unit}</strong></div>
              <div className="flex justify-between"><span>Tương thích xe:</span> <span>{selectedPart.compatibleVehicle}</span></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedPart(null)}>
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
        title="Thêm Mã Phụ Tùng / Vật Tư Mới"
        subtitle="Khai báo quy cách vật tư mới vào danh mục kho BTSC"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên phụ tùng / Quy cách:</label>
            <input type="text" placeholder="Ví dụ: Bầu lọc gió sơ cấp máy cày Kubota" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nhóm vật tư:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Lọc & Lõi lọc</option>
                <option>Dầu nhờn bôi trơn</option>
                <option>Dầu thủy lực</option>
                <option>Lốp & Săm yếm</option>
                <option>Phụ tùng nông cụ</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn giá tham chiếu (VNĐ):</label>
              <input type="text" placeholder="Ví dụ: 350.000" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold font-mono" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Vật Tư</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
