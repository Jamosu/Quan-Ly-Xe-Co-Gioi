import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface UnresolvedAlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  severityText: string;
  timeStr: string;
  timeAgo: string;
  vehicleCode: string;
  driverName: string;
  alertType: string;
  detailSpecs: string;
  location: string;
  actionText: string;
  actionVariant: 'primary' | 'outline';
}

export const UnresolvedAlertsPage: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<UnresolvedAlertItem | null>(null);
  const [alertsList, setAlertsList] = useState<UnresolvedAlertItem[]>([]);

  const columns: Column<UnresolvedAlertItem>[] = [
    {
      key: 'severity',
      title: 'MỨC ĐỘ',
      render: (row) => {
        if (row.severity === 'critical') return <Badge variant="red" dot>{row.severityText}</Badge>;
        if (row.severity === 'warning') return <Badge variant="amber" dot>{row.severityText}</Badge>;
        return <Badge variant="blue">{row.severityText}</Badge>;
      },
    },
    {
      key: 'timeStr',
      title: 'THỜI GIAN',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.timeStr}</span>
          <span className="text-[10px] text-slate-400">{row.timeAgo}</span>
        </div>
      ),
    },
    {
      key: 'vehicleCode',
      title: 'PHƯƠNG TIỆN & LÁI XE',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-primary font-bold block">{row.vehicleCode}</strong>
          <span className="text-[10px] text-slate-500">{row.driverName}</span>
        </div>
      ),
    },
    {
      key: 'alertType',
      title: 'LOẠI CẢNH BÁO',
      render: (row) => <span className="font-extrabold text-slate-900 text-xs">{row.alertType}</span>,
    },
    {
      key: 'detailSpecs',
      title: 'CHI TIẾT THÔNG SỐ',
      render: (row) => (
        <span className={`text-xs ${row.severity === 'critical' ? 'font-bold text-rose-600' : 'text-slate-700'}`}>
          {row.detailSpecs}
        </span>
      ),
    },
    { key: 'location', title: 'VỊ TRÍ PHÁT SINH', render: (row) => <span className="text-xs text-slate-600">📍 {row.location}</span> },
    {
      key: 'actionText',
      title: 'HÀNH ĐỘNG TRỰC TIẾP TRÊN WEB',
      render: (row) => (
        <Button
          variant={row.actionVariant}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAlert(row);
          }}
        >
          {row.actionText}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Bảng cảnh báo chưa xử lý (SOS Web)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hiển thị trực tiếp trên giao diện Web theo 3 mức độ ưu tiên: Khẩn cấp (Đỏ) - Cảnh báo (Vàng) - Nhắc nhở (Xanh).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất danh sách
          </Button>
          <Button variant="primary" size="md" icon={<CheckCircle2 className="w-4 h-4" />}>
            Xác nhận tất cả
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Trạng thái: Đang chờ (18 sự kiện)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Cảnh báo Khẩn cấp (Đỏ)"
          value={`${alertsList.filter((a) => a.severity === 'critical').length} sự kiện`}
          subValue="Sụt dầu, SOS, Quá tốc"
          icon={<AlertOctagon className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Cảnh báo Quan trọng (Vàng)"
          value={`${alertsList.filter((a) => a.severity === 'warning').length} sự kiện`}
          subValue="Geofence, Gần hạn BTSC"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Nhắc nhở Vận hành (Xanh)"
          value={`${alertsList.filter((a) => a.severity === 'info').length} sự kiện`}
          subValue="Nổ máy tại chỗ"
          icon={<Info className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tổng cảnh báo đang mở"
          value={`${alertsList.length} sự kiện`}
          subValue="Cần xử lý kịp thời"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Sự Kiện Cảnh Báo Trực Tiếp Trên Web"
        subtitle="Hệ thống phát chuông cảnh báo SOS và cập nhật theo thời gian thực mỗi 10 giây"
        columns={columns}
        data={alertsList}
        onRowClick={(row) => setSelectedAlert(row)}
      />

      {/* Detail Modal */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Xử Lý Cảnh Báo: ${selectedAlert.alertType}`}
          subtitle={`Xe: ${selectedAlert.vehicleCode} | Lái xe: ${selectedAlert.driverName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Thời gian phát sinh:</span> <b>{selectedAlert.timeStr} ({selectedAlert.timeAgo})</b></div>
              <div className="flex justify-between"><span>Thông số ghi nhận:</span> <b className="text-rose-600 font-bold">{selectedAlert.detailSpecs}</b></div>
              <div className="flex justify-between"><span>Vị trí bản đồ:</span> <span>{selectedAlert.location}</span></div>
              <div className="flex justify-between"><span>Mức độ ưu tiên:</span> <b>{selectedAlert.severityText}</b></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>
                Đóng
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedAlert(null)}>
                Xác Nhận Đã Xử Lý
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
