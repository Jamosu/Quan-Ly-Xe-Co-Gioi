import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Gauge,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
} from 'lucide-react';

interface SpeedAlertItem {
  id: string;
  timeStr: string;
  timeAgo: string;
  vehicleCode: string;
  driverName: string;
  vehicleModel: string;
  violationBehavior: string;
  speedAndLocation: string;
  speedSub: string;
  allowedThreshold: string;
  driverExplanation: string;
  managerAction: string;
  isDanger: boolean;
}

export const SpeedAlertPage: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<SpeedAlertItem | null>(null);
  const [alertsList, setAlertsList] = useState<SpeedAlertItem[]>([]);

  const columns: Column<SpeedAlertItem>[] = [
    {
      key: 'timeStr',
      title: 'THỜI GIAN',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 block text-xs">{row.timeStr}</strong>
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
          <strong className="text-primary font-bold block text-xs">{row.vehicleCode}</strong>
          <span className="text-[10px] text-slate-500">{row.driverName} ({row.vehicleModel})</span>
        </div>
      ),
    },
    {
      key: 'violationBehavior',
      title: 'HÀNH VI VI PHẠM',
      render: (row) => (
        <span className={`font-bold text-xs ${row.isDanger ? 'text-rose-600' : 'text-amber-600'}`}>
          {row.violationBehavior}
        </span>
      ),
    },
    {
      key: 'speedAndLocation',
      title: 'VẬN TỐC / VỊ TRÍ',
      render: (row) => (
        <div>
          <strong className="text-slate-900 block text-xs">{row.speedAndLocation}</strong>
          <span className="text-[10px] text-slate-500">{row.speedSub}</span>
        </div>
      ),
    },
    { key: 'allowedThreshold', title: 'NGƯỠNG CHO PHÉP', render: (row) => <span className="text-xs text-slate-600">{row.allowedThreshold}</span> },
    { key: 'driverExplanation', title: 'GIẢI TRÌNH TÀI XẾ', render: (row) => <span className="text-xs text-slate-700 italic">{row.driverExplanation}</span> },
    {
      key: 'managerAction',
      title: 'XỬ LÝ CỦA QUẢN ĐỐC',
      render: (row) => row.isDanger ? (
        <Badge variant="red">{row.managerAction}</Badge>
      ) : (
        <Badge variant="amber">{row.managerAction}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Cảnh báo Tốc độ & Vi phạm Geofence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách sự kiện vi phạm chạy quá tốc độ quy định nông trường và vượt ranh giới làm việc đẩy về Quản đốc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất biên bản vi phạm
          </Button>
          <Button variant="primary" size="md" icon={<CheckCircle2 className="w-4 h-4" />}>
            Xác nhận kiểm tra
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Trạng thái: Cần xác minh</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng sự kiện vi phạm"
          value={`${alertsList.length} vụ`}
          subValue="Ghi nhận từ GPS"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Vi phạm tốc độ nghiêm trọng"
          value={`${alertsList.filter((a) => a.isDanger).length} vụ`}
          subValue="Cần kiểm điểm kỷ luật"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Vi phạm vùng / Lệch tuyến"
          value={`${alertsList.filter((a) => !a.isDanger).length} vụ`}
          subValue="Đã có giải trình"
          icon={<MapPin className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tỷ lệ phản hồi xử lý"
          value="100%"
          subValue="Phản hồi dưới 10 phút"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Sự Kiện Vi Phạm Tốc Độ & Rời Vùng Geofence"
        subtitle="Hiển thị chi tiết thời gian, vị trí trên bản đồ và quyết định xử lý của Quản đốc Nông trường"
        columns={columns}
        data={alertsList}
        onRowClick={(row) => setSelectedAlert(row)}
      />

      {/* Detail Modal */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Chi Tiết Vi Phạm: ${selectedAlert.violationBehavior}`}
          subtitle={`Xe: ${selectedAlert.vehicleCode} | Lái xe: ${selectedAlert.driverName}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Thời gian xảy ra:</span> <b>{selectedAlert.timeStr}</b></div>
              <div className="flex justify-between"><span>Vận tốc / Vị trí:</span> <b className="text-rose-600">{selectedAlert.speedAndLocation} ({selectedAlert.speedSub})</b></div>
              <div className="flex justify-between"><span>Giải trình của tài xế:</span> <span className="italic">{selectedAlert.driverExplanation}</span></div>
              <div className="flex justify-between"><span>Quyết định xử lý:</span> <b className="text-primary">{selectedAlert.managerAction}</b></div>
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
