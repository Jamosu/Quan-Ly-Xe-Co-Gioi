import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Building2,
  Download,
  BarChart3,
  Truck,
  CheckCircle2,
  Tractor,
  TrendingDown,
} from 'lucide-react';

interface CrossKLHReportRow {
  id: string;
  klhName: string;
  totalVehicles: string;
  landAreaHa: string;
  transportTons: string;
  realFuelLiters: string;
  savingRate: string;
  availabilityRate: string;
  rankingBadge: string;
}

export const CrossKLHReportPage: React.FC = () => {
  const [rowsList, setRowsList] = useState<CrossKLHReportRow[]>([]);
  const columns: Column<CrossKLHReportRow>[] = [
    { key: 'klhName', title: 'KHU LIÊN HỢP / ĐƠN VỊ', sortable: true, render: (row) => <strong className="text-slate-900 font-bold">{row.klhName}</strong> },
    { key: 'totalVehicles', title: 'TỔNG SỐ XE', render: (row) => <span className="text-xs text-slate-700">{row.totalVehicles}</span> },
    { key: 'landAreaHa', title: 'DIỆN TÍCH LÀM ĐẤT (HA)', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.landAreaHa}</strong> },
    { key: 'transportTons', title: 'VẬN CHUYỂN (TẤN)', render: (row) => <strong className="text-slate-900 text-xs">{row.transportTons}</strong> },
    { key: 'realFuelLiters', title: 'TIÊU HAO DẦU THỰC TẾ (L)', render: (row) => <span className="text-xs text-slate-700">{row.realFuelLiters}</span> },
    {
      key: 'savingRate',
      title: 'TỶ LỆ TIẾT KIỆM',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-extrabold text-xs">{row.savingRate}</strong>,
    },
    {
      key: 'availabilityRate',
      title: 'HỆ SỐ SẴN SÀNG',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-bold text-xs">{row.availabilityRate}</strong>,
    },
    {
      key: 'rankingBadge',
      title: 'XẾP HẠNG',
      render: (row) => <Badge variant={row.rankingBadge.includes('Top 1') ? 'green' : 'blue'}>{row.rankingBadge}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Báo cáo So sánh giữa các KLH & Xí nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            So sánh đối sánh năng lực huy động xe, tỷ lệ tiêu hao dầu và năng suất làm việc giữa KLH Koun Mom, KLH Snuol.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất Excel so sánh
          </Button>
          <Button variant="primary" size="md" icon={<BarChart3 className="w-4 h-4" />}>
            Biểu đồ Benchmark
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Năm 2026 · Phạm vi: KLH Koun Mom vs KLH Snuol</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng Khu liên hợp so sánh"
          value={`${rowsList.length} KLH`}
          subValue="Dữ liệu toàn tập đoàn"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Tổng xe toàn tập đoàn"
          value={`${rowsList.reduce((acc, r) => acc + (parseInt(r.totalVehicles) || 0), 0)} xe`}
          subValue="Quy mô tổng hợp"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tổng diện tích canh tác"
          value={`${rowsList.reduce((acc, r) => acc + (parseFloat(r.landAreaHa) || 0), 0)} ha`}
          subValue="Đã có số liệu"
          icon={<Tractor className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Tỷ lệ sẵn sàng TB"
          value="100%"
          subValue="Hệ số kỹ thuật an toàn"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Quy Mô Phương Tiện Đa Khu Liên Hợp
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu so sánh năng lực huy động phương tiện giữa các tổ hợp nông nghiệp THACO AGRI
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> KLH Koun Mom</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> KLH Snuol</div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Bảng So Sánh Hiệu Suất Các Tổ Hợp Nông Nghiệp THACO AGRI"
        subtitle="Tổng hợp chỉ số sẵn sàng vận hành, khối lượng vận tải và tỷ lệ tiết kiệm nhiên liệu định mức"
        columns={columns}
        data={rowsList}
      />
    </div>
  );
};
