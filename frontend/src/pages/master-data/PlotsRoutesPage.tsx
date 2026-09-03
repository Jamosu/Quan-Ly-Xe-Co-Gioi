import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  MapPin,
  Plus,
  Download,
  Navigation,
  Gauge,
  Layers,
} from 'lucide-react';

interface PlotRouteDefinition {
  id: string;
  code: string;
  name: string;
  subLocation: string;
  unitOwner: string;
  areaOrLength: string;
  cropOrSurface: string;
  speedLimit: string;
  status: 'active' | 'in_progress';
  statusLabel: string;
}

export const PlotsRoutesPage: React.FC = () => {
  const [selectedPlot, setSelectedPlot] = useState<PlotRouteDefinition | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [plotsList, setPlotsList] = useState<PlotRouteDefinition[]>([]);

  const columns: Column<PlotRouteDefinition>[] = [
    {
      key: 'code',
      title: 'MÃ LÔ / TUYẾN',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.code}</strong>,
    },
    {
      key: 'name',
      title: 'TÊN LÔ THỬA / TUYẾN ĐƯỜNG',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 block text-xs">{row.name}</strong>
          <span className="text-[10px] text-slate-500">{row.subLocation}</span>
        </div>
      ),
    },
    { key: 'unitOwner', title: 'ĐƠN VỊ TRỰC THUỘC', render: (row) => <span className="text-xs text-slate-700">{row.unitOwner}</span> },
    { key: 'areaOrLength', title: 'DIỆN TÍCH / CHIỀU DÀI', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.areaOrLength}</strong> },
    { key: 'cropOrSurface', title: 'LOẠI CÂY / MẶT ĐƯỜNG', render: (row) => <span className="text-xs text-slate-700">{row.cropOrSurface}</span> },
    {
      key: 'speedLimit',
      title: 'TỐC ĐỘ GIỚI HẠN',
      render: (row) => (
        <span className={row.speedLimit !== '—' ? 'font-bold text-emerald-700 text-xs' : 'text-slate-400'}>
          {row.speedLimit}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => row.status === 'active' ? (
        <Badge variant="green">{row.statusLabel}</Badge>
      ) : (
        <Badge variant="amber">{row.statusLabel}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Danh mục Lô thửa & Tuyến đường
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý dữ liệu bản đồ GIS lô thửa nông trường và mạng lưới tuyến đường nội bộ quy định tốc độ cho phép.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất GIS/KML
          </Button>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Thêm lô/tuyến
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tất cả 186 Lô canh tác & 32 Tuyến đường (KLH Koun Mom)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng Lô thửa / Tuyến đường"
          value={`${plotsList.length} mục`}
          subValue="Đã quy hoạch"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Lô thửa nông nghiệp"
          value={`${plotsList.filter((p) => p.code.startsWith('LO')).length} lô`}
          subValue="Canh tác chuối & cây ăn trái"
          icon={<Navigation className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tuyến đường vận tải"
          value={`${plotsList.filter((p) => p.code.startsWith('TD')).length} tuyến`}
          subValue="Đường bê tông & cấp phối"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
        <StatCard
          label="Tỷ lệ đang canh tác"
          value={`${plotsList.length > 0 ? Math.round((plotsList.filter((p) => p.status === 'active').length / plotsList.length) * 100) : 100}%`}
          subValue="Đang hoạt động"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Mục Lô Thửa Nông Nghiệp & Tuyến Đường Vận Tải Nội Bộ"
        subtitle="Dữ liệu địa lý phục vụ thiết lập Geofence và định mức cung đường vận chuyển"
        columns={columns}
        data={plotsList}
        onRowClick={(row) => setSelectedPlot(row)}
      />

      {/* Detail Modal */}
      {selectedPlot && (
        <Modal
          isOpen={!!selectedPlot}
          onClose={() => setSelectedPlot(null)}
          title={`Lô Thửa / Tuyến: ${selectedPlot.name}`}
          subtitle={`Mã: ${selectedPlot.code} | Đơn vị: ${selectedPlot.unitOwner}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Quy mô:</span> <b className="text-primary">{selectedPlot.areaOrLength}</b></div>
              <div className="flex justify-between"><span>Cây trồng / Mặt đường:</span> <b>{selectedPlot.cropOrSurface}</b></div>
              <div className="flex justify-between"><span>Tốc độ giới hạn:</span> <b>{selectedPlot.speedLimit}</b></div>
              <div className="flex justify-between"><span>Trạng thái:</span> <Badge variant="green">{selectedPlot.statusLabel}</Badge></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedPlot(null)}>
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
        title="Thêm Lô Thửa / Tuyến Đường Mới"
        subtitle="Khai báo thông tin địa lý và thiết lập tốc độ lưu thông"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên lô thửa hoặc tuyến đường:</label>
            <input type="text" placeholder="Ví dụ: Lô Bắp Sinh Khối B14" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Diện tích / Chiều dài:</label>
              <input type="text" placeholder="Ví dụ: 30.5 ha" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tốc độ tối đa (km/h):</label>
              <input type="number" defaultValue="30" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold font-mono" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Dữ Liệu</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
