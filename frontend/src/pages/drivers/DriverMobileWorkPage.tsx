import React, { useEffect, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, MapPin, PackageCheck, Play, RefreshCw, RotateCcw, Truck, Wrench, XCircle } from 'lucide-react';
import { ClaimVehicleOption, JourneyAction, OperationalWorkOrderRecord, schedulingApi } from '../../api/scheduling';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

const orderCode = (order: OperationalWorkOrderRecord) => order.dispatchOrder?.code ?? order.transportOrder?.code ?? order.internalFeedTrip?.code ?? `WO-${order.id}`;
const route = (order: OperationalWorkOrderRecord) => {
  if (order.dispatchOrder) return `${order.dispatchOrder.origin} → ${order.dispatchOrder.destination}`;
  if (order.transportOrder) return `${order.transportOrder.origin ?? 'Điểm lấy'} → ${order.transportOrder.destination ?? 'Điểm giao'}`;
  if (order.internalFeedTrip) return `${order.internalFeedTrip.sourceLocation} → ${order.internalFeedTrip.destinationLocation}`;
  return 'Chưa có tuyến';
};

const evidenceType: Partial<Record<JourneyAction, string>> = {
  ARRIVE_WORKSITE: 'ARRIVAL_PHOTO',
  FINISH_WORK: 'WORK_COMPLETION_PHOTO',
  ARRIVE_PICKUP: 'ARRIVAL_PHOTO',
  ARRIVE_DELIVERY: 'DELIVERY_PHOTO',
  COMPLETE_DELIVERY: 'DELIVERY_PHOTO',
  ARRIVE_DEPOT: 'DEPOT_RETURN_PHOTO',
};

const actionLabel: Record<JourneyAction, string> = {
  DEPART_TO_WORK: 'Bắt đầu di chuyển',
  ARRIVE_WORKSITE: 'Đã đến nơi giao việc',
  START_WORK: 'Bắt đầu làm việc',
  FINISH_WORK: 'Kết thúc công việc',
  ARRIVE_PICKUP: 'Đã đến điểm lấy',
  START_LOADING: 'Đang lấy / bốc hàng',
  DEPART_PICKUP: 'Bắt đầu vận chuyển',
  ARRIVE_DELIVERY: 'Đã đến điểm giao',
  START_UNLOADING: 'Đang gỡ / dỡ hàng',
  COMPLETE_DELIVERY: 'Hoàn tất giao hàng',
  RETURN_TO_DEPOT: 'Đang trở về bãi tập kết',
  ARRIVE_DEPOT: 'Đã về bãi',
};

const DRIVER_DELAY_THRESHOLD_MINUTES = 15;

export const getDriverDelayInfo = (order: OperationalWorkOrderRecord, now = Date.now()) => {
  if (!['ASSIGNED', 'DRIVER_ACCEPTED'].includes(order.status)) return null;
  if (order.driverDelay?.isLate) return order.driverDelay;
  const plannedStart = new Date(order.plannedStartAt).getTime();
  if (!Number.isFinite(plannedStart)) return null;
  const delayMinutes = Math.floor((now - plannedStart) / 60_000);
  if (delayMinutes < DRIVER_DELAY_THRESHOLD_MINUTES) return null;
  return {
    isLate: true as const,
    delayMinutes,
    thresholdMinutes: DRIVER_DELAY_THRESHOLD_MINUTES,
    phase: order.status === 'ASSIGNED' ? 'WAITING_ACCEPTANCE' as const : 'WAITING_DEPARTURE' as const,
  };
};

const formatDelayDuration = (minutes: number) => minutes >= 1_440
  ? `${Math.floor(minutes / 1_440)} ngày ${Math.floor((minutes % 1_440) / 60)} giờ`
  : minutes >= 60
    ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`
    : `${minutes} phút`;

export const nextJourneyAction = (order: OperationalWorkOrderRecord): JourneyAction | undefined => {
  if (order.status === 'DRIVER_ACCEPTED') return order.type === 'DISPATCH' ? 'DEPART_TO_WORK' : order.type === 'TRANSPORT' ? 'ARRIVE_PICKUP' : undefined;
  if (order.status !== 'IN_PROGRESS' && order.status !== 'REWORK_REQUIRED') return undefined;
  const leg = order.journeyLegs?.find((item) => !['COMPLETED', 'AT_DEPOT'].includes(item.status)) ?? order.journeyLegs?.[order.journeyLegs.length - 1];
  if (order.type === 'DISPATCH') {
    if (order.dispatchOrder?.status === 'DEPARTED') return 'ARRIVE_WORKSITE';
    if (order.dispatchOrder?.status === 'AT_WORKSITE') return 'START_WORK';
    if (order.dispatchOrder?.status === 'WORKING' && leg?.status === 'WORKING') return 'FINISH_WORK';
    if (order.dispatchOrder?.status === 'WORKING' && leg?.status === 'COMPLETED') return 'RETURN_TO_DEPOT';
    if (order.dispatchOrder?.status === 'RETURNING_TO_DEPOT') return 'ARRIVE_DEPOT';
    return 'DEPART_TO_WORK';
  }
  if (order.type === 'TRANSPORT' && leg) {
    if (leg.status === 'PLANNED') return 'ARRIVE_PICKUP';
    if (leg.status === 'AT_PICKUP') return leg.isEmpty ? 'DEPART_PICKUP' : 'START_LOADING';
    if (leg.status === 'LOADING') return 'DEPART_PICKUP';
    if (leg.status === 'IN_TRANSIT') return 'ARRIVE_DELIVERY';
    if (leg.status === 'AT_DELIVERY') return leg.isEmpty ? 'COMPLETE_DELIVERY' : 'START_UNLOADING';
    if (leg.status === 'UNLOADING') return 'COMPLETE_DELIVERY';
    if (leg.status === 'RETURNING_TO_DEPOT') return 'ARRIVE_DEPOT';
    if (leg.status === 'COMPLETED') return 'RETURN_TO_DEPOT';
  }
  return undefined;
};

export const DriverMobileWorkPage: React.FC = () => {
  const [orders, setOrders] = useState<OperationalWorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number>();
  const [error, setError] = useState('');
  const [odo, setOdo] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<Record<number, File | undefined>>({});
  const [nowMs, setNowMs] = useState(Date.now());
  const [mobilePanel, setMobilePanel] = useState<{ orderId: number; kind: 'BDC1' | 'INCIDENT' } | null>(null);
  const [claimPanel, setClaimPanel] = useState<{ orderId: number; options: ClaimVehicleOption[]; vehicleId: number } | null>(null);
  const [mobileMessage, setMobileMessage] = useState('');
  const [bdc1Form, setBdc1Form] = useState({ hours: '', odo: '', notes: '', clean_vehicle: false, inspect_general_condition: false, lubricate_required_points: false, tighten_bolts: false });
  const [incidentForm, setIncidentForm] = useState({ assetType: 'VEHICLE' as 'VEHICLE' | 'IMPLEMENT', description: '', location: '' });
  const [formPhoto, setFormPhoto] = useState<File>();

  const load = async () => {
    setLoading(true); setError('');
    try { setOrders((await schedulingApi.workOrders()).items); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được công việc.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const action = async (id: number, run: () => Promise<unknown>) => {
    setBusyId(id); setError('');
    try { await run(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thực hiện được thao tác.'); }
    finally { setBusyId(undefined); }
  };

  const runJourney = async (order: OperationalWorkOrderRecord, journeyAction: JourneyAction) => {
    const vehicle = order.vehicleAssignments.find((item) => ['ASSIGNED', 'ACCEPTED'].includes(item.status))?.vehicle;
    const requiresPhoto = !vehicle?.gpsImei && !!evidenceType[journeyAction];
    const file = photos[order.id];
    if (requiresPhoto && !file) throw new Error('Xe không có GPS: vui lòng chụp ảnh có tọa độ trước khi xác nhận mốc.');
    const evidence = file ? await schedulingApi.uploadEvidence(order.id, file, evidenceType[journeyAction] ?? 'OTHER') : undefined;
    await schedulingApi.journeyAction(order.id, journeyAction, { evidenceId: evidence?.id, odoKm: odo[order.id] ? Number(odo[order.id]) : undefined });
    setPhotos((current) => ({ ...current, [order.id]: undefined }));
  };

  const openClaimPanel = async (orderId: number) => {
    setBusyId(orderId); setError('');
    try {
      const result = await schedulingApi.claimOptions(orderId);
      if (!result.options.length) throw new Error('Không có xe phù hợp để nhận chuyến.');
      setClaimPanel({ orderId, options: result.options, vehicleId: result.defaultVehicleId });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách xe có thể chọn.');
    } finally {
      setBusyId(undefined);
    }
  };

  const confirmClaim = async (orderId: number, vehicleId: number) => {
    await schedulingApi.claim(orderId, vehicleId);
    setClaimPanel(null);
  };

  const uploadMobilePhoto = async () => {
    if (!formPhoto) return undefined;
    const body = new FormData();
    body.append('file', formPhoto);
    const response = await apiClient.post('/mobile/sync/attachments', body, { headers: { 'Content-Type': 'multipart/form-data' } });
    const payload = response.data?.data || response.data;
    return payload?.url as string | undefined;
  };

  const submitBdc1 = async (order: OperationalWorkOrderRecord) => {
    const assignment = order.vehicleAssignments.find((item) => ['ASSIGNED', 'ACCEPTED'].includes(item.status));
    if (!assignment) throw new Error('Công việc chưa được gán xe.');
    const photoUrl = await uploadMobilePhoto();
    await apiClient.post('/maintenance/bdc1', {
      vehicleId: assignment.vehicleId,
      openingMachineHours: bdc1Form.hours ? Number(bdc1Form.hours) : undefined,
      openingOdoKm: bdc1Form.odo ? Number(bdc1Form.odo) : undefined,
      checklistJson: {
        clean_vehicle: bdc1Form.clean_vehicle,
        inspect_general_condition: bdc1Form.inspect_general_condition,
        lubricate_required_points: bdc1Form.lubricate_required_points,
        tighten_bolts: bdc1Form.tighten_bolts,
      },
      notes: bdc1Form.notes || undefined,
      photoUrls: photoUrl ? [photoUrl] : undefined,
    });
    setMobileMessage('Đã nộp BDC1 và lưu vào hồ sơ xe.');
    setMobilePanel(null);
    setFormPhoto(undefined);
  };

  const submitIncident = async (order: OperationalWorkOrderRecord) => {
    const assignment = order.vehicleAssignments.find((item) => ['ASSIGNED', 'ACCEPTED'].includes(item.status));
    if (!assignment) throw new Error('Công việc chưa được gán xe.');
    const implement = order.dispatchOrder?.implement || order.transportOrder?.trailer;
    if (incidentForm.assetType === 'IMPLEMENT' && !implement) throw new Error('Công việc này không có thiết bị phụ trợ được phân công.');
    if (!incidentForm.description.trim()) throw new Error('Vui lòng mô tả tình trạng hư hỏng.');
    const photoUrl = await uploadMobilePhoto();
    await apiClient.post('/mobile/driver/incidents', {
      assetType: incidentForm.assetType,
      assetId: incidentForm.assetType === 'IMPLEMENT' ? implement!.id : assignment.vehicleId,
      description: incidentForm.description,
      location: incidentForm.location || order.workLocationText,
      photoUrl,
      orderType: order.type === 'INTERNAL_FEED' ? 'FEED' : order.type,
      orderId: order.dispatchOrder?.id || order.transportOrder?.id || order.id,
    });
    setMobileMessage('Đã tạo phiếu sửa chữa và gửi cảnh báo tới Xưởng BTSC.');
    setMobilePanel(null);
    setFormPhoto(undefined);
  };

  const content = orders.map((order) => {
    const vehicle = order.vehicleAssignments.find((item) => ['ASSIGNED', 'ACCEPTED'].includes(item.status))?.vehicle;
    const busy = busyId === order.id;
    const journeyAction = nextJourneyAction(order);
    const requiresPhoto = !!journeyAction && !vehicle?.gpsImei && !!evidenceType[journeyAction];
    const delay = getDriverDelayInfo(order, nowMs);
    const implement = order.dispatchOrder?.implement || order.transportOrder?.trailer;
    return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-bold text-slate-900">{orderCode(order)}</div><div className="mt-1 text-xs text-slate-500">{new Date(order.plannedStartAt).toLocaleString('vi-VN')} → {new Date(order.plannedEndAt).toLocaleString('vi-VN')}</div></div>
        <div className="flex flex-col items-end gap-1"><Badge variant={order.status === 'IN_PROGRESS' ? 'purple' : order.status === 'SUBMITTED_FOR_ACCEPTANCE' ? 'amber' : 'green'}>{order.status}</Badge>{order.transportOrder && <Badge variant="blue">{order.transportOrder.routeType === 'TWO_WAY' ? '2 chiều' : '1 chiều'}</Badge>}</div>
      </div>
      {delay && <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
        <AlertTriangle size={19} className="mt-0.5 shrink-0 text-rose-600" />
        <div><div className="font-bold">Lệnh đã trễ {formatDelayDuration(delay.delayMinutes)}</div><div className="mt-0.5 text-xs">{delay.phase === 'WAITING_ACCEPTANCE' ? 'Vui lòng xác nhận ngay hoặc báo Không thể chạy để điều độ phân công lại.' : 'Bạn đã nhận lệnh nhưng chưa xuất phát. Hãy bắt đầu di chuyển hoặc liên hệ điều độ nếu có sự cố.'}</div></div>
      </div>}
      <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><div className="flex gap-2"><MapPin size={17} className="shrink-0 text-blue-600" />{route(order)}</div><div className="flex gap-2"><Truck size={17} className="shrink-0 text-blue-600" />{vehicle ? `${vehicle.code} · ${vehicle.plate ?? vehicle.name}` : 'Chưa gán xe'}</div></div>
      {!!order.journeyLegs?.length && <div className="mt-3 space-y-2">{order.journeyLegs.map((leg) => <div key={leg.id} className="rounded-xl border border-slate-200 p-3 text-xs"><div className="flex justify-between gap-2"><b>Chặng {leg.sequence}: {leg.originName} → {leg.destinationName}</b><Badge variant={leg.status === 'COMPLETED' || leg.status === 'AT_DEPOT' ? 'green' : 'blue'}>{leg.status}</Badge></div><div className="mt-1 text-slate-500">{leg.isEmpty ? 'Chạy rỗng' : leg.cargoName || 'Công việc cơ giới'}</div></div>)}</div>}
      {journeyAction && <div className="mt-3 grid gap-3"><label className="text-xs text-slate-600">ODO / giờ máy tại mốc<input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={odo[order.id] ?? ''} onChange={(event) => setOdo((current) => ({ ...current, [order.id]: event.target.value }))} /></label>{(requiresPhoto || evidenceType[journeyAction]) && <label className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-600"><span className="flex items-center gap-2 font-semibold"><Camera size={16} />Ảnh bằng chứng {requiresPhoto ? '(bắt buộc vì xe không có GPS)' : '(không bắt buộc)'}</span><input className="mt-2 block w-full text-xs" type="file" accept="image/*" capture="environment" onChange={(event) => setPhotos((current) => ({ ...current, [order.id]: event.target.files?.[0] }))} /></label>}</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {order.status === 'OPEN_FOR_CLAIM' && <Button size="sm" icon={<CheckCircle2 size={16} />} disabled={busy} onClick={() => void openClaimPanel(order.id)}>Nhận lệnh</Button>}
        {order.status === 'ASSIGNED' && <><Button size="sm" icon={<CheckCircle2 size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.accept(order.id))}>Xác nhận</Button><Button size="sm" variant="outline" icon={<XCircle size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.cannotAccept(order.id, { reasonCode: 'PERSONAL_REASON', reason: 'Tài xế báo không thể thực hiện trên ứng dụng' }))}>Không thể chạy</Button></>}
        {journeyAction && <Button size="sm" variant={journeyAction === 'RETURN_TO_DEPOT' ? 'outline' : 'success'} icon={journeyAction === 'RETURN_TO_DEPOT' ? <RotateCcw size={16} /> : journeyAction.includes('LOADING') || journeyAction.includes('DELIVERY') ? <PackageCheck size={16} /> : <Play size={16} />} disabled={busy} onClick={() => action(order.id, () => runJourney(order, journeyAction))}>{actionLabel[journeyAction]}</Button>}
        {vehicle && <Button size="sm" variant="outline" icon={<ClipboardCheck size={16} />} onClick={() => { setMobileMessage(''); setMobilePanel({ orderId: order.id, kind: 'BDC1' }); }}>BDC1 đầu ca</Button>}
        {vehicle && <Button size="sm" variant="outline" icon={<Wrench size={16} />} onClick={() => { setMobileMessage(''); setIncidentForm((current) => ({ ...current, assetType: 'VEHICLE' })); setMobilePanel({ orderId: order.id, kind: 'INCIDENT' }); }}>Báo hỏng</Button>}
      </div>
      {claimPanel?.orderId === order.id && <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
        <div><b>Chọn xe để thực hiện chuyến</b><p className="mt-1 text-emerald-700">Bạn có thể dùng xe đang phụ trách hoặc tiếp tục dùng xe đang giữ cho chuyến.</p></div>
        <div className="space-y-2">{claimPanel.options.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 ${claimPanel.vehicleId === option.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
          <input type="radio" name={`claim-vehicle-${order.id}`} value={option.id} checked={claimPanel.vehicleId === option.id} onChange={() => setClaimPanel((current) => current ? { ...current, vehicleId: option.id } : current)} />
          <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900">{option.code} · {option.plate ?? option.name}</span><span className="text-slate-500">{option.source === 'DRIVER_CURRENT' ? 'Xe bạn đang phụ trách' : option.source === 'ORDER_RESERVED' ? 'Xe đang giữ cho chuyến' : 'Xe bạn đang phụ trách và cũng là xe của chuyến'}</span></span>
        </label>)}</div>
        <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setClaimPanel(null)}>Đóng</Button><Button size="sm" disabled={busy} onClick={() => action(order.id, () => confirmClaim(order.id, claimPanel.vehicleId))}>Xác nhận nhận chuyến</Button></div>
      </div>}
      {mobilePanel?.orderId === order.id && mobilePanel.kind === 'BDC1' && <div className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs">
        <div><b>Checklist BDC1 hằng ngày</b><p className="text-blue-700">Có thể tiếp tục công việc nếu chưa nộp; hệ thống sẽ lưu việc bỏ qua và phát cảnh báo.</p></div>
        <div className="grid grid-cols-2 gap-2">{[
          ['clean_vehicle', 'Vệ sinh phương tiện'], ['inspect_general_condition', 'Kiểm tra tổng thể'],
          ['lubricate_required_points', 'Bôi trơn'], ['tighten_bolts', 'Siết bulông'],
        ].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg bg-white p-2"><input type="checkbox" checked={Boolean((bdc1Form as any)[key])} onChange={(event) => setBdc1Form((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
        <div className="grid grid-cols-2 gap-2"><input type="number" placeholder="Giờ máy đầu ca" className="rounded-lg border p-2" value={bdc1Form.hours} onChange={(e) => setBdc1Form({ ...bdc1Form, hours: e.target.value })} /><input type="number" placeholder="ODO đầu ca" className="rounded-lg border p-2" value={bdc1Form.odo} onChange={(e) => setBdc1Form({ ...bdc1Form, odo: e.target.value })} /></div>
        <textarea rows={2} placeholder="Ghi chú" className="w-full rounded-lg border p-2" value={bdc1Form.notes} onChange={(e) => setBdc1Form({ ...bdc1Form, notes: e.target.value })} />
        <label className="block rounded-lg border border-dashed border-blue-300 bg-white p-2"><Camera size={15} className="mr-1 inline" />Ảnh minh chứng<input className="mt-1 block w-full" type="file" accept="image/*" capture="environment" onChange={(e) => setFormPhoto(e.target.files?.[0])} /></label>
        <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setMobilePanel(null)}>Đóng</Button><Button size="sm" onClick={() => action(order.id, () => submitBdc1(order))}>Nộp BDC1</Button></div>
      </div>}
      {mobilePanel?.orderId === order.id && mobilePanel.kind === 'INCIDENT' && <div className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs">
        <b>Báo hỏng tài sản đang sử dụng</b>
        <select className="w-full rounded-lg border p-2" value={incidentForm.assetType} onChange={(e) => setIncidentForm({ ...incidentForm, assetType: e.target.value as 'VEHICLE' | 'IMPLEMENT' })}><option value="VEHICLE">Xe · {vehicle?.code}</option>{implement && <option value="IMPLEMENT">Thiết bị phụ trợ · {implement.code} · {implement.name}</option>}</select>
        <textarea rows={3} placeholder="Mô tả tình trạng hư hỏng *" className="w-full rounded-lg border p-2" value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} />
        <input placeholder="Vị trí hiện trường" className="w-full rounded-lg border p-2" value={incidentForm.location} onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })} />
        <label className="block rounded-lg border border-dashed border-rose-300 bg-white p-2"><Camera size={15} className="mr-1 inline" />Ảnh hiện trường<input className="mt-1 block w-full" type="file" accept="image/*" capture="environment" onChange={(e) => setFormPhoto(e.target.files?.[0])} /></label>
        <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setMobilePanel(null)}>Đóng</Button><Button size="sm" onClick={() => action(order.id, () => submitIncident(order))}>Gửi báo hỏng</Button></div>
      </div>}
    </article>;
  });

  return <div className="mx-auto min-h-screen max-w-xl space-y-4 bg-slate-50 p-4"><header className="sticky top-0 z-10 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-lg"><div><div className="text-xs uppercase tracking-wider text-slate-300">THACO AGRI Driver</div><h1 className="text-xl font-bold">Công việc của tôi</h1></div><Button variant="ghost" className="text-white hover:bg-white/10" icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={18} />} onClick={load} /></header>{error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{mobileMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{mobileMessage}</div>}{content}{!loading && !orders.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Không có công việc phù hợp.</div>}</div>;
};
