import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Navigation,
  Download,
  Search,
  Gauge,
  MapPin,
  TrendingUp,
} from 'lucide-react';

interface TripViolationReportRow {
  id: string;
  plateNumber: string;
  vehicleCode: string;
  vehicleType: string;
  driverName: string;
  totalKm: string;
  loadedKm: string;
  engineHours: string;
  speedViolations: string;
  speedNotice?: string;
  geofenceViolations: string;
}

export const TripViolationReportPage: React.FC = () => {
  const [selectedRow, setSelectedRow] = useState<TripViolationReportRow | null>(null);
  const [reportList, setReportList] = useState<TripViolationReportRow[]>([]);

  const columns: Column<TripViolationReportRow>[] = [
    {
      key: 'plateNumber',
      title: 'MÃ XE / BIỂN SỐ',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-primary font-bold block text-xs">{row.plateNumber}</strong>
          <span className="text-[10px] text-slate-500 font-mono">{row.vehicleCode}</span>
        </div>
      ),
    },
    { key: 'vehicleType', title: 'CHỦNG LOẠI XE', render: (row) => <span className="font-semibold text-slate-800 text-xs">{row.vehicleType}</span> },
    { key: 'driverName', title: 'LÁI XE CHÍNH', render: (row) => <span className="font-medium text-slate-900 text-xs">{row.driverName}</span> },
    { key: 'totalKm', title: 'TỔNG KM', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.totalKm}</strong> },
    { key: 'loadedKm', title: 'KM CÓ TẢI', render: (row) => <span className="text-xs text-emerald-700 font-semibold">{row.loadedKm}</span> },
    { key: 'engineHours', title: 'GIỜ MÁY NỔ', render: (row) => <span className="text-xs text-slate-700">{row.engineHours}</span> },
    {
      key: 'speedViolations',
      title: 'VI PHẠM TỐC ĐỘ',
      render: (row) => (
        <div>
          <b className={`text-xs ${row.speedViolations !== '0 lần' ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
            {row.speedViolations}
          </b>
          {row.speedNotice && <span className="text-[10px] text-rose-600 block">({row.speedNotice})</span>}
        </div>
      ),
    },
    {
      key: 'geofenceViolations',
      title: 'VI PHẠM GEOFENCE',
      render: (row) => (
        <b className={`text-xs ${row.geofenceViolations !== '0 lần' ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
          {row.geofenceViolations}
        </b>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Báo cáo Hành trình & Vi phạm GPS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê tổng quãng đường di chuyển (km), số lần chạy quá tốc độ, ra ngoài vùng Geofence và dừng bất thường.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất Excel
          </Button>
          <Button variant="primary" size="md" icon={<Search className="w-4 h-4" />}>
            Lọc theo phương tiện
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tháng 08/2026 · Nhóm: Xe tải & Xe khách</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng phương tiện theo dõi"
          value={`${reportList.length} xe`}
          subValue="Đã có dữ liệu GPS"
          icon={<Navigation className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Xe chạy tải an toàn"
          value={`${reportList.filter((r) => r.speedViolations === '0 lần').length} xe`}
          subValue="Không vi phạm tốc độ"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Xe có vi phạm tốc độ"
          value={`${reportList.filter((r) => r.speedViolations !== '0 lần').length} xe`}
          subValue="Cần kiểm tra nhắc nhở"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Xe có vi phạm Geofence"
          value={`${reportList.filter((r) => r.geofenceViolations !== '0 lần').length} xe`}
          subValue="Lệch tuyến / ra khỏi vùng"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Hiệu Suất Chạy Tải Toàn Đoàn Xe
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu phân tích trạng thái chở hàng (Có tải vs Không tải) qua cảm biến thùng xe
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Chạy có hàng (Có tải)</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400" /> Chạy quay đầu (Không tải)</div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Hành Trình & Vi Phạm Từng Đầu Xe"
        subtitle="Hiển thị quãng đường vận hành, tỷ lệ chở tải và lịch sử vi phạm tốc độ/ranh giới vùng"
        columns={columns}
        data={reportList}
        onRowClick={(row) => setSelectedRow(row)}
      />

      {/* Detail Modal */}
      {selectedRow && (
        <Modal
          isOpen={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          title={`Hành Trình: ${selectedRow.plateNumber}`}
          subtitle={`${selectedRow.vehicleType} | Lái xe: ${selectedRow.driverName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Tổng quãng đường:</span> <b className="text-primary">{selectedRow.totalKm}</b></div>
              <div className="flex justify-between"><span>Quãng đường có tải:</span> <b>{selectedRow.loadedKm}</b></div>
              <div className="flex justify-between"><span>Tổng giờ nổ máy:</span> <span>{selectedRow.engineHours}</span></div>
              <div className="flex justify-between"><span>Vi phạm tốc độ:</span> <b className="text-amber-600">{selectedRow.speedViolations}</b></div>
              <div className="flex justify-between"><span>Vi phạm rời vùng:</span> <b className="text-rose-600">{selectedRow.geofenceViolations}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedRow(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
