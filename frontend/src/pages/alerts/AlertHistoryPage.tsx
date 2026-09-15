import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, History, XCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { AlertItem, useAppStore } from '../../store/useAppStore';

type HistoryAlert = AlertItem & { resolvedAt?: string; handledAt?: string };
const unwrap = (response: any) => response.data?.data || response.data || {};

export const AlertHistoryPage: React.FC = () => {
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const [items, setItems] = useState<HistoryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, complexCode: selectedKLH !== 'ALL' ? selectedKLH : undefined };
      const [resolved, dismissed] = await Promise.all([
        apiClient.get('/alerts', { params: { ...params, status: 'RESOLVED' } }),
        apiClient.get('/alerts', { params: { ...params, status: 'DISMISSED' } }),
      ]);
      const combined = [...(unwrap(resolved).items || []), ...(unwrap(dismissed).items || [])];
      setItems(combined.sort((a, b) => new Date(b.resolvedAt || b.createdAt).getTime() - new Date(a.resolvedAt || a.createdAt).getTime()));
    } finally {
      setLoading(false);
    }
  }, [selectedKLH]);

  useEffect(() => { void load(); }, [load]);

  const columns: Column<HistoryAlert>[] = [
    { key: 'status', title: 'KẾT QUẢ', render: (row) => <Badge variant={row.status === 'RESOLVED' ? 'green' : 'gray'}>{row.status === 'RESOLVED' ? 'Đã xử lý' : 'Đã bỏ qua'}</Badge> },
    { key: 'title', title: 'CẢNH BÁO', render: (row) => <div><b className="block text-xs">{row.title}</b><span className="line-clamp-2 text-[11px] text-slate-500">{row.message}</span></div> },
    { key: 'category', title: 'PHÂN HỆ', render: (row) => <span className="text-xs font-semibold">{row.category || '—'}</span> },
    { key: 'handlingReason', title: 'KẾT LUẬN / LÝ DO', render: (row) => <span className="text-xs text-slate-700">{row.handlingReason || '—'}</span> },
    { key: 'handledBy', title: 'NGƯỜI XỬ LÝ', render: (row) => <span className="text-xs">{row.handledBy?.fullName || '—'}</span> },
    { key: 'createdAt', title: 'THỜI GIAN', render: (row) => <div className="text-[11px]"><span className="block">Phát sinh: {new Date(row.occurredAt || row.createdAt).toLocaleString('vi-VN')}</span><span className="text-slate-500">Kết thúc: {row.resolvedAt ? new Date(row.resolvedAt).toLocaleString('vi-VN') : '—'}</span></div> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-heading text-2xl font-extrabold text-slate-900">Lịch sử xử lý cảnh báo</h1><p className="text-xs text-slate-500">Lưu người thao tác, thời điểm và lý do đóng/bỏ qua để phục vụ truy vết.</p></div>
        <Button variant="outline" size="md" icon={<Download className="h-4 w-4" />}>Xuất nhật ký</Button>
      </div>
      <KPIGrid cols={3}>
        <StatCard label="Tổng hồ sơ" value={items.length} subValue="Đã kết thúc" icon={<History className="h-5 w-5" />} iconBgColor="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Đã xử lý" value={items.filter((x) => x.status === 'RESOLVED').length} subValue="Có kết luận" icon={<CheckCircle2 className="h-5 w-5" />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard label="Đã bỏ qua" value={items.filter((x) => x.status === 'DISMISSED').length} subValue="Có lý do" icon={<XCircle className="h-5 w-5" />} iconBgColor="bg-slate-100" iconColor="text-slate-600" />
      </KPIGrid>
      <DataTable title="Nhật ký xử lý" subtitle="Dữ liệu thật từ AlertEvent" columns={columns} data={items} isLoading={loading} />
    </div>
  );
};
