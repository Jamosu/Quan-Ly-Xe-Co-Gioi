import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Fuel,
  MapPin,
  Package,
  Plus,
  Printer,
  Route,
  Search,
  Send,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { operationsApi } from '../../api/operations';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { TableRowActions } from '../../components/common/TableRowActions';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { FilterBar } from '../../components/filters/FilterBar';
import { StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import type { ImportPreview, ImportWorkbookPayload, TransportItemRecord, TransportOrderRecord } from '../../types';
import { readTransportWorkbook } from '../../utils/transportWorkbook';
import { useFilterStore } from '../../store/useFilterStore';
import { useAppStore } from '../../store/useAppStore';
import { matchesKLH } from '../../utils/filterUtils';
import { WorkflowActionPanel, type DemoWorkflowStep } from '../../components/dispatch/WorkflowActionPanel';
import { Vehicle24hScheduler, type SchedulerLane, type SchedulerItem } from '../../components/dispatch/Vehicle24hScheduler';
import { DispatchCategoryTabs } from '../../components/dispatch/DispatchCategoryTabs';
import { getWeeksOfYear, getWeekNumber } from './ProductionPlanPage';
import { DAYS_OF_WEEK } from './CreateProductionPlanPage';

const boards = [
  { title: 'Chờ duyệt', statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] },
  { title: 'Đã phân công', statuses: ['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'] },
  { title: 'Đang vận chuyển', statuses: ['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'DELIVERED', 'RETURNING_TO_DEPOT'] },
  { title: 'Đã giao / hoàn tất', statuses: ['AT_DEPOT', 'ACCEPTED', 'COMPLETED'] },
];

const TIME_SLOT_OPTIONS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

const TIMELINE_HOURS = [
  { label: '06:00', hour: 6 },
  { label: '08:00', hour: 8 },
  { label: '10:00', hour: 10 },
  { label: '12:00', hour: 12 },
  { label: '14:00', hour: 14 },
  { label: '16:00', hour: 16 },
  { label: '18:00', hour: 18 },
  { label: '20:00', hour: 20 },
];

const SCHEDULER_SLOTS = TIMELINE_HOURS;

// Dữ liệu mẫu chuẩn hóa 16 cột khớp 100% biểu mẫu thực địa của người dùng
const INITIAL_TRANSPORT_ORDERS: TransportOrderRecord[] = [];

function formatDateTimeVN(value?: string | Date): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${timeStr} · ${dateStr}`;
}

function formatDateDisplay(value?: string | Date): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateKey(value?: string | Date): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractHourString(value?: string | Date): string {
  if (!value) return '07:00';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '07:00';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

interface NewItemRow {
  materialCode: string;
  cargoName: string;
  unitOfMeasure: string;
  plannedQuantity: number;
  pickupLocation: string;
  deliveryLocation: string;
}

export const InternalTransportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState<'DISPATCH' | 'ACCEPTED'>('DISPATCH');
  const [view, setView] = useState<'scheduler' | 'table' | 'board'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [orders, setOrders] = useState<TransportOrderRecord[]>([]);
  const [selected, setSelected] = useState<TransportOrderRecord | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 52 Tuần trong năm
  const availableWeeks = useMemo(() => {
    return [...getWeeksOfYear(2026)].sort((a, b) => b.weekNumber - a.weekNumber);
  }, []);

  // Bộ lọc Tuần: 'ALL' hoặc số tuần (Mặc định tuần hiện tại)
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>(() => {
    return getWeekNumber(new Date());
  });

  // Bộ lọc theo Loại hàng, Phương tiện xe và Tài xế
  const [selectedCargo, setSelectedCargo] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');

  // Quản lý ngày: Vừa vào mặc định chọn ngày hôm nay
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [sortOrder, setSortOrder] = useState<'time_asc' | 'time_desc'>('time_asc');

  const selectedStatus = useFilterStore((state) => state.selectedStatus);
  const selectedKLH = useAppStore((state) => state.selectedKLH);

  // 7 ngày trong tuần đang chọn
  const weekDays = useMemo(() => {
    if (selectedWeek === 'ALL') return [];
    const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
    if (!weekObj?.monday) return [];
    const days: { dayName: string; shortName: string; dateStr: string; displayDate: string; isToday: boolean; count: number }[] = [];
    const mon = new Date(weekObj.monday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = formatDateKey(d);
      const dayName = DAYS_OF_WEEK[i] || `Thứ ${i + 2}`;
      const shortName = i === 6 ? 'CN' : `T${i + 2}`;
      const displayDate = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const isToday = dateStr === formatDateKey(new Date());

      // Đếm số lệnh vận chuyển trong ngày này
      const count = orders.filter((o) => {
        if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
        const dKey = formatDateKey(o.departureTime || o.executionDate || o.requestDate);
        return dKey === dateStr;
      }).length;

      days.push({ dayName, shortName, dateStr, displayDate, isToday, count });
    }
    return days;
  }, [selectedWeek, availableWeeks, orders, selectedKLH]);

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workbook, setWorkbook] = useState<ImportWorkbookPayload | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  // Form creation state with multi-item rows
  const [createItems, setCreateItems] = useState<NewItemRow[]>([
    {
      materialCode: 'DZ-005',
      cargoName: 'Dầu Diezel cấp trạm bơm',
      unitOfMeasure: 'Lít',
      plannedQuantity: 4000,
      pickupLocation: 'DP-NL',
      deliveryLocation: 'LP1',
    },
  ]);

  const updateOrderView = (id: number, patch: Partial<TransportOrderRecord>) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, ...patch } : order));
    setSelected((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const handleOpenTransportOrder = (order: TransportOrderRecord) => {
    const targetId = Number(order.id) > 200000 ? Number(order.id) : 200000 + Number(order.id);
    let targetOrder: any = {
      id: targetId,
      code: order.code,
      orderCategory: 'VAN_CHUYEN',
      categoryLabel: 'Vận chuyển',
      sourceType: 'TRANSPORT_ORDER',
      unit: order.unit || 'BAN_CO_GIOI',
      purpose: order.cargoType || 'Vận chuyển hàng hóa nội bộ',
      origin: order.origin || 'Kho Trung Tâm',
      destination: order.destination || 'Điểm giao hàng',
      departureTime: order.departureTime || order.executionDate || order.requestDate || new Date().toISOString(),
      plannedEndTime: order.plannedEndTime || new Date(Date.now() + 8 * 3600000).toISOString(),
      status: order.status,
      vehicle: order.vehicle,
      driver: order.driver,
      implement: order.trailer,
      workVolumeTarget: order.tonnage || order.palletCount || 1,
      workVolumeUnit: order.palletCount ? 'Pallet' : 'Tấn',
      plannedFuelLiters: order.plannedFuelLiters,
      notes: order.notes,
    };

    const isPending = !order.status || ['DRAFT', 'PENDING_APPROVAL'].includes(order.status);
    if (isPending) {
      const now = new Date();
      const currentStart = now.toISOString();
      const durationMs = order.departureTime && order.plannedEndTime
        ? Math.max(1_800_000, new Date(order.plannedEndTime).getTime() - new Date(order.departureTime).getTime())
        : 8 * 3_600_000;
      const currentEnd = new Date(now.getTime() + durationMs).toISOString();

      targetOrder = {
        ...targetOrder,
        departureTime: currentStart,
        plannedEndTime: currentEnd,
      };
    }

    navigate(`/lenh-dieu-xe/chi-tiet/${targetId}`, {
      state: {
        order: targetOrder,
        from: location.pathname + location.search,
      },
    });
  };

  const workflowStep = (status: TransportOrderRecord['status']): DemoWorkflowStep => {
    if (['COMPLETED', 'ACCEPTED'].includes(status)) return 'COMPLETED';
    if (['DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING', 'DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'DELIVERED', 'RETURNING_TO_DEPOT', 'AT_DEPOT'].includes(status)) return 'RECEIVED';
    if (['APPROVED', 'ASSIGNED'].includes(status)) return 'APPROVED';
    return 'PENDING';
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await operationsApi.transportOrders({
        page,
        limit: 100,
        search: search || undefined,
        status: boards.some((board) => board.statuses.includes(selectedStatus)) ? selectedStatus : undefined,
      });
      const sanitizedItems: TransportOrderRecord[] = (result.items || [])
        .filter((item) => item.status !== 'CANCELLED')
        .map((item: any) => {
          const plan = item.productionOrder?.plan;
          const complexCode = plan?.complexCode || (['NT1', 'NT2', 'NT3', 'NT4', 'BAN_CO_GIOI'].includes(item.unit) ? 'KOUN_MOM' : item.unit) || 'KOUN_MOM';
          const complexName = plan?.complexName || (complexCode === 'KOUN_MOM' ? 'Khu liên hợp Koun Mom' : item.unit === 'NT1' ? 'Nông trường 1' : item.unit || 'Khu liên hợp');
          return {
            ...item,
            complexCode,
            complexName,
            planCode: plan?.code || item.planCode,
            planTitle: plan?.title || item.planTitle,
            items: Array.isArray(item.items) ? item.items : [],
          };
        });

      setOrders(sanitizedItems);
      setTotal(sanitizedItems.length);
      const currentAlert = useAppStore.getState().headerAlert;
      if (currentAlert?.type === 'error') {
        useAppStore.getState().setHeaderAlert(null);
      }
    } catch (err: any) {
      console.error('Failed to load transport orders:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể kết nối cơ sở dữ liệu lệnh vận chuyển.';
      setError(msg);
      useAppStore.getState().setHeaderAlert({
        type: 'error',
        message: `Lỗi tải lệnh vận chuyển: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // Lắng nghe sự kiện làm mới từ nút Header Refresh
  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent<{ pathname?: string }>;
      if (!customEvent.detail?.pathname || customEvent.detail.pathname.includes('/lenh-noi-bo') || customEvent.detail.pathname.includes('/van-chuyen')) {
        void load();
      }
    };
    window.addEventListener('thaco_refresh_current_page', handleRefresh);
    return () => {
      window.removeEventListener('thaco_refresh_current_page', handleRefresh);
    };
  }, [load]);

  // Tìm danh sách tất cả các ngày có chuyến
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const order of orders) {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(order, selectedKLH)) continue;
      if (order.departureTime) {
        dates.add(formatDateKey(order.departureTime));
      } else if (order.executionDate) {
        dates.add(formatDateKey(order.executionDate));
      } else if (order.requestDate) {
        dates.add(formatDateKey(order.requestDate));
      }
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [orders, selectedKLH]);


  // Đếm số lượng theo 4 nhóm trạng thái chuẩn hóa
  const statusCounts = useMemo(() => {
    const base = orders.filter((order) => {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(order, selectedKLH)) {
        return false;
      }
      if (selectedWeek !== 'ALL') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
          if (!dKey || dKey < start || dKey > end) return false;
        }
      }
      if (selectedDate !== 'ALL') {
        const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
        if (dKey !== selectedDate) return false;
      }
      return true;
    });
    const chuaPhanCong = base.filter((o) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(o.status)).length;
    const daGiaoViec = base.filter((o) => ['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'].includes(o.status)).length;
    const dangLamViec = base.filter((o) => ['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'WORKING'].includes(o.status)).length;
    const driverPending = base.filter((o) => o.status === 'ASSIGNED').length;
    const completed = base.filter((o) => ['DELIVERED', 'ACCEPTED', 'COMPLETED'].includes(o.status)).length;
    const currentWeekNum = getWeekNumber(new Date());
    const currentWeekObj = availableWeeks.find((w) => w.weekNumber === currentWeekNum);
    const currentWeekEnd = currentWeekObj?.endDateKey || formatDateKey(new Date());

    const delayed = base.filter((o) => {
      const dep = o.departureTime || o.executionDate || o.requestDate;
      const depTime = dep ? new Date(dep).getTime() : 0;
      return o.isRouteDeviated || (depTime > 0 && depTime <= Date.now() && (!o.vehicle && !o.legacyVehicle || !o.driver && !o.legacyDriver || ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(o.status)));
    }).length;

    const futureUnassigned = orders.filter((o) => {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
      if (['DELIVERED', 'ACCEPTED', 'COMPLETED', 'CANCELLED'].includes(o.status)) return false;
      const dKey = formatDateKey(o.departureTime || o.executionDate || o.requestDate);
      const isAfterCurrentWeek = Boolean(dKey && dKey > currentWeekEnd);
      const isUnassigned = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(o.status) || (!o.vehicle && !o.legacyVehicle);
      return isAfterCurrentWeek && isUnassigned;
    }).length;

    return {
      ALL: base.length,
      CHO_DUYET: chuaPhanCong,
      CHUA_PHAN_CONG: chuaPhanCong,
      DA_DUYET: daGiaoViec,
      DA_GIAO_VIEC: daGiaoViec,
      WORKING: dangLamViec,
      DANG_LAM_VIEC: dangLamViec,
      DRIVER_PENDING: driverPending,
      TAI_XE_CHUA_XAC_NHAN: driverPending,
      COMPLETED: completed,
      DELAYED: delayed,
      FUTURE_UNASSIGNED: futureUnassigned,
    };
  }, [orders, selectedWeek, availableWeeks, selectedDate, selectedKLH]);

  // Tính toán cảnh báo chuyến vận chuyển quá hạn / chờ điều độ (CHỈ BÁO CHUYẾN ĐÃ ĐẾN HẠN/QUÁ HẠN)
  const computedOverdueSummary = useMemo(() => {
    const scoped = orders.filter((o) => {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
      return true;
    });

    const now = Date.now();
    // CHỈ BÁO CÁC CHUYẾN ĐÃ ĐẾN HẠN HOẶC QUÁ HẠN (depTime <= now)
    const active = scoped.filter((o) => {
      if (['COMPLETED', 'ACCEPTED', 'DELIVERED', 'CANCELLED'].includes(o.status)) return false;
      const dep = o.departureTime || o.executionDate || o.requestDate;
      if (!dep) return false;
      const depTime = new Date(dep).getTime();
      return !isNaN(depTime) && depTime <= now;
    });

    const awaitingApproval = active.filter((o) => ['DRAFT', 'PENDING_APPROVAL'].includes(o.status)).length;
    const missingVehicle = active.filter((o) => !o.vehicle && !o.legacyVehicle).length;
    const missingDriver = active.filter((o) => !o.driver && !o.legacyDriver).length;

    const totalAttention = active.filter((o) =>
      ['DRAFT', 'PENDING_APPROVAL'].includes(o.status) ||
      (!o.vehicle && !o.legacyVehicle) ||
      (!o.driver && !o.legacyDriver)
    ).length;

    const delayedList = active.filter((o) => {
      const dep = o.departureTime || o.executionDate || o.requestDate;
      if (!dep) return false;
      const depTime = new Date(dep).getTime();
      if (isNaN(depTime) || depTime > now - 15 * 60 * 1000) return false;
      return !['DEPARTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(o.status);
    });

    const lateAssigned = delayedList.filter((o) => o.status === 'ASSIGNED').length;
    const lateAccepted = delayedList.filter((o) => ['DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'].includes(o.status)).length;

    return {
      totalAttention,
      totalOverdue: delayedList.length,
      awaitingApproval,
      missingVehicle,
      missingDriver,
      lateAssigned,
      lateAccepted,
    };
  }, [orders, selectedKLH]);

  // Danh sách các loại hàng vận chuyển thực tế từ dữ liệu
  const availableCargoTypes = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      if (o.cargoType && !o.cargoType.includes('?')) s.add(o.cargoType.trim());
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        if (it.cargoName && !it.cargoName.includes('?')) s.add(it.cargoName.trim());
      }
    }
    return Array.from(s).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [orders]);

  // Danh sách các phương tiện xe thực tế từ dữ liệu
  const availableVehicles = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      const plate = o.vehicle?.plate || o.vehicle?.code || o.legacyVehicle;
      const name = o.vehicle?.name || (plate ? `Xe ${plate}` : '');
      if (plate) {
        map.set(plate, name ? `${plate} - ${name}` : plate);
      }
    }
    return Array.from(map.entries()).map(([code, label]) => ({ code, label })).sort((a, b) => a.code.localeCompare(b.code));
  }, [orders]);

  // Danh sách tài xế / lái xe thực tế từ dữ liệu
  const availableDrivers = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      const d = o.driver;
      const name = d?.fullName || o.legacyDriver;
      if (name && !name.includes('?')) s.add(name.trim());
    }
    return Array.from(s).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [orders]);

  // Lọc chuyến theo search, status, cargo, vehicle, driver và ngày
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Lọc theo Khu liên hợp từ Header
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(order, selectedKLH)) {
        return false;
      }

      // Lọc search
      if (search) {
        const q = search.toLowerCase();
        const matchCode = (order.code || '').toLowerCase().includes(q);
        const matchCont = (order.containerNumber || order.legacyTrailer || '').toLowerCase().includes(q);
        const matchOrigin = (order.origin || '').toLowerCase().includes(q);
        const matchDest = (order.destination || '').toLowerCase().includes(q);
        const orderItems = Array.isArray(order.items) ? order.items : [];
        const matchItems = orderItems.some(
          (it) =>
            (it.materialCode || '').toLowerCase().includes(q) ||
            (it.cargoName || '').toLowerCase().includes(q) ||
            (it.pickupLocation || '').toLowerCase().includes(q) ||
            (it.deliveryLocation || '').toLowerCase().includes(q)
        );
        if (!matchCode && !matchCont && !matchOrigin && !matchDest && !matchItems) {
          return false;
        }
      }

      // Lọc theo Loại hàng
      if (selectedCargo !== 'ALL') {
        const matchCargo = (order.cargoType || '').toLowerCase() === selectedCargo.toLowerCase();
        const orderItems = Array.isArray(order.items) ? order.items : [];
        const matchItems = orderItems.some((it) => (it.cargoName || '').toLowerCase() === selectedCargo.toLowerCase());
        if (!matchCargo && !matchItems) return false;
      }

      // Lọc theo Phương tiện xe
      if (selectedVehicle !== 'ALL') {
        const plate = order.vehicle?.plate || order.vehicle?.code || order.legacyVehicle;
        if (plate !== selectedVehicle) return false;
      }

      // Lọc theo Lái xe / Tài xế
      if (selectedDriver !== 'ALL') {
        const driverName = order.driver?.fullName || order.legacyDriver || '';
        if (driverName !== selectedDriver) return false;
      }

      // Lọc theo bộ lọc trạng thái nhanh (statusFilter)
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CHO_DUYET' || statusFilter === 'CHUA_PHAN_CONG') {
          if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status)) return false;
        } else if (statusFilter === 'DA_DUYET' || statusFilter === 'DA_GIAO_VIEC') {
          if (!['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'].includes(order.status)) return false;
        } else if (statusFilter === 'WORKING' || statusFilter === 'DANG_LAM_VIEC') {
          if (!['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'WORKING'].includes(order.status)) return false;
        } else if (statusFilter === 'DRIVER_PENDING' || statusFilter === 'TAI_XE_CHUA_XAC_NHAN') {
          if (order.status !== 'ASSIGNED') return false;
        } else if (statusFilter === 'COMPLETED') {
          if (!['DELIVERED', 'ACCEPTED', 'COMPLETED'].includes(order.status)) return false;
        } else if (statusFilter === 'DELAYED') {
          const dep = order.departureTime || order.executionDate || order.requestDate;
          const depTime = dep ? new Date(dep).getTime() : 0;
          const isDelayed = order.isRouteDeviated || (depTime > 0 && depTime <= Date.now() && (!order.vehicle && !order.legacyVehicle || !order.driver && !order.legacyDriver || ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status)));
          if (!isDelayed) return false;
        } else if (statusFilter === 'FUTURE_UNASSIGNED') {
          if (['DELIVERED', 'ACCEPTED', 'COMPLETED', 'CANCELLED'].includes(order.status)) return false;
          const currentWeekNum = getWeekNumber(new Date());
          const currentWeekObj = availableWeeks.find((w) => w.weekNumber === currentWeekNum);
          const currentWeekEnd = currentWeekObj?.endDateKey || formatDateKey(new Date());
          const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
          const isAfterCurrentWeek = Boolean(dKey && dKey > currentWeekEnd);
          const isUnassigned = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status) || (!order.vehicle && !order.legacyVehicle);
          if (!isAfterCurrentWeek || !isUnassigned) return false;
        } else if (order.status !== statusFilter) {
          return false;
        }
      }

      // Lọc status từ Global store
      if (selectedStatus && selectedStatus !== 'ALL' && order.status !== selectedStatus) {
        return false;
      }

      // Lọc theo Tuần (selectedWeek) - bỏ qua khi lọc Lệnh trễ hoặc Lệnh tương lai
      if (selectedWeek !== 'ALL' && statusFilter !== 'DELAYED' && statusFilter !== 'FUTURE_UNASSIGNED') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
          if (!dKey || dKey < start || dKey > end) return false;
        }
      }

      // Lọc ngày (áp dụng cho cả bảng kê và scheduler nếu không chọn ALL) - bỏ qua khi lọc Lệnh trễ hoặc Lệnh tương lai
      if (selectedDate !== 'ALL' && statusFilter !== 'DELAYED' && statusFilter !== 'FUTURE_UNASSIGNED') {
        const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
        if (dKey !== selectedDate) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.departureTime ? new Date(a.departureTime).getTime() : 0;
      const timeB = b.departureTime ? new Date(b.departureTime).getTime() : 0;
      return sortOrder === 'time_asc' ? timeA - timeB : timeB - timeA;
    });
  }, [orders, search, selectedCargo, selectedVehicle, statusFilter, selectedStatus, selectedWeek, availableWeeks, selectedDate, selectedKLH, sortOrder]);

  // Danh sách các chuyến đã hoàn tất
  const completedOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
      return ['DELIVERED', 'ACCEPTED', 'COMPLETED'].includes(o.status);
    });
  }, [orders, selectedKLH]);

  // Dữ liệu Làn xe cho Scheduler 24H Vận chuyển nội bộ
  const schedulerData = useMemo(() => {
    const laneMap = new Map<string, SchedulerLane>();
    const unassigned: SchedulerItem[] = [];

    for (const order of filteredOrders) {
      // 1. Bước quy trình 3 giai đoạn chuẩn: Tài xế giao nhận -> Đang thực hiện -> Nghiệm thu
      let stepIdx = 0;
      if (['DELIVERED', 'ACCEPTED', 'COMPLETED', 'CLOSED'].includes(order.status)) {
        stepIdx = 3; // 3. Nghiệm thu
      } else if (['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'RETURNING'].includes(order.status)) {
        stepIdx = 2; // 2. Đang thực hiện
      } else if (['APPROVED', 'ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'].includes(order.status) || order.vehicle || order.driver) {
        stepIdx = 1; // 1. Tài xế giao nhận
      }

      const fuelInfo = order.actualFuelLiters
        ? `Đã cấp ${order.actualFuelLiters}L dầu`
        : order.plannedFuelLiters ? `Định mức ${order.plannedFuelLiters}L` : undefined;

      const orderItems = Array.isArray(order.items) ? order.items : [];
      const firstItem = orderItems[0];

      const workVolume = order.distanceKm
        ? `${order.distanceKm} km · ${order.palletCount ? `${order.palletCount} Pallet` : (firstItem?.unitOfMeasure ? `${firstItem?.plannedQuantity} ${firstItem?.unitOfMeasure}` : 'Hàng rời')}`
        : undefined;

      const acceptanceInfo = order.completedBy
        ? `${order.completedBy} nghiệm thu`
        : order.acceptanceRating || (stepIdx === 3 ? 'Đã nghiệm thu giao nhận đủ' : undefined);

      const vPlate = order.vehicle?.plate || order.vehicle?.code || order.legacyVehicle || 'CHUA_GAN';
      const cNum = order.containerNumber || order.legacyTrailer;
      const driverFullName = order.driver?.fullName || order.legacyDriver;
      const driverStr = driverFullName ? (order.secondaryDriverName ? `${driverFullName} & ${order.secondaryDriverName}` : driverFullName) : undefined;

      let defaultDuration = 4;
      if (order.departureTime && order.plannedEndTime) {
        const diffH = (new Date(order.plannedEndTime).getTime() - new Date(order.departureTime).getTime()) / (1000 * 60 * 60);
        if (!isNaN(diffH) && diffH > 0 && diffH <= 24) {
          defaultDuration = Math.round(diffH * 10) / 10;
        }
      }

      const orderTitle = firstItem?.cargoName || order.cargoType || 'Lệnh vận chuyển nội bộ';

      if (vPlate === 'CHUA_GAN') {
        unassigned.push({
          id: order.id,
          code: order.code,
          title: orderTitle,
          location: `${order.origin} ➔ ${order.destination}`,
          categoryLabel: 'Vận chuyển',
          category: 'TRANSPORT',
          vehicleCode: 'Chưa gán xe',
          vehicleName: 'Chưa chọn xe tải / đầu kéo',
          driverName: driverStr || 'Chưa gán tài xế',
          startTime: order.departureTime || '07:00',
          endTime: order.plannedEndTime,
          durationHours: defaultDuration,
          status: order.status,
          workflowStepIndex: stepIdx,
          workVolume,
          fuelInfo,
          acceptanceInfo,
          isDelayed: order.isRouteDeviated,
          rawItem: order,
        });
        continue;
      }

      const laneKey = cNum && cNum !== 'Không moóc' ? `${vPlate} (${cNum})` : vPlate;

      if (!laneMap.has(laneKey)) {
        laneMap.set(laneKey, {
          laneKey,
          vehicleCode: vPlate,
          vehicleName: order.vehicle?.name || `Xe vận chuyển ${vPlate}`,
          vehiclePlate: vPlate,
          implementName: cNum && cNum !== 'Không moóc' ? `Moóc/Cont: ${cNum}` : undefined,
          primaryDriverName: driverStr,
          driverPhone: order.driver?.phone,
          category: 'TRANSPORT',
          items: [],
        });
      }

      const lane = laneMap.get(laneKey)!;
      lane.items.push({
        id: order.id,
        code: order.code,
        title: orderTitle,
        location: `${order.origin} ➔ ${order.destination}`,
        categoryLabel: 'Vận chuyển',
        category: 'TRANSPORT',
        vehicleCode: vPlate,
        vehicleName: order.vehicle?.name || lane.vehicleName,
        vehiclePlate: vPlate,
        implementName: cNum && cNum !== 'Không moóc' ? `Moóc/Cont: ${cNum}` : undefined,
        driverName: driverStr,
        driverPhone: order.driver?.phone,
        startTime: order.departureTime || '07:00',
        endTime: order.plannedEndTime || order.completedAt,
        durationHours: defaultDuration,
        status: order.status,
        workflowStepIndex: stepIdx,
        workVolume,
        fuelInfo,
        acceptanceInfo,
        isDelayed: order.isRouteDeviated,
        rawItem: order,
      });
    }

    return { lanes: Array.from(laneMap.values()), unassigned };
  }, [filteredOrders]);

  // Nhóm theo xe (Lanes) cho Scheduler
  const lanes = useMemo(() => {
    const result = new Map<string, { vehicleLabel: string; trailerLabel: string; driverLabel: string; trips: TransportOrderRecord[] }>();
    for (const order of filteredOrders) {
      const vPlate = order.vehicle?.plate || order.vehicle?.code || order.legacyVehicle || 'Chưa gán xe';
      const cNum = order.containerNumber || order.legacyTrailer || 'Không moóc';
      const key = `${vPlate}__${cNum}`;

      const d1 = order.driver?.fullName || order.legacyDriver || 'Chưa có tài xế';
      const d2 = order.secondaryDriverName ? ` & ${order.secondaryDriverName}` : '';
      const driverStr = `${d1}${d2}`;

      const existing = result.get(key);
      if (existing) {
        existing.trips.push(order);
      } else {
        result.set(key, {
          vehicleLabel: vPlate,
          trailerLabel: cNum,
          driverLabel: driverStr,
          trips: [order],
        });
      }
    }
    return [...result.entries()];
  }, [filteredOrders]);

  const handleStepDate = (days: number) => {
    const base = selectedDate === 'ALL' ? new Date() : new Date(selectedDate);
    base.setDate(base.getDate() + days);
    setSelectedDate(formatDateKey(base));
  };

  const handleSelectToday = () => {
    setSelectedWeek(getWeekNumber(new Date()));
    setSelectedDate(formatDateKey(new Date()));
  };

  // 8 CỘT CHUẨN HÓA ĐỒNG BỘ TOÀN HỆ THỐNG
  const columns: Column<TransportOrderRecord>[] = [
    {
      key: 'code',
      title: 'Mã lệnh & Phân loại',
      width: '200px',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenTransportOrder(row)}
              className="font-mono font-bold text-primary hover:underline block text-left text-xs cursor-pointer"
            >
              {row.code}
            </button>
          </div>
          {row.planCode && (
            <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50/90 border border-emerald-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1" title={`Thuộc Kế hoạch lớn: ${row.planCode}`}>
              <span className="text-slate-500 font-medium">KH:</span>
              <span className="font-bold">{row.planCode}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
              <Truck className="h-3 w-3 text-blue-600" /> Vận chuyển nội bộ
            </span>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              row.routeType === 'TWO_WAY'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {row.transportMode || (row.routeType === 'TWO_WAY' ? '2 Chiều' : '1 Chiều')}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'departureTime',
      title: 'Thời gian thực hiện',
      width: '155px',
      sortable: true,
      render: (row) => {
        const dStr = row.executionDate || row.departureTime;
        const d = dStr ? new Date(dStr) : null;
        return (
          <div className="text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {d && !isNaN(d.getTime()) ? d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-slate-400" />
              {extractHourString(row.departureTime)}
              {row.plannedEndTime && ` ➔ ${extractHourString(row.plannedEndTime)}`}
            </div>
          </div>
        );
      },
    },
    {
      key: 'purpose',
      title: 'Nhiệm vụ & Khối lượng',
      width: '200px',
      render: (row) => {
        const rowItems = Array.isArray(row.items) ? row.items : [];
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              <b className="font-bold text-slate-900 text-xs leading-snug">{row.cargoType || 'Vận chuyển hàng hóa nội bộ'}</b>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{row.unit || 'BAN_CO_GIOI'}</span>
              {(row.tonnage || row.palletCount) && (
                <span className="font-bold text-emerald-700">
                  🎯 {row.tonnage || row.palletCount} {row.palletCount ? 'Pallet' : 'Tấn'}
                </span>
              )}
            </div>
            {rowItems.length > 0 && (
              <div className="text-[10.5px] text-slate-600 line-clamp-1" title={rowItems.map(i => `${i.cargoName} (${i.plannedQuantity} ${i.unitOfMeasure})`).join(', ')}>
                📦 {rowItems[0]?.cargoName} ({rowItems[0]?.plannedQuantity} {rowItems[0]?.unitOfMeasure}) {rowItems.length > 1 ? `+${rowItems.length - 1} mục` : ''}
              </div>
            )}
            {row.notes && (
              <div className="text-[10.5px] text-slate-500 italic line-clamp-1" title={`Ghi chú: ${row.notes}`}>
                📝 {row.notes}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'vehicle',
      title: 'Phương tiện & Thiết bị',
      width: '120px',
      render: (row) => {
        const hasVehicle = Boolean(row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle);
        return (
          <div className="text-xs space-y-0.5 max-w-[115px]">
            <div className={`font-bold flex items-center gap-1.5 ${!hasVehicle ? 'text-red-700' : 'text-slate-900'}`}>
              <Truck className={`h-3.5 w-3.5 shrink-0 ${!hasVehicle ? 'text-red-500' : 'text-slate-500'}`} />
              <span className="truncate">{row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle || 'Chưa gán xe'}</span>
            </div>
            {(row.containerNumber || row.legacyTrailer || row.trailer?.code) && (
              <div className="text-[10px] font-mono text-slate-700 truncate bg-amber-50 px-1 rounded border border-amber-200" title={row.containerNumber || row.legacyTrailer || row.trailer?.code}>
                Moóc: {row.containerNumber || row.legacyTrailer || row.trailer?.code}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'driver',
      title: 'Lái xe / Thợ máy',
      width: '135px',
      render: (row) => {
        const d1 = row.driver?.fullName || row.legacyDriver;
        const d2 = row.secondaryDriverName;
        return (
          <div className="text-xs">
            <div className={`font-bold flex items-center gap-1 ${!d1 ? 'text-red-700' : 'text-slate-800'}`}>
              <User className={`h-3.5 w-3.5 shrink-0 ${!d1 ? 'text-red-500' : 'text-slate-400'}`} />
              <span className="truncate">{d1 || 'Chưa gán tài xế'}</span>
            </div>
            {d2 && (
              <div className="text-[10px] text-indigo-700 font-medium mt-0.5 flex items-center gap-1 truncate">
                <Users className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">Phụ: {d2}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'route',
      title: 'Lộ trình / Vị trí',
      width: '260px',
      render: (row) => {
        const p1 = row.items[0]?.pickupLocation || row.origin || 'Kho vật tư trung tâm';
        const d1 = row.items[0]?.deliveryLocation || row.destination || 'Điểm giao hàng';
        return (
          <div className="text-xs space-y-0.5 min-w-[200px]">
            <div className="flex items-start gap-1 text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium text-slate-700 leading-snug">{p1}</span>
            </div>
            <div className="text-xs font-bold text-slate-900 pl-4.5 leading-snug break-words">
              ➔ {d1}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '135px',
      render: (row) => {
        const hasVehicle = Boolean(row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle);
        const hasDriver = Boolean(row.driver?.fullName || row.legacyDriver);
        return (
          <div className="space-y-1">
            <StatusBadge status={row.status} />
            {(!hasVehicle || !hasDriver) && ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(row.status) && (
              <div className="flex flex-wrap gap-1">
                {!hasVehicle && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Thiếu xe</span>}
                {!hasDriver && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Thiếu tài xế</span>}
              </div>
            )}
            {row.isRouteDeviated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Lệch tuyến
              </span>
            )}
            {row.plannedFuelLiters && (
              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <Fuel className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Định mức: <b>{row.plannedFuelLiters}L</b></span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'user',
      title: 'User',
      width: '70px',
      align: 'center',
      render: (row) => (
        <AuditUserPopover
          createdDate={row.executionDate || row.departureTime || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.completedAt || row.executionDate || '14-03-2026'}
          updatedUser="admin"
          title={`Lệnh vận chuyển: ${row.code}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '140px',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenTransportOrder(row)}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border border-emerald-200"
            title="Lệnh điều xe vận chuyển"
          >
            <Truck className="w-3.5 h-3.5" />
          </button>
          <TableRowActions
            onView={() => handleOpenTransportOrder(row)}
            onEdit={() => handleOpenTransportOrder(row)}
            onDelete={() => {
              if (window.confirm(`Xác nhận xóa lệnh vận chuyển ${row.code}?`)) {
                setOrders((prev) => prev.filter((o) => o.id !== row.id));
              }
            }}
          />
        </div>
      ),
    },
  ];

  // BẢNG QUẢN LÝ CHUYẾN VẬN CHUYỂN ĐÃ HOÀN TẤT
  const completedColumns: Column<TransportOrderRecord>[] = [
    {
      key: 'code',
      title: 'Mã chuyến & Hình thức',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenTransportOrder(row)}
              className="font-mono font-bold text-primary hover:underline block text-left"
            >
              {row.code}
            </button>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Đã giao hàng
            </span>
          </div>
          <span className="inline-block text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {row.transportMode || (row.routeType === 'TWO_WAY' ? '2 Chiều (Đối lưu)' : '1 Chiều')}
          </span>
        </div>
      ),
    },
    {
      key: 'cargo',
      title: 'Hàng hóa & Khối lượng bàn giao',
      render: (row) => (
        <div className="space-y-1 max-w-[280px]">
          <b className="text-xs font-bold text-slate-900 block truncate" title={row.cargoType}>
            {row.cargoType || (row.items?.[0]?.cargoName ?? 'Hàng hóa nội bộ')}
          </b>
          {row.items && row.items.length > 0 && (
            <div className="text-[11px] text-slate-600">
              <span className="font-extrabold text-emerald-700">
                {row.items.reduce((sum, it) => sum + (it.actualQuantity || it.plannedQuantity), 0)} {row.items[0].unitOfMeasure}
              </span>
              <span className="text-slate-400 ml-1.5">({row.items.length} mặt hàng)</span>
            </div>
          )}
          {row.palletCount ? (
            <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
              📦 {row.palletCount} Pallet
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Số Xe / Cont & Moóc',
      width: '120px',
      render: (row) => (
        <div className="space-y-0.5 text-xs max-w-[115px]">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle || '—'}</span>
          </div>
          {(row.containerNumber || row.legacyTrailer) && (
            <div className="text-[10px] font-mono text-slate-600 bg-slate-50 px-1 py-0.5 rounded border border-slate-200 truncate" title={row.containerNumber || row.legacyTrailer}>
              Moóc: {row.containerNumber || row.legacyTrailer}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'driver',
      title: 'Đội ngũ lái xe (Lái đôi)',
      width: '135px',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{row.driver?.fullName || row.legacyDriver || '—'}</span>
          </div>
          {row.secondaryDriverName && (
            <div className="text-[10px] text-purple-700 font-medium flex items-center gap-1 truncate">
              <Users className="h-3 w-3 text-purple-500 shrink-0" />
              <span className="truncate">Phụ: {row.secondaryDriverName}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'route',
      title: 'Lộ trình giao nhận',
      width: '260px',
      render: (row) => (
        <div className="text-xs space-y-0.5 min-w-[200px]">
          <div className="text-slate-600 flex items-center gap-1 font-medium">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="leading-snug">{row.origin || 'Kho xuất'}</span>
          </div>
          <div className="text-xs font-bold text-slate-900 pl-4.5 leading-snug break-words">
            ➔ {row.destination || 'Điểm giao'}
          </div>
          {row.distanceKm && (
            <div className="text-[10px] text-slate-400 pl-4.5 font-medium">
              Cự ly: {row.distanceKm} km
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'departureTime',
      title: 'Thời gian khởi hành',
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            {row.departureTime ? formatDateTimeVN(row.departureTime) : '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'completedAt',
      title: 'Thời gian hoàn thành lúc nào',
      sortable: true,
      render: (row) => {
        const completedDate = row.completedAt
          ? new Date(row.completedAt)
          : row.plannedEndTime
            ? new Date(row.plannedEndTime)
            : null;
        if (!completedDate || isNaN(completedDate.getTime())) {
          return <span className="text-slate-400 italic">Chưa ghi nhận</span>;
        }

        let durationText = '';
        if (row.departureTime) {
          const startMs = new Date(row.departureTime).getTime();
          const endMs = completedDate.getTime();
          const diffMinutes = Math.round((endMs - startMs) / (1000 * 60));
          if (diffMinutes > 0) {
            const h = Math.floor(diffMinutes / 60);
            const m = diffMinutes % 60;
            durationText = h > 0 ? `${h}h${m > 0 ? ` ${m}p` : ''}` : `${m} phút`;
          }
        }

        return (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-2 text-xs space-y-1 shadow-2xs">
            <div className="flex items-center gap-1 font-bold text-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-black text-emerald-800">
                {completedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                · {completedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
            {durationText && (
              <div className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1 pl-5">
                <span>⏱ Hành trình: <b>{durationText}</b></span>
                <span className="text-emerald-600">· Đúng tiến độ</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'fuel',
      title: 'Dầu tiêu hao',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <b className="text-slate-900 block font-bold">
            {row.actualFuelLiters ?? row.plannedFuelLiters ?? '—'} Lít
          </b>
          {row.plannedFuelLiters && (
            <span className="text-[10px] text-slate-500 block">
              Định mức: {row.plannedFuelLiters} Lít
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'acceptance',
      title: 'Người nhận hàng & Ký nhận',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-900">
            {row.completedBy || 'Thủ kho / Đại diện nhận'}
          </div>
          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
            {row.acceptanceRating || 'Đã ký nhận đủ số lượng'}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      title: 'User',
      width: '70px',
      align: 'center',
      render: (row) => (
        <AuditUserPopover
          createdDate={row.executionDate || row.departureTime || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.completedAt || row.executionDate || '14-03-2026'}
          updatedUser="admin"
          title={`Biên bản giao hàng: ${row.code}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      align: 'center',
      width: '140px',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenTransportOrder(row)}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border border-emerald-200"
            title="Biên bản giao hàng"
          >
            <Truck className="w-3.5 h-3.5" />
          </button>
          <TableRowActions
            onView={() => handleOpenTransportOrder(row)}
            onEdit={() => handleOpenTransportOrder(row)}
            onDelete={() => {
              if (window.confirm(`Xác nhận xóa lệnh ${row.code}?`)) {
                setOrders((prev) => prev.filter((o) => o.id !== row.id));
              }
            }}
          />
        </div>
      ),
    },
  ];

  // Thêm dòng hàng mới trong modal
  const handleAddItemRow = () => {
    setCreateItems((prev) => [
      ...prev,
      {
        materialCode: '',
        cargoName: '',
        unitOfMeasure: 'Tấn',
        plannedQuantity: 1,
        pickupLocation: prev[0]?.pickupLocation || 'DP Tổng kho',
        deliveryLocation: prev[0]?.deliveryLocation || 'LP1',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (createItems.length === 1) return;
    setCreateItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index: number, field: keyof NewItemRow, value: string | number) => {
    setCreateItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Submit tạo vận đơn mới
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);

    const code = String(form.get('code') || `LVC-${Date.now()}`);
    const reqDate = String(form.get('requestDate') || new Date().toISOString().split('T')[0]);
    const execDate = String(form.get('executionDate') || new Date().toISOString().split('T')[0]);
    const timeSlot = String(form.get('timeSlot') || '07:00');
    const departureIso = new Date(`${execDate}T${timeSlot}:00.000Z`).toISOString();

    const containerNumber = String(form.get('containerNumber') || 'Không moóc');
    const routeType = form.get('routeType') === 'TWO_WAY' ? 'TWO_WAY' : 'ONE_WAY';
    const returnCargoName = routeType === 'TWO_WAY' ? String(form.get('returnCargoName') || '').trim() || undefined : undefined;
    const returnTonnage = returnCargoName ? Number(form.get('returnTonnage') || 0) : undefined;
    const returnOrigin = routeType === 'TWO_WAY' ? String(form.get('returnOrigin') || '').trim() || undefined : undefined;
    const returnDestination = routeType === 'TWO_WAY' ? String(form.get('returnDestination') || '').trim() || undefined : undefined;
    const cargoHandlingStatus = String(form.get('cargoHandlingStatus') || 'Đã lên hàng');
    const trailerNote = String(form.get('trailerNote') || '');

    const newItems: TransportItemRecord[] = createItems.map((item, idx) => ({
      id: Date.now() + idx,
      materialCode: item.materialCode || undefined,
      cargoName: item.cargoName || 'Hàng tổng hợp',
      unitOfMeasure: item.unitOfMeasure || 'Chuyến',
      plannedQuantity: Number(item.plannedQuantity) || 0,
      actualQuantity: Number(item.plannedQuantity) || 0,
      pickupLocation: item.pickupLocation,
      deliveryLocation: item.deliveryLocation,
    }));

    const newOrder: TransportOrderRecord = {
      id: Date.now(),
      code,
      routeType,
      transportMode: routeType === 'TWO_WAY' ? '2 Chiều (Đối lưu)' : '1 Chiều',
      flowType: 'STANDARD',
      unit: 'BAN_CO_GIOI',
      requestDate: reqDate,
      executionDate: execDate,
      departureTime: departureIso,
      distanceKm: 50,
      plannedFuelLiters: 20,
      palletCount: Number(form.get('palletCount')) || 0,
      cargoHandlingStatus,
      trailerNote,
      containerNumber,
      legacyTrailer: containerNumber,
      status: 'DRAFT',
      isRouteDeviated: false,
      origin: newItems[0]?.pickupLocation || 'DP-NL',
      destination: newItems[0]?.deliveryLocation || 'LP1',
      cargoType: newItems.map((i) => i.cargoName).join(', '),
      items: newItems,
      returnCargoName,
      returnTonnage,
      returnOrigin,
      returnDestination,
    };

    try {
      await operationsApi.createTransport({
        sourceType: 'MANUAL_EXCEPTION',
        exceptionReason: String(form.get('notes') || 'Lệnh vận chuyển phát sinh ngoài kế hoạch'),
        code: newOrder.code,
        unit: newOrder.unit,
        routeType: newOrder.routeType,
        flowType: newOrder.flowType,
        requestDate: newOrder.requestDate,
        executionDate: newOrder.executionDate,
        origin: newOrder.origin,
        destination: newOrder.destination,
        cargoType: newOrder.cargoType,
        items: newOrder.items,
        returnCargoName,
        returnTonnage,
        returnOrigin,
        returnDestination,
      });
    } catch {
      // Backend api optional fallback
    }

    setOrders((prev) => [newOrder, ...prev]);
    setShowCreate(false);
    setSaving(false);
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setPreview(null);
    try {
      const parsed = await readTransportWorkbook(file);
      setWorkbook(parsed);
      setPreview(await operationsApi.previewImport(parsed));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đọc file Excel.');
      setShowImport(false);
    } finally {
      setImporting(false);
    }
  };

  const commit = async () => {
    if (!workbook || !preview?.canCommit) return;
    setImporting(true);
    try {
      await operationsApi.commitImport(workbook);
      setShowImport(false);
      setWorkbook(null);
      setPreview(null);
      await load();
    } catch {
      setError('Không thể commit file; file có thể đã được nhập hoặc dữ liệu đã thay đổi.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Lệnh điều xe Vận chuyển</h1>
      </div>

      {/* OVERDUE BANNER: Cảnh báo chuyến vận chuyển quá hạn */}
      {computedOverdueSummary && (computedOverdueSummary.totalAttention > 0 || computedOverdueSummary.totalOverdue > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">
              {computedOverdueSummary.totalAttention} chuyến vận chuyển chờ điều độ · {computedOverdueSummary.totalOverdue} chuyến trễ xuất bến
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {computedOverdueSummary.awaitingApproval} chưa duyệt · {computedOverdueSummary.missingVehicle} thiếu xe · {computedOverdueSummary.missingDriver} thiếu tài xế · {computedOverdueSummary.lateAssigned} chờ tài xế nhận · {computedOverdueSummary.lateAccepted} đã nhận nhưng chưa chạy.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
            onClick={() => { setSelectedWeek('ALL'); setSelectedDate('ALL'); setStatusFilter('CHUA_PHAN_CONG'); setView('table'); }}
          >
            Xem và xử lý
          </button>
        </div>
      )}

      {/* THANH BỘ LỌC PHÂN LOẠI LỆNH (CATEGORY SEGMENTED TABS) */}
      <DispatchCategoryTabs activeTab="VAN_CHUYEN" />

      {/* 4. KPI Summary Cards 8 nhóm chuẩn hóa 4x2 */}
      <KPIGrid cols={4}>
        {/* Hàng 1: Toàn bộ | Lệnh trễ phân công | Đôn đốc | Kế hoạch tuần tới */}
        <StatCard
          label={selectedDate === 'ALL' ? 'Tổng chuyến vận tải' : `Tổng chuyến (${selectedDate})`}
          value={statusCounts.ALL}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          pillText="Toàn bộ"
          pillVariant="neutral"
          onClick={() => setStatusFilter('ALL')}
          className={statusFilter === 'ALL' ? 'ring-2 ring-blue-500/30 border-blue-500' : ''}
        />
        <StatCard
          label="Chuyến trễ do chưa phân công"
          value={statusCounts.DELAYED}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          pillText="Lệnh trễ phân công"
          pillVariant="danger"
          onClick={() => {
            setSelectedWeek('ALL');
            setSelectedDate('ALL');
            setStatusFilter(statusFilter === 'DELAYED' ? 'ALL' : 'DELAYED');
          }}
          className={statusFilter === 'DELAYED' ? 'ring-2 ring-rose-500/30 border-rose-500' : ''}
        />
        <StatCard
          label="Tài xế chưa xác nhận nhận chuyến"
          value={statusCounts.DRIVER_PENDING}
          icon={<UserCheck className="h-5 w-5 text-amber-600" />}
          pillText="Đôn đốc"
          pillVariant="warning"
          onClick={() => setStatusFilter(statusFilter === 'DRIVER_PENDING' ? 'ALL' : 'DRIVER_PENDING')}
          className={statusFilter === 'DRIVER_PENDING' ? 'ring-2 ring-amber-500/30 border-amber-500' : ''}
        />
        <StatCard
          label="Chưa điều chuyến kế hoạch tuần sau"
          value={statusCounts.FUTURE_UNASSIGNED}
          icon={<CalendarDays className="h-5 w-5 text-purple-600" />}
          pillText="Kế hoạch tuần tới"
          pillVariant="neutral"
          onClick={() => {
            setSelectedWeek('ALL');
            setSelectedDate('ALL');
            setStatusFilter(statusFilter === 'FUTURE_UNASSIGNED' ? 'ALL' : 'FUTURE_UNASSIGNED');
          }}
          className={statusFilter === 'FUTURE_UNASSIGNED' ? 'ring-2 ring-purple-500/30 border-purple-500' : ''}
        />

        {/* Hàng 2: Chờ duyệt phân công | Đã phân công | Đang vận hành | Nghiệm thu */}
        <StatCard
          label="Chờ duyệt chuyến & gán xe/tài"
          value={statusCounts.CHUA_PHAN_CONG}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          pillText="Chờ duyệt phân công"
          pillVariant="warning"
          onClick={() => setStatusFilter(statusFilter === 'CHUA_PHAN_CONG' ? 'ALL' : 'CHUA_PHAN_CONG')}
          className={statusFilter === 'CHUA_PHAN_CONG' ? 'ring-2 ring-amber-500/30 border-amber-500' : ''}
        />
        <StatCard
          label="Đã điều xe & phân công lái xe"
          value={statusCounts.DA_GIAO_VIEC}
          icon={<Send className="h-5 w-5 text-indigo-600" />}
          pillText="Đã phân công"
          pillVariant="neutral"
          onClick={() => setStatusFilter(statusFilter === 'DA_GIAO_VIEC' ? 'ALL' : 'DA_GIAO_VIEC')}
          className={statusFilter === 'DA_GIAO_VIEC' ? 'ring-2 ring-indigo-500/30 border-indigo-500' : ''}
        />
        <StatCard
          label="Xe đang vận chuyển trên lộ trình"
          value={statusCounts.DANG_LAM_VIEC}
          icon={<Activity className="h-5 w-5 text-emerald-600" />}
          pillText="Đang vận hành"
          pillVariant="success"
          onClick={() => setStatusFilter(statusFilter === 'DANG_LAM_VIEC' ? 'ALL' : 'DANG_LAM_VIEC')}
          className={statusFilter === 'DANG_LAM_VIEC' ? 'ring-2 ring-emerald-500/30 border-emerald-500' : ''}
        />
        <StatCard
          label="Đã giao hàng & nghiệm thu"
          value={statusCounts.COMPLETED}
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
          pillText="Nghiệm thu"
          pillVariant="success"
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={statusFilter === 'COMPLETED' ? 'ring-2 ring-teal-500/30 border-teal-500' : ''}
        />
      </KPIGrid>

      {/* Filter Bar theo chuẩn Enterprise (Hình 2: Grid trường có tiêu đề + Hàng nút thao tác) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5">
        {/* Hàng 1: Grid các trường lọc có Header Label in hoa bên trên */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Cột 1: Mã vận đơn / Từ khóa tìm kiếm */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Mã vận đơn / Kho / Tuyến
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã đơn, lộ trình..."
                className="w-full h-9 pl-9 pr-7 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-all shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Cột 2: Loại hàng vận chuyển */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Loại hàng vận chuyển
            </label>
            <div className="relative">
              <select
                value={selectedCargo}
                onChange={(e) => setSelectedCargo(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả loại hàng ({availableCargoTypes.length})</option>
                {availableCargoTypes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cột 3: Phương tiện xe */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Phương tiện / Xe chở hàng
            </label>
            <div className="relative">
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả xe ({availableVehicles.length})</option>
                {availableVehicles.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cột 4: Tài xế / Lái xe */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Tài xế / Lái xe
            </label>
            <div className="relative">
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả tài xế ({availableDrivers.length})</option>
                {availableDrivers.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cột 5: Tuần kế hoạch */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Tuần kế hoạch
            </label>
            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setSelectedWeek(val);
                  setSelectedDate('ALL');
                }}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả các tuần</option>
                {availableWeeks.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cột 6: Ngày vận chuyển */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Ngày vận chuyển cụ thể
            </label>
            <div className="flex items-center gap-1 bg-slate-50/70 rounded-xl border border-slate-200 p-0.5 h-9 shadow-2xs">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                title="Ngày trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 px-1 py-0.5 focus:outline-none cursor-pointer min-w-0"
              />
              <button
                type="button"
                onClick={() => handleStepDate(1)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                title="Ngày sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Hàng 2: Toolbar Nút Thao Tác (Nhập lại, Tìm kiếm, Ngày trong tuần, Nhập Excel, In/PDF, Tạo mới) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Nhập lại */}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCargo('ALL');
                setSelectedVehicle('ALL');
                setSelectedDriver('ALL');
                setSelectedWeek(getWeekNumber(new Date()));
                setSelectedDate(formatDateKey(new Date()));
                setStatusFilter('ALL');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Nhập lại</span>
            </button>

            {/* Nút Tìm kiếm */}
            <button
              type="button"
              onClick={() => {
                // Focus search or trigger refresh
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer select-none active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm kiếm</span>
            </button>

            {/* Nếu đang lọc theo Tuần: Hiển thị các pill Ngày trong tuần T2 -> CN */}
            {selectedWeek !== 'ALL' && (
              <div className="flex flex-wrap items-center gap-1 pl-1">
                <span className="text-slate-300 mx-0.5">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedDate('ALL')}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDate === 'ALL'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cả tuần {selectedWeek}
                </button>
                {weekDays.map((d) => {
                  const isDayActive = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none active:scale-95 ${
                        isDayActive
                          ? 'bg-primary text-white shadow-2xs'
                          : d.isToday
                          ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-extrabold'
                          : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{d.shortName} ({d.displayDate})</span>
                      {d.isToday && (
                        <span className={`text-[9px] px-1 rounded font-black ${isDayActive ? 'bg-white/30 text-white' : 'bg-amber-500 text-white'}`}>
                          Nay
                        </span>
                      )}
                      {d.count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isDayActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-2xs'}`}>
                          {d.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cụm Action Buttons bên phải */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Nhập Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>In / PDF</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/lenh-dieu-xe/tao-moi?category=TRANSPORT')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-extrabold shadow-2xs transition-all cursor-pointer select-none active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Lập lệnh điều xe mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs + Lọc trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher<'scheduler' | 'table' | 'board'>
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: 'Bảng kê tổng hợp toàn bộ lệnh' },
            { value: 'scheduler', label: 'Scheduler lịch chạy theo xe' },
            { value: 'board', label: 'Kanban 4 nhóm trạng thái' },
          ]}
        />
        {(view === 'table' || view === 'scheduler') && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-xs">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Lọc trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">Toàn bộ trạng thái ({statusCounts.ALL})</option>
              <option value="DELAYED">Lệnh trễ phân công ({statusCounts.DELAYED})</option>
              <option value="DRIVER_PENDING">Đôn đốc tài xế ({statusCounts.DRIVER_PENDING})</option>
              <option value="FUTURE_UNASSIGNED">Kế hoạch tuần tới ({statusCounts.FUTURE_UNASSIGNED})</option>
              <option value="CHUA_PHAN_CONG">Chờ duyệt phân công ({statusCounts.CHUA_PHAN_CONG})</option>
              <option value="DA_GIAO_VIEC">Đã phân công ({statusCounts.DA_GIAO_VIEC})</option>
              <option value="DANG_LAM_VIEC">Đang vận hành ({statusCounts.DANG_LAM_VIEC})</option>
              <option value="COMPLETED">Nghiệm thu ({statusCounts.COMPLETED})</option>
            </select>
          </div>
        )}
      </div>



      {/* VIEW NỘI DUNG CHÍNH */}
      {view === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredOrders}
          isLoading={loading}
          onRowClick={handleOpenTransportOrder}
          controlledPage={page}
          totalItems={filteredOrders.length}
          onPageChange={setPage}
          useGlobalFilters={false}
        />
      ) : view === 'scheduler' ? (
        /* GIAO DIỆN SCHEDULER LỊCH CHẠY THEO XE VẬN CHUYỂN NỘI BỘ 24 TIẾNG */
        <Vehicle24hScheduler
          title="Scheduler lịch chạy xe Vận chuyển nội bộ 24h"
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          availableDates={availableDates}
          lanes={schedulerData.lanes}
          unassignedItems={schedulerData.unassigned}
          onItemClick={handleOpenTransportOrder}
          kind="TRANSPORT"
        />
      ) : (
        /* GIAO DIỆN KANBAN 4 NHÓM */
        <div className="grid gap-3 lg:grid-cols-4">
          {boards.map((board) => {
            const boardOrders = filteredOrders.filter((order) => board.statuses.includes(order.status));
            return (
              <section key={board.title} className="min-h-72 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                <h3 className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold text-slate-800">
                  <span>{board.title}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                    {boardOrders.length}
                  </span>
                </h3>

                <div className="space-y-2.5">
                  {boardOrders.map((order) => (
                    <button
                      type="button"
                      key={order.id}
                      onClick={() => handleOpenTransportOrder(order)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs shadow-xs hover:border-primary hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <b className="text-primary font-mono font-bold">{order.code}</b>
                        <span className="font-mono text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                          {extractHourString(order.departureTime)}
                        </span>
                      </div>

                      <h4 className="my-1.5 font-bold text-slate-900 leading-snug line-clamp-2">
                        {order.items[0]?.cargoName || order.cargoType || 'Chưa rõ hàng'}
                      </h4>

                      <div className="space-y-1 text-slate-600 text-[11px]">
                        <p className="font-semibold text-slate-800">
                          Xe: {order.vehicle?.plate || order.vehicle?.code || '—'} · Cont: {order.containerNumber || '—'}
                        </p>
                        <p className="text-slate-500">
                          Tài xế: {order.driver?.fullName || '—'} {order.secondaryDriverName ? `& ${order.secondaryDriverName}` : ''}
                        </p>
                        <p className="text-slate-500 truncate">
                          Tuyến: {order.origin} ➔ {order.destination}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                        <StatusBadge status={order.status} />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {order.routeType === 'TWO_WAY' ? '2 chiều' : '1 chiều'}
                        </span>
                      </div>
                    </button>
                  ))}

                  {!boardOrders.length && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
                      Không có chuyến
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* MODAL CHI TIẾT VẬN ĐƠN KHỚP 100% 16 CỘT EXCEL */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Chi tiết lệnh vận chuyển nội bộ: ${selected?.code ?? ''}`}
        size="xl"
        hideFooter={true}
      >
        {selected && (
          <div className="space-y-4 text-xs">
            {/* Header info cards */}
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-4 border border-slate-200">
              <div>
                <span className="text-slate-500 block font-medium">Ngày yêu cầu / Ngày chạy</span>
                <b className="text-slate-900 text-xs">
                  {formatDateDisplay(selected.executionDate || selected.departureTime)}
                </b>
                <span className="block text-[11px] text-slate-400">
                  (Y/c: {formatDateDisplay(selected.requestDate)})
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Khung giờ xuất phát</span>
                <b className="text-blue-800 text-sm font-mono">
                  {extractHourString(selected.departureTime)}
                </b>
                <span className="block text-[11px] text-slate-500">
                  {formatDateTimeVN(selected.departureTime)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Số xe & Cont/Moóc</span>
                <b className="text-slate-900 text-sm">
                  {selected.vehicle?.plate || selected.vehicle?.code || selected.legacyVehicle || '—'}
                </b>
                <span className="block text-[11px] font-mono font-bold text-amber-800">
                  Cont: {selected.containerNumber || selected.legacyTrailer || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Tổ lái xe (Chạy đôi)</span>
                <b className="text-slate-900 text-xs">
                  1. {selected.driver?.fullName || selected.legacyDriver || '—'}
                </b>
                {selected.secondaryDriverName && (
                  <b className="block text-indigo-700 text-xs">
                    2. {selected.secondaryDriverName} (Chạy đôi)
                  </b>
                )}
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Hình thức vận chuyển</span>
                <b className="text-slate-900 text-xs">
                  {selected.transportMode || (selected.routeType === 'TWO_WAY' ? '2 Chiều (Đối lưu)' : '1 Chiều')}
                </b>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Trạng thái hàng hóa</span>
                <b className="text-emerald-800 text-xs">
                  {selected.cargoHandlingStatus || '—'}
                </b>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Ghi chú thùng xe</span>
                <p className="text-slate-800 text-xs font-medium">
                  {selected.trailerNote || '—'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Trạng thái quy trình</span>
                <span className="block mt-1">
                  <StatusBadge status={selected.status} />
                </span>
              </div>
            </div>

            {/* Bảng kê danh mục hàng hóa chi tiết */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Bảng kê mặt hàng vận chuyển ({(Array.isArray(selected.items) ? selected.items : []).length} dòng hàng)</span>
                <span className="text-slate-500 font-normal normal-case">
                  Khớp cột 11 ➔ 16 theo biểu mẫu
                </span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 w-12 text-center">STT</th>
                      <th className="p-2.5">Mã vật tư</th>
                      <th className="p-2.5">Tên hàng hóa chi tiết</th>
                      <th className="p-2.5">ĐVT</th>
                      <th className="p-2.5 text-right">Kế hoạch SL</th>
                      <th className="p-2.5 text-right">Thực tế SL</th>
                      <th className="p-2.5">Nơi nhận hàng</th>
                      <th className="p-2.5">Nơi giao hàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(Array.isArray(selected.items) ? selected.items : []).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-700">
                          {item.materialCode ? (
                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              {item.materialCode}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{item.cargoName}</td>
                        <td className="p-2.5 text-slate-700 font-medium">{item.unitOfMeasure}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {item.plannedQuantity?.toLocaleString('vi-VN')}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-slate-600">
                          {item.actualQuantity !== undefined ? item.actualQuantity.toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="p-2.5 text-slate-800 font-medium">{item.pickupLocation || '—'}</td>
                        <td className="p-2.5 text-slate-800 font-medium">{item.deliveryLocation || '—'}</td>
                      </tr>
                    ))}
                    {(Array.isArray(selected.items) ? selected.items : []).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                          Chưa có dòng hàng chi tiết
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Print Signatures Block (ẩn khi xem thường, hiện khi in) */}
            <WorkflowActionPanel
              key={selected.id}
              kind="TRANSPORT"
              step={workflowStep(selected.status)}
              taskName={selected.cargoType || (Array.isArray(selected.items) ? selected.items.map((item) => item.cargoName).join(', ') : '') || 'Vận chuyển nội bộ'}
              vehicleCode={workflowStep(selected.status) === 'PENDING' ? undefined : selected.vehicle?.code}
              driverName={workflowStep(selected.status) === 'PENDING' ? undefined : selected.driver?.fullName}
              implementName={selected.containerNumber || selected.trailerNote}
              currentOrderId={selected.id}
              recommendationWorkOrderId={selected.operationalWorkOrder?.id}
              existingOrders={orders}
              initialStartTime={selected.departureTime}
              initialDurationHours={selected.departureTime && selected.plannedEndTime ? Math.max(0.5, (new Date(selected.plannedEndTime).getTime() - new Date(selected.departureTime).getTime()) / 3_600_000) : 8}
              unit={selected.unit}
              complexCode={(selected as any).complexCode || (selected as any).operationalWorkOrder?.complexCode || 'KOUN_MOM'}
              onApprove={async (vehicle, driver, schedule, implement) => {
                try {
                  const updated = await operationsApi.assignTransport(selected.id, {
                    vehicleId: vehicle.id,
                    driverId: driver.id,
                    ...(typeof implement?.id === 'number' && implement.id < 90_000 ? { implementId: implement.id } : {}),
                    departureTime: schedule.startTime,
                    plannedEndTime: schedule.endTime,
                  });
                  updateOrderView(selected.id, updated);
                  useAppStore.getState().setHeaderAlert({ type: 'success', message: `Đã phê duyệt và phân công ${vehicle.code} cho vận đơn ${selected.code}.` });
                } catch (error: any) {
                  const body = error?.response?.data;
                  const reasons = body?.message?.reasons ?? body?.reasons;
                  const message = Array.isArray(reasons) ? reasons.map((item: any) => item.message).filter(Boolean).join('; ') : typeof body?.message === 'string' ? body.message : error?.message;
                  useAppStore.getState().setHeaderAlert({ type: 'error', message: `Phân công thất bại: ${message || 'Không thể phân công vận đơn.'}` });
                }
              }}
            />

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Hệ thống Quản lý Vận tải & Cơ giới - THACO AGRI KLH KOUN MOM
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Đóng
                </Button>
                <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
                  In phiếu điều vận
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL LẬP VẬN ĐƠN MỚI KHỚP 100% 16 CỘT */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Lập lệnh vận chuyển nội bộ mới (Biểu mẫu 16 cột)"
        size="xl"
        hideFooter={true}
      >
        <form onSubmit={create} className="space-y-4 text-xs">
          {/* PHẦN 1: THÔNG TIN CHUYẾN & THỜI GIAN */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              1. Thông tin chuyến & Thời gian vận chuyển (Cột 1 - 4 & 8 - 10)
            </h4>

            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block font-bold text-slate-700">Mã chuyến</span>
                <input
                  name="code"
                  type="text"
                  defaultValue={`LVC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-00${orders.length + 1}`}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block font-bold text-slate-700">Ngày yêu cầu VC</span>
                <input
                  name="requestDate"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-primary focus:outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block font-bold text-slate-700">Ngày thi vận chuyển</span>
                <input
                  name="executionDate"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-primary focus:outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block font-bold text-slate-700">Khung giờ xuất phát</span>
                <select
                  name="timeSlot"
                  defaultValue="07:00"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-blue-800 focus:border-primary focus:outline-none"
                >
                  {TIME_SLOT_OPTIONS.map((slot) => (
                    <option key={slot} value={slot}>
                      Khung giờ: {slot}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 block font-bold text-slate-700">Hình thức vận chuyển</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer"><input className="peer sr-only" type="radio" name="routeType" value="ONE_WAY" defaultChecked /><span className="block rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-700 transition peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-800">Vận chuyển 1 chiều</span></label>
                  <label className="cursor-pointer"><input className="peer sr-only" type="radio" name="routeType" value="TWO_WAY" /><span className="block rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-700 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800">Vận chuyển 2 chiều</span></label>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Chuyến 2 chiều có thể khai báo hàng đối lưu bên dưới hoặc để trống để chạy rỗng chiều về.</p>
              </fieldset>

              <div className="sm:col-span-2 grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <label><span className="mb-1 block text-[11px] font-bold text-slate-600">Hàng chiều về (không bắt buộc)</span><input name="returnCargoName" placeholder="Để trống nếu chạy rỗng" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                <label><span className="mb-1 block text-[11px] font-bold text-slate-600">Khối lượng chiều về</span><input name="returnTonnage" type="number" min="0" step="0.1" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                <label><span className="mb-1 block text-[11px] font-bold text-slate-600">Điểm lấy chiều về</span><input name="returnOrigin" placeholder="Mặc định là điểm giao chiều đi" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                <label><span className="mb-1 block text-[11px] font-bold text-slate-600">Điểm giao chiều về</span><input name="returnDestination" placeholder="Mặc định quay về điểm xuất phát" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
              </div>

              <label>
                <span className="mb-1 block font-bold text-slate-700">Trạng thái hàng hóa</span>
                <select
                  name="cargoHandlingStatus"
                  defaultValue="Đã lên hàng"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-primary focus:outline-none"
                >
                  <option value="Đã lên hàng">Đã lên hàng</option>
                  <option value="Đã lên Palet">Đã lên Palet</option>
                  <option value="Chờ bốc xếp">Chờ bốc xếp</option>
                  <option value="Đang dỡ hàng">Đang dỡ hàng</option>
                  <option value="Đã hạ cont">Đã hạ cont</option>
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block font-bold text-slate-700">Ghi chú thùng xe / yêu cầu</span>
                <input
                  name="trailerNote"
                  type="text"
                  placeholder="VD: Mang thanh chắn thùng xe, 24 Pallet cont lạnh, kẹp chì niêm phong..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-primary focus:outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block font-bold text-slate-700">Số lượng Pallet (nếu có)</span>
                <input
                  name="palletCount"
                  type="number"
                  defaultValue={0}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-primary focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* PHẦN 2: PHƯƠNG TIỆN & TỔ LÁI XE */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              2. Phương tiện & Tổ lái xe (Cột 5, 6, 7)
            </h4>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block font-bold text-slate-700">Số Cont / Moóc (92R-...)</span>
                <input
                  name="containerNumber"
                  type="text"
                  placeholder="VD: 92R-00583, 92R-00467..."
                  defaultValue="92R-00583"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-mono font-bold text-amber-900 focus:border-primary focus:outline-none"
                />
              </label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                Xe và tài xế chưa gán ở bước lập lệnh. Admin sẽ duyệt và chọn trực tiếp từ dữ liệu database theo loại xe vận tải, GPLX và trạng thái sẵn sàng.
              </div>
            </div>
          </div>

          {/* PHẦN 3: BẢNG KÊ DÒNG HÀNG HÓA CHI TIẾT (CỘT 11 - 16) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                3. Bảng kê chi tiết mặt hàng vận chuyển (Cột 11 - 16)
              </h4>
              <Button type="button" size="sm" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={handleAddItemRow}>
                Thêm mặt hàng
              </Button>
            </div>

            <div className="space-y-2">
              {createItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 p-2.5 rounded-xl border border-slate-200 bg-white sm:grid-cols-12 items-center"
                >
                  <div className="sm:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Mã vật tư</span>
                    <input
                      type="text"
                      placeholder="VD: DZ-005, MA-TAM"
                      value={item.materialCode}
                      onChange={(e) => handleItemFieldChange(idx, 'materialCode', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-mono font-bold focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Tên hàng hóa</span>
                    <input
                      type="text"
                      placeholder="Tên mặt hàng"
                      value={item.cargoName}
                      onChange={(e) => handleItemFieldChange(idx, 'cargoName', e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">ĐVT</span>
                    <input
                      type="text"
                      placeholder="ĐVT"
                      value={item.unitOfMeasure}
                      onChange={(e) => handleItemFieldChange(idx, 'unitOfMeasure', e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Kế hoạch SL</span>
                    <input
                      type="number"
                      value={item.plannedQuantity}
                      onChange={(e) => handleItemFieldChange(idx, 'plannedQuantity', Number(e.target.value))}
                      required
                      className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-bold text-right focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Nơi nhận hàng</span>
                    <input
                      type="text"
                      placeholder="VD: DP-NL, ADM"
                      value={item.pickupLocation}
                      onChange={(e) => handleItemFieldChange(idx, 'pickupLocation', e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Nơi giao hàng</span>
                    <input
                      type="text"
                      placeholder="VD: LP1, KLH"
                      value={item.deliveryLocation}
                      onChange={(e) => handleItemFieldChange(idx, 'deliveryLocation', e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-center pt-3">
                    <button
                      type="button"
                      disabled={createItems.length === 1}
                      onClick={() => handleRemoveItemRow(idx)}
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ${createItems.length === 1 ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      title="Xóa dòng này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer nút bấm */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang ghi dữ liệu...' : 'Lập & Lưu lệnh vận chuyển'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL IMPORT EXCEL 16 CỘT */}
      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Nhập lệnh vận chuyển từ biểu mẫu Excel 16 cột"
        size="xl"
        hideFooter={true}
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h4 className="font-bold text-slate-800 text-xs mb-1">Cấu trúc 16 cột được tự động nhận diện:</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              1. STT | 2. Ngày yêu cầu | 3. Ngày chạy | 4. Giờ xuất phát | 5. Số xe | 6. Số Cont/Moóc | 7. Tài xế (hỗ trợ chạy đôi) | 8. Hình thức | 9. Trạng thái | 10. Ghi chú | 11. Mã VT | 12. Hàng hóa | 13. ĐVT | 14. Kế hoạch SL | 15. Nơi nhận | 16. Nơi giao.
            </p>
          </div>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => void chooseFile(event.target.files?.[0])}
            className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white"
          />

          {importing && <p className="text-slate-500 font-medium">Đang đọc và phân tích cấu trúc bảng tính 16 cột...</p>}

          {preview && (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                <StatCard label="Tổng chuyến nhận diện" value={preview.tripCount} />
                <StatCard label="Dòng hàng hóa (Items)" value={preview.itemCount} />
                <StatCard label="Cảnh báo đối soát" value={preview.warnings.length} />
                <StatCard label="Lỗi cấu trúc dữ liệu" value={preview.errors.length} />
              </div>

              {preview.errors.map((item) => (
                <p key={`e-${item.rowNumber}-${item.field}`} className="text-red-700 font-semibold">
                  Dòng {item.rowNumber}: {item.message}
                </p>
              ))}

              {preview.warnings.slice(0, 10).map((item) => (
                <p key={`w-${item.rowNumber}-${item.field}`} className="text-amber-700 font-medium">
                  Dòng {item.rowNumber}: {item.message}
                </p>
              ))}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button variant="outline" onClick={() => setShowImport(false)}>
                  Hủy
                </Button>
                <Button disabled={!preview.canCommit || importing} onClick={() => void commit()}>
                  Xác nhận ghi {preview.tripCount} chuyến vào hệ thống
                </Button>
              </div>
            </>
          )}

          {!preview && !importing && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setShowImport(false)}>
                Đóng
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
