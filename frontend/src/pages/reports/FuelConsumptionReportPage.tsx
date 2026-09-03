import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Fuel,
  Download,
  BarChart3,
  DollarSign,
  TrendingDown,
  Gauge,
} from 'lucide-react';

interface FuelReportUnitRow {
  id: string;
  teamName: string;
  vehicleCount: string;
  workDone: string;
  quotaLiters: string;
  realLiters: string;
  diffLiters: string;
  savingPercent: string;
  evaluationText: string;
}

export const FuelConsumptionReportPage: React.FC = () => {
  const [reportList, setReportList] = useState<FuelReportUnitRow[]>([]);
  const columns: Column<FuelReportUnitRow>[] = [
    { key: 'teamName', title: 'ĐƠN VỊ / ĐỘI XE', sortable: true, render: (row) => <strong className="text-slate-900 font-bold">{row.teamName}</strong> },
    { key: 'vehicleCount', title: 'SỐ XE', render: (row) => <span className="text-xs text-slate-700">{row.vehicleCount}</span> },
    { key: 'workDone', title: 'DIỆN TÍCH / KM THỰC HIỆN', render: (row) => <strong className="text-slate-900 text-xs">{row.workDone}</strong> },
    { key: 'quotaLiters', title: 'ĐỊNH MỨC KHOÁN (L)', render: (row) => <span className="text-xs text-slate-700">{row.quotaLiters}</span> },
    { key: 'realLiters', title: 'TIÊU THỤ THỰC TẾ (L)', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.realLiters}</strong> },
    {
      key: 'diffLiters',
      title: 'CHÊNH LỆCH (LÍT)',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-bold text-xs">{row.diffLiters}</strong>,
    },
    {
      key: 'savingPercent',
      title: 'TỶ LỆ TIẾT KIỆM',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-extrabold text-xs">{row.savingPercent}</strong>,
    },
    {
      key: 'evaluationText',
      title: 'ĐÁNH GIÁ',
      render: (row) => <Badge variant={row.evaluationText === 'Thưởng tập thể' ? 'green' : 'blue'}>{row.evaluationText}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Báo cáo Tiêu hao & Chi phí Nhiên liệu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đối chiếu tổng lượng dầu cấp phát từ kho/xe bồn với lượng dầu tiêu hao đo bằng cảm biến que đo siêu âm GPS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất báo cáo nhiên liệu
          </Button>
          <Button variant="primary" size="md" icon={<BarChart3 className="w-4 h-4" />}>
            Xem biểu đồ tiêu hao
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tháng 08/2026 · Khớp số liệu trạm</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng đơn vị báo cáo"
          value={`${reportList.length} đội xe`}
          subValue="Đã chốt tiêu hao tháng"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Đơn vị tiết kiệm định mức"
          value={`${reportList.filter((r) => r.evaluationText === 'Thưởng tập thể').length} đội`}
          subValue="Đạt thưởng tập thể"
          icon={<TrendingDown className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Đơn vị đạt định mức"
          value={`${reportList.filter((r) => r.evaluationText !== 'Thưởng tập thể').length} đội`}
          subValue="Vận hành đúng hạn mức"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Độ chính xác cảm biến que đo"
          value="99.2%"
          subValue="So khớp que đo bồn ngầm"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Phân Bổ Tỷ Trọng Tiêu Thụ Dầu Theo Đội Xe
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu đối chiếu tự động giữa cột bơm trạm T1 và cảm biến siêu âm DUT-E
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Cơ giới 1</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> Vận tải Nặng</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Cơ giới 2</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Thủy lợi</div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Bảng Tổng Hợp Tiêu Hao Nhiên Liệu Các Đơn Vị Sản Xuất"
        subtitle="Căn cứ để xét thưởng tiết kiệm định mức nhiên liệu hằng tháng"
        columns={columns}
        data={reportList}
      />
    </div>
  );
};
