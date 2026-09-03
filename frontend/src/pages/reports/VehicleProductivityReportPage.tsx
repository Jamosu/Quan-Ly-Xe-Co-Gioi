import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Activity,
  Download,
  FileSpreadsheet,
  Truck,
  Clock,
  MapPin,
  Tractor,
} from 'lucide-react';

interface UnitProductivityRow {
  id: string;
  unitName: string;
  totalVehicles: string;
  activeVehicles: string;
  operatingHours: string;
  completedArea: string;
  transportVolume: string;
  utilizationRate: string;
  evaluationText: string;
}

export const VehicleProductivityReportPage: React.FC = () => {
  const [rowsList, setRowsList] = useState<UnitProductivityRow[]>([]);
  const columns: Column<UnitProductivityRow>[] = [
    { key: 'unitName', title: 'ĐƠN VỊ / XÍ NGHIỆP', sortable: true, render: (row) => <strong className="text-slate-900 font-bold">{row.unitName}</strong> },
    { key: 'totalVehicles', title: 'TỔNG SỐ XE', render: (row) => <span className="text-xs text-slate-700">{row.totalVehicles}</span> },
    { key: 'activeVehicles', title: 'XE HOẠT ĐỘNG', render: (row) => <strong className="text-primary text-xs">{row.activeVehicles}</strong> },
    { key: 'operatingHours', title: 'GIỜ MÁY NỔ (H)', sortable: true, render: (row) => <strong className="text-slate-900 text-xs">{row.operatingHours}</strong> },
    { key: 'completedArea', title: 'DIỆN TÍCH (HA)', render: (row) => <strong className="text-slate-900 text-xs">{row.completedArea}</strong> },
    { key: 'transportVolume', title: 'VẬN CHUYỂN (TẤN)', render: (row) => <span className="text-xs text-slate-700">{row.transportVolume}</span> },
    {
      key: 'utilizationRate',
      title: 'HIỆU SUẤT KHAI THÁC',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-extrabold text-xs">{row.utilizationRate}</strong>,
    },
    {
      key: 'evaluationText',
      title: 'ĐÁNH GIÁ',
      render: (row) => <Badge variant={row.evaluationText === 'Xuất sắc' ? 'green' : 'blue'}>{row.evaluationText}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Báo cáo Năng suất & Vận hành xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Báo cáo tổng hợp số lệnh hoàn thành, số km lăn bánh, số giờ nổ máy thực tế và năng suất cày bừa/vận chuyển.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<FileSpreadsheet className="w-4 h-4" />}>
            Xuất Excel
          </Button>
          <Button variant="primary" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất PDF
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tháng 08/2026 · Tổng hợp tháng</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng đơn vị sản xuất"
          value={`${rowsList.length} đơn vị`}
          subValue="Xí nghiệp & Đội xe"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Đơn vị hoàn thành xuất sắc"
          value={`${rowsList.filter((r) => r.evaluationText === 'Xuất sắc').length} đơn vị`}
          subValue="Vượt chỉ tiêu khai thác"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Đơn vị đạt kế hoạch"
          value={`${rowsList.filter((r) => r.evaluationText !== 'Xuất sắc').length} đơn vị`}
          subValue="Đạt định mức"
          icon={<Tractor className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Tỷ lệ sẵn sàng trung bình"
          value="100%"
          subValue="Hệ số kỹ thuật an toàn"
          icon={<Activity className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Cơ Cấu Tình Trạng Phương Tiện Toàn KLH
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu tổng hợp từ hệ thống giám sát điều hành và nhật ký vận hành xí nghiệp
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Đang hoạt động</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> Dự phòng / Dừng</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Bảo trì BTSC</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400" /> Mất tín hiệu</div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Tổng Hợp Chỉ Tiêu Năng Suất Các Đơn Vị Sản Xuất"
        subtitle="So sánh sản lượng làm đất, khối lượng vận chuyển và hiệu suất khai thác thực tế"
        columns={columns}
        data={rowsList}
      />
    </div>
  );
};
