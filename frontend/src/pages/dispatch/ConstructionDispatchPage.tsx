import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
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
import { SosRescueModal } from '../../components/dispatch/SosRescueModal';
import { WorkflowActionPanel, type DemoWorkflowStep } from '../../components/dispatch/WorkflowActionPanel';
import { Vehicle24hScheduler, type SchedulerLane, type SchedulerItem } from '../../components/dispatch/Vehicle24hScheduler';
import { useAppStore } from '../../store/useAppStore';
import { matchesKLH } from '../../utils/filterUtils';
import { getWeeksOfYear, getWeekNumber } from './ProductionPlanPage';
import { DAYS_OF_WEEK } from './CreateProductionPlanPage';
import { syncAllApprovedSpecializedPlans } from './specializedPlanSync';

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
  const globalKLH = useAppStore((state) => state.selectedKLH);

  const [shifts, setShifts] = useState<ConstructionShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await operationsApi.dispatchOrders({ limit: 1000 });
      if (res?.items) {
        const ctList: ConstructionShiftRecord[] = res.items
          .filter((item: any) =>
            item.vehicle?.assetGroup === 'MAY_CONG_TRINH' ||
            item.code?.startsWith('LC-') ||
            item.code?.startsWith('LCM-') ||
            item.code?.startsWith('CM-') ||
            item.code?.startsWith('LDX-CT-') ||
            item.orderCategory === 'CONG_TRINH'
          )
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

            return {
              id: String(item.id),
              code: item.code,
              workDate: dateStr,
              plannedStartTime: timeStr,
              shiftType: 'CA_NGAY' as const,
              complexCode: item.unit || 'KOUN_MOM',
              complexName: item.unit === 'NT1' ? 'Nông trường 1' : item.unit || 'Khu liên hợp',
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
            };
          });

        // Tự động quét và đồng bộ các kế hoạch chuyên dùng đã duyệt nếu có
        try {
          syncAllApprovedSpecializedPlans();
        } catch {}

        // Nạp thêm các lệnh công trình được sinh từ kế hoạch chuyên dùng trong localStorage nếu chưa có
        try {
          const storedMasterRaw = localStorage.getItem('thaco_all_dispatch_orders_master_v4');
          if (storedMasterRaw) {
            const storedOrders = JSON.parse(storedMasterRaw);
            if (Array.isArray(storedOrders)) {
              storedOrders
                .filter((so: any) => so.orderCategory === 'CONG_TRINH' || so.code?.startsWith('LDX-CT-'))
                .forEach((so: any) => {
                  if (!ctList.some((c) => c.code === so.code)) {
                    const dateStr = so.departureTime ? so.departureTime.slice(0, 10) : '2026-09-09';
                    const timeStr = so.departureTime ? so.departureTime.slice(11, 16) : '07:00';
                    ctList.push({
                      id: String(so.id),
                      code: so.code,
                      workDate: dateStr,
                      plannedStartTime: timeStr,
                      shiftType: 'CA_NGAY',
                      complexCode: so.complexCode || 'KOUN_MOM',
                      complexName: so.complexName || so.unit || 'Khu liên hợp',
                      projectName: so.purpose || 'Thi công công trình ca máy',
                      locationDetails: `${so.origin || ''} ➔ ${so.destination || ''}`.trim() || 'Công trường',
                      jobCategory: 'SAN_GAT_DUONG',
                      jobCategoryName: so.purpose || 'San gạt bù vê nền đường',
                      machineCode: so.vehicle?.code || 'MAY-CT-01',
                      machineName: so.vehicle?.name || 'Máy công trình',
                      machineType: 'Máy công trình',
                      operatorName: so.operatorName || 'Chưa phân công thợ máy',
                      operatorPhone: '',
                      plannedHours: 8.0,
                      fuelQuotaLitersPerHour: 14.5,
                      plannedFuelLiters: 116,
                      workVolumeTarget: so.workVolumeTarget || 450,
                      workVolumeUnit: 'm³',
                      status: 'CHO_DUYET',
                      notes: so.notes,
                    });
                  }
                });
            }
          }
        } catch {}

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
  const [view, setView] = useState<'table' | 'scheduler' | 'kanban' | 'completed'>('table');

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
  const [showSosModal, setShowSosModal] = useState(false);

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
    return {
      ALL: base.length,
      CHO_DUYET: base.filter((s) => s.status === 'CHO_DUYET').length,
      DA_DUYET: base.filter((s) => s.status === 'DA_DUYET').length,
      WORKING: base.filter((s) => ['DA_NHAN', 'DANG_THI_CONG', 'TAM_DUNG'].includes(s.status)).length,
      COMPLETED: base.filter((s) => s.status === 'HOAN_THANH').length,
      TAM_DUNG: base.filter((s) => s.status === 'TAM_DUNG').length,
    };
  }, [shifts, selectedCategory, selectedMachine, selectedWeek, availableWeeks, selectedDate, globalKLH]);

  const completedShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;
      return s.status === 'HOAN_THANH';
    });
  }, [shifts, globalKLH]);

  useEffect(() => {
    try {
      localStorage.setItem('thaco_construction_shifts_v1', JSON.stringify(shifts));
    } catch {}
  }, [shifts]);

  const updateShift = (id: string, patch: Partial<ConstructionShiftRecord>) => {
    setShifts((current) => current.map((shift) => shift.id === id ? { ...shift, ...patch } : shift));
    setSelectedShift((current) => current?.id === id ? { ...current, ...patch } : current);
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

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      // Lọc theo Khu liên hợp từ Header
      if (globalKLH && globalKLH !== 'ALL' && !matchesKLH(s, globalKLH)) return false;

      // Lọc theo từ khóa tìm kiếm
      if (search) {
        const q = search.toLowerCase();
        const matchCode = s.code.toLowerCase().includes(q);
        const matchProject = s.projectName.toLowerCase().includes(q);
        const matchLocation = s.locationDetails.toLowerCase().includes(q);
        const matchMachine = s.machineName.toLowerCase().includes(q) || s.machineCode.toLowerCase().includes(q);
        const matchOperator = s.operatorName.toLowerCase().includes(q);
        if (!matchCode && !matchProject && !matchLocation && !matchMachine && !matchOperator) return false;
      }

      // Lọc theo Hạng mục
      if (selectedCategory !== 'ALL' && s.jobCategory !== selectedCategory) return false;

      // Lọc theo Máy
      if (selectedMachine !== 'ALL' && s.machineCode !== selectedMachine) return false;

      // Lọc theo Tuần (selectedWeek)
      if (selectedWeek !== 'ALL') {
        const weekObj = availableWeeks.find((w) => w.weekNumber === selectedWeek);
        if (weekObj) {
          const start = weekObj.startDateKey;
          const end = weekObj.endDateKey;
          if (s.workDate < start || s.workDate > end) return false;
        }
      }

      // Lọc theo Ngày (Mặc định hôm nay hoặc Cả tuần)
      if (selectedDate !== 'ALL' && s.workDate !== selectedDate) return false;

      // Lọc theo 4 trạng thái chuẩn hóa
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CHO_DUYET') {
          if (s.status !== 'CHO_DUYET') return false;
        } else if (statusFilter === 'DA_DUYET') {
          if (s.status !== 'DA_DUYET') return false;
        } else if (statusFilter === 'WORKING') {
          if (!['DA_NHAN', 'DANG_THI_CONG', 'TAM_DUNG'].includes(s.status)) return false;
        } else if (statusFilter === 'COMPLETED') {
          if (s.status !== 'HOAN_THANH') return false;
        } else if (statusFilter === 'TAM_DUNG') {
          if (s.status !== 'TAM_DUNG') return false;
        }
      }

      return true;
    });
  }, [shifts, search, selectedCategory, selectedMachine, selectedWeek, availableWeeks, selectedDate, statusFilter, globalKLH]);

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
        sourceType: 'MANUAL',
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
      title: 'Mã ca máy & Ca',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelectedShift(row)}
            className="font-mono font-bold text-primary hover:underline block text-left"
          >
            {row.code}
          </button>
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
            {row.shiftType === 'CA_NGAY' ? 'Ca Ngày (07:00-17:00)' : 'Ca Đêm'} · {row.workDate}
          </span>
        </div>
      ),
    },
    {
      key: 'machine',
      title: 'Thiết bị máy & Thợ máy',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="font-mono text-xs text-amber-900 bg-amber-50 px-1 rounded border border-amber-200">
              {row.machineCode}
            </span>
            <span className="truncate max-w-[200px]" title={row.machineName}>
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
      key: 'project',
      title: 'Hạng mục thi công & Tuyến đường / mương',
      render: (row) => (
        <div className="space-y-1 max-w-[280px]">
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
      key: 'hours',
      title: 'Giờ máy (Engine Hours)',
      sortable: true,
      align: 'center',
      render: (row) => (
        <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-1.5">
          <div className="text-xs font-black text-slate-900">
            {row.actualWorkingHours !== undefined ? (
              <>
                <span className="text-emerald-700">{row.actualWorkingHours}h</span>
                <span className="text-slate-400 font-normal"> / {row.plannedHours}h</span>
              </>
            ) : (
              <span>{row.plannedHours}h</span>
            )}
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
      key: 'fuel',
      title: 'Định mức & Dầu (Lít/h)',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-xs text-slate-900 flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5 text-amber-500" />
            <span>{row.fuelQuotaLitersPerHour} Lít/giờ</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Dự kiến: <b className="text-slate-800">{row.plannedFuelLiters.toFixed(1)} Lít</b>
            {row.actualFuelLiters !== undefined && (
              <span className="text-slate-700 block text-[10px]">
                Thực tế: {row.actualFuelLiters.toFixed(1)} Lít
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'volume',
      title: 'Khối lượng công việc',
      align: 'center',
      render: (row) => (
        <div className="text-center">
          <b className="text-slate-900 text-xs">
            {row.workVolumeTarget} {row.workVolumeUnit}
          </b>
          {row.workVolumeActual !== undefined && (
            <span className="block text-[10px] text-emerald-700 font-bold">
              Đạt: {row.workVolumeActual} {row.workVolumeUnit}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => (
        <div className="space-y-1">
          <span
            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              ['DA_NHAN', 'DANG_THI_CONG'].includes(row.status)
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : row.status === 'HOAN_THANH'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : row.status === 'DA_DUYET'
                ? 'bg-purple-50 text-purple-800 border-purple-200'
                : row.status === 'TAM_DUNG'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {row.status === 'DANG_THI_CONG'
              ? 'Đang thi công'
              : row.status === 'DA_NHAN'
              ? 'Đã nhận việc'
              : row.status === 'DA_DUYET'
              ? 'Đã duyệt & phân công'
              : row.status === 'HOAN_THANH'
              ? 'Đã hoàn thành'
              : row.status === 'TAM_DUNG'
              ? 'Tạm dừng máy'
              : 'Chờ duyệt ca'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedShift(row)}>
          Chi tiết
        </Button>
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
              onClick={() => setSelectedShift(row)}
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
      key: 'actions',
      title: 'Thao tác',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedShift(row)}>
          Biên bản
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">


      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Lệnh điều xe Công trình</h1>
          <p className="text-xs text-slate-500">
            Chuyên trách máy ủi, máy xúc đào, máy san gạt, lu rung theo Tuyến đường nội đồng, Mương thoát nước & Giờ máy (Lít/h).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            Xuất báo cáo ca máy
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            Lập ca máy mới
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã ca, công trình, vị trí, thợ máy, thiết bị..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
          >
            <option value="ALL">Tất cả hạng mục công trình</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
          >
            <option value="ALL">Tất cả thiết bị máy</option>
            {MACHINES.map((m) => (
              <option key={m.code} value={m.code}>
                [{m.code}] {m.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CHO_DUYET">Chờ duyệt / Phân công</option>
            <option value="DA_DUYET">Đã giao xe / Tiếp nhận</option>
            <option value="WORKING">Đang vận hành / Thi công</option>
            <option value="COMPLETED">Hoàn tất & Nghiệm thu</option>
            <option value="TAM_DUNG">Tạm dừng máy</option>
          </select>

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
              selectedDate === toDateString(new Date()) && selectedWeek === getWeekNumber(new Date())
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Xem tất cả các ca máy của ngày hôm nay"
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

        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
          Tổng cộng: {filteredShifts.length} ca máy
        </span>

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
          label={selectedDate === 'ALL' ? 'Tổng ca máy điều độ' : `Ca máy trong ngày (${selectedDate})`}
          value={filteredShifts.length}
          icon={<HardHat className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          label="Tổng giờ máy kế hoạch"
          value={`${totalPlannedHours.toFixed(1)} giờ`}
          icon={<Clock className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Giờ máy thực tế đã chạy"
          value={`${totalWorkingHours.toFixed(1)} giờ`}
          icon={<Activity className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Dự toán tiêu hao nhiên liệu"
          value={`${totalFuelPlanned.toFixed(0)} Lít`}
          icon={<Fuel className="h-5 w-5 text-purple-600" />}
        />
      </KPIGrid>

      <ViewSwitcher<'table' | 'scheduler' | 'kanban' | 'completed'>
        value={view}
        onChange={setView}
        options={[
          { value: 'table', label: 'Bảng kê ca máy chuẩn hóa' },
          { value: 'scheduler', label: 'Scheduler lịch chạy theo xe' },
          { value: 'kanban', label: 'Kanban 4 nhóm trạng thái' },
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

          {/* Hàng phụ: Nút Tất cả trạng thái + Tạm dừng máy */}
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
                  (Đang lọc trạng thái ca máy • Bấm lại vào thẻ hoặc nút <b>Tất cả trạng thái</b> để xem toàn bộ)
                </span>
              )}
            </div>

            {statusCounts.TAM_DUNG > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'TAM_DUNG' ? 'ALL' : 'TAM_DUNG')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'TAM_DUNG'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span>Tạm dừng máy ({statusCounts.TAM_DUNG})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredShifts}
          onRowClick={setSelectedShift}
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
          onItemClick={setSelectedShift}
          kind="CONSTRUCTION"
        />
      ) : view === 'kanban' ? (
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
                    <button key={shift.id} type="button" onClick={() => setSelectedShift(shift)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs shadow-xs hover:border-primary hover:shadow-md">
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
      ) : (
        /* GIAO DIỆN QUẢN LÝ CÁC VIỆC ĐÃ HOÀN TẤT */
        <div className="space-y-4">
          {/* Thẻ KPI hoàn tất ca máy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-emerald-800">Ca máy đã hoàn thành</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-950">{completedShifts.length}</span>
                <span className="text-xs font-semibold text-emerald-600">ca máy</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">100% nghiệm thu hiện trường đạt chuẩn</span>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-blue-800">Tổng giờ máy thực tế</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-950">
                  {completedShifts.reduce((sum, s) => sum + (s.actualWorkingHours || s.plannedHours), 0).toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-blue-600">giờ máy</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Nổ máy làm việc hiệu quả</span>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-purple-800">Dầu thực tế tiêu hao</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-purple-950">
                  {completedShifts.reduce((sum, s) => sum + (s.actualFuelLiters || s.plannedFuelLiters), 0).toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-purple-600">Lít dầu</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Tiêu hao đúng định mức định mức (Lít/h)</span>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
              <span className="text-xs font-bold text-amber-800">Khối lượng nghiệm thu</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-950">
                  {completedShifts.reduce((sum, s) => sum + (s.workVolumeActual || s.workVolumeTarget), 0).toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-amber-700">km / m³</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Biên bản nghiệm thu kỹ thuật bàn giao</span>
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
                    Bảng kê chi tiết ca máy công trình đã hoàn tất & Thời gian kết thúc
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ghi nhận đầy đủ thiết bị máy, thợ máy vận hành, giờ máy nổ thực tế, khối lượng và thời điểm nghiệm thu
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                {completedShifts.length} ca hoàn tất
              </span>
            </div>

            <DataTable
              columns={completedColumns}
              data={completedShifts}
              onRowClick={setSelectedShift}
              useGlobalFilters={false}
            />
          </div>
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
              onApprove={(vehicle, driver, schedule, implement) => updateShift(selectedShift.id, {
                status: 'DA_DUYET',
                machineCode: vehicle.code,
                machineName: vehicle.name,
                operatorName: driver.name,
                plannedStartTime: schedule.startTime,
                workDate: schedule.startTime.slice(0, 10),
                plannedHours: schedule.durationHours,
                plannedFuelLiters: schedule.durationHours * selectedShift.fuelQuotaLitersPerHour,
                notes: implement ? `${selectedShift.notes ? selectedShift.notes + ' | ' : ''}Đầu công tác: ${implement.name}` : selectedShift.notes,
              })}
              onReceive={() => updateShift(selectedShift.id, { status: 'DA_NHAN' })}
              onComplete={() => updateShift(selectedShift.id, {
                status: 'HOAN_THANH',
                actualWorkingHours: selectedShift.actualWorkingHours || selectedShift.plannedHours,
                workVolumeActual: selectedShift.workVolumeActual || selectedShift.workVolumeTarget,
              })}
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

      {/* SOS Rescue Modal */}
      <SosRescueModal
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
      />
    </div>
  );
};
