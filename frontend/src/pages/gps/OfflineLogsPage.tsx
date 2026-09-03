import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  WifiOff,
  Radio,
  RefreshCw,
  Download,
  Database,
  Antenna,
  CheckCircle2,
} from 'lucide-react';

interface OfflineLogItem {
  id: string;
  vehicleCode: string;
  vehicleModel: string;
  driverName: string;
  lostTime: string;
  lastLocation: string;
  offlineDuration: string;
  cachedPackets: string;
  actionText: string;
  isActionBtn: boolean;
}

export const OfflineLogsPage: React.FC = () => {
  const [selectedLog, setSelectedLog] = useState<OfflineLogItem | null>(null);
  const [logsList, setLogsList] = useState<OfflineLogItem[]>([]);

  const columns: Column<OfflineLogItem>[] = [
    {
      key: 'vehicleCode',
      title: 'MÃ PHƯƠNG TIỆN',
      sortable: true,
      render: (row) => <strong className="text-primary font-bold">{row.vehicleCode}</strong>,
    },
    { key: 'vehicleModel', title: 'CHỦNG LOẠI XE', sortable: true, render: (row) => <span className="font-semibold text-slate-800 text-xs">{row.vehicleModel}</span> },
    { key: 'driverName', title: 'LÁI XE ĐIỀU KHIỂN', render: (row) => <span className="font-medium text-slate-900 text-xs">{row.driverName}</span> },
    { key: 'lostTime', title: 'THỜI ĐIỂM MẤT SÓNG', sortable: true, render: (row) => <span className="font-mono text-xs text-slate-700">{row.lostTime}</span> },
    { key: 'lastLocation', title: 'VỊ TRÍ CUỐI CÙNG', render: (row) => <span className="text-xs text-slate-600">📍 {row.lastLocation}</span> },
    {
      key: 'offlineDuration',
      title: 'THỜI GIAN OFFLINE',
      sortable: true,
      render: (row) => <strong className="text-rose-600 font-bold text-xs">{row.offlineDuration}</strong>,
    },
    { key: 'cachedPackets', title: 'GÓI TIN ĐỆM', render: (row) => <span className="text-xs text-slate-700">{row.cachedPackets}</span> },
    {
      key: 'actionText',
      title: 'HÀNH ĐỘNG KỸ THUẬT',
      render: (row) => row.isActionBtn ? (
        <Button variant="outline" size="sm">
          {row.actionText}
        </Button>
      ) : (
        <Badge variant="amber">{row.actionText}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Nhật ký Mất sóng & Đồng bộ Offline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tình trạng mất kết nối GPS/GSM tại các vùng lõm nông trường, lưu bộ nhớ đệm và tự động đồng bộ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất báo cáo kết nối
          </Button>
          <Button variant="primary" size="md" icon={<RefreshCw className="w-4 h-4" />}>
            Đồng bộ dữ liệu
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Trạng thái: Đang offline (6 xe)</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng bản ghi mất sóng"
          value={`${logsList.length} xe`}
          subValue="Đang theo dõi kết nối"
          icon={<WifiOff className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Mất kết nối (>2 giờ)"
          value={`${logsList.filter((l) => l.offlineDuration.includes('2h') || l.offlineDuration.includes('3h')).length} xe`}
          subValue="Khu vực vùng lõm sóng"
          icon={<Radio className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Bản tin lưu đệm offline"
          value="Bộ nhớ Flash"
          subValue="Tự động gửi khi có 4G"
          icon={<Database className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Trạng thái ăng-ten / SIM"
          value="Đang kiểm tra"
          subValue="Đội Kỹ thuật xử lý"
          icon={<Antenna className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Phương Tiện Mất Kết Nối Ngoại Tuyến Trên 1 Giờ"
        subtitle="Thiết bị GPS tự động lưu lại tọa độ và mức dầu vào bộ nhớ đệm Flash và đẩy lên khi bắt được sóng 4G"
        columns={columns}
        data={logsList}
        onRowClick={(row) => setSelectedLog(row)}
      />

      {/* Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Chi Tiết Mất Sóng: ${selectedLog.vehicleCode}`}
          subtitle={`${selectedLog.vehicleModel} | Lái xe: ${selectedLog.driverName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Thời điểm mất sóng:</span> <b>{selectedLog.lostTime}</b></div>
              <div className="flex justify-between"><span>Thời gian ngoại tuyến:</span> <b className="text-rose-600 font-bold">{selectedLog.offlineDuration}</b></div>
              <div className="flex justify-between"><span>Vị trí cuối cùng:</span> <span>{selectedLog.lastLocation}</span></div>
              <div className="flex justify-between"><span>Số bản tin lưu đệm:</span> <b className="text-primary">{selectedLog.cachedPackets}</b></div>
              <div className="flex justify-between"><span>Biện pháp kỹ thuật:</span> <b>{selectedLog.actionText}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedLog(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
