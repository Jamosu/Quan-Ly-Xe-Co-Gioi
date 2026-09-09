import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  HardHat,
  Layers,
  ListPlus,
  Lock,
  MapPin,
  Package,
  Pen,
  Plus,
  RotateCcw,
  Search,
  Send,
  Tractor,
  Trash2,
  TrendingUp,
  Truck,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { SosRescueModal } from '../../components/dispatch/SosRescueModal';
import { useAppStore } from '../../store/useAppStore';
import { matchesKLH } from '../../utils/filterUtils';
import type { TransportOrderRecord } from '../../types';
import { getStoredJobs } from '../../data/jobCatalogData';
import { getStoredConstructionSites, getStoredTransportRoutes } from '../../data/locationCatalogData';
import {
  getMonday,
  getWeekNumber,
  toDateKey,
  getWeeksOfYear,
} from './ProductionPlanPage';
import { syncAllApprovedSpecializedPlans } from './specializedPlanSync';

export type SpecializedPlanKind = 'CONSTRUCTION' | 'TRANSPORT';
export type SpecializedPlanStatus = 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface SpecializedTaskItem {
  id: string;
  jobCode: string;
  jobName: string;
  category?: string;
  location: string;
  origin?: string;
  destination?: string;
  machineType: string;
  operatorName?: string;
  operatorPhone?: string;
  durationHours: number; // Construction: Giờ máy; Transport: Thời lượng chạy
  targetQuantity: number;
  targetUnit: string;
  assignedVehiclesCount: number;
  scheduledDays: string; // VD: 'Thứ 2 - Thứ 4', 'Thứ 4 - Thứ 6', 'Cả tuần'
  notes?: string;
  status: 'PENDING' | 'DISPATCHED' | 'COMPLETED';
}

export interface SpecializedWeeklyPlan {
  id: string;
  code: string;
  title: string;
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
  complexName: string;
  enterpriseName?: string;
  farmName?: string;
  categoryCode: string;
  categoryName: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  status: SpecializedPlanStatus;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  tasks: SpecializedTaskItem[];
}

const KLH_OPTIONS = [
  { code: 'ALL', name: 'Tất cả Khu liên hợp' },
  { code: 'KOUN_MOM', name: 'Khu liên hợp Koun Mom' },
  { code: 'SNOUL', name: 'Khu liên hợp Snoul' },
  { code: 'NAM_LAO', name: 'Khu liên hợp Nam Lào' },
];

const CONSTRUCTION_CATEGORIES = [
  { code: 'ALL', name: 'Tất cả hạng mục công trình' },
  { code: 'SAN_GAT', name: 'San gạt & Lu lèn nền đường' },
  { code: 'DAO_MUONG', name: 'Nạo vét & Đào mương' },
  { code: 'DAO_HO', name: 'Đào hố móng & Hồ chứa nước' },
  { code: 'MAT_BANG', name: 'Cải tạo mặt bằng & Bãi tập kết' },
  { code: 'DE_BAO', name: 'Đắp bờ bao & Đê ngăn lũ' },
  { code: 'KHAC', name: 'Hạng mục khác' },
];

const TRANSPORT_CATEGORIES = [
  { code: 'ALL', name: 'Tất cả loại hàng vận chuyển' },
  { code: 'NHIEN_LIEU', name: 'Nhiên liệu & Nước sinh hoạt' },
  { code: 'NONG_SAN', name: 'Chuối & Nông sản xuất khẩu' },
  { code: 'PHAN_BON', name: 'Phân bón & Vật tư nông nghiệp' },
  { code: 'THIET_BI', name: 'Nông cụ, Phụ tùng & Ống tưới' },
  { code: 'KHAC', name: 'Hàng hóa khác' },
];

// Dữ liệu khởi tạo chuẩn cho Kế hoạch Công trình Tuần 37
export const INITIAL_CONSTRUCTION_PLANS: SpecializedWeeklyPlan[] = [
  {
    id: 'PLAN-CT-2026-W37',
    code: 'KH-CT-2026-W37',
    title: 'Kế hoạch cơ giới thi công công trình Tuần 37 (2026)',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Cơ giới Công trình',
    farmName: 'Đội xe công trình Koun Mom',
    categoryCode: 'SAN_GAT',
    categoryName: 'San gạt & Lu lèn nền đường',
    weekNumber: 37,
    year: 2026,
    startDate: '2026-09-07T00:00:00.000Z',
    endDate: '2026-09-13T23:59:59.000Z',
    status: 'APPROVED',
    notes: 'Kế hoạch thi công duy tu hệ thống đường giao thông nội đồng và mương thoát nước phân khu chuối',
    createdAt: '2026-09-07T08:00:00.000Z',
    createdBy: 'Nguyễn Ngọc Anh Tú',
    tasks: [
      {
        id: '1',
        jobCode: 'DAO_MUONG',
        jobName: 'Đào và nạo vét bùn mương thoát nước chính',
        location: 'Lô CN-A12 (Thửa 03)',
        machineType: 'Máy xúc đào bánh xích',
        scheduledDays: 'Thứ 2',
        assignedVehiclesCount: 1,
        durationHours: 8,
        targetQuantity: 450,
        targetUnit: 'm³',
        status: 'DISPATCHED',
        notes: 'Máy đào gàu 1.2m3 thi công nạo vét bùn đất',
      },
      {
        id: '2',
        jobCode: 'SAN_GAT',
        jobName: 'Rải cấp phối đá dăm và đầm nén đường trục',
        location: 'Đường trục chính nội đồng',
        machineType: 'Máy san gạt & Máy lu',
        scheduledDays: 'Thứ 4 - Chủ Nhật',
        assignedVehiclesCount: 1,
        durationHours: 40,
        targetQuantity: 1200,
        targetUnit: 'm³',
        status: 'DISPATCHED',
        notes: 'San gạt và đầm nén 5 ngày liên tục',
      },
      {
        id: '3',
        jobCode: 'DE_BAO',
        jobName: 'Đắp bờ bao ngăn lũ và đê ngăn nước tràn',
        location: 'Bờ bao phân khu phía Tây',
        machineType: 'Máy ủi & Máy đào',
        scheduledDays: 'Thứ 4 - Chủ Nhật',
        assignedVehiclesCount: 1,
        durationHours: 40,
        targetQuantity: 800,
        targetUnit: 'm³',
        status: 'DISPATCHED',
        notes: 'Gia cố bờ bao ngăn lũ cho lô chuối mới trồng',
      },
    ],
  },
];

// Dữ liệu khởi tạo chuẩn cho Kế hoạch Vận chuyển nội bộ Tuần 37
export const INITIAL_TRANSPORT_PLANS: SpecializedWeeklyPlan[] = [
  {
    id: 'PLAN-VC-2026-W37',
    code: 'KH-VC-2026-W37',
    title: 'Kế hoạch vận tải & chuyển hàng nội bộ Tuần 37 (2026)',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Đội Vận tải Cơ giới',
    farmName: 'Đội vận chuyển nội bộ',
    categoryCode: 'NHIEN_LIEU',
    categoryName: 'Nhiên liệu & Nước sinh hoạt',
    weekNumber: 37,
    year: 2026,
    startDate: '2026-09-07T00:00:00.000Z',
    endDate: '2026-09-13T23:59:59.000Z',
    status: 'APPROVED',
    notes: 'Kế hoạch vận chuyển nước sinh hoạt, ống tưới và vật tư kỹ thuật Tuần 37',
    createdAt: '2026-09-07T08:00:00.000Z',
    createdBy: 'Nguyễn Ngọc Anh Tú',
    tasks: [
      {
        id: '1',
        jobCode: 'TIEP_NUOC',
        jobName: 'Tiếp nước sinh hoạt và nước tưới trạm sơ chế',
        location: 'Nhà máy sơ chế Chuối ERC 1',
        origin: 'Trạm bơm trung tâm',
        destination: 'Nhà máy sơ chế Chuối ERC 1',
        machineType: 'Xe bồn tiếp nước',
        scheduledDays: 'Thứ 2 - Chủ Nhật',
        assignedVehiclesCount: 1,
        durationHours: 56,
        targetQuantity: 70,
        targetUnit: 'Tấn',
        status: 'DISPATCHED',
        notes: 'Chạy hàng ngày từ T2 đến CN (7 ca)',
      },
      {
        id: '2',
        jobCode: 'CAP_ONG_TUOI',
        jobName: 'Cấp phát ống tưới nhỏ giọt, béc phun và phụ tùng cơ giới',
        location: 'Nông trường 1 & 2',
        origin: 'Kho vật tư nông nghiệp',
        destination: 'Nông trường 1 & 2',
        machineType: 'Xe tải thùng 8 tấn',
        scheduledDays: 'Thứ 4 - Chủ Nhật',
        assignedVehiclesCount: 1,
        durationHours: 40,
        targetQuantity: 25,
        targetUnit: 'Tấn',
        status: 'DISPATCHED',
        notes: 'Cấp phát vật tư cho các tổ thi công tưới',
      },
      {
        id: '3',
        jobCode: 'TIEP_NUOC_PHU',
        jobName: 'Tiếp nước sinh hoạt và nước tưới trạm sơ chế',
        location: 'Khu vực sơ chế đóng gói',
        origin: 'Kho bồn nước sạch',
        destination: 'Khu vực sơ chế đóng gói',
        machineType: 'Xe bồn tiếp nước',
        scheduledDays: 'Thứ 4 - Chủ Nhật',
        assignedVehiclesCount: 1,
        durationHours: 40,
        targetQuantity: 50,
        targetUnit: 'Tấn',
        status: 'DISPATCHED',
        notes: 'Cung cấp nước phụ trợ cho đóng gói',
      },
    ],
  },
];

const STORAGE_KEYS: Record<SpecializedPlanKind, string> = {
  CONSTRUCTION: 'thaco_weekly_construction_plans_v3',
  TRANSPORT: 'thaco_weekly_transport_plans_v3',
};

// Helper format ngày
const formatDateStr = (d: string | Date): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Helper format ngày & giờ dd/mm/yyyy hh:mm
export const formatDateTimeStr = (d?: string | Date): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Helper chuẩn hóa trạng thái: Kế hoạch cũ thuộc tuần quá khứ nếu chưa duyệt (DRAFT) -> tự động chuyển thành OVERDUE (Quá hạn)
export function normalizeSpecializedPlanStatuses(items: SpecializedWeeklyPlan[]): SpecializedWeeklyPlan[] {
  const currentIso = getWeekNumber(new Date());
  const todayStr = toDateKey(new Date());

  return items.map((p) => {
    const isPast = (p.weekNumber && p.weekNumber < currentIso) || (p.endDate && p.endDate < todayStr);
    if (isPast && (p.status === 'DRAFT' || (p.status as string) === 'PENDING_APPROVAL')) {
      return { ...p, status: 'OVERDUE' as const };
    }
    return p;
  });
}

export const SpecializedPlansPage: React.FC<{ kind: SpecializedPlanKind }> = ({ kind }) => {
  const navigate = useNavigate();
  const isConstruction = kind === 'CONSTRUCTION';
  const catalogJobs = useMemo(
    () => getStoredJobs().filter((job) => job.planType === (isConstruction ? 'CONG_TRINH' : 'VAN_CHUYEN')),
    [isConstruction]
  );
  const catalogLocations = useMemo(
    () => isConstruction ? getStoredConstructionSites() : getStoredTransportRoutes(),
    [isConstruction]
  );
  const categoryOptions = useMemo(() => {
    const unique = new Map(catalogJobs.map((job) => [job.categoryCode, job.categoryName]));
    return [{ code: 'ALL', name: isConstruction ? 'Tất cả hạng mục công trình' : 'Tất cả luồng vận chuyển' }, ...Array.from(unique, ([code, name]) => ({ code, name }))];
  }, [catalogJobs, isConstruction]);

  // Quản lý danh sách kế hoạch tuần lưu vào LocalStorage
  const [plans, setPlans] = useState<SpecializedWeeklyPlan[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS[kind]);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return normalizeSpecializedPlanStatuses(parsed);
      }
    } catch {}
    const initial = isConstruction ? INITIAL_CONSTRUCTION_PLANS : INITIAL_TRANSPORT_PLANS;
    return normalizeSpecializedPlanStatuses(initial);
  });

  // Tự động đồng bộ và nạp đúng dữ liệu theo loại kế hoạch (Công trình / Vận chuyển)
  useEffect(() => {
    try {
      syncAllApprovedSpecializedPlans();
    } catch {}

    try {
      const cached = localStorage.getItem(STORAGE_KEYS[kind]);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlans(normalizeSpecializedPlanStatuses(parsed));
          setSelectedCategory('ALL');
          return;
        }
      }
    } catch {}
    const initial = isConstruction ? INITIAL_CONSTRUCTION_PLANS : INITIAL_TRANSPORT_PLANS;
    setPlans(normalizeSpecializedPlanStatuses(initial));
    if (initial && initial.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(initial));
        syncAllApprovedSpecializedPlans();
      } catch {}
    }
    setSelectedCategory('ALL');
  }, [kind, isConstruction]);

  // Tính số tuần ISO thực tế theo thời gian hiện tại
  const currentIsoWeek = useMemo(() => getWeekNumber(new Date()), []);

  // State bộ lọc đồng bộ từ Header
  const [search, setSearch] = useState('');
  const selectedKLH = useAppStore((state) => state.selectedKLH);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [view, setView] = useState<'weekly_cards' | 'table'>('weekly_cards');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear() || 2026);
  const [fromWeekVal, setFromWeekVal] = useState('ALL');
  const [toWeekVal, setToWeekVal] = useState('ALL');
  const [weekFilterMode, setWeekFilterMode] = useState<'ALL' | 'PREV_5' | 'CURRENT' | 'NEXT_5' | 'RANGE'>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SpecializedWeeklyPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<SpecializedWeeklyPlan | null>(null);
  const [addingTaskPlan, setAddingTaskPlan] = useState<SpecializedWeeklyPlan | null>(null);
  const [showSosModal, setShowSosModal] = useState(false);
  const [createJobCode, setCreateJobCode] = useState(catalogJobs[0]?.code || '');
  const [createLocationCode, setCreateLocationCode] = useState(catalogLocations[0]?.code || '');
  const [addJobCode, setAddJobCode] = useState(catalogJobs[0]?.code || '');
  const [addLocationCode, setAddLocationCode] = useState(catalogLocations[0]?.code || '');
  const selectedCreateJob = catalogJobs.find((job) => job.code === createJobCode) || catalogJobs[0];
  const selectedAddJob = catalogJobs.find((job) => job.code === addJobCode) || catalogJobs[0];
  const selectedCreateLocation = catalogLocations.find((location) => location.code === createLocationCode) || catalogLocations[0];
  const selectedAddLocation = catalogLocations.find((location) => location.code === addLocationCode) || catalogLocations[0];

  // Lưu plans vào localStorage
  const savePlans = (next: SpecializedWeeklyPlan[]) => {
    const normalized = normalizeSpecializedPlanStatuses(next);
    setPlans(normalized);
    localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(normalized));
  };

  // Lùi / Tiến tuần
  const handleStepWeek = (step: number) => {
    const baseWeek =
      fromWeekVal !== 'ALL'
        ? Number(fromWeekVal)
        : toWeekVal !== 'ALL'
        ? Number(toWeekVal)
        : currentIsoWeek;
    const targetWeek = Math.max(1, Math.min(52, baseWeek + step));
    setFromWeekVal(String(targetWeek));
    setToWeekVal(String(targetWeek));
    setWeekFilterMode('RANGE');
  };

  // Danh sách 52 tuần của năm đang chọn trong bộ lọc (sắp xếp giảm dần theo tuần)
  const weeksOfYear = useMemo(() => {
    return [...getWeeksOfYear(selectedYear)].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [selectedYear]);

  // Lọc danh sách kế hoạch
  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      // 1. Lọc KLH đồng bộ từ Header
      if (selectedKLH !== 'ALL' && !matchesKLH(p, selectedKLH)) return false;

      // 2. Lọc trạng thái
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;

      // 3. Lọc hạng mục / danh mục
      if (selectedCategory !== 'ALL' && p.categoryCode !== selectedCategory) return false;

      // 4. Lọc năm
      if (p.year && p.year !== selectedYear) return false;

      // 5. Lọc tuần theo chế độ động chuẩn thời gian thực
      if (weekFilterMode === 'PREV_5') {
        const minW = Math.max(1, currentIsoWeek - 4);
        const maxW = currentIsoWeek;
        if (p.weekNumber < minW || p.weekNumber > maxW) return false;
      } else if (weekFilterMode === 'CURRENT') {
        if (p.weekNumber !== currentIsoWeek) return false;
      } else if (weekFilterMode === 'NEXT_5') {
        const minW = currentIsoWeek;
        const maxW = Math.min(52, currentIsoWeek + 4);
        if (p.weekNumber < minW || p.weekNumber > maxW) return false;
      } else if (weekFilterMode === 'RANGE') {
        const fw = fromWeekVal !== 'ALL' ? Number(fromWeekVal) : 1;
        const tw = toWeekVal !== 'ALL' ? Number(toWeekVal) : 52;
        if (p.weekNumber < Math.min(fw, tw) || p.weekNumber > Math.max(fw, tw)) return false;
      } else {
        if (fromWeekVal !== 'ALL' && p.weekNumber < Number(fromWeekVal)) return false;
        if (toWeekVal !== 'ALL' && p.weekNumber > Number(toWeekVal)) return false;
      }

      // 6. Tìm kiếm từ khóa (Mã KH, tiêu đề, hoặc tên công việc/tuyến đường)
      if (q) {
        const matchHeader = p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
        const matchTasks = p.tasks.some(
          (t) =>
            t.jobName.toLowerCase().includes(q) ||
            t.location.toLowerCase().includes(q) ||
            t.machineType.toLowerCase().includes(q)
        );
        if (!matchHeader && !matchTasks) return false;
      }

      return true;
    });
  }, [plans, search, selectedKLH, selectedStatus, selectedCategory, selectedYear, weekFilterMode, fromWeekVal, toWeekVal]);

  // Thống kê cho 4 thẻ KPI đầu trang
  const stats = useMemo(() => {
    let totalTasks = 0;
    let totalHours = 0;
    let totalQty = 0;
    let totalVehicles = 0;

    filteredPlans.forEach((p) => {
      totalTasks += p.tasks.length;
      p.tasks.forEach((t) => {
        totalHours += t.durationHours || 0;
        totalQty += t.targetQuantity || 0;
        totalVehicles += t.assignedVehiclesCount || 0;
      });
    });

    return {
      plansCount: filteredPlans.length,
      tasksCount: totalTasks,
      totalHours: Math.round(totalHours * 10) / 10,
      totalQuantity: Math.round(totalQty * 10) / 10,
      vehiclesCount: totalVehicles,
    };
  }, [filteredPlans]);

  // Phát lệnh điều xe cho 1 hoặc nhiều nhiệm vụ
  const issueTasksToDispatch = (plan: SpecializedWeeklyPlan, tasksToIssue: SpecializedTaskItem[]) => {
    if (tasksToIssue.length === 0) return;

    if (isConstruction) {
      const key = 'thaco_construction_shifts_v1';
      const current = JSON.parse(localStorage.getItem(key) || '[]') as Array<Record<string, unknown>>;
      const created = tasksToIssue.flatMap((task) =>
        Array.from({ length: task.assignedVehiclesCount }, (_, index) => ({
          id: `CM-${Date.now()}-${index}`,
          code: `LDX-CT-${plan.code}-${task.jobCode}-${index + 1}`,
          workDate: plan.startDate,
          shiftType: 'CA_NGAY',
          complexCode: plan.complexCode,
          complexName: plan.complexName,
          projectName: plan.title,
          locationDetails: task.location,
          jobCategory: task.category || plan.categoryCode,
          jobCategoryName: task.jobName,
          machineCode: 'CHUA_GAN',
          machineName: task.machineType,
          machineType: task.machineType,
          operatorName: task.operatorName || 'Chưa gán thợ máy',
          operatorPhone: task.operatorPhone || '—',
          plannedHours: task.durationHours,
          actualWorkingHours: 0,
          actualIdlingHours: 0,
          fuelQuotaLitersPerHour: 14.5,
          plannedFuelLiters: task.durationHours * 14.5,
          workVolumeTarget: task.targetQuantity,
          workVolumeUnit: task.targetUnit,
          status: 'CHO_DUYET',
          notes: `Sinh từ Kế hoạch tuần ${plan.code} - ${task.notes || ''}`,
        }))
      );
      localStorage.setItem(key, JSON.stringify([...created, ...current]));

      // Cập nhật trạng thái nhiệm vụ đã phát
      const nextPlans = plans.map((p) => {
        if (p.id !== plan.id) return p;
        const updatedTasks = p.tasks.map((t) =>
          tasksToIssue.some((target) => target.id === t.id) ? { ...t, status: 'DISPATCHED' as const } : t
        );
        const allDispatched = updatedTasks.every((t) => t.status === 'DISPATCHED');
        return {
          ...p,
          tasks: updatedTasks,
          status: allDispatched ? ('IN_PROGRESS' as const) : p.status,
        };
      });
      savePlans(nextPlans);
      navigate('/lenh-dieu-xe/lenh-cong-trinh');
    } else {
      const key = 'thaco_transport_orders_v2';
      const current = JSON.parse(localStorage.getItem(key) || '[]') as TransportOrderRecord[];
      const created: TransportOrderRecord[] = tasksToIssue.flatMap((task) =>
        Array.from({ length: task.assignedVehiclesCount }, (_, index) => ({
          id: Date.now() + index,
          code: `LDX-NB-${plan.code}-${task.jobCode}-${index + 1}`,
          routeType: 'ONE_WAY',
          transportMode: '1 Chiều',
          flowType: 'STANDARD',
          unit: plan.complexCode,
          requestDate: new Date().toISOString().slice(0, 10),
          executionDate: plan.startDate,
          departureTime: `${plan.startDate}T07:00:00.000Z`,
          plannedEndTime: `${plan.startDate}T17:00:00.000Z`,
          distanceKm: 25.0,
          status: 'PENDING_APPROVAL',
          isRouteDeviated: false,
          origin: task.origin || task.location.split('➔')[0]?.trim() || 'Kho Tổng',
          destination: task.destination || task.location.split('➔')[1]?.trim() || 'Nông trường',
          cargoType: task.jobName,
          items: [
            {
              id: Date.now() + 100 + index,
              cargoName: task.jobName,
              unitOfMeasure: task.targetUnit,
              plannedQuantity: task.targetQuantity,
              pickupLocation: task.origin,
              deliveryLocation: task.destination,
            },
          ],
          notes: `Sinh từ Kế hoạch tuần ${plan.code} - ${task.notes || ''}`,
        }))
      );
      localStorage.setItem(key, JSON.stringify([...created, ...current]));

      // Cập nhật trạng thái nhiệm vụ đã phát
      const nextPlans = plans.map((p) => {
        if (p.id !== plan.id) return p;
        const updatedTasks = p.tasks.map((t) =>
          tasksToIssue.some((target) => target.id === t.id) ? { ...t, status: 'DISPATCHED' as const } : t
        );
        const allDispatched = updatedTasks.every((t) => t.status === 'DISPATCHED');
        return {
          ...p,
          tasks: updatedTasks,
          status: allDispatched ? ('IN_PROGRESS' as const) : p.status,
        };
      });
      savePlans(nextPlans);
      navigate('/lenh-dieu-xe/lenh-noi-bo');
    }
  };

  // Xóa kế hoạch
  const handleDeletePlan = (planId: string, planTitle: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa kế hoạch "${planTitle}"?`)) {
      const next = plans.filter((p) => p.id !== planId);
      savePlans(next);
    }
  };

  // Lưu chỉnh sửa kế hoạch tuần
  const handleSaveEditPlan = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlan) return;

    const form = new FormData(e.currentTarget);
    const klhCode = (form.get('complexCode') as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO') || 'KOUN_MOM';
    const klhName = KLH_OPTIONS.find((k) => k.code === klhCode)?.name || 'Khu liên hợp Koun Mom';

    const updated: SpecializedWeeklyPlan = {
      ...editingPlan,
      code: String(form.get('code') || editingPlan.code),
      title: String(form.get('title') || editingPlan.title),
      complexCode: klhCode,
      complexName: klhName,
      enterpriseName: String(form.get('enterpriseName') || editingPlan.enterpriseName),
      farmName: String(form.get('farmName') || editingPlan.farmName),
      weekNumber: Number(form.get('weekNumber')) || editingPlan.weekNumber,
      startDate: String(form.get('startDate') || editingPlan.startDate),
      endDate: String(form.get('endDate') || editingPlan.endDate),
      status: (form.get('status') as SpecializedPlanStatus) || editingPlan.status,
      notes: String(form.get('notes') || ''),
    };

    savePlans(plans.map((p) => (p.id === updated.id ? updated : p)));
    setEditingPlan(null);
  };

  // Thêm công việc mới vào kế hoạch
  const handleAddTaskToPlan = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addingTaskPlan) return;

    const form = new FormData(e.currentTarget);
    const selectedJob = catalogJobs.find((job) => job.code === String(form.get('jobCatalogCode'))) || catalogJobs[0];
    const selectedLocation = catalogLocations.find((location) => location.code === String(form.get('locationCatalogCode'))) || catalogLocations[0];
    if (!selectedJob || !selectedLocation) return;
    const origin = !isConstruction && 'origin' in selectedLocation ? selectedLocation.origin : undefined;
    const destination = !isConstruction && 'destination' in selectedLocation ? selectedLocation.destination : undefined;
    const locationStr = isConstruction ? `${selectedLocation.code}: ${selectedLocation.name}` : `${origin} ➔ ${destination}`;

    const newTask: SpecializedTaskItem = {
      id: `TASK-${Date.now()}`,
      jobCode: selectedJob.code,
      jobName: selectedJob.name,
      category: selectedJob.categoryCode,
      location: locationStr,
      origin,
      destination,
      machineType: selectedJob.recommendedVehicle,
      durationHours: Number(form.get('durationHours')) || 8,
      targetQuantity: Number(form.get('targetQuantity')) || 1,
      targetUnit: selectedJob.defaultUnit || (isConstruction ? 'm³' : 'Tấn'),
      assignedVehiclesCount: Number(form.get('assignedVehiclesCount')) || 1,
      scheduledDays: String(form.get('scheduledDays') || 'Thứ 2 - Thứ 4'),
      notes: String(form.get('notes') || ''),
      status: 'PENDING',
    };

    const updatedPlan: SpecializedWeeklyPlan = {
      ...addingTaskPlan,
      tasks: [...addingTaskPlan.tasks, newTask],
    };

    savePlans(plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
    setAddingTaskPlan(null);
  };

  // Tạo kế hoạch tuần mới hoàn toàn
  const handleCreateNewPlan = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const klhCode = (form.get('complexCode') as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO') || 'KOUN_MOM';
    const klhName = KLH_OPTIONS.find((k) => k.code === klhCode)?.name || 'Khu liên hợp Koun Mom';
    const weekNo = Number(form.get('weekNumber')) || currentIsoWeek;
    const selectedJob = catalogJobs.find((job) => job.code === String(form.get('jobCatalogCode'))) || catalogJobs[0];
    const selectedLocation = catalogLocations.find((location) => location.code === String(form.get('locationCatalogCode'))) || catalogLocations[0];
    if (!selectedJob || !selectedLocation) return;
    const catCode = selectedJob.categoryCode;
    const catName = selectedJob.categoryName;
    const origin = !isConstruction && 'origin' in selectedLocation ? selectedLocation.origin : undefined;
    const destination = !isConstruction && 'destination' in selectedLocation ? selectedLocation.destination : undefined;
    const locationStr = isConstruction ? `${selectedLocation.code}: ${selectedLocation.name}` : `${origin} ➔ ${destination}`;

    const newPlan: SpecializedWeeklyPlan = {
      id: `PLAN-${kind}-${Date.now()}`,
      code: String(form.get('code') || `${isConstruction ? 'KH-CT' : 'KH-VC'}-2026-W${weekNo}`),
      title: String(form.get('title') || ''),
      complexCode: klhCode,
      complexName: klhName,
      enterpriseName: String(form.get('enterpriseName') || (isConstruction ? 'XN Cơ giới & Hạ tầng' : 'XN Vận tải Logistics')),
      farmName: String(form.get('farmName') || (isConstruction ? 'Đội Thi công Công trình' : 'Đội Xe Tải & Xe Bồn')),
      categoryCode: catCode,
      categoryName: catName,
      weekNumber: weekNo,
      year: 2026,
      startDate: String(form.get('startDate')),
      endDate: String(form.get('endDate')),
      status: 'DRAFT',
      notes: String(form.get('notes') || ''),
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: `TASK-${Date.now()}-1`,
          jobCode: selectedJob.code,
          jobName: selectedJob.name,
          category: selectedJob.categoryCode,
          location: locationStr,
          origin,
          destination,
          machineType: selectedJob.recommendedVehicle,
          durationHours: Number(form.get('firstTaskDuration')) || 8,
          targetQuantity: Number(form.get('firstTaskQuantity')) || 1,
          targetUnit: selectedJob.defaultUnit || (isConstruction ? 'm³' : 'Tấn'),
          assignedVehiclesCount: Number(form.get('firstTaskVehicles')) || 1,
          scheduledDays: String(form.get('firstTaskDays') || 'Thứ 2 - Thứ 4'),
          notes: String(form.get('firstTaskNotes') || ''),
          status: 'PENDING',
        },
      ],
    };

    savePlans([newPlan, ...plans]);
    setShowCreateModal(false);
  };

  // Xuất file CSV danh sách kế hoạch
  const handleExportCSV = () => {
    if (filteredPlans.length === 0) return;

    const headers = [
      'STT',
      'Mã kế hoạch tuần',
      'Tên kế hoạch tuần',
      'Khu liên hợp',
      'Tuần số',
      'Thời gian thực hiện',
      'Trạng thái kế hoạch',
      'Mã công việc',
      isConstruction ? 'Hạng mục thi công' : 'Nhu cầu vận chuyển',
      isConstruction ? 'Tuyến / Vị trí thi công' : 'Tuyến nhận – giao',
      'Thiết bị & Đầu máy',
      'Người vận hành',
      isConstruction ? 'Giờ máy kế hoạch' : 'Khối lượng hàng',
      'ĐVT',
      'Nhu cầu xe/máy',
      'Lịch thực hiện',
      'Ghi chú',
    ];

    const rows: (string | number)[][] = [];
    let counter = 1;

    for (const plan of filteredPlans) {
      for (const task of plan.tasks) {
        rows.push([
          counter++,
          plan.code,
          plan.title,
          plan.complexName,
          `Tuần ${plan.weekNumber}`,
          `${formatDateStr(plan.startDate)} ➔ ${formatDateStr(plan.endDate)}`,
          plan.status,
          task.jobCode,
          task.jobName,
          task.location,
          task.machineType,
          task.operatorName || '—',
          isConstruction ? task.durationHours : task.targetQuantity,
          task.targetUnit,
          task.assignedVehiclesCount,
          task.scheduledDays,
          task.notes || plan.notes || '',
        ]);
      }
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ke-hoach-${isConstruction ? 'cong-trinh' : 'van-chuyen'}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. BỘ CHUYỂN ĐỔI 3 LOẠI KẾ HOẠCH + NÚT CỨU HỘ SOS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          {/* Tab 1: Nông nghiệp */}
          <button
            type="button"
            onClick={() => navigate('/lenh-dieu-xe/ke-hoach/nong-nghiep')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Tractor className="h-4 w-4 text-emerald-500" />
            <span>Nông nghiệp</span>
          </button>

          {/* Tab 2: Công trình */}
          <button
            type="button"
            onClick={() => navigate('/lenh-dieu-xe/ke-hoach/cong-trinh')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              isConstruction ? 'bg-slate-900 text-white font-extrabold shadow-xs' : 'font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HardHat className="h-4 w-4 text-amber-500" />
            <span>Công trình</span>
          </button>

          {/* Tab 3: Vận chuyển */}
          <button
            type="button"
            onClick={() => navigate('/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              !isConstruction ? 'bg-slate-900 text-white font-extrabold shadow-xs' : 'font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="h-4 w-4 text-blue-500" />
            <span>Vận chuyển</span>
          </button>
        </div>
      </div>

      {/* 2. HÀNG 4 THẺ KPI TỔNG QUAN */}
      <KPIGrid cols={4}>
        <StatCard
          label="Tổng kế hoạch tuần"
          value={stats.plansCount}
          subValue={selectedKLH === 'ALL' ? 'Toàn bộ các Khu liên hợp' : KLH_OPTIONS.find((k) => k.code === selectedKLH)?.name}
          icon={<Layers className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Tổng công việc trong tuần"
          value={`${stats.tasksCount} hạng mục`}
          subValue="Được phân bổ trong các tuần"
          icon={<ListPlus className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          label={isConstruction ? 'Tổng giờ máy kế hoạch' : 'Tổng khối lượng kế hoạch'}
          value={isConstruction ? `${stats.totalHours} giờ máy` : `${stats.totalQuantity.toLocaleString('vi-VN')} đơn vị`}
          subValue={isConstruction ? 'Định mức ca máy công trình' : 'Chỉ tiêu vận tải nội bộ'}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Nhu cầu đầu máy dự kiến"
          value={`${stats.vehiclesCount} xe`}
          subValue={isConstruction ? 'Máy đào, ủi, lu & xe ben' : 'Xe tải, ben & bồn chuyên dụng'}
          icon={isConstruction ? <HardHat className="h-5 w-5 text-amber-600" /> : <Truck className="h-5 w-5 text-amber-600" />}
        />
      </KPIGrid>

      {/* 3. KHUNG LỌC VÀ CÔNG CỤ CHÍNH (3 TẦNG CHUẨN HÌNH 1 & 2) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5">
        {/* TẦNG 1: Ô TÌM KIẾM + BỘ LỌC SELECT + NÚT LẬP KẾ HOẠCH MỚI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isConstruction ? 'Tìm mã KH, tên công trình hoặc vị trí thi công...' : 'Tìm mã KH, loại hàng hoặc nơi nhận/giao...'}
            />
          </div>

          {/* Select Hạng mục / Danh mục */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 h-9">
            <Layers className="h-4 w-4 text-amber-600 shrink-0" />
            <select
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Trạng thái */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 h-9">
            <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
            <select
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="APPROVED">Đã duyệt / Sẵn sàng</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="DRAFT">Bản nháp</option>
            </select>
          </div>
        </div>

        {/* TẦNG 2: CHẾ ĐỘ XEM (VIEW SWITCHER TABS) */}
        <div className="border-t border-slate-100 pt-3">
          <ViewSwitcher<'weekly_cards' | 'table'>
            value={view}
            onChange={setView}
            options={[
              { value: 'weekly_cards', label: 'Theo từng tuần (Thẻ trực quan)' },
              { value: 'table', label: 'Bảng danh sách chi tiết' },
            ]}
          />
        </div>

        {/* TẦNG 3: BỘ CHỌN NĂM & TUẦN + CÁC NÚT TIỆN ÍCH */}
        <div className="pt-2 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-extrabold text-slate-700 mr-1 shrink-0">
              <Calendar className="h-4 w-4 text-emerald-600 shrink-0" /> Chọn tuần:
            </span>

            {/* Select Chọn Năm */}
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 transition-colors px-2.5 py-1 rounded-xl border border-slate-200 h-8 shrink-0">
              <span className="text-xs font-bold text-slate-500">Năm:</span>
              <select
                className="bg-transparent text-xs font-extrabold text-slate-900 outline-none cursor-pointer"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setFromWeekVal('ALL');
                  setToWeekVal('ALL');
                  setWeekFilterMode('ALL');
                }}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
              </select>
            </div>

            {/* Cụm Từ Tuần ➔ Đến Tuần + Stepper: LUÔN NGANG NHAU (flex-nowrap shrink-0) KHÔNG BAO GIỜ BỊ XUỐNG DÒNG */}
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              {/* Select Chọn Từ Tuần */}
              <div
                className={`flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-xl border h-8 ${
                  fromWeekVal === String(currentIsoWeek)
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <CalendarDays
                  className={`h-3.5 w-3.5 shrink-0 ${
                    fromWeekVal === String(currentIsoWeek) ? 'text-emerald-600' : 'text-primary'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Từ:</span>
                <select
                  className={`bg-transparent text-xs font-extrabold outline-none cursor-pointer max-w-[210px] ${
                    fromWeekVal === String(currentIsoWeek) ? 'text-emerald-800 font-black' : 'text-slate-900'
                  }`}
                  value={fromWeekVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFromWeekVal(val);
                    if (val === 'ALL' && toWeekVal === 'ALL') {
                      setWeekFilterMode('ALL');
                    } else {
                      setWeekFilterMode('RANGE');
                    }
                  }}
                >
                  <option value="ALL">Từ tuần (Tất cả)...</option>
                  {weeksOfYear.map((w) => {
                    const isCurrent = w.weekNumber === currentIsoWeek;
                    return (
                      <option
                        key={w.weekNumber}
                        value={w.weekNumber}
                        style={
                          isCurrent
                            ? { color: '#047857', fontWeight: 'bold', backgroundColor: '#ecfdf5' }
                            : undefined
                        }
                      >
                        {w.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <span className="text-slate-400 font-bold text-xs shrink-0">➔</span>

              {/* Select Chọn Đến Tuần */}
              <div
                className={`flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-xl border h-8 ${
                  toWeekVal === String(currentIsoWeek)
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <CalendarDays
                  className={`h-3.5 w-3.5 shrink-0 ${
                    toWeekVal === String(currentIsoWeek) ? 'text-emerald-600' : 'text-primary'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Đến:</span>
                <select
                  className={`bg-transparent text-xs font-extrabold outline-none cursor-pointer max-w-[210px] ${
                    toWeekVal === String(currentIsoWeek) ? 'text-emerald-800 font-black' : 'text-slate-900'
                  }`}
                  value={toWeekVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setToWeekVal(val);
                    if (fromWeekVal === 'ALL' && val === 'ALL') {
                      setWeekFilterMode('ALL');
                    } else {
                      setWeekFilterMode('RANGE');
                    }
                  }}
                >
                  <option value="ALL">Đến tuần (Tất cả)...</option>
                  {weeksOfYear.map((w) => {
                    const isCurrent = w.weekNumber === currentIsoWeek;
                    return (
                      <option
                        key={w.weekNumber}
                        value={w.weekNumber}
                        style={
                          isCurrent
                            ? { color: '#047857', fontWeight: 'bold', backgroundColor: '#ecfdf5' }
                            : undefined
                        }
                      >
                        {w.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Stepper Lùi / Tiến 1 Tuần */}
              <div className="flex items-center gap-0.5 bg-slate-50 rounded-xl border border-slate-200 p-0.5 h-8 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepWeek(-1)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Lùi 1 tuần"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleStepWeek(1)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Tiến 1 tuần"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Nhóm 4 Nút Chọn Khoảng Tuần Nhanh */}
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              {/* Nút 1: Tất cả */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('ALL');
                  setFromWeekVal('ALL');
                  setToWeekVal('ALL');
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>

              {/* Nút 2: 5 tuần trước (chứa tuần hiện tại) */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('PREV_5');
                  setFromWeekVal(String(Math.max(1, currentIsoWeek - 4)));
                  setToWeekVal(String(currentIsoWeek));
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'PREV_5'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={`5 tuần trước bao gồm tuần hiện tại (W${Math.max(1, currentIsoWeek - 4)} ➔ W${currentIsoWeek})`}
              >
                5 tuần trước (W{Math.max(1, currentIsoWeek - 4)} - W{currentIsoWeek})
              </button>

              {/* Nút 3: Tuần hiện tại */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('CURRENT');
                  setFromWeekVal(String(currentIsoWeek));
                  setToWeekVal(String(currentIsoWeek));
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'CURRENT'
                    ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                Tuần hiện tại (W{currentIsoWeek})
              </button>

              {/* Nút 4: 5 tuần tới (chứa tuần hiện tại) */}
              <button
                type="button"
                onClick={() => {
                  setWeekFilterMode('NEXT_5');
                  setFromWeekVal(String(currentIsoWeek));
                  setToWeekVal(String(Math.min(52, currentIsoWeek + 4)));
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  weekFilterMode === 'NEXT_5'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={`5 tuần tới bao gồm tuần hiện tại (W${currentIsoWeek} ➔ W${Math.min(52, currentIsoWeek + 4)})`}
              >
                5 tuần tới (W{currentIsoWeek} - W{Math.min(52, currentIsoWeek + 4)})
              </button>
            </div>
          </div>

          {/* Các nút tiện ích bên phải: Làm mới, Xuất file, Lập kế hoạch tuần mới */}
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 xl:ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                setSearch('');
                setSelectedStatus('ALL');
                setSelectedCategory('ALL');
                useAppStore.getState().setSelectedKLH('ALL');
                setSelectedYear(2026);
                setFromWeekVal('ALL');
                setToWeekVal('ALL');
                setWeekFilterMode('ALL');
              }}
            >
              Làm mới
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportCSV}
            >
              Xuất file
            </Button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  isConstruction
                    ? '/lenh-dieu-xe/ke-hoach/cong-trinh/tao-moi'
                    : '/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo/tao-moi'
                )
              }
              className="h-8 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-3.5 shadow-2xs transition-all hover:shadow cursor-pointer active:scale-98"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{isConstruction ? 'Lập KH công trình mới' : 'Lập KH vận chuyển mới'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. MAIN CONTENT: THEO TỪNG TUẦN (THẺ TRỰC QUAN KHỚP 100% HÌNH 1) HOẶC BẢNG CHI TIẾT */}
      {filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Không tìm thấy kế hoạch nào phù hợp với bộ lọc hiện tại.</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng chọn tuần khác hoặc bấm "Lập kế hoạch tuần mới".</p>
          <Button
            size="sm"
            className="mt-4 bg-primary text-white text-xs font-bold mx-auto cursor-pointer"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() =>
              navigate(
                isConstruction
                  ? '/lenh-dieu-xe/ke-hoach/cong-trinh/tao-moi'
                  : '/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo/tao-moi'
              )
            }
          >
            Lập kế hoạch tuần mới
          </Button>
        </div>
      ) : view === 'weekly_cards' ? (
        /* CHẾ ĐỘ XEM THẺ KẾ HOẠCH THEO TỪNG TUẦN (CHÍNH XÁC NHƯ HÌNH 1 CỦA NÔNG NGHIỆP) */
        <div className="space-y-6">
          {filteredPlans.map((plan) => {
            const totalHours = plan.tasks.reduce((sum, t) => sum + (t.durationHours || 0), 0);
            const totalQty = plan.tasks.reduce((sum, t) => sum + (t.targetQuantity || 0), 0);
            const totalVehicles = plan.tasks.reduce((sum, t) => sum + (t.assignedVehiclesCount || 0), 0);

            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* HEADER KẾ HOẠCH TUẦN */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 bg-slate-50/90 border-b border-slate-200">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* CỘT TRÁI: BADGE TUẦN + KHOẢNG THỜI GIAN TUẦN + BADGE HẠNG MỤC */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white font-black text-sm shadow-xs">
                        W{plan.weekNumber}
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-[10.5px] text-slate-500 whitespace-nowrap bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <CalendarDays className="h-3 w-3 text-slate-400 shrink-0" />
                        {formatDateStr(plan.startDate)} ➔ {formatDateStr(plan.endDate)}
                      </span>
                      <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border text-center bg-emerald-50 text-emerald-700 border-emerald-200">
                        {plan.categoryName}
                      </span>
                    </div>

                    {/* CỘT GIỮA: MÃ, TIÊU ĐỀ & PHÂN CẤP ĐƠN VỊ */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-primary text-xs bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
                          {plan.code}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 break-words leading-snug">
                          {plan.title}
                        </h3>
                        <div className="shrink-0">
                          <StatusBadge status={plan.status} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-0.5">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <Building2 className="h-3.5 w-3.5 text-emerald-600" /> {plan.complexName}
                        </span>

                        {plan.enterpriseName && (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-950 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-200/80">
                            <Building2 className="h-3.5 w-3.5 text-blue-600" /> {plan.enterpriseName}
                          </span>
                        )}

                        {plan.farmName && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" /> {plan.farmName}
                          </span>
                        )}
                      </div>

                      {/* TRƯỜNG BỔ SUNG: NGƯỜI LẬP (TÊN USER) VÀ THỜI GIAN LẬP */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200">
                          <User className="h-3 w-3 text-slate-400" />
                          Người lập: <strong className="text-slate-800 font-bold">{plan.createdBy || 'Chau Tiểu Long'}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200">
                          <Clock className="h-3 w-3 text-slate-400" />
                          Thời gian lập: <strong className="text-slate-800 font-bold">{formatDateTimeStr(plan.createdAt)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* THỐNG KÊ & NÚT HÀNH ĐỘNG BÊN PHẢI */}
                  <div className="flex flex-col items-start sm:items-end justify-center gap-2 shrink-0">
                    {/* Hộp thống kê số lượng */}
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Số công việc:</span>
                        <strong className="text-blue-700 text-sm">{plan.tasks.length}</strong>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {isConstruction ? 'Tổng giờ máy:' : 'Tổng khối lượng:'}
                        </span>
                        <strong className="text-primary text-sm">
                          {isConstruction ? `${totalHours} giờ` : `${totalQty.toLocaleString('vi-VN')} đơn vị`}
                        </strong>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Nhu cầu máy:</span>
                        <strong className="text-amber-700 text-sm">{totalVehicles} xe</strong>
                      </div>
                    </div>

                    {/* Hàng nút hành động: Xem, Sửa, Xóa, Xem điều xe */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${
                              isConstruction
                                ? '/lenh-dieu-xe/ke-hoach/cong-trinh/tao-moi'
                                : '/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo/tao-moi'
                            }?editPlanId=${plan.id}&mode=view`
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" /> Xem
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${
                              isConstruction
                                ? '/lenh-dieu-xe/ke-hoach/cong-trinh/tao-moi'
                                : '/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo/tao-moi'
                            }?editPlanId=${plan.id}`
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 cursor-pointer shadow-2xs transition-colors"
                        title="Chỉnh sửa kế hoạch"
                      >
                        <Pen className="h-3.5 w-3.5 text-blue-600" /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id, plan.title)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 cursor-pointer shadow-2xs transition-colors"
                        title="Xóa kế hoạch"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/lenh-dieu-xe/danh-sach')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl shadow-2xs cursor-pointer transition-all active:scale-98"
                        title="Xem các lệnh điều xe của kế hoạch này"
                      >
                        <Truck className="h-3.5 w-3.5 text-slate-600" /> Xem điều xe
                      </button>
                    </div>
                  </div>
                </div>

                {/* BẢNG CHI TIẾT TỪNG NHIỆM VỤ BÊN TRONG THẺ KẾ HOẠCH (GIỐNG HÌNH 1 CỦA NÔNG NGHIỆP) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3 min-w-[220px]">
                          {isConstruction ? 'Hạng mục công việc cơ giới' : 'Nhu cầu vận chuyển / Loại hàng'}
                        </th>
                        <th className="py-2.5 px-3 min-w-[180px]">
                          {isConstruction ? 'Vị trí / Tuyến thi công' : 'Tuyến nhận – giao hàng'}
                        </th>
                        <th className="py-2.5 px-3 min-w-[170px]">
                          {isConstruction ? 'Nông cụ tương thích & Đầu máy' : 'Chủng loại phương tiện & Đầu kéo'}
                        </th>
                        <th className="py-2.5 px-3 text-center w-28">
                          {isConstruction ? 'Giờ máy (ĐVT)' : 'Khối lượng (ĐVT)'}
                        </th>
                        <th className="py-2.5 px-3 text-center w-24">Nhu cầu máy</th>
                        <th className="py-2.5 px-3 text-center w-28">Lịch thực hiện</th>
                        <th className="py-2.5 px-3 text-center w-28">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.tasks.map((task, idx) => (
                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* STT */}
                          <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>

                          {/* Hạng mục công việc */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10.5px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                                  {task.jobCode}
                                </span>
                                <span className="text-slate-900 text-xs sm:text-[13px] font-extrabold leading-snug">
                                  {task.jobName}
                                </span>
                              </div>
                              {task.notes && (
                                <div className="text-[11px] text-slate-500 font-medium italic pt-0.5">
                                  {task.notes}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Vị trí / Tuyến đường */}
                          <td className="py-3 px-3">
                            <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 shadow-2xs">
                              <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">
                                {task.location}
                              </span>
                            </div>
                          </td>

                          {/* Thiết bị & Đầu máy */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="font-bold text-amber-900 flex items-center gap-1.5 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/70 text-xs leading-snug">
                                <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span>
                                  {task.machineType}
                                </span>
                              </div>
                              {task.operatorName && (
                                <div className="text-[11px] text-slate-600 font-semibold px-1">
                                  Thợ máy: {task.operatorName}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Khối lượng / Giờ máy */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="text-slate-900 text-xs font-black">
                              {isConstruction ? `${task.durationHours} giờ` : `${task.targetQuantity.toLocaleString('vi-VN')}`}
                            </div>
                            <span className="text-[10.5px] font-semibold text-slate-500">
                              {isConstruction ? `Định mức: ${task.targetQuantity} ${task.targetUnit}` : task.targetUnit}
                            </span>
                          </td>

                          {/* Nhu cầu máy */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-block rounded-lg bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 border border-amber-200 shadow-2xs">
                              {task.assignedVehiclesCount} xe
                            </span>
                          </td>

                          {/* Lịch thực hiện */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs">
                              <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                              {task.scheduledDays}
                            </span>
                          </td>

                          {/* Hành động */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => navigate('/lenh-dieu-xe/danh-sach')}
                              className="inline-flex items-center gap-1 h-7 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer px-2.5 shadow-2xs transition-colors"
                              title="Nhiệm vụ đã tự động nạp sang danh sách điều xe"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Tự động nạp</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER CỦA THẺ KẾ HOẠCH TUẦN (GHI CHÚ CHUNG + NÚT THÊM CÔNG VIỆC VÀO TUẦN NÀY) */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-600 max-w-2xl">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Ghi chú chung kế hoạch: </span>
                      <span>{plan.notes || 'Không có ghi chú bổ sung.'}</span>
                    </div>
                  </div>

                  {(() => {
                    const isPast =
                      plan.status === 'OVERDUE' ||
                      plan.status === 'COMPLETED' ||
                      (plan.weekNumber !== undefined && plan.weekNumber < currentIsoWeek);

                    if (isPast) {
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs select-none"
                          title="Kế hoạch này thuộc tuần đã qua trong quá khứ, hệ thống đã khóa không cho nhập thêm công việc mới"
                        >
                          <Lock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Đã qua tuần (Khóa thêm việc)</span>
                        </span>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${
                              isConstruction
                                ? '/lenh-dieu-xe/ke-hoach/cong-trinh/tao-moi'
                                : '/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo/tao-moi'
                            }?editPlanId=${plan.id}&addNewTask=true`
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Thêm công việc vào tuần này</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CHẾ ĐỘ XEM BẢNG DANH SÁCH CHI TIẾT TỪNG NHIỆM VỤ */
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-36 text-center">Tuần & Mã Kế Hoạch</th>
                  <th className="py-2.5 px-2 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[210px]">{isConstruction ? 'Hạng mục công trình' : 'Nhiệm vụ vận chuyển'}</th>
                  <th className="py-2.5 px-3 min-w-[170px]">{isConstruction ? 'Tuyến / Vị trí thi công' : 'Tuyến nhận – giao'}</th>
                  <th className="py-2.5 px-3 min-w-[160px]">{isConstruction ? 'Thiết bị & Nông cụ' : 'Chủng loại phương tiện'}</th>
                  <th className="py-2.5 px-2 text-center w-24">{isConstruction ? 'Giờ máy' : 'Khối lượng'}</th>
                  <th className="py-2.5 px-2 text-center w-24">Nhu cầu xe</th>
                  <th className="py-2.5 px-2 text-center w-24">Lịch thực hiện</th>
                  <th className="py-2.5 px-2 text-center w-24">Trạng thái</th>
                  <th className="py-2.5 px-2 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map((plan) =>
                  plan.tasks.map((task, idx) => (
                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                      {idx === 0 && (
                        <td rowSpan={plan.tasks.length} className="p-3 align-top border-r border-slate-200 bg-slate-50/50 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs">
                            W{plan.weekNumber}
                          </span>
                          <div className="font-mono font-bold text-slate-900 text-xs mt-1">{plan.code}</div>
                          <div className="text-[10px] text-slate-400">{formatDateStr(plan.startDate)}</div>
                          <div className="text-[10px] text-slate-600 font-bold mt-1 truncate max-w-[120px]">{plan.complexName}</div>
                        </td>
                      )}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mr-1">
                          {task.jobCode}
                        </span>
                        <strong className="text-slate-900">{task.jobName}</strong>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{task.location}</td>
                      <td className="py-2 px-3 text-slate-700">{task.machineType}</td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900">
                        {isConstruction ? `${task.durationHours}h` : `${task.targetQuantity} ${task.targetUnit}`}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="rounded bg-amber-100 text-amber-900 text-[10.5px] font-bold px-1.5 py-0.5">
                          {task.assignedVehiclesCount} xe
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600">{task.scheduledDays}</td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            task.status === 'DISPATCHED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {task.status === 'DISPATCHED' ? 'Đã phát' : 'Chờ phát'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => navigate('/lenh-dieu-xe/danh-sach')}
                          className="inline-flex items-center gap-1 h-7 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer px-2.5 shadow-2xs transition-colors"
                          title="Nhiệm vụ đã tự động nạp sang danh sách điều xe"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Tự động nạp</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL XEM CHI TIẾT KẾ HOẠCH TUẦN */}
      {viewingPlan && (
        <Modal
          isOpen={true}
          onClose={() => setViewingPlan(null)}
          title={`Chi tiết kế hoạch: ${viewingPlan.code}`}
          size="lg"
          hideFooter
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Tên kế hoạch</span>
                <strong className="text-slate-900">{viewingPlan.title}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Khu liên hợp</span>
                <strong className="text-slate-900">{viewingPlan.complexName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Thời gian tuần</span>
                <strong className="text-slate-900">
                  Tuần {viewingPlan.weekNumber} ({formatDateStr(viewingPlan.startDate)} ➔ {formatDateStr(viewingPlan.endDate)})
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Đơn vị thực hiện</span>
                <strong className="text-slate-900">{viewingPlan.enterpriseName || viewingPlan.farmName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Trạng thái</span>
                <StatusBadge status={viewingPlan.status} />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ghi chú</span>
                <span className="text-slate-700">{viewingPlan.notes || '—'}</span>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-800 text-sm mb-2">Danh sách nhiệm vụ ({viewingPlan.tasks.length})</h4>
              <div className="space-y-2">
                {viewingPlan.tasks.map((t, idx) => (
                  <div key={t.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {idx + 1}. {t.jobName} ({t.jobCode})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        📍 {t.location} | 🚜 {t.machineType} | ⏱️ {t.scheduledDays}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">
                        {isConstruction ? `${t.durationHours} giờ máy` : `${t.targetQuantity} ${t.targetUnit}`}
                      </div>
                      <span className="text-[10px] text-amber-700 font-semibold">{t.assignedVehiclesCount} xe</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setViewingPlan(null)}>
                Đóng
              </Button>
              <Button
                icon={<Truck className="h-3.5 w-3.5" />}
                onClick={() => {
                  setViewingPlan(null);
                  navigate('/lenh-dieu-xe/danh-sach');
                }}
              >
                Xem danh sách điều xe
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. MODAL CHỈNH SỬA KẾ HOẠCH TUẦN */}
      {editingPlan && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPlan(null)}
          title={`Chỉnh sửa Kế hoạch: ${editingPlan.code}`}
          size="lg"
          hideFooter
        >
          <form onSubmit={handleSaveEditPlan} className="grid gap-3 text-xs sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold">Tên kế hoạch tuần</span>
              <input name="title" required defaultValue={editingPlan.title} className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <label>
              <span className="mb-1 block font-bold">Mã kế hoạch</span>
              <input name="code" required defaultValue={editingPlan.code} className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold" />
            </label>

            <label>
              <span className="mb-1 block font-bold">Khu liên hợp</span>
              <select name="complexCode" defaultValue={editingPlan.complexCode} className="w-full rounded-xl border border-slate-200 p-2 outline-none">
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block font-bold">Tuần số</span>
              <select name="weekNumber" defaultValue={editingPlan.weekNumber} className="w-full rounded-xl border border-slate-200 p-2 outline-none">
                {weeksOfYear.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block font-bold">Trạng thái</span>
              <select name="status" defaultValue={editingPlan.status} className="w-full rounded-xl border border-slate-200 p-2 outline-none">
                <option value="DRAFT">Bản nháp</option>
                <option value="APPROVED">Đã duyệt / Sẵn sàng</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block font-bold">Ngày bắt đầu</span>
              <input type="date" name="startDate" required defaultValue={editingPlan.startDate} className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <label>
              <span className="mb-1 block font-bold">Ngày kết thúc</span>
              <input type="date" name="endDate" required defaultValue={editingPlan.endDate} className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <label>
              <span className="mb-1 block font-bold">Đơn vị / Xí nghiệp</span>
              <input name="enterpriseName" defaultValue={editingPlan.enterpriseName} className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <label>
              <span className="mb-1 block font-bold">Đội xe / Ban chuyên trách</span>
              <input name="farmName" defaultValue={editingPlan.farmName} className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold">Ghi chú chung kế hoạch</span>
              <textarea name="notes" rows={2} defaultValue={editingPlan.notes} className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                Hủy
              </Button>
              <Button type="submit">Lưu cập nhật</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. MODAL THÊM CÔNG VIỆC MỚI VÀO TUẦN NÀY */}
      {addingTaskPlan && (
        <Modal
          isOpen={true}
          onClose={() => setAddingTaskPlan(null)}
          title={`Thêm công việc vào Kế hoạch tuần: ${addingTaskPlan.code}`}
          size="lg"
          hideFooter
        >
          <form onSubmit={handleAddTaskToPlan} className="grid gap-3 text-xs sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold">Danh mục công việc</span>
              <input type="hidden" name="jobCatalogCode" value={addJobCode} />
              <SearchableSelect value={addJobCode} onChange={setAddJobCode} options={catalogJobs.map((job) => ({ value: job.code, label: `${job.code}: ${job.name}`, subLabel: `${job.categoryName} • ${job.quotaPerShift}` }))} placeholder="Chọn công việc từ danh mục..." allowCustomInput={false} />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold">{isConstruction ? 'Khu vực / tuyến thi công' : 'Tuyến vận chuyển nội bộ'}</span>
              <input type="hidden" name="locationCatalogCode" value={addLocationCode} />
              <SearchableSelect value={addLocationCode} onChange={setAddLocationCode} options={catalogLocations.map((location) => ({ value: location.code, label: `${location.code}: ${location.name}`, subLabel: isConstruction && 'targetScope' in location ? location.targetScope : !isConstruction && 'distanceKm' in location ? `${location.distanceKm} km` : '' }))} placeholder="Chọn từ danh mục lô/tuyến..." allowCustomInput={false} />
            </label>

            <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">
              <b>{selectedAddJob?.recommendedVehicle || 'Chưa có xe khuyến nghị'}</b> · {selectedAddJob?.implementGroup || 'Không có thiết bị phụ trợ'} · ĐVT {selectedAddJob?.defaultUnit || '—'}<br />
              Địa bàn: {selectedAddLocation ? `${selectedAddLocation.code}: ${selectedAddLocation.name}` : 'Chưa chọn'}
            </div>

            <label>
              <span className="mb-1 block font-bold">Lịch thực hiện</span>
              <input name="scheduledDays" defaultValue="Thứ 2 - Thứ 4" className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <label>
              <span className="mb-1 block font-bold">{isConstruction ? 'Giờ máy dự kiến' : 'Khối lượng dự kiến'}</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                name={isConstruction ? 'durationHours' : 'targetQuantity'}
                required
                defaultValue={8}
                className="w-full rounded-xl border border-slate-200 p-2"
              />
            </label>

            <label>
              <span className="mb-1 block font-bold">Đơn vị tính</span>
              <input readOnly value={selectedAddJob?.defaultUnit || (isConstruction ? 'm³' : 'Tấn')} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold text-slate-600" />
            </label>

            <label>
              <span className="mb-1 block font-bold">Số xe/máy cần</span>
              <input type="number" min="1" name="assignedVehiclesCount" required defaultValue={1} className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <label>
              <span className="mb-1 block font-bold">{isConstruction ? 'Khối lượng thiết kế' : 'Số giờ chạy ước tính'}</span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                name={isConstruction ? 'targetQuantity' : 'durationHours'}
                required
                defaultValue={isConstruction ? 500 : 5}
                className="w-full rounded-xl border border-slate-200 p-2"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block font-bold">Lưu ý kỹ thuật</span>
              <input name="notes" placeholder="VD: Yêu cầu lu lèn đầm nén đạt chuẩn K95..." className="w-full rounded-xl border border-slate-200 p-2" />
            </label>

            <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setAddingTaskPlan(null)}>
                Hủy
              </Button>
              <Button type="submit">Thêm công việc</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 8. MODAL LẬP KẾ HOẠCH TUẦN MỚI */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={isConstruction ? 'Lập Kế hoạch Công trình & Ca máy theo tuần' : 'Lập Kế hoạch Vận chuyển nội bộ theo tuần'}
        size="lg"
        hideFooter
      >
        <form onSubmit={handleCreateNewPlan} className="grid gap-3 text-xs sm:grid-cols-2">
          <label>
            <span className="mb-1 block font-bold">Khu liên hợp</span>
            <select name="complexCode" required className="w-full rounded-xl border border-slate-200 p-2 outline-none">
              <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
              <option value="SNOUL">Khu liên hợp Snoul</option>
              <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block font-bold">Thuộc tuần</span>
            <select name="weekNumber" required defaultValue={currentIsoWeek} className="w-full rounded-xl border border-slate-200 p-2 outline-none">
              {weeksOfYear.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block font-bold">Tên kế hoạch tuần</span>
            <input
              name="title"
              required
              placeholder={isConstruction ? 'VD: Kế hoạch cải tạo nền đường & nạo vét mương Tuần 36...' : 'VD: Kế hoạch tiếp ứng nhiên liệu & chở chuối xuất khẩu Tuần 36...'}
              className="w-full rounded-xl border border-slate-200 p-2"
            />
          </label>

          <label>
            <span className="mb-1 block font-bold">Mã kế hoạch</span>
            <input
              name="code"
              required
              defaultValue={`${isConstruction ? 'KH-CT' : 'KH-VC'}-2026-W${String(plans.length + 36)}`}
              className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold"
            />
          </label>

          <label>
            <span className="mb-1 block font-bold">Phân loại hạng mục</span>
            <input readOnly value={selectedCreateJob?.categoryName || 'Chọn công việc ở phần dưới'} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-600" />
          </label>

          <label>
            <span className="mb-1 block font-bold">Ngày bắt đầu tuần</span>
            <input type="date" name="startDate" required defaultValue="2026-08-31" className="w-full rounded-xl border border-slate-200 p-2" />
          </label>

          <label>
            <span className="mb-1 block font-bold">Ngày kết thúc tuần</span>
            <input type="date" name="endDate" required defaultValue="2026-09-06" className="w-full rounded-xl border border-slate-200 p-2" />
          </label>

          <div className="sm:col-span-2 border-t border-slate-200 pt-2">
            <h4 className="font-extrabold text-slate-800 mb-2">Nhiệm vụ đầu tiên trong tuần</h4>
          </div>

          <label className="sm:col-span-2">
            <span className="mb-1 block font-bold">Danh mục công việc</span>
            <input type="hidden" name="jobCatalogCode" value={createJobCode} />
            <SearchableSelect value={createJobCode} onChange={setCreateJobCode} options={catalogJobs.map((job) => ({ value: job.code, label: `${job.code}: ${job.name}`, subLabel: `${job.categoryName} • ${job.quotaPerShift} • ${job.defaultUnit}` }))} placeholder="Chọn công việc từ danh mục..." allowCustomInput={false} />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block font-bold">{isConstruction ? 'Khu vực / tuyến thi công' : 'Tuyến vận chuyển nội bộ'}</span>
            <input type="hidden" name="locationCatalogCode" value={createLocationCode} />
            <SearchableSelect value={createLocationCode} onChange={setCreateLocationCode} options={catalogLocations.map((location) => ({ value: location.code, label: `${location.code}: ${location.name}`, subLabel: isConstruction && 'targetScope' in location ? location.targetScope : !isConstruction && 'distanceKm' in location ? `${location.distanceKm} km` : '' }))} placeholder="Chọn địa bàn từ danh mục..." allowCustomInput={false} />
          </label>

          <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900">
            Đầu máy khuyến nghị: <b>{selectedCreateJob?.recommendedVehicle || '—'}</b> · Thiết bị: {selectedCreateJob?.implementGroup || '—'} · ĐVT: {selectedCreateJob?.defaultUnit || '—'}<br />
            Địa bàn: {selectedCreateLocation ? `${selectedCreateLocation.code}: ${selectedCreateLocation.name}` : 'Chưa chọn'}
          </div>

          <label>
            <span className="mb-1 block font-bold">{isConstruction ? 'Giờ máy dự kiến' : 'Số giờ chạy dự kiến'}</span>
            <input type="number" step="0.5" name="firstTaskDuration" defaultValue={8} className="w-full rounded-xl border border-slate-200 p-2" />
          </label>

          <label>
            <span className="mb-1 block font-bold">Số xe/máy cần</span>
            <input type="number" min="1" name="firstTaskVehicles" defaultValue={2} className="w-full rounded-xl border border-slate-200 p-2" />
          </label>

          <label>
            <span className="mb-1 block font-bold">Khối lượng kế hoạch</span>
            <input type="number" min="0.1" step="0.1" name="firstTaskQuantity" defaultValue={1} className="w-full rounded-xl border border-slate-200 p-2" />
          </label>

          <label>
            <span className="mb-1 block font-bold">Đơn vị tính từ danh mục</span>
            <input readOnly value={selectedCreateJob?.defaultUnit || (isConstruction ? 'm³' : 'Tấn')} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold text-slate-600" />
          </label>

          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <Button type="submit">Lưu kế hoạch</Button>
          </div>
        </form>
      </Modal>

      {/* 9. MODAL CỨU HỘ SOS KHẨN CẤP */}
      <SosRescueModal isOpen={showSosModal} onClose={() => setShowSosModal(false)} />
    </div>
  );
};
