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
  Download,
  Zap,
  CheckCircle2,
  TrendingDown,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface ReconciliationRow {
  id: string;
  vehicleCode: string;
  driverName: string;
  vehicleType: string;
  taskTitle: string;
  areaOrKm: string;
  quotaLiters: string;
  quotaPerUnit: string;
  realLiters: string;
  realPerUnit: string;
  diffLiters: string;
  diffPercent: string;
  isSaving: boolean;
  evaluationText: string;
  statusType: 'reward' | 'warning' | 'normal';
}
export const FuelReconciliationPage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<ReconciliationRow | null>(null);
  const [reconciliationList, setReconciliationList] = useState<ReconciliationRow[]>([]);

  const columns: Column<ReconciliationRow>[] = [
    {
      key: 'vehicleCode',
      title: 'MÃ XE / TÀI XẾ',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-primary font-bold block">{row.vehicleCode}</strong>
          <span className="text-[10px] text-slate-500">{row.driverName}</span>
        </div>
      ),
    },
    { key: 'vehicleType', title: 'CHỦNG LOẠI', render: (row) => <span className="font-semibold text-slate-800 text-xs">{row.vehicleType}</span> },
    { key: 'taskTitle', title: 'CÔNG VIỆC THỰC HIỆN', render: (row) => <span className="text-xs text-slate-700">{row.taskTitle}</span> },
    { key: 'areaOrKm', title: 'DIỆN TÍCH / KM', render: (row) => <strong className="text-slate-900 text-xs">{row.areaOrKm}</strong> },
    {
      key: 'quotaLiters',
      title: 'ĐỊNH MỨC KHOÁN',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 block text-xs">{row.quotaLiters}</span>
          <span className="text-[10px] text-slate-500">{row.quotaPerUnit}</span>
        </div>
      ),
    },
    {
      key: 'realLiters',
      title: 'THỰC TẾ TIÊU HAO',
      render: (row) => (
        <div>
          <strong className="text-slate-900 block font-bold text-xs">{row.realLiters}</strong>
          <span className="text-[10px] text-slate-500">{row.realPerUnit}</span>
        </div>
      ),
    },
    {
      key: 'diffLiters',
      title: 'CHÊNH LỆCH',
      sortable: true,
      render: (row) => (
        <strong className={`text-xs ${row.isSaving ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}`}>
          {row.diffLiters} ({row.diffPercent})
        </strong>
      ),
    },
    {
      key: 'evaluationText',
      title: 'ĐÁNH GIÁ',
      render: (row) => row.statusType === 'reward' ? (
        <Badge variant="green">{row.evaluationText}</Badge>
      ) : (
        <Badge variant="red">{row.evaluationText}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Đối chiếu thực tế GPS vs Định mức khoán
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động so sánh số km GPS/que đo siêu âm DUT-E với định mức khoán để tính thưởng tiết kiệm hoặc xử lý vượt dầu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất bảng đối chiếu
          </Button>
          <Button variant="primary" size="md" icon={<Zap className="w-4 h-4" />}>
            Chốt kỳ đối chiếu
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đã khớp số tuần 34</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng lệnh đối chiếu"
          value={`${reconciliationList.length} lệnh`}
          subValue="Đã có dữ liệu đối chiếu"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Lệnh tiết kiệm dầu"
          value={`${reconciliationList.filter((r) => r.isSaving).length} lệnh`}
          subValue="Đạt chuẩn khen thưởng"
          icon={<TrendingDown className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Lệnh khen thưởng thi đua"
          value={`${reconciliationList.filter((r) => r.statusType === 'reward').length} lệnh`}
          subValue="Khen thưởng tài xế"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Lệnh vượt định mức (>3%)"
          value={`${reconciliationList.filter((r) => r.statusType === 'warning').length} lệnh`}
          subValue="Cần giải trình nguyên nhân"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Phân Bổ Tỷ Trọng Tiết Kiệm Nhiên Liệu
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu tổng hợp từ các phương tiện gắn que đo siêu âm DUT-E toàn Khu liên hợp
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Tiết kiệm: <b>{reconciliationList.length > 0 ? `${Math.round((reconciliationList.filter((r) => r.isSaving).length / reconciliationList.length) * 100)}%` : '0%'}</b></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> Đúng định mức: <b>{reconciliationList.length > 0 ? `${Math.round((reconciliationList.filter((r) => r.statusType === 'normal').length / reconciliationList.length) * 100)}%` : '0%'}</b></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500" /> Vượt định mức: <b>{reconciliationList.length > 0 ? `${Math.round((reconciliationList.filter((r) => r.statusType === 'warning').length / reconciliationList.length) * 100)}%` : '0%'}</b></div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Bảng Đối Chiếu Nhiên Liệu Thực Tế vs Định Mức Khoán"
        subtitle="Hiển thị chi tiết số lít dầu tiêu thụ thực tế so sánh với hạn mức khoán của từng lệnh điều xe"
        columns={columns}
        data={reconciliationList}
        onRowClick={(row) => setSelectedItem(row)}
      />

      {/* Detail Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`Đối Chiếu Dầu: ${selectedItem.vehicleCode}`}
          subtitle={`Tài xế: ${selectedItem.driverName} | ${selectedItem.taskTitle}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Định mức khoán:</span> <b>{selectedItem.quotaLiters} ({selectedItem.quotaPerUnit})</b></div>
              <div className="flex justify-between"><span>Thực tế tiêu hao:</span> <strong className="text-slate-900">{selectedItem.realLiters} ({selectedItem.realPerUnit})</strong></div>
              <div className="flex justify-between"><span>Chênh lệch:</span> <b className={selectedItem.isSaving ? 'text-emerald-700' : 'text-rose-600'}>{selectedItem.diffLiters} ({selectedItem.diffPercent})</b></div>
              <div className="flex justify-between"><span>Đánh giá kết luận:</span> <b className="text-primary">{selectedItem.evaluationText}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedItem(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
