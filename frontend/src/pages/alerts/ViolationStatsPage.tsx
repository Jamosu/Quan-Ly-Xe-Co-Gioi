import React, { useCallback, useEffect, useState } from 'react';
import { AlertOctagon, BarChart3, CheckCircle2, Clock } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { useAppStore } from '../../store/useAppStore';

interface CategoryStat { category: string; total: number; open: number; resolved: number; critical: number; averageResolutionMinutes: number }
const labels: Record<string, string> = { SOS: 'SOS', MAINTENANCE: 'Bảo dưỡng', EQUIPMENT: 'Thiết bị', DISPATCH: 'Điều xe', FUEL: 'Nhiên liệu', GPS: 'GPS', COMPLIANCE: 'Hồ sơ tài xế', SYSTEM: 'Hệ thống' };

export const ViolationStatsPage: React.FC = () => {
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const [items, setItems] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/alerts/statistics', { params: { complexCode: selectedKLH !== 'ALL' ? selectedKLH : undefined } });
      const data = response.data?.data || response.data || {};
      setItems(Array.isArray(data.byCategory) ? data.byCategory : []);
    } finally { setLoading(false); }
  }, [selectedKLH]);
  useEffect(() => { void load(); }, [load]);

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const resolved = items.reduce((sum, item) => sum + item.resolved, 0);
  const columns: Column<CategoryStat>[] = [
    { key: 'category', title: 'NHÓM CẢNH BÁO', render: (row) => <b>{labels[row.category] || row.category}</b> },
    { key: 'total', title: 'TỔNG PHÁT SINH', sortable: true, render: (row) => <b className="text-rose-600">{row.total}</b> },
    { key: 'open', title: 'ĐANG MỞ', render: (row) => row.open },
    { key: 'resolved', title: 'ĐÃ XỬ LÝ', render: (row) => <span className="font-semibold text-emerald-700">{row.resolved}</span> },
    { key: 'critical', title: 'KHẨN CẤP', render: (row) => row.critical },
    { key: 'averageResolutionMinutes', title: 'TG XỬ LÝ TB', render: (row) => `${row.averageResolutionMinutes} phút` },
  ];
  return <div className="space-y-4">
    <div><h1 className="font-heading text-2xl font-extrabold text-slate-900">Thống kê cảnh báo</h1><p className="text-xs text-slate-500">Tổng hợp theo phân hệ và thời gian xử lý thực tế.</p></div>
    <KPIGrid cols={4}>
      <StatCard label="Tổng phát sinh" value={total} subValue="Trong phạm vi lọc" icon={<BarChart3 className="h-5 w-5" />} iconBgColor="bg-blue-50" iconColor="text-blue-600" />
      <StatCard label="Đang mở" value={items.reduce((s, x) => s + x.open, 0)} subValue="Cần theo dõi" icon={<Clock className="h-5 w-5" />} iconBgColor="bg-amber-50" iconColor="text-amber-600" />
      <StatCard label="Khẩn cấp" value={items.reduce((s, x) => s + x.critical, 0)} subValue="Mức CRITICAL" icon={<AlertOctagon className="h-5 w-5" />} iconBgColor="bg-rose-50" iconColor="text-rose-600" />
      <StatCard label="Tỷ lệ xử lý" value={`${total ? Math.round(resolved * 100 / total) : 0}%`} subValue={`${resolved}/${total} cảnh báo`} icon={<CheckCircle2 className="h-5 w-5" />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" />
    </KPIGrid>
    <DataTable title="Thống kê theo phân hệ" subtitle="SOS, bảo dưỡng, thiết bị, điều xe, nhiên liệu, GPS và hồ sơ tài xế" columns={columns} data={items} isLoading={loading} />
  </div>;
};
