import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  MapPin,
  Plus,
  Truck,
  User,
  ArrowUpDown,
  ListFilter,
  CheckCircle2,
  Tractor,
  HardHat,
  ShieldAlert,
  Fuel,
  Wrench,
  Search,
  Eye,
  FileSpreadsheet,
  Gauge,
  Layers,
  FileText,
  CheckSquare,
  Send,
  Activity,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { operationsApi } from '../../api/operations';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { TableRowActions } from '../../components/common/TableRowActions';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { FilterBar } from '../../components/filters/FilterBar';
import { ErrorState, formatDateTime, StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import type { DispatchOrderRecord } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';
import { useAppStore } from '../../store/useAppStore';
import { matchesKLH } from '../../utils/filterUtils';
import { WorkflowActionPanel, type DemoWorkflowStep, getVehicleFuelQuotaRate } from '../../components/dispatch/WorkflowActionPanel';
import { Vehicle24hScheduler, type SchedulerLane, type SchedulerItem } from '../../components/dispatch/Vehicle24hScheduler';
import { DispatchCategoryTabs } from '../../components/dispatch/DispatchCategoryTabs';
import {
  getWeeksOfYear,
  WeekOption,
  getWeekNumber,
  toDateKey,
} from './ProductionPlanPage';
import {
  parseScheduledDays,
  getDaysInRange,
  getDayActualDate,
  DAYS_OF_WEEK,
} from './CreateProductionPlanPage';


export type DispatchCategory = 'ALL' | 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN' | 'CUU_HO_SOS';

export interface ExtendedDispatchOrder extends Omit<DispatchOrderRecord, 'implement' | 'status'> {
  status: any;
  implement?: { id: number | string; code: string; name: string };
  orderCategory: 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN' | 'CUU_HO_SOS';
  categoryLabel: string;
  workVolumeTarget?: number;
  workVolumeActual?: number;
  workVolumeUnit?: string;
  plannedFuelLiters?: number;
  actualFuelLiters?: number;
  fuelQuotaRate?: string;
  implementGroup?: string;
  secondaryDriverName?: string;
  notes?: string;
  planNotes?: string;
  taskNotes?: string;
  actualEndTime?: string;
  completedAt?: string;
  completedBy?: string;
  acceptanceRating?: string;

  // THÔNG TIN KẾ HOẠCH LỚN & KẾ HOẠCH CON
  planCode?: string;              // Mã kế hoạch lớn: KH-2026-W37-7070
  planTitle?: string;             // Tiêu đề kế hoạch lớn
  complexCode?: string;           // Mã Khu liên hợp: KOUN_MOM | SNOUL | NAM_LAO
  complexName?: string;           // Khu liên hợp
  enterpriseName?: string;        // Xí nghiệp
  farmName?: string;              // Nông trường
  taskJobCode?: string;           // Mã kế hoạch con: CV-TM-02
  taskJobName?: string;           // Tên kế hoạch con: Rải vôi bột & phân lót hữu cơ
  taskPlot?: string;              // Vị trí lô/thửa kế hoạch con: LO-SN-01
  taskStageName?: string;         // Giai đoạn: 2. Trồng mới & Chăm sóc
  assignedVehiclesCount?: number; // Nhu cầu số lượng xe trong tổ (VD: 3 xe)
  assignedVehicleList?: string[]; // Danh sách các xe được chọn trong tổ: ['MK-50-01', 'MK-50-02', 'MK-50-03']
  assignedTeamDetails?: Array<{
    vehicleCode: string;
    vehicleName?: string;
    driverName: string;
    implementName?: string;
    startTime?: string;
    endTime?: string;
    durationHours?: number;
    fuelQuotaRate?: string;
    plannedFuelLiters?: number;
  }>;

  // CẤP PHÁT NHIÊN LIỆU (DẦU)
  fuelStatus?: 'CHUA_CAP' | 'DA_CAP';
  fuelTicketCode?: string;
  dispensedFuelLiters?: number;
  fuelWarehouseName?: string;
  fuelDispensedAt?: string;
}

export const parseOrderNotes = (order: Partial<ExtendedDispatchOrder> | Partial<DispatchOrderRecord>) => {
  let planNotes = order.planNotes?.trim() || '';
  let taskNotes = order.taskNotes?.trim() || '';
  const rawNotes = order.notes?.trim() || '';

  if (!planNotes && !taskNotes && rawNotes) {
    const planMatch = rawNotes.match(/\[Ghi chú (?:kế hoạch|chung)\]:\s*([^\n]+(?:\n(?!\[Ghi chú).*)*)/i);
    const taskMatch = rawNotes.match(/\[Ghi chú (?:công việc|chi tiết|con)\]:\s*([^\n]+(?:\n(?!\[Ghi chú).*)*)/i);
    if (planMatch || taskMatch) {
      planNotes = planMatch ? planMatch[1].trim() : '';
      taskNotes = taskMatch ? taskMatch[1].trim() : '';
    } else {
      taskNotes = rawNotes;
    }
  }

  if (planNotes.toLowerCase() === 'không có') planNotes = '';
  if (taskNotes.toLowerCase() === 'không có') taskNotes = '';

  return { planNotes, taskNotes, rawNotes };
};

export const syncApprovedPlansToDispatchOrders = (existingOrders: ExtendedDispatchOrder[]): ExtendedDispatchOrder[] => {
  return existingOrders;
};

const groups = [
  { key: 'pending', title: 'Chờ duyệt / Phân công', statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'] },
  { key: 'assigned', title: 'Đã giao xe / Tiếp nhận', statuses: ['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'DA_DUYET', 'DA_NHAN'] },
  { key: 'working', title: 'Đang vận hành / Thi công', statuses: ['AT_WORKSITE', 'WORKING', 'RETURNING_TO_DEPOT', 'IN_TRANSIT', 'DANG_THI_CONG', 'TAM_DUNG'] },
  { key: 'completed', title: 'Hoàn tất & Nghiệm thu', statuses: ['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'] },
];

const MANAGEMENT_ATTENTION_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'];
const DEPARTURE_DELAY_STATUSES = ['APPROVED', 'ASSIGNED', 'DRIVER_ACCEPTED', 'CHO_PHAN_CONG', 'DA_DUYET', 'DA_NHAN'];
const DEPARTURE_DELAY_MINUTES = 15;

export const needsOperatorAttention = (order: Pick<ExtendedDispatchOrder, 'status' | 'departureTime' | 'actualDepartureTime' | 'needsAttention'>, now = Date.now()) => {
  if (order.needsAttention !== undefined) return order.needsAttention;
  if (!MANAGEMENT_ATTENTION_STATUSES.includes(order.status) || !order.departureTime || order.actualDepartureTime) return false;
  const plannedStart = new Date(order.departureTime).getTime();
  return Number.isFinite(plannedStart) && plannedStart < now;
};

export const isDepartureDelayed = (order: Pick<ExtendedDispatchOrder, 'status' | 'departureTime' | 'actualDepartureTime' | 'isOverdue'>, now = Date.now()) => {
  if (!DEPARTURE_DELAY_STATUSES.includes(order.status) || !order.departureTime || order.actualDepartureTime) return false;
  if (order.isOverdue !== undefined) return order.isOverdue;
  const plannedStart = new Date(order.departureTime).getTime();
  return Number.isFinite(plannedStart) && plannedStart <= now - DEPARTURE_DELAY_MINUTES * 60_000;
};

const overdueDayCount = (departureTime?: string) => {
  if (!departureTime) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(departureTime).getTime()) / 86_400_000));
};

function toDateString(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DispatchOrdersPage: React.FC = () => {
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // Xác định xem đang xem trang Nông nghiệp riêng hay Tổng hợp tất cả lệnh
  const isAgriculturalSpecific = location.pathname.includes('/lenh-nong-nghiep');

  const [selectedCategory, setSelectedCategory] = useState<DispatchCategory>(() => {
    return isAgriculturalSpecific ? 'NONG_NGHIEP' : 'ALL';
  });

  // Khi URL thay đổi, đồng bộ lại category nếu vào trang Nông nghiệp
  useEffect(() => {
    if (isAgriculturalSpecific) {
      setSelectedCategory('NONG_NGHIEP');
    }
  }, [isAgriculturalSpecific]);

  const [view, setView] = useState<'table' | 'daily_timeline' | 'kanban'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [orders, setOrders] = useState<ExtendedDispatchOrder[]>([]);
  const [selected, setSelected] = useState<ExtendedDispatchOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => searchParams.get('planCode') || '');

  // --- State cho tính năng xử lý lệnh trễ hạn ---
  const [rescheduleTarget, setRescheduleTarget] = useState<ExtendedDispatchOrder | null>(null);
  const [retroTarget, setRetroTarget] = useState<ExtendedDispatchOrder | null>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [overdueSummary, setOverdueSummary] = useState<Awaited<ReturnType<typeof operationsApi.overdueDispatchSummary>> | null>(null);

  // Dữ liệu form Dời lịch
  const [rescheduleForm, setRescheduleForm] = useState({ newDepartureTime: '', newPlannedEndTime: '', reason: '' });
  // Dữ liệu form Nghiệm thu hồi tố
  const [retroForm, setRetroForm] = useState({ actualStartTime: '', actualCompletedTime: '', actualMachineHours: '', actualQuantity: '', notes: '' });


  // 52 Tuần trong năm
  const availableWeeks = useMemo(() => {
    return [...getWeeksOfYear(2026)].sort((a, b) => b.weekNumber - a.weekNumber);
  }, []);

  // Bộ lọc Tuần: 'ALL' hoặc số tuần (Mặc định tuần hiện tại)
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>(() => {
    const qWeek = searchParams.get('week');
    if (qWeek && !isNaN(Number(qWeek))) return Number(qWeek);
    return getWeekNumber(new Date());
  });

  // Bộ lọc theo ngày & sắp xếp: Vừa vào mặc định chọn Ngày hôm nay
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const qDate = searchParams.get('date');
    if (qDate) return qDate;
    return toDateString(new Date());
  });
  const [sortOrder, setSortOrder] = useState<'time_asc' | 'time_desc'>('time_asc');

  // Cập nhật state nếu URL searchParams thay đổi
  useEffect(() => {
    const qPlan = searchParams.get('planCode');
    if (qPlan) setSearch(qPlan);
    const qWeek = searchParams.get('week');
    if (qWeek && !isNaN(Number(qWeek))) setSelectedWeek(Number(qWeek));
  }, [searchParams]);

  const selectedStatus = useFilterStore((state) => state.selectedStatus);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const planId = searchParams.get('planId');
      const apiFilters = planId ? { planId: Number(planId) } : {};
      const [dispatchRes, transportRes] = await Promise.allSettled([
        operationsApi.dispatchOrders({ limit: 1000, ...apiFilters }),
        operationsApi.transportOrders({ limit: 500, ...apiFilters }),
      ]);

      const realDispatches: ExtendedDispatchOrder[] = [];
      if (dispatchRes.status === 'fulfilled' && dispatchRes.value?.items) {
        dispatchRes.value.items.forEach((item: any) => {
          if (item.status === 'CANCELLED') return;
          const isConstruction = item.productionOrder?.plan?.planType === 'CONSTRUCTION';
          const cat = isConstruction ? 'CONG_TRINH' : 'NONG_NGHIEP';
          const catLabel = isConstruction ? 'Công trình ca máy' : 'Nông nghiệp';

          const durationH = item.departureTime && item.plannedEndTime
            ? Math.max(0.5, (new Date(item.plannedEndTime).getTime() - new Date(item.departureTime).getTime()) / 3_600_000)
            : (item.productionOrder?.planItem?.durationHours || 8);
          const vQuota = item.vehicle ? getVehicleFuelQuotaRate(item.vehicle, cat) : undefined;
          const initialPlannedFuel = item.plannedFuelLiters ?? (vQuota && item.vehicle ? Number((durationH * vQuota).toFixed(1)) : undefined);
          const initialQuotaRate = vQuota && item.vehicle ? `${vQuota} L/h` : item.fuelQuotaRate;

          const plan = item.productionOrder?.plan;
          const complexCode = plan?.complexCode || (['NT1', 'NT2', 'NT3', 'NT4', 'BAN_CO_GIOI'].includes(item.unit) ? 'KOUN_MOM' : item.unit) || 'KOUN_MOM';
          const complexName = plan?.complexName || (complexCode === 'KOUN_MOM' ? 'Khu liên hợp Koun Mom' : item.unit === 'NT1' ? 'Nông trường 1' : item.unit || 'Khu liên hợp');

          realDispatches.push({
            ...item,
            complexCode,
            complexName,
            orderCategory: cat,
            categoryLabel: catLabel,
            planCode: plan?.code,
            planTitle: plan?.title,
            workVolumeTarget: item.workVolumeTarget ?? (item.productionOrder?.planItem?.jobCode ? 25 : undefined),
            workVolumeUnit: item.workVolumeUnit ?? (isConstruction ? 'Giờ' : 'Ha'),
            plannedFuelLiters: initialPlannedFuel,
            fuelQuotaRate: initialQuotaRate,
          });
        });
      }

      if (transportRes.status === 'fulfilled' && transportRes.value?.items) {
        transportRes.value.items.forEach((item: any) => {
          if (item.status === 'CANCELLED') return;
          const plan = item.productionOrder?.plan;
          const complexCode = plan?.complexCode || (['NT1', 'NT2', 'NT3', 'NT4', 'BAN_CO_GIOI'].includes(item.unit) ? 'KOUN_MOM' : item.unit) || 'KOUN_MOM';
          const complexName = plan?.complexName || (complexCode === 'KOUN_MOM' ? 'Khu liên hợp Koun Mom' : item.unit === 'NT1' ? 'Nông trường 1' : item.unit || 'Khu liên hợp');

          realDispatches.push({
            id: item.id ? 200000 + item.id : Math.floor(Math.random() * 100000),
            code: item.code,
            orderCategory: 'VAN_CHUYEN',
            categoryLabel: 'Vận chuyển',
            sourceType: 'TRANSPORT_ORDER' as any,
            unit: item.unit || 'BAN_CO_GIOI',
            complexCode,
            complexName,
            purpose: item.cargoType || 'Vận chuyển hàng hóa nội bộ',
            origin: item.origin || 'Kho Trung Tâm',
            destination: item.destination || 'Điểm giao hàng',
            departureTime: item.departureTime || item.executionDate || item.requestDate,
            plannedEndTime: item.plannedEndTime,
            status: item.status,
            isDelayed: Boolean(item.isRouteDeviated),
            vehicle: item.vehicle,
            driver: item.driver,
            implement: item.trailer,
            workVolumeTarget: item.tonnage || item.palletCount || 1,
            workVolumeUnit: item.palletCount ? 'Pallet' : 'Tấn',
            plannedFuelLiters: item.plannedFuelLiters,
            notes: item.notes,
            planCode: plan?.code,
            planTitle: plan?.title,
          });
        });
      }

      if (dispatchRes.status === 'rejected') {
        const reason = (dispatchRes as PromiseRejectedResult).reason;
        const msg = reason?.response?.data?.message || reason?.message || 'Không thể tải lệnh điều xe';
        useAppStore.getState().setHeaderAlert({
          type: 'error',
          message: `Lỗi kết nối dữ liệu: ${msg}`,
        });
      } else if (transportRes.status === 'rejected') {
        const reason = (transportRes as PromiseRejectedResult).reason;
        const msg = reason?.response?.data?.message || reason?.message || 'Không thể tải lệnh vận chuyển';
        useAppStore.getState().setHeaderAlert({
          type: 'error',
          message: `Lỗi kết nối dữ liệu: ${msg}`,
        });
      } else {
        const currentAlert = useAppStore.getState().headerAlert;
        if (currentAlert?.type === 'error') {
          useAppStore.getState().setHeaderAlert(null);
        }
      }

      setOrders(realDispatches);
    } catch (err: any) {
      console.error('Failed to load dispatches from API:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu điều xe từ hệ thống.';
      setError(msg);
      useAppStore.getState().setHeaderAlert({
        type: 'error',
        message: `Lỗi tải trang điều xe: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const handleOpenOrder = (order: ExtendedDispatchOrder) => {
    const isPending = !order.status || ['CHO_PHAN_CONG', 'PENDING_APPROVAL', 'DRAFT'].includes(order.status);
    let targetOrder = order;
    if (isPending) {
      const now = new Date();
      const currentStart = now.toISOString();
      const durationMs = order.departureTime && order.plannedEndTime
        ? Math.max(1_800_000, new Date(order.plannedEndTime).getTime() - new Date(order.departureTime).getTime())
        : 8 * 3_600_000;
      const currentEnd = new Date(now.getTime() + durationMs).toISOString();

      targetOrder = {
        ...order,
        departureTime: currentStart,
        plannedEndTime: currentEnd,
      };
    }
    navigate(`/lenh-dieu-xe/chi-tiet/${order.id}`, {
      state: {
        order: targetOrder,
        from: location.pathname + location.search,
      },
    });
  };

  const workflowStep = (status: DispatchOrderRecord['status']): DemoWorkflowStep => {
    if (['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(status)) return 'COMPLETED';
    if (['DRIVER_ACCEPTED', 'DEPARTED', 'AT_WORKSITE', 'WORKING', 'RETURNING_TO_DEPOT', 'IN_TRANSIT', 'DANG_THI_CONG'].includes(status)) return 'RECEIVED';
    if (['ASSIGNED', 'DA_NHAN'].includes(status)) return 'APPROVED';
    return 'PENDING';
  };

  useEffect(() => {
    void load();
  }, [load]);

  // Load Overdue Summary khi component mount và sau khi load xong
  useEffect(() => {
    operationsApi.overdueDispatchSummary().then(setOverdueSummary).catch(() => {});
  }, [orders]);

  // Lắng nghe sự kiện làm mới từ nút Header Refresh
  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent<{ pathname?: string }>;
      if (!customEvent.detail?.pathname || customEvent.detail.pathname.includes('/lenh-dieu-xe')) {
        void load();
      }
    };
    window.addEventListener('thaco_refresh_current_page', handleRefresh);
    return () => {
      window.removeEventListener('thaco_refresh_current_page', handleRefresh);
    };
  }, [load]);

  // --- Handler: Dời lịch lệnh điều xe ---
  const handleReschedule = async () => {
    if (!rescheduleTarget) return;
    if (!rescheduleForm.newDepartureTime || !rescheduleForm.newPlannedEndTime) {
      setActionError('Vui lòng nhập đầy đủ thời gian mới.');
      return;
    }
    setActionSaving(true);
    setActionError('');
    try {
      const result = await operationsApi.rescheduleDispatch(rescheduleTarget.id, {
        newDepartureTime: new Date(rescheduleForm.newDepartureTime).toISOString(),
        newPlannedEndTime: new Date(rescheduleForm.newPlannedEndTime).toISOString(),
        reason: rescheduleForm.reason || undefined,
      });
      if (result.resetAssignment) {
        useAppStore.getState().setHeaderAlert({ type: 'warning', message: `Dời lịch thành công — Xe/Tài xế bị trùng lịch, đã reset về Chờ phân công.` });
      } else {
        useAppStore.getState().setHeaderAlert({ type: 'success', message: `Dời lịch lệnh ${rescheduleTarget.code} thành công.` });
      }
      setRescheduleTarget(null);
      setRescheduleForm({ newDepartureTime: '', newPlannedEndTime: '', reason: '' });
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e instanceof Error ? e.message : 'Có lỗi xảy ra.');
      setActionError(msg);
    } finally {
      setActionSaving(false);
    }
  };

  // --- Handler: Nghiệm thu hồi tố ---
  const handleRetroactiveComplete = async () => {
    if (!retroTarget) return;
    if (!retroForm.actualStartTime || !retroForm.actualCompletedTime) {
      setActionError('Vui lòng nhập đầy đủ Giờ bắt đầu và Giờ hoàn thành thực tế.');
      return;
    }
    setActionSaving(true);
    setActionError('');
    try {
      await operationsApi.retroactiveCompleteDispatch(retroTarget.id, {
        actualStartTime: new Date(retroForm.actualStartTime).toISOString(),
        actualCompletedTime: new Date(retroForm.actualCompletedTime).toISOString(),
        actualMachineHours: retroForm.actualMachineHours ? parseFloat(retroForm.actualMachineHours) : undefined,
        actualQuantity: retroForm.actualQuantity ? parseFloat(retroForm.actualQuantity) : undefined,
        notes: retroForm.notes || undefined,
      });
      useAppStore.getState().setHeaderAlert({ type: 'success', message: `Nghiệm thu hồi tố lệnh ${retroTarget.code} thành công.` });
      setRetroTarget(null);
      setRetroForm({ actualStartTime: '', actualCompletedTime: '', actualMachineHours: '', actualQuantity: '', notes: '' });
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e instanceof Error ? e.message : 'Có lỗi xảy ra.');
      setActionError(msg);
    } finally {
      setActionSaving(false);
    }
  };

  // Danh sách các hạng mục / mục đích công việc thực tế từ dữ liệu
  const availablePurposes = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      if (o.purpose && !o.purpose.includes('TEST E2E') && !o.purpose.includes('?')) s.add(o.purpose.trim());
      if (o.taskJobName && !o.taskJobName.includes('TEST E2E') && !o.taskJobName.includes('?')) s.add(o.taskJobName.trim());
    }
    return Array.from(s).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [orders]);

  // Danh sách các phương tiện xe / máy thực tế từ dữ liệu
  const availableVehicles = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      const v = o.vehicle;
      const code = v?.code || v?.plate;
      if (code) {
        const name = v?.name || (v as any)?.type || v?.vehicleType?.name || code;
        map.set(code, `${code} - ${name}`);
      }
    }
    return Array.from(map.entries()).map(([code, label]) => ({ code, label })).sort((a, b) => a.code.localeCompare(b.code));
  }, [orders]);

  // Danh sách tài xế / lái xe thực tế từ dữ liệu
  const availableDrivers = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      const d = o.driver;
      const name = d?.fullName || (d as any)?.name;
      if (name && !name.includes('?')) s.add(name.trim());
    }
    return Array.from(s).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [orders]);

  // Bộ lọc kết hợp: Category + Tuần + Ngày + Trạng thái + Tìm kiếm + KLH
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Lọc theo Khu liên hợp từ Header
      if (selectedKLH && selectedKLH !== 'ALL') {
        if (!matchesKLH(order, selectedKLH)) return false;
      }

      // Lọc theo Loại lệnh (Category)
      if (selectedCategory !== 'ALL' && order.orderCategory !== selectedCategory) {
        return false;
      }

      // Lọc theo Hạng mục / Mục đích công việc
      if (selectedPurpose !== 'ALL') {
        const matchPurpose = (order.purpose || '').toLowerCase() === selectedPurpose.toLowerCase();
        const matchTaskJob = (order.taskJobName || '').toLowerCase() === selectedPurpose.toLowerCase();
        const matchPlot = (order.taskPlot || '').toLowerCase() === selectedPurpose.toLowerCase();
        if (!matchPurpose && !matchTaskJob && !matchPlot) return false;
      }

      // Lọc theo Phương tiện
      if (selectedVehicle !== 'ALL') {
        const v = order.vehicle;
        const code = v?.code || v?.plate;
        if (code !== selectedVehicle) return false;
      }

      // Lọc theo Tài xế / Lái xe
      if (selectedDriver !== 'ALL') {
        const d = order.driver;
        const driverName = d?.fullName || (d as any)?.name || '';
        if (driverName !== selectedDriver && (d as any)?.code !== selectedDriver) return false;
      }

      // Lọc theo Tuần (selectedWeek) - bỏ qua khi đang lọc riêng Lệnh trễ hoặc Lệnh tương lai
      if (selectedWeek !== 'ALL' && statusFilter !== 'DELAYED' && statusFilter !== 'FUTURE_UNASSIGNED') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          const depDate = order.departureTime ? toDateString(order.departureTime) : '';
          const endDate = order.plannedEndTime ? toDateString(order.plannedEndTime) : '';
          const inWeek = (depDate && depDate >= start && depDate <= end) || (endDate && endDate >= start && endDate <= end);
          if (!inWeek) return false;
        }
      }

      // Lọc theo Bộ lọc Trạng thái nhanh (statusFilter)
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CHO_DUYET' || statusFilter === 'CHUA_PHAN_CONG') {
          if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(order.status)) return false;
        } else if (statusFilter === 'DA_DUYET' || statusFilter === 'DA_GIAO_VIEC') {
          if (!['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'DA_DUYET', 'DA_NHAN'].includes(order.status)) return false;
        } else if (statusFilter === 'WORKING' || statusFilter === 'DANG_LAM_VIEC') {
          if (!['WORKING', 'IN_TRANSIT', 'DANG_THI_CONG', 'TAM_DUNG'].includes(order.status)) return false;
        } else if (statusFilter === 'DRIVER_PENDING' || statusFilter === 'TAI_XE_CHUA_XAC_NHAN') {
          const isDriverPending = order.status === 'ASSIGNED' || (order.status === 'DA_DUYET' && !['DRIVER_ACCEPTED', 'DA_NHAN', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DANG_THI_CONG'].includes(order.status));
          if (!isDriverPending) return false;
        } else if (statusFilter === 'COMPLETED') {
          if (!['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(order.status)) return false;
        } else if (statusFilter === 'DELAYED') {
          const isDelayed = isDepartureDelayed(order);
          const isPastUnassigned = needsOperatorAttention(order) && (!order.vehicle || !order.driver || ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(order.status));
          if (!isDelayed && !isPastUnassigned) return false;
        } else if (statusFilter === 'FUTURE_UNASSIGNED') {
          if (['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED', 'CANCELLED'].includes(order.status)) return false;
          const currentWeekNum = getWeekNumber(new Date());
          const currentWeekObj = availableWeeks.find((w) => w.weekNumber === currentWeekNum);
          const currentWeekEnd = currentWeekObj?.endDateKey || toDateString(new Date());
          const orderDate = order.departureTime ? toDateString(order.departureTime) : (order.plannedEndTime ? toDateString(order.plannedEndTime) : '');
          const isAfterCurrentWeek = orderDate > currentWeekEnd;
          const isUnassigned = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(order.status) || (!order.vehicle && (!order.assignedTeamDetails || order.assignedTeamDetails.length === 0));
          if (!isAfterCurrentWeek || !isUnassigned) return false;
        } else if (order.status !== statusFilter) {
          return false;
        }
      }

      // Lọc theo Trạng thái Global
      if (selectedStatus && selectedStatus !== 'ALL') {
        const isStatusMatch = groups.some(
          (group) => group.statuses.includes(selectedStatus) && group.statuses.includes(order.status)
        );
        if (!isStatusMatch && order.status !== selectedStatus) return false;
      }

      // Lọc theo Ngày: So khớp theo ngày khởi hành/ngày tác nghiệp chính (bỏ qua khi lọc Lệnh trễ hoặc Lệnh tương lai)
      if (selectedDate !== 'ALL' && statusFilter !== 'DELAYED' && statusFilter !== 'FUTURE_UNASSIGNED') {
        const orderDate = order.departureTime ? toDateString(order.departureTime) : (order.plannedEndTime ? toDateString(order.plannedEndTime) : '');
        if (orderDate !== selectedDate) return false;
      }

      // Tìm kiếm từ khóa mã lệnh, lộ trình, lô thửa, ghi chú, kế hoạch
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = order.code.toLowerCase().includes(q);
        const matchPurpose = order.purpose.toLowerCase().includes(q);
        const matchUnit = (order.unit || '').toLowerCase().includes(q);
        const matchOrigin = (order.origin || '').toLowerCase().includes(q);
        const matchDest = (order.destination || '').toLowerCase().includes(q);
        const matchPlot = (order.taskPlot || '').toLowerCase().includes(q);
        const matchNotes = (order.notes || '').toLowerCase().includes(q);
        const matchPlan = (order.planCode || '').toLowerCase().includes(q);
        if (!matchCode && !matchPurpose && !matchUnit && !matchOrigin && !matchDest && !matchPlot && !matchNotes && !matchPlan) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.departureTime ? new Date(a.departureTime).getTime() : 0;
      const timeB = b.departureTime ? new Date(b.departureTime).getTime() : 0;
      return sortOrder === 'time_asc' ? timeA - timeB : timeB - timeA;
    });
  }, [orders, selectedCategory, selectedPurpose, selectedVehicle, selectedDriver, selectedWeek, availableWeeks, statusFilter, selectedStatus, selectedDate, search, sortOrder, selectedKLH]);

  // Đếm số lượng theo từng nhóm trạng thái cho bộ lọc statusFilter
  const statusCounts = useMemo(() => {
    const baseList = orders.filter((o) => {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
      if (selectedCategory !== 'ALL' && o.orderCategory !== selectedCategory) return false;
      if (selectedWeek !== 'ALL') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          const depDate = o.departureTime ? toDateString(o.departureTime) : '';
          const endDate = o.plannedEndTime ? toDateString(o.plannedEndTime) : '';
          const inWeek = (depDate && depDate >= start && depDate <= end) || (endDate && endDate >= start && endDate <= end);
          if (!inWeek) return false;
        }
      }
      if (selectedDate !== 'ALL') {
        const orderDate = o.departureTime ? toDateString(o.departureTime) : (o.plannedEndTime ? toDateString(o.plannedEndTime) : '');
        if (orderDate !== selectedDate) return false;
      }
      return true;
    });
    const chuaPhanCong = baseList.filter((o) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(o.status)).length;
    const daGiaoViec = baseList.filter((o) => ['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'DA_DUYET', 'DA_NHAN'].includes(o.status)).length;
    const dangLamViec = baseList.filter((o) => ['WORKING', 'IN_TRANSIT', 'DANG_THI_CONG', 'TAM_DUNG'].includes(o.status)).length;
    const driverPending = baseList.filter((o) => o.status === 'ASSIGNED' || (o.status === 'DA_DUYET' && !['DRIVER_ACCEPTED', 'DA_NHAN', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DANG_THI_CONG'].includes(o.status))).length;
    const completed = baseList.filter((o) => ['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(o.status)).length;
    const delayed = baseList.filter((o) => {
      const isDelayed = isDepartureDelayed(o);
      const isPastUnassigned = needsOperatorAttention(o) && (!o.vehicle || !o.driver || ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(o.status));
      return isDelayed || isPastUnassigned;
    }).length;

    const currentWeekNum = getWeekNumber(new Date());
    const currentWeekObj = availableWeeks.find((w) => w.weekNumber === currentWeekNum);
    const currentWeekEnd = currentWeekObj?.endDateKey || toDateString(new Date());

    const futureUnassigned = orders.filter((o) => {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
      if (selectedCategory !== 'ALL' && o.orderCategory !== selectedCategory) return false;
      if (['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED', 'CANCELLED'].includes(o.status)) return false;
      const orderDate = o.departureTime ? toDateString(o.departureTime) : (o.plannedEndTime ? toDateString(o.plannedEndTime) : '');
      const isAfterCurrentWeek = orderDate > currentWeekEnd;
      const isUnassigned = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(o.status) || (!o.vehicle && (!o.assignedTeamDetails || o.assignedTeamDetails.length === 0));
      return isAfterCurrentWeek && isUnassigned;
    }).length;

    return {
      ALL: baseList.length,
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
  }, [orders, selectedCategory, selectedWeek, availableWeeks, selectedDate, selectedKLH]);

  // Danh sách các ngày duy nhất có dữ liệu
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    for (const order of orders) {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(order, selectedKLH)) continue;
      if (order.departureTime) {
        datesSet.add(toDateString(order.departureTime));
      } else if (order.plannedEndTime) {
        datesSet.add(toDateString(order.plannedEndTime));
      }
    }
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [orders, selectedKLH]);

  // Gom nhóm theo ngày cho chế độ Daily Timeline
  const ordersByDay = useMemo(() => {
    const map = new Map<string, ExtendedDispatchOrder[]>();
    for (const order of filteredOrders) {
      const key = order.departureTime ? toDateString(order.departureTime) : 'Chưa xếp ngày';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
    }
    return Array.from(map.entries()).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
  }, [filteredOrders]);

  // Xây dựng dữ liệu Làn xe (Lanes) & Lệnh chưa gán cho Scheduler 24H
  const schedulerData = useMemo(() => {
    const laneMap = new Map<string, SchedulerLane>();
    const unassigned: SchedulerItem[] = [];

    for (const order of filteredOrders) {
      // 1. Xác định bước quy trình 3 giai đoạn chuẩn: Tài xế giao nhận -> Đang thực hiện -> Nghiệm thu
      let stepIdx = 0;
      if (['COMPLETED', 'DELIVERED', 'ACCEPTED', 'HOAN_THANH', 'CLOSED'].includes(order.status)) {
        stepIdx = 3; // 3. Nghiệm thu
      } else if (['WORKING', 'IN_PROGRESS', 'DEPARTED', 'IN_TRANSIT', 'DANG_THI_CONG', 'RETURNING'].includes(order.status)) {
        stepIdx = 2; // 2. Đang thực hiện
      } else if (['APPROVED', 'ASSIGNED', 'DA_DUYET', 'DRIVER_ACCEPTED', 'DA_NHAN', 'AT_PICKUP', 'LOADING'].includes(order.status) || order.vehicle || order.driver) {
        stepIdx = 1; // 1. Tài xế giao nhận
      }

      const fuelInfo = order.fuelStatus === 'DA_CAP'
        ? `Đã cấp ${order.dispensedFuelLiters || order.plannedFuelLiters || 80}L dầu`
        : order.plannedFuelLiters ? `Định mức ${order.plannedFuelLiters}L` : undefined;

      const workVolume = order.workVolumeTarget
        ? `${order.workVolumeActual || order.workVolumeTarget} ${order.workVolumeUnit || 'Ha'}`
        : undefined;

      const acceptanceInfo = order.completedBy
        ? `${order.completedBy} nghiệm thu`
        : order.acceptanceRating || (stepIdx === 3 ? 'Đã nghiệm thu đạt chuẩn' : undefined);

      let defaultDuration = 8;
      if (order.departureTime && order.plannedEndTime) {
        const diffH = (new Date(order.plannedEndTime).getTime() - new Date(order.departureTime).getTime()) / (1000 * 60 * 60);
        if (!isNaN(diffH) && diffH > 0 && diffH <= 24) {
          defaultDuration = Math.round(diffH * 10) / 10;
        }
      }

      // TRƯỜNG HỢP 1: Có tổ xe chi tiết (assignedTeamDetails)
      if (order.assignedTeamDetails && order.assignedTeamDetails.length > 0) {
        for (const member of order.assignedTeamDetails) {
          const vCode = member.vehicleCode || 'CHUA_GAN';
          if (vCode === 'CHUA_GAN') {
            unassigned.push({
              id: `${order.id}-${member.driverName || 'unassigned'}`,
              code: order.code,
              title: order.purpose || order.taskJobName || 'Lệnh điều xe',
              location: order.taskPlot || order.destination || order.origin,
              categoryLabel: order.categoryLabel,
              category: order.orderCategory,
              vehicleCode: 'Chưa gán xe',
              vehicleName: 'Chưa chọn máy móc',
              driverName: member.driverName,
              startTime: member.startTime || '07:00',
              endTime: member.endTime,
              durationHours: member.durationHours || defaultDuration,
              status: order.status,
              workflowStepIndex: stepIdx,
              workVolume,
              fuelInfo,
              acceptanceInfo,
              isDelayed: order.isDelayed,
              rawItem: order,
            });
            continue;
          }

          if (!laneMap.has(vCode)) {
            laneMap.set(vCode, {
              laneKey: vCode,
              vehicleCode: vCode,
              vehicleName: member.vehicleName || `Máy nông nghiệp ${vCode}`,
              implementName: member.implementName || order.implement?.name,
              primaryDriverName: member.driverName || order.driver?.fullName,
              category: order.orderCategory,
              items: [],
            });
          }

          const lane = laneMap.get(vCode)!;
          lane.items.push({
            id: `${order.id}-${vCode}`,
            code: order.code,
            title: order.purpose || order.taskJobName || 'Lệnh điều xe nông nghiệp',
            location: order.taskPlot || order.destination || order.origin,
            categoryLabel: order.categoryLabel,
            category: order.orderCategory,
            vehicleCode: vCode,
            vehicleName: member.vehicleName || lane.vehicleName,
            implementName: member.implementName || lane.implementName,
            driverName: member.driverName || lane.primaryDriverName,
            startTime: member.startTime || order.departureTime || '07:00',
            endTime: member.endTime || order.plannedEndTime,
            durationHours: member.durationHours || defaultDuration,
            status: order.status,
            workflowStepIndex: stepIdx,
            workVolume,
            fuelInfo,
            acceptanceInfo,
            isDelayed: order.isDelayed,
            rawItem: order,
          });
        }
      }
      // TRƯỜNG HỢP 2: Có 1 xe gán trên order (order.vehicle)
      else if (order.vehicle?.code || order.vehicle?.plate || order.vehicle?.name) {
        const vCode = order.vehicle.code || order.vehicle.plate || order.vehicle.name;
        if (!laneMap.has(vCode)) {
          laneMap.set(vCode, {
            laneKey: vCode,
            vehicleCode: order.vehicle.code || vCode,
            vehicleName: order.vehicle.name || `Phương tiện ${vCode}`,
            vehiclePlate: order.vehicle.plate,
            implementName: order.implement?.name,
            primaryDriverName: order.driver?.fullName,
            driverPhone: (order.driver as any)?.phone,
            category: order.orderCategory,
            items: [],
          });
        }

        const lane = laneMap.get(vCode)!;
        lane.items.push({
          id: order.id,
          code: order.code,
          title: order.purpose || order.taskJobName || 'Lệnh điều xe',
          location: order.taskPlot || order.destination || order.origin,
          categoryLabel: order.categoryLabel,
          category: order.orderCategory,
          vehicleCode: order.vehicle.code || vCode,
          vehicleName: order.vehicle.name,
          vehiclePlate: order.vehicle.plate,
          implementName: order.implement?.name,
          driverName: order.driver?.fullName,
          driverPhone: (order.driver as any)?.phone,
          startTime: order.departureTime || '07:00',
          endTime: order.plannedEndTime || order.actualEndTime,
          durationHours: defaultDuration,
          status: order.status,
          workflowStepIndex: stepIdx,
          workVolume,
          fuelInfo,
          acceptanceInfo,
          isDelayed: order.isDelayed,
          rawItem: order,
        });
      }
      // TRƯỜNG HỢP 3: Chưa gán phương tiện
      else {
        unassigned.push({
          id: order.id,
          code: order.code,
          title: order.purpose || order.taskJobName || 'Lệnh điều xe',
          location: order.taskPlot || order.destination || order.origin,
          categoryLabel: order.categoryLabel,
          category: order.orderCategory,
          vehicleCode: 'Chưa gán xe',
          vehicleName: 'Chưa chọn máy móc',
          driverName: order.driver?.fullName || 'Chưa gán tài xế',
          startTime: order.departureTime || '07:00',
          endTime: order.plannedEndTime,
          durationHours: defaultDuration,
          status: order.status,
          workflowStepIndex: stepIdx,
          workVolume,
          fuelInfo,
          acceptanceInfo,
          isDelayed: order.isDelayed,
          rawItem: order,
        });
      }
    }

    return { lanes: Array.from(laneMap.values()), unassigned };
  }, [filteredOrders]);

  // Kanban groups dựa trên danh sách đã lọc
  const grouped = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      orders: filteredOrders.filter((order) => group.statuses.includes(order.status)),
    }));
  }, [filteredOrders]);

  // Danh sách công việc đã hoàn tất
  const completedOrders = useMemo(() => {
    // Nếu statusFilter đang là COMPLETED hoặc ALL, lọc theo các status hoàn thành
    const list = statusFilter === 'COMPLETED'
      ? filteredOrders
      : orders.filter((o) => {
          if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
          if (selectedCategory !== 'ALL' && o.orderCategory !== selectedCategory) return false;
          if (selectedDate !== 'ALL') {
            const orderDate = o.departureTime ? toDateString(o.departureTime) : (o.plannedEndTime ? toDateString(o.plannedEndTime) : '');
            if (orderDate !== selectedDate) return false;
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            const matchCode = o.code.toLowerCase().includes(q);
            const matchPurpose = o.purpose.toLowerCase().includes(q);
            const matchVehicle = (o.vehicle?.name || o.vehicle?.code || o.vehicle?.plate || '').toLowerCase().includes(q);
            const matchDriver = (o.driver?.fullName || '').toLowerCase().includes(q);
            if (!matchCode && !matchPurpose && !matchVehicle && !matchDriver) return false;
          }
          return ['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(o.status);
        });
    return list;
  }, [orders, filteredOrders, statusFilter, selectedCategory, selectedDate, search]);

  // Đếm số lượng theo từng loại lệnh
  const categoryCounts = useMemo(() => {
    return {
      ALL: orders.length,
      NONG_NGHIEP: orders.filter((o) => o.orderCategory === 'NONG_NGHIEP').length,
      CONG_TRINH: orders.filter((o) => o.orderCategory === 'CONG_TRINH').length,
      VAN_CHUYEN: orders.filter((o) => o.orderCategory === 'VAN_CHUYEN').length,
      CUU_HO_SOS: orders.filter((o) => o.orderCategory === 'CUU_HO_SOS').length,
    };
  }, [orders]);

  // Tính toán cảnh báo lệnh quá hạn chuẩn xác theo từng loại lệnh đang xem (Nông nghiệp vs Toàn hệ thống)
  const computedOverdueSummary = useMemo(() => {
    const targetCategory = isAgriculturalSpecific ? 'NONG_NGHIEP' : selectedCategory;
    const scoped = orders.filter((o) => {
      if (selectedKLH && selectedKLH !== 'ALL' && !matchesKLH(o, selectedKLH)) return false;
      if (targetCategory !== 'ALL' && o.orderCategory !== targetCategory) return false;
      return true;
    });

    const now = Date.now();
    const departureDelayThreshold = now - DEPARTURE_DELAY_MINUTES * 60 * 1000;
    // CHỈ BÁO CÁC LỆNH ĐÃ ĐẾN HẠN HOẶC QUÁ HẠN (departureTime <= now) — KHÔNG BÁO LỆNH TƯƠNG LAI
    const activeOverdue = scoped.filter((o) => {
      if (['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED', 'CANCELLED'].includes(o.status)) return false;
      if (!o.departureTime) return false;
      const depTime = new Date(o.departureTime).getTime();
      return !isNaN(depTime) && depTime <= now;
    });

    const awaitingApproval = activeOverdue.filter((o) => ['DRAFT', 'PENDING_APPROVAL', 'CHO_DUYET'].includes(o.status)).length;
    const missingVehicle = activeOverdue.filter((o) => !o.vehicle && (!o.assignedTeamDetails || o.assignedTeamDetails.length === 0)).length;
    const missingDriver = activeOverdue.filter((o) => !o.driver && (!o.assignedTeamDetails || o.assignedTeamDetails.length === 0)).length;

    const totalAttention = activeOverdue.filter((o) =>
      ['DRAFT', 'PENDING_APPROVAL', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(o.status) ||
      (!o.vehicle && (!o.assignedTeamDetails || o.assignedTeamDetails.length === 0)) ||
      (!o.driver && (!o.assignedTeamDetails || o.assignedTeamDetails.length === 0))
    ).length;

    const delayedList = activeOverdue.filter((o) => {
      const depTime = new Date(o.departureTime!).getTime();
      if (isNaN(depTime) || depTime > departureDelayThreshold) return false;
      return !o.actualDepartureTime && !['WORKING', 'IN_TRANSIT', 'DANG_THI_CONG', 'DEPARTED'].includes(o.status);
    });

    const lateAssigned = delayedList.filter((o) => o.status === 'ASSIGNED' || o.status === 'DA_DUYET').length;
    const lateAccepted = delayedList.filter((o) => o.status === 'DRIVER_ACCEPTED' || o.status === 'DA_NHAN').length;

    return {
      totalAttention,
      totalOverdue: delayedList.length,
      awaitingApproval,
      missingVehicle,
      missingDriver,
      lateAssigned,
      lateAccepted,
      categoryName: targetCategory === 'NONG_NGHIEP' ? 'nông nghiệp' : targetCategory === 'CONG_TRINH' ? 'công trình' : targetCategory === 'VAN_CHUYEN' ? 'vận chuyển' : '',
    };
  }, [orders, selectedKLH, isAgriculturalSpecific, selectedCategory]);

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
      const dateStr = toDateString(d);
      const dayName = DAYS_OF_WEEK[i] || `Thứ ${i + 2}`;
      const shortName = i === 6 ? 'CN' : `T${i + 2}`;
      const displayDate = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const isToday = dateStr === toDateString(new Date());

      // Đếm số lệnh trong ngày này: Khớp chính xác theo ngày khởi hành orderDate
      const count = orders.filter((o) => {
        if (selectedCategory !== 'ALL' && o.orderCategory !== selectedCategory) return false;
        const orderDate = o.departureTime ? toDateString(o.departureTime) : (o.plannedEndTime ? toDateString(o.plannedEndTime) : '');
        return orderDate === dateStr;
      }).length;

      days.push({ dayName, shortName, dateStr, displayDate, isToday, count });
    }
    return days;
  }, [selectedWeek, availableWeeks, orders, selectedCategory]);

  // Điều hướng ngày nhanh
  const handleStepDate = (days: number) => {
    const base = selectedDate === 'ALL' ? new Date() : new Date(selectedDate);
    base.setDate(base.getDate() + days);
    setSelectedDate(toDateString(base));
  };

  const handleSelectToday = () => {
    const today = new Date();
    const todayStr = toDateString(today);
    const todayWeek = getWeekNumber(today);
    setSelectedWeek(todayWeek);
    setSelectedDate(todayStr);
  };

  const renderCategoryBadge = (cat: ExtendedDispatchOrder['orderCategory']) => {
    switch (cat) {
      case 'NONG_NGHIEP':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <Tractor className="h-3 w-3 text-emerald-600" /> Nông nghiệp
          </span>
        );
      case 'CONG_TRINH':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            <HardHat className="h-3 w-3 text-amber-600" /> Công trình ca máy
          </span>
        );
      case 'VAN_CHUYEN':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
            <Truck className="h-3 w-3 text-blue-600" /> Vận chuyển nội bộ
          </span>
        );
      case 'CUU_HO_SOS':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700 animate-pulse">
            <ShieldAlert className="h-3 w-3 text-red-600" /> Cứu hộ SOS
          </span>
        );
      default:
        return null;
    }
  };

  const columns: Column<ExtendedDispatchOrder>[] = [
    {
      key: 'code',
      title: 'Mã lệnh & Phân loại',
      width: '200px',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <b className="font-mono font-bold text-primary text-xs hover:underline cursor-pointer" onClick={() => handleOpenOrder(row)}>
              {row.code}
            </b>
            {(needsOperatorAttention(row) || isDepartureDelayed(row)) && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded" title={needsOperatorAttention(row) ? 'Lệnh đã qua lịch nhưng chưa được duyệt hoặc phân công' : 'Lệnh đã giao nhưng chưa xuất phát đúng hạn'}>
                <AlertTriangle className="h-3 w-3" /> {needsOperatorAttention(row) ? 'Chưa xử lý' : 'Trễ xuất phát'} · {overdueDayCount(row.departureTime) > 0 ? `${overdueDayCount(row.departureTime)} ngày` : 'quá giờ'}
              </span>
            )}
          </div>
          {row.planCode && (
            <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50/90 border border-emerald-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1" title={`Thuộc Kế hoạch lớn: ${row.planCode}`}>
              <span className="text-slate-500 font-medium">KH:</span>
              <span className="font-bold">{row.planCode}</span>
            </div>
          )}
          <div>{renderCategoryBadge(row.orderCategory)}</div>
        </div>
      ),
    },
    {
      key: 'departureTime',
      title: 'Thời gian thực hiện',
      width: '155px',
      sortable: true,
      render: (row) => {
        if (!row.departureTime) return <span className="text-slate-400">—</span>;
        const d = new Date(row.departureTime);
        const endD = row.plannedEndTime ? new Date(row.plannedEndTime) : null;
        return (
          <div className="text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-slate-400" />
              {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              {endD && ` ➔ ${endD.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
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
        const { planNotes, taskNotes } = parseOrderNotes(row);
        const notePreview = taskNotes || planNotes;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              {row.taskJobCode && (
                <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1 py-0.2 rounded">
                  {row.taskJobCode}
                </span>
              )}
              <b className="font-bold text-slate-900 text-xs leading-snug">{row.taskJobName || row.purpose}</b>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{row.unit}</span>
              {row.workVolumeTarget && (
                <span className="font-bold text-emerald-700">
                  🎯 {row.workVolumeTarget} {row.workVolumeUnit || 'Ha'}
                </span>
              )}
            </div>
            {notePreview && (
              <div className="text-[10.5px] text-slate-500 italic line-clamp-1" title={`Ghi chú: ${notePreview}`}>
                📝 {notePreview}
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
      render: (row) => (
        <div className="text-xs space-y-0.5 max-w-[115px]">
          <div className={`font-bold flex items-center gap-1.5 ${needsOperatorAttention(row) && !row.vehicle ? 'text-red-700' : 'text-slate-900'}`}>
            <Truck className={`h-3.5 w-3.5 shrink-0 ${needsOperatorAttention(row) && !row.vehicle ? 'text-red-500' : 'text-slate-400'}`} />
            <span className="truncate">{row.vehicle?.plate || row.vehicle?.code || row.vehicle?.name || 'Chưa gán xe'}</span>
          </div>
          {row.implement && (
            <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
              <Wrench className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
              <span className="truncate">{row.implement.name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'driver',
      title: 'Lái xe / Thợ máy',
      width: '135px',
      render: (row) => (
        <div className="text-xs">
          <div className={`font-bold flex items-center gap-1 ${needsOperatorAttention(row) && !row.driver ? 'text-red-700' : 'text-slate-800'}`}>
            <User className={`h-3.5 w-3.5 shrink-0 ${needsOperatorAttention(row) && !row.driver ? 'text-red-500' : 'text-slate-400'}`} />
            <span className="truncate">{row.driver?.fullName || 'Chưa gán tài xế'}</span>
          </div>
          {row.secondaryDriverName && (
            <div className="text-[11px] text-purple-700 font-medium mt-0.5 truncate">
              Phụ: {row.secondaryDriverName}
            </div>
          )}
          {row.driver?.licenseClass && (
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {row.driver.licenseClass}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'route',
      title: 'Lộ trình / Vị trí',
      width: '260px',
      render: (row) => (
        <div className="text-xs space-y-0.5 min-w-[200px]">
          <div className="flex items-start gap-1 text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="font-medium text-slate-700 leading-snug">{row.origin || 'Kho xuất / Điểm đi'}</span>
          </div>
          <div className="text-xs font-bold text-slate-900 pl-4.5 leading-snug break-words">
            ➔ {row.taskPlot || row.destination || 'Lô thửa tác nghiệp'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '135px',
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          {needsOperatorAttention(row) && (!row.vehicle || !row.driver) && (
            <div className="flex flex-wrap gap-1">
              {!row.vehicle && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Thiếu xe</span>}
              {!row.driver && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Thiếu tài xế</span>}
            </div>
          )}
          {row.plannedFuelLiters && (
            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Fuel className="h-3 w-3 text-slate-400 shrink-0" />
              <span>Định mức: <b>{row.plannedFuelLiters}L</b></span>
            </div>
          )}
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
          createdDate={row.departureTime || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.approvedAt || row.departureTime || '01-08-2026'}
          updatedUser="admin"
          title={`Xem thông tin lệnh điều xe ${row.code}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      width: '135px',
      align: 'center',
      render: (row) => {
        const canAction = isDepartureDelayed(row);
        const requiresAction = needsOperatorAttention(row) || canAction;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <TableRowActions
              onView={() => handleOpenOrder(row)}
              onEdit={() => handleOpenOrder(row)}
              viewTitle="Xem chi tiết lệnh điều xe"
              editTitle="Chỉnh sửa lệnh điều xe"
            />
            {/* Giữ nguyên icon điều xe */}
            <button
              type="button"
              onClick={() => handleOpenOrder(row)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                requiresAction ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={requiresAction ? 'Lệnh cần xử lý ngay' : 'Điều phối lệnh xe'}
            >
              <Truck className="w-3.5 h-3.5" />
            </button>
            {canAction && (
              <button
                type="button"
                className="p-1 rounded hover:bg-amber-50 text-amber-700 transition-colors cursor-pointer"
                onClick={() => {
                  setRescheduleTarget(row);
                  setRescheduleForm({
                    newDepartureTime: row.departureTime ? new Date(row.departureTime).toISOString().slice(0, 16) : '',
                    newPlannedEndTime: row.plannedEndTime ? new Date(row.plannedEndTime).toISOString().slice(0, 16) : '',
                    reason: '',
                  });
                  setActionError('');
                }}
                title="Dời sang lịch mới"
              >
                <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              </button>
            )}
          </div>
        );
      },
    },
  ];


  // BẢNG QUẢN LÝ CÁC VIỆC ĐÃ HOÀN TẤT
  const completedColumns: Column<ExtendedDispatchOrder>[] = [
    {
      key: 'code',
      title: 'Mã lệnh & Phân loại',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <b
              className="font-mono font-bold text-primary text-xs hover:underline cursor-pointer"
              onClick={() => handleOpenOrder(row)}
            >
              {row.code}
            </b>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Đã xong
            </span>
          </div>
          <div>{renderCategoryBadge(row.orderCategory)}</div>
        </div>
      ),
    },
    {
      key: 'purpose',
      title: 'Hạng mục Công việc / Nhiệm vụ',
      render: (row) => (
        <div className="max-w-xs">
          <b className="font-bold text-slate-900 text-xs line-clamp-2">{row.purpose}</b>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
            <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{row.unit}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate font-semibold text-slate-600">{row.destination}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Phương tiện & Nông cụ',
      render: (row) => (
        <div className="text-xs space-y-0.5 max-w-[190px]">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{row.vehicle?.plate || row.vehicle?.code || row.vehicle?.name || 'Chưa gán xe'}</span>
          </div>
          {row.implement && (
            <div className="text-[11px] text-slate-600 truncate flex items-center gap-1 bg-slate-50 p-1 rounded border border-slate-100">
              <Wrench className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate">{row.implement.name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'driver',
      title: 'Nhân sự thực hiện',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>{row.driver?.fullName || 'Chưa gán tài xế'}</span>
          </div>
          {row.secondaryDriverName && (
            <div className="text-[11px] text-purple-700 font-medium mt-0.5">
              Phụ: {row.secondaryDriverName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'workVolume',
      title: 'Khối lượng nghiệm thu',
      render: (row) => {
        const actual = row.workVolumeActual ?? row.workVolumeTarget;
        return (
          <div className="text-xs">
            <div className="font-extrabold text-emerald-700">
              {actual} {row.workVolumeUnit}
            </div>
            {row.workVolumeTarget && (
              <div className="text-[10px] text-slate-500 font-medium">
                Kế hoạch: {row.workVolumeTarget} {row.workVolumeUnit} (100%)
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'departureTime',
      title: 'Thời gian bắt đầu',
      render: (row) => {
        if (!row.departureTime) return <span className="text-slate-400">—</span>;
        const d = new Date(row.departureTime);
        return (
          <div className="text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>
        );
      },
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
                <span>⏱ Thực hiện: <b>{durationText}</b></span>
                <span className="text-emerald-600">· Đạt chuẩn</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'fuel',
      title: 'Dầu thực tế',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-900 flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5 text-purple-600" />
            <span>{row.actualFuelLiters ?? row.plannedFuelLiters ?? '—'} Lít</span>
          </div>
          {row.plannedFuelLiters && (
            <div className="text-[10px] text-slate-500">
              Định mức: {row.plannedFuelLiters} Lít {row.fuelQuotaRate && `(${row.fuelQuotaRate})`}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'acceptance',
      title: 'Người ký nghiệm thu',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-900">
            {row.completedBy || 'Quản đốc / Đội trưởng'}
          </div>
          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
            {row.acceptanceRating || 'Đạt 100% tiêu chuẩn'}
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
          createdDate={row.departureTime || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.approvedAt || row.departureTime || '01-08-2026'}
          updatedUser="admin"
          title={`Xem thông tin lệnh hoàn tất ${row.code}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      width: '110px',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <TableRowActions
            onView={() => handleOpenOrder(row)}
            viewTitle="Xem chi tiết lệnh / biên bản nghiệm thu"
          />
          {/* Giữ nguyên icon điều xe */}
          <button
            type="button"
            onClick={() => handleOpenOrder(row)}
            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="Biên bản nghiệm thu điều xe"
          >
            <Truck className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];


  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isAgriculturalSpecific ? 'Lệnh điều xe Nông nghiệp' : 'Tất cả Lệnh điều xe'}
        </h1>
      </div>

      {/* OVERDUE BANNER: Cảnh báo lệnh quá hạn theo từng loại lệnh (hoặc toàn hệ thống) */}
      {computedOverdueSummary && (computedOverdueSummary.totalAttention > 0 || computedOverdueSummary.totalOverdue > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">
              {computedOverdueSummary.totalAttention} lệnh {computedOverdueSummary.categoryName ? `${computedOverdueSummary.categoryName} ` : ''}chờ điều độ · {computedOverdueSummary.totalOverdue} lệnh trễ xuất phát
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {computedOverdueSummary.awaitingApproval} chưa duyệt · {computedOverdueSummary.missingVehicle} thiếu xe/máy · {computedOverdueSummary.missingDriver} thiếu tài xế · {computedOverdueSummary.lateAssigned} chờ tài xế nhận · {computedOverdueSummary.lateAccepted} đã nhận nhưng chưa đi.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
            onClick={() => { setSelectedWeek('ALL'); setSelectedDate('ALL'); setStatusFilter('DELAYED'); setView('table'); }}
          >
            Xem và xử lý
          </button>
        </div>
      )}

      {/* 2. THANH BỘ LỌC PHÂN LOẠI LỆNH (CATEGORY SEGMENTED TABS) */}
      <DispatchCategoryTabs
        activeTab={isAgriculturalSpecific ? 'NONG_NGHIEP' : (selectedCategory === 'ALL' ? 'ALL' : selectedCategory as any)}
        counts={categoryCounts}
        onTabChange={(tabKey) => {
          if (tabKey === 'ALL') {
            navigate('/lenh-dieu-xe/danh-sach');
            setSelectedCategory('ALL');
          } else if (tabKey === 'NONG_NGHIEP') {
            navigate('/lenh-dieu-xe/lenh-nong-nghiep');
            setSelectedCategory('NONG_NGHIEP');
          } else if (tabKey === 'CONG_TRINH') {
            navigate('/lenh-dieu-xe/lenh-cong-trinh');
          } else if (tabKey === 'VAN_CHUYEN') {
            navigate('/lenh-dieu-xe/lenh-noi-bo');
          }
        }}
      />

      {/* 3. KPI Summary Cards 8 nhóm chuẩn hóa 4x2 */}
      <KPIGrid cols={4}>
        {/* Hàng 1: Toàn bộ | Lệnh trễ phân công | Đôn đốc | Kế hoạch tuần tới */}
        <StatCard
          label={selectedDate === 'ALL' ? 'Tổng lệnh điều xe' : `Tổng lệnh (${selectedDate})`}
          value={statusCounts.ALL}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          pillText="Toàn bộ"
          pillVariant="neutral"
          onClick={() => setStatusFilter('ALL')}
          className={statusFilter === 'ALL' ? 'ring-2 ring-blue-500/30 border-blue-500' : ''}
        />
        <StatCard
          label="Lệnh trễ do chưa phân công"
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
          label="Tài xế chưa xác nhận nhận lệnh"
          value={statusCounts.DRIVER_PENDING}
          icon={<UserCheck className="h-5 w-5 text-amber-600" />}
          pillText="Đôn đốc"
          pillVariant="warning"
          onClick={() => setStatusFilter(statusFilter === 'DRIVER_PENDING' ? 'ALL' : 'DRIVER_PENDING')}
          className={statusFilter === 'DRIVER_PENDING' ? 'ring-2 ring-amber-500/30 border-amber-500' : ''}
        />
        <StatCard
          label="Chưa điều xe kế hoạch tuần sau"
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
          label="Chờ duyệt / gán xe & tài xế"
          value={statusCounts.CHUA_PHAN_CONG}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          pillText="Chờ duyệt phân công"
          pillVariant="warning"
          onClick={() => setStatusFilter(statusFilter === 'CHUA_PHAN_CONG' ? 'ALL' : 'CHUA_PHAN_CONG')}
          className={statusFilter === 'CHUA_PHAN_CONG' ? 'ring-2 ring-amber-500/30 border-amber-500' : ''}
        />
        <StatCard
          label="Đã điều xe & gán nhiệm vụ"
          value={statusCounts.DA_GIAO_VIEC}
          icon={<Send className="h-5 w-5 text-indigo-600" />}
          pillText="Đã phân công"
          pillVariant="neutral"
          onClick={() => setStatusFilter(statusFilter === 'DA_GIAO_VIEC' ? 'ALL' : 'DA_GIAO_VIEC')}
          className={statusFilter === 'DA_GIAO_VIEC' ? 'ring-2 ring-indigo-500/30 border-indigo-500' : ''}
        />
        <StatCard
          label="Phương tiện đang thực hiện"
          value={statusCounts.DANG_LAM_VIEC}
          icon={<Activity className="h-5 w-5 text-emerald-600" />}
          pillText="Đang vận hành"
          pillVariant="success"
          onClick={() => setStatusFilter(statusFilter === 'DANG_LAM_VIEC' ? 'ALL' : 'DANG_LAM_VIEC')}
          className={statusFilter === 'DANG_LAM_VIEC' ? 'ring-2 ring-emerald-500/30 border-emerald-500' : ''}
        />
        <StatCard
          label="Đã hoàn thành & nghiệm thu"
          value={statusCounts.COMPLETED}
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
          pillText="Nghiệm thu"
          pillVariant="success"
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={statusFilter === 'COMPLETED' ? 'ring-2 ring-teal-500/30 border-teal-500' : ''}
        />
      </KPIGrid>

      {/* 4. Filter Bar theo chuẩn Enterprise (Hình 2: Grid trường có tiêu đề + Hàng nút thao tác) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5">
        {/* Hàng 1: Grid các trường lọc có Header Label in hoa bên trên */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Cột 1: Mã lệnh / Từ khóa tìm kiếm */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Mã lệnh / Lô / Tuyến
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã lệnh, lô thửa..."
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

          {/* Cột 2: Hạng mục công việc */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Hạng mục công việc
            </label>
            <div className="relative">
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả hạng mục ({availablePurposes.length})</option>
                {availablePurposes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cột 3: Phương tiện / Thiết bị */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Phương tiện / Thiết bị
            </label>
            <div className="relative">
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả xe / máy ({availableVehicles.length})</option>
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

          {/* Cột 6: Ngày thực hiện */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Ngày thực hiện cụ thể
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

        {/* Hàng 2: Toolbar Nút Thao Tác (Nhập lại, Tìm kiếm, Ngày trong tuần, Xuất in, Tạo mới) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Nhập lại */}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedPurpose('ALL');
                setSelectedVehicle('ALL');
                setSelectedDriver('ALL');
                setSelectedWeek(getWeekNumber(new Date()));
                setSelectedDate(toDateString(new Date()));
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
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất / In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const cat = isAgriculturalSpecific ? 'AGRICULTURE' : 'AGRICULTURE';
                navigate(`/lenh-dieu-xe/tao-moi?category=${cat}`, { state: null });
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-extrabold shadow-2xs transition-all cursor-pointer select-none active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Lập lệnh điều xe mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. View Switcher (Đồng bộ chuẩn 3 trang: Bảng kê, Scheduler, Kanban) + Lọc trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher<'table' | 'daily_timeline' | 'kanban'>
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: 'Bảng kê tổng hợp toàn bộ lệnh' },
            { value: 'daily_timeline', label: 'Scheduler lịch chạy theo xe' },
            { value: 'kanban', label: 'Kanban 4 nhóm trạng thái' },
          ]}
        />
        {(view === 'table' || view === 'daily_timeline') && (
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



      {/* 6. Nội dung theo View */}
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-medium text-slate-400">
          Đang tải dữ liệu lệnh điều xe...
        </div>
      ) : view === 'table' ? (
        /* GIAO DIỆN BẢNG KÊ TỔNG HỢP */
        <DataTable
          columns={columns}
          data={filteredOrders}
          isLoading={loading}
          onRowClick={handleOpenOrder}
          serverSide={false}
          totalItems={filteredOrders.length}
          useGlobalFilters={false}
        />
      ) : view === 'daily_timeline' ? (
        /* GIAO DIỆN SCHEDULER LỊCH CHẠY THEO XE 24 TIẾNG */
        <Vehicle24hScheduler
          title={isAgriculturalSpecific ? 'Scheduler lịch chạy máy Nông nghiệp 24h' : 'Scheduler lịch chạy phương tiện 24h'}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          availableDates={availableDates}
          lanes={schedulerData.lanes}
          unassignedItems={schedulerData.unassigned}
          onItemClick={handleOpenOrder}
          kind={isAgriculturalSpecific ? 'AGRICULTURE' : 'GENERAL'}
        />
      ) : (
        /* GIAO DIỆN KANBAN 4 NHÓM */
        <div className="grid gap-3 lg:grid-cols-4">
          {grouped.map((group) => (
            <section key={group.key} className="min-h-72 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
              <h3 className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold text-slate-800">
                <span>{group.title}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                  {group.orders.length}
                </span>
              </h3>

              <div className="space-y-2.5">
                {group.orders.map((order) => (
                  <button
                    type="button"
                    key={order.id}
                    onClick={() => handleOpenOrder(order)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-primary hover:shadow-md transition-all space-y-2 group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <b className="font-mono text-xs font-bold text-primary group-hover:underline">
                        {order.code}
                      </b>
                      {renderCategoryBadge(order.orderCategory)}
                    </div>

                    <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                      {order.taskJobName || order.purpose}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="truncate max-w-[120px] font-medium text-slate-700">
                        {order.vehicle?.code || 'Chưa có xe'}
                      </span>
                      <span className="truncate max-w-[120px] font-medium text-slate-600">
                        {order.driver?.fullName || 'Chưa có tài xế'}
                      </span>
                    </div>

                    {order.departureTime && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(order.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>{new Date(order.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                    )}
                  </button>
                ))}

                {!group.orders.length && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
                    Không có lệnh nào
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 7. Modal Chi tiết & Phân công Lệnh điều xe */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Chi tiết & Phân công Lệnh điều xe ${selected?.code ?? ''}`}
        size="xl"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            {/* Header thông tin chính */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <b className="font-mono text-base text-primary font-extrabold">{selected.code}</b>
                {renderCategoryBadge(selected.orderCategory)}
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={() => window.print()}>
                  In lệnh điều xe
                </Button>
              </div>
            </div>

            {/* 1. THẺ THÔNG TIN KẾ HOẠCH LỚN */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 p-3.5 border border-emerald-200/80 text-xs shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Kế hoạch cơ giới sản xuất:
                  </span>
                  <span className="font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-emerald-700 text-white shadow-2xs">
                    {selected.planCode || 'KH-2026-W37-7070'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-900 bg-white/80 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                  {selected.complexName || 'Khu liên hợp Snoul'} ➔ {selected.enterpriseName || 'Xí nghiệp Chuối ERC'}
                </span>
              </div>
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                <div>
                  <span className="text-slate-500">Tiêu đề kế hoạch: </span>
                  <b className="text-slate-900">{selected.planTitle || 'Kế hoạch cơ giới sản xuất tuần'}</b>
                </div>
                <div>
                  <span className="text-slate-500">Đơn vị / Nông trường: </span>
                  <b className="text-slate-900">{selected.farmName || selected.unit}</b>
                </div>
              </div>
            </div>

            {/* 2. THẺ KẾ HOẠCH CON & LỘ TRÌNH THỰC HIỆN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">Hạng mục công việc (Kế hoạch con):</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selected.taskJobCode && (
                      <span className="font-mono font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px]">
                        {selected.taskJobCode}
                      </span>
                    )}
                    <b className="text-slate-900 text-sm font-bold leading-snug">{selected.taskJobName || selected.purpose}</b>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Khối lượng tác nghiệp:</span>
                    <b className="text-emerald-700 font-extrabold text-sm">
                      {selected.workVolumeTarget ? `${selected.workVolumeTarget} ${selected.workVolumeUnit || 'Ha'}` : 'Theo ca điều độ'}
                    </b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nông cụ gắn kèm:</span>
                    <b className="text-slate-800 font-bold">{selected.implement?.name || 'Theo nhóm máy'}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dự toán nhiên liệu:</span>
                    {selected.plannedFuelLiters ? (
                      <b className="text-purple-700 font-bold">
                        {selected.plannedFuelLiters} Lít{' '}
                        {selected.fuelQuotaRate && (
                          <span className="text-purple-600 text-xs font-semibold">({selected.fuelQuotaRate})</span>
                        )}
                      </b>
                    ) : (
                      <span className="text-slate-400 italic">Chưa ấn định (chọn xe để tính)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:border-l md:border-slate-200 md:pl-3.5">
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">Vị trí Lô thửa & Điểm xuất phát:</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{selected.origin} ➔ <b className="text-primary">{selected.taskPlot || selected.destination}</b></span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Thời gian bắt đầu ca:</span>
                    <b className="text-slate-800">{formatDateTime(selected.departureTime)}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Thời gian kết thúc ca:</span>
                    <b className="text-slate-800">{formatDateTime(selected.plannedEndTime)}</b>
                  </div>
                </div>

                {(() => {
                  const { planNotes, taskNotes, rawNotes } = parseOrderNotes(selected);
                  const hasAnyNotes = planNotes || taskNotes || rawNotes;
                  if (!hasAnyNotes) return null;

                  return (
                    <div className="space-y-2 pt-1">
                      {planNotes && (
                        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-2.5 text-xs text-amber-950 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
                            <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>Ghi chú chung kế hoạch:</span>
                          </div>
                          <div className="text-slate-800 whitespace-pre-line leading-relaxed pl-5 font-medium">
                            {planNotes}
                          </div>
                        </div>
                      )}

                      {taskNotes && (
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-0.5">
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>Ghi chú riêng công việc con:</span>
                          </div>
                          <div className="text-slate-800 whitespace-pre-line leading-relaxed pl-5 font-medium">
                            {taskNotes}
                          </div>
                        </div>
                      )}

                      {!planNotes && !taskNotes && rawNotes && (
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-0.5">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Ghi chú:</span>
                          </div>
                          <div className="text-slate-800 whitespace-pre-line leading-relaxed pl-5 font-medium">
                            {rawNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. PHƯƠNG TIỆN & THỢ MÁY THỰC HIỆN LỆNH (1 xe duy nhất) */}
            <div className="rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Tractor className="h-4 w-4 text-emerald-600" />
                  <span>Phương tiện & Thợ máy thực hiện lệnh (1 xe):</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {selected.vehicle?.code ? 'Đã gán phương tiện' : 'Chưa phân công xe'}
                </span>
              </div>

              {selected.vehicle?.code || selected.driver?.fullName ? (
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 text-slate-900 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {selected.vehicle?.code || 'Chưa gán xe'}
                      </span>
                      {selected.vehicle?.name && (
                        <span className="text-xs font-semibold text-slate-700">{selected.vehicle.name}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-500">Tài xế / Thợ máy:</span>
                        <b className="text-slate-800 font-semibold">{selected.driver?.fullName || 'Chưa gán thợ lái'}</b>
                      </div>
                      {selected.implement?.name && (
                        <div className="flex items-center gap-1">
                          <Wrench className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-slate-500">Nông cụ:</span>
                          <b className="text-slate-800 font-semibold">{selected.implement.name}</b>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-100 text-right">
                    <span className="text-[10px] text-slate-500 font-medium">Ca làm việc</span>
                    <b className="text-xs font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {selected.departureTime && selected.plannedEndTime
                        ? `${new Date(selected.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${new Date(selected.plannedEndTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                        : 'Ca hành chính (8h)'}
                    </b>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-100/60 text-slate-500 text-xs text-center font-medium">
                  Chưa phân công xe và người vận hành (thực hiện ở khung quy trình phê duyệt bên dưới)
                </div>
              )}
            </div>

            {/* 4. Khung quy trình phê duyệt & phân công vào ca (Từng xe riêng biệt trong tổ máy) */}
            <WorkflowActionPanel
              key={selected.id}
              kind={selected.orderCategory === 'CONG_TRINH' ? 'CONSTRUCTION' : selected.orderCategory === 'VAN_CHUYEN' ? 'TRANSPORT' : 'AGRICULTURE'}
              step={workflowStep(selected.status)}
              taskName={selected.purpose}
              vehicleCode={selected.vehicle?.code}
              driverName={selected.driver?.fullName}
              implementName={selected.implement?.name}
              estimatedVehiclesCount={1}
              initialAssignedVehicles={selected.vehicle?.code ? [selected.vehicle.code] : []}
              currentOrderId={selected.id}
              recommendationWorkOrderId={selected.operationalWorkOrder?.id}
              existingOrders={orders}
              initialStartTime={selected.departureTime}
              initialDurationHours={selected.departureTime && selected.plannedEndTime ? Math.max(0.5, (new Date(selected.plannedEndTime).getTime() - new Date(selected.departureTime).getTime()) / 3_600_000) : 8}
              unit={selected.unit}
              onVehicleScheduleChange={(details) => {
                setSelected((current) => {
                  if (!current) return current;
                  if (current.plannedFuelLiters === details.plannedFuelLiters && current.fuelQuotaRate === details.fuelQuotaRate) {
                    return current;
                  }
                  return {
                    ...current,
                    plannedFuelLiters: details.plannedFuelLiters,
                    fuelQuotaRate: details.fuelQuotaRate,
                  };
                });
              }}
              onApprove={async (vehicle, driver, schedule, implement, team) => {
                try {
                  const payload = {
                    vehicleId: vehicle.id,
                    driverId: driver.id,
                    ...(typeof implement?.id === 'number' && implement.id < 90_000 ? { implementId: implement.id } : {}),
                    departureTime: schedule.startTime,
                    plannedEndTime: schedule.endTime,
                  };
                  if (selected.orderCategory === 'VAN_CHUYEN') {
                    const realId = selected.id > 200_000 ? selected.id - 200_000 : selected.id;
                    await operationsApi.assignTransport(realId, payload);
                  } else {
                    await operationsApi.assignDispatch(selected.id, payload);
                  }
                  const vRate = vehicle.fuelQuotaRate ?? getVehicleFuelQuotaRate(vehicle as any, selected.orderCategory);
                  const calcFuel = Number((schedule.durationHours * vRate).toFixed(1));
                  const changes: Partial<ExtendedDispatchOrder> = {
                    status: 'ASSIGNED',
                    vehicle: { id: vehicle.id, code: vehicle.code, name: vehicle.name, status: 'CHO_PHAN_CONG' },
                    driver: { id: driver.id, fullName: driver.name, licenseClass: driver.license },
                    implement: implement ? { id: implement.id, code: implement.code, name: implement.name } : selected.implement,
                    assignedVehiclesCount: 1,
                    assignedVehicleList: [vehicle.code],
                    assignedTeamDetails: [{
                      vehicleCode: vehicle.code,
                      vehicleName: vehicle.name,
                      driverName: driver.name,
                      implementName: implement?.name,
                      startTime: schedule.startTime,
                      endTime: schedule.endTime,
                      durationHours: schedule.durationHours,
                    }],
                    departureTime: schedule.startTime,
                    plannedEndTime: schedule.endTime,
                    plannedFuelLiters: calcFuel,
                    fuelQuotaRate: `${vRate} L/h`,
                  };
                  setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, ...changes } : order));
                  setSelected((current) => current?.id === selected.id ? { ...current, ...changes } : current);
                  useAppStore.getState().setHeaderAlert({ type: 'success', message: `Đã phân công ${vehicle.code} cho ${driver.name} (Dự toán: ${calcFuel}L).` });
                } catch (error: any) {
                  const body = error?.response?.data;
                  const details = body?.message?.reasons ?? body?.reasons ?? body?.message?.message;
                  const reasonText = Array.isArray(details)
                    ? details.map((item: any) => item.message).filter(Boolean).join('; ')
                    : typeof details === 'string' ? details : body?.message || error?.message || 'Không thể lưu phân công.';
                  useAppStore.getState().setHeaderAlert({ type: 'error', message: `Phân công thất bại: ${reasonText}` });
                }
              }}
            />
          </div>
        )}
      </Modal>


      {/* MODAL: Dời lịch lệnh điều xe */}
      <Modal
        isOpen={!!rescheduleTarget}
        onClose={() => { setRescheduleTarget(null); setActionError(''); }}
        title={`Dời lịch lệnh: ${rescheduleTarget?.code || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <b>Lưu ý:</b> Nếu Xe/Tài xế đã gán bị trùng lịch với khung giờ mới, hệ thống sẽ tự động reset về <b>Chờ phân công</b>.
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">⏰ Thời gian xuất phát mới <span className="text-red-500">*</span></span>
            <input
              type="datetime-local"
              value={rescheduleForm.newDepartureTime}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, newDepartureTime: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">⏱ Thời gian kết thúc dự kiến mới <span className="text-red-500">*</span></span>
            <input
              type="datetime-local"
              value={rescheduleForm.newPlannedEndTime}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, newPlannedEndTime: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">📝 Lý do dời lịch</span>
            <input
              type="text"
              value={rescheduleForm.reason}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="VD: Mưa lớn, thiếu vật tư, trùng kế hoạch..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {actionError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">{actionError}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={() => { setRescheduleTarget(null); setActionError(''); }}>
              Hủy
            </Button>
            <Button onClick={handleReschedule} disabled={actionSaving}>
              {actionSaving ? 'Đang lưu...' : 'Xác nhận Dời lịch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Nghiệm thu hồi tố */}
      <Modal
        isOpen={!!retroTarget}
        onClose={() => { setRetroTarget(null); setActionError(''); }}
        title={`Nghiệm thu hồi tố: ${retroTarget?.code || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            <b>Dùng khi:</b> Lệnh đã được thực hiện thực tế nhưng chưa kịp ghi nhận trên hệ thống. Lệnh sẽ chuyển thẳng sang trạng thái <b>Đã đóng</b>.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">🕐 Giờ bắt đầu thực tế <span className="text-red-500">*</span></span>
              <input
                type="datetime-local"
                value={retroForm.actualStartTime}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualStartTime: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">🕔 Giờ hoàn thành thực tế <span className="text-red-500">*</span></span>
              <input
                type="datetime-local"
                value={retroForm.actualCompletedTime}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualCompletedTime: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">⚙️ Giờ máy thực tế (tùy chọn)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={retroForm.actualMachineHours}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualMachineHours: e.target.value }))}
                placeholder="VD: 6.5"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">📦 Khối lượng thực tế (tùy chọn)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={retroForm.actualQuantity}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualQuantity: e.target.value }))}
                placeholder="VD: 12.5"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">📝 Ghi chú / Lý do nghiệm thu hồi tố</span>
            <textarea
              rows={2}
              value={retroForm.notes}
              onChange={(e) => setRetroForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="VD: Lệnh đã hoàn tất ngày 08/09 nhưng chưa kịp cập nhật hệ thống do sự cố điện..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {actionError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">{actionError}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={() => { setRetroTarget(null); setActionError(''); }}>
              Hủy
            </Button>
            <Button onClick={handleRetroactiveComplete} disabled={actionSaving}>
              {actionSaving ? 'Đang lưu...' : 'Xác nhận Nghiệm thu hồi tố'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
