import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  FileText,
  Search,
  Download,
  AlertOctagon,
  Gauge,
  Timer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ViolationItem {
  id: string;
  reportCode: string;
  occurredTime: string;
  driverName: string;
  driverCode: string;
  vehicleCode: string;
  vehicleDesc: string;
  violationBehavior: string;
  location: string;
  penaltyAction: string;
  status: 'processing' | 'resolved' | 'closed';
}

export const DriverViolationsPage: React.FC = () => {
  const [selectedViolation, setSelectedViolation] = useState<ViolationItem | null>(null);
  const [violationsList, setViolationsList] = useState<ViolationItem[]>([]);
  const [showLookupModal, setShowLookupModal] = useState(false);

  const columns: Column<ViolationItem>[] = [
    {
      key: 'reportCode',
      title: 'MÃ BIÊN BẢN',
      sortable: true,
      render: (row) => <strong className="text-primary font-mono font-bold text-xs">{row.reportCode}</strong>,
    },
    { key: 'occurredTime', title: 'THỜI GIAN', sortable: true },
    {
      key: 'driverName',
      title: 'LÁI XE VI PHẠM',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.driverName}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.driverCode}</span>
        </div>
      ),
    },
    {
      key: 'vehicleCode',
      title: 'PHƯƠNG TIỆN',
      render: (row) => (
        <div>
          <strong className="text-slate-800 block">{row.vehicleCode}</strong>
          <span className="text-[10px] text-slate-500">{row.vehicleDesc}</span>
        </div>
      ),
    },
    {
      key: 'violationBehavior',
      title: 'HÀNH VI VI PHẠM',
      render: (row) => <span className="font-semibold text-rose-600 text-xs">{row.violationBehavior}</span>,
    },
    { key: 'location', title: 'ĐỊA ĐIỂM' },
    { key: 'penaltyAction', title: 'HÌNH THỨC XỬ LÝ', render: (row) => <span className="text-xs text-slate-700 font-medium">{row.penaltyAction}</span> },
    {
      key: 'status',
      title: 'TRẠNG THÁI',
      render: (row) => {
        if (row.status === 'processing') return <Badge variant="amber" dot>Đang xử lý</Badge>;
        if (row.status === 'resolved') return <Badge variant="green">Đã xử lý</Badge>;
        return <Badge variant="gray">Đã đóng</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Lịch sử lái xe & Nhật ký vi phạm
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tổng số lệnh đã thực hiện, số km chạy, số giờ lái và ghi nhận các biên bản vi phạm tốc độ / rời vùng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất biên bản xử phạt
          </Button>
          <Button variant="primary" size="md" icon={<Search className="w-4 h-4" />} onClick={() => setShowLookupModal(true)}>
            Tra cứu tài xế
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Trạng thái: Đang xử lý</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng sự kiện vi phạm"
          value={`${violationsList.length} vụ`}
          subValue="Được ghi nhận từ GPS"
          icon={<AlertOctagon className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          label="Đang xử lý / Giải trình"
          value={`${violationsList.filter((v) => v.status === 'processing').length} vụ`}
          subValue="Cần tài xế giải trình"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Đã xử lý kỷ luật"
          value={`${violationsList.filter((v) => v.status === 'resolved').length} vụ`}
          subValue="Trừ điểm thi đua / Phạt"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Đã đóng hồ sơ"
          value={`${violationsList.filter((v) => v.status === 'closed').length} vụ`}
          subValue="Hoàn tất xử lý"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
        </KPIGrid>

      {/* DataTable */}
      <DataTable
        title="Danh Sách Biên Bản Vi Phạm An Toàn & Kỷ Luật Vận Hành"
        subtitle="Dữ liệu trích xuất tự động từ telemetry GPS kết hợp biên bản thanh tra hiện trường"
        columns={columns}
        data={violationsList}
        onRowClick={(row) => setSelectedViolation(row)}
      />

      {/* Detail Modal */}
      {selectedViolation && (
        <Modal
          isOpen={!!selectedViolation}
          onClose={() => setSelectedViolation(null)}
          title={`Chi Tiết Biên Bản: ${selectedViolation.reportCode}`}
          subtitle={`Tài xế: ${selectedViolation.driverName} (${selectedViolation.driverCode})`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Thời gian xảy ra:</span> <b>{selectedViolation.occurredTime}</b></div>
              <div className="flex justify-between"><span>Phương tiện:</span> <strong className="text-primary">{selectedViolation.vehicleCode} ({selectedViolation.vehicleDesc})</strong></div>
              <div className="flex justify-between"><span>Hành vi vi phạm:</span> <b className="text-rose-600">{selectedViolation.violationBehavior}</b></div>
              <div className="flex justify-between"><span>Địa điểm:</span> <span>{selectedViolation.location}</span></div>
              <div className="flex justify-between"><span>Hình thức chế tài:</span> <b>{selectedViolation.penaltyAction}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedViolation(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lookup Modal */}
      <Modal
        isOpen={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        title="Tra Cứu Lịch Sử Vi Phạm Tài Xế"
        subtitle="Tìm kiếm theo mã nhân viên hoặc họ tên tài xế"
        size="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Mã NV hoặc Họ tên lái xe:</label>
            <input type="text" placeholder="Ví dụ: NV-0824 hoặc Nguyễn Văn Minh" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowLookupModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={() => setShowLookupModal(false)}>Tra Cứu Ngay</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

