import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ArrowUpDown,
  Clock,
  Download,
  Filter,
  Layers,
  MapPin,
  Plus,
  Search,
  Wrench,
  CheckCircle2,
  HardHat,
  Gauge,
  Fuel,
  Activity,
  Printer,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Send,
  Eye,
  Truck,
  User,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { operationsApi } from '../../api/operations';
import { apiClient } from '../../api/client';
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
import { WorkflowActionPanel, type DemoWorkflowStep } from '../../components/dispatch/WorkflowActionPanel';
import { Vehicle24hScheduler, type SchedulerLane, type SchedulerItem } from '../../components/dispatch/Vehicle24hScheduler';
import { DispatchCategoryTabs } from '../../components/dispatch/DispatchCategoryTabs';
import { useAppStore } from '../../store/useAppStore';
import { matchesKLH } from '../../utils/filterUtils';
import { getWeeksOfYear, getWeekNumber } from './ProductionPlanPage';
import { DAYS_OF_WEEK } from './CreateProductionPlanPage';

function toDateString(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ConstructionShiftRecord {
  id: string;
  code: string; // VD: CM-2026-081
  workDate: string;
  plannedStartTime?: string;
  shiftType: 'CA_NGAY' | 'CA_DEM';
  complexCode: string;
  complexName: string;
  projectName: string; // Tên công trình / hạng mục: Tuyến đường trục chính, Tuyến mương...
  locationDetails: string; // Đoạn Km 2+300 - Km 4+100, Lô C05-C08...
  jobCategory: 'SAN_GAT_DUONG' | 'DAO_MƯƠNG_THOAT_NUOC' | 'LU_LÈN_NỀN' | 'SAN_ỦI_MAT_BANG' | 'KHAC';
  jobCategoryName: string;
  machineCode: string; // MUI-04, MX-12...
  machineName: string; // Máy ủi Cat D6, Máy xúc Komatsu PC200...
  machineType: string;
  operatorName: string; // Người vận hành / thợ máy
  operatorPhone: string;
  plannedHours: number; // Giờ máy kế hoạch: 7.5 giờ
  actualWorkingHours?: number; // Giờ máy nổ làm việc thực tế: 6.8 giờ
  actualIdlingHours?: number; // Giờ nổ máy không tải / chờ: 0.6 giờ
  fuelQuotaLitersPerHour: number; // Định mức dầu Lít/Giờ: 14.5 Lít/h
  plannedFuelLiters: number; // Kế hoạch tiêu hao: plannedHours * fuelQuota
  actualFuelLiters?: number;
  workVolumeTarget: number; // Khối lượng kế hoạch: 450 m3 hoặc 1.8 km
  workVolumeUnit: 'm³' | 'km' | 'mét' | 'Điểm';
  workVolumeActual?: number;
  status: 'CHO_DUYET' | 'DA_DUYET' | 'DA_NHAN' | 'DANG_THI_CONG' | 'TAM_DUNG' | 'HOAN_THANH';
  notes?: string;
  completedAt?: string;
  completedBy?: string;
  acceptanceRating?: string;
  rawOrder?: any;
  planCode?: string;
  planTitle?: string;
  unit?: string;
  productionOrder?: any;
}

const INITIAL_SHIFTS: ConstructionShiftRecord[] = [];

const JOB_CATEGORIES = [
  { value: 'SAN_GAT_DUONG', label: 'San gạt bù vê nền đường', unit: 'km', defaultQuota: 13.5 },
  { value: 'DAO_MƯƠNG_THOAT_NUOC', label: 'Đào đắp mương tiêu thoát nước', unit: 'm³', defaultQuota: 15.0 },
  { value: 'LU_LÈN_NỀN', label: 'Lu rung đầm lèn mặt đường', unit: 'km', defaultQuota: 11.0 },
  { value: 'SAN_ỦI_MAT_BANG', label: 'Ủi tạo mặt bằng & khai hoang', unit: 'm³', defaultQuota: 18.0 },
];

const MACHINES = [
  { code: 'MUI-04', name: 'Máy ủi Caterpillar D6 (165HP)', type: 'Máy ủi', defaultQuota: 18.0 },
  { code: 'MX-12', name: 'Máy xúc Komatsu PC200-8 (Gầu 0.8m³)', type: 'Máy xúc đào', defaultQuota: 15.0 },
  { code: 'MS-02', name: 'Máy san gạt Changlin PY165', type: 'Máy san gạt', defaultQuota: 13.5 },
  { code: 'ML-05', name: 'Máy lu rung Hamm 3411 (14T)', type: 'Máy lu rung', defaultQuota: 11.0 },
  { code: 'XB-08', name: 'Xe ben tự đổ Howo 3 chân 15T', type: 'Xe ben', defaultQuota: 16.5 },
];

const CONSTRUCTION_BOARDS: Array<{ title: string; statuses: ConstructionShiftRecord['status'][] }> = [
  { title: 'Chờ duyệt', statuses: ['CHO_DUYET'] },
  { title: 'Đã phân công', statuses: ['DA_DUYET'] },
  { title: 'Đã nhận / thi công', statuses: ['DA_NHAN', 'DANG_THI_CONG', 'TAM_DUNG'] },
  { title: 'Đã nghiệm thu', statuses: ['HOAN_THANH'] },
];

export const ConstructionDispatchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const globalKLH = useAppStore((state) => state.selectedKLH);

  const [shifts, setShifts] = useState<ConstructionShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await operationsApi.dispatchOrders({ limit: 1000 });
      if (res?.items) {
        const ctList: ConstructionShiftRecord[] = res.items
          .filter((item: any) => item.status !== 'CANCELLED' && (item.productionOrder?.plan?.planType === 'CONSTRUCTION' || item.operationDomain === 'CONSTRUCTION'))
          .map((item: any) => {
            const dateStr = item.departureTime ? item.departureTime.slice(0, 10) : '2026-09-08';
            const timeStr = item.departureTime ? item.departureTime.slice(11, 16) : '07:00';
            const mType = item.vehicle?.category === 'MAY_DAO' ? 'Máy xúc đào'
              : item.vehicle?.category === 'MAY_UI' ? 'Máy ủi'
              : item.vehicle?.category === 'MAY_SAN' ? 'Máy san gạt'
              : item.vehicle?.category === 'MAY_LU' ? 'Máy lu rung'
              : 'Máy công trình';

            const statusMap: Record<string, ConstructionShiftRecord['status']> = {
              DRAFT: 'CHO_DUYET',
              PENDING_APPROVAL: 'CHO_DUYET',
              CHO_PHAN_CONG: 'CHO_DUYET',
              APPROVED: 'DA_DUYET',
              ASSIGNED: 'DA_DUYET',
              DRIVER_ACCEPTED: 'DA_NHAN',
              WORKING: 'DANG_THI_CONG',
              IN_TRANSIT: 'DANG_THI_CONG',
              COMPLETED: 'HOAN_THANH',
              ACCEPTED: 'HOAN_THANH',
            };

            const plan = item.productionOrder?.plan;
            const complexCode = plan?.complexCode || (['NT1', 'NT2', 'NT3', 'NT4', 'BAN_CO_GIOI'].includes(item.unit) ? 'KOUN_MOM' : item.unit) || 'KOUN_MOM';
            const complexName = plan?.complexName || (complexCode === 'KOUN_MOM' ? 'Khu liên hợp Koun Mom' : item.unit === 'NT1' ? 'Nông trường 1' : item.unit || 'Khu liên hợp');

            return {
              id: String(item.id),
              code: item.code,
              workDate: dateStr,
              plannedStartTime: timeStr,
              shiftType: 'CA_NGAY' as const,
              complexCode,
              complexName,
              unit: item.unit,
              planCode: plan?.code,
              planTitle: plan?.title,
              productionOrder: item.productionOrder,
              projectName: item.purpose || 'San gạt bù vê nền đường giao thông',
              locationDetails: `${item.origin || ''} ➔ ${item.destination || ''}`.trim() || 'Lô thửa công trường',
              jobCategory: (item.vehicle?.category === 'MAY_SAN' ? 'SAN_GAT_DUONG' : item.vehicle?.category === 'MAY_DAO' ? 'DAO_MƯƠNG_THOAT_NUOC' : item.vehicle?.category === 'MAY_LU' ? 'LU_LÈN_NỀN' : 'SAN_ỦI_MAT_BANG') as any,
              jobCategoryName: item.purpose || 'San gạt mặt bằng',
              machineCode: item.vehicle?.code || 'MAY-01',
              machineName: item.vehicle?.name || 'Máy công trình',
              machineType: mType,
              operatorName: item.driver?.fullName || 'Chưa phân công thợ máy',
              operatorPhone: item.driver?.phone || '',
              plannedHours: 8.0,
              actualWorkingHours: item.status === 'COMPLETED' ? 7.5 : item.status === 'WORKING' ? 4.5 : 0,
              actualIdlingHours: 0.5,
              fuelQuotaLitersPerHour: item.vehicle?.fuelQuotaRate || 14.5,
              plannedFuelLiters: (item.vehicle?.fuelQuotaRate || 14.5) * 8,
              actualFuelLiters: item.status === 'COMPLETED' ? (item.vehicle?.fuelQuotaRate || 14.5) * 7.5 : undefined,
              workVolumeTarget: item.workVolumeTarget || 450,
              workVolumeUnit: 'm³' as const,
              workVolumeActual: item.status === 'COMPLETED' ? 450 : undefined,
              status: statusMap[item.status] || 'CHO_DUYET',
              notes: item.notes,
              rawOrder: item,
            };
          });

        setShifts(ctList);
        const currentAlert = useAppStore.getState().headerAlert;
        if (currentAlert?.type === 'error') {
          useAppStore.getState().setHeaderAlert(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load construction shifts:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể kết nối cơ sở dữ liệu lệnh công trình.';
      useAppStore.getState().setHeaderAlert({
        type: 'error',
        message: `Lỗi tải lệnh công trình: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Lắng nghe sự kiện làm mới từ nút Header Refresh
  React.useEffect(() => {
    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent<{ pathname?: string }>;
      if (!customEvent.detail?.pathname || customEvent.detail.pathname.includes('/lenh-cong-trinh')) {
        void load();
      }
    };
    window.addEventListener('thaco_refresh_current_page', handleRefresh);
    return () => {
      window.removeEventListener('thaco_refresh_current_page', handleRefresh);
    };
  }, [load]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [selectedOperator, setSelectedOperator] = useState('ALL');
  const [view, setView] = useState<'table' | 'scheduler' | 'kanban'>('table');

  // 52 Tuần trong năm
  const availableWeeks = useMemo(() => {
    return [...getWeeksOfYear(2026)].sort((a, b) => b.weekNumber - a.weekNumber);
  }, []);

  // Bộ lọc Tuần: 'ALL' hoặc số tuần (Mặc định tuần hiện tại)
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>(() => {
    return getWeekNumber(new Date());
  });

  // Mặc định vừa vào chọn ngày hôm nay
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return toDateString(new Date());
  });
  const [sortOrder, setSortOrder] = useState<'time_asc' | 'time_desc'>('time_asc');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

      // Đếm số lệnh ca máy công trình trong ngày này
      const count = shifts.filter((s) => {
        if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;
        if (selectedCategory !== 'ALL' && s.jobCategory !== selectedCategory) return false;
        if (selectedMachine !== 'ALL' && s.machineCode !== selectedMachine) return false;
        return s.workDate === dateStr;
      }).length;

      days.push({ dayName, shortName, dateStr, displayDate, isToday, count });
    }
    return days;
  }, [selectedWeek, availableWeeks, shifts, globalKLH, selectedCategory, selectedMachine]);

  const handleStepDate = (delta: number) => {
    const base = selectedDate === 'ALL' ? new Date() : new Date(selectedDate);
    if (isNaN(base.getTime())) return;
    base.setDate(base.getDate() + delta);
    setSelectedDate(toDateString(base));
  };

  const handleSelectToday = () => {
    setSelectedWeek(getWeekNumber(new Date()));
    setSelectedDate(toDateString(new Date()));
  };

  const [selectedShift, setSelectedShift] = useState<ConstructionShiftRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Đếm 4 nhóm trạng thái chuẩn hóa
  const statusCounts = useMemo(() => {
    const base = shifts.filter((s) => {
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;
      if (selectedCategory !== 'ALL' && s.jobCategory !== selectedCategory) return false;
      if (selectedMachine !== 'ALL' && s.machineCode !== selectedMachine) return false;
      if (selectedWeek !== 'ALL') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          if (s.workDate < start || s.workDate > end) return false;
        }
      }
      if (selectedDate !== 'ALL' && s.workDate !== selectedDate) return false;
      return true;
    });
    const chuaPhanCong = base.filter((s) => s.status === 'CHO_DUYET').length;
    const daGiaoViec = base.filter((s) => ['DA_DUYET', 'DA_NHAN'].includes(s.status)).length;
    const dangLamViec = base.filter((s) => ['DANG_THI_CONG', 'TAM_DUNG'].includes(s.status)).length;
    const driverPending = base.filter((s) => s.status === 'DA_DUYET').length;
    const completed = base.filter((s) => s.status === 'HOAN_THANH').length;

    const currentWeekNum = getWeekNumber(new Date());
    const currentWeekObj = availableWeeks.find((w) => w.weekNumber === currentWeekNum);
    const currentWeekEnd = currentWeekObj?.endDateKey || toDateString(new Date());

    const delayed = base.filter((s) => {
      if (!s.workDate) return false;
      const startTime = new Date(`${s.workDate}T${s.plannedStartTime || '07:00'}:00`).getTime();
      return !isNaN(startTime) && startTime <= Date.now() && !['DANG_THI_CONG', 'HOAN_THANH'].includes(s.status);
    }).length;

    const futureUnassigned = shifts.filter((s) => {
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;
      if (s.status === 'HOAN_THANH') return false;
      const isAfterCurrentWeek = s.workDate > currentWeekEnd;
      const isUnassigned = s.status === 'CHO_DUYET' || !s.machineCode || s.machineCode === 'CHUA_GAN' || !s.operatorName || s.operatorName.includes('Chưa');
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
      TAM_DUNG: base.filter((s) => s.status === 'TAM_DUNG').length,
    };
  }, [shifts, selectedCategory, selectedMachine, selectedWeek, availableWeeks, selectedDate, globalKLH]);

  // Tính toán cảnh báo ca máy công trình quá hạn / chờ điều độ (CHỈ BÁO CA ĐÃ ĐẾN HẠN/QUÁ HẠN)
  const computedOverdueSummary = useMemo(() => {
    const scoped = shifts.filter((s) => {
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;
      return true;
    });

    const now = Date.now();
    const departureDelayThreshold = now - 15 * 60 * 1000;
    // CHỈ BÁO CÁC CA ĐÃ ĐẾN HẠN HOẶC QUÁ HẠN (startTime <= now)
    const active = scoped.filter((s) => {
      if (s.status === 'HOAN_THANH') return false;
      if (!s.workDate) return false;
      const startTime = new Date(`${s.workDate}T${s.plannedStartTime || '07:00'}:00`).getTime();
      return !isNaN(startTime) && startTime <= now;
    });

    const awaitingApproval = active.filter((s) => s.status === 'CHO_DUYET').length;
    const missingVehicle = active.filter((s) => !s.machineCode || s.machineCode === 'CHUA_GAN' || s.machineCode === 'MAY-01').length;
    const missingDriver = active.filter((s) => !s.operatorName || s.operatorName.includes('Chưa')).length;

    const totalAttention = active.filter((s) =>
      s.status === 'CHO_DUYET' ||
      !s.machineCode || s.machineCode === 'CHUA_GAN' || s.machineCode === 'MAY-01' ||
      !s.operatorName || s.operatorName.includes('Chưa')
    ).length;

    const delayedList = active.filter((s) => {
      const startTime = new Date(`${s.workDate}T${s.plannedStartTime || '07:00'}:00`).getTime();
      if (isNaN(startTime) || startTime > departureDelayThreshold) return false;
      return !['DANG_THI_CONG', 'HOAN_THANH'].includes(s.status);
    });

    const lateAssigned = delayedList.filter((s) => s.status === 'DA_DUYET').length;
    const lateAccepted = delayedList.filter((s) => s.status === 'DA_NHAN').length;

    return {
      totalAttention,
      totalOverdue: delayedList.length,
      awaitingApproval,
      missingVehicle,
      missingDriver,
      lateAssigned,
      lateAccepted,
    };
  }, [shifts, globalKLH]);

  const completedShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;
      return s.status === 'HOAN_THANH';
    });
  }, [shifts, globalKLH]);

  useEffect(() => {
    try {
    } catch {}
  }, [shifts]);

  const updateShift = (id: string, patch: Partial<ConstructionShiftRecord>) => {
    setShifts((current) => current.map((shift) => shift.id === id ? { ...shift, ...patch } : shift));
    setSelectedShift((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const handleOpenShift = (shift: ConstructionShiftRecord) => {
    let targetOrder = shift.rawOrder;
    if (!targetOrder) {
      targetOrder = {
        id: Number(shift.id) || shift.id,
        code: shift.code,
        orderCategory: 'CONG_TRINH',
        categoryLabel: 'Công trình ca máy',
        purpose: shift.projectName,
        origin: 'Bãi máy Công trình',
        destination: shift.locationDetails,
        departureTime: shift.plannedStartTime ? `${shift.workDate}T${shift.plannedStartTime}:00.000Z` : `${shift.workDate}T07:00:00.000Z`,
        plannedEndTime: `${shift.workDate}T15:00:00.000Z`,
        status: shift.status === 'HOAN_THANH' ? 'COMPLETED' : shift.status === 'DANG_THI_CONG' ? 'WORKING' : shift.status === 'DA_NHAN' ? 'DRIVER_ACCEPTED' : shift.status === 'DA_DUYET' ? 'ASSIGNED' : 'PENDING_APPROVAL',
        vehicle: {
          code: shift.machineCode,
          name: shift.machineName,
        },
        driver: {
          fullName: shift.operatorName,
          phone: shift.operatorPhone,
        },
        workVolumeTarget: shift.workVolumeTarget,
        workVolumeUnit: shift.workVolumeUnit,
        notes: shift.notes,
      };
    } else {
      targetOrder = {
        ...targetOrder,
        orderCategory: 'CONG_TRINH',
        categoryLabel: 'Công trình ca máy',
      };
    }

    const isPending = !targetOrder.status || ['CHO_DUYET', 'PENDING', 'DRAFT', 'CHO_PHAN_CONG'].includes(targetOrder.status);
    if (isPending) {
      const now = new Date();
      const currentStart = now.toISOString();
      const durationMs = 8 * 3_600_000;
      const currentEnd = new Date(now.getTime() + durationMs).toISOString();
      targetOrder = {
        ...targetOrder,
        departureTime: currentStart,
        plannedEndTime: currentEnd,
      };
    }

    navigate(`/lenh-dieu-xe/chi-tiet/${shift.id}`, {
      state: {
        order: targetOrder,
        from: location.pathname + location.search,
      },
    });
  };

  const workflowStep = (status: ConstructionShiftRecord['status']): DemoWorkflowStep => {
    if (status === 'HOAN_THANH') return 'COMPLETED';
    if (['DA_NHAN', 'DANG_THI_CONG', 'TAM_DUNG'].includes(status)) return 'RECEIVED';
    if (status === 'DA_DUYET') return 'APPROVED';
    return 'PENDING';
  };

  // Form state
  const [formData, setFormData] = useState({
    code: `CM-2026-0${shifts.length + 1}`,
    workDate: '2026-09-08',
    shiftType: 'CA_NGAY' as const,
    projectName: 'Tuyến đường trục chính Nông trường 2',
    locationDetails: 'Km 2+300 - Km 4+100',
    jobCategory: 'SAN_GAT_DUONG',
    machineCode: 'MS-02',
    operatorName: 'Đỗ Văn Tuấn',
    operatorPhone: '0971.223.344',
    plannedHours: 7.5,
    fuelQuotaLitersPerHour: 13.5,
    workVolumeTarget: 1.5,
    workVolumeUnit: 'km' as const,
    notes: '',
  });

  // Danh sách các máy thi công thực tế từ dữ liệu
  const availableMachines = useMemo(() => {
    const map = new Map<string, string>();
    for (const sItem of shifts) {
      const code = sItem.machineCode;
      const name = sItem.machineName;
      if (code && code !== 'CHUA_GAN') {
        map.set(code, `${code} - ${name || code}`);
      }
    }
    return Array.from(map.entries()).map(([code, label]) => ({ code, label })).sort((a, b) => a.code.localeCompare(b.code));
  }, [shifts]);

  // Danh sách thợ máy / lái xe thực tế từ dữ liệu
  const availableOperators = useMemo(() => {
    const s = new Set<string>();
    for (const sItem of shifts) {
      if (sItem.operatorName && !sItem.operatorName.includes('Chưa') && !sItem.operatorName.includes('?')) {
        s.add(sItem.operatorName.trim());
      }
    }
    return Array.from(s).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      // Lọc theo Khu liên hợp từ Header
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;

      // Lọc theo từ khóa tìm kiếm (Mã lệnh, dự án, vị trí)
      if (search) {
        const q = search.toLowerCase();
        const matchCode = s.code.toLowerCase().includes(q);
        const matchProject = s.projectName.toLowerCase().includes(q);
        const matchLocation = s.locationDetails.toLowerCase().includes(q);
        if (!matchCode && !matchProject && !matchLocation) return false;
      }

      // Lọc theo Hạng mục
      if (selectedCategory !== 'ALL' && s.jobCategory !== selectedCategory) return false;

      // Lọc theo Máy thi công
      if (selectedMachine !== 'ALL' && s.machineCode !== selectedMachine) return false;

      // Lọc theo Thợ máy / Lái xe
      if (selectedOperator !== 'ALL' && s.operatorName !== selectedOperator) return false;

      // Lọc theo Tuần (selectedWeek) - bỏ qua khi đang lọc Lệnh trễ hoặc Lệnh tương lai
      if (selectedWeek !== 'ALL' && statusFilter !== 'DELAYED' && statusFilter !== 'FUTURE_UNASSIGNED') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          if (s.workDate < start || s.workDate > end) return false;
        }
      }

      // Lọc theo Ngày (Mặc định hôm nay hoặc Cả tuần) - bỏ qua khi lọc Lệnh trễ hoặc Lệnh tương lai
      if (selectedDate !== 'ALL' && statusFilter !== 'DELAYED' && statusFilter !== 'FUTURE_UNASSIGNED' && s.workDate !== selectedDate) return false;

      // Lọc theo trạng thái chuẩn hóa
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CHO_DUYET' || statusFilter === 'CHUA_PHAN_CONG') {
          if (s.status !== 'CHO_DUYET') return false;
        } else if (statusFilter === 'DA_DUYET' || statusFilter === 'DA_GIAO_VIEC') {
          if (!['DA_DUYET', 'DA_NHAN'].includes(s.status)) return false;
        } else if (statusFilter === 'WORKING' || statusFilter === 'DANG_LAM_VIEC') {
          if (!['DANG_THI_CONG', 'TAM_DUNG'].includes(s.status)) return false;
        } else if (statusFilter === 'DRIVER_PENDING' || statusFilter === 'TAI_XE_CHUA_XAC_NHAN') {
          if (s.status !== 'DA_DUYET') return false;
        } else if (statusFilter === 'COMPLETED') {
          if (s.status !== 'HOAN_THANH') return false;
        } else if (statusFilter === 'DELAYED') {
          if (!s.workDate) return false;
          const startTime = new Date(`${s.workDate}T${s.plannedStartTime || '07:00'}:00`).getTime();
          if (isNaN(startTime) || startTime > Date.now() || ['DANG_THI_CONG', 'HOAN_THANH'].includes(s.status)) return false;
        } else if (statusFilter === 'FUTURE_UNASSIGNED') {
          if (s.status === 'HOAN_THANH') return false;
          const currentWeekNum = getWeekNumber(new Date());
          const currentWeekObj = availableWeeks.find((w) => w.weekNumber === currentWeekNum);
          const currentWeekEnd = currentWeekObj?.endDateKey || toDateString(new Date());
          const isAfterCurrentWeek = s.workDate > currentWeekEnd;
          const isUnassigned = s.status === 'CHO_DUYET' || !s.machineCode || s.machineCode === 'CHUA_GAN' || !s.operatorName || s.operatorName.includes('Chưa');
          if (!isAfterCurrentWeek || !isUnassigned) return false;
        } else if (statusFilter === 'TAM_DUNG') {
          if (s.status !== 'TAM_DUNG') return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = `${a.workDate || ''} ${a.plannedStartTime || '00:00'}`;
      const timeB = `${b.workDate || ''} ${b.plannedStartTime || '00:00'}`;
      return sortOrder === 'time_asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
    });
  }, [shifts, search, selectedCategory, selectedMachine, selectedOperator, selectedWeek, availableWeeks, selectedDate, statusFilter, globalKLH, sortOrder]);

  // Danh sách các ngày có ca máy
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const shift of shifts) {
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(shift, globalKLH)) continue;
      if (shift.workDate) dates.add(shift.workDate);
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [shifts, globalKLH]);

  // Dữ liệu Làn máy cho Scheduler 24H
  const schedulerData = useMemo(() => {
    const laneMap = new Map<string, SchedulerLane>();
    const unassigned: SchedulerItem[] = [];

    for (const shift of filteredShifts) {
      // Xác định bước quy trình 3 giai đoạn chuẩn: Tài xế giao nhận -> Đang thực hiện -> Nghiệm thu
      let stepIdx = 0;
      if (['HOAN_THANH', 'COMPLETED', 'CLOSED'].includes(shift.status)) {
        stepIdx = 3; // 3. Nghiệm thu
      } else if (['DANG_THI_CONG', 'WORKING', 'IN_PROGRESS'].includes(shift.status)) {
        stepIdx = 2; // 2. Đang thực hiện
      } else if (['DA_NHAN', 'DA_DUYET', 'APPROVED', 'ASSIGNED'].includes(shift.status) || shift.operatorName) {
        stepIdx = 1; // 1. Tài xế giao nhận
      }

      const fuelInfo = shift.actualFuelLiters
        ? `Đã cấp ${shift.actualFuelLiters}L (${shift.fuelQuotaLitersPerHour}L/h)`
        : shift.plannedFuelLiters ? `Định mức ${shift.plannedFuelLiters}L` : undefined;

      const workVolume = `${shift.workVolumeActual || shift.workVolumeTarget} ${shift.workVolumeUnit}`;
      const acceptanceInfo = shift.completedBy
        ? `${shift.completedBy} nghiệm thu · ${shift.acceptanceRating || 'Đạt chuẩn'}`
        : shift.acceptanceRating;

      const mCode = shift.machineCode || 'CHUA_GAN';
      const startTime = shift.plannedStartTime || (shift.shiftType === 'CA_DEM' ? '19:00' : '07:00');
      const duration = shift.plannedHours || 7.5;

      if (mCode === 'CHUA_GAN') {
        unassigned.push({
          id: shift.id,
          code: shift.code,
          title: `${shift.projectName} · ${shift.jobCategoryName}`,
          location: shift.locationDetails,
          categoryLabel: 'Công trình',
          category: 'CONSTRUCTION',
          vehicleCode: 'Chưa gán máy',
          vehicleName: 'Chưa chọn máy thi công',
          driverName: shift.operatorName || 'Chưa gán thợ máy',
          driverPhone: shift.operatorPhone,
          startTime,
          durationHours: duration,
          status: shift.status,
          workflowStepIndex: stepIdx,
          workVolume,
          fuelInfo,
          acceptanceInfo,
          rawItem: shift,
        });
        continue;
      }

      if (!laneMap.has(mCode)) {
        laneMap.set(mCode, {
          laneKey: mCode,
          vehicleCode: mCode,
          vehicleName: shift.machineName,
          category: 'CONSTRUCTION',
          primaryDriverName: shift.operatorName,
          driverPhone: shift.operatorPhone,
          items: [],
        });
      }

      const lane = laneMap.get(mCode)!;
      lane.items.push({
        id: shift.id,
        code: shift.code,
        title: `${shift.projectName} · ${shift.jobCategoryName}`,
        location: shift.locationDetails,
        categoryLabel: 'Công trình',
        category: 'CONSTRUCTION',
        vehicleCode: mCode,
        vehicleName: shift.machineName,
        driverName: shift.operatorName,
        driverPhone: shift.operatorPhone,
        startTime,
        durationHours: duration,
        status: shift.status,
        workflowStepIndex: stepIdx,
        workVolume,
        fuelInfo,
        acceptanceInfo,
        rawItem: shift,
      });
    }

    return { lanes: Array.from(laneMap.values()), unassigned };
  }, [filteredShifts]);

  // KPI calculations
  const totalPlannedHours = useMemo(() => {
    return filteredShifts.reduce((sum, s) => sum + (s.plannedHours || 0), 0);
  }, [filteredShifts]);

  const totalWorkingHours = useMemo(() => {
    return filteredShifts.reduce((sum, s) => sum + (s.actualWorkingHours || 0), 0);
  }, [filteredShifts]);

  const totalFuelPlanned = useMemo(() => {
    return filteredShifts.reduce((sum, s) => sum + (s.plannedFuelLiters || 0), 0);
  }, [filteredShifts]);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const departureTime = new Date(`${formData.workDate}T07:00:00.000Z`).toISOString();
      const plannedEndTime = new Date(`${formData.workDate}T15:00:00.000Z`).toISOString();
      await apiClient.post('/dispatch-orders', {
        code: formData.code,
        unit: 'NT1',
        purpose: `${formData.projectName} - ${formData.locationDetails}`,
        origin: 'Bãi máy Công trình',
        destination: formData.locationDetails,
        sourceType: 'MANUAL_EXCEPTION',
        operationDomain: 'CONSTRUCTION',
        exceptionReason: formData.notes || 'Lệnh công trình phát sinh ngoài kế hoạch',
        departureTime,
        plannedEndTime,
        notes: formData.notes,
      });

      await load();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create construction shift:', err);
    }
  };

  const columns: Column<ConstructionShiftRecord>[] = [
    {
      key: 'code',
      title: 'Mã lệnh & Phân loại',
      width: '200px',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <b
              className="font-mono font-bold text-primary text-xs hover:underline cursor-pointer"
              onClick={() => handleOpenShift(row)}
            >
              {row.code}
            </b>
            {row.status === 'CHO_DUYET' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                <Clock className="h-3 w-3 text-amber-600" /> Chờ phân công
              </span>
            )}
          </div>
          {row.planCode && (
            <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50/90 border border-emerald-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1" title={`Thuộc Kế hoạch lớn: ${row.planCode}`}>
              <span className="text-slate-500 font-medium">KH:</span>
              <span className="font-bold">{row.planCode}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              <HardHat className="h-3 w-3 text-amber-600" /> Công trình ca máy
            </span>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
              {row.shiftType === 'CA_NGAY' ? 'Ca Ngày (07:00-17:00)' : 'Ca Đêm'}
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
        if (!row.workDate) return <span className="text-slate-400">—</span>;
        const d = new Date(row.workDate);
        return (
          <div className="text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-slate-400" />
              {row.plannedStartTime || '07:00'} ➔ 17:00
            </div>
          </div>
        );
      },
    },
    {
      key: 'purpose',
      title: 'Nhiệm vụ & Khối lượng',
      width: '200px',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            <b className="font-bold text-slate-900 text-xs leading-snug">{row.projectName}</b>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{row.unit || row.complexCode || 'NT1'}</span>
            <span className="font-bold text-emerald-700">
              🎯 {row.workVolumeTarget} {row.workVolumeUnit}
            </span>
            <span className="text-[10.5px] font-semibold text-slate-600">({row.jobCategoryName})</span>
          </div>
          {row.notes && (
            <div className="text-[10.5px] text-slate-500 italic line-clamp-1" title={`Ghi chú: ${row.notes}`}>
              📝 {row.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Phương tiện & Thiết bị',
      width: '120px',
      render: (row) => (
        <div className="text-xs space-y-0.5 max-w-[115px]">
          <div className={`font-bold flex items-center gap-1.5 ${(!row.machineCode || row.machineCode === 'CHUA_GAN') ? 'text-red-700' : 'text-slate-900'}`}>
            <Wrench className={`h-3.5 w-3.5 shrink-0 ${(!row.machineCode || row.machineCode === 'CHUA_GAN') ? 'text-red-500' : 'text-amber-600'}`} />
            <span className="truncate">{row.machineCode && row.machineCode !== 'CHUA_GAN' ? row.machineCode : 'Chưa gán máy'}</span>
          </div>
          {row.machineName && row.machineCode !== 'CHUA_GAN' && (
            <div className="text-[10px] text-slate-500 truncate" title={row.machineName}>
              {row.machineName}
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
          <div className={`font-bold flex items-center gap-1 ${(!row.operatorName || row.operatorName.includes('Chưa')) ? 'text-red-700' : 'text-slate-800'}`}>
            <User className={`h-3.5 w-3.5 shrink-0 ${(!row.operatorName || row.operatorName.includes('Chưa')) ? 'text-red-500' : 'text-slate-400'}`} />
            <span className="truncate">{row.operatorName || 'Chưa gán thợ máy'}</span>
          </div>
          {row.operatorPhone && (
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              📞 {row.operatorPhone}
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
            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium text-slate-700 leading-snug">Bãi máy Công trình</span>
          </div>
          <div className="text-xs font-bold text-slate-900 pl-4.5 leading-snug break-words">
            ➔ {row.locationDetails || 'Khu vực công trường thi công'}
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
          {(!row.machineCode || row.machineCode === 'CHUA_GAN' || !row.operatorName || row.operatorName.includes('Chưa')) && (
            <div className="flex flex-wrap gap-1">
              {(!row.machineCode || row.machineCode === 'CHUA_GAN') && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Thiếu máy</span>}
              {(!row.operatorName || row.operatorName.includes('Chưa')) && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Thiếu thợ máy</span>}
            </div>
          )}
          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Fuel className="h-3 w-3 text-slate-400 shrink-0" />
            <span>Định mức: <b>{row.plannedFuelLiters.toFixed(1)}L</b> ({row.fuelQuotaLitersPerHour}L/h)</span>
          </div>
          {row.actualWorkingHours !== undefined && row.actualWorkingHours > 0 && (
            <div className="text-[10px] text-emerald-700 font-bold">
              ⏱ Giờ máy: {row.actualWorkingHours}h / {row.plannedHours}h
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
          createdDate={row.workDate || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.workDate || '14-03-2026'}
          updatedUser="admin"
          title={`Ca máy: ${row.code}`}
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
            onClick={() => handleOpenShift(row)}
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-800 transition-colors border border-amber-200"
            title="Điều động ca máy / Chi tiết"
          >
            <HardHat className="w-3.5 h-3.5" />
          </button>
          <TableRowActions
            onView={() => handleOpenShift(row)}
            onEdit={() => handleOpenShift(row)}
            onDelete={() => {
              if (window.confirm(`Xác nhận xóa ca máy ${row.code}?`)) {
                setShifts((prev) => prev.filter((s) => s.id !== row.id));
              }
            }}
          />
        </div>
      ),
    },
  ];

  // BẢNG QUẢN LÝ CA MÁY ĐÃ HOÀN TẤT
  const completedColumns: Column<ConstructionShiftRecord>[] = [
    {
      key: 'code',
      title: 'Mã ca máy & Ca',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenShift(row)}
              className="font-mono font-bold text-primary hover:underline block text-left"
            >
              {row.code}
            </button>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Đã nghiệm thu
            </span>
          </div>
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
            {row.shiftType === 'CA_NGAY' ? 'Ca Ngày (07:00-17:00)' : 'Ca Đêm'} · {row.workDate}
          </span>
        </div>
      ),
    },
    {
      key: 'project',
      title: 'Công trình & Vị trí thi công',
      render: (row) => (
        <div className="space-y-1 max-w-[260px]">
          <div className="font-bold text-slate-900 text-xs truncate" title={row.projectName}>
            {row.projectName}
          </div>
          <div className="text-[11px] text-slate-600 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="truncate" title={row.locationDetails}>
              {row.locationDetails}
            </span>
          </div>
          <span className="inline-block text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
            {row.jobCategoryName}
          </span>
        </div>
      ),
    },
    {
      key: 'machine',
      title: 'Thiết bị & Thợ máy',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="font-mono text-xs text-amber-900 bg-amber-50 px-1 rounded border border-amber-200">
              {row.machineCode}
            </span>
            <span className="truncate max-w-[180px]" title={row.machineName}>
              {row.machineName}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 font-medium">
            Thợ máy: <b className="text-slate-800">{row.operatorName}</b> ({row.operatorPhone})
          </div>
        </div>
      ),
    },
    {
      key: 'hours',
      title: 'Giờ nổ máy thực tế',
      align: 'center',
      render: (row) => (
        <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-1.5">
          <div className="text-xs font-black text-slate-900">
            <span className="text-emerald-700">{row.actualWorkingHours ?? row.plannedHours} giờ</span>
            <span className="text-slate-400 font-normal"> / {row.plannedHours}h</span>
          </div>
          {row.actualIdlingHours !== undefined && (
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Chờ việc: {row.actualIdlingHours}h
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'volume',
      title: 'Khối lượng nghiệm thu',
      align: 'center',
      render: (row) => (
        <div className="text-center">
          <b className="text-emerald-700 text-xs font-black">
            {row.workVolumeActual ?? row.workVolumeTarget} {row.workVolumeUnit}
          </b>
          <span className="block text-[10px] text-slate-500">
            Đạt 100% định mức
          </span>
        </div>
      ),
    },
    {
      key: 'startTime',
      title: 'Thời gian bắt đầu',
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            {row.plannedStartTime || '07:00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {row.workDate}
          </div>
        </div>
      ),
    },
    {
      key: 'completedAt',
      title: 'Thời gian hoàn thành lúc nào',
      sortable: true,
      render: (row) => {
        const completedDate = row.completedAt ? new Date(row.completedAt) : null;
        const timeStr = completedDate
          ? completedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : '16:30';
        const dateStr = completedDate
          ? completedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : row.workDate;

        return (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-2 text-xs space-y-1 shadow-2xs">
            <div className="flex items-center gap-1 font-bold text-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-black text-emerald-800">
                {timeStr}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                · {dateStr}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1 pl-5">
              <span>⏱ Đã chạy: <b>{row.actualWorkingHours || row.plannedHours} giờ máy</b></span>
              <span className="text-emerald-600">· Nghiệm thu đủ</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'fuel',
      title: 'Dầu tiêu hao',
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5 text-purple-600" />
            <span>{row.actualFuelLiters ? row.actualFuelLiters.toFixed(1) : row.plannedFuelLiters.toFixed(1)} Lít</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Định mức: {row.plannedFuelLiters.toFixed(1)} Lít ({row.fuelQuotaLitersPerHour}L/h)
          </div>
        </div>
      ),
    },
    {
      key: 'acceptance',
      title: 'Người ký nghiệm thu',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-900">
            {row.completedBy || 'Chỉ huy trưởng công trường'}
          </div>
          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
            {row.acceptanceRating || 'Đạt chuẩn kỹ thuật công trình'}
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
          createdDate={row.workDate || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.workDate || '14-03-2026'}
          updatedUser="admin"
          title={`Biên bản: ${row.code}`}
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
            onClick={() => handleOpenShift(row)}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border border-emerald-200"
            title="Biên bản nghiệm thu công trình"
          >
            <HardHat className="w-3.5 h-3.5" />
          </button>
          <TableRowActions
            onView={() => handleOpenShift(row)}
            onEdit={() => handleOpenShift(row)}
            onDelete={() => {
              if (window.confirm(`Xác nhận xóa hồ sơ ca máy ${row.code}?`)) {
                setShifts((prev) => prev.filter((s) => s.id !== row.id));
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">


      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Lệnh điều xe Công trình</h1>
      </div>

      {/* OVERDUE BANNER: Cảnh báo ca máy công trình quá hạn */}
      {computedOverdueSummary && (computedOverdueSummary.totalAttention > 0 || computedOverdueSummary.totalOverdue > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">
              {computedOverdueSummary.totalAttention} ca máy công trình chờ điều độ · {computedOverdueSummary.totalOverdue} ca máy trễ thi công
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {computedOverdueSummary.awaitingApproval} chưa duyệt · {computedOverdueSummary.missingVehicle} thiếu máy · {computedOverdueSummary.missingDriver} thiếu thợ máy · {computedOverdueSummary.lateAssigned} chờ thợ máy nhận · {computedOverdueSummary.lateAccepted} đã nhận nhưng chưa thi công.
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
      <DispatchCategoryTabs activeTab="CONG_TRINH" />

      {/* 4. KPI Summary Cards 8 nhóm chuẩn hóa 4x2 */}
      <KPIGrid cols={4}>
        {/* Hàng 1: Toàn bộ | Lệnh trễ phân công | Đôn đốc | Kế hoạch tuần tới */}
        <StatCard
          label={selectedDate === 'ALL' ? 'Tổng ca máy điều độ' : `Tổng ca máy (${selectedDate})`}
          value={statusCounts.ALL}
          icon={<HardHat className="h-5 w-5 text-blue-600" />}
          pillText="Toàn bộ"
          pillVariant="neutral"
          onClick={() => setStatusFilter('ALL')}
          className={statusFilter === 'ALL' ? 'ring-2 ring-blue-500/30 border-blue-500' : ''}
        />
        <StatCard
          label="Ca máy trễ do chưa phân công"
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
          label="Thợ máy chưa nhận ca thi công"
          value={statusCounts.DRIVER_PENDING}
          icon={<UserCheck className="h-5 w-5 text-amber-600" />}
          pillText="Đôn đốc"
          pillVariant="warning"
          onClick={() => setStatusFilter(statusFilter === 'DRIVER_PENDING' ? 'ALL' : 'DRIVER_PENDING')}
          className={statusFilter === 'DRIVER_PENDING' ? 'ring-2 ring-amber-500/30 border-amber-500' : ''}
        />
        <StatCard
          label="Chưa điều ca máy kế hoạch tuần sau"
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
          label="Chờ duyệt ca máy & thợ thi công"
          value={statusCounts.CHUA_PHAN_CONG}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          pillText="Chờ duyệt phân công"
          pillVariant="warning"
          onClick={() => setStatusFilter(statusFilter === 'CHUA_PHAN_CONG' ? 'ALL' : 'CHUA_PHAN_CONG')}
          className={statusFilter === 'CHUA_PHAN_CONG' ? 'ring-2 ring-amber-500/30 border-amber-500' : ''}
        />
        <StatCard
          label="Đã phân công máy & giao việc"
          value={statusCounts.DA_GIAO_VIEC}
          icon={<Send className="h-5 w-5 text-indigo-600" />}
          pillText="Đã phân công"
          pillVariant="neutral"
          onClick={() => setStatusFilter(statusFilter === 'DA_GIAO_VIEC' ? 'ALL' : 'DA_GIAO_VIEC')}
          className={statusFilter === 'DA_GIAO_VIEC' ? 'ring-2 ring-indigo-500/30 border-indigo-500' : ''}
        />
        <StatCard
          label="Máy đang thi công ngoài công trình"
          value={statusCounts.DANG_LAM_VIEC}
          icon={<Activity className="h-5 w-5 text-emerald-600" />}
          pillText="Đang vận hành"
          pillVariant="success"
          onClick={() => setStatusFilter(statusFilter === 'DANG_LAM_VIEC' ? 'ALL' : 'DANG_LAM_VIEC')}
          className={statusFilter === 'DANG_LAM_VIEC' ? 'ring-2 ring-emerald-500/30 border-emerald-500' : ''}
        />
        <StatCard
          label="Đã hoàn thành ca máy & nghiệm thu"
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
          {/* Cột 1: Mã ca máy / Từ khóa tìm kiếm */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Mã ca máy / Dự án / Vị trí
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã lệnh, vị trí..."
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

          {/* Cột 2: Hạng mục công trình */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Hạng mục công trình
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả hạng mục ({JOB_CATEGORIES.length})</option>
                {JOB_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cột 3: Máy / Thiết bị thi công */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Máy / Thiết bị thi công
            </label>
            <div className="relative">
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả máy ({availableMachines.length})</option>
                {availableMachines.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cột 4: Thợ máy / Lái xe */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Thợ máy / Lái xe
            </label>
            <div className="relative">
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-primary focus:outline-none transition-colors cursor-pointer truncate shadow-2xs"
              >
                <option value="ALL">Tất cả thợ máy ({availableOperators.length})</option>
                {availableOperators.map((op) => (
                  <option key={op} value={op}>
                    {op}
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

          {/* Cột 6: Ngày thi công */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Ngày thi công cụ thể
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
                setSelectedCategory('ALL');
                setSelectedMachine('ALL');
                setSelectedOperator('ALL');
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
              onClick={() => navigate('/lenh-dieu-xe/tao-moi?category=CONSTRUCTION')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-extrabold shadow-2xs transition-all cursor-pointer select-none active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Lập lệnh điều xe mới</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher<'table' | 'scheduler' | 'kanban'>
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: 'Bảng kê tổng hợp toàn bộ lệnh' },
            { value: 'scheduler', label: 'Scheduler lịch chạy theo xe' },
            { value: 'kanban', label: 'Kanban 4 nhóm trạng thái' },
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
              <option value="DRIVER_PENDING">Đôn đốc thợ máy ({statusCounts.DRIVER_PENDING})</option>
              <option value="FUTURE_UNASSIGNED">Kế hoạch tuần tới ({statusCounts.FUTURE_UNASSIGNED})</option>
              <option value="CHUA_PHAN_CONG">Chờ duyệt phân công ({statusCounts.CHUA_PHAN_CONG})</option>
              <option value="DA_GIAO_VIEC">Đã phân công ({statusCounts.DA_GIAO_VIEC})</option>
              <option value="DANG_LAM_VIEC">Đang vận hành ({statusCounts.DANG_LAM_VIEC})</option>
              <option value="COMPLETED">Nghiệm thu ({statusCounts.COMPLETED})</option>
              {statusCounts.TAM_DUNG > 0 && <option value="TAM_DUNG">Tạm dừng máy ({statusCounts.TAM_DUNG})</option>}
            </select>
          </div>
        )}
      </div>



      {view === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredShifts}
          onRowClick={handleOpenShift}
          useGlobalFilters={false}
        />
      ) : view === 'scheduler' ? (
        /* GIAO DIỆN SCHEDULER LỊCH CHẠY THEO XE / MÁY CÔNG TRÌNH 24 TIẾNG */
        <Vehicle24hScheduler
          title="Scheduler lịch ca máy Công trình 24h"
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          availableDates={availableDates}
          lanes={schedulerData.lanes}
          unassignedItems={schedulerData.unassigned}
          onItemClick={handleOpenShift}
          kind="CONSTRUCTION"
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          {CONSTRUCTION_BOARDS.map((board) => {
            const boardShifts = filteredShifts.filter((shift) => board.statuses.includes(shift.status));
            return (
              <section key={board.title} className="min-h-72 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                <h3 className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold text-slate-800">
                  <span>{board.title}</span><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px]">{boardShifts.length}</span>
                </h3>
                <div className="space-y-2.5">
                  {boardShifts.map((shift) => (
                    <button key={shift.id} type="button" onClick={() => handleOpenShift(shift)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs shadow-xs hover:border-primary hover:shadow-md">
                      <b className="font-mono text-primary">{shift.code}</b>
                      <h4 className="my-1.5 font-bold text-slate-900">{shift.projectName}</h4>
                      <p className="text-[11px] text-slate-600">{shift.machineCode} · {shift.operatorName}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{shift.locationDetails}</p>
                    </button>
                  ))}
                  {!boardShifts.length && <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">Không có ca máy</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* MODAL CHI TIẾT CA MÁY CÔNG TRÌNH */}
      <Modal
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title={`Chi tiết ca máy công trình: ${selectedShift?.code ?? ''}`}
        size="xl"
        hideFooter={true}
      >
        {selectedShift && (
          <div className="space-y-4 text-xs">
            {/* Header thông tin chính */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <b className="font-mono text-base text-primary font-extrabold">{selectedShift.code}</b>
                <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  {selectedShift.jobCategoryName}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                  {selectedShift.shiftType === 'CA_NGAY' ? 'Ca Ngày (06:00 - 18:00)' : 'Ca Đêm (18:00 - 06:00)'}
                </span>
                <StatusBadge status={selectedShift.status} />
              </div>
              <Button size="sm" variant="outline" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>
                In phiếu giao ca máy
              </Button>
            </div>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3 border border-slate-200">
              <div>
                <span className="text-slate-500 block font-medium">Thiết bị máy</span>
                <b className="text-slate-900 text-sm">{selectedShift.machineName}</b>
                <span className="block text-[11px] font-mono font-bold text-amber-800">
                  Mã tài sản: {selectedShift.machineCode}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Thợ máy phụ trách</span>
                <b className="text-slate-900 text-sm">{selectedShift.operatorName}</b>
                <span className="block text-[11px] text-slate-500">SĐT: {selectedShift.operatorPhone}</span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Thời gian thi công</span>
                <b className="text-slate-900 text-sm">
                  {selectedShift.shiftType === 'CA_NGAY' ? 'Ca Ngày' : 'Ca Đêm'} · {selectedShift.workDate}
                </b>
                {selectedShift.plannedStartTime && (
                  <span className="block text-[11px] text-slate-500">
                    Bắt đầu: {new Date(selectedShift.plannedStartTime).toLocaleString('vi-VN')} · {selectedShift.plannedHours} giờ
                  </span>
                )}
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 block font-medium">Hạng mục & Vị trí công trình</span>
                <b className="text-slate-900 text-xs block">{selectedShift.projectName}</b>
                <span className="text-slate-600 block text-[11px] mt-0.5">
                  Vị trí: {selectedShift.locationDetails}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Khối lượng công việc</span>
                <b className="text-emerald-800 text-sm">
                  Kế hoạch: {selectedShift.workVolumeTarget} {selectedShift.workVolumeUnit}
                </b>
                {selectedShift.workVolumeActual !== undefined && (
                  <span className="block text-emerald-700 font-bold text-[11px]">
                    Thực tế: {selectedShift.workVolumeActual} {selectedShift.workVolumeUnit}
                  </span>
                )}
              </div>
            </div>

            {/* Chi tiết đo lường Giờ máy & Nhiên liệu */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-primary" />
                Kiểm soát Giờ máy hoạt động & Định mức tiêu hao Lít/Giờ
              </h4>

              <div className="grid gap-3 sm:grid-cols-4 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-slate-500 text-[10px] block">Giờ máy kế hoạch</span>
                  <b className="text-slate-900 text-base">{selectedShift.plannedHours}h</b>
                </div>

                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                  <span className="text-emerald-700 text-[10px] block">Giờ làm việc thực tế</span>
                  <b className="text-emerald-900 text-base">
                    {selectedShift.actualWorkingHours !== undefined ? `${selectedShift.actualWorkingHours}h` : '—'}
                  </b>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                  <span className="text-amber-700 text-[10px] block">Giờ nổ máy không tải</span>
                  <b className="text-amber-900 text-base">
                    {selectedShift.actualIdlingHours !== undefined ? `${selectedShift.actualIdlingHours}h` : '—'}
                  </b>
                </div>

                <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-center">
                  <span className="text-purple-700 text-[10px] block">Định mức nhiên liệu</span>
                  <b className="text-purple-900 text-base">{selectedShift.fuelQuotaLitersPerHour} Lít/h</b>
                </div>
              </div>

              {selectedShift.notes && (
                <div className="pt-2 border-t border-slate-100 text-slate-600 text-xs">
                  <b>Ghi chú ca máy:</b> {selectedShift.notes}
                </div>
              )}
            </div>

            <WorkflowActionPanel
              key={selectedShift.id}
              kind="CONSTRUCTION"
              step={workflowStep(selectedShift.status)}
              taskName={`${selectedShift.jobCategoryName} ${selectedShift.projectName}`}
              vehicleCode={selectedShift.status === 'CHO_DUYET' ? undefined : selectedShift.machineCode}
              driverName={selectedShift.status === 'CHO_DUYET' ? undefined : selectedShift.operatorName}
              currentOrderId={selectedShift.id}
              existingOrders={shifts}
              initialStartTime={selectedShift.plannedStartTime || `${selectedShift.workDate}T07:00:00`}
              initialDurationHours={selectedShift.plannedHours}
              unit="BAN_CO_GIOI"
              complexCode={(selectedShift as any).complexCode || 'KOUN_MOM'}
              onApprove={async (vehicle, driver, schedule, implement) => {
                try {
                  const orderId = Number(selectedShift.id);
                  if (!Number.isInteger(orderId) || orderId <= 0) throw new Error('Lệnh công trình không có ID hợp lệ.');
                  await operationsApi.assignDispatch(orderId, {
                    vehicleId: vehicle.id,
                    driverId: driver.id,
                    ...(typeof implement?.id === 'number' && implement.id < 90_000 ? { implementId: implement.id } : {}),
                    departureTime: schedule.startTime,
                    plannedEndTime: schedule.endTime,
                  });
                  updateShift(selectedShift.id, {
                    status: 'DA_DUYET',
                    machineCode: vehicle.code,
                    machineName: vehicle.name,
                    operatorName: driver.name,
                    plannedStartTime: schedule.startTime,
                    workDate: schedule.startTime.slice(0, 10),
                    plannedHours: schedule.durationHours,
                    plannedFuelLiters: schedule.durationHours * selectedShift.fuelQuotaLitersPerHour,
                    notes: implement ? `${selectedShift.notes ? selectedShift.notes + ' | ' : ''}Đầu công tác: ${implement.name}` : selectedShift.notes,
                  });
                  useAppStore.getState().setHeaderAlert({ type: 'success', message: `Đã phê duyệt và phân công ${vehicle.code} cho lệnh ${selectedShift.code}.` });
                } catch (error: any) {
                  const body = error?.response?.data;
                  const reasons = body?.message?.reasons ?? body?.reasons;
                  const message = Array.isArray(reasons) ? reasons.map((item: any) => item.message).filter(Boolean).join('; ') : typeof body?.message === 'string' ? body.message : error?.message;
                  useAppStore.getState().setHeaderAlert({ type: 'error', message: `Phân công thất bại: ${message || 'Không thể phân công lệnh công trình.'}` });
                }
              }}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedShift(null)}>
                Đóng
              </Button>
              <Button onClick={() => window.print()}>In phiếu ca máy</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TẠO CA MÁY MỚI */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Lập phiếu điều độ Ca máy công trình mới"
        size="lg"
        hideFooter={true}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block font-bold text-slate-700">Mã ca máy</span>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono font-bold focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Ngày thi công</span>
              <input
                type="date"
                value={formData.workDate}
                onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Ca làm việc</span>
              <select
                value={formData.shiftType}
                onChange={(e) => setFormData({ ...formData, shiftType: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold focus:border-primary focus:outline-none"
              >
                <option value="CA_NGAY">Ca Ngày (07:00 - 17:00)</option>
                <option value="CA_DEM">Ca Đêm (18:00 - 04:00)</option>
              </select>
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-700">Công trình / Hạng mục thi công</span>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                required
                placeholder="VD: Tuyến đường trục chính Nông trường 2..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Hạng mục công việc</span>
              <select
                value={formData.jobCategory}
                onChange={(e) => {
                  const cat = JOB_CATEGORIES.find((c) => c.value === e.target.value);
                  setFormData({
                    ...formData,
                    jobCategory: e.target.value,
                    workVolumeUnit: (cat?.unit as any) || 'm³',
                    fuelQuotaLitersPerHour: cat?.defaultQuota || formData.fuelQuotaLitersPerHour,
                  });
                }}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold focus:border-primary focus:outline-none"
              >
                {JOB_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="sm:col-span-3">
              <span className="mb-1 block font-bold text-slate-700">Vị trí thi công chi tiết (Km / Lô / Tuyến)</span>
              <input
                type="text"
                value={formData.locationDetails}
                onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
                required
                placeholder="VD: Km 2+300 ➔ Km 4+100, Đoạn qua Lô B04 - B08..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
              />
            </label>

            <div className="sm:col-span-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              Thiết bị và người vận hành chưa gán ở bước lập ca. Admin sẽ duyệt và chọn từ database; hệ thống chỉ hiển thị máy đúng nhóm công việc cùng tài xế có chứng chỉ và trạng thái sẵn sàng.
            </div>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Giờ máy kế hoạch (Hours)</span>
              <input
                type="number"
                step="0.5"
                value={formData.plannedHours}
                onChange={(e) => setFormData({ ...formData, plannedHours: Number(e.target.value) })}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-right focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">Định mức dầu (Lít/Giờ máy)</span>
              <input
                type="number"
                step="0.5"
                value={formData.fuelQuotaLitersPerHour}
                onChange={(e) => setFormData({ ...formData, fuelQuotaLitersPerHour: Number(e.target.value) })}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-right focus:border-primary focus:outline-none"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold text-slate-700">
                Khối lượng mục tiêu ({formData.workVolumeUnit})
              </span>
              <input
                type="number"
                step="0.1"
                value={formData.workVolumeTarget}
                onChange={(e) => setFormData({ ...formData, workVolumeTarget: Number(e.target.value) })}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-right focus:border-primary focus:outline-none"
              />
            </label>

            <label className="sm:col-span-3">
              <span className="mb-1 block font-bold text-slate-700">Ghi chú & Yêu cầu kỹ thuật thi công</span>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="VD: San gạt độ dốc thoát nước, lu lèn đạt chuẩn K95..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Hủy bỏ
            </Button>
            <Button type="submit">Lập ca máy</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
