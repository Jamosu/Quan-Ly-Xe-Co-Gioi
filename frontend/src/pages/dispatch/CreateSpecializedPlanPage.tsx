import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  MapPin,
  Wrench,
  Truck,
  HardHat,
  Clock,
  Save,
  CheckCircle2,
  FileText,
  Layers,
  Lock,
  Sparkles,
  Edit2,
  User,
  ArrowRight,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../../components/operations/OperationUi';
import {
  SpecializedPlanKind,
  SpecializedWeeklyPlan,
  SpecializedTaskItem,
  INITIAL_CONSTRUCTION_PLANS,
  INITIAL_TRANSPORT_PLANS,
  normalizeSpecializedPlanStatuses,
} from './SpecializedPlansPage';
import { syncSpecializedPlanTasksToDispatch } from './specializedPlanSync';
import {
  getMonday,
  getWeekNumber,
  toDateKey,
  getWeeksOfYear,
  WeekOption,
  formatDateStr,
} from './ProductionPlanPage';
import {
  DAYS_OF_WEEK,
  parseSingleDay,
  getDayDateShort,
  getDayDateFull,
  parseScheduledDays,
  getDaysInRange,
  getDayActualDate,
  isDayInPast,
  getAvailableDaysForWeek,
} from './CreateProductionPlanPage';
import { getStoredJobs, getStoredStages } from '../../data/jobCatalogData';
import {
  getStoredConstructionSites,
  getStoredConstructionTeams,
  getStoredTransportRoutes,
} from '../../data/locationCatalogData';

const KLH_OPTIONS = [
  { code: 'KOUN_MOM', name: 'Khu liên hợp Koun Mom' },
  { code: 'SNOUL', name: 'Khu liên hợp Snoul' },
  { code: 'NAM_LAO', name: 'Khu liên hợp Nam Lào' },
];

const CONSTRUCTION_CATEGORIES = [
  { code: 'SAN_GAT', name: 'San gạt & Lu lèn nền đường' },
  { code: 'DAO_MUONG', name: 'Nạo vét & Đào mương' },
  { code: 'DAO_HO', name: 'Đào hố móng & Hồ chứa nước' },
  { code: 'MAT_BANG', name: 'Cải tạo mặt bằng & Bãi tập kết' },
  { code: 'DE_BAO', name: 'Đắp bờ bao & Đê ngăn lũ' },
  { code: 'KHAC', name: 'Hạng mục khác' },
];

const TRANSPORT_CATEGORIES = [
  { code: 'NHIEN_LIEU', name: 'Nhiên liệu & Nước sinh hoạt' },
  { code: 'NONG_SAN', name: 'Chuối & Nông sản xuất khẩu' },
  { code: 'PHAN_BON', name: 'Phân bón & Vật tư nông nghiệp' },
  { code: 'THIET_BI', name: 'Nông cụ, Phụ tùng & Ống tưới' },
  { code: 'KHAC', name: 'Hàng hóa khác' },
];

const STORAGE_KEYS: Record<SpecializedPlanKind, string> = {
  CONSTRUCTION: 'thaco_weekly_construction_plans_v3',
  TRANSPORT: 'thaco_weekly_transport_plans_v3',
};

// Helper format datetime dd/mm/yyyy hh:mm
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

export const CreateSpecializedPlanPage: React.FC<{ kind: SpecializedPlanKind }> = ({ kind }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPlanId = searchParams.get('editPlanId');
  const mode = searchParams.get('mode');
  const isViewMode = mode === 'view';
  const isConstruction = kind === 'CONSTRUCTION';

  const backUrl = isConstruction
    ? '/lenh-dieu-xe/ke-hoach/cong-trinh'
    : '/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo';

  // Lấy danh sách kế hoạch từ localStorage hoặc fallback kế hoạch mẫu
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

  const editingPlan = useMemo(() => {
    if (!editPlanId) return null;
    return plans.find((p) => p.id === editPlanId) || null;
  }, [editPlanId, plans]);

  // Tính số tuần ISO thực tế theo thời gian hiện tại
  const currentIsoWeek = useMemo(() => getWeekNumber(new Date()), []);

  const isPastPlan = useMemo(() => {
    if (!editingPlan) return false;
    return (
      editingPlan.status === 'OVERDUE' ||
      editingPlan.status === 'COMPLETED' ||
      (editingPlan.weekNumber !== undefined && editingPlan.weekNumber < currentIsoWeek)
    );
  }, [editingPlan, currentIsoWeek]);

  // Năm & Tuần
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return editingPlan?.year || 2026;
  });

  const weeksOfYear = useMemo(() => {
    return [...getWeeksOfYear(selectedYear)].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [selectedYear]);

  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => {
    if (editingPlan) {
      return editingPlan.weekNumber;
    }
    return currentIsoWeek <= 52 ? currentIsoWeek : 37;
  });

  // Tìm thông tin tuần đã chọn
  const activeWeek = useMemo(() => {
    return weeksOfYear.find((w) => w.weekNumber === selectedWeekNumber) || weeksOfYear[0];
  }, [weeksOfYear, selectedWeekNumber]);

  const [startDate, setStartDate] = useState<string>(() => {
    if (editingPlan?.startDate) return editingPlan.startDate;
    const initialW = weeksOfYear.find((w) => w.weekNumber === (editingPlan?.weekNumber || (currentIsoWeek <= 52 ? currentIsoWeek : 37)));
    return initialW?.startDateKey || toDateKey(new Date());
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (editingPlan?.endDate) return editingPlan.endDate;
    const initialW = weeksOfYear.find((w) => w.weekNumber === (editingPlan?.weekNumber || (currentIsoWeek <= 52 ? currentIsoWeek : 37)));
    return initialW?.endDateKey || toDateKey(new Date());
  });

  // Phân cấp đơn vị
  const [complexCode, setComplexCode] = useState<'KOUN_MOM' | 'SNOUL' | 'NAM_LAO'>(() => {
    return editingPlan?.complexCode || 'KOUN_MOM';
  });

  const [enterpriseName, setEnterpriseName] = useState<string>(() => {
    if (editingPlan?.enterpriseName) return editingPlan.enterpriseName;
    return isConstruction ? 'Ban Quản lý Xây dựng & Hạ tầng Koun Mom' : 'XN Vận tải Koun Mom';
  });

  const [farmName, setFarmName] = useState<string>(() => {
    if (editingPlan?.farmName) return editingPlan.farmName;
    return isConstruction ? 'Đội Xe Cơ giới Thi công Công trình 1' : 'Đội Vận chuyển Đường dài';
  });

  // Hạng mục (Giai đoạn công việc lấy từ danh mục)
  const [categoryCode, setCategoryCode] = useState<string>(() => {
    if (editingPlan?.categoryCode) return editingPlan.categoryCode;
    return isConstruction ? 'DAO_DAP' : 'CHUYEN_CHUOI';
  });

  // Mã & Tiêu đề
  const [planCode, setPlanCode] = useState<string>(() => {
    if (editingPlan?.code) return editingPlan.code;
    return `${isConstruction ? 'KH-CT' : 'KH-VC'}-${selectedYear}-W${selectedWeekNumber}`;
  });

  const [planTitle, setPlanTitle] = useState<string>(() => {
    if (editingPlan?.title) return editingPlan.title;
    return isConstruction
      ? `Kế hoạch cải tạo đường giao thông & ca máy Tuần ${selectedWeekNumber}`
      : `Kế hoạch điều phối vận chuyển nội bộ & tiếp liệu Tuần ${selectedWeekNumber}`;
  });

  // Người lập (Tên user) & Thời gian lập
  const [createdByUser, setCreatedByUser] = useState<string>(() => {
    return editingPlan?.createdBy || 'Chau Tiểu Long';
  });

  const [createdAt] = useState<string>(() => {
    return editingPlan?.createdAt || new Date().toISOString();
  });

  // Trạng thái & Ghi chú
  const [status, setStatus] = useState<SpecializedWeeklyPlan['status']>(() => {
    return editingPlan?.status || 'APPROVED';
  });

  const [notes, setNotes] = useState<string>(() => {
    return editingPlan?.notes || '';
  });

  // Danh sách công việc
  const [tasks, setTasks] = useState<SpecializedTaskItem[]>(() => {
    if (editingPlan?.tasks && editingPlan.tasks.length > 0) {
      return JSON.parse(JSON.stringify(editingPlan.tasks));
    }
    return [
      {
        id: `TASK-${Date.now()}-1`,
        jobCode: '',
        jobName: '',
        category: '',
        location: '',
        origin: undefined,
        destination: undefined,
        machineType: '',
        operatorName: '',
        durationHours: 0,
        targetQuantity: 0,
        targetUnit: '',
        assignedVehiclesCount: 1,
        scheduledDays: 'Thứ 2',
        notes: '',
        status: 'PENDING',
      },
    ];
  });

  // Tự động đồng bộ toàn bộ dữ liệu khi editingPlan được tìm thấy hoặc URL đổi editPlanId
  React.useEffect(() => {
    if (editingPlan) {
      setSelectedYear(editingPlan.year || 2026);
      setSelectedWeekNumber(editingPlan.weekNumber);
      setStartDate(editingPlan.startDate);
      setEndDate(editingPlan.endDate);
      setComplexCode(editingPlan.complexCode);
      setEnterpriseName(
        editingPlan.enterpriseName ||
          (isConstruction ? 'Ban Quản lý Xây dựng & Hạ tầng Koun Mom' : 'XN Vận tải Koun Mom')
      );
      setFarmName(
        editingPlan.farmName ||
          (isConstruction ? 'Đội Xe Cơ giới Thi công Công trình 1' : 'Đội Vận chuyển Đường dài')
      );
      setCategoryCode(editingPlan.categoryCode || (isConstruction ? 'DAO_DAP' : 'CHUYEN_CHUOI'));
      setPlanCode(editingPlan.code);
      setPlanTitle(editingPlan.title);
      setCreatedByUser(editingPlan.createdBy || 'Chau Tiểu Long');
      setStatus(editingPlan.status);
      setNotes(editingPlan.notes || '');

      const existingTasks =
        editingPlan.tasks && editingPlan.tasks.length > 0
          ? JSON.parse(JSON.stringify(editingPlan.tasks))
          : [];

      const shouldAddNew = searchParams.get('addNewTask') === 'true';

      if (shouldAddNew && !isPastPlan) {
        const newTask: SpecializedTaskItem = {
          id: `TASK-${Date.now()}-${existingTasks.length + 1}`,
          jobCode: '',
          jobName: '',
          category: '',
          location: '',
          origin: undefined,
          destination: undefined,
          machineType: '',
          operatorName: '',
          durationHours: 0,
          targetQuantity: 0,
          targetUnit: '',
          assignedVehiclesCount: 1,
          scheduledDays: 'Thứ 2',
          notes: '',
          status: 'PENDING',
        };
        setTasks([...existingTasks, newTask]);
      } else {
        setTasks(
          existingTasks.length > 0
            ? existingTasks
            : [
                {
                  id: `TASK-${Date.now()}-1`,
                  jobCode: '',
                  jobName: '',
                  category: '',
                  location: '',
                  origin: undefined,
                  destination: undefined,
                  machineType: '',
                  operatorName: '',
                  durationHours: 0,
                  targetQuantity: 0,
                  targetUnit: '',
                  assignedVehiclesCount: 1,
                  scheduledDays: 'Thứ 2',
                  notes: '',
                  status: 'PENDING',
                },
              ]
        );
      }
    }
  }, [editingPlan, isConstruction, isPastPlan, searchParams]);

  // Thống kê tổng hợp
  const totalHoursOrQty = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (isConstruction ? t.durationHours : t.targetQuantity), 0);
  }, [tasks, isConstruction]);

  const totalVehicles = useMemo(() => {
    return tasks.reduce((sum, t) => sum + t.assignedVehiclesCount, 0);
  }, [tasks]);

  // Options cho Khu liên hợp
  const complexOptions: SelectOption[] = useMemo(
    () =>
      KLH_OPTIONS.map((k) => ({
        value: k.code,
        label: `${k.name} (${k.code})`,
      })),
    []
  );

  // Options cho Đội thi công cơ giới (Từ Tab 6 - Đội thi công cơ giới)
  const teamOptions: SelectOption[] = useMemo(() => {
    const teams = getStoredConstructionTeams();
    const filtered = complexCode ? teams.filter((t) => t.complexCode === complexCode) : teams;
    return filtered.map((t) => ({
      value: t.name,
      label: `${t.code}: ${t.name}`,
      subLabel: `Đội trưởng: ${t.leaderName} (${t.leaderPhone}) • ${t.machineCount}`,
    }));
  }, [complexCode]);

  // Options cho Năm làm việc
  const yearOptions: SelectOption[] = useMemo(
    () => [
      { value: '2025', label: 'Năm 2025' },
      { value: '2026', label: 'Năm 2026' },
      { value: '2027', label: 'Năm 2027' },
      { value: '2028', label: 'Năm 2028' },
    ],
    []
  );

  // Options cho Tuần làm việc với ngày chi tiết
  const weekOptions: SelectOption[] = useMemo(() => {
    return weeksOfYear.map((w) => ({
      value: String(w.weekNumber),
      label: w.label,
    }));
  }, [weeksOfYear]);

  // Phân loại hạng mục lấy từ danh mục chuẩn (http://localhost:5173/danh-muc/loai-cong-viec/cong-trinh?tab=stages)
  const specializedStages = useMemo(() => {
    const raw = getStoredStages();
    const targetType = isConstruction ? 'CONG_TRINH' : 'VAN_CHUYEN';
    const filtered = raw.filter((s) => s.planType === targetType && s.status !== 'inactive');
    if (filtered.length > 0) {
      return filtered.sort((a, b) => a.sequence - b.sequence);
    }
    return isConstruction
      ? [
          { id: '1', code: 'DAO_DAP', name: '1. Đào đắp mương máng & hồ đập', description: 'Đào mương trục chính, nạo vét bùn lắng, đào hố móng hồ lắng sinh học', planType: 'CONG_TRINH' as const, sequence: 1, status: 'active' as const },
          { id: '2', code: 'SAN_LAP', name: '2. San lấp mặt bằng & tạo cos nền', description: 'Ủi gạt tạo mặt bằng sân bãi, đắp bờ bao ngăn lũ và kè chống sạt lở', planType: 'CONG_TRINH' as const, sequence: 2, status: 'active' as const },
          { id: '3', code: 'GIAO_THONG', name: '3. Mở đường & Lu lèn giao thông nội bộ', description: 'Bù vê tạo mặt đường, rải cấp phối đá dăm và lu rung đạt K95', planType: 'CONG_TRINH' as const, sequence: 3, status: 'active' as const },
          { id: '4', code: 'BAO_DUONG', name: '4. Nạo vét & Duy tu hạ tầng công trình', description: 'Duy tu định kỳ đường trục nội bộ và hệ thống mương máng mùa mưa lũ', planType: 'CONG_TRINH' as const, sequence: 4, status: 'active' as const },
        ]
      : [
          { id: '1', code: 'CHUYEN_CHUOI', name: '1. Vận chuyển chuối xuất khẩu', description: 'Chở buồng tươi về xưởng đóng gói và chở cont lạnh 40ft', planType: 'VAN_CHUYEN' as const, sequence: 1, status: 'active' as const },
          { id: '2', code: 'CHUYEN_THUC_AN', name: '2. Vận chuyển thức ăn gia súc (Bò)', description: 'Chở thân lá chuối tươi, bắp sinh khối', planType: 'VAN_CHUYEN' as const, sequence: 2, status: 'active' as const },
          { id: '3', code: 'CHUYEN_VAT_TU', name: '3. Vận chuyển phân bón & vật tư', description: 'Vận chuyển phân bón, vôi, ống tưới', planType: 'VAN_CHUYEN' as const, sequence: 3, status: 'active' as const },
          { id: '4', code: 'CHUYEN_NOI_BO', name: '4. Tiếp liệu & Điều chuyển cơ giới', description: 'Tiếp ứng dầu Diesel, nước sinh hoạt', planType: 'VAN_CHUYEN' as const, sequence: 4, status: 'active' as const },
        ];
  }, [isConstruction]);

  const categoryOptions: SelectOption[] = useMemo(() => {
    return specializedStages.map((s) => ({
      value: s.code,
      label: s.name,
      subLabel: s.description,
    }));
  }, [specializedStages]);

  // Danh mục công việc chuẩn tương ứng theo loại kế hoạch (Công trình hoặc Vận chuyển)
  const catalogJobs = useMemo(() => {
    const targetPlanType = isConstruction ? 'CONG_TRINH' : 'VAN_CHUYEN';
    return getStoredJobs().filter((j) => j.planType === targetPlanType);
  }, [isConstruction]);

  const constructionSites = useMemo(() => getStoredConstructionSites(), []);
  const transportRoutes = useMemo(() => getStoredTransportRoutes(), []);

  // Options hiển thị cho SearchableSelect Hạng mục công việc (giống màn hình mẫu của người dùng)
  const jobOptions: SelectOption[] = useMemo(() => {
    return catalogJobs.map((j) => ({
      value: j.code,
      label: `${j.code}: ${j.name}`,
      subLabel: `${j.recommendedVehicle || j.implementGroup} • ${j.quotaPerShift}`,
    }));
  }, [catalogJobs]);

  // Options gợi ý Tuyến đường / Vị trí (Lấy từ Danh mục Địa bàn & Tuyến đường chuẩn hóa)
  const locationOptions: SelectOption[] = useMemo(() => {
    if (isConstruction) {
      const sites = constructionSites;
      const filtered = complexCode ? sites.filter((s) => s.complexCode === complexCode) : sites;
      const list = filtered.length > 0 ? filtered : sites;
      return list.map((s) => ({
        value: s.name,
        label: `${s.code}: ${s.name}`,
        subLabel: `${s.categoryName} • Quy mô: ${s.targetScope} (${s.complexName})`,
      }));
    } else {
      const routes = transportRoutes;
      const filtered = complexCode ? routes.filter((r) => r.complexCode === complexCode) : routes;
      const list = filtered.length > 0 ? filtered : routes;
      return list.map((r) => ({
        value: `${r.origin} ➔ ${r.destination}`,
        label: `${r.code}: ${r.name}`,
        subLabel: `Từ ${r.origin} ➔ Đến ${r.destination} • ${r.distanceKm} km • ${r.cargoType}`,
      }));
    }
  }, [isConstruction, complexCode, constructionSites, transportRoutes]);

  // Options gợi ý Chủng loại Máy / Phương tiện
  const machineOptions: SelectOption[] = useMemo(() => {
    if (isConstruction) {
      return [
        { value: 'Máy san gạt GD555-5', label: 'Máy san gạt GD555-5', subLabel: 'Công suất 140HP • San gạt mặt đường' },
        { value: 'Xe lu rung Sakai 14 tấn', label: 'Xe lu rung Sakai 14 tấn', subLabel: 'Trọng lượng 14T • Đầm nén nền K95' },
        { value: 'Máy xúc bánh xích Komatsu PC200', label: 'Máy xúc bánh xích Komatsu PC200', subLabel: 'Dung tích gàu 0.8m³ • Đào mương/hố' },
        { value: 'Máy ủi bánh xích Cat D6', label: 'Máy ủi bánh xích Cat D6', subLabel: 'Công suất 170HP • Ủi đất, đắp bờ bao' },
        { value: 'Xe ben Howo 3 chân 15 tấn', label: 'Xe ben Howo 3 chân 15 tấn', subLabel: 'Tải trọng 15T • Vận chuyển đất đá san lấp' },
      ];
    } else {
      return [
        { value: 'Xe tải ben 8 - 10 tấn', label: 'Xe tải ben 8 - 10 tấn', subLabel: 'Chở phụ phẩm tươi, bắp sinh khối' },
        { value: 'Xe tải bồn xi-téc dầu DO 10m³', label: 'Xe tải bồn xi-téc dầu DO 10m³', subLabel: 'Tiếp nhiên liệu cơ giới lưu động' },
        { value: 'Đầu kéo container 40 feet', label: 'Đầu kéo container 40 feet', subLabel: 'Vận chuyển chuối xuất khẩu ra cảng' },
        { value: 'Đoàn rơ-moóc kéo chuối 40-50HP', label: 'Đoàn rơ-moóc kéo chuối 40-50HP', subLabel: 'Kéo buồng chuối thu hoạch về xưởng' },
        { value: 'Xe bồn cấp nước sinh hoạt 8m³', label: 'Xe bồn cấp nước sinh hoạt 8m³', subLabel: 'Cấp nước sinh hoạt xí nghiệp, trại bò' },
      ];
    }
  }, [isConstruction]);

  // Cập nhật trường của 1 task
  const handleUpdateTaskField = <K extends keyof SpecializedTaskItem>(
    index: number,
    field: K,
    val: SpecializedTaskItem[K]
  ) => {
    setTasks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Chọn hoặc nhập công việc qua SearchableSelect (Select Text combobox)
  const handleChangeTaskJob = (index: number, val: string) => {
    const found = catalogJobs.find(
      (j) => j.code === val || j.name === val || `${j.code}: ${j.name}` === val
    );
    if (found) {
      setTasks((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          jobCode: found.code,
          jobName: found.name,
          category: found.categoryCode,
          machineType: found.recommendedVehicle || found.implementGroup || next[index].machineType,
          targetUnit: found.defaultUnit || next[index].targetUnit,
          durationHours: isConstruction ? 8 : next[index].durationHours,
          targetQuantity: isConstruction ? 2 : next[index].targetQuantity,
          notes: found.description || next[index].notes,
        };
        return next;
      });
    } else {
      // Khi người dùng tự gõ text bất kỳ (ví dụ "1123")
      setTasks((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          jobCode: val.trim() && val.startsWith('CV-') ? val : '',
          jobName: val,
        };
        return next;
      });
    }
  };

  const handleChangeTaskLocation = (index: number, val: string) => {
    if (isConstruction) {
      const site = constructionSites.find(
        (item) => item.code === val || item.name === val || `${item.code}: ${item.name}` === val
      );
      if (!site) return;
      setTasks((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], location: `${site.code}: ${site.name}` };
        return next;
      });
      return;
    }

    const route = transportRoutes.find(
      (item) =>
        item.code === val ||
        item.name === val ||
        `${item.origin} ➔ ${item.destination}` === val ||
        `${item.code}: ${item.name}` === val
    );
    if (!route) return;
    setTasks((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        location: `${route.origin} ➔ ${route.destination}`,
        origin: route.origin,
        destination: route.destination,
      };
      return next;
    });
  };

  // Cập nhật ngày thực hiện trong tuần
  const handleUpdateScheduleDay = (index: number, dayVal: string) => {
    handleUpdateTaskField(index, 'scheduledDays', dayVal);
  };

  const handleUpdateScheduleDays = (
    index: number,
    part: 'from' | 'to',
    dayValue: string,
    currentScheduledDays?: string
  ) => {
    const current = parseScheduledDays(currentScheduledDays);
    let newFrom = part === 'from' ? dayValue : current.fromDay;
    let newTo = part === 'to' ? dayValue : current.toDay;

    const fromIdx = DAYS_OF_WEEK.indexOf(newFrom);
    const toIdx = DAYS_OF_WEEK.indexOf(newTo);
    if (fromIdx > toIdx) {
      newTo = newFrom;
    }

    const combined = newFrom === newTo ? newFrom : `${newFrom} - ${newTo}`;
    handleUpdateTaskField(index, 'scheduledDays', combined);
  };

  // Thêm công việc mới vào bảng
  const handleAddTask = () => {
    if (isPastPlan) {
      alert('Kế hoạch này thuộc tuần đã qua trong quá khứ, không được phép nhập thêm công việc mới!');
      return;
    }
    const defaultAvailableDay = getAvailableDaysForWeek(activeWeek, isViewMode)[0] || 'Thứ 2';
    const nextIdx = tasks.length + 1;
    const newTask: SpecializedTaskItem = {
      id: `TASK-${Date.now()}-${nextIdx}`,
      jobCode: '',
      jobName: '',
      category: '',
      location: '',
      origin: undefined,
      destination: undefined,
      machineType: '',
      operatorName: '',
      durationHours: 0,
      targetQuantity: 0,
      targetUnit: '',
      assignedVehiclesCount: 1,
      scheduledDays: defaultAvailableDay,
      notes: '',
      status: 'PENDING',
    };
    setTasks([...tasks, newTask]);
  };

  // Xóa công việc
  const handleRemoveTask = (index: number) => {
    if (tasks.length <= 1) {
      alert('Kế hoạch tuần phải có ít nhất 1 hạng mục công việc!');
      return;
    }
    setTasks(tasks.filter((_, idx) => idx !== index));
  };

  // Lưu kế hoạch (DRAFT hoặc APPROVED)
  const handleSave = (targetStatus: SpecializedWeeklyPlan['status']) => {
    if (!planTitle.trim()) {
      alert('Vui lòng nhập Tên kế hoạch tuần!');
      return;
    }
    if (!planCode.trim()) {
      alert('Vui lòng nhập Mã kế hoạch!');
      return;
    }
    if (tasks.length === 0) {
      alert('Kế hoạch cần ít nhất 1 hạng mục nhiệm vụ!');
      return;
    }

    const currentKlhName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || 'Khu liên hợp Koun Mom';
    const catList = isConstruction ? CONSTRUCTION_CATEGORIES : TRANSPORT_CATEGORIES;
    const categoryName = catList.find((c) => c.code === categoryCode)?.name || 'Hạng mục cơ giới';

    const normalizedPlan: SpecializedWeeklyPlan = {
      id: editingPlan?.id || `PLAN-${isConstruction ? 'CT' : 'VC'}-W${selectedWeekNumber}-${Date.now().toString().slice(-4)}`,
      code: planCode.trim(),
      title: planTitle.trim(),
      complexCode,
      complexName: currentKlhName,
      enterpriseName,
      farmName,
      categoryCode,
      categoryName,
      weekNumber: selectedWeekNumber,
      year: selectedYear,
      startDate: startDate || activeWeek?.startDateKey || toDateKey(new Date()),
      endDate: endDate || activeWeek?.endDateKey || toDateKey(new Date()),
      status: targetStatus,
      notes,
      createdAt,
      createdBy: createdByUser.trim() || 'Chau Tiểu Long',
      tasks,
    };

    let updatedPlans: SpecializedWeeklyPlan[];
    if (editingPlan) {
      updatedPlans = plans.map((p) => (p.id === editingPlan.id ? normalizedPlan : p));
    } else {
      updatedPlans = [normalizedPlan, ...plans];
    }

    // Lưu vào localStorage
    localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(updatedPlans));

    // Nếu kế hoạch được duyệt, tự động nạp vào danh sách điều xe
    if (targetStatus === 'APPROVED') {
      syncSpecializedPlanTasksToDispatch(normalizedPlan, tasks, kind);
    }

    alert(
      targetStatus === 'APPROVED'
        ? `Đã lưu & phê duyệt Kế hoạch ${isConstruction ? 'Công trình' : 'Vận chuyển'} Tuần ${selectedWeekNumber} (${planCode}) thành công! Các công việc đã tự động nạp vào danh sách điều xe.`
        : `Đã lưu bản nháp Kế hoạch Tuần ${selectedWeekNumber} (${planCode})!`
    );

    navigate(backUrl);
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* 1. BREADCRUMBS & TIÊU ĐỀ TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <button
              type="button"
              onClick={() => navigate(backUrl)}
              className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isConstruction ? 'Kế hoạch Công trình & Ca máy' : 'Kế hoạch Vận chuyển nội bộ'}
            </button>
            <span>/</span>
            <span className="text-slate-800 font-bold">
              {isViewMode
                ? `Chi tiết: ${editingPlan?.code || ''}`
                : editingPlan
                ? 'Chỉnh sửa kế hoạch'
                : 'Lập kế hoạch tuần mới'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {isViewMode
                  ? `Chi tiết Kế hoạch: ${editingPlan?.code || ''}`
                  : editingPlan
                  ? `Chỉnh sửa Kế hoạch: ${editingPlan.code}`
                  : isConstruction
                  ? 'Lập Kế hoạch Công trình & Ca máy'
                  : 'Lập Kế hoạch Vận chuyển nội bộ'}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-300">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Tuần {selectedWeekNumber} ({selectedYear})
                </span>
                {editingPlan?.status && <StatusBadge status={editingPlan.status} />}
              </h1>
            </div>
          </div>
        </div>

        {/* NÚT THAO TÁC TRÊN HEADER */}
        <div className="flex items-center gap-2 shrink-0">
          {isViewMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(backUrl)}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
                icon={<ArrowLeft className="h-3.5 w-3.5" />}
              >
                Quay lại danh sách
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() =>
                  navigate(
                    `${
                      isConstruction
                        ? '/lenh-dieu-xe/ke-hoach/cong-trinh/tao-moi'
                        : '/lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo/tao-moi'
                    }?editPlanId=${editPlanId}`
                  )
                }
                className="h-9 px-4 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 active:scale-98 cursor-pointer"
                icon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Chuyển sang Chỉnh sửa
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(backUrl)}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                Hủy bỏ
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSave('DRAFT')}
                className="h-9 px-3.5 text-xs font-bold border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                icon={<Save className="h-3.5 w-3.5" />}
              >
                Lưu bản nháp
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSave('APPROVED')}
                className="h-9 px-4 text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-200 active:scale-98 cursor-pointer"
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                {editingPlan ? 'Lưu cập nhật kế hoạch' : 'Lưu & Phê duyệt kế hoạch'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. CARD 1: CẤU HÌNH TUẦN, PHÂN CẤP ĐƠN VỊ & NGƯỜI LẬP (DANH MỤC TIÊU CHUẨN) */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Thông tin Tuần Kế hoạch & Phân cấp đơn vị thực hiện
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/90 rounded-xl px-3 py-1 text-xs font-bold text-emerald-800">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              Thời gian tuần: {formatDateStr(startDate)} ➔ {formatDateStr(endDate)} ({selectedYear})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột trái: Năm, Tuần, Mã và Tiêu đề kế hoạch (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/90 rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" /> THỜI GIAN TUẦN & MÃ KẾ HOẠCH
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Năm làm việc: <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={String(selectedYear)}
                  onChange={(val) => setSelectedYear(Number(val))}
                  options={yearOptions}
                  placeholder="Chọn năm"
                  disabled={isViewMode}
                  heightClass="h-9"
                  bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Mã kế hoạch: <span className="text-rose-500">*</span>
                </label>
                <input
                  value={planCode}
                  disabled={isViewMode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  placeholder="VD: KH-CT-2026-W36"
                  className={`w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs ${
                    isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tên kế hoạch sản xuất: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={planTitle}
                disabled={isViewMode}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="Nhập tên kế hoạch chi tiết..."
                className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs resize-y min-h-[64px] leading-relaxed transition-all ${
                  isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Chọn Tuần sản xuất trong năm: <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={String(selectedWeekNumber)}
                onChange={(val) => {
                  const w = Number(val);
                  setSelectedWeekNumber(w);
                  const targetW = weeksOfYear.find((x) => x.weekNumber === w);
                  if (targetW) {
                    setStartDate(targetW.startDateKey);
                    setEndDate(targetW.endDateKey);
                  }
                  if (!editingPlan) {
                    setPlanCode(`${isConstruction ? 'KH-CT' : 'KH-VC'}-${selectedYear}-W${w}`);
                    setPlanTitle(
                      isConstruction
                        ? `Kế hoạch cải tạo đường giao thông & ca máy Tuần ${w}`
                        : `Kế hoạch điều phối vận chuyển nội bộ & tiếp liệu Tuần ${w}`
                    );
                  }
                }}
                options={weekOptions}
                placeholder="Chọn tuần sản xuất"
                disabled={isViewMode}
                heightClass="h-9"
                bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Phân loại hạng mục (1 kế hoạch / 1 hạng mục): <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={categoryCode}
                onChange={(val) => setCategoryCode(val)}
                options={categoryOptions}
                placeholder="Chọn phân loại hạng mục..."
                disabled={isViewMode}
                heightClass="h-9"
                bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
              />
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày bắt đầu tuần (Thứ Hai):</span>
                <strong className="text-slate-800">{formatDateStr(startDate)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày kết thúc tuần (Chủ Nhật):</span>
                <strong className="text-slate-800">{formatDateStr(endDate)}</strong>
              </div>
            </div>
          </div>

          {/* Cột phải: Phân cấp Đơn vị & Đội thi công (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                {isConstruction ? 'Phân cấp Đơn vị & Đội thi công (Ban Xây dựng)' : 'Phân cấp Đơn vị & Đoàn vận chuyển'}
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {isConstruction ? '1. KLH ➔ 2. Ban Xây dựng ➔ 3. Đội thi công' : '1. KLH ➔ 2. Xí nghiệp ➔ 3. Đội vận chuyển'}
              </span>
            </div>

            {isConstruction ? (
              <div className="space-y-3.5">
                {/* 1. Khu liên hợp */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Khu liên hợp: <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    value={complexCode}
                    onChange={(val) => {
                      const cCode = val as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
                      setComplexCode(cCode);
                      const defaultUnit =
                        cCode === 'SNOUL'
                          ? 'Ban Quản lý Xây dựng & Hạ tầng Snoul'
                          : cCode === 'NAM_LAO'
                          ? 'Ban Quản lý Xây dựng & Hạ tầng Nam Lào'
                          : 'Ban Quản lý Xây dựng & Hạ tầng Koun Mom';
                      setEnterpriseName(defaultUnit);
                      const teams = getStoredConstructionTeams().filter((t) => t.complexCode === cCode);
                      if (teams.length > 0) {
                        setFarmName(teams[0].name);
                      }
                    }}
                    options={complexOptions}
                    placeholder="Chọn Khu liên hợp..."
                    disabled={isViewMode}
                    heightClass="h-9"
                    bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                  />
                </div>

                {/* 2. Đơn vị quản lý */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Đơn vị quản lý (Ban Xây dựng): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={enterpriseName}
                    disabled={isViewMode}
                    onChange={(e) => setEnterpriseName(e.target.value)}
                    placeholder="VD: Ban Quản lý Xây dựng & Hạ tầng Koun Mom"
                    className={`w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none shadow-2xs ${
                      isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>

                {/* 3. Đội thi công cơ giới */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Đội thi công cơ giới (Ban Xây dựng): <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    value={farmName}
                    onChange={(val) => setFarmName(val)}
                    options={teamOptions}
                    placeholder="Chọn Đội thi công cơ giới..."
                    disabled={isViewMode}
                    allowCustomInput={true}
                    heightClass="h-9"
                    bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 1. Khu liên hợp */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Khu liên hợp: <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    value={complexCode}
                    onChange={(val) => {
                      const cCode = val as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
                      setComplexCode(cCode);
                    }}
                    options={complexOptions}
                    placeholder="Chọn Khu liên hợp..."
                    disabled={isViewMode}
                    heightClass="h-9"
                    bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                  />
                </div>

                {/* 2. Xí nghiệp / Ban vận tải */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Xí nghiệp / Ban vận tải: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={enterpriseName}
                    disabled={isViewMode}
                    onChange={(e) => setEnterpriseName(e.target.value)}
                    placeholder="VD: XN Vận tải Koun Mom"
                    className={`w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none shadow-2xs ${
                      isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>

                {/* 3. Đội xe / Đoàn vận chuyển */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Đội xe / Đoàn vận chuyển: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={farmName}
                    disabled={isViewMode}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="VD: Đội Vận chuyển Đường dài"
                    className={`w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none shadow-2xs ${
                      isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. CARD 2: BẢNG DANH SÁCH NHIỆM VỤ CHI TIẾT TRONG TUẦN */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
        {isPastPlan && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-2.5 text-xs font-bold shadow-2xs">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Kế hoạch này thuộc tuần đã qua trong quá khứ ({formatDateStr(startDate)} ➔ {formatDateStr(endDate)}). Hệ thống đã khóa tính năng thêm công việc mới vào kế hoạch này.
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
              2
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                {isConstruction ? <HardHat className="h-4 w-4 text-amber-600" /> : <Truck className="h-4 w-4 text-blue-600" />}
                Danh sách Hạng mục Công việc / Nhiệm vụ trong tuần
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isConstruction
                  ? 'Phân rã từng công việc san lấp, nạo vét, lu lèn và giờ máy thi công'
                  : 'Phân rã từng lộ trình vận chuyển, loại hàng, khối lượng và phương tiện vận tải'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Box thống kê tổng hợp */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
              <span>
                Công việc: <strong className="text-blue-700">{tasks.length}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                {isConstruction ? 'Tổng giờ máy:' : 'Tổng khối lượng:'}{' '}
                <strong className="text-emerald-700">
                  {totalHoursOrQty.toLocaleString('vi-VN')} {isConstruction ? 'giờ' : 'đơn vị'}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Nhu cầu máy: <strong className="text-amber-700">{totalVehicles} xe</strong>
              </span>
            </div>

            {!isViewMode && !isPastPlan && (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs active:scale-98"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleAddTask}
              >
                Thêm công việc
              </Button>
            )}
          </div>
        </div>

        <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[340px]">
                    {isConstruction ? 'Hạng mục công việc' : 'Nhu cầu vận chuyển / Hàng hóa'}
                  </th>
                  <th className="py-2.5 px-3 min-w-[260px]">
                    {isConstruction ? 'Tuyến / Vị trí thi công' : 'Tuyến nhận – giao'}
                  </th>
                  <th className="py-2.5 px-3 min-w-[240px]">
                    {isConstruction ? 'Máy công trình & Thợ máy' : 'Phương tiện & Tài xế'}
                  </th>
                  <th className="py-2.5 px-2.5 text-center w-28 min-w-[110px]">
                    {isConstruction ? 'Giờ máy' : 'Khối lượng'}
                  </th>
                  <th className="py-2.5 px-2.5 text-center w-24 min-w-[95px]">Nhu cầu máy</th>
                  <th className="py-2.5 px-3 text-center min-w-[200px]">Lịch trong tuần</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Lưu ý kỹ thuật</th>
                  {!isViewMode && <th className="py-2.5 px-2 text-center w-12">Xóa</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task, index) => {
                  const currentDay = parseSingleDay(task.scheduledDays);
                  const dateShort = getDayDateShort(currentDay, activeWeek);
                  const dateFull = getDayDateFull(currentDay, activeWeek);

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400 align-middle">
                        {index + 1}
                      </td>

                      {/* Hạng mục công việc: SearchableSelect (Khớp 100% dropdown select text trong ảnh mẫu) */}
                      <td className="py-3 px-3 align-middle">
                        <SearchableSelect
                          value={task.jobCode ? (catalogJobs.some((j) => j.code === task.jobCode) ? task.jobCode : task.jobName) : task.jobName}
                          onChange={(val) => handleChangeTaskJob(index, val)}
                          options={jobOptions}
                          placeholder={isConstruction ? 'Chọn hoặc nhập hạng mục công việc...' : 'Chọn hoặc nhập nhu cầu vận chuyển...'}
                          disabled={isViewMode}
                          allowCustomInput={false}
                          heightClass="h-9"
                          bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                        />
                      </td>

                      {/* Tuyến / Vị trí thực hiện: SearchableSelect */}
                      <td className="py-3 px-3 align-middle">
                        <SearchableSelect
                          value={task.location}
                          onChange={(val) => handleChangeTaskLocation(index, val)}
                          options={locationOptions}
                          placeholder={isConstruction ? 'Chọn/nhập Tuyến/Vị trí thi công...' : 'Chọn/nhập Tuyến nhận – giao...'}
                          disabled={isViewMode}
                          allowCustomInput={false}
                          heightClass="h-9"
                          bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                        />
                      </td>

                      {/* Máy công trình / Phương tiện & Thợ máy / Tài xế */}
                      <td className="py-3 px-3 align-middle">
                        <SearchableSelect
                          value={task.machineType}
                          onChange={(val) => handleUpdateTaskField(index, 'machineType', val)}
                          options={machineOptions}
                          placeholder={isConstruction ? 'Chọn hoặc nhập loại máy công trình...' : 'Chọn hoặc nhập loại phương tiện...'}
                          disabled={isViewMode}
                          allowCustomInput={true}
                          heightClass="h-9"
                          bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                        />
                      </td>

                      {/* Khối lượng / Giờ máy */}
                      <td className="py-3 px-2.5 align-middle space-y-1 text-center">
                        <input
                          type="number"
                          step="0.5"
                          disabled={isViewMode}
                          value={isConstruction ? task.durationHours : task.targetQuantity}
                          onChange={(e) =>
                            handleUpdateTaskField(
                              index,
                              isConstruction ? 'durationHours' : 'targetQuantity',
                              Number(e.target.value)
                            )
                          }
                          className="w-full h-9 rounded-xl border border-slate-200 px-2 text-xs font-black text-center text-slate-900 bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                        />
                        <span className="inline-block text-[10.5px] font-bold text-slate-500">
                          {task.targetUnit || (isConstruction ? 'giờ máy' : 'đơn vị')}
                        </span>
                      </td>

                      {/* Nhu cầu máy: Hộp vàng chuẩn screenshot */}
                      <td className="py-3 px-2.5 align-middle text-center">
                        <input
                          type="number"
                          min={1}
                          disabled={isViewMode}
                          value={task.assignedVehiclesCount}
                          onChange={(e) =>
                            handleUpdateTaskField(index, 'assignedVehiclesCount', Math.max(1, Number(e.target.value)))
                          }
                          className="w-16 h-9 text-center mx-auto rounded-xl border border-amber-300 px-2 text-xs font-black text-amber-900 bg-amber-50 focus:border-amber-500 focus:outline-none shadow-2xs"
                        />
                      </td>

                      {/* Lịch thực hiện trong tuần: Phương án 2 (Từ Thứ ... ➔ Đến Thứ ... kèm Badge số ngày) */}
                      <td className="py-3 px-3 align-middle">
                        {(() => {
                          const { fromDay, toDay } = parseScheduledDays(task.scheduledDays);
                          const availableDays = getAvailableDaysForWeek(activeWeek, isViewMode);

                          // Đảm bảo fromDay không trỏ vào ngày đã qua nếu đang tạo mới/sửa
                          const validFromDay = (() => {
                            if (isViewMode) return fromDay;
                            if (isDayInPast(fromDay, activeWeek) && availableDays.length > 0) {
                              return availableDays[0];
                            }
                            return fromDay;
                          })();

                          // Options cho "Từ": ẩn các ngày đã qua
                          const fromOptions = availableDays.includes(validFromDay)
                            ? availableDays
                            : [validFromDay, ...availableDays];

                          // Options cho "Đến": chỉ hiển thị từ validFromDay trở đi (không cho chọn ngược)
                          const fromIdx = DAYS_OF_WEEK.indexOf(validFromDay);
                          const toOptions = fromOptions.filter((d) => DAYS_OF_WEEK.indexOf(d) >= fromIdx);

                          // Đảm bảo toDay >= validFromDay
                          const validToDay = (() => {
                            const toIdx = DAYS_OF_WEEK.indexOf(toDay);
                            if (toIdx < fromIdx || !toOptions.includes(toDay)) {
                              return validFromDay;
                            }
                            return toDay;
                          })();

                          const daysList = getDaysInRange(validFromDay, validToDay);
                          const fromShort = getDayDateShort(validFromDay, activeWeek);
                          const toShort = getDayDateShort(validToDay, activeWeek);
                          const isMultiDay = daysList.length > 1;

                          return (
                            <div className="space-y-1 min-w-[245px]">
                              <div className="flex items-center gap-1 bg-slate-50/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="text-[10px] font-extrabold text-slate-400 pl-1 shrink-0">Từ</span>
                                <select
                                  value={validFromDay}
                                  disabled={isViewMode}
                                  onChange={(e) => handleUpdateScheduleDays(index, 'from', e.target.value, task.scheduledDays)}
                                  className={`w-full rounded-lg border border-slate-200 px-1 py-1 text-[11px] font-bold text-slate-800 focus:border-emerald-600 focus:outline-none ${
                                    isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white cursor-pointer'
                                  }`}
                                  title="Chọn thứ bắt đầu"
                                >
                                  {fromOptions.map((d) => (
                                    <option key={d} value={d}>
                                      {d} ({getDayDateShort(d, activeWeek)})
                                    </option>
                                  ))}
                                </select>

                                <span className="text-slate-400 font-black text-xs shrink-0 px-0.5">➔</span>

                                <span className="text-[10px] font-extrabold text-slate-400 shrink-0">Đến</span>
                                <select
                                  value={validToDay}
                                  disabled={isViewMode}
                                  onChange={(e) => handleUpdateScheduleDays(index, 'to', e.target.value, task.scheduledDays)}
                                  className={`w-full rounded-lg border border-slate-200 px-1 py-1 text-[11px] font-bold text-slate-800 focus:border-emerald-600 focus:outline-none ${
                                    isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white cursor-pointer'
                                  }`}
                                  title="Chọn thứ kết thúc"
                                >
                                  {toOptions.map((d) => (
                                    <option key={d} value={d}>
                                      {d} ({getDayDateShort(d, activeWeek)})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Badge hiển thị số ngày & ngày cụ thể gọn gàng */}
                              <div className="flex items-center justify-between px-1 text-[10.5px]">
                                <span
                                  className={`inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-md border shadow-2xs ${
                                    isMultiDay
                                      ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                                      : 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                                  }`}
                                >
                                  {isMultiDay ? `⚡ ${daysList.length} ngày: ${fromShort} ➔ ${toShort}` : `📅 ${fromShort}`}
                                </span>
                                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Sinh {daysList.length} lệnh ca
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Lưu ý kỹ thuật */}
                      <td className="py-3 px-3 align-middle">
                        <input
                          disabled={isViewMode}
                          value={task.notes || ''}
                          onChange={(e) => handleUpdateTaskField(index, 'notes', e.target.value)}
                          placeholder="Lưu ý kỹ thuật, tiến độ..."
                          className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-800 bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                        />
                      </td>

                      {/* Nút xóa dòng */}
                      {!isViewMode && (
                        <td className="py-3 px-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa công việc này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. CARD 3: GHI CHÚ CHUNG KẾ HOẠCH & LƯU Ý VẬN HÀNH */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
            3
          </span>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Ghi chú chung & Yêu cầu điều hành tuần
          </h2>
        </div>

        <div>
          <textarea
            rows={3}
            disabled={isViewMode}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isConstruction
                ? 'Nhập yêu cầu điều hành ca máy, xử lý nền đất yếu, phương án thi công khi gặp mưa...'
                : 'Nhập ghi chú yêu cầu kiểm tra áp suất lốp xe bồn, đảm bảo niêm phong chì hàng container...'
            }
            className={`w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none shadow-2xs ${
              isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white'
            }`}
          />
        </div>
      </section>
    </div>
  );
};
