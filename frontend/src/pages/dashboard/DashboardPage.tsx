import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import {
  Tractor, Truck, Wrench, AlertTriangle, Fuel, MapPin, Clock,
  CheckCircle2, Users, Search, ExternalLink, RefreshCw, Eye,
  ClipboardList, Activity, TrendingUp, ShieldAlert, BarChart3,
  Radio, Wifi, WifiOff,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

// ─── Constants ───────────────────────────────────────────────────────────────
const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  MAY_DAO: 'Máy đào', MAY_UI: 'Máy ủi', MAY_SAN: 'Máy san', MAY_LU: 'Máy lu',
  MAY_XUC_LAT: 'Máy xúc lật', XE_XUC: 'Xe xúc', MAY_CAY: 'Máy cày',
  MAY_KEO: 'Máy kéo', MAY_GAT_DAP: 'Máy gặt đập', XE_TAI: 'Xe tải',
  XE_BEN: 'Xe ben', XE_BON: 'Xe bồn', XE_CONTAINER: 'Xe đầu kéo',
  XE_BAN_TAI: 'Xe bán tải', XE_CHUYEN_DUNG: 'Xe chuyên dùng',
  XE_CONG_VU: 'Xe công vụ', XE_CHO_NGUOI: 'Xe chở người', XE_NANG: 'Xe nâng',
  MAY_PHAT_DIEN: 'Máy phát điện', MAY_PHAT_CO: 'Máy phát cỏ', MAY_CUA: 'Máy cưa',
  MAY_BOM: 'Máy bơm', XE_MAY_2_BANH: 'Xe máy 2 bánh', THIET_BI_NONG_CU: 'Nông cụ',
};

const DISPATCH_STATUS_CONFIG: Record<string, { label: string; tagClass: string; color: string }> = {
  DRAFT: { label: 'Nháp', tagClass: 'bg-slate-100 text-slate-700 border-slate-200', color: '#94a3b8' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', tagClass: 'bg-amber-50 text-amber-700 border-amber-200', color: '#f59e0b' },
  APPROVED: { label: 'Đã duyệt', tagClass: 'bg-blue-50 text-blue-700 border-blue-200', color: '#3b82f6' },
  ASSIGNED: { label: 'Đã phân công', tagClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', color: '#6366f1' },
  DRIVER_ACCEPTED: { label: 'Lái xe đã nhận', tagClass: 'bg-cyan-50 text-cyan-700 border-cyan-200', color: '#06b6d4' },
  DEPARTED: { label: 'Đã xuất bến', tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', color: '#10b981' },
  AT_WORKSITE: { label: 'Tại hiện trường', tagClass: 'bg-teal-50 text-teal-700 border-teal-200', color: '#14b8a6' },
  WORKING: { label: 'Đang thực hiện', tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', color: '#059669' },
  RETURNING_TO_DEPOT: { label: 'Đang về bãi', tagClass: 'bg-purple-50 text-purple-700 border-purple-200', color: '#a855f7' },
  COMPLETED: { label: 'Hoàn thành', tagClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', color: '#007A33' },
  REJECTED: { label: 'Từ chối', tagClass: 'bg-rose-50 text-rose-700 border-rose-200', color: '#f43f5e' },
  CANCELLED: { label: 'Đã hủy', tagClass: 'bg-rose-50 text-rose-700 border-rose-200', color: '#ef4444' },
};

const VEHICLE_STATUS_CONFIG: Record<string, { label: string; tagClass: string }> = {
  HOAT_DONG: { label: 'Đang hoạt động', tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ACTIVE: { label: 'Đang hoạt động', tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IN_USE: { label: 'Đang hoạt động', tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  TAM_DUNG: { label: 'Sẵn sàng / Tạm dừng', tagClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  IDLE: { label: 'Sẵn sàng / Tạm dừng', tagClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  BAO_DUONG: { label: 'Đang bảo dưỡng', tagClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  MAINTENANCE: { label: 'Đang bảo dưỡng', tagClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  SUA_CHUA: { label: 'Đang sửa chữa', tagClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  REPAIRING: { label: 'Đang sửa chữa', tagClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  NGUNG_HOAT_DONG: { label: 'Ngừng hoạt động', tagClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  THANH_LY: { label: 'Thanh lý', tagClass: 'bg-slate-200 text-slate-600 border-slate-300' },
};

// Fleet status palette for donut
const FLEET_STATUS_PALETTE = [
  { key: 'running', label: 'Đang chạy', color: '#007A33' },
  { key: 'idle', label: 'Sẵn sàng', color: '#64748b' },
  { key: 'maintenance', label: 'Bảo dưỡng', color: '#f59e0b' },
  { key: 'repair', label: 'Sửa chữa', color: '#f43f5e' },
];

// Order status groups for donut
const ORDER_GROUPS = [
  { key: 'active', label: 'Đang vận hành', color: '#007A33', statuses: ['WORKING', 'DEPARTED', 'AT_WORKSITE', 'DRIVER_ACCEPTED'] },
  { key: 'pending', label: 'Chờ xử lý', color: '#f59e0b', statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED'] },
  { key: 'returning', label: 'Đang về bãi', color: '#a855f7', statuses: ['RETURNING_TO_DEPOT'] },
  { key: 'completed', label: 'Hoàn thành', color: '#3b82f6', statuses: ['COMPLETED'] },
  { key: 'cancelled', label: 'Hủy / Từ chối', color: '#ef4444', statuses: ['CANCELLED', 'REJECTED'] },
];

// Alert severity palette
const ALERT_SEVERITY_PALETTE = [
  { key: 'CRITICAL', label: 'Nghiêm trọng', color: '#ef4444' },
  { key: 'RED', label: 'Nguy hiểm', color: '#f43f5e' },
  { key: 'WARNING', label: 'Cảnh báo', color: '#f59e0b' },
  { key: 'AMBER', label: 'Chú ý', color: '#fb923c' },
  { key: 'INFO', label: 'Thông tin', color: '#3b82f6' },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs">
        <p className="font-bold text-slate-900">{payload[0].name}</p>
        <p className="text-slate-600">
          <span className="font-black" style={{ color: payload[0].payload.fill || payload[0].fill }}>
            {payload[0].value}
          </span>{' '}
          phương tiện
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs max-w-[180px]">
        <p className="font-bold text-slate-900 mb-1 leading-snug">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center justify-between gap-3">
            <span className="text-slate-500">{p.name}</span>
            <span className="font-black" style={{ color: p.fill || p.color }}>{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface DashboardOrderRow {
  id: string; orderCode: string; sourceType: string;
  orderType: 'LNN' | 'LXD' | 'LVC' | 'LDX' | 'OTHER'; orderTypeLabel: string;
  orderTagClass: string; plateNumber: string; vehicleName: string;
  driverName: string; driverPhone: string; origin: string; destination: string;
  purpose: string; departureTime: string; plannedEndTime: string;
  status: string; statusLabel: string; statusClass: string;
}

// ─── Stat Ring Component ──────────────────────────────────────────────────────
const StatRing: React.FC<{
  value: number; total: number; label: string; color: string; size?: number;
}> = ({ value, total, label, color, size = 60 }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="text-center -mt-1">
        <div className="text-xs font-black text-slate-900">{pct}%</div>
        <div className="text-[10px] text-slate-500 leading-none">{label}</div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const markAlertRead = useAppStore((state) => state.markAlertRead);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ALL' | 'LNN' | 'LXD' | 'LVC' | 'LDX'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [gpsFilter, setGpsFilter] = useState<'ALL' | 'HAS_GPS' | 'NO_GPS'>('ALL');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrderRow | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  // Data state
  const [overview, setOverview] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<DashboardOrderRow[]>([]);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [driversCount, setDriversCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const openAlert = async (alert: any) => {
    if (!alert.isRead) {
      const response = await apiClient.patch(`/alerts/${alert.id}/read`);
      const payload = response.data?.data || response.data;
      markAlertRead(alert.id, payload?.readAt);
      setAlertsList((items) => items.map((item) => item.id === alert.id ? { ...item, isRead: true, readAt: payload?.readAt } : item));
    }
    navigate(`/canh-bao/chua-xu-ly?alertId=${alert.id}`);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const complexParam = selectedKLH !== 'ALL' ? selectedKLH : undefined;
      const [overviewRes, liveFleetRes, ordersRes, alertsRes, driversRes] = await Promise.allSettled([
        apiClient.get('/dashboard/overview', { params: { complexCode: complexParam } }),
        apiClient.get('/dashboard/live-fleet', { params: { complexCode: complexParam } }),
        apiClient.get('/dispatch-orders', { params: { limit: 100, complexCode: complexParam } }),
        apiClient.get('/alerts', { params: { limit: 50, complexCode: complexParam } }),
        apiClient.get('/users', { params: { role: 'DRIVER' } }),
      ]);

      if (overviewRes.status === 'fulfilled') {
        const data = overviewRes.value.data?.data || overviewRes.value.data;
        setOverview(data);
      }

      if (liveFleetRes.status === 'fulfilled') {
        const items = liveFleetRes.value.data?.data || liveFleetRes.value.data || [];
        if (Array.isArray(items)) setVehiclesList(items);
      }

      if (ordersRes.status === 'fulfilled') {
        const payload = ordersRes.value.data?.data || ordersRes.value.data;
        const items = Array.isArray(payload) ? payload : payload?.items || [];
        if (Array.isArray(items)) {
          setOrdersList(items.map((o: any) => {
            const isTransport = o.sourceType === 'TRANSPORT' || o.sourceType === 'INTERNAL_TRANSPORT' || o.type === 'TRANSPORT' || o.operationDomain === 'TRANSPORT';
            const isMission = o.sourceType === 'RELOCATION' || o.sourceType === 'MISSION' || o.type === 'MISSION' || o.operationDomain === 'SUPPORT';
            const isConstruction = o.sourceType === 'CONSTRUCTION' || o.type === 'CONSTRUCTION' || o.operationDomain === 'CONSTRUCTION' || ['MAY_DAO', 'MAY_UI', 'MAY_SAN', 'MAY_LU', 'MAY_XUC_LAT', 'XE_XUC'].includes(o.vehicle?.category);
            const isAgriculture = o.sourceType === 'AGRICULTURE' || o.type === 'AGRICULTURE' || o.operationDomain === 'AGRICULTURE' || ['MAY_CAY', 'MAY_KEO', 'MAY_GAT_DAP', 'MAY_PHAT_CO', 'THIET_BI_NONG_CU'].includes(o.vehicle?.category);

            let typeCode: 'LNN' | 'LXD' | 'LVC' | 'LDX' | 'OTHER' = 'LNN';
            let orderTypeLabel = 'Nông nghiệp';
            let orderTagClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

            if (isTransport) {
              typeCode = 'LVC';
              orderTypeLabel = 'Vận chuyển';
              orderTagClass = 'bg-blue-50 text-blue-700 border border-blue-200';
            } else if (isMission) {
              typeCode = 'LDX';
              orderTypeLabel = 'Điều động';
              orderTagClass = 'bg-purple-50 text-purple-700 border border-purple-200';
            } else if (isConstruction) {
              typeCode = 'LXD';
              orderTypeLabel = 'Xây dựng';
              orderTagClass = 'bg-amber-50 text-amber-700 border border-amber-200';
            } else {
              typeCode = 'LNN';
              orderTypeLabel = 'Nông nghiệp';
              orderTagClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            }

            const stConfig = DISPATCH_STATUS_CONFIG[o.status] || { label: o.status || 'Chờ xử lý', tagClass: 'bg-slate-100 text-slate-700 border-slate-200', color: '#94a3b8' };
            return {
              id: String(o.id), orderCode: o.code || o.orderCode || `LĐX-${o.id}`,
              sourceType: o.sourceType || (isConstruction ? 'CONSTRUCTION' : isTransport ? 'TRANSPORT' : 'AGRICULTURE'),
              orderType: typeCode,
              orderTypeLabel,
              orderTagClass,
              plateNumber: o.vehicle?.plate || o.vehicleCode || 'Chưa gán',
              vehicleName: o.vehicle?.name || VEHICLE_CATEGORY_LABELS[o.vehicle?.category] || 'Xe cơ giới',
              driverName: o.driver?.fullName || o.driverName || 'Chưa phân công',
              driverPhone: o.driver?.phone || '—',
              origin: o.originLocation?.name || o.origin || 'Bãi đỗ',
              destination: o.destinationLocation?.name || o.destination || 'Khu vực SX',
              purpose: o.purpose || o.productionOrder?.planItem?.jobName || 'Công việc theo KH',
              departureTime: o.departureTime ? new Date(o.departureTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Chưa định giờ',
              plannedEndTime: o.plannedEndTime ? new Date(o.plannedEndTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—',
              status: o.status, statusLabel: stConfig.label, statusClass: stConfig.tagClass,
            };
          }));
        }
      }

      if (alertsRes.status === 'fulfilled') {
        const payload = alertsRes.value.data?.data || alertsRes.value.data;
        const items = Array.isArray(payload) ? payload : payload?.items || [];
        if (Array.isArray(items)) setAlertsList(items);
      }

      if (driversRes.status === 'fulfilled') {
        const payload = driversRes.value.data?.data || driversRes.value.data;
        const items = Array.isArray(payload) ? payload : payload?.items || [];
        if (Array.isArray(items)) setDriversCount(items.length);
      }
    } catch { /* handled via UI state */ } finally { setLoading(false); }
  };

  useEffect(() => { void fetchDashboardData(); }, [selectedKLH]);

  // ─── Derived chart data ───────────────────────────────────────────────────
  const kpis = overview?.kpiCards;
  const totalFleet = kpis?.totalFleet?.total ?? vehiclesList.length;
  const runningFleet = kpis?.totalFleet?.running ?? vehiclesList.filter((v) => v.status === 'HOAT_DONG' || v.status === 'ACTIVE' || v.status === 'IN_USE').length;
  const standbyFleet = kpis?.totalFleet?.standby ?? vehiclesList.filter((v) => v.status === 'TAM_DUNG' || v.status === 'IDLE').length;
  const maintenanceFleet = kpis?.totalFleet?.maintenance ?? vehiclesList.filter((v) => v.status === 'BAO_DUONG' || v.status === 'MAINTENANCE').length;
  const repairFleet = kpis?.totalFleet?.repair ?? vehiclesList.filter((v) => v.status === 'SUA_CHUA' || v.status === 'REPAIRING').length;
  const availabilityRate = totalFleet > 0 ? (((runningFleet + standbyFleet) / totalFleet) * 100).toFixed(1) : '0';

  // Donut: Fleet status
  const fleetStatusDonut = useMemo(() => [
    { name: 'Đang chạy', value: runningFleet, fill: '#007A33' },
    { name: 'Sẵn sàng', value: standbyFleet, fill: '#64748b' },
    { name: 'Bảo dưỡng', value: maintenanceFleet, fill: '#f59e0b' },
    { name: 'Sửa chữa', value: repairFleet, fill: '#f43f5e' },
  ].filter((d) => d.value > 0), [runningFleet, standbyFleet, maintenanceFleet, repairFleet]);

  // Bar: Category breakdown (top 10)
  const categoryBarData = useMemo(() => {
    const map = new Map<string, { active: number; idle: number; maintenance: number }>();
    vehiclesList.forEach((v) => {
      const cat = VEHICLE_CATEGORY_LABELS[v.category] || v.category || 'Khác';
      const cur = map.get(cat) || { active: 0, idle: 0, maintenance: 0 };
      const isAct = ['HOAT_DONG', 'ACTIVE', 'IN_USE'].includes(v.status);
      const isMaint = ['BAO_DUONG', 'SUA_CHUA', 'MAINTENANCE', 'REPAIRING'].includes(v.status);
      if (isAct) cur.active += 1; else if (isMaint) cur.maintenance += 1; else cur.idle += 1;
      map.set(cat, cur);
    });
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s, total: s.active + s.idle + s.maintenance }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [vehiclesList]);

  // Donut: Order status groups
  const orderStatusDonut = useMemo(() => ORDER_GROUPS.map((g) => ({
    name: g.label, value: ordersList.filter((o) => g.statuses.includes(o.status)).length, fill: g.color,
  })).filter((d) => d.value > 0), [ordersList]);

  // Bar: Alert severity
  const alertSeverityBar = useMemo(() => {
    const count: Record<string, number> = {};
    alertsList.forEach((a) => { const s = a.severity || 'INFO'; count[s] = (count[s] || 0) + 1; });
    return ALERT_SEVERITY_PALETTE.map((p) => ({ name: p.label, value: count[p.key] || 0, fill: p.color })).filter((d) => d.value > 0);
  }, [alertsList]);

  // Filtered orders
  const filteredOrders = useMemo(() => ordersList.filter((order) => {
    if (activeTab === 'LNN' && order.orderType !== 'LNN') return false;
    if (activeTab === 'LXD' && order.orderType !== 'LXD') return false;
    if (activeTab === 'LVC' && order.orderType !== 'LVC') return false;
    if (activeTab === 'LDX' && order.orderType !== 'LDX') return false;
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      return order.orderCode.toLowerCase().includes(q) || order.plateNumber.toLowerCase().includes(q)
        || order.driverName.toLowerCase().includes(q) || order.destination.toLowerCase().includes(q)
        || order.purpose.toLowerCase().includes(q);
    }
    return true;
  }), [ordersList, activeTab, searchKeyword]);

  // Derived GPS vehicles
  const vehiclesWithGps = useMemo(() => vehiclesList.filter((v) => Boolean(v.gpsImei && String(v.gpsImei).trim() !== '')), [vehiclesList]);
  const vehiclesWithoutGps = useMemo(() => vehiclesList.filter((v) => !v.gpsImei || String(v.gpsImei).trim() === ''), [vehiclesList]);

  // Filtered vehicles for GPS table
  const filteredVehicles = useMemo(() => {
    return vehiclesList.filter((v) => {
      const hasGps = Boolean(v.gpsImei && String(v.gpsImei).trim() !== '');
      if (gpsFilter === 'HAS_GPS' && !hasGps) return false;
      if (gpsFilter === 'NO_GPS' && hasGps) return false;
      if (vehicleSearch.trim()) {
        const q = vehicleSearch.toLowerCase();
        const matchCode = (v.code || '').toLowerCase().includes(q);
        const matchPlate = (v.plate || '').toLowerCase().includes(q);
        const matchName = (v.name || '').toLowerCase().includes(q);
        const matchDriver = (v.defaultDriver?.fullName || '').toLowerCase().includes(q);
        const matchUnit = (v.assignedUnitCode || v.regionCode || v.currentLocationName || '').toLowerCase().includes(q);
        return matchCode || matchPlate || matchName || matchDriver || matchUnit;
      }
      return true;
    });
  }, [vehiclesList, gpsFilter, vehicleSearch]);

  const titleForKLH = selectedKLH === 'KOUN_MOM' ? 'KLH Koun Mom' : selectedKLH === 'SNOUL' ? 'KLH Snoul' : selectedKLH === 'NAM_LAO' ? 'KLH Nam Lào' : selectedKLH;

  return (
    <div className="space-y-5 text-slate-800 antialiased pb-10 font-sans">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-[#007A33]" />
            Tổng quan Vận hành Cơ giới
            {selectedKLH !== 'ALL' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#007A33] border border-emerald-200">
                {titleForKLH}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bảng điều hành hợp nhất · kết nối trực tiếp cơ sở dữ liệu THACO AGRI Fleet System
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={() => void fetchDashboardData()}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
            Làm mới
          </Button>
          <NavLink to="/lenh-dieu-xe/tao-moi">
            <Button variant="primary" size="sm">＋ Lập lệnh điều xe</Button>
          </NavLink>
        </div>
      </div>

      {/* ── KPI Cards Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng phương tiện */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Tractor className="w-5 h-5 text-[#007A33]" />
            </div>
            <span className="text-[11px] font-extrabold text-[#007A33] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {availabilityRate}% sẵn sàng
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight mb-1">{totalFleet}</div>
          <div className="text-xs font-semibold text-slate-500 mb-0.5">Tổng phương tiện</div>
          <div className="text-[11px] text-slate-400 leading-snug">
            <span className="text-[#007A33] font-bold">{runningFleet}</span> chạy ·{' '}
            <span className="text-slate-600 font-bold">{standbyFleet}</span> dừng ·{' '}
            <span className="text-amber-600 font-bold">{maintenanceFleet + repairFleet}</span> BTSC
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
            <span className="flex items-center gap-1 text-slate-500">
              <Radio className="w-3 h-3 text-emerald-600" />
              Đã lắp GPS: <b className="text-slate-800">{vehiclesWithGps.length}</b>
            </span>
            <span className="text-slate-400">
              Chưa có GPS: <b className="text-amber-700">{vehiclesWithoutGps.length}</b>
            </span>
          </div>
        </div>

        {/* KPI 2: Lệnh điều xe */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {ordersList.length > 0
                ? `${((ordersList.filter((o) => o.status === 'COMPLETED').length / ordersList.length) * 100).toFixed(0)}% hoàn thành`
                : '—'}
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight mb-1">{ordersList.length}</div>
          <div className="text-xs font-semibold text-slate-500 mb-0.5">Lệnh điều xe</div>
          <div className="text-[11px] text-slate-400 leading-snug">
            <span className="text-[#007A33] font-bold">{ordersList.filter((o) => ['WORKING', 'DEPARTED', 'AT_WORKSITE'].includes(o.status)).length}</span> đang chạy ·{' '}
            <span className="text-amber-600 font-bold">{ordersList.filter((o) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(o.status)).length}</span> chờ xử lý
          </div>
        </div>

        {/* KPI 3: Lái xe */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {ordersList.filter((o) => ['WORKING', 'DEPARTED'].includes(o.status)).length} đang vận hành
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight mb-1">{driversCount}</div>
          <div className="text-xs font-semibold text-slate-500 mb-0.5">Lực lượng lái xe</div>
          <div className="text-[11px] text-slate-400">Tài xế có trong hệ thống RBAC</div>
        </div>

        {/* KPI 4: Cảnh báo */}
        <div className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group ${alertsList.length > 0 ? 'border-rose-200/80' : 'border-slate-200/80'}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${alertsList.length > 0 ? 'bg-rose-50 border border-rose-100 group-hover:bg-rose-100' : 'bg-emerald-50 border border-emerald-100 group-hover:bg-emerald-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${alertsList.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${alertsList.length > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
              {alertsList.length > 0 ? `${alertsList.filter((a) => a.severity === 'CRITICAL' || a.severity === 'RED').length} nghiêm trọng` : 'An toàn'}
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight mb-1">{alertsList.length}</div>
          <div className="text-xs font-semibold text-slate-500 mb-0.5">Cảnh báo hệ thống</div>
          <div className="text-[11px] text-slate-400">
            {alertsList.length > 0 ? 'Cần kiểm tra và xử lý' : 'Không có cảnh báo tồn đọng'}
          </div>
        </div>
      </div>

      {/* ── Charts Row 1: Fleet Donut + Order Donut + Alert Bar ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Fleet Status Donut */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#007A33]" />
                Trạng thái Đội xe
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Phân bổ {totalFleet} phương tiện</p>
            </div>
            <NavLink to="/doi-xe/ho-so" className="text-xs font-bold text-[#007A33] hover:underline flex items-center gap-1">
              Chi tiết <ExternalLink className="w-3 h-3" />
            </NavLink>
          </div>

          {fleetStatusDonut.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Chưa có dữ liệu đội xe</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-[130px] h-[130px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetStatusDonut} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                      paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {fleetStatusDonut.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5">
                {FLEET_STATUS_PALETTE.map((p) => {
                  const val = p.key === 'running' ? runningFleet : p.key === 'idle' ? standbyFleet : p.key === 'maintenance' ? maintenanceFleet : repairFleet;
                  if (val === 0 && totalFleet > 0) return null;
                  return (
                    <div key={p.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-[11px] text-slate-600">{p.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${totalFleet > 0 ? (val / totalFleet) * 100 : 0}%`, backgroundColor: p.color }} />
                        </div>
                        <span className="text-xs font-black text-slate-900 w-5 text-right">{val}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Order Status Donut */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Trạng thái Lệnh điều xe
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Tổng {ordersList.length} lệnh trong hệ thống</p>
            </div>
            <NavLink to="/lenh-dieu-xe/danh-sach" className="text-xs font-bold text-[#007A33] hover:underline flex items-center gap-1">
              Chi tiết <ExternalLink className="w-3 h-3" />
            </NavLink>
          </div>

          {orderStatusDonut.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Chưa có lệnh điều xe</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-[130px] h-[130px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={orderStatusDonut} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                      paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {orderStatusDonut.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs">
                        <p className="font-bold text-slate-900">{payload[0].name}</p>
                        <p><span className="font-black" style={{ color: payload[0].payload.fill }}>{payload[0].value}</span> lệnh</p>
                      </div>
                    ) : null} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5">
                {ORDER_GROUPS.map((g) => {
                  const val = ordersList.filter((o) => g.statuses.includes(o.status)).length;
                  if (val === 0) return null;
                  return (
                    <div key={g.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                        <span className="text-[11px] text-slate-600">{g.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${ordersList.length > 0 ? (val / ordersList.length) * 100 : 0}%`, backgroundColor: g.color }} />
                        </div>
                        <span className="text-xs font-black text-slate-900 w-5 text-right">{val}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 3: Alert Severity Bar / List */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Cảnh báo theo mức độ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{alertsList.length} cảnh báo từ hệ thống</p>
            </div>
            <NavLink to="/canh-bao/chua-xu-ly" className="text-xs font-bold text-[#007A33] hover:underline flex items-center gap-1">
              Xem tất cả <ExternalLink className="w-3 h-3" />
            </NavLink>
          </div>

          {alertsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="text-xs text-slate-500 font-semibold">Không có cảnh báo tồn đọng</p>
              <p className="text-[11px] text-slate-400">Hệ thống đang hoạt động an toàn</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alertSeverityBar.map((b) => (
                <div key={b.name} className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-600 w-20 shrink-0">{b.name}</span>
                  <div className="flex-1 h-5 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                    <div
                      className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${alertsList.length > 0 ? Math.max((b.value / alertsList.length) * 100, 12) : 0}%`, backgroundColor: b.fill }}
                    >
                      <span className="text-[10px] font-black text-white">{b.value}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-3 divide-y divide-slate-100 max-h-[120px] overflow-y-auto">
                {alertsList.slice(0, 3).map((alert, idx) => {
                  const isCrit = alert.severity === 'CRITICAL' || alert.severity === 'RED';
                  return (
                    <div key={alert.id || idx} onClick={() => void openAlert(alert)} className="py-2 flex items-start gap-2 cursor-pointer hover:bg-slate-50">
                      <div className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isCrit ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isCrit ? '!' : '⚠'}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-900 leading-snug line-clamp-1">{alert.title || alert.message || 'Cảnh báo hệ thống'}</p>
                        <p className="text-[10px] text-slate-400">{alert.vehicle?.plate ? `Xe ${alert.vehicle.plate}` : 'Hệ thống'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Chart Row 2: Category Bar Chart (Full Width) ─────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              Phân bổ phương tiện theo chủng loại kỹ thuật
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thống kê trực tiếp từ {vehiclesList.length} thiết bị cơ giới trong CSDL
            </p>
          </div>
          <NavLink to="/doi-xe/ho-so" className="text-xs font-bold text-[#007A33] hover:underline flex items-center gap-1">
            Quản lý đội xe <ExternalLink className="w-3 h-3" />
          </NavLink>
        </div>

        {categoryBarData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">Chưa có phương tiện trong cơ sở dữ liệu</div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 4, right: 16, left: -20, bottom: 40 }} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  angle={-35} textAnchor="end" height={64} axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 4, color: '#64748b' }}
                  iconType="circle" iconSize={8}
                />
                <Bar dataKey="active" name="Đang hoạt động" fill="#007A33" radius={[3, 3, 0, 0]} />
                <Bar dataKey="idle" name="Sẵn sàng / Tạm dừng" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="maintenance" name="Bảo dưỡng / Sửa chữa" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── GPS Fleet Table + Recent Alerts (Split) ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: GPS Fleet List */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#007A33]" /> Giám sát Thiết bị & Vị trí Phương tiện
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {vehiclesList.length.toLocaleString()} thiết bị cơ giới ·{' '}
                <span className="text-emerald-700 font-bold">{vehiclesWithGps.length} đã lắp GPS</span> ·{' '}
                <span className="text-slate-500 font-medium">{vehiclesWithoutGps.length.toLocaleString()} chưa có GPS</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NavLink to="/doi-xe/cam-bien-gps" className="text-xs font-bold text-slate-600 hover:text-[#007A33] hover:underline flex items-center gap-1 shrink-0">
                <Radio className="w-3.5 h-3.5" /> Quản lý GPS
              </NavLink>
              <span className="text-slate-300">|</span>
              <NavLink to="/gps/realtime" className="text-xs font-bold text-[#007A33] hover:underline flex items-center gap-1 shrink-0">
                Bản đồ lớn <ExternalLink className="w-3.5 h-3.5" />
              </NavLink>
            </div>
          </div>

          {/* Filter tabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setGpsFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${gpsFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Tất cả ({vehiclesList.length.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setGpsFilter('HAS_GPS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${gpsFilter === 'HAS_GPS' ? 'bg-[#007A33] text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}`}
              >
                <Radio className="w-3 h-3" /> Đã có GPS ({vehiclesWithGps.length})
              </button>
              <button
                type="button"
                onClick={() => setGpsFilter('NO_GPS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${gpsFilter === 'NO_GPS' ? 'bg-amber-700 text-white shadow-xs' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'}`}
              >
                <WifiOff className="w-3 h-3" /> Chưa gắn GPS ({vehiclesWithoutGps.length.toLocaleString()})
              </button>
            </div>

            <div className="relative flex-1 min-w-[180px] max-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã xe, biển số, đơn vị..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#007A33]"
              />
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Không có phương tiện nào khớp với bộ lọc
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">MÃ & BIỂN SỐ</th>
                    <th className="py-2.5 px-3">CHỦNG LOẠI</th>
                    <th className="py-2.5 px-3">LÁI XE PHỤ TRÁCH</th>
                    <th className="py-2.5 px-3">VỊ TRÍ / ĐƠN VỊ PHÂN BỔ</th>
                    <th className="py-2.5 px-3 text-center">TÍN HIỆU GPS</th>
                    <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">CHI TIẾT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredVehicles.slice(0, 8).map((v) => {
                    const stConfig = VEHICLE_STATUS_CONFIG[v.status] || { label: v.status || 'Tạm dừng', tagClass: 'bg-slate-100 text-slate-700 border-slate-200' };
                    const hasGps = Boolean(v.gpsImei && String(v.gpsImei).trim() !== '');
                    const isOnline = Boolean(hasGps && v.lastGpsUpdate);
                    const unitName = v.assignedUnitCode || v.regionCode || v.currentLocationName || 'Khu liên hợp';

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 font-bold block">{v.plate || v.code}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{v.code}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-800">{VEHICLE_CATEGORY_LABELS[v.category] || v.category}</span>
                          {v.name && v.name !== v.plate && <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">{v.name}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {v.defaultDriver?.fullName ? <span className="font-semibold text-slate-900">{v.defaultDriver.fullName}</span>
                            : <span className="text-slate-400 italic">Chưa gán</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasGps ? (
                            <span className="text-slate-700 flex items-center gap-1 font-medium">
                              <Radio className="w-3 h-3 text-emerald-600 shrink-0 animate-pulse" />
                              <span className="truncate max-w-[150px]">{v.currentLocationName || `${Number(v.currentLat).toFixed(4)}, ${Number(v.currentLng).toFixed(4)}`}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]" title={`Phân bổ: ${unitName}`}>{unitName}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasGps ? (
                            isOnline ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Trực tuyến
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Mất tín hiệu
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              Chưa gắn GPS
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stConfig.tagClass}`}>{stConfig.label}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button onClick={() => setSelectedVehicle(v)} className="text-xs font-semibold text-[#007A33] hover:underline cursor-pointer">
                            Xem ↗
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Recent Alerts */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Cảnh báo chưa xử lý
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{alertsList.length} cảnh báo từ hệ thống</p>
            </div>
            <NavLink to="/canh-bao/chua-xu-ly" className="text-xs font-bold text-[#007A33] hover:underline">Xem tất cả</NavLink>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
            {alertsList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                Không có cảnh báo nào
              </div>
            ) : alertsList.slice(0, 6).map((alert, idx) => {
              const isCrit = alert.severity === 'CRITICAL' || alert.severity === 'RED';
              const isWarn = alert.severity === 'WARNING' || alert.severity === 'AMBER';
              return (
                <div key={alert.id || idx} onClick={() => void openAlert(alert)} className="py-3 flex items-start gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer">
                  <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${isCrit ? 'bg-rose-50 text-rose-700 border border-rose-200' : isWarn ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {isCrit ? '!' : isWarn ? '⚠' : 'ℹ'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">{alert.title || alert.message || 'Cảnh báo hệ thống'}</h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {alert.vehicle?.plate ? `Xe ${alert.vehicle.plate}` : ''}{alert.location ? ` · ${alert.location}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Orders Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>📋</span> Danh sách Lệnh điều xe & Vận chuyển
              </h2>
              <span className="text-xs font-bold bg-emerald-50 text-[#007A33] border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {ordersList.length} lệnh
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Tiến độ ca làm việc, lộ trình và trạng thái vận hành</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([
              ['ALL', 'Tất cả', ordersList.length],
              ['LNN', '🌾 Nông nghiệp', ordersList.filter((o) => o.orderType === 'LNN').length],
              ['LXD', '🏗️ Xây dựng', ordersList.filter((o) => o.orderType === 'LXD').length],
              ['LVC', '🚛 Vận chuyển', ordersList.filter((o) => o.orderType === 'LVC').length],
              ['LDX', '🔧 Điều động', ordersList.filter((o) => o.orderType === 'LDX').length],
            ] as [string, string, number][]).map(([tab, label, count]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`h-8 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#007A33] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Tìm mã lệnh, biển số, tên lái xe, nơi đến..."
              value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#007A33]" />
          </div>
          <NavLink to="/lenh-dieu-xe/danh-sach" className="text-xs font-bold text-[#007A33] hover:underline flex items-center gap-1">
            Xem toàn bộ lệnh <ExternalLink className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">MÃ LỆNH</th>
                <th className="py-3 px-4">PHƯƠNG TIỆN</th>
                <th className="py-3 px-4">LÁI XE</th>
                <th className="py-3 px-4">LỘ TRÌNH</th>
                <th className="py-3 px-4">MỤC ĐÍCH</th>
                <th className="py-3 px-4">KHỞI HÀNH</th>
                <th className="py-3 px-4">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-xs text-slate-400">Không tìm thấy lệnh điều xe nào</td></tr>
              ) : filteredOrders.map((row) => (
                <tr key={row.id} onClick={() => setSelectedOrder(row)} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                  <td className="py-3 px-4">
                    <strong className="text-slate-900 font-bold block">{row.orderCode}</strong>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${row.orderTagClass}`}>{row.orderTypeLabel}</span>
                  </td>
                  <td className="py-3 px-4">
                    <strong className="text-slate-900 font-bold block">{row.plateNumber}</strong>
                    <span className="text-[10px] text-slate-500">{row.vehicleName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <strong className="text-slate-900 block">{row.driverName}</strong>
                    <span className="text-[10px] text-slate-400">{row.driverPhone}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600 truncate max-w-[100px]">{row.origin}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[120px]">{row.destination}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><span className="text-slate-700 truncate max-w-[180px] block" title={row.purpose}>{row.purpose}</span></td>
                  <td className="py-3 px-4"><span className="text-slate-700 font-medium">{row.departureTime}</span></td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${row.statusClass}`}>{row.statusLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Vehicle Detail Modal ──────────────────────────────────────────────── */}
      {selectedVehicle && (
        <Modal isOpen={!!selectedVehicle} onClose={() => setSelectedVehicle(null)}
          title={`Phương Tiện: ${selectedVehicle.plate || selectedVehicle.code}`}
          subtitle={`${selectedVehicle.code} · ${VEHICLE_CATEGORY_LABELS[selectedVehicle.category] || selectedVehicle.category}`}
          size="md">
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              {[
                ['Tên phương tiện', selectedVehicle.name || selectedVehicle.plate],
                ['Mã quản lý', selectedVehicle.code],
                ['Chủng loại', VEHICLE_CATEGORY_LABELS[selectedVehicle.category] || selectedVehicle.category],
                ['Lái xe mặc định', selectedVehicle.defaultDriver?.fullName || 'Chưa gán'],
                ['Đơn vị phân bổ', selectedVehicle.assignedUnitCode || selectedVehicle.regionCode || 'Ban Cơ giới'],
                ['Giờ máy tích lũy', `${selectedVehicle.totalMachineHours || 0} giờ`],
                ['Trạng thái vận hành', VEHICLE_STATUS_CONFIG[selectedVehicle.status]?.label || selectedVehicle.status],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}:</span><b className="text-slate-900">{val}</b>
                </div>
              ))}
            </div>

            {/* Khối thông tin GPS */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-700" /> Tình trạng Cảm biến GPS:
                </span>
                {selectedVehicle.gpsImei ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Đã cấu hình GPS ({selectedVehicle.gpsImei})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Chưa gắn thiết bị GPS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {selectedVehicle.gpsImei
                  ? `Thiết bị IMEI ${selectedVehicle.gpsImei} đang gửi tọa độ về máy chủ. Lần cập nhật cuối: ${selectedVehicle.lastGpsUpdate ? new Date(selectedVehicle.lastGpsUpdate).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}`
                  : `Phương tiện này chưa được trang bị thiết bị định vị GPS (hoặc chưa khai báo IMEI). Vị trí trên bản đồ được xác định theo Đơn vị / Xí nghiệp phân bổ phụ trách.`}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedVehicle(null)}>Đóng</Button>
              <NavLink to="/doi-xe/cam-bien-gps"><Button variant="outline" size="sm">Cấu hình GPS</Button></NavLink>
              <NavLink to="/doi-xe/ho-so"><Button variant="primary" size="sm">Xem hồ sơ xe</Button></NavLink>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Order Detail Modal ────────────────────────────────────────────────── */}
      {selectedOrder && (
        <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)}
          title={`Chi Tiết Lệnh: ${selectedOrder.orderCode}`}
          subtitle={`${selectedOrder.orderTypeLabel} · Xe ${selectedOrder.plateNumber}`}
          size="md">
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              {[
                ['Mã lệnh điều xe', selectedOrder.orderCode],
                ['Lái xe vận hành', `${selectedOrder.driverName} (${selectedOrder.driverPhone})`],
                ['Điểm xuất phát', selectedOrder.origin],
                ['Điểm đến', selectedOrder.destination],
                ['Mục đích công việc', selectedOrder.purpose],
                ['Thời gian khởi hành', selectedOrder.departureTime],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}:</span><b className="text-slate-900">{val}</b>
                </div>
              ))}
              <div className="flex justify-between">
                <span>Trạng thái lệnh:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedOrder.statusClass}`}>{selectedOrder.statusLabel}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>Đóng</Button>
              <NavLink to="/lenh-dieu-xe/danh-sach"><Button variant="primary" size="sm">Xem toàn bộ lệnh</Button></NavLink>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DashboardPage;
