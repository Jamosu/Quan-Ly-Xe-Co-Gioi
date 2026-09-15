import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Plus, RefreshCw, Wrench } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Column, DataTable } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';

interface MaintenancePlanItem {
  id: string;
  occurrenceId?: number;
  vehicleId: number;
  vehicleCode: string;
  vehicleType: string;
  metric: 'ENGINE_HOUR' | 'ODOMETER_KM';
  currentMeter: number;
  previousDueMeter: number;
  dueMeter: number;
  progressPercent: number;
  cycleIndex: number;
  milestone: string;
  alertTier: 'GREEN' | 'AMBER' | 'RED';
  status: string;
  explanationRequired: boolean;
  legacy: boolean;
}

const unwrap = (response: any) => response.data?.data || response.data || {};
const meterLabel = (metric: string) => metric === 'ENGINE_HOUR' ? 'giờ máy' : 'km';

export const MaintenancePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MaintenancePlanItem[]>([]);
  const [selected, setSelected] = useState<MaintenancePlanItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = unwrap(await apiClient.get('/maintenance/upcoming-schedule'));
      const occurrences = (payload.occurrences || []).map((item: any): MaintenancePlanItem => {
        const metric = item.standard?.metric || 'ENGINE_HOUR';
        const currentMeter = metric === 'ENGINE_HOUR' ? item.vehicle?.totalMachineHours || 0 : item.vehicle?.odoKm || 0;
        return {
          id: `OCC-${item.id}`, occurrenceId: item.id, vehicleId: item.vehicleId,
          vehicleCode: item.vehicle?.plate || item.vehicle?.code || '—',
          vehicleType: item.vehicle?.vehicleType?.name || item.vehicle?.name || 'Phương tiện',
          metric, currentMeter, previousDueMeter: item.previousDueMeter, dueMeter: item.dueMeter,
          progressPercent: item.progressPercent, cycleIndex: item.cycleIndex,
          milestone: item.milestone?.label || `${item.milestone?.meterValue || item.dueMeter} ${meterLabel(metric)}`,
          alertTier: item.alertTier, status: item.status,
          explanationRequired: item.explanationRequired, legacy: false,
        };
      });
      const legacy = (payload.legacy || []).map((vehicle: any): MaintenancePlanItem => ({
        id: `LEGACY-${vehicle.id}`, vehicleId: vehicle.id,
        vehicleCode: vehicle.plate || vehicle.code, vehicleType: vehicle.vehicleType?.name || vehicle.name,
        metric: 'ENGINE_HOUR', currentMeter: vehicle.hoursSinceLastService || 0,
        previousDueMeter: 0, dueMeter: vehicle.vehicleType?.defaultMaintenanceHours || 250,
        progressPercent: ((vehicle.hoursSinceLastService || 0) / (vehicle.vehicleType?.defaultMaintenanceHours || 250)) * 100,
        cycleIndex: 0, milestone: 'Fallback 250 giờ', alertTier: vehicle.alertTier,
        status: 'LEGACY', explanationRequired: (vehicle.hoursSinceLastService || 0) > (vehicle.vehicleType?.defaultMaintenanceHours || 250) * 1.1,
        legacy: true,
      }));
      setItems([...occurrences, ...legacy]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const sorted = useMemo(() => [...items].sort((a, b) =>
    ({ RED: 0, AMBER: 1, GREEN: 2 }[a.alertTier] - { RED: 0, AMBER: 1, GREEN: 2 }[b.alertTier])
      || b.progressPercent - a.progressPercent
  ), [items]);

  const createRecord = async () => {
    if (!selected || selected.status === 'IN_SERVICE' || selected.status === 'SCHEDULED') return;
    setCreating(true);
    try {
      const response = await apiClient.post('/maintenance/records', {
        occurrenceId: selected.occurrenceId,
        vehicleId: selected.vehicleId,
        currentHours: selected.metric === 'ENGINE_HOUR' ? selected.currentMeter : undefined,
        currentKm: selected.metric === 'ODOMETER_KM' ? selected.currentMeter : undefined,
      });
      const request = unwrap(response);
      setSelected(null);
      navigate(`/xuong-btsc/yeu-cau?tab=maintenance&view=kanban&requestId=${request.id}`);
    } finally { setCreating(false); }
  };

  const columns: Column<MaintenancePlanItem>[] = [
    { key: 'vehicleCode', title: 'PHƯƠNG TIỆN', render: (row) => <div><b className="block text-primary">{row.vehicleCode}</b><span className="text-[10px] text-slate-500">{row.vehicleType}</span></div> },
    { key: 'metric', title: 'BỘ ĐO', render: (row) => <Badge variant="blue">{row.metric === 'ENGINE_HOUR' ? 'Giờ máy' : 'ODO km'}</Badge> },
    { key: 'milestone', title: 'KỲ BDC2', render: (row) => <div><b className="text-xs">{row.milestone}</b><span className="block text-[10px] text-slate-500">Vòng chu kỳ {row.cycleIndex + 1}{row.legacy ? ' · Chế độ tương thích' : ''}</span></div> },
    { key: 'currentMeter', title: 'CHỈ SỐ HIỆN TẠI', render: (row) => <b>{row.currentMeter.toLocaleString('vi-VN')} {meterLabel(row.metric)}</b> },
    { key: 'dueMeter', title: 'KHOẢNG / MỐC ĐẾN HẠN', render: (row) => <div className="text-xs"><span>{row.previousDueMeter.toLocaleString('vi-VN')} → <b>{row.dueMeter.toLocaleString('vi-VN')}</b></span><span className="block text-[10px] text-slate-500">{meterLabel(row.metric)}</span></div> },
    { key: 'progressPercent', title: 'TIẾN ĐỘ', render: (row) => <div className="min-w-28"><div className="mb-1 flex justify-between text-[10px]"><span>{row.progressPercent.toFixed(1)}%</span>{row.explanationRequired && <b className="text-rose-600">Cần giải trình</b>}</div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${row.alertTier === 'RED' ? 'bg-rose-500' : row.alertTier === 'AMBER' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, row.progressPercent)}%` }} /></div></div> },
    { key: 'alertTier', title: 'MÀU', render: (row) => row.alertTier === 'RED' ? <Badge variant="red">Đỏ</Badge> : row.alertTier === 'AMBER' ? <Badge variant="amber">Vàng</Badge> : <Badge variant="green">Xanh</Badge> },
    { key: 'status', title: 'HỒ SƠ', render: (row) => <span className="text-xs font-semibold">{row.status === 'IN_SERVICE' ? 'Đang bảo dưỡng' : row.status === 'SCHEDULED' ? 'Đã lập lịch' : 'Chưa lập phiếu'}</span> },
  ];

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="font-heading text-2xl font-extrabold text-slate-900">Kế hoạch bảo dưỡng đa chu kỳ</h1><p className="text-xs text-slate-500">BDC1 hằng ngày; BDC2 theo bộ mốc giờ máy hoặc km cấu hình riêng cho từng loại xe.</p></div>
      <Button variant="outline" size="md" icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={() => void load()}>Cập nhật chỉ số</Button>
    </div>
    <KPIGrid cols={4}>
      <StatCard label="Tổng kỳ theo dõi" value={items.length} subValue="Bao gồm fallback 250h" icon={<Clock className="h-5 w-5" />} iconBgColor="bg-blue-50" iconColor="text-blue-600" />
      <StatCard label="Xanh · dưới 80%" value={items.filter((x) => x.alertTier === 'GREEN').length} subValue="Còn xa hạn" icon={<CheckCircle2 className="h-5 w-5" />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" />
      <StatCard label="Vàng · 80–99,99%" value={items.filter((x) => x.alertTier === 'AMBER').length} subValue="Chuẩn bị vật tư" icon={<AlertTriangle className="h-5 w-5" />} iconBgColor="bg-amber-50" iconColor="text-amber-600" />
      <StatCard label="Đỏ · từ 100%" value={items.filter((x) => x.alertTier === 'RED').length} subValue={`${items.filter((x) => x.explanationRequired).length} kỳ vượt 110%`} icon={<AlertTriangle className="h-5 w-5" />} iconBgColor="bg-rose-50" iconColor="text-rose-600" />
    </KPIGrid>
    <DataTable title="Các kỳ BDC2" subtitle="Sau mốc lớn nhất, bộ chu kỳ lặp lại nhưng đồng hồ tổng không reset" columns={columns} data={sorted} isLoading={loading} onRowClick={setSelected} />
    {selected && <Modal isOpen onClose={() => setSelected(null)} title={`Kỳ BDC2 · ${selected.vehicleCode}`} subtitle={`${selected.milestone} · ${selected.progressPercent.toFixed(1)}%`} size="md">
      <div className="space-y-4 text-xs">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between"><span>Bộ đo</span><b>{meterLabel(selected.metric)}</b></div>
          <div className="flex justify-between"><span>Chỉ số hiện tại</span><b>{selected.currentMeter.toLocaleString('vi-VN')}</b></div>
          <div className="flex justify-between"><span>Mốc đến hạn</span><b>{selected.dueMeter.toLocaleString('vi-VN')}</b></div>
          <div className="flex justify-between"><span>Biên bản giải trình</span><b className={selected.explanationRequired ? 'text-rose-600' : 'text-emerald-600'}>{selected.explanationRequired ? 'Bắt buộc khi hoàn tất' : 'Không bắt buộc'}</b></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setSelected(null)}>Đóng</Button><Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} disabled={creating || selected.status === 'IN_SERVICE' || selected.status === 'SCHEDULED'} onClick={() => void createRecord()}>{creating ? 'Đang tạo...' : 'Tạo phiếu từ kỳ này'}</Button></div>
      </div>
    </Modal>}
  </div>;
};
