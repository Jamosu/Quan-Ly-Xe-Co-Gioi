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
  Download,
  CheckCircle2,
  DollarSign,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface FuelDropAlertItem {
  id: string;
  eventCode: string;
  occurredTime: string;
  vehicleCode: string;
  driverName: string;
  droppedLitersInfo: string;
  location: string;
  investigationResult: string;
  status: 'fixed' | 'penalized' | 'false_alert';
  statusLabel: string;
}

export const FuelDropAlertsPage: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<FuelDropAlertItem | null>(null);
  const [alertsList, setAlertsList] = useState<FuelDropAlertItem[]>([]);

  const columns: Column<FuelDropAlertItem>[] = [
    {
      key: 'eventCode',
      title: 'MÃ SỰ KIỆN',
      sortable: true,
      render: (row) => <strong className="text-rose-600 font-mono font-bold">{row.eventCode}</strong>,
    },
    { key: 'occurredTime', title: 'THỜI GIAN', sortable: true },
    { key: 'vehicleCode', title: 'XE PHÁT HIỆN', render: (row) => <strong className="text-slate-900">{row.vehicleCode}</strong> },
    { key: 'driverName', title: 'LÁI XE ĐIỀU KHIỂN', render: (row) => <span className="font-semibold text-slate-800">{row.driverName}</span> },
    {
      key: 'droppedLitersInfo',
      title: 'MỨC DẦU SỤT GIẢM',
      sortable: true,
      render: (row) => (
        <b className={`text-xs ${row.status === 'false_alert' ? 'text-amber-600' : 'text-rose-600 font-bold'}`}>
          {row.droppedLitersInfo}
        </b>
      ),
    },
    { key: 'location', title: 'VỊ TRÍ PHÁT SINH', render: (row) => <span className="text-xs text-slate-600">📍 {row.location}</span> },
    { key: 'investigationResult', title: 'KẾT LUẬN XÁC MINH', render: (row) => <span className="text-xs text-slate-800 font-medium">{row.investigationResult}</span> },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => {
        if (row.status === 'fixed') return <Badge variant="green">{row.statusLabel}</Badge>;
        if (row.status === 'penalized') return <Badge variant="red" dot>{row.statusLabel}</Badge>;
        return <Badge variant="gray">{row.statusLabel}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Cảnh báo Tiêu hao Bất thường & Rút dầu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phát hiện ngay khi mức dầu sụt giảm đột ngột (&gt;5 Lít/phút) nghi ngờ rút ruột trộm cắp hoặc bục rò rỉ ống dẫn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất biên bản sự cố
          </Button>
          <Button variant="primary" size="md" icon={<CheckCircle2 className="w-4 h-4" />}>
            Xác nhận kiểm tra
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Ngưỡng sụt: &gt; 5 Lít/phút</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Sự kiện sụt dầu bất thường"
          value={`${alertsList.length} vụ`}
          subValue="Được phát hiện từ cảm biến"
          icon={<AlertOctagon className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Đã khắc phục kỹ thuật"
          value={`${alertsList.filter((a) => a.status === 'fixed').length} vụ`}
          subValue="Xử lý rò rỉ / bục ống"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Xử phạt kỷ luật"
          value={`${alertsList.filter((a) => a.status === 'penalized').length} vụ`}
          subValue="Phát hiện gian lận"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Báo ảo (Đã hủy)"
          value={`${alertsList.filter((a) => a.status === 'false_alert').length} vụ`}
          subValue="Do địa hình rung lắc"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-600"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Cảnh Báo Sụt Giảm Nhiên Liệu Đột Ngột"
        subtitle="Hệ thống gửi cảnh báo ngay tức thì qua thông báo đẩy khi mức dầu sụt dốc thẳng đứng"
        columns={columns}
        data={alertsList}
        onRowClick={(row) => setSelectedAlert(row)}
      />

      {/* Detail Modal */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Chi Tiết Sự Cố: ${selectedAlert.eventCode}`}
          subtitle={`Xe: ${selectedAlert.vehicleCode} | Lái xe: ${selectedAlert.driverName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Thời gian phát hiện:</span> <b>{selectedAlert.occurredTime}</b></div>
              <div className="flex justify-between"><span>Lượng dầu sụt giảm:</span> <b className="text-rose-600 font-bold">{selectedAlert.droppedLitersInfo}</b></div>
              <div className="flex justify-between"><span>Vị trí GPS:</span> <span>{selectedAlert.location}</span></div>
              <div className="flex justify-between"><span>Kết luận thanh tra:</span> <strong className="text-slate-900">{selectedAlert.investigationResult}</strong></div>
              <div className="flex justify-between"><span>Biện pháp xử lý:</span> <b className="text-primary">{selectedAlert.statusLabel}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedAlert(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
