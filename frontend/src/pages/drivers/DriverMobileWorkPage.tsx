import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LogOut,
  MapPin,
  PackageCheck,
  Play,
  RefreshCw,
  RotateCcw,
  Truck,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';
import { ClaimVehicleOption, JourneyAction, OperationalWorkOrderRecord, schedulingApi } from '../../api/scheduling';
import { apiClient, clearSessionAuth, getSessionToken, setSessionAuth } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
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
  if (order.status !== 'ASSIGNED') return null;
  if (order.driverDelay?.isLate) return order.driverDelay;
  const plannedStart = new Date(order.plannedStartAt).getTime();
  if (!Number.isFinite(plannedStart)) return null;
  const delayMinutes = Math.floor((now - plannedStart) / 60_000);
  if (delayMinutes < DRIVER_DELAY_THRESHOLD_MINUTES) return null;
  return {
    isLate: true as const,
    delayMinutes,
    thresholdMinutes: DRIVER_DELAY_THRESHOLD_MINUTES,
    phase: 'WAITING_ACCEPTANCE' as const,
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
  if (order.journeyLegs?.some((item) => item.status === 'AT_DEPOT')) return undefined;
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

const DEMO_DRIVERS = [
  {
    username: 'km.tx001',
    name: 'Nguyễn Văn Minh',
    role: 'Lái máy cày bánh xích (CT65 - CNN-MKX-002)',
    unit: 'Đội Cơ giới Làm đất Daun Penh - KLH Koun Mom',
    taskSummary: '7 lệnh tuần này (đã hoàn thành 2, đang chạy 1, 4 sắp tới)',
  },
  {
    username: 'km.tx031',
    name: 'Ngô Tiến Duy',
    role: 'Lái máy đào bánh xích (CHT-MĐA-001)',
    unit: 'Đội Cơ giới Đào mương - KLH Koun Mom',
    taskSummary: '3 lệnh đào mương & đắp bờ bao trong tuần',
  },
  {
    username: 'km.tx061',
    name: 'Phạm Minh Duy',
    role: 'Lái xe ben vận chuyển vật tư (CHT-XTA-014)',
    unit: 'Đội Xe Vận chuyển - KLH Koun Mom',
    taskSummary: '3 chuyến vận chuyển đá & phân bón',
  },
  {
    username: 'km.tx066',
    name: 'Vannak Dara',
    role: 'Lái xe bồn tiếp nhiên liệu lưu động (CHT-XBO-005)',
    unit: 'Đội Xe Nhiên liệu - KLH Koun Mom',
    taskSummary: '1 nhiệm vụ cấp dầu lưu động hiện trường',
  },
];

export const DriverMobileWorkPage: React.FC = () => {
  const currentUser = useAppStore((s) => s.currentUser);
  const [token, setToken] = useState<string | null>(() => getSessionToken());
  const [showSwitchDriver, setShowSwitchDriver] = useState(false);
  const [orders, setOrders] = useState<OperationalWorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number>();
  const [error, setError] = useState('');
  const [odo, setOdo] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<Record<number, File | undefined>>({});
  const [reportPhotos, setReportPhotos] = useState<Record<number, File | undefined>>({});
  const [nowMs, setNowMs] = useState(Date.now());
  const [mobilePanel, setMobilePanel] = useState<{ orderId: number; kind: 'BDC1' | 'INCIDENT' } | null>(null);
  const [claimPanel, setClaimPanel] = useState<{ orderId: number; options: ClaimVehicleOption[]; vehicleId: number } | null>(null);
  const [mobileMessage, setMobileMessage] = useState('');
  const [bdc1Form, setBdc1Form] = useState({ hours: '', odo: '', notes: '', clean_vehicle: false, inspect_general_condition: false, lubricate_required_points: false, tighten_bolts: false });
  const [incidentForm, setIncidentForm] = useState({ assetType: 'VEHICLE' as 'VEHICLE' | 'IMPLEMENT', description: '', location: '' });
  const [formPhoto, setFormPhoto] = useState<File>();
  const [reportPanel, setReportPanel] = useState<number>();
  const [reportForm, setReportForm] = useState({ quantityToday: '', startOdoKm: '', endOdoKm: '', startMachineHours: '', endMachineHours: '', fuelLiters: '', note: '', workCompleted: false });

  const load = async () => {
    if (!getSessionToken()) return;
    setLoading(true); setError('');
    try { setOrders((await schedulingApi.workOrders()).items); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được công việc.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const loginAsDriver = async (username: string) => {
    setLoading(true);
    setError('');
    try {
      const pass = 'Thaco@1234' + String.fromCharCode(36);
      const res = await apiClient.post('/auth/login', { username, password: pass });
      const data = res.data?.data || res.data;
      setSessionAuth(data.accessToken, data.user);
      setToken(data.accessToken);
      setShowSwitchDriver(false);
      try {
        const orderData = await schedulingApi.workOrders();
        setOrders(orderData.items);
      } catch (err) {
        console.warn('Could not load work orders directly:', err);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Đăng nhập tài xế thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSessionAuth();
    setToken(null);
    setOrders([]);
  };

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
    const reading = Number(odo[order.id]);
    if (!odo[order.id] || !Number.isFinite(reading) || reading < 0) throw new Error('Vui lòng nhập ODO / giờ máy hợp lệ tại mốc hành trình.');
    if (requiresPhoto && !file) throw new Error('Xe không có GPS: vui lòng chụp ảnh có tọa độ trước khi xác nhận mốc.');
    const evidence = file ? await schedulingApi.uploadEvidence(order.id, file, evidenceType[journeyAction] ?? 'OTHER') : undefined;
    await schedulingApi.journeyAction(order.id, journeyAction, { evidenceId: evidence?.id, odoKm: reading });
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
    const activeSession = [...(order.executionSegments ?? [])].reverse().find((session) => session.status !== 'ENDED');
    const canStartSession = !activeSession && ['DRIVER_ACCEPTED', 'IN_PROGRESS', 'REWORK_REQUIRED'].includes(order.status);
    const canRequestCompletion = !activeSession && order.status === 'IN_PROGRESS' && order.executionSegments?.some((session) => session.status === 'ENDED');
    const hasProgressToday = order.dailyProgress?.some((item) => new Date(item.progressDate).toDateString() === new Date().toDateString());
    const currentDispatch = [...(order.dailyDispatchOrders ?? [])].reverse().find((item) => item.driverId && item.status !== 'CANCELLED');
    const dailyReport = currentDispatch?.dailyReport;
    const approvedQuantity = Number(order.completedQuantity ?? 0);
    const targetQuantity = Number(order.targetQuantity ?? 0);
    const remainingQuantity = Math.max(0, Number((targetQuantity - approvedQuantity).toFixed(6)));
    const pendingQuantity = dailyReport?.status !== 'ACCEPTED' ? Number(dailyReport?.quantityToday ?? 0) : 0;
    const reportOpen = Boolean(currentDispatch) && (
      ['AT_WORKSITE', 'WORKING', 'SHIFT_FINISHED', 'WAITING_REPORT', 'WAITING_REVIEW', 'RETURNING_TO_DEPOT', 'COMPLETED', 'ACCEPTED', 'CLOSED'].includes(currentDispatch!.status)
      || order.journeyLegs?.some((leg) => ['AT_DELIVERY', 'WORKING', 'COMPLETED', 'RETURNING_TO_DEPOT', 'AT_DEPOT'].includes(leg.status))
    );
    const deadlineMs = currentDispatch?.reportDeadlineAt ? new Date(currentDispatch.reportDeadlineAt).getTime() : undefined;
    const reportMinutesLeft = deadlineMs ? Math.max(0, Math.ceil((deadlineMs - nowMs) / 60_000)) : undefined;
    const submitReport = async (submit: boolean) => {
      if (!currentDispatch) throw new Error('Không xác định được lệnh ngày hiện tại.');
      const quantityToday = Number(reportForm.quantityToday || 0);
      if (!Number.isFinite(quantityToday) || quantityToday < 0) throw new Error('Khối lượng hôm nay không hợp lệ.');
      if (targetQuantity > 0 && quantityToday > remainingQuantity + 1e-9) throw new Error(`Còn ${remainingQuantity} ${order.targetUnit ?? ''}. Trường này nhập khối lượng, không nhập phần trăm.`);
      if (submit && !reportForm.note.trim()) throw new Error('Vui lòng mô tả công việc đã thực hiện.');
      if (submit && !reportPhotos[order.id] && !dailyReport?.evidenceUrls?.length) throw new Error('Vui lòng chọn ít nhất một ảnh minh chứng.');
      const optionalNumber = (value: string) => value.trim() ? Number(value) : undefined;
      const uploaded = reportPhotos[order.id] ? await schedulingApi.uploadEvidence(order.id, reportPhotos[order.id]!, 'WORK_COMPLETION_PHOTO') : undefined;
      const data = { dispatchOrderId: currentDispatch.id, quantityToday, unit: order.targetUnit, startOdoKm: optionalNumber(reportForm.startOdoKm), endOdoKm: optionalNumber(reportForm.endOdoKm), startMachineHours: optionalNumber(reportForm.startMachineHours), endMachineHours: optionalNumber(reportForm.endMachineHours), fuelLiters: optionalNumber(reportForm.fuelLiters), note: reportForm.note.trim(), workCompleted: reportForm.workCompleted, evidenceUrls: [...(dailyReport?.evidenceUrls ?? []), ...(uploaded ? [uploaded.url] : [])] };
      return submit ? schedulingApi.submitDailyReport(order.id, data) : schedulingApi.saveDailyReport(order.id, data);
    };
    return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-bold text-slate-900">{orderCode(order)}</div><div className="mt-1 text-xs text-slate-500">{new Date(order.plannedStartAt).toLocaleString('vi-VN')} → {new Date(order.plannedEndAt).toLocaleString('vi-VN')}</div></div>
        <div className="flex flex-col items-end gap-1"><Badge variant={order.status === 'IN_PROGRESS' ? 'purple' : order.status === 'SUBMITTED_FOR_ACCEPTANCE' ? 'amber' : 'green'}>{order.status}</Badge>{order.transportOrder && <Badge variant="blue">{order.transportOrder.routeType === 'TWO_WAY' ? '2 chiều' : '1 chiều'}</Badge>}</div>
      </div>
      {delay && <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
        <AlertTriangle size={19} className="mt-0.5 shrink-0 text-rose-600" />
        <div><div className="font-bold">Đã quá giờ nhận lệnh {formatDelayDuration(delay.delayMinutes)}</div><div className="mt-0.5 text-xs">Vui lòng xác nhận ngay hoặc báo Không thể chạy để điều độ phân công lại.</div></div>
      </div>}
      <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><div className="flex gap-2"><MapPin size={17} className="shrink-0 text-blue-600" />{route(order)}</div><div className="flex gap-2"><Truck size={17} className="shrink-0 text-blue-600" />{vehicle ? `${vehicle.code} · ${vehicle.plate ?? vehicle.name}` : 'Chưa gán xe'}</div></div>
      {targetQuantity > 0 && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm"><div className="flex items-center justify-between gap-3"><b className="text-emerald-950">Đã nghiệm thu lũy kế</b><strong className="text-emerald-700">{approvedQuantity}/{targetQuantity} {order.targetUnit ?? ''}</strong></div>{pendingQuantity > 0 && <div className="mt-1 text-xs text-amber-700">Báo cáo hôm nay +{pendingQuantity} {order.targetUnit ?? ''} đang chờ duyệt nên chưa cộng vào lũy kế.</div>}</div>}
      {!!order.journeyLegs?.length && <div className="mt-3 space-y-2">{order.journeyLegs.map((leg) => <div key={leg.id} className="rounded-xl border border-slate-200 p-3 text-xs"><div className="flex justify-between gap-2"><b>Chặng {leg.sequence}: {leg.originName} → {leg.destinationName}</b><Badge variant={leg.status === 'COMPLETED' || leg.status === 'AT_DEPOT' ? 'green' : 'blue'}>{leg.status}</Badge></div><div className="mt-1 text-slate-500">{leg.isEmpty ? 'Chạy rỗng' : leg.cargoName || 'Công việc cơ giới'}</div></div>)}</div>}
      {!!order.executionSegments?.length && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs"><b>Phiên làm việc theo ngày</b><div className="mt-2 space-y-2">{[...order.executionSegments].reverse().map((session) => <div key={session.id} className="grid grid-cols-2 gap-1 rounded-lg bg-slate-50 p-2 sm:grid-cols-4"><span>{new Date(session.workDate || session.startedAt).toLocaleDateString('vi-VN')}</span><b>{session.status}</b><span>Làm: {session.workingMinutes ?? 0} phút</span><span>Nghỉ / dừng: {(session.breakMinutes ?? 0) + (session.pauseMinutes ?? 0)} phút</span><span>ODO: {session.startOdoKm ?? '-'} → {session.endOdoKm ?? '-'}</span><span className="col-span-2">{session.breaks?.length ?? 0} lần nghỉ · {session.pauses?.length ?? 0} lần tạm dừng</span></div>)}</div></div>}
      {!!order.dailyProgress?.length && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs"><b className="text-emerald-900">Báo cáo tiến độ hằng ngày</b><div className="mt-2 space-y-1">{[...order.dailyProgress].reverse().map((progress) => <div key={progress.id} className="flex justify-between gap-3"><span>{new Date(progress.progressDate).toLocaleDateString('vi-VN')}: {progress.quantityToday} {order.targetUnit ?? ''}</span><span>{progress.overallProgressPercent ?? 0}% · lũy kế {progress.accumulatedQuantity}</span></div>)}</div></div>}
      {currentDispatch && <div className={`mt-3 rounded-xl border p-3 text-xs ${dailyReport?.status === 'MISSING' || dailyReport?.status === 'LATE' ? 'border-rose-200 bg-rose-50' : dailyReport?.submittedByType === 'MANAGER' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-center justify-between gap-2"><b>Báo cáo ngày</b><span>{dailyReport?.status ?? (reportOpen ? 'CÓ THỂ NHẬP' : 'CHƯA ĐẾN NƠI LÀM VIỆC')}</span></div>
        {reportOpen && reportMinutesLeft !== undefined && !dailyReport?.reportSubmittedAt && <div className="mt-1">{deadlineMs && nowMs > deadlineMs ? 'Đã quá hạn; báo cáo gửi lúc này được ghi nhận trễ.' : `Còn ${reportMinutesLeft} phút để gửi đúng hạn`}</div>}
        {dailyReport?.submittedByType === 'MANAGER' && <div className="mt-2 space-y-1 border-t border-emerald-200 pt-2 text-emerald-950">
          <b>Đã đồng bộ dữ liệu NS quản lý nhập hộ</b>
          <div>Người nhập: {dailyReport.submittedBy?.fullName ?? 'NS quản lý'} · Lý do: {dailyReport.managerReason ?? 'Sự cố tài khoản/ứng dụng'}</div>
          <div>Tiến độ: {dailyReport.quantityToday} {dailyReport.unit ?? order.targetUnit ?? ''}{dailyReport.note ? ` · ${dailyReport.note}` : ''}</div>
          {!!dailyReport.evidenceUrls?.length && <div className="flex gap-2 overflow-x-auto pt-1">{dailyReport.evidenceUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh nghiệm thu" className="h-20 w-28 rounded-lg border border-emerald-200 object-cover" /></a>)}</div>}
        </div>}
      </div>}
      {(order.driverAssignments?.length > 0 || order.vehicleAssignments?.length > 0) && <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs"><summary className="cursor-pointer font-bold">Lịch sử phân công tài xế / xe</summary><div className="mt-2 space-y-1">{order.driverAssignments.map((item) => <div key={`driver-${item.id}`}>Tài xế {item.driver.user.code} · {item.driver.user.fullName} · {item.status} · {new Date(item.startAt).toLocaleString('vi-VN')}</div>)}{order.vehicleAssignments.map((item) => <div key={`vehicle-${item.id}`}>Xe {item.vehicle.code} · {item.status} · {new Date(item.startAt).toLocaleString('vi-VN')}{item.vehicle.lastGpsUpdate ? ` · GPS ${new Date(item.vehicle.lastGpsUpdate).toLocaleString('vi-VN')}` : ''}</div>)}</div></details>}
      {!!order.evidence?.length && <details className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs"><summary className="cursor-pointer font-bold text-blue-900">Ảnh, GPS và bằng chứng ({order.evidence.length})</summary><div className="mt-2 space-y-1">{order.evidence.map((item) => <div key={item.id}><a className="font-semibold text-blue-700 underline" href={item.url} target="_blank" rel="noreferrer">{item.type}</a> · {new Date(item.capturedAt).toLocaleString('vi-VN')} · {item.lat != null && item.lng != null ? `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}` : item.locationStatus}</div>)}</div></details>}
      {!!order.sosAlerts?.length && <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs"><b className="text-rose-900">SOS liên quan lệnh</b>{order.sosAlerts.map((item) => <div key={item.id} className="mt-1">{item.emergencyType} · {item.status} · {new Date(item.createdAt).toLocaleString('vi-VN')} · {item.lat.toFixed(5)}, {item.lng.toFixed(5)}</div>)}</div>}
      {!!order.events?.length && <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><summary className="cursor-pointer font-bold">Nhật ký thao tác tài xế đã đồng bộ ({order.events.length})</summary><div className="mt-2 max-h-52 space-y-1 overflow-auto">{[...order.events].reverse().map((item) => <div key={item.id}>{new Date(item.occurredAt).toLocaleString('vi-VN')} · <b>{item.action}</b> · {item.actor?.fullName ?? 'Hệ thống'}{item.oldStatus || item.newStatus ? ` · ${item.oldStatus ?? '-'} → ${item.newStatus ?? '-'}` : ''}</div>)}</div></details>}
      {journeyAction && <div className="mt-3 grid gap-3"><label className="text-xs text-slate-600">ODO / giờ máy tại mốc<input type="number" min={0} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={odo[order.id] ?? ''} onChange={(event) => setOdo((current) => ({ ...current, [order.id]: event.target.value }))} /></label>{(requiresPhoto || evidenceType[journeyAction]) && <label className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-600"><span className="flex items-center gap-2 font-semibold"><Camera size={16} />Ảnh bằng chứng {requiresPhoto ? '(bắt buộc vì xe không có GPS)' : '(không bắt buộc)'}</span><input className="mt-2 block w-full text-xs" type="file" accept="image/*" capture="environment" onChange={(event) => setPhotos((current) => ({ ...current, [order.id]: event.target.files?.[0] }))} /></label>}</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {order.status === 'OPEN_FOR_CLAIM' && <Button size="sm" icon={<CheckCircle2 size={16} />} disabled={busy} onClick={() => void openClaimPanel(order.id)}>Nhận lệnh</Button>}
        {order.status === 'ASSIGNED' && <><Button size="sm" icon={<CheckCircle2 size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.accept(order.id))}>Xác nhận</Button><Button size="sm" variant="outline" icon={<XCircle size={16} />} disabled={busy} onClick={() => action(order.id, () => schedulingApi.cannotAccept(order.id, { reasonCode: 'PERSONAL_REASON', reason: 'Tài xế báo không thể thực hiện trên ứng dụng' }))}>Không thể chạy</Button></>}
        {journeyAction && <Button size="sm" variant={journeyAction === 'RETURN_TO_DEPOT' ? 'outline' : 'success'} icon={journeyAction === 'RETURN_TO_DEPOT' ? <RotateCcw size={16} /> : journeyAction.includes('LOADING') || journeyAction.includes('DELIVERY') ? <PackageCheck size={16} /> : <Play size={16} />} disabled={busy} onClick={() => action(order.id, () => runJourney(order, journeyAction))}>{actionLabel[journeyAction]}</Button>}
        {canStartSession && <Button size="sm" variant="success" disabled={busy} onClick={() => action(order.id, () => {
          const reading = Number(odo[order.id]);
          if (!odo[order.id] || !Number.isFinite(reading) || reading < 0) throw new Error('Vui lòng nhập ODO / giờ máy đầu phiên hợp lệ.');
          return schedulingApi.start(order.id, { startOdoKm: reading });
        })}>Tiếp tục lệnh / mở phiên</Button>}
        {activeSession?.status === 'ACTIVE' && <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => action(order.id, async () => {
            const raw = window.prompt('Khối lượng thực hiện hôm nay');
            if (raw === null) return;
            const quantityToday = Number(raw);
            if (!Number.isFinite(quantityToday) || quantityToday < 0) throw new Error('Khối lượng không hợp lệ.');
            await schedulingApi.updateProgress(order.id, { quantityToday });
          })}>Báo tiến độ</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => action(order.id, () => schedulingApi.startBreak(order.id, { type: 'LUNCH' }))}>Nghỉ giữa ca</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => action(order.id, () => schedulingApi.pause(order.id, { reason: 'WAITING_DISPATCH', note: 'Chờ điều độ' }))}>Tạm dừng</Button>
          <Button size="sm" disabled={busy} onClick={() => action(order.id, () => {
            const reading = Number(odo[order.id]);
            if (!odo[order.id] || !Number.isFinite(reading) || reading < 0) throw new Error('Vui lòng nhập ODO / giờ máy cuối phiên hợp lệ.');
            const confirmNoProgress = !hasProgressToday && window.confirm('Xác nhận hôm nay không phát sinh khối lượng?');
            if (!hasProgressToday && !confirmNoProgress) throw new Error('Cần báo tiến độ hoặc xác nhận không phát sinh khối lượng.');
            return schedulingApi.endSession(order.id, { endOdoKm: reading, confirmNoProgress });
          })}>Kết thúc ngày</Button>
        </>}
        {activeSession?.status === 'ON_BREAK' && <Button size="sm" disabled={busy} onClick={() => action(order.id, () => schedulingApi.endBreak(order.id))}>Kết thúc nghỉ</Button>}
        {activeSession?.status === 'PAUSED' && <Button size="sm" disabled={busy} onClick={() => action(order.id, () => schedulingApi.resume(order.id))}>Tiếp tục làm việc</Button>}
        {canRequestCompletion && <Button size="sm" variant="success" disabled={busy} onClick={() => action(order.id, () => schedulingApi.submitAcceptance(order.id))}>Báo hoàn thành công việc</Button>}
        {currentDispatch && reportOpen && !['ACCEPTED', 'SUBMITTED_ON_TIME', 'LATE', 'SUBMITTED_BY_MANAGER'].includes(dailyReport?.status ?? '') && <Button size="sm" variant={dailyReport?.status === 'MISSING' ? 'outline' : 'success'} icon={<FileText size={16} />} onClick={() => setReportPanel(reportPanel === order.id ? undefined : order.id)}>{dailyReport?.status === 'MISSING' ? 'Gửi báo cáo trễ' : dailyReport?.status === 'REVISION_REQUESTED' ? 'Sửa báo cáo ngày' : 'Ghi báo cáo ngày'}</Button>}
        {vehicle && <Button size="sm" variant="outline" icon={<ClipboardCheck size={16} />} onClick={() => { setMobileMessage(''); setMobilePanel({ orderId: order.id, kind: 'BDC1' }); }}>BDC1 đầu ca</Button>}
        {vehicle && <Button size="sm" variant="outline" icon={<Wrench size={16} />} onClick={() => { setMobileMessage(''); setIncidentForm((current) => ({ ...current, assetType: 'VEHICLE' })); setMobilePanel({ orderId: order.id, kind: 'INCIDENT' }); }}>Báo hỏng</Button>}
      </div>
      {reportPanel === order.id && currentDispatch && <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs"><b>Báo cáo ngày · {currentDispatch.code}</b>{targetQuantity > 0 && <div className="rounded-lg bg-white p-2 text-emerald-800">Đã nghiệm thu: <b>{approvedQuantity}/{targetQuantity} {order.targetUnit ?? ''}</b>. Còn tối đa <b>{remainingQuantity} {order.targetUnit ?? ''}</b>.</div>}<label className="block font-semibold text-slate-700">Khối lượng hoàn thành trong ngày ({order.targetUnit ?? 'đơn vị'})<input type="number" min={0} max={remainingQuantity} placeholder={`Tối đa ${remainingQuantity} ${order.targetUnit ?? ''}`} className="mt-1 w-full rounded-lg border p-2 font-normal" value={reportForm.quantityToday} onChange={(e) => setReportForm({ ...reportForm, quantityToday: e.target.value })} /></label><div className="text-rose-700">Nhập khối lượng thực tế, không nhập số vượt qua thực tế.</div><div className="grid grid-cols-2 gap-2"><input type="number" min={0} placeholder="Nhiên liệu" className="rounded-lg border p-2" value={reportForm.fuelLiters} onChange={(e) => setReportForm({ ...reportForm, fuelLiters: e.target.value })} /><input type="number" min={0} placeholder="ODO đầu" className="rounded-lg border p-2" value={reportForm.startOdoKm} onChange={(e) => setReportForm({ ...reportForm, startOdoKm: e.target.value })} /><input type="number" min={0} placeholder="ODO cuối" className="rounded-lg border p-2" value={reportForm.endOdoKm} onChange={(e) => setReportForm({ ...reportForm, endOdoKm: e.target.value })} /><input type="number" min={0} placeholder="Giờ máy đầu" className="rounded-lg border p-2" value={reportForm.startMachineHours} onChange={(e) => setReportForm({ ...reportForm, startMachineHours: e.target.value })} /><input type="number" min={0} placeholder="Giờ máy cuối" className="rounded-lg border p-2" value={reportForm.endMachineHours} onChange={(e) => setReportForm({ ...reportForm, endMachineHours: e.target.value })} /></div><textarea rows={3} placeholder="Hôm nay đã làm những gì?" className="w-full rounded-lg border p-2" value={reportForm.note} onChange={(e) => setReportForm({ ...reportForm, note: e.target.value })} /><label className="block rounded-lg border border-dashed border-emerald-300 bg-white p-3 font-semibold text-emerald-800"><span className="flex items-center gap-2"><Camera size={16} />Ảnh minh chứng bắt buộc khi gửi</span><input className="mt-2 block w-full" type="file" accept="image/*" capture="environment" onChange={(event) => setReportPhotos((current) => ({ ...current, [order.id]: event.target.files?.[0] }))} /></label><label className="flex items-center gap-2 rounded-lg bg-white p-2"><input type="checkbox" disabled={targetQuantity > 0 && approvedQuantity + Number(reportForm.quantityToday || 0) < targetQuantity} checked={reportForm.workCompleted} onChange={(e) => setReportForm({ ...reportForm, workCompleted: e.target.checked })} />Tôi xác nhận đã hoàn thành đủ {targetQuantity} {order.targetUnit ?? ''}</label><div className="text-slate-500">Quản lý chỉ nghiệm thu cuối khi tổng khối lượng đạt {order.targetQuantity} {order.targetUnit ?? ''}.</div><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => action(order.id, () => submitReport(false))}>Lưu nháp</Button><Button size="sm" onClick={() => action(order.id, () => submitReport(true))}>{dailyReport?.status === 'MISSING' ? 'Gửi báo cáo trễ' : 'Gửi báo cáo'}</Button></div></div>}
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

  if (!token) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-slate-900 text-white p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                🚜
              </div>
              <div>
                <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">THACO AGRI</div>
                <div className="text-base font-bold text-white">App Di Động Lái Xe</div>
              </div>
            </div>
            <a href="/login" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft size={14} /> Cổng Web
            </a>
          </div>

          <div className="my-6 text-center">
            <h2 className="text-xl font-bold text-white">Chọn tài khoản lái xe thực tế</h2>
            <p className="text-xs text-slate-400 mt-1">Các tài xế đã được phân công đầy đủ lệnh điều xe trong tuần này</p>
          </div>

          {error && <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">{error}</div>}

          <div className="space-y-3">
            {DEMO_DRIVERS.map((d) => (
              <button
                key={d.username}
                disabled={loading}
                onClick={() => loginAsDriver(d.username)}
                className="w-full text-left p-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 transition-all flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <div className="font-bold text-sm text-white group-hover:text-emerald-300">
                    {d.name} <span className="text-xs text-slate-400 font-normal">({d.username})</span>
                  </div>
                  <div className="text-xs text-emerald-400 mt-0.5">{d.role}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{d.taskSummary}</div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-emerald-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          Mật khẩu chung hệ thống: <b className="text-slate-300">{'Thaco@1234' + String.fromCharCode(36)}</b>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl space-y-4 bg-slate-50 p-3 sm:p-4">
      {/* Mobile App Header */}
      <header className="sticky top-0 z-20 rounded-2xl bg-slate-900 p-4 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/40">
              🚜
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">THACO AGRI Driver App</div>
              <h1 className="text-base font-bold leading-tight">{currentUser?.fullName || 'Tài xế'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={16} />}
              onClick={load}
            />
            <button
              onClick={() => setShowSwitchDriver(!showSwitchDriver)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 cursor-pointer"
              title="Đổi tài xế"
            >
              <User size={13} />
              <span>Đổi TX</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-300 hover:bg-slate-700 border border-slate-700 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Switch Driver Panel */}
        {showSwitchDriver && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
            <div className="text-xs text-slate-300 font-semibold">Chọn tài xế khác để xem công việc:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DEMO_DRIVERS.map((d) => (
                <button
                  key={d.username}
                  onClick={() => loginAsDriver(d.username)}
                  className={`text-left p-2 rounded-lg text-xs border transition-colors cursor-pointer ${currentUser?.username === d.username
                      ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                  <div className="font-bold">{d.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{d.role}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{currentUser?.unit || 'KLH Koun Mom'} · Tuần 21/09 - 27/09</span>
          </div>
          <a href="/login" className="text-slate-400 hover:text-emerald-400 flex items-center gap-1">
            <span>Cổng Web</span>
            <ArrowLeft size={12} className="rotate-180" />
          </a>
        </div>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {mobileMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{mobileMessage}</div>}

      {/* Task List */}
      <div className="space-y-4">
        {content}
      </div>

      {!loading && !orders.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Không có công việc nào được phân công trong tuần này.
        </div>
      )}
    </div>
  );
};
