import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle2, Clock, RefreshCw, Shield, Sliders } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { useAppStore } from '../../store/useAppStore';

interface AlertRuleItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED';
  configJson?: Record<string, unknown>;
  updatedBy?: { fullName: string };
  updatedAt: string;
}

export const AlertThresholdsPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const [rules, setRules] = useState<AlertRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const canEdit = currentUser?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/alerts/rules');
      const payload = response.data?.data || response.data;
      setRules(Array.isArray(payload) ? payload : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const updateRule = async (id: number, patch: Partial<Pick<AlertRuleItem, 'status' | 'severity'>>) => {
    const response = await apiClient.patch(`/alerts/rules/${id}`, patch);
    const updated = response.data?.data || response.data;
    setRules((current) => current.map((rule) => rule.id === id ? updated : rule));
  };

  const columns: Column<AlertRuleItem>[] = [
    { key: 'name', title: 'QUY TẮC', render: (row) => <div><b className="block text-xs">{row.name}</b><code className="text-[10px] text-slate-400">{row.code}</code><p className="mt-1 max-w-xl text-[11px] text-slate-500">{row.description}</p></div> },
    { key: 'category', title: 'PHÂN HỆ', render: (row) => <Badge variant="blue">{row.category}</Badge> },
    { key: 'severity', title: 'MỨC ĐỘ', render: (row) => <select disabled={!canEdit} value={row.severity} onChange={(e) => void updateRule(row.id, { severity: e.target.value as AlertRuleItem['severity'] })} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs disabled:bg-slate-50"><option value="CRITICAL">CRITICAL</option><option value="WARNING">WARNING</option><option value="INFO">INFO</option></select> },
    { key: 'status', title: 'TRẠNG THÁI', render: (row) => <select disabled={!canEdit} value={row.status} onChange={(e) => void updateRule(row.id, { status: e.target.value as AlertRuleItem['status'] })} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold disabled:bg-slate-50"><option value="ACTIVE">Đang bật</option><option value="DRAFT">Nháp</option><option value="DISABLED">Đã tắt</option></select> },
    { key: 'updatedAt', title: 'CẬP NHẬT', render: (row) => <div className="text-[11px]"><span>{new Date(row.updatedAt).toLocaleString('vi-VN')}</span><span className="block text-slate-500">{row.updatedBy?.fullName || 'Hệ thống'}</span></div> },
  ];

  const active = rules.filter((rule) => rule.status === 'ACTIVE').length;
  const draft = rules.filter((rule) => rule.status === 'DRAFT').length;
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="font-heading text-2xl font-extrabold text-slate-900">Quy tắc cảnh báo</h1><p className="text-xs text-slate-500">Các rule chưa có nguồn đo hoặc ngưỡng phê duyệt được giữ ở trạng thái Nháp/Tắt.</p></div>
      <Button variant="outline" size="md" icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={() => void load()}>Làm mới</Button>
    </div>
    {!canEdit && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">Bạn có quyền xem. Chỉ SUPER_ADMIN được thay đổi hoặc kích hoạt quy tắc.</div>}
    <KPIGrid cols={4}>
      <StatCard label="Tổng quy tắc" value={rules.length} subValue="Tất cả phân hệ" icon={<Sliders className="h-5 w-5" />} iconBgColor="bg-blue-50" iconColor="text-blue-600" />
      <StatCard label="Đang hoạt động" value={active} subValue="Có dữ liệu thật" icon={<CheckCircle2 className="h-5 w-5" />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" />
      <StatCard label="Nháp / tắt" value={rules.length - active} subValue={`${draft} rule nháp`} icon={<Clock className="h-5 w-5" />} iconBgColor="bg-amber-50" iconColor="text-amber-600" />
      <StatCard label="Kênh thông báo" value="Chuông Web" subValue="Polling hiện có" icon={<Bell className="h-5 w-5" />} iconBgColor="bg-purple-50" iconColor="text-purple-600" />
    </KPIGrid>
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"><Shield className="h-4 w-4 text-emerald-600" /> GPS offline, mức bồn thấp, hút trộm/sụt dầu, nổ máy tại chỗ, nhiệt độ động cơ và geofence thực chỉ được bật sau khi nguồn đo và ngưỡng được phê duyệt.</div>
    <DataTable title="Danh mục rule" subtitle="Trạng thái ACTIVE / DRAFT / DISABLED được lưu tại máy chủ" columns={columns} data={rules} isLoading={loading} />
  </div>;
};
