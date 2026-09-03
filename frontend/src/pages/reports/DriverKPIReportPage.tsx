import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Award,
  Download,
  Users,
  DollarSign,
  TrendingUp,
  Trophy,
} from 'lucide-react';

interface DriverKPIReportRow {
  id: string;
  driverCode: string;
  driverName: string;
  teamUnit: string;
  tripsScore: string;
  kmScore: string;
  hoursScore: string;
  fuelSavingScore: string;
  isFuelPositive: boolean;
  totalKpiScore: string;
  kpiRank: string;
  bonusVND: string;
}

export const DriverKPIReportPage: React.FC = () => {
  const [reportList, setReportList] = useState<DriverKPIReportRow[]>([]);

  const columns: Column<DriverKPIReportRow>[] = [
    {
      key: 'driverCode',
      title: 'MÃ NV / HỌ TÊN',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 block text-xs">{row.driverName}</strong>
          <span className="text-[10px] text-slate-500 font-mono">{row.driverCode}</span>
        </div>
      ),
    },
    { key: 'teamUnit', title: 'ĐỘI XE TRỰC THUỘC', render: (row) => <span className="text-xs text-slate-700">{row.teamUnit}</span> },
    { key: 'tripsScore', title: 'SỐ CHUYẾN (25%)', render: (row) => <span className="text-xs text-slate-800">{row.tripsScore}</span> },
    { key: 'kmScore', title: 'KM CHẠY (25%)', render: (row) => <span className="text-xs text-slate-800">{row.kmScore}</span> },
    { key: 'hoursScore', title: 'GIỜ MÁY (25%)', render: (row) => <span className="text-xs text-slate-800">{row.hoursScore}</span> },
    {
      key: 'fuelSavingScore',
      title: 'TIẾT KIỆM DẦU (25%)',
      render: (row) => (
        <span className={`text-xs font-bold ${row.isFuelPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
          {row.fuelSavingScore}
        </span>
      ),
    },
    {
      key: 'totalKpiScore',
      title: 'TỔNG ĐIỂM KPI',
      sortable: true,
      render: (row) => (
        <span className={`text-xs font-extrabold ${row.kpiRank === 'Loại A' ? 'text-emerald-700' : 'text-amber-700'}`}>
          {row.totalKpiScore} ({row.kpiRank})
        </span>
      ),
    },
    {
      key: 'bonusVND',
      title: 'TIỀN THƯỞNG',
      sortable: true,
      render: (row) => <strong className="text-slate-900 font-bold text-xs">{row.bonusVND}</strong>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Báo cáo Tổng hợp KPI & Lương thưởng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Báo cáo KPI theo công thức chuẩn BRD: Điểm KPI = 25% Chuyến + 25% Km + 25% Giờ máy + 25% Tiết kiệm nhiên liệu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất bảng lương KPI
          </Button>
          <Button variant="primary" size="md" icon={<Trophy className="w-4 h-4" />}>
            Bảng vinh danh
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kỳ đánh giá: Tháng 08/2026 · Dữ liệu tự động từ GPS</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng tài xế đánh giá"
          value={`${reportList.length} tài xế`}
          subValue="Đã tổng hợp số liệu"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Tài xế Loại A (Xuất sắc)"
          value={`${reportList.filter((r) => r.kpiRank === 'Loại A').length} người`}
          subValue="Thưởng 100% năng suất"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tài xế Loại B (Khá)"
          value={`${reportList.filter((r) => r.kpiRank === 'Loại B').length} người`}
          subValue="Thưởng 80% năng suất"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Tài xế tiết kiệm nhiên liệu"
          value={`${reportList.filter((r) => r.isFuelPositive).length} người`}
          subValue="Đạt thưởng tiết kiệm"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Phân Bổ Xếp Hạng KPI Tài Xế
          </h3>
          <p className="text-xs text-slate-500">
            Công thức đánh giá 4 thành phần (25% Chuyến · 25% Km · 25% Giờ máy · 25% Tiết kiệm dầu)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Loại A (Xuất sắc)</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> Loại B (Khá)</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Loại C (Trung bình)</div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Bảng Đánh Giá KPI 4 Thành Phần & Quyết Toán Lương Thưởng"
        subtitle="Dữ liệu đồng bộ tự động từ cảm biến que đo DUT-E và nhật ký điều vận"
        columns={columns}
        data={reportList}
      />
    </div>
  );
};
