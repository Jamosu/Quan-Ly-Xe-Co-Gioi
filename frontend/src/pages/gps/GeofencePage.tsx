import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Shield,
  Plus,
  Zap,
  MapPin,
  Building2,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';

interface GeofenceItem {
  id: string;
  zoneCode: string;
  zoneName: string;
  subLocation: string;
  zoneType: string;
  areaHa: string;
  alertRule: string;
  speedLimit: string;
  activeVehicles: string;
  status: 'active' | 'strict_control' | 'sos_danger';
  statusLabel: string;
}

export const GeofencePage: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<GeofenceItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [geofenceList, setGeofenceList] = useState<GeofenceItem[]>([]);

  const columns: Column<GeofenceItem>[] = [
    {
      key: 'zoneCode',
      title: 'MÃ VÙNG',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.zoneCode}</strong>,
    },
    {
      key: 'zoneName',
      title: 'TÊN VÙNG GEOFENCE',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.zoneName}</span>
          <span className="text-[10px] text-slate-500">{row.subLocation}</span>
        </div>
      ),
    },
    { key: 'zoneType', title: 'LOẠI VÙNG', render: (row) => <Badge variant="blue">{row.zoneType}</Badge> },
    { key: 'areaHa', title: 'DIỆN TÍCH (HA)', sortable: true, render: (row) => <strong className="text-slate-800 text-xs">{row.areaHa}</strong> },
    { key: 'alertRule', title: 'QUY TẮC CẢNH BÁO', render: (row) => <span className="text-xs text-slate-700">{row.alertRule}</span> },
    { key: 'speedLimit', title: 'GIỚI HẠN TỐC ĐỘ', render: (row) => <span className="font-bold text-rose-600 text-xs">{row.speedLimit}</span> },
    { key: 'activeVehicles', title: 'XE TRONG VÙNG', render: (row) => <strong className="text-emerald-700 text-xs">{row.activeVehicles}</strong> },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => {
        if (row.status === 'active') return <Badge variant="green">{row.statusLabel}</Badge>;
        return <Badge variant="red" dot>{row.statusLabel}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Quản lý Vùng giám sát (Geofence)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập các ranh giới ảo theo lô/thửa, nông trường, xưởng packhouse và khu vực cấm ban đêm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Vẽ vùng Geofence mới
          </Button>
          <Button variant="primary" size="md" icon={<Zap className="w-4 h-4" />}>
            Lưu quy tắc an toàn
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Trạng thái: Đang hiệu lực (24 vùng)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng vùng thiết lập"
          value={`${geofenceList.length} vùng`}
          subValue="Đang hoạt động"
          icon={<Shield className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Vùng sản xuất nông trường"
          value={`${geofenceList.filter((g) => g.zoneType.toLowerCase().includes('nông nghiệp') || g.zoneType.toLowerCase().includes('sản xuất')).length} vùng`}
          subValue="Tốc độ theo định mức"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Vùng cơ sở & Packhouse"
          value={`${geofenceList.filter((g) => g.zoneType.toLowerCase().includes('packhouse') || g.zoneType.toLowerCase().includes('xưởng')).length} vùng`}
          subValue="Tốc độ giới hạn thấp"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Vùng cấm an toàn / SOS"
          value={`${geofenceList.filter((g) => g.status === 'sos_danger').length} vùng`}
          subValue="Cảnh báo khi lại gần"
          icon={<AlertOctagon className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Các Vùng Địa Lý Geofence Được Thiết Lập"
        subtitle="Hệ thống tự động kích hoạt cảnh báo khi phát hiện xe vi phạm tốc độ hoặc rời vùng chỉ định"
        columns={columns}
        data={geofenceList}
        onRowClick={(row) => setSelectedZone(row)}
      />

      {/* Detail Modal */}
      {selectedZone && (
        <Modal
          isOpen={!!selectedZone}
          onClose={() => setSelectedZone(null)}
          title={`Vùng Giám Sát: ${selectedZone.zoneName}`}
          subtitle={`Mã: ${selectedZone.zoneCode} | ${selectedZone.zoneType}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Diện tích bao phủ:</span> <b>{selectedZone.areaHa}</b></div>
              <div className="flex justify-between"><span>Giới hạn tốc độ:</span> <b className="text-rose-600 font-bold">{selectedZone.speedLimit}</b></div>
              <div className="flex justify-between"><span>Quy tắc an toàn:</span> <span>{selectedZone.alertRule}</span></div>
              <div className="flex justify-between"><span>Số xe đang hiện diện:</span> <strong className="text-primary">{selectedZone.activeVehicles}</strong></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedZone(null)}>
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
        title="Thiết Lập Vùng Giám Sát Geofence Mới"
        subtitle="Vẽ vùng đa giác (Polygon) hoặc định ranh giới lô canh tác"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên vùng giám sát:</label>
            <input type="text" placeholder="Ví dụ: Vùng Lô C4 - Xí Nghiệp Chuối 2" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Loại vùng:</label>
              <select className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50">
                <option>Sản xuất nông nghiệp</option>
                <option>Sơ chế & Trạm cân</option>
                <option>Kỹ thuật & Dịch vụ</option>
                <option>Kiểm soát an toàn PCCC</option>
                <option>Vùng cấm an toàn bờ kè</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tốc độ tối đa (km/h):</label>
              <input type="number" defaultValue="30" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold font-mono" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Quy tắc cảnh báo kích hoạt:</label>
            <input type="text" placeholder="Ví dụ: Cảnh báo khi xe cơ giới rời khỏi ranh giới quá 500m" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50" />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>Lưu Vùng Giám Sát</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
