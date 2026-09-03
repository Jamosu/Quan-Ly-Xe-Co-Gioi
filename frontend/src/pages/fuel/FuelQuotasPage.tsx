import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Fuel,
  Plus,
  Download,
  Tractor,
  Truck,
  Gauge,
  Sliders,
} from 'lucide-react';

interface FuelQuotaStandard {
  id: string;
  quotaCode: string;
  vehicleCategory: string;
  appliedTask: string;
  unit: string;
  standardQuota: string;
  tolerance: string;
  conditionNotes: string;
  status: 'active' | 'reviewing';
}

export const FuelQuotasPage: React.FC = () => {
  const [selectedQuota, setSelectedQuota] = useState<FuelQuotaStandard | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quotasList, setQuotasList] = useState<FuelQuotaStandard[]>([]);

  const columns: Column<FuelQuotaStandard>[] = [
    {
      key: 'quotaCode',
      title: 'MÃ ĐỊNH MỨC',
      sortable: true,
      render: (row) => <strong className="text-primary font-bold">{row.quotaCode}</strong>,
    },
    { key: 'vehicleCategory', title: 'CHỦNG LOẠI PHƯƠNG TIỆN', sortable: true, render: (row) => <span className="font-semibold text-slate-900 text-xs">{row.vehicleCategory}</span> },
    { key: 'appliedTask', title: 'CÔNG VIỆC ÁP DỤNG', render: (row) => <span className="text-xs text-slate-700">{row.appliedTask}</span> },
    { key: 'unit', title: 'ĐƠN VỊ TÍNH', render: (row) => <Badge variant="blue">{row.unit}</Badge> },
    {
      key: 'standardQuota',
      title: 'ĐỊNH MỨC TIÊU CHUẨN',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-bold text-sm">{row.standardQuota}</strong>,
    },
    { key: 'tolerance', title: 'DUNG SAI CHO PHÉP', render: (row) => <span className="font-semibold text-slate-800 text-xs">{row.tolerance}</span> },
    { key: 'conditionNotes', title: 'GHI CHÚ ĐIỀU KIỆN', render: (row) => <span className="text-xs text-slate-500">{row.conditionNotes}</span> },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: () => <Badge variant="green">Đang áp dụng</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Định mức tiêu hao theo loại xe & tuyến đường
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảng quy định định mức tiêu chuẩn nhiên liệu khoán cho từng loại máy móc theo giờ nổ máy, diện tích canh tác và km đường.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất quyết định định mức
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Điều chỉnh định mức
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đã duyệt bởi HĐ Kỹ thuật</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng định mức ban hành"
          value={`${quotasList.length} định mức`}
          subValue="Đã phê duyệt"
          icon={<Sliders className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Định mức máy kéo (L/ha)"
          value={`${quotasList.filter((q) => q.unit.toLowerCase().includes('ha')).length} định mức`}
          subValue="Theo diện tích canh tác"
          icon={<Tractor className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Định mức xe tải (L/100km)"
          value={`${quotasList.filter((q) => q.unit.toLowerCase().includes('100')).length} định mức`}
          subValue="Theo cung đường vận chuyển"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Định mức giờ máy (L/h)"
          value={`${quotasList.filter((q) => q.unit.toLowerCase().includes('giờ')).length} định mức`}
          subValue="Theo thời gian nổ máy"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Bảng Tiêu Chuẩn Định Mức Nhiên Liệu Khoán (Năm 2026)"
        subtitle="Căn cứ pháp lý để hệ thống tự động đối chiếu số km GPS và que đo siêu âm DUT-E"
        columns={columns}
        data={quotasList}
        onRowClick={(row) => setSelectedQuota(row)}
      />

      {/* Detail Modal */}
      {selectedQuota && (
        <Modal
          isOpen={!!selectedQuota}
          onClose={() => setSelectedQuota(null)}
          title={`Định Mức: ${selectedQuota.quotaCode}`}
          subtitle={`${selectedQuota.vehicleCategory}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Công việc áp dụng:</span> <b>{selectedQuota.appliedTask}</b></div>
              <div className="flex justify-between"><span>Định mức chuẩn:</span> <strong className="text-emerald-700 text-base">{selectedQuota.standardQuota}</strong></div>
              <div className="flex justify-between"><span>Dung sai cho phép:</span> <b>{selectedQuota.tolerance}</b></div>
              <div className="flex justify-between"><span>Điều kiện canh tác:</span> <span>{selectedQuota.conditionNotes}</span></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedQuota(null)}>
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
        title="Điều Chỉnh Định Mức Nhiên Liệu Mới"
        subtitle="Thiết lập chỉ số tiêu chuẩn nhiên liệu khoán cho nhóm xe"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Chủng loại phương tiện:</label>
            <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
              <option>Máy kéo John Deere 6140B (140HP)</option>
              <option>Máy kéo Kubota M7040 (70HP)</option>
              <option>Xe tải Howo 4 chân 371HP</option>
              <option>Xe téc Hino 15m3</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Định mức tiêu chuẩn:</label>
              <input type="text" placeholder="Ví dụ: 18.5" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn vị tính:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Lít / Ha</option>
                <option>Lít / 100 km</option>
                <option>Lít / Giờ máy</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Điều kiện canh tác & ghi chú:</label>
            <input type="text" placeholder="Ví dụ: Đất thịt nhẹ, độ ẩm 18-22%" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50" />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu & Trình Duyệt</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
