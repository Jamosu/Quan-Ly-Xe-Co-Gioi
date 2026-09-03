import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  Wrench,
  Download,
  BarChart3,
  DollarSign,
  Droplet,
  Cog,
} from 'lucide-react';

interface MaintenanceCostGroupRow {
  id: string;
  vehicleGroup: string;
  serviceCount: string;
  partsCost: string;
  oilCost: string;
  totalCostVND: string;
  downtimeHours: string;
  avgPerVehicle: string;
}

export const MaintenanceCostReportPage: React.FC = () => {
  const [costsList, setCostsList] = useState<MaintenanceCostGroupRow[]>([]);
  const columns: Column<MaintenanceCostGroupRow>[] = [
    { key: 'vehicleGroup', title: 'NHÓM PHƯƠNG TIỆN', sortable: true, render: (row) => <strong className="text-slate-900 font-bold">{row.vehicleGroup}</strong> },
    { key: 'serviceCount', title: 'SỐ LƯỢT BTSC', render: (row) => <span className="text-xs text-slate-700">{row.serviceCount}</span> },
    { key: 'partsCost', title: 'CHI PHÍ PHỤ TÙNG', render: (row) => <span className="text-xs text-slate-700">{row.partsCost}</span> },
    { key: 'oilCost', title: 'CHI PHÍ DẦU NHỚT', render: (row) => <span className="text-xs text-slate-700">{row.oilCost}</span> },
    {
      key: 'totalCostVND',
      title: 'TỔNG CHI PHÍ (VNĐ)',
      sortable: true,
      render: (row) => <strong className="text-emerald-700 font-extrabold text-sm">{row.totalCostVND}</strong>,
    },
    { key: 'downtimeHours', title: 'GIỜ DỪNG MÁY', render: (row) => <span className="text-xs text-slate-600 font-semibold">{row.downtimeHours}</span> },
    {
      key: 'avgPerVehicle',
      title: 'BÌNH QUÂN / XE',
      sortable: true,
      render: (row) => <strong className="text-primary font-bold text-xs">{row.avgPerVehicle}</strong>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Báo cáo Chi phí Bảo trì & Sửa chữa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp chi phí thay thế phụ tùng, dầu nhớt bôi trơn, giờ công thợ máy và thời gian dừng xe hỏng (Downtime).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất báo cáo tài chính BTSC
          </Button>
          <Button variant="primary" size="md" icon={<BarChart3 className="w-4 h-4" />}>
            Phân tích chi phí
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tháng 08/2026 · Đã quyết toán</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng nhóm phương tiện"
          value={`${costsList.length} nhóm`}
          subValue="Đã quyết toán BTSC"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Tổng lượt bảo dưỡng / sửa chữa"
          value={`${costsList.reduce((acc, c) => acc + (parseInt(c.serviceCount) || 0), 0)} lượt`}
          subValue="Đã đóng phiếu giao việc"
          icon={<Wrench className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Chi phí phụ tùng & dầu nhớt"
          value="Đã hạch toán"
          subValue="Theo xuất kho thực tế"
          icon={<Droplet className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Tỷ lệ hoàn thành đúng tiến độ"
          value="100%"
          subValue="Thời gian dừng xe tối ưu"
          icon={<Cog className="w-5 h-5" />}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-600"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Cơ Cấu Chi Phí BTSC Theo Nhóm Phương Tiện
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu tổng hợp từ các phiếu giao việc BM02 và hóa đơn xuất kho phụ tùng trung tâm
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Máy kéo nông nghiệp</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> Xe tải & Ben</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Máy công trình</div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Tổng Hợp Chi Phí Bảo Trì Sửa Chữa Các Nhóm Phương Tiện Cơ Giới"
        subtitle="Hiển thị chi tiết số lượt sửa chữa, giá trị phụ tùng, dầu nhớt và chỉ tiêu chi phí bình quân trên đầu xe"
        columns={columns}
        data={costsList}
      />
    </div>
  );
};
