import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, CheckCircle2, Clock, ExternalLink, Eye, Info, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { AlertItem, useAppStore } from '../../store/useAppStore';
import { ALERT_CATEGORY_LABELS, compareOperationalAlerts, navigateToAlert } from '../../utils/alertNavigation';

const categoryLabels = ALERT_CATEGORY_LABELS;

const unwrap = (response: any) => response.data?.data || response.data || {};

export const UnresolvedAlertsPage: React.FC = () => {
  const { systemAlerts: globalAlerts, setSystemAlerts, markAlertRead, selectedKLH } = useAppStore();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [readState, setReadState] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const payload = unwrap(await apiClient.get('/alerts', {
        params: {
          limit: 100,
          readState,
          category: category || undefined,
          complexCode: selectedKLH !== 'ALL' ? selectedKLH : undefined,
        },
      }));
      const nextItems = Array.isArray(payload.items) ? payload.items : [];
      setItems(nextItems);
      if (readState === 'ALL' && !category) setSystemAlerts(nextItems);
    } finally {
      setLoading(false);
    }
  }, [category, readState, selectedKLH, setSystemAlerts]);

  useEffect(() => {
    void fetchAlerts();
    const timer = window.setInterval(() => void fetchAlerts(), 30_000);
    return () => window.clearInterval(timer);
  }, [fetchAlerts]);

  const alerts = useMemo(() => [...items].sort(compareOperationalAlerts), [items]);

  const openDetails = useCallback(async (alert: AlertItem) => {
    let opened = alert;
    if (!alert.isRead) {
      const receipt = unwrap(await apiClient.patch(`/alerts/${alert.id}/read`));
      markAlertRead(alert.id, receipt.readAt);
      opened = { ...alert, isRead: true, readAt: receipt.readAt };
      setItems((current) => current.map((item) => String(item.id) === String(alert.id) ? opened : item));
    }
    setSelected(opened);
    setReason(opened.handlingReason || '');
    setSearchParams({ alertId: String(opened.id) }, { replace: true });
  }, [markAlertRead, setSearchParams]);

  useEffect(() => {
    const alertId = searchParams.get('alertId');
    const target = alertId ? alerts.find((item) => String(item.id) === alertId) : undefined;
    if (target && String(selected?.id) !== alertId) void openDetails(target);
  }, [alerts, openDetails, searchParams, selected?.id]);

  const openTarget = useCallback(async (alert: AlertItem) => {
    await navigateToAlert(alert, navigate, markAlertRead, (readAt) => {
      setItems((current) => current.map((item) => String(item.id) === String(alert.id)
        ? { ...item, isRead: true, readAt }
        : item));
    });
  }, [markAlertRead, navigate]);

  const closeModal = () => {
    setSelected(null);
    setReason('');
    setSearchParams({}, { replace: true });
  };

  const changeStatus = async (status: 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED') => {
    if (!selected) return;
    if ((status === 'RESOLVED' || status === 'DISMISSED') && !reason.trim()) return;
    await apiClient.patch(`/alerts/${selected.id}/status`, { status, reason: reason.trim() || undefined });
    closeModal();
    await fetchAlerts();
  };

  const markAll = async () => {
    await apiClient.post('/alerts/read-all', null, {
      params: { category: category || undefined, complexCode: selectedKLH !== 'ALL' ? selectedKLH : undefined },
    });
    setItems((current) => current.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
    setSystemAlerts(globalAlerts.map((item) => !category || item.category === category
      ? { ...item, isRead: true, readAt: new Date().toISOString() }
      : item));
    await fetchAlerts();
  };

  const columns: Column<AlertItem>[] = [
    {
      key: 'isRead', title: 'TRẠNG THÁI XEM', render: (row) => row.isRead
        ? <Badge variant="gray">Đã xem</Badge>
        : <Badge variant="blue" dot>Chưa xem</Badge>,
    },
    {
      key: 'severity', title: 'MỨC ĐỘ', render: (row) => row.severity === 'CRITICAL'
        ? <Badge variant="red" dot>Khẩn cấp</Badge>
        : row.severity === 'WARNING' ? <Badge variant="amber" dot>Cảnh báo</Badge> : <Badge variant="blue">Thông tin</Badge>,
    },
    { key: 'category', title: 'PHÂN HỆ', render: (row) => <Badge variant={row.category === 'SOS' ? 'red' : 'gray'}>{categoryLabels[row.category || ''] || row.category || 'Khác'}</Badge> },
    {
      key: 'title', title: 'NỘI DUNG', render: (row) => (
        <div className={row.isRead ? 'opacity-65' : ''}>
          <strong className="block text-xs text-slate-900">{row.title}</strong>
          <span className="line-clamp-2 text-[11px] text-slate-500">{row.message}</span>
        </div>
      ),
    },
    {
      key: 'vehicle', title: 'TÀI SẢN', render: (row) => (
        <div className="text-xs">
          <b>{row.vehicle?.plate || row.vehicle?.code || row.implement?.code || '—'}</b>
          <span className="block text-[10px] text-slate-500">{row.driver?.fullName || row.implement?.name || row.location || ''}</span>
        </div>
      ),
    },
    {
      key: 'createdAt', title: 'PHÁT SINH', render: (row) => (
        <span className="text-xs">{new Date(row.occurredAt || row.createdAt).toLocaleString('vi-VN')}</span>
      ),
    },
    {
      key: 'status', title: 'XỬ LÝ', render: (row) => (
        <Badge variant={row.status === 'IN_PROGRESS' ? 'amber' : 'gray'}>{row.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Đang mở'}</Badge>
      ),
    },
    {
      key: 'actions', title: 'THAO TÁC', align: 'right', render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => void openDetails(row)} title="Xem chi tiết và cập nhật trạng thái" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => void openTarget(row)} title="Đi tới màn hình xử lý" className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const unread = alerts.filter((item) => !item.isRead).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-slate-900 sm:text-2xl">Trung tâm cảnh báo</h1>
          <p className="mt-0.5 text-xs text-slate-500">Trạng thái xem là riêng cho từng người; trạng thái xử lý được dùng chung toàn hệ thống.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={() => void fetchAlerts()}>Làm mới</Button>
          <Button variant="primary" size="md" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void markAll()}>Đánh dấu tất cả đã xem</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select value={readState} onChange={(e) => setReadState(e.target.value as typeof readState)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
          <option value="ALL">Tất cả trạng thái xem</option><option value="UNREAD">Chưa xem</option><option value="READ">Đã xem</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
          <option value="">Tất cả phân hệ</option>
          {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <KPIGrid cols={4}>
        <StatCard label="Chưa xem" value={unread} subValue="Theo tài khoản hiện tại" icon={<Clock className="h-5 w-5" />} iconBgColor="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Khẩn cấp" value={alerts.filter((a) => a.severity === 'CRITICAL').length} subValue="Ưu tiên xử lý số 1" icon={<AlertOctagon className="h-5 w-5" />} iconBgColor="bg-rose-50" iconColor="text-rose-600" />
        <StatCard label="Cảnh báo" value={alerts.filter((a) => a.severity === 'WARNING').length} subValue="Cần theo dõi" icon={<AlertTriangle className="h-5 w-5" />} iconBgColor="bg-amber-50" iconColor="text-amber-600" />
        <StatCard label="Thông tin" value={alerts.filter((a) => a.severity === 'INFO').length} subValue="Nhắc nhở vận hành" icon={<Info className="h-5 w-5" />} iconBgColor="bg-sky-50" iconColor="text-sky-600" />
      </KPIGrid>

      <DataTable title="Cảnh báo đang mở" subtitle="Sắp xếp: Chưa xem → Cứu hộ SOS → Khẩn cấp/Cảnh báo/Thông tin → mới nhất" columns={columns} data={alerts} isLoading={loading} onRowClick={(row) => void openTarget(row)} />

      {selected && (
        <Modal isOpen onClose={closeModal} title={selected.title} subtitle={`${categoryLabels[selected.category || ''] || selected.category || 'Cảnh báo'} · ${selected.isRead ? 'Đã xem' : 'Chưa xem'}`} size="md">
          <div className="space-y-4 text-xs text-slate-700">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold leading-relaxed text-slate-900">{selected.message}</p>
              <div>Thời gian: <b>{new Date(selected.occurredAt || selected.createdAt).toLocaleString('vi-VN')}</b></div>
              {selected.location && <div>Vị trí: <b>{selected.location}</b></div>}
              <div>Trạng thái xử lý: <b>{selected.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Đang mở'}</b></div>
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Nhập lý do/kết luận bắt buộc khi đóng hoặc bỏ qua..." className="w-full rounded-xl border border-slate-200 p-3" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeModal}>Đóng cửa sổ</Button>
              <Button variant="outline" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => void openTarget(selected)}>Đi tới xử lý</Button>
              {selected.status !== 'IN_PROGRESS' && <Button variant="outline" size="sm" onClick={() => void changeStatus('IN_PROGRESS')}>Bắt đầu xử lý</Button>}
              <Button variant="outline" size="sm" onClick={() => void changeStatus('DISMISSED')} disabled={!reason.trim()}>Bỏ qua</Button>
              <Button variant="primary" size="sm" onClick={() => void changeStatus('RESOLVED')} disabled={!reason.trim()}>Hoàn tất xử lý</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
