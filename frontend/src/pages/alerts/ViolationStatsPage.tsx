import React, { useState } from 'react';
import { FilterBar } from '../../components/filters/FilterBar';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import {
  BarChart3,
  Download,
  AlertOctagon,
  Gauge,
  Fuel,
  CheckCircle2,
} from 'lucide-react';

interface ViolationStatGroup {
  id: string;
  groupName: string;
  totalOccurrences: string;
  resolvedCount: string;
  driverFaultCount: string;
  deviceFaultCount: string;
  techFaultCount: string;
  mainAction: string;
}

export const ViolationStatsPage: React.FC = () => {
  const [groupsList, setGroupsList] = useState<ViolationStatGroup[]>([]);
  const columns: Column<ViolationStatGroup>[] = [
    { key: 'groupName', title: 'NHÓM CẢNH BÁO', sortable: true, render: (row) => <strong className="text-slate-900 font-bold">{row.groupName}</strong> },
    { key: 'totalOccurrences', title: 'SỐ VỤ PHÁT SINH', sortable: true, render: (row) => <strong className="text-rose-600 font-extrabold text-sm">{row.totalOccurrences}</strong> },
    { key: 'resolvedCount', title: 'ĐÃ XỬ LÝ ĐÓNG', render: (row) => <span className="font-semibold text-emerald-700">{row.resolvedCount}</span> },
    { key: 'driverFaultCount', title: 'LỖI DO TÀI XẾ', render: (row) => <span className="text-xs text-slate-800">{row.driverFaultCount}</span> },
    { key: 'deviceFaultCount', title: 'LỖI DO THIẾT BỊ / SÓNG', render: (row) => <span className="text-xs text-slate-500">{row.deviceFaultCount}</span> },
    { key: 'techFaultCount', title: 'SỰ CỐ KỸ THUẬT', render: (row) => <span className="text-xs text-slate-700">{row.techFaultCount}</span> },
    { key: 'mainAction', title: 'HÀNH ĐỘNG XỬ LÝ CHÍNH', render: (row) => <span className="text-xs text-slate-600 font-medium">{row.mainAction}</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Báo cáo Thống kê tần suất Vi phạm & Sự cố
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê số lượng vi phạm tốc độ, sụt nhiên liệu, mất tín hiệu GPS và phân bổ theo từng xí nghiệp / nông trường.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
            Xuất báo cáo Excel
          </Button>
          <Button variant="primary" size="md" icon={<BarChart3 className="w-4 h-4" />}>
            Phân tích xu hướng
          </Button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tháng 08/2026 · Toàn bộ KLH</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng nhóm cảnh báo"
          value={`${groupsList.length} nhóm`}
          subValue="Đang theo dõi"
          icon={<AlertOctagon className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Vi phạm tốc độ"
          value={`${groupsList.find((g) => g.groupName.includes('tốc độ'))?.totalOccurrences || '0 vụ'}`}
          subValue="Ghi nhận từ GPS"
          icon={<Gauge className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Bất thường nhiên liệu"
          value={`${groupsList.find((g) => g.groupName.includes('nhiên liệu'))?.totalOccurrences || '0 vụ'}`}
          subValue="Ghi nhận từ que đo"
          icon={<Fuel className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Tỷ lệ xử lý đúng hạn"
          value="100%"
          subValue="Thời gian phản hồi < 10p"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </KPIGrid>

      {/* Analytics Breakdown Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Phân Bổ Tỷ Trọng Vi Phạm & Sự Cố
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu tổng hợp từ cảm biến và hệ thống giám sát hành trình
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Quá tốc độ</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500" /> Ra khỏi Geofence</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> Nhiên liệu</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Kỹ thuật & GPS</div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        title="Bảng Thống Kê Các Nhóm Cảnh Báo An Toàn Toàn Hệ Thống"
        subtitle="Phân loại rõ trách nhiệm do người vận hành, thiết bị cảm biến hay sự cố kỹ thuật cơ giới"
        columns={columns}
        data={groupsList}
      />
    </div>
  );
};
