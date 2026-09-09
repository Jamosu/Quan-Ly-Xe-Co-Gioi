import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { operationsApi } from '../../api/operations';
import { apiClient } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { FilterBar } from '../../components/filters/FilterBar';
import { ErrorState, formatDateTime, StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import type { DispatchOrderRecord } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';
import { useAppStore } from '../../store/useAppStore';
import { matchesKLH } from '../../utils/filterUtils';
import { WorkflowActionPanel, type DemoWorkflowStep } from '../../components/dispatch/WorkflowActionPanel';
import { Vehicle24hScheduler, type SchedulerLane, type SchedulerItem } from '../../components/dispatch/Vehicle24hScheduler';
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
import { syncAllApprovedSpecializedPlans } from './specializedPlanSync';

const STORAGE_KEY = 'thaco_all_dispatch_orders_master_v4';

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
  { key: 'working', title: 'Đang vận hành / Thi công', statuses: ['WORKING', 'IN_TRANSIT', 'DANG_THI_CONG', 'TAM_DUNG'] },
  { key: 'completed', title: 'Hoàn tất & Nghiệm thu', statuses: ['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'] },
];

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

  const [view, setView] = useState<'table' | 'daily_timeline' | 'kanban' | 'completed'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [orders, setOrders] = useState<ExtendedDispatchOrder[]>([]);
  const [selected, setSelected] = useState<ExtendedDispatchOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createCategory, setCreateCategory] = useState<'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN' | 'CUU_HO_SOS'>('NONG_NGHIEP');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => searchParams.get('planCode') || '');



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
      const [dispatchRes, transportRes] = await Promise.allSettled([
        operationsApi.dispatchOrders({ limit: 1000 }),
        operationsApi.transportOrders({ limit: 500 }),
      ]);

      const realDispatches: ExtendedDispatchOrder[] = [];
      if (dispatchRes.status === 'fulfilled' && dispatchRes.value?.items) {
        dispatchRes.value.items.forEach((item: any) => {
          const isConstruction =
            item.vehicle?.assetGroup === 'MAY_CONG_TRINH' ||
            item.code?.startsWith('LC-') ||
            item.code?.startsWith('LCM-') ||
            item.code?.startsWith('CM-') ||
            item.code?.startsWith('LDX-CT-') ||
            item.orderCategory === 'CONG_TRINH';
          const cat = isConstruction ? 'CONG_TRINH' : 'NONG_NGHIEP';
          const catLabel = isConstruction ? 'Công trình ca máy' : 'Nông nghiệp';

          realDispatches.push({
            ...item,
            orderCategory: cat,
            categoryLabel: catLabel,
            workVolumeTarget: item.workVolumeTarget ?? (item.productionOrder?.planItem?.jobCode ? 25 : undefined),
            workVolumeUnit: item.workVolumeUnit ?? (isConstruction ? 'Giờ' : 'Ha'),
            plannedFuelLiters: item.plannedFuelLiters ?? (isConstruction ? 80 : 150),
          });
        });
      }

      if (transportRes.status === 'fulfilled' && transportRes.value?.items) {
        transportRes.value.items.forEach((item: any) => {
          realDispatches.push({
            id: item.id ? 200000 + item.id : Math.floor(Math.random() * 100000),
            code: item.code,
            orderCategory: 'VAN_CHUYEN',
            categoryLabel: 'Vận chuyển',
            sourceType: 'TRANSPORT_ORDER' as any,
            unit: item.unit || 'BAN_CO_GIOI',
            purpose: item.cargoType || 'Vận chuyển hàng hóa nội bộ',
            origin: item.origin || 'Kho Trung Tâm',
            destination: item.destination || 'Điểm giao hàng',
            departureTime: item.departureTime || item.executionDate || item.requestDate,
            plannedEndTime: item.plannedEndTime,
            status: item.status,
            isDelayed: Boolean(item.isRouteDeviated),
            vehicle: item.vehicle,
            driver: item.driver,
            workVolumeTarget: item.tonnage || item.palletCount || 1,
            workVolumeUnit: item.palletCount ? 'Pallet' : 'Tấn',
            plannedFuelLiters: item.plannedFuelLiters,
            notes: item.notes,
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

      // Tự động đồng bộ các lệnh sinh từ Kế hoạch Công trình & Vận chuyển nội bộ (STORAGE_KEY) nếu có
      try {
        syncAllApprovedSpecializedPlans();
        const storedRaw = localStorage.getItem(STORAGE_KEY);
        if (storedRaw) {
          const storedOrders = JSON.parse(storedRaw);
          if (Array.isArray(storedOrders)) {
            storedOrders.forEach((so: any) => {
              if (!realDispatches.some((rd) => rd.code === so.code)) {
                const isCt = so.orderCategory === 'CONG_TRINH' || so.code?.startsWith('LDX-CT-');
                const isVc = so.orderCategory === 'VAN_CHUYEN' || so.code?.startsWith('LDX-VC-');
                realDispatches.push({
                  id: so.id || Date.now() + Math.floor(Math.random() * 10000),
                  code: so.code,
                  orderCategory: isCt ? 'CONG_TRINH' : isVc ? 'VAN_CHUYEN' : 'NONG_NGHIEP',
                  categoryLabel: isCt ? 'Công trình ca máy' : isVc ? 'Vận chuyển' : 'Nông nghiệp',
                  sourceType: so.sourceType || (isCt ? 'CONSTRUCTION_ORDER' : isVc ? 'TRANSPORT_ORDER' : 'PRODUCTION_ORDER'),
                  unit: so.unit || 'Khu liên hợp',
                  purpose: so.purpose || 'Thực hiện kế hoạch tác nghiệp',
                  origin: so.origin || 'Bãi máy',
                  destination: so.destination || 'Hiện trường',
                  departureTime: so.departureTime || new Date().toISOString(),
                  plannedEndTime: so.plannedEndTime,
                  status: so.status || 'CHO_PHAN_CONG',
                  isDelayed: false,
                  workVolumeTarget: so.workVolumeTarget,
                  workVolumeUnit: so.workVolumeUnit,
                  plannedFuelLiters: so.plannedFuelLiters,
                  notes: so.notes,
                  planCode: so.planCode,
                  planTitle: so.planTitle,
                  assignedVehiclesCount: so.assignedVehiclesCount || 1,
                  assignedVehicleList: so.assignedVehicleList || [],
                });
              }
            });
          }
        }
      } catch (storageErr) {
        console.warn('Lỗi đọc cache kế hoạch điều xe:', storageErr);
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
  }, []);

  const updateDemoOrder = (id: number, changes: Partial<ExtendedDispatchOrder>) => {
    const updated = orders.map((order) => (order.id === id ? { ...order, ...changes } : order));
    setOrders(updated);
    setSelected((current) => (current?.id === id ? { ...current, ...changes } : current));

    const targetOrder = updated.find((o) => o.id === id);
    if (targetOrder) {
      if (targetOrder.orderCategory === 'VAN_CHUYEN') {
        const realId = targetOrder.id > 200000 ? targetOrder.id - 200000 : targetOrder.id;
        apiClient.patch(`/transport-orders/${realId}`, changes).catch(() => {});
      } else {
        apiClient.patch(`/dispatch-orders/${id}`, changes).catch(() => {});
      }
    }
  };

  const workflowStep = (status: DispatchOrderRecord['status']): DemoWorkflowStep => {
    if (['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(status)) return 'COMPLETED';
    if (['DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DANG_THI_CONG'].includes(status)) return 'RECEIVED';
    if (['APPROVED', 'ASSIGNED', 'DA_DUYET', 'DA_NHAN'].includes(status)) return 'APPROVED';
    return 'PENDING';
  };

  useEffect(() => {
    void load();
  }, [load]);

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

      // Lọc theo Tuần (selectedWeek)
      if (selectedWeek !== 'ALL') {
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
        if (statusFilter === 'CHO_DUYET') {
          if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(order.status)) return false;
        } else if (statusFilter === 'DA_DUYET') {
          if (!['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'DA_DUYET', 'DA_NHAN'].includes(order.status)) return false;
        } else if (statusFilter === 'WORKING') {
          if (!['WORKING', 'IN_TRANSIT', 'DANG_THI_CONG', 'TAM_DUNG'].includes(order.status)) return false;
        } else if (statusFilter === 'COMPLETED') {
          if (!['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(order.status)) return false;
        } else if (statusFilter === 'DELAYED') {
          if (!order.isDelayed && order.orderCategory !== 'CUU_HO_SOS') return false;
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

      // Lọc theo Ngày: So khớp theo ngày khởi hành/ngày tác nghiệp chính
      if (selectedDate !== 'ALL') {
        const orderDate = order.departureTime ? toDateString(order.departureTime) : (order.plannedEndTime ? toDateString(order.plannedEndTime) : '');
        if (orderDate !== selectedDate) return false;
      }

      // Tìm kiếm từ khóa
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = order.code.toLowerCase().includes(q);
        const matchPurpose = order.purpose.toLowerCase().includes(q);
        const matchUnit = (order.unit || '').toLowerCase().includes(q);
        const matchVehicle = (order.vehicle?.name || order.vehicle?.code || order.vehicle?.plate || '').toLowerCase().includes(q);
        const matchDriver = (order.driver?.fullName || '').toLowerCase().includes(q);
        const matchOrigin = (order.origin || '').toLowerCase().includes(q);
        const matchDest = (order.destination || '').toLowerCase().includes(q);
        const matchImplement = (order.implement?.name || '').toLowerCase().includes(q);
        if (!matchCode && !matchPurpose && !matchUnit && !matchVehicle && !matchDriver && !matchOrigin && !matchDest && !matchImplement) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.departureTime ? new Date(a.departureTime).getTime() : 0;
      const timeB = b.departureTime ? new Date(b.departureTime).getTime() : 0;
      return sortOrder === 'time_asc' ? timeA - timeB : timeB - timeA;
    });
  }, [orders, selectedCategory, selectedWeek, availableWeeks, statusFilter, selectedStatus, selectedDate, search, sortOrder, selectedKLH]);

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
    return {
      ALL: baseList.length,
      CHO_DUYET: baseList.filter((o) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'CHO_PHAN_CONG'].includes(o.status)).length,
      DA_DUYET: baseList.filter((o) => ['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'DA_DUYET', 'DA_NHAN'].includes(o.status)).length,
      WORKING: baseList.filter((o) => ['WORKING', 'IN_TRANSIT', 'DANG_THI_CONG', 'TAM_DUNG'].includes(o.status)).length,
      COMPLETED: baseList.filter((o) => ['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(o.status)).length,
      DELAYED: baseList.filter((o) => o.isDelayed || o.orderCategory === 'CUU_HO_SOS').length,
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
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <b className="font-mono font-bold text-primary text-xs hover:underline cursor-pointer" onClick={() => setSelected(row)}>
              {row.code}
            </b>
            {row.isDelayed && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded" title="Cảnh báo trễ tiến độ">
                <AlertTriangle className="h-3 w-3" /> Trễ
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
      render: (row) => {
        const { planNotes, taskNotes } = parseOrderNotes(row);
        const notePreview = taskNotes || planNotes;
        return (
          <div className="max-w-xs space-y-1">
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
              <div className="text-[10.5px] text-slate-500 italic line-clamp-1 truncate" title={`Ghi chú: ${notePreview}`}>
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
      render: (row) => (
        <div className="text-xs space-y-1 max-w-[200px]">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{row.vehicle?.plate || row.vehicle?.code || row.vehicle?.name || 'Chưa gán xe'}</span>
          </div>
          {row.assignedVehicleList && row.assignedVehicleList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.assignedVehicleList.map((v, i) => (
                <span
                  key={i}
                  className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    i === 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
                  }`}
                  title={i === 0 ? 'Xe máy trưởng' : `Xe tổ viên ${i + 1}`}
                >
                  {v}
                </span>
              ))}
            </div>
          )}
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
      title: 'Lái xe / Thợ máy',
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
          {row.driver?.licenseClass && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              {row.driver.licenseClass}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'route',
      title: 'Lộ trình / Vị trí',
      render: (row) => (
        <div className="text-xs max-w-[180px]">
          <div className="flex items-center gap-1 text-slate-600">
            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{row.origin}</span>
          </div>
          <div className="text-[11px] font-bold text-slate-900 pl-4 truncate mt-0.5">
            ➔ {row.taskPlot || row.destination}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          {row.plannedFuelLiters && (
            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Fuel className="h-3 w-3 text-slate-400" />
              <span>Định mức: <b>{row.plannedFuelLiters}L</b></span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      render: (row) => (
        <Button size="sm" variant="outline" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setSelected(row)}>
          Chi tiết
        </Button>
      ),
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
              onClick={() => setSelected(row)}
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
      key: 'actions',
      title: 'Thao tác',
      render: (row) => (
        <Button size="sm" variant="outline" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setSelected(row)}>
          Biên bản
        </Button>
      ),
    },
  ];

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const curYear = new Date().getFullYear();
      const curWeek = getWeekNumber(new Date());
      const seq = String(orders.length + 1).padStart(3, '0');
      const prefix = createCategory === 'NONG_NGHIEP' ? 'LDX-NN' : createCategory === 'CONG_TRINH' ? 'LC' : createCategory === 'VAN_CHUYEN' ? 'LVC' : 'LDX-CH';
      const code = `${prefix}-${curYear}-W${curWeek}-${seq}`;

      const departureTime = form.get('departureTime') ? new Date(String(form.get('departureTime'))).toISOString() : new Date().toISOString();
      const plannedEndTime = form.get('plannedEndTime') ? new Date(String(form.get('plannedEndTime'))).toISOString() : undefined;
      const purpose = String(form.get('purpose') || '');
      const origin = String(form.get('origin') || '');
      const destination = String(form.get('destination') || '');
      const notes = String(form.get('notes') || '');

      if (createCategory === 'VAN_CHUYEN') {
        await apiClient.post('/transport-orders', {
          code,
          routeType: 'ONE_WAY',
          unit: 'BAN_CO_GIOI',
          departureTime,
          plannedEndTime,
          cargoType: purpose,
          origin,
          destination,
          notes,
        });
      } else {
        await apiClient.post('/dispatch-orders', {
          code,
          unit: 'NT1',
          purpose,
          origin,
          destination,
          sourceType: createCategory === 'NONG_NGHIEP' ? 'PRODUCTION_ORDER' : 'MANUAL',
          departureTime,
          plannedEndTime,
          notes,
        });
      }

      await load();
      setShowCreate(false);
    } catch (err) {
      console.error('Failed to create order in DB:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {isAgriculturalSpecific ? 'Lệnh điều xe Nông nghiệp' : 'Tất cả Lệnh điều xe (Tổng hợp toàn hệ thống)'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAgriculturalSpecific
              ? 'Điều độ máy kéo, nông cụ, làm đất, chăm sóc và thu hoạch trên các lô thửa nông trường.'
              : 'Tổng hợp và theo dõi toàn bộ lệnh điều xe Nông nghiệp, Công trình ca máy, Vận chuyển nội bộ và Cứu hộ SOS trên toàn Khu liên hợp.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            Xuất Excel / In bảng kê
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Lập lệnh điều xe mới
          </Button>
        </div>
      </div>

      {/* 2. THANH BỘ LỌC PHÂN LOẠI LỆNH (CATEGORY SEGMENTED TABS) */}
      {!isAgriculturalSpecific && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
          {[
            { key: 'ALL', label: 'Tất cả các loại lệnh', count: categoryCounts.ALL, icon: Layers },
            { key: 'NONG_NGHIEP', label: 'Lệnh Nông nghiệp', count: categoryCounts.NONG_NGHIEP, icon: Tractor, color: 'text-emerald-600' },
            { key: 'CONG_TRINH', label: 'Lệnh Công trình ca máy', count: categoryCounts.CONG_TRINH, icon: HardHat, color: 'text-amber-500' },
            { key: 'VAN_CHUYEN', label: 'Lệnh Vận chuyển nội bộ', count: categoryCounts.VAN_CHUYEN, icon: Truck, color: 'text-blue-600' },
            ...(categoryCounts.CUU_HO_SOS > 0 ? [{ key: 'CUU_HO_SOS', label: 'Cứu hộ khẩn cấp SOS', count: categoryCounts.CUU_HO_SOS, icon: ShieldAlert, color: 'text-red-500' }] : []),
          ].map((cat) => {
            const isActive = selectedCategory === cat.key;
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key as DispatchCategory)}
                className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 select-none cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : cat.color || 'text-slate-400'}`} />
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Filter Bar (Search + Bộ lọc Tuần + Bộ lọc Ngày hiện tại) */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã lệnh, nhiệm vụ, phương tiện, lái xe, lô thửa, tuyến đường..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-primary focus:outline-none"
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>

          {/* Cụm Bộ lọc Tuần & Ngày */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Bộ lọc Tuần sản xuất */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
              <CalendarDays className="h-4 w-4 text-emerald-600 shrink-0" />
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

            {/* 2. Nút Hôm nay (Tự động chọn Tuần hiện tại & Ngày hôm nay) */}
            <button
              type="button"
              onClick={handleSelectToday}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer select-none active:scale-95 ${
                selectedDate === toDateString(new Date()) && selectedWeek === getWeekNumber(new Date())
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              }`}
              title="Xem tất cả các lệnh của ngày hôm nay (08/09/2026)"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Hôm nay</span>
              <span className="text-[10px] font-mono bg-white/30 text-current px-1 rounded">08/09</span>
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

            {/* 4. Sắp xếp thứ tự giờ đi */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'time_asc' ? 'time_desc' : 'time_asc')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <span>{sortOrder === 'time_asc' ? 'Sớm ➔ muộn' : 'Muộn ➔ sớm'}</span>
            </button>
          </div>
        </div>

        {/* Hàng phụ: Bộ lọc các Thứ trong tuần đang chọn HOẶC Chọn ngày thủ công */}
        {selectedWeek !== 'ALL' ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
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
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Lọc ngày cụ thể:
            </span>
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 p-0.5">
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
            {selectedDate !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedDate('ALL')}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
              >
                Xóa lọc ngày ({selectedDate})
              </button>
            )}
          </div>
        )}
      </div>



      {/* 4. KPI Summary Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label={selectedDate === 'ALL' ? 'Tổng lệnh điều xe' : `Lệnh trong ngày (${selectedDate})`}
          value={filteredOrders.length}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Đang làm việc / Vận hành"
          value={filteredOrders.filter((o) => ['WORKING', 'IN_TRANSIT', 'DANG_THI_CONG'].includes(o.status)).length}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Chờ duyệt / Phân công xe"
          value={filteredOrders.filter((o) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHO_DUYET', 'ASSIGNED', 'DRIVER_ACCEPTED', 'DA_DUYET', 'DA_NHAN'].includes(o.status)).length}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          label="Cứu hộ SOS & Cảnh báo trễ"
          value={filteredOrders.filter((o) => o.isDelayed || o.orderCategory === 'CUU_HO_SOS').length}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        />
      </KPIGrid>

      {/* 5. View Switcher (Đồng bộ chuẩn 4 trang: Bảng kê, Scheduler, Kanban, Hoàn tất) */}
      <ViewSwitcher<'table' | 'daily_timeline' | 'kanban' | 'completed'>
        value={view}
        onChange={setView}
        options={[
          { value: 'table', label: isAgriculturalSpecific ? 'Bảng kê 16 cột chuẩn hóa' : 'Bảng kê tổng hợp toàn bộ lệnh' },
          { value: 'daily_timeline', label: 'Scheduler lịch chạy theo xe' },
          { value: 'kanban', label: 'Kanban 4 nhóm trạng thái' },
          { value: 'completed', label: 'Quản lý việc đã hoàn tất' },
        ]}
      />

      {/* 5.1. THANH LỌC 4 TRẠNG THÁI CHUẨN HÓA (CHO BẢNG KÊ & SCHEDULER NHƯ HÌNH) */}
      {(view === 'table' || view === 'daily_timeline') && (
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

          {/* Hàng phụ: Nút hiển thị Tất cả + Cảnh báo trễ (nếu có) */}
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
                  (Đang lọc theo trạng thái • Bấm lại vào thẻ hoặc nút <b>Tất cả trạng thái</b> để xem toàn bộ)
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
                <span>Cảnh báo trễ / SOS ({statusCounts.DELAYED})</span>
              </button>
            )}
          </div>
        </div>
      )}

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
          onRowClick={setSelected}
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
          onItemClick={setSelected}
          kind={isAgriculturalSpecific ? 'AGRICULTURE' : 'GENERAL'}
        />
      ) : view === 'kanban' ? (
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
                    onClick={() => setSelected(order)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs shadow-xs hover:border-primary hover:shadow-md transition-all space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <b className="text-primary font-mono font-bold text-xs">{order.code}</b>
                      {order.isDelayed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="h-3 w-3" /> Trễ
                        </span>
                      )}
                    </div>

                    <div>{renderCategoryBadge(order.orderCategory)}</div>

                    <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{order.purpose}</h4>

                    <div className="space-y-1 text-slate-600 text-[11px] pt-1.5 border-t border-slate-100">
                      <p className="font-semibold text-slate-800 truncate">
                        {order.vehicle?.plate || order.vehicle?.code || order.vehicle?.name || 'Chưa gán xe'}
                      </p>
                      <p className="text-slate-500 truncate">
                        {order.driver?.fullName || 'Chưa gán tài xế'}
                      </p>
                      <p className="text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatDateTime(order.departureTime)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                      <StatusBadge status={order.status} />
                      <span className="text-[10px] text-slate-400 font-medium">{order.unit}</span>
                    </div>
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
      ) : (
        /* GIAO DIỆN QUẢN LÝ CÁC VIỆC ĐÃ HOÀN TẤT */
        <div className="space-y-4">
          {/* Thẻ KPI tổng kết công việc hoàn tất */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-emerald-800">Tổng việc đã hoàn tất</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-950">{completedOrders.length}</span>
                <span className="text-xs font-semibold text-emerald-600">công việc</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">100% đạt chuẩn nghiệm thu hiện trường</span>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-blue-800">Tỷ lệ đúng tiến độ</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-950">100%</span>
                <span className="text-xs font-semibold text-blue-600">kế hoạch</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Đúng hạn hoặc hoàn thành sớm</span>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-purple-800">Nhiên liệu thực tế tiêu thụ</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-purple-950">
                  {completedOrders.reduce((acc, o) => acc + (o.actualFuelLiters || o.plannedFuelLiters || 0), 0)}
                </span>
                <span className="text-xs font-semibold text-purple-600">Lít dầu</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Tiết kiệm ~3.2% so với định mức</span>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-amber-800">Khối lượng nghiệm thu</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-950">
                  {completedOrders.reduce((acc, o) => acc + (o.workVolumeActual || o.workVolumeTarget || 0), 0).toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-amber-700">Ha / m³ / Tấn</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Đã đối soát biên bản nghiệm thu</span>
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
                    Bảng kê chi tiết công việc đã hoàn tất & Thời gian kết thúc
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hiển thị đầy đủ thông tin phương tiện, người thực hiện, khối lượng hoàn thành và thời điểm nghiệm thu
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                {completedOrders.length} công việc hoàn tất
              </span>
            </div>

            <DataTable
              columns={completedColumns}
              data={completedOrders}
              isLoading={loading}
              onRowClick={setSelected}
              serverSide={false}
              totalItems={completedOrders.length}
              useGlobalFilters={false}
            />
          </div>
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
                  {selected.plannedFuelLiters && (
                    <div>
                      <span className="text-slate-500 block">Dự toán nhiên liệu:</span>
                      <b className="text-purple-700 font-bold">{selected.plannedFuelLiters} Lít {selected.fuelQuotaRate && `(${selected.fuelQuotaRate})`}</b>
                    </div>
                  )}
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

            {/* 3. CÁC CHỌN XE TRONG TỔ MÁY KÉO TÁC NGHIỆP (Hiển thị ca làm việc riêng của từng xe) */}
            <div className="rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Tractor className="h-4 w-4 text-emerald-600" />
                  <span>Danh sách các xe được chọn trong tổ ({selected.assignedVehiclesCount || selected.assignedVehicleList?.length || 1} xe):</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Mỗi xe có ca máy và thợ vận hành độc lập
                </span>
              </div>

              {selected.assignedTeamDetails && selected.assignedTeamDetails.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {selected.assignedTeamDetails.map((item, idx) => {
                    const sTime = item.startTime ? new Date(item.startTime) : null;
                    const eTime = item.endTime ? new Date(item.endTime) : null;
                    const timeLabel = sTime && !Number.isNaN(sTime.getTime()) && eTime && !Number.isNaN(eTime.getTime())
                      ? `${sTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${eTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (${item.durationHours || 8}h)`
                      : item.durationHours ? `${item.durationHours} giờ` : 'Ca hành chính (8h)';

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 shadow-2xs ${
                          idx === 0
                            ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {idx === 0 ? 'Xe #1 (Máy trưởng)' : `Xe #${idx + 1}`}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {item.vehicleCode}
                          </span>
                        </div>

                        <div className="space-y-0.5 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            <b className="text-slate-800 font-semibold">{item.driverName || 'Chưa gán thợ lái'}</b>
                          </div>
                          {item.implementName && item.implementName !== 'Không gắn nông cụ (Xe tự hành / Ca máy)' && (
                            <div className="flex items-center gap-1 text-[10.5px] text-slate-500 truncate">
                              <Wrench className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.implementName}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-1 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10.5px]">
                          <span className="flex items-center gap-1 text-slate-500 font-medium">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>Ca máy:</span>
                          </span>
                          <b className="font-bold text-blue-900 bg-blue-100/60 px-1.5 py-0.5 rounded border border-blue-200/60">
                            {timeLabel}
                          </b>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(selected.assignedVehicleList && selected.assignedVehicleList.length > 0
                    ? selected.assignedVehicleList
                    : [selected.vehicle?.code || 'MK-50-01']
                  ).map((vCode, vIdx) => (
                    <div
                      key={vIdx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        vIdx === 0
                          ? 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tractor className={`h-4 w-4 ${vIdx === 0 ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div>
                          <b className="font-mono text-xs">{vCode}</b>
                          <div className="text-[10px] text-slate-500">
                            {vIdx === 0 ? `Xe máy trưởng (${selected.driver?.fullName || 'Trần Minh Đức'})` : `Xe hỗ trợ tổ máy ${vIdx + 1}`}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-emerald-700">
                        Sẵn sàng
                      </span>
                    </div>
                  ))}
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
              estimatedVehiclesCount={selected.assignedVehiclesCount || (selected.assignedVehicleList && selected.assignedVehicleList.length > 0 ? selected.assignedVehicleList.length : 1)}
              initialAssignedVehicles={selected.assignedVehicleList || []}
              currentOrderId={selected.id}
              existingOrders={orders}
              initialStartTime={selected.departureTime}
              initialDurationHours={selected.departureTime && selected.plannedEndTime ? Math.max(0.5, (new Date(selected.plannedEndTime).getTime() - new Date(selected.departureTime).getTime()) / 3_600_000) : 8}
              unit={selected.unit}
              onApprove={(vehicle, driver, schedule, implement, team) => {
                const teamCodes = team && team.length > 0 ? team.map((t) => t.vehicle.code).filter(Boolean) : [vehicle.code];
                const teamDetails = team && team.length > 0 ? team.map((t) => ({
                  vehicleCode: t.vehicle.code,
                  vehicleName: t.vehicle.name,
                  driverName: t.driver.name,
                  implementName: t.implement?.name,
                  startTime: t.schedule?.startTime,
                  endTime: t.schedule?.endTime,
                  durationHours: t.schedule?.durationHours,
                })) : undefined;

                updateDemoOrder(selected.id, {
                  status: 'ASSIGNED',
                  vehicle: { id: vehicle.id, code: vehicle.code, name: vehicle.name, status: 'CHO_PHAN_CONG' },
                  driver: { id: driver.id, fullName: driver.name, licenseClass: driver.license },
                  implement: implement ? { id: implement.id as any, code: implement.code, name: implement.name } : selected.implement,
                  assignedVehiclesCount: teamCodes.length,
                  assignedVehicleList: teamCodes,
                  assignedTeamDetails: teamDetails,
                  departureTime: schedule.startTime,
                  plannedEndTime: schedule.endTime,
                });
              }}
              onReceive={() => updateDemoOrder(selected.id, { status: 'DRIVER_ACCEPTED' })}
              onComplete={() => updateDemoOrder(selected.id, { status: 'ACCEPTED' })}
            />
          </div>
        )}
      </Modal>

      {/* 8. Modal Lập Lệnh điều xe mới */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Lập lệnh điều xe mới" size="lg">
        <form onSubmit={handleCreateSubmit} className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="mb-1 block font-bold text-slate-700">Chọn Loại lệnh điều xe</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'NONG_NGHIEP', label: 'Nông nghiệp', icon: Tractor },
                { key: 'CONG_TRINH', label: 'Công trình ca máy', icon: HardHat },
                { key: 'VAN_CHUYEN', label: 'Vận chuyển nội bộ', icon: Truck },
                { key: 'CUU_HO_SOS', label: 'Cứu hộ SOS', icon: ShieldAlert },
              ].map((c) => {
                const isSelected = createCategory === c.key;
                const Icon = c.icon;
                return (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => setCreateCategory(c.key as any)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left font-bold transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="sm:col-span-2">
            <span className="mb-1 block font-bold text-slate-700">Nhiệm vụ / Hạng mục điều động</span>
            <input
              name="purpose"
              required
              placeholder="VD: Cày sâu 30cm Lô A05 / San gạt bù vê Km 2+300 / Chở 25T chuối XK..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Đơn vị / Nông trường</span>
            <select
              name="unit"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Nông trường 1">Nông trường 1</option>
              <option value="Nông trường 2">Nông trường 2</option>
              <option value="Nông trường 3">Nông trường 3</option>
              <option value="Đội Cơ giới Công trình 1">Đội Cơ giới Công trình 1</option>
              <option value="Đội Cơ giới Công trình 2">Đội Cơ giới Công trình 2</option>
              <option value="Trung tâm Vận chuyển Nội bộ">Trung tâm Vận chuyển Nội bộ</option>
              <option value="Đội Cứu hộ Cơ giới SOS">Đội Cứu hộ Cơ giới SOS</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Khối lượng kế hoạch</span>
            <div className="flex gap-2">
              <input
                name="workVolumeTarget"
                type="number"
                step="0.1"
                placeholder="10.5"
                className="w-2/3 rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                name="workVolumeUnit"
                className="w-1/3 rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Ha">Ha</option>
                <option value="Giờ">Giờ</option>
                <option value="Tấn">Tấn</option>
                <option value="m³">m³</option>
                <option value="Km">Km</option>
                <option value="Chuyến">Chuyến</option>
              </select>
            </div>
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Điểm đi / Nơi xuất phát</span>
            <input
              name="origin"
              required
              placeholder="VD: Bãi máy NT1 / Kho Tổng / Xưởng chuối..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Điểm đến / Vị trí lô thửa</span>
            <input
              name="destination"
              required
              placeholder="VD: Lô A05 / Tuyến đường trục chính / Cảng..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Thời gian bắt đầu dự kiến</span>
            <input
              name="departureTime"
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Thời gian kết thúc dự kiến</span>
            <input
              name="plannedEndTime"
              type="datetime-local"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block font-bold text-slate-700">Ghi chú điều độ</span>
            <textarea
              name="notes"
              rows={2}
              placeholder="Yêu cầu kỹ thuật, độ sâu cày, quy cách đóng gói, trang bị an toàn..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu và phát hành lệnh'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
