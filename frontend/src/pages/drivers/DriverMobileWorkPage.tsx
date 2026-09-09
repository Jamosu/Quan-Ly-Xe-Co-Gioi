import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, MapPin, Play, RefreshCw, Send, Truck, XCircle } from 'lucide-react';
import { schedulingApi, type OperationalWorkOrderRecord } from '../../api/scheduling';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

const orderCode = (order: OperationalWorkOrderRecord) => order.dispatchOrder?.code ?? order.transportOrder?.code ?? order.internalFeedTrip?.code ?? `WO-${order.id}`;
const route = (order: OperationalWorkOrderRecord) => {
  if (order.dispatchOrder) return `${order.dispatchOrder.origin} → ${order.dispatchOrder.destination}`;
  if (order.transportOrder) return `${order.transportOrder.origin ?? 'Điểm lấy'} → ${order.transportOrder.destination ?? 'Điểm giao'}`;
  if (order.internalFeedTrip) return `${order.internalFeedTrip.sourceLocation} → ${order.internalFeedTrip.destinationLocation}`;
  return 'Chưa có tuyến';
};

export const DriverMobileWorkPage: React.FC = () => {
  const [orders, setOrders] = useState<OperationalWorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number>();
  const [error, setError] = useState('');
  const [odo, setOdo] = useState<Record<number, string>>({});
  const [photo, setPhoto] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true); setError('');
    try { setOrders((await schedulingApi.workOrders()).items); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được công việc.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const action = async (id: number, run: () => Promise<unknown>) => {
    setBusyId(id); setError('');
    try { await run(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thực hiện được thao tác.'); }
    finally { setBusyId(undefined); }
  };

  const finish = (order: OperationalWorkOrderRecord) => {
    const endOdoKm = odo[order.id] ? Number(odo[order.id]) : undefined;
    const photoUrl = photo[order.id]?.trim();
    return schedulingApi.finish(order.id, { endOdoKm, evidence: photoUrl ? [{ type: 'COMPLETION_PHOTO', url: photoUrl, capturedAt: new Date().toISOString() }] : [] });
  };

  return <div className="mx-auto min-h-screen max-w-xl space-y-4 bg-slate-50 p-4">
    <header className="sticky top-0 z-10 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-lg"><div><div className="text-xs uppercase tracking-wider text-slate-300">THACO AGRI Driver</div><h1 className="text-xl font-bold">Công việc của tôi</h1></div><Button variant="ghost" className="text-white hover:bg-white/10" icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />} onClick={load} /></header>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {orders.map((order) => {
      const vehicle = order.vehicleAssignments.find((item) => ['ASSIGNED','ACCEPTED'].includes(item.status))?.vehicle;
      const busy = busyId === order.id;
      return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-slate-900">{orderCode(order)}</div><div className="mt-1 text-xs text-slate-500">{new Date(order.plannedStartAt).toLocaleString('vi-VN')} → {new Date(order.plannedEndAt).toLocaleString('vi-VN')}</div></div><Badge variant={order.status === 'OPEN_FOR_CLAIM' ? 'blue' : order.status === 'IN_PROGRESS' ? 'purple' : order.status === 'SUBMITTED_FOR_ACCEPTANCE' ? 'amber' : 'green'}>{order.status}</Badge></div>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><div className="flex gap-2"><MapPin size={17} className="shrink-0 text-blue-600" />{route(order)}</div><div className="flex gap-2"><Truck size={17} className="shrink-0 text-blue-600" />{vehicle ? `${vehicle.code} · ${vehicle.plate ?? vehicle.name}` : 'Chưa gán xe'}</div></div>
        {order.status === 'IN_PROGRESS' && <div className="mt-3 grid gap-3"><label className="text-xs text-slate-600">ODO kết thúc<input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={odo[order.id] ?? ''} onChange={(e) => setOdo((old) => ({ ...old, [order.id]: e.target.value }))} /></label><label className="text-xs text-slate-600">URL ảnh hoàn thành<div className="relative mt-1"><Camera className="absolute left-3 top-2.5 text-slate-400" size={16} /><input className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" placeholder="https://..." value={photo[order.id] ?? ''} onChange={(e) => setPhoto((old) => ({ ...old, [order.id]: e.target.value }))} /></div></label></div>}
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === 'OPEN_FOR_CLAIM' && <Button size="sm" icon={<CheckCircle2 size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.claim(order.id))}>Nhận lệnh</Button>}
          {order.status === 'ASSIGNED' && <><Button size="sm" icon={<CheckCircle2 size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.accept(order.id))}>Xác nhận</Button><Button size="sm" variant="outline" icon={<XCircle size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.cannotAccept(order.id, { reasonCode: 'PERSONAL_REASON', reason: 'Tài xế báo không thể thực hiện trên ứng dụng' }))}>Không thể chạy</Button></>}
          {order.status === 'DRIVER_ACCEPTED' && <Button size="sm" variant="success" icon={<Play size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.start(order.id, { startOdoKm: odo[order.id] ? Number(odo[order.id]) : undefined }))}>Bắt đầu</Button>}
          {order.status === 'IN_PROGRESS' && <Button size="sm" variant="success" icon={<CheckCircle2 size={16} />} disabled={busy} onClick={() => action(order.id, () => finish(order))}>Kết thúc</Button>}
          {order.status === 'IN_PROGRESS' && order.executionSegments.every((segment) => segment.endedAt) && <Button size="sm" icon={<Send size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.submitAcceptance(order.id))}>Gửi nghiệm thu</Button>}
        </div>
      </article>;
    })}
    {!loading && !orders.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Không có công việc phù hợp.</div>}
  </div>;
};
