import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterBar } from '../../components/filters/FilterBar';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/data-display/StatCard';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import {
  Navigation,
  Maximize2,
  Zap,
  Truck,
  AlertTriangle,
  Clock,
  Fuel,
  CheckCircle2,
  MapPin,
  Search,
  ShieldAlert,
} from 'lucide-react';

interface RealtimeVehicle {
  id: string;
  code: string;
  model: string;
  activity: string;
  driver: string;
  speed: string;
  fuelPercent: string;
  status: 'ordered' | 'free' | 'stopped' | 'speed_warning';
  coords: { x: number; y: number };
}

interface RescueVehicleContext {
  id: number;
  code: string;
  plate?: string;
  name: string;
  unit?: string;
  status?: string;
  currentLat?: number | null;
  currentLng?: number | null;
  currentLocationName?: string | null;
  lastGpsUpdate?: string | null;
  defaultDriver?: { id: number; fullName: string; phone?: string; currentShiftStatus?: string } | null;
}

interface SosRescueContext {
  sos: {
    id: number;
    status: string;
    emergencyType: string;
    description: string;
    lotLocation: string;
    lat: number;
    lng: number;
    createdAt: string;
    driver: { id: number; fullName: string; phone?: string };
  };
  incidentVehicle: RescueVehicleContext;
  rescueOrder?: {
    id: number;
    code: string;
    status: string;
    plannedEndTime?: string;
    vehicle?: RescueVehicleContext | null;
    driver?: { id: number; fullName: string; phone?: string } | null;
  } | null;
  candidateVehicles: RescueVehicleContext[];
  candidateDrivers: Array<{ id: number; code: string; fullName: string; phone?: string; unit: string }>;
  serverTime: string;
}

const inputDateTime = (value: Date) => {
  const shifted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
};

const gpsAgeLabel = (value?: string | null) => {
  if (!value) return 'Chưa có thời gian cập nhật GPS';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Vừa cập nhật';
  if (minutes < 60) return `Cập nhật ${minutes} phút trước`;
  return `Cập nhật ${Math.floor(minutes / 60)} giờ trước`;
};

export const GPSRealtimePage: React.FC = () => {
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const setHeaderAlert = useAppStore((state) => state.setHeaderAlert);
  const [searchParams] = useSearchParams();
  const sosId = Number(searchParams.get('sosId')) || null;
  const [vehiclesList, setVehiclesList] = useState<RealtimeVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<RealtimeVehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [rescueContext, setRescueContext] = useState<SosRescueContext | null>(null);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [rescueSaving, setRescueSaving] = useState(false);
  const [rescueVehicleId, setRescueVehicleId] = useState('');
  const [rescueDriverId, setRescueDriverId] = useState('');
  const [plannedEndTime, setPlannedEndTime] = useState(() => inputDateTime(new Date(Date.now() + 2 * 60 * 60_000)));

  const fetchRescueContext = useCallback(async () => {
    if (!sosId) {
      setRescueContext(null);
      return;
    }
    setRescueLoading(true);
    try {
      const response = await apiClient.get(`/workshop/sos/${sosId}/rescue-context`);
      const payload = response.data?.data || response.data;
      setRescueContext(payload);
      if (!rescueVehicleId && payload?.candidateVehicles?.length === 1) {
        const vehicle = payload.candidateVehicles[0];
        setRescueVehicleId(String(vehicle.id));
        if (vehicle.defaultDriver?.id) setRescueDriverId(String(vehicle.defaultDriver.id));
      }
    } catch {
      setRescueContext(null);
      setHeaderAlert({ type: 'error', message: `Không tải được ngữ cảnh cứu hộ SOS #${sosId}.` });
    } finally {
      setRescueLoading(false);
    }
  }, [rescueVehicleId, setHeaderAlert, sosId]);

  useEffect(() => {
    void fetchRescueContext();
    if (!sosId) return;
    const timer = window.setInterval(() => void fetchRescueContext(), 30_000);
    return () => window.clearInterval(timer);
  }, [fetchRescueContext, sosId]);

  const dispatchRescue = async () => {
    if (!sosId || !rescueVehicleId || !rescueDriverId || !plannedEndTime) {
      setHeaderAlert({ type: 'warning', message: 'Chọn xe, tài xế và thời gian dự kiến hoàn tất cứu hộ.' });
      return;
    }
    setRescueSaving(true);
    try {
      const response = await apiClient.post(`/workshop/sos/${sosId}/dispatch`, {
        rescueVehicleId: Number(rescueVehicleId),
        driverId: Number(rescueDriverId),
        plannedEndTime: new Date(plannedEndTime).toISOString(),
      });
      setRescueContext(response.data?.data || response.data);
      setHeaderAlert({ type: 'success', message: 'Đã tạo và phân công lệnh cứu hộ khẩn cấp.' });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Không thể phân công xe cứu hộ.';
      setHeaderAlert({ type: 'error', message: Array.isArray(message) ? message.join(', ') : message });
    } finally {
      setRescueSaving(false);
    }
  };

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/vehicles', {
          params: {
            limit: 100,
            complexCode: selectedKLH !== 'ALL' ? selectedKLH : undefined,
          },
        });
        const items = res.data?.data?.items || res.data?.items || res.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setVehiclesList(
            items.map((v: any, index: number) => {
              const capacity = v.fuelCapacity || 150;
              const current = v.fuelLevel || 0;
              const percent = capacity > 0 ? Math.round((current / capacity) * 100) : 50;
              return {
                id: `V-${v.id}`,
                code: v.plate || v.code,
                model: v.name || v.type?.name || 'Phương tiện',
                activity: v.currentStatus || 'Sẵn sàng điều phối',
                driver: v.driver?.fullName || 'Chưa gán tài xế',
                speed: v.currentSpeed ? `${v.currentSpeed} km/h` : '0 km/h',
                fuelPercent: `${percent}%`,
                status: (v.status === 'IN_USE' ? 'ordered' : v.status === 'AVAILABLE' ? 'free' : 'stopped') as any,
                coords: {
                  x: 20 + ((index * 17) % 60),
                  y: 20 + ((index * 23) % 60),
                },
              };
            })
          );
        } else {
          setVehiclesList([]);
        }
      } catch (err) {
        setVehiclesList([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchVehicles();
  }, [selectedKLH]);

  const filteredVehicles = vehiclesList.filter(
    (v) =>
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.activity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sosMarkers = useMemo(() => {
    if (!rescueContext) return [];
    const raw = [
      {
        key: 'incident',
        label: `Xe phát SOS · ${rescueContext.incidentVehicle.plate || rescueContext.incidentVehicle.code}`,
        lat: rescueContext.sos.lat,
        lng: rescueContext.sos.lng,
        tone: 'bg-rose-600 text-white ring-4 ring-rose-300/40',
      },
      rescueContext.rescueOrder?.vehicle?.currentLat != null && rescueContext.rescueOrder.vehicle.currentLng != null
        ? {
            key: 'rescue',
            label: `Xe cứu hộ · ${rescueContext.rescueOrder.vehicle.plate || rescueContext.rescueOrder.vehicle.code}`,
            lat: rescueContext.rescueOrder.vehicle.currentLat,
            lng: rescueContext.rescueOrder.vehicle.currentLng,
            tone: 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-300/30',
          }
        : null,
    ].filter(Boolean) as Array<{ key: string; label: string; lat: number; lng: number; tone: string }>;
    const minLat = Math.min(...raw.map((point) => point.lat));
    const maxLat = Math.max(...raw.map((point) => point.lat));
    const minLng = Math.min(...raw.map((point) => point.lng));
    const maxLng = Math.max(...raw.map((point) => point.lng));
    return raw.map((point, index) => ({
      ...point,
      x: raw.length === 1 ? 50 : 18 + ((point.lng - minLng) / Math.max(maxLng - minLng, 0.000001)) * 64,
      y: raw.length === 1 ? 50 : 18 + ((maxLat - point.lat) / Math.max(maxLat - minLat, 0.000001)) * 64,
      index,
    }));
  }, [rescueContext]);

  const selectedCandidate = rescueContext?.candidateVehicles.find((vehicle) => String(vehicle.id) === rescueVehicleId);

  const handleRescueVehicleChange = (value: string) => {
    setRescueVehicleId(value);
    const vehicle = rescueContext?.candidateVehicles.find((item) => String(item.id) === value);
    setRescueDriverId(vehicle?.defaultDriver?.id ? String(vehicle.defaultDriver.id) : '');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            Bản đồ GPS Realtime toàn đội xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát vị trí trực tiếp, tốc độ, mức nhiên liệu que đo và phân biệt xe chạy theo lệnh vs xe chạy tự do.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<Maximize2 className="w-4 h-4" />}>
            Bản đồ toàn màn hình
          </Button>
          <Button variant="primary" size="md" icon={<Zap className="w-4 h-4" />}>
            Lệnh khẩn cấp
          </Button>
        </div>
      </div>

      {sosId && (
        <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-card">
          <div className="flex flex-col gap-3 bg-rose-600 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><ShieldAlert className="h-5 w-5" /></span>
              <div>
                <h2 className="text-sm font-extrabold">Theo dõi cứu hộ SOS #{sosId}</h2>
                <p className="text-[11px] text-rose-100">Vị trí bên dưới lấy từ tọa độ sự cố và telemetry GPS, không dùng marker mô phỏng.</p>
              </div>
            </div>
            {rescueContext && <Badge variant={rescueContext.rescueOrder ? 'green' : 'amber'}>{rescueContext.rescueOrder ? 'Đã phân công cứu hộ' : 'Chờ phân công'}</Badge>}
          </div>

          {rescueLoading && !rescueContext ? (
            <div className="p-6 text-center text-xs text-slate-500">Đang tải dữ liệu SOS và GPS...</div>
          ) : rescueContext ? (
            <div className="grid gap-4 p-4 lg:grid-cols-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-rose-700">Xe phát SOS</p>
                <p className="mt-1 text-sm font-black text-slate-900">{rescueContext.incidentVehicle.plate || rescueContext.incidentVehicle.code}</p>
                <p className="text-xs text-slate-700">{rescueContext.incidentVehicle.name}</p>
                <p className="mt-2 text-[11px] text-slate-600">{rescueContext.sos.lotLocation}</p>
                <p className="font-mono text-[10px] text-slate-500">{rescueContext.sos.lat.toFixed(6)}, {rescueContext.sos.lng.toFixed(6)}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">GPS xe: {gpsAgeLabel(rescueContext.incidentVehicle.lastGpsUpdate)}</p>
                {(!rescueContext.incidentVehicle.lastGpsUpdate || new Date(rescueContext.incidentVehicle.lastGpsUpdate) < new Date(rescueContext.sos.createdAt)) && (
                  <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Telemetry của xe cũ hơn thời điểm phát SOS; đang dùng tọa độ SOS làm vị trí sự cố.</p>
                )}
              </div>

              {rescueContext.rescueOrder ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Xe cứu hộ được điều</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{rescueContext.rescueOrder.vehicle?.plate || rescueContext.rescueOrder.vehicle?.code || 'Chưa có xe'}</p>
                  <p className="text-xs text-slate-700">Tài xế: {rescueContext.rescueOrder.driver?.fullName || 'Chưa phân công'}</p>
                  <p className="mt-2 text-[11px] text-slate-600">{rescueContext.rescueOrder.vehicle?.currentLocationName || 'Chưa có tên vị trí GPS'}</p>
                  {rescueContext.rescueOrder.vehicle?.currentLat != null && rescueContext.rescueOrder.vehicle?.currentLng != null ? (
                    <p className="font-mono text-[10px] text-slate-500">{rescueContext.rescueOrder.vehicle.currentLat.toFixed(6)}, {rescueContext.rescueOrder.vehicle.currentLng.toFixed(6)}</p>
                  ) : (
                    <p className="mt-1 text-[10px] font-bold text-rose-700">Xe cứu hộ chưa có tọa độ GPS.</p>
                  )}
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">{gpsAgeLabel(rescueContext.rescueOrder.vehicle?.lastGpsUpdate)}</p>
                  <p className="mt-2 text-[11px] font-bold text-emerald-800">Lệnh {rescueContext.rescueOrder.code} · {rescueContext.rescueOrder.status}</p>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-extrabold text-amber-900">Phân công cứu hộ khẩn cấp</p>
                  <select value={rescueVehicleId} onChange={(event) => handleRescueVehicleChange(event.target.value)} className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs">
                    <option value="">Chọn xe cứu hộ...</option>
                    {rescueContext.candidateVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate || vehicle.code} · {vehicle.name}</option>)}
                  </select>
                  <select value={rescueDriverId} onChange={(event) => setRescueDriverId(event.target.value)} className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs">
                    <option value="">Chọn tài xế...</option>
                    {rescueContext.candidateDrivers
                      .filter((driver) => !selectedCandidate || driver.unit === selectedCandidate.unit)
                      .map((driver) => <option key={driver.id} value={driver.id}>{driver.code} · {driver.fullName}</option>)}
                  </select>
                  <input type="datetime-local" min={inputDateTime(new Date())} value={plannedEndTime} onChange={(event) => setPlannedEndTime(event.target.value)} className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs" />
                  {selectedCandidate && <p className="text-[10px] text-amber-800">Vị trí xe: {selectedCandidate.currentLocationName || 'Chưa cập nhật'} · {gpsAgeLabel(selectedCandidate.lastGpsUpdate)}</p>}
                  <Button variant="primary" size="sm" disabled={rescueSaving || !rescueVehicleId || !rescueDriverId || !plannedEndTime} onClick={() => void dispatchRescue()}>
                    {rescueSaving ? 'Đang phân công...' : 'Tạo và phân công lệnh cứu hộ'}
                  </Button>
                  {!rescueContext.candidateVehicles.length && <p className="text-[10px] font-bold text-rose-700">Không có xe được đánh dấu đủ năng lực cứu hộ và đang sẵn sàng.</p>}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Thông tin sự cố</p>
                <p className="mt-1 text-xs font-bold text-slate-900">{rescueContext.sos.emergencyType}</p>
                <p className="mt-1 text-[11px] text-slate-600">{rescueContext.sos.description}</p>
                <p className="mt-2 text-[10px] text-slate-500">Tài xế phát SOS: {rescueContext.sos.driver.fullName} · {new Date(rescueContext.sos.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-semibold text-rose-700">Không tìm thấy hoặc không có quyền xem SOS này.</div>
          )}
        </section>
      )}

      {/* Global FilterBar */}
      <FilterBar
        extraFilters={
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>GPS cập nhật mỗi 30s</span>
          </div>
        }
      />

      {/* 4 Stats Cards matching Mockup */}
      <KPIGrid cols={4}>
        <StatCard
          label="Xe đang chạy theo lệnh"
          value={`${vehiclesList.filter((v) => v.status === 'ordered').length} xe`}
          subValue="Hoạt động theo lệnh"
          icon={<Truck className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-primary"
        />
        <StatCard
          label="Xe chạy tự do / Sẵn sàng"
          value={`${vehiclesList.filter((v) => v.status === 'free').length} xe`}
          subValue="Sẵn sàng điều phối"
          icon={<Navigation className="w-5 h-5" />}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Xe đang dừng đỗ"
          value={`${vehiclesList.filter((v) => v.status === 'stopped').length} xe`}
          subValue="Đỗ tại bãi xe"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Cảnh báo vi phạm tốc độ/vùng"
          value={`${vehiclesList.filter((v) => v.status === 'speed_warning').length} xe`}
          subValue="Cần kiểm tra GPS"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </KPIGrid>

      {/* Module Map Split Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
        {/* Left Sidebar List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm biển số, tài xế, lô thửa..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-primary transition-all font-medium"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredVehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  selectedVehicle?.id === v.id
                    ? 'border-primary bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                      v.status === 'speed_warning'
                        ? 'bg-rose-500 animate-ping'
                        : v.status === 'stopped'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-slate-900">{v.code}</strong>
                      <span className="text-[10px] text-slate-500 font-semibold">{v.speed}</span>
                      <span className="text-[10px] text-emerald-700 font-bold">Dầu {v.fuelPercent}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{v.activity}</p>
                    <span className="text-[10px] text-slate-400">TX: {v.driver}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs font-bold">›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Map Canvas Stage */}
        <div className="lg:col-span-2 relative min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-between p-4">
          {/* Subtle Grid / Satellite Canvas Mock */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Map Top Bar */}
          <div className="relative z-10 w-full flex items-center justify-between bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs border border-slate-700/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">{rescueContext ? `GPS cứu hộ SOS #${rescueContext.sos.id} · Sơ đồ tương quan tọa độ` : 'Vệ Tinh Trực Tuyến · KLH Koun Mom (Bản Đồ Nông Trường)'}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span>Độ phóng đại: 14x</span>
            </div>
          </div>

          {/* SOS markers use actual incident/telemetry coordinates and relative geographic placement. */}
          {rescueContext && sosMarkers.length === 2 && (
            <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" aria-hidden="true">
              <line
                x1={`${sosMarkers[0].x}%`} y1={`${sosMarkers[0].y}%`}
                x2={`${sosMarkers[1].x}%`} y2={`${sosMarkers[1].y}%`}
                stroke="#facc15" strokeWidth="3" strokeDasharray="8 6"
              />
            </svg>
          )}
          {rescueContext ? sosMarkers.map((marker) => (
            <button
              type="button"
              key={marker.key}
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-left text-[10px] font-bold shadow-xl ${marker.tone}`}
              title={`${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`}
            >
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{marker.label}</span>
              <span className="mt-0.5 block font-mono text-[9px] opacity-80">{marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}</span>
            </button>
          )) : vehiclesList.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v)}
              style={{ left: `${v.coords.x}%`, top: `${v.coords.y}%` }}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full font-bold text-[10px] shadow-lg transition-all flex items-center gap-1 ${
                selectedVehicle?.id === v.id
                  ? 'bg-primary text-white ring-4 ring-primary/40 scale-125 z-20'
                  : v.status === 'speed_warning'
                  ? 'bg-rose-600 text-white animate-bounce'
                  : v.status === 'stopped'
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-emerald-600 text-white hover:scale-110'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>{v.code.split('-').pop()}</span>
            </button>
          ))}

          {/* Map Bottom Footer */}
          <div className="relative z-10 w-full text-center bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-slate-300 text-[11px] border border-slate-700/80">
            <em>{rescueContext
              ? `${sosMarkers.length} vị trí GPS hợp lệ · Tự động làm mới mỗi 30 giây`
              : '86 xe đang lăn bánh trên tổng số 128 xe · Tích hợp cảm biến dầu siêu âm & App Lái xe'}</em>
          </div>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <Modal
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          title={`Chi Tiết Vị Trí: ${selectedVehicle.code}`}
          subtitle={`${selectedVehicle.model} | Lái xe: ${selectedVehicle.driver}`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span>Hoạt động:</span> <strong className="text-slate-900">{selectedVehicle.activity}</strong></div>
              <div className="flex justify-between"><span>Vận tốc GPS:</span> <b className={selectedVehicle.status === 'speed_warning' ? 'text-rose-600' : 'text-primary'}>{selectedVehicle.speed}</b></div>
              <div className="flex justify-between"><span>Mức dầu trong bình:</span> <b className="text-emerald-700">{selectedVehicle.fuelPercent} (Que đo DUT-E)</b></div>
              <div className="flex justify-between"><span>Trạng thái máy:</span> <b>{selectedVehicle.status === 'stopped' ? 'Đang dừng máy' : 'Đang nổ máy di chuyển'}</b></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedVehicle(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
