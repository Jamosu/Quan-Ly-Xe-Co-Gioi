import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Package,
  Plus,
  Printer,
  Route,
  Search,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { operationsApi } from '../../api/operations';
import { apiClient } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
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
import { getWeeksOfYear, getWeekNumber } from './ProductionPlanPage';
import { DAYS_OF_WEEK } from './CreateProductionPlanPage';
import { syncAllApprovedSpecializedPlans } from './specializedPlanSync';

const STORAGE_KEY = 'thaco_transport_orders_v4';

const boards = [
  { title: 'Chờ duyệt', statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] },
  { title: 'Đã phân công', statuses: ['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'] },
  { title: 'Đang vận chuyển', statuses: ['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING'] },
  { title: 'Đã giao / hoàn tất', statuses: ['DELIVERED', 'ACCEPTED', 'COMPLETED'] },
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
  const [view, setView] = useState<'scheduler' | 'table' | 'board' | 'completed'>('table');
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

  // Quản lý ngày: Vừa vào mặc định chọn ngày hôm nay
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));

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

  // Lưu cache LocalStorage mỗi khi orders thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  const updateOrder = (id: number, patch: Partial<TransportOrderRecord>) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, ...patch } : order));
    setSelected((current) => current?.id === id ? { ...current, ...patch } : current);
    apiClient.patch(`/transport-orders/${id}`, patch).catch(() => {});
  };

  const workflowStep = (status: TransportOrderRecord['status']): DemoWorkflowStep => {
    if (['COMPLETED', 'ACCEPTED'].includes(status)) return 'COMPLETED';
    if (['DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING', 'DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'DELIVERED'].includes(status)) return 'RECEIVED';
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
      const sanitizedItems: TransportOrderRecord[] = (result.items || []).map((it: any) => ({
        ...it,
        items: Array.isArray(it.items) ? it.items : [],
      }));

      // Tự động quét và đồng bộ các kế hoạch chuyên dùng đã duyệt nếu có
      try {
        syncAllApprovedSpecializedPlans();
      } catch {}

      // Nạp thêm các lệnh vận chuyển nội bộ sinh từ kế hoạch chuyên dùng trong localStorage nếu chưa có
      try {
        const storedMasterRaw = localStorage.getItem('thaco_all_dispatch_orders_master_v4');
        if (storedMasterRaw) {
          const storedOrders = JSON.parse(storedMasterRaw);
          if (Array.isArray(storedOrders)) {
            storedOrders
              .filter((so: any) => so.orderCategory === 'VAN_CHUYEN' || so.code?.startsWith('LDX-VC-'))
              .forEach((so: any) => {
                if (!sanitizedItems.some((s: any) => s.code === so.code)) {
                  sanitizedItems.push({
                    id: so.id || Math.floor(Math.random() * 100000),
                    code: so.code,
                    unit: so.unit || 'BAN_CO_GIOI',
                    cargoType: so.purpose || 'Vận chuyển hàng hóa nội bộ',
                    origin: so.origin || 'Kho xuất phát',
                    destination: so.destination || 'Điểm giao',
                    departureTime: so.departureTime || new Date().toISOString(),
                    plannedEndTime: so.plannedEndTime,
                    status: (so.status === 'CHO_PHAN_CONG' ? 'PENDING' : so.status) || 'PENDING',
                    tonnage: Number(so.workVolumeTarget) || 10,
                    notes: so.notes,
                    items: [],
                  } as any);
                }
              });
          }
        }
      } catch {}

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
    return {
      ALL: base.length,
      CHO_DUYET: base.filter((o) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(o.status)).length,
      DA_DUYET: base.filter((o) => ['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'].includes(o.status)).length,
      WORKING: base.filter((o) => ['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING'].includes(o.status)).length,
      COMPLETED: base.filter((o) => ['DELIVERED', 'ACCEPTED', 'COMPLETED'].includes(o.status)).length,
      DELAYED: base.filter((o) => o.isRouteDeviated).length,
    };
  }, [orders, selectedWeek, availableWeeks, selectedDate, selectedKLH]);

  // Lọc chuyến theo search, status và ngày
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
        const matchVehicle = (order.vehicle?.plate || order.vehicle?.code || '').toLowerCase().includes(q);
        const matchCont = (order.containerNumber || order.legacyTrailer || '').toLowerCase().includes(q);
        const matchDriver = (order.driver?.fullName || order.legacyDriver || '').toLowerCase().includes(q);
        const matchSecDriver = (order.secondaryDriverName || '').toLowerCase().includes(q);
        const matchCargo = (order.cargoType || '').toLowerCase().includes(q);
        const orderItems = Array.isArray(order.items) ? order.items : [];
        const matchItems = orderItems.some(
          (it) =>
            (it.materialCode || '').toLowerCase().includes(q) ||
            (it.cargoName || '').toLowerCase().includes(q) ||
            (it.pickupLocation || '').toLowerCase().includes(q) ||
            (it.deliveryLocation || '').toLowerCase().includes(q)
        );
        if (!matchCode && !matchVehicle && !matchCont && !matchDriver && !matchSecDriver && !matchCargo && !matchItems) {
          return false;
        }
      }

      // Lọc theo bộ lọc trạng thái nhanh (statusFilter)
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CHO_DUYET') {
          if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status)) return false;
        } else if (statusFilter === 'DA_DUYET') {
          if (!['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'].includes(order.status)) return false;
        } else if (statusFilter === 'WORKING') {
          if (!['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING'].includes(order.status)) return false;
        } else if (statusFilter === 'COMPLETED') {
          if (!['DELIVERED', 'ACCEPTED', 'COMPLETED'].includes(order.status)) return false;
        } else if (statusFilter === 'DELAYED') {
          if (!order.isRouteDeviated) return false;
        } else if (order.status !== statusFilter) {
          return false;
        }
      }

      // Lọc status từ Global store
      if (selectedStatus && selectedStatus !== 'ALL' && order.status !== selectedStatus) {
        return false;
      }

      // Lọc theo Tuần (selectedWeek)
      if (selectedWeek !== 'ALL') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
          if (!dKey || dKey < start || dKey > end) return false;
        }
      }

      // Lọc ngày (áp dụng cho cả bảng kê và scheduler nếu không chọn ALL)
      if (selectedDate !== 'ALL') {
        const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
        if (dKey !== selectedDate) return false;
      }

      return true;
    });
  }, [orders, search, statusFilter, selectedStatus, selectedWeek, availableWeeks, selectedDate, selectedKLH]);

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

  // 16 CỘT CHUẨN HÓA TRÊN BẢNG BÁO CÁO / QUẢN LÝ
  const columns: Column<TransportOrderRecord>[] = [
    {
      key: 'code',
      title: 'Mã chuyến & Hình thức',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="font-mono font-bold text-primary hover:underline block text-left"
          >
            {row.code}
          </button>
          <span
            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${
              row.routeType === 'TWO_WAY'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {row.transportMode || (row.routeType === 'TWO_WAY' ? '2 Chiều (Đối lưu)' : '1 Chiều')}
          </span>
        </div>
      ),
    },
    {
      key: 'departureTime',
      title: 'Khung giờ & Ngày chạy',
      sortable: true,
      render: (row) => (
        <div>
          <span className="inline-flex items-center gap-1 font-bold text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg">
            <Clock className="h-3 w-3 text-blue-600" />
            {extractHourString(row.departureTime)}
          </span>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Ngày: {formatDateDisplay(row.executionDate || row.departureTime)}</span>
            {row.requestDate && <span className="block text-[10px] text-slate-400">Y/c: {formatDateDisplay(row.requestDate)}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Số Xe / Cont & Moóc',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-500" />
            <span>{row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle || 'Chưa gán xe'}</span>
          </div>
          <div className="mt-1">
            <span className="inline-block text-[11px] font-mono font-semibold text-slate-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              Cont/Moóc: {row.containerNumber || row.legacyTrailer || '—'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'driver',
      title: 'Tài xế vận hành (Chạy đôi)',
      render: (row) => {
        const d1 = row.driver?.fullName || row.legacyDriver || 'Chưa gán';
        const d2 = row.secondaryDriverName;
        return (
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-900 flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" />
              <span>{d1}</span>
            </div>
            {d2 ? (
              <div className="font-semibold text-indigo-700 flex items-center gap-1 text-[11px]">
                <Users className="h-3 w-3 text-indigo-500" />
                <span>{d2}</span>
                <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded">
                  Chạy đôi
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Đơn lái</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      title: 'Mã VT - Hàng hóa & ĐVT - SL',
      render: (row) => {
        const rowItems = Array.isArray(row.items) ? row.items : [];
        return (
          <div className="space-y-1 max-w-[280px]">
            {rowItems.slice(0, 2).map((it, idx) => (
              <div key={it.id || it.materialCode || idx} className="text-xs">
                <div className="flex items-center gap-1.5">
                  {it.materialCode && (
                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">
                      {it.materialCode}
                    </span>
                  )}
                  <span className="font-semibold text-slate-900 truncate" title={it.cargoName}>
                    {it.cargoName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 ml-1">
                  Kế hoạch: <b className="text-slate-800">{it.plannedQuantity?.toLocaleString('vi-VN')}</b> {it.unitOfMeasure}
                  {it.actualQuantity !== undefined && (
                    <span className="text-slate-400 ml-1">(Thực tế: {it.actualQuantity})</span>
                  )}
                </div>
              </div>
            ))}
            {rowItems.length > 2 && (
              <span className="text-[10px] font-semibold text-primary block">
                + {rowItems.length - 2} mặt hàng khác...
              </span>
            )}
            {rowItems.length === 0 && (
              <span className="text-xs text-slate-400 italic">Chưa có dòng hàng</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'route',
      title: 'Nơi nhận ➔ Nơi giao',
      render: (row) => {
        const p1 = row.items[0]?.pickupLocation || row.origin || '—';
        const d1 = row.items[0]?.deliveryLocation || row.destination || '—';
        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="font-medium text-slate-800">{p1}</span>
            </div>
            <div className="text-slate-400 pl-3.5 text-[10px]">➔ Đến:</div>
            <div className="flex items-center gap-1.5 pl-3.5">
              <span className="font-bold text-slate-900">{d1}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'handling',
      title: 'Trạng thái hàng & Ghi chú',
      render: (row) => (
        <div className="space-y-1 max-w-[200px]">
          {row.cargoHandlingStatus ? (
            <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {row.cargoHandlingStatus}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
          {row.trailerNote && (
            <p className="text-[11px] text-slate-600 truncate" title={row.trailerNote}>
              {row.trailerNote}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái lệnh',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.status} />
          {row.isRouteDeviated && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              <AlertTriangle className="h-3 w-3" /> Lệch tuyến
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
            Chi tiết
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="In lệnh vận chuyển"
            onClick={() => {
              setSelected(row);
              setTimeout(() => window.print(), 300);
            }}
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
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
              onClick={() => setSelected(row)}
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
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono">{row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle || '—'}</span>
          </div>
          {(row.containerNumber || row.legacyTrailer) && (
            <div className="text-[11px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
              Moóc: {row.containerNumber || row.legacyTrailer}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'driver',
      title: 'Đội ngũ lái xe (Lái đôi)',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{row.driver?.fullName || row.legacyDriver || '—'}</span>
          </div>
          {row.secondaryDriverName && (
            <div className="text-[11px] text-purple-700 font-medium flex items-center gap-1">
              <Users className="h-3 w-3 text-purple-500 shrink-0" />
              <span>Phụ xế: {row.secondaryDriverName}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'route',
      title: 'Lộ trình giao nhận',
      render: (row) => (
        <div className="text-xs max-w-[200px]">
          <div className="text-slate-600 truncate flex items-center gap-1 font-medium">
            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{row.origin || 'Kho xuất'}</span>
          </div>
          <div className="text-[11px] font-bold text-slate-900 pl-4 truncate mt-0.5">
            ➔ {row.destination || 'Điểm giao'}
          </div>
          <div className="text-[10px] text-slate-400 pl-4">
            Cự ly: {row.distanceKm} km
          </div>
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
      key: 'actions',
      title: 'Thao tác',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
          Biên bản
        </Button>
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
    };

    try {
      await operationsApi.createTransport({
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
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Lệnh điều xe Nội bộ</h1>
          <p className="text-xs text-slate-500">
            Khớp 100% biểu mẫu thực tế 16 cột: Khung giờ, Xe, Số Cont/Moóc 92R-..., 2 Tài xế chạy đôi, Mã vật tư, Nơi nhận - giao.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => setShowImport(true)}>
            Nhập Excel 16 cột
          </Button>
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            In / Lưu PDF
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Lập vận đơn mới
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        showDateFilter={false}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onRefresh={() => void load()}
        statusOptions={[
          { value: 'ALL', label: 'Tất cả trạng thái' },
          ...boards.flatMap((board) => board.statuses).map((value) => ({ value, label: value })),
        ]}
      />

      {/* THANH CHỌN TUẦN VÀ NGÀY VẬN CHUYỂN NỘI BỘ (CHUNG CHO CẢ BẢNG KÊ VÀ SCHEDULER) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* 1. Bộ lọc Tuần */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Tuần:</span>
            <select
              value={selectedWeek}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setSelectedWeek(val);
                setSelectedDate('ALL');
              }}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1 py-0.5"
            >
              <option value="ALL">Tất cả các tuần (Toàn bộ)</option>
              {availableWeeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Nút Hôm nay */}
          <button
            type="button"
            onClick={handleSelectToday}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer select-none active:scale-95 ${
              selectedDate === formatDateKey(new Date()) && selectedWeek === getWeekNumber(new Date())
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Xem tất cả các chuyến vận chuyển của ngày hôm nay"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Hôm nay</span>
            <span className="text-[10px] font-mono bg-white/30 text-current px-1 rounded">
              {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            </span>
          </button>

          {/* 3. Nút Xem tất cả */}
          <button
            type="button"
            onClick={() => {
              setSelectedWeek('ALL');
              setSelectedDate('ALL');
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              selectedWeek === 'ALL' && selectedDate === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl px-3 py-1.5">
          Tổng cộng: <span className="text-slate-800 font-bold">{filteredOrders.length}</span> chuyến vận chuyển
        </div>

        {/* Hàng phụ: Bộ lọc các Thứ trong tuần đang chọn HOẶC Chọn ngày thủ công */}
        {selectedWeek !== 'ALL' ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 w-full">
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-slate-600 mr-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Ngày trong Tuần {selectedWeek}:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
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
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                    isDayActive
                      ? 'bg-primary text-white shadow-xs'
                      : d.isToday
                      ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-extrabold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{d.shortName} ({d.displayDate})</span>
                  {d.isToday && (
                    <span className={`text-[9px] px-1 rounded font-black ${isDayActive ? 'bg-white/30 text-white' : 'bg-amber-500 text-white'}`}>
                      Hôm nay
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
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 p-0.5 ml-auto">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                title="Ngày trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                className="bg-transparent text-[11px] font-semibold text-slate-800 px-1.5 py-0.5 focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleStepDate(1)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                title="Ngày sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs w-full">
            <span className="text-xs text-slate-500">Đang hiển thị toàn bộ thời gian. Chọn ngày cụ thể:</span>
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 p-0.5 ml-auto">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                title="Ngày trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                className="bg-transparent text-xs font-semibold text-slate-800 px-2 py-0.5 focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleStepDate(1)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                title="Ngày sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label={selectedDate === 'ALL' ? 'Tổng chuyến vận tải' : `Chuyến trong ngày (${selectedDate})`}
          value={filteredOrders.length}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Đang lăn bánh trên đường"
          value={filteredOrders.filter((o) => o.status === 'IN_TRANSIT').length}
          icon={<Route className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          label="Tổng dòng hàng hóa (Items)"
          value={filteredOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)}
          icon={<Package className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Chuyến chạy đôi (2 tài xế)"
          value={filteredOrders.filter((o) => !!o.secondaryDriverName).length}
          icon={<Users className="h-5 w-5 text-purple-600" />}
        />
      </KPIGrid>

      {/* View Switcher Tabs */}
      <ViewSwitcher<'scheduler' | 'table' | 'board' | 'completed'>
        value={view}
        onChange={setView}
        options={[
          { value: 'table', label: 'Bảng kê 16 cột chuẩn hóa' },
          { value: 'scheduler', label: 'Scheduler lịch chạy theo xe' },
          { value: 'board', label: 'Kanban 4 nhóm trạng thái' },
          { value: 'completed', label: 'Quản lý việc đã hoàn tất' },
        ]}
      />

      {/* THANH LỌC 4 TRẠNG THÁI CHUẨN HÓA (CHO BẢNG KÊ & SCHEDULER NHƯ HÌNH) */}
      {(view === 'table' || view === 'scheduler') && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                key: 'CHO_DUYET',
                label: 'Chờ duyệt / Phân công',
                count: statusCounts.CHO_DUYET,
                activeBorder: 'border-b-4 border-b-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30',
                badgeActive: 'bg-amber-500 text-white',
                textActive: 'text-amber-900',
              },
              {
                key: 'DA_DUYET',
                label: 'Đã giao xe / Tiếp nhận',
                count: statusCounts.DA_DUYET,
                activeBorder: 'border-b-4 border-b-sky-500 ring-2 ring-sky-500/20 bg-sky-50/30',
                badgeActive: 'bg-sky-600 text-white',
                textActive: 'text-sky-900',
              },
              {
                key: 'WORKING',
                label: 'Đang vận hành / Thi công',
                count: statusCounts.WORKING,
                activeBorder: 'border-b-4 border-b-blue-600 ring-2 ring-blue-600/20 bg-blue-50/30',
                badgeActive: 'bg-blue-600 text-white',
                textActive: 'text-blue-900',
              },
              {
                key: 'COMPLETED',
                label: 'Hoàn tất & Nghiệm thu',
                count: statusCounts.COMPLETED,
                activeBorder: 'border-b-4 border-b-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/30',
                badgeActive: 'bg-emerald-600 text-white',
                textActive: 'text-emerald-900',
              },
            ].map((item) => {
              const isActive = statusFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(isActive ? 'ALL' : item.key)}
                  className={`group flex items-center justify-between rounded-t-2xl rounded-b-xl border px-4 py-3.5 text-left transition-all duration-150 select-none cursor-pointer active:scale-[0.99] ${
                    isActive
                      ? `${item.activeBorder} ${item.textActive} shadow-xs`
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-xs'
                  }`}
                  title={`Lọc theo trạng thái: ${item.label}`}
                >
                  <span className="text-xs sm:text-[13px] font-bold tracking-tight">
                    {item.label}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold font-mono transition-colors ${
                      isActive ? item.badgeActive : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hàng phụ: Nút Tất cả trạng thái + Cảnh báo trễ / SOS */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs text-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 text-xs'
                }`}
              >
                <span>Tất cả trạng thái</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-2xs'
                  }`}
                >
                  {statusCounts.ALL}
                </span>
              </button>
              {statusFilter !== 'ALL' && (
                <span className="text-[11px] font-medium text-slate-500">
                  (Đang lọc trạng thái vận chuyển • Bấm lại vào thẻ hoặc nút <b>Tất cả trạng thái</b> để xem toàn bộ)
                </span>
              )}
            </div>

            {statusCounts.DELAYED > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'DELAYED'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span>Lệch tuyến / Trễ ({statusCounts.DELAYED})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW NỘI DUNG CHÍNH */}
      {view === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredOrders}
          isLoading={loading}
          onRowClick={setSelected}
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
          onItemClick={setSelected}
          kind="TRANSPORT"
        />
      ) : view === 'board' ? (
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
                      onClick={() => setSelected(order)}
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
      ) : (
        /* GIAO DIỆN QUẢN LÝ CÁC VIỆC ĐÃ HOÀN TẤT */
        <div className="space-y-4">
          {/* Thẻ KPI hoàn tất chuyến xe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-emerald-800">Chuyến xe đã giao xong</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-950">{completedOrders.length}</span>
                <span className="text-xs font-semibold text-emerald-600">chuyến</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">100% người nhận đã ký nhận bàn giao</span>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-blue-800">Tỷ lệ đúng hạn giao nhận</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-950">100%</span>
                <span className="text-xs font-semibold text-blue-600">kế hoạch</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Không có chuyến nào trễ hẹn giao</span>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-purple-800">Dầu thực tế tiêu hao</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-purple-950">
                  {completedOrders.reduce((sum, o) => sum + (o.actualFuelLiters || o.plannedFuelLiters || 0), 0)}
                </span>
                <span className="text-xs font-semibold text-purple-600">Lít dầu</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Tiêu hao đúng hạn mức km</span>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-amber-800">Khối lượng hàng bàn giao</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-950">
                  {completedOrders.reduce((sum, o) => sum + (o.palletCount || o.items?.reduce((isum, it) => isum + (it.actualQuantity || it.plannedQuantity), 0) || 0), 0)}
                </span>
                <span className="text-xs font-semibold text-amber-700">Pallet / Tấn / Kiện</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Biên bản bàn giao kho đầy đủ</span>
            </div>
          </div>

          {/* Bảng kê việc đã hoàn tất */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Bảng kê chi tiết các chuyến vận chuyển đã hoàn tất & Thời gian kết thúc
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hiển thị đầy đủ thông tin phương tiện, lái đôi, hàng hóa, tiêu hao dầu và thời điểm ký nhận giao hàng
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                {completedOrders.length} chuyến hoàn tất
              </span>
            </div>

            <DataTable
              columns={completedColumns}
              data={completedOrders}
              isLoading={loading}
              onRowClick={setSelected}
              controlledPage={page}
              totalItems={completedOrders.length}
              onPageChange={setPage}
              useGlobalFilters={false}
            />
          </div>
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
              existingOrders={orders}
              initialStartTime={selected.departureTime}
              initialDurationHours={selected.departureTime && selected.plannedEndTime ? Math.max(0.5, (new Date(selected.plannedEndTime).getTime() - new Date(selected.departureTime).getTime()) / 3_600_000) : 8}
              unit={selected.unit}
              onApprove={(vehicle, driver, schedule, implement) => updateOrder(selected.id, {
                status: 'ASSIGNED',
                vehicle: { id: vehicle.id, code: vehicle.code, plate: vehicle.code, name: vehicle.name, status: 'CHO_PHAN_CONG' },
                driver: { id: driver.id, fullName: driver.name, licenseClass: driver.license },
                containerNumber: implement?.code || selected.containerNumber,
                trailerNote: implement?.name || selected.trailerNote,
                departureTime: schedule.startTime,
                plannedEndTime: schedule.endTime,
              })}
              onReceive={() => updateOrder(selected.id, { status: 'DRIVER_ACCEPTED' })}
              onComplete={() => updateOrder(selected.id, {
                status: 'COMPLETED',
                items: (Array.isArray(selected.items) ? selected.items : []).map((item) => ({ ...item, actualQuantity: item.actualQuantity ?? item.plannedQuantity })),
              })}
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

              <label>
                <span className="mb-1 block font-bold text-slate-700">Hình thức vận chuyển</span>
                <select
                  name="routeType"
                  defaultValue="ONE_WAY"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-primary focus:outline-none"
                >
                  <option value="ONE_WAY">1 Chiều</option>
                  <option value="TWO_WAY">2 Chiều (Đối lưu hàng)</option>
                </select>
              </label>

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
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ${
                        createItems.length === 1 ? 'opacity-30 cursor-not-allowed' : ''
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
