import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ArrowLeft,
  Plus,
  Trash2,
  ListPlus,
  Building2,
  MapPin,
  Wrench,
  Tractor,
  Clock,
  Save,
  CheckCircle2,
  FileText,
  Layers,
  Sparkles,
  Info,
  Send,
  AlertCircle,
  ArrowRight,
  Edit2,
  User,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import { StatusBadge } from '../../components/operations/OperationUi';
import { operationsApi } from '../../api/operations';
import { apiClient } from '../../api/client';
import {
  WeeklyPlanItem,
  WeeklyTaskItem,
  STANDARD_JOBS,
  STAGES,
  INITIAL_WEEKLY_PLANS,
  getMonday,
  getWeekNumber,
  toDateKey,
  formatDateStr,
  formatDateTimeStr,
  getWeeksOfYear,
  WeekOption,
} from './ProductionPlanPage';
import { getStoredPlots } from '../../data/locationCatalogData';
import { getStoredJobs, getStoredStages } from '../../data/jobCatalogData';
import {
  mockComplexes,
  mockEnterprises,
  mockFarms,
} from '../../data/catalogData';

// Các thứ trong tuần làm việc cơ giới
export const DAYS_OF_WEEK = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật',
];

// Helper parse chuỗi lịch để lấy 1 Thứ đơn (mặc định Thứ 2)
export const parseSingleDay = (val?: string): string => {
  if (!val) return 'Thứ 2';
  const match = DAYS_OF_WEEK.find((d) => val.includes(d));
  return match || 'Thứ 2';
};

// Helper tính ngày ngắn (VD: 07/09) theo Thứ và Tuần đang chọn
export const getDayDateShort = (dayName: string, activeWeek?: WeekOption): string => {
  if (!activeWeek?.monday) return '';
  const idx = DAYS_OF_WEEK.findIndex((d) => dayName.startsWith(d));
  if (idx === -1) return '';
  const d = new Date(activeWeek.monday);
  d.setDate(d.getDate() + idx);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

// Helper tính ngày đầy đủ (VD: 07/09/2026) theo Thứ và Tuần đang chọn
export const getDayDateFull = (dayName: string, activeWeek?: WeekOption): string => {
  if (!activeWeek?.monday) return '';
  const idx = DAYS_OF_WEEK.findIndex((d) => dayName.startsWith(d));
  if (idx === -1) return '';
  const d = new Date(activeWeek.monday);
  d.setDate(d.getDate() + idx);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Helper parse chuỗi "Thứ 2 - Thứ 4" thành { fromDay, toDay } (backward compatible)
export const parseScheduledDays = (val?: string): { fromDay: string; toDay: string } => {
  if (!val) return { fromDay: 'Thứ 2', toDay: 'Thứ 2' };
  if (val.includes('-')) {
    const parts = val.split('-').map((s) => s.trim());
    const from = DAYS_OF_WEEK.find((d) => parts[0].includes(d)) || 'Thứ 2';
    const to = DAYS_OF_WEEK.find((d) => parts[1].includes(d)) || from;
    return { fromDay: from, toDay: to };
  }
  const match = DAYS_OF_WEEK.find((d) => val.includes(d));
  if (match) return { fromDay: match, toDay: match };
  return { fromDay: 'Thứ 2', toDay: 'Thứ 2' };
};

// Helper lấy danh sách các Thứ trong dải từ fromDay đến toDay (chặn chọn ngược)
export const getDaysInRange = (fromDay: string, toDay: string): string[] => {
  const fromIdx = DAYS_OF_WEEK.indexOf(fromDay);
  const toIdx = DAYS_OF_WEEK.indexOf(toDay);
  if (fromIdx === -1 || toIdx === -1) return [fromDay || 'Thứ 2'];
  if (fromIdx <= toIdx) {
    return DAYS_OF_WEEK.slice(fromIdx, toIdx + 1);
  }
  // Không cho chọn ngược: nếu fromIdx > toIdx thì chỉ trả về fromDay
  return [fromDay];
};

// Helper kiểm tra Thứ có thuộc ngày đã qua trong quá khứ so với hôm nay hay không
export const isDayInPast = (dayName: string, activeWeek?: WeekOption): boolean => {
  if (!activeWeek?.monday) return false;
  const idx = DAYS_OF_WEEK.findIndex((d) => dayName.startsWith(d));
  if (idx === -1) return false;
  const d = new Date(activeWeek.monday);
  d.setDate(d.getDate() + idx);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

// Helper lấy danh sách các Thứ hợp lệ cho tuần (nếu tuần hiện tại thì ẩn các thứ đã qua)
export const getAvailableDaysForWeek = (activeWeek?: WeekOption, isViewOnly?: boolean): string[] => {
  if (isViewOnly) return DAYS_OF_WEEK;
  const filtered = DAYS_OF_WEEK.filter((d) => !isDayInPast(d, activeWeek));
  return filtered.length > 0 ? filtered : DAYS_OF_WEEK;
};

// Helper tính Date cụ thể của một Thứ theo ngày bắt đầu tuần (startDate) của kế hoạch
export const getDayActualDate = (dayName: string, baseMonday?: Date | string): Date => {
  const d = baseMonday ? new Date(baseMonday) : new Date();
  const idx = DAYS_OF_WEEK.findIndex((day) => dayName.startsWith(day));
  if (idx !== -1) {
    d.setDate(d.getDate() + idx);
  }
  return d;
};

export const CreateProductionPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPlanId = searchParams.get('editPlanId');
  const mode = searchParams.get('mode');
  const isViewMode = mode === 'view';

  // Quản lý danh sách kế hoạch từ localStorage
  const [plans, setPlans] = useState<WeeklyPlanItem[]>(() => {
    try {
      const saved = localStorage.getItem('thaco_weekly_agri_plans_v7');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return INITIAL_WEEKLY_PLANS;
  });

  const editingPlan = useMemo(() => {
    if (!editPlanId) return null;
    return plans.find((p) => p.id === editPlanId) || null;
  }, [editPlanId, plans]);

  // Năm & Tuần
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (editingPlan) {
      return new Date(editingPlan.startDate).getFullYear();
    }
    return 2026;
  });

  const weeksOfYear = useMemo(() => {
    return [...getWeeksOfYear(selectedYear)].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [selectedYear]);

  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => {
    if (editingPlan) {
      return editingPlan.weekNumber;
    }
    const currIso = getWeekNumber(new Date());
    return currIso <= 52 ? currIso : 37;
  });

  // Tìm tuần đã chọn
  const activeWeek = useMemo(() => {
    return weeksOfYear.find((w) => w.weekNumber === selectedWeekNumber) || weeksOfYear[0];
  }, [weeksOfYear, selectedWeekNumber]);

  // ==========================================
  // 1 2 3 4: PHÂN CẤP TỪ DANH MỤC DÙNG CHUNG
  // ==========================================
  const complexesList = useMemo(() => mockComplexes, []);

  // Cấp 1: Khu liên hợp
  const [complexCode, setComplexCode] = useState<string>(() => {
    return editingPlan?.complexCode || '';
  });

  const currentComplex = useMemo(() => {
    if (!complexCode) return undefined;
    return complexesList.find((k) => k.code === complexCode);
  }, [complexesList, complexCode]);

  // Cấp 2: Xí nghiệp (lọc theo complexCode)
  const availableEnterprises = useMemo(() => {
    if (!complexCode) return [];
    const list = mockEnterprises.filter((e) => e.parentCode === complexCode);
    return list;
  }, [complexCode]);

  const [enterpriseCode, setEnterpriseCode] = useState<string>(() => {
    if (editingPlan?.enterpriseCode) return editingPlan.enterpriseCode;
    return '';
  });

  const currentEnterprise = useMemo(() => {
    if (!enterpriseCode) return undefined;
    return availableEnterprises.find((e) => e.code === enterpriseCode);
  }, [availableEnterprises, enterpriseCode]);

  // Cấp 3: Nông trường (lọc theo enterpriseCode)
  const availableFarms = useMemo(() => {
    if (!enterpriseCode) return [];
    const list = mockFarms.filter((f) => f.parentCode === enterpriseCode);
    return list.length > 0 ? list : mockFarms.filter((f) => f.parentCode?.startsWith(enterpriseCode.slice(0, 3)));
  }, [enterpriseCode]);

  const [farmCode, setFarmCode] = useState<string>(() => {
    if (editingPlan?.farmCode) return editingPlan.farmCode;
    return '';
  });

  const currentFarm = useMemo(() => {
    if (!farmCode) return undefined;
    return availableFarms.find((f) => f.code === farmCode);
  }, [availableFarms, farmCode]);

  // Cấp 4: Danh mục Lô / Thửa gợi ý theo Nông trường & Xí nghiệp
  const suggestedPlots = useMemo(() => {
    if (!currentFarm) return [];
    const prefix = currentFarm.name.replace('Nông trường ', '').trim();
    return [
      `Lô ${prefix}-A01 (Thửa 01 - 04)`,
      `Lô ${prefix}-A02 (Thửa 05 - 08)`,
      `Lô ${prefix}-B01 (Thửa 01 - 06)`,
      `Lô ${prefix}-B02 (Thửa 07 - 12)`,
      `Lô CN-A12 (Thửa 01 - 04)`,
      `Lô CN-A12 (Thửa 05 - 08)`,
      `Lô CN-B06 (Thửa 01 - 03)`,
      `Lô mở rộng KH-${selectedWeekNumber}`,
    ];
  }, [currentFarm, selectedWeekNumber]);

  const [plotPlot, setPlotPlot] = useState<string>(() => {
    return editingPlan?.defaultPlot || '';
  });

  // Options dạng SelectOption cho SearchableSelect
  const complexOptions: SelectOption[] = useMemo(() => {
    return complexesList.map((k) => ({
      value: k.code,
      label: `${k.name} (${k.code})`,
    }));
  }, [complexesList]);

  const enterpriseOptions: SelectOption[] = useMemo(() => {
    return availableEnterprises.map((e) => ({
      value: e.code,
      label: `${e.name} (${e.code})`,
    }));
  }, [availableEnterprises]);

  const farmOptions: SelectOption[] = useMemo(() => {
    return availableFarms.map((f) => ({
      value: f.code,
      label: `${f.name} (${f.code})`,
    }));
  }, [availableFarms]);

  const plotOptions: SelectOption[] = useMemo(() => {
    // Chỉ hiển thị dữ liệu Lô/Thửa khi đã chọn đủ 3 cấp: Khu liên hợp -> Xí nghiệp -> Nông trường
    if (!complexCode || !enterpriseCode || !farmCode || !currentFarm) {
      return [];
    }
    const stored = getStoredPlots();
    let filtered = stored.filter((p) => p.complexCode === complexCode);
    const farmName = currentFarm.name.toLowerCase();
    const farmMatched = filtered.filter((p) => {
      const pFarm = p.farmName.toLowerCase();
      return pFarm.includes(farmName) || farmName.includes(pFarm);
    });
    if (farmMatched.length > 0) {
      filtered = farmMatched;
    }
    const fromMaster = filtered.map((p) => ({
      value: `${p.code}: ${p.name}`,
      label: `${p.code}: ${p.name}`,
      subLabel: `${p.farmName} • ${p.areaHa} ha • ${p.cropType}`,
    }));
    return fromMaster;
  }, [complexCode, enterpriseCode, farmCode, currentFarm]);

  const yearOptions: SelectOption[] = useMemo(
    () => [
      { value: '2025', label: 'Năm 2025' },
      { value: '2026', label: 'Năm 2026' },
      { value: '2027', label: 'Năm 2027' },
      { value: '2028', label: 'Năm 2028' },
    ],
    []
  );

  const weekOptions: SelectOption[] = useMemo(() => {
    return weeksOfYear.map((w) => ({
      value: String(w.weekNumber),
      label: w.label,
    }));
  }, [weeksOfYear]);

  // Giai đoạn sản xuất của kế hoạch (1 kế hoạch chỉ làm 1 giai đoạn)
  const [selectedStageCode, setSelectedStageCode] = useState<string>(() => {
    if (editingPlan?.stageCode) return editingPlan.stageCode;
    if (editingPlan?.tasks && editingPlan.tasks.length > 0 && editingPlan.tasks[0].stageCode) {
      return editingPlan.tasks[0].stageCode;
    }
    return 'LAM_DAT';
  });

  const [stagesVersion, setStagesVersion] = useState(0);

  useEffect(() => {
    const handleStorageChange = () => setStagesVersion((v) => v + 1);
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const agriculturalStages = useMemo(() => {
    const raw = getStoredStages();
    const agri = raw.filter(
      (stage) => (stage.planType === 'NONG_NGHIEP' || !stage.planType) && stage.status !== 'inactive'
    );
    // Khử trùng lặp tuyệt đối theo stage.code
    const unique = new Map<string, (typeof agri)[0]>();
    agri.forEach((s) => {
      const codeKey = s.code?.trim().toUpperCase();
      if (codeKey && !unique.has(codeKey)) {
        unique.set(codeKey, s);
      }
    });

    if (unique.size > 0) {
      return Array.from(unique.values()).sort((a, b) => a.sequence - b.sequence);
    }
    return [
      { id: 'STG-NN-01', code: 'LAM_DAT', name: '1. Làm đất', planType: 'NONG_NGHIEP' as const, description: 'Cày sâu 30cm, bừa đĩa tơi xốp, phay xới tạo luống', sequence: 1, status: 'active' as const },
      { id: 'STG-NN-02', code: 'TRONG_MOI', name: '2. Trồng mới & Chăm sóc', planType: 'NONG_NGHIEP' as const, description: 'Khoan hố đặt bầu, rải vôi khử trùng, bón lót hữu cơ, phun thuốc BVTV', sequence: 2, status: 'active' as const },
      { id: 'STG-NN-03', code: 'THU_HOACH', name: '3. Thu hoạch', planType: 'NONG_NGHIEP' as const, description: 'Cắt buồng chuối, gom kéo mooc về trạm đóng gói, băm nghiền thân cây', sequence: 3, status: 'active' as const },
    ];
  }, [stagesVersion]);

  const stageOptions: SelectOption[] = useMemo(
    () =>
      agriculturalStages.map((stage) => ({
        value: stage.code,
        label: stage.name,
        subLabel: stage.description,
      })),
    [agriculturalStages]
  );

  const currentStageInfo = useMemo(() => {
    if (!selectedStageCode) {
      return {
        label: 'Chưa chọn giai đoạn',
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
      };
    }
    const catalogStage = agriculturalStages.find((stage) => stage.code === selectedStageCode);
    const stageStyle = STAGES[selectedStageCode];
    return (
      (stageStyle ? { ...stageStyle, label: catalogStage?.name || stageStyle.label } : null) || {
        label: catalogStage?.name || selectedStageCode,
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      }
    );
  }, [agriculturalStages, selectedStageCode]);

  const planningJobs = useMemo(() => {
    return getStoredJobs()
      .filter((job) => job.planType === 'NONG_NGHIEP')
      .map((job) => {
        const legacyDefaults = STANDARD_JOBS.find((item) => item.code === job.code);
        const quotaMatch = job.quotaPerShift?.match(/[\d.,]+/);
        const parsedQuota = quotaMatch
          ? Number(quotaMatch[0].replace(/\./g, '').replace(',', '.'))
          : NaN;
        return {
          code: job.code,
          name: job.name,
          stageCode: job.categoryCode,
          stageName: job.categoryName,
          implementGroup: job.implementGroup,
          recommendedVehicle: job.recommendedVehicle,
          defaultQuota: Number.isFinite(parsedQuota) ? parsedQuota : legacyDefaults?.defaultQuota || 1,
          defaultVehicles: legacyDefaults?.defaultVehicles || 1,
        };
      });
  }, []);

  // Danh mục công việc lọc theo giai đoạn đã chọn
  const availableJobsForStage = useMemo(() => {
    if (!selectedStageCode) return planningJobs;
    const list = planningJobs.filter((j) => j.stageCode === selectedStageCode);
    return list.length > 0 ? list : planningJobs;
  }, [planningJobs, selectedStageCode]);

  const jobOptions: SelectOption[] = useMemo(() => {
    return availableJobsForStage.map((j) => ({
      value: j.code,
      label: `${j.code}: ${j.name}`,
      subLabel: j.implementGroup,
    }));
  }, [availableJobsForStage]);

  // Danh sách công việc trong kế hoạch tuần (Mặc định trống khi tạo kế hoạch mới)
  const [formTasks, setFormTasks] = useState<WeeklyTaskItem[]>(() => {
    if (editingPlan && editingPlan.tasks && editingPlan.tasks.length > 0) {
      return JSON.parse(JSON.stringify(editingPlan.tasks));
    }
    return [];
  });

  // Tên kế hoạch sản xuất
  const [planTitle, setPlanTitle] = useState<string>(() => {
    if (editingPlan) return editingPlan.title;
    return '';
  });
  const [isTitleCustomEdited, setIsTitleCustomEdited] = useState(false);

  // Mã kế hoạch tự sinh theo chuẩn: KH-{NĂM}-W{Tuần hiện tại}-XXXX
  const [planCode, setPlanCode] = useState<string>(() => {
    if (editingPlan) return editingPlan.code;
    return `KH-${selectedYear}-W${selectedWeekNumber}-${Date.now().toString().slice(-4)}`;
  });

  // Ghi chú chung
  const [notes, setNotes] = useState<string>(() => {
    return editingPlan?.notes || '';
  });

  // Người lập (Tên user) & Thời gian lập
  const [createdByUser, setCreatedByUser] = useState<string>(() => {
    return editingPlan?.createdBy || 'Chau Tiểu Long';
  });

  const [createdAt] = useState<string>(() => {
    return editingPlan?.createdAt || new Date().toISOString();
  });

  const hasAddedTaskRef = useRef(false);

  // Đồng bộ lại state khi chuyển sang kế hoạch sửa hoặc có query params
  useEffect(() => {
    if (editingPlan) {
      setSelectedYear(new Date(editingPlan.startDate).getFullYear());
      setSelectedWeekNumber(editingPlan.weekNumber);
      setComplexCode(editingPlan.complexCode);
      setEnterpriseCode(editingPlan.enterpriseCode);
      setFarmCode(editingPlan.farmCode);
      setPlotPlot(editingPlan.defaultPlot || '');
      setSelectedStageCode(editingPlan.stageCode || editingPlan.tasks[0]?.stageCode || 'LAM_DAT');
      setPlanTitle(editingPlan.title);
      setPlanCode(editingPlan.code);
      setNotes(editingPlan.notes || '');
      if (editingPlan.createdBy) setCreatedByUser(editingPlan.createdBy);

      if (!hasAddedTaskRef.current) {
        hasAddedTaskRef.current = true;
        const initialTasks = JSON.parse(JSON.stringify(editingPlan.tasks || []));
        if (searchParams.get('addNewTask') === 'true') {
          const currentStage = editingPlan.stageCode || editingPlan.tasks[0]?.stageCode || 'LAM_DAT';
          initialTasks.push({
            id: `TASK-NEW-${Date.now()}-${initialTasks.length + 1}`,
            jobCode: '',
            jobName: '',
            stageCode: currentStage,
            stageName: editingPlan.stageName || 'Làm đất',
            lotPlot: '',
            implementGroup: '',
            recommendedVehicle: '',
            targetAreaHa: 0,
            assignedVehiclesCount: 0,
            scheduledDays: 'Thứ 2 - Thứ 2',
            notes: '',
            status: 'PENDING',
          });
        }
        setFormTasks(initialTasks);
      }
    }
  }, [editingPlan, planningJobs, searchParams]);

  // Khi người dùng đổi Giai đoạn công việc: cập nhật giai đoạn cho các dòng công việc
  const handleStageChange = (newStageCode: string) => {
    setSelectedStageCode(newStageCode);
    const stageJobs = planningJobs.filter((j) => j.stageCode === newStageCode);
    const firstJob = stageJobs[0] || planningJobs[0];
    const newStageName = firstJob?.stageName || newStageCode;

    setFormTasks((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((t) => ({
        ...t,
        stageCode: newStageCode,
        stageName: newStageName,
      }));
    });
  };

  // Tự động cập nhật planTitle và planCode khi đổi tuần hoặc đơn vị (nếu người dùng chưa gõ tên tùy chỉnh)
  useEffect(() => {
    if (!editingPlan) {
      setPlanCode(`KH-${selectedYear}-W${selectedWeekNumber}-${Date.now().toString().slice(-4)}`);
      if (!isTitleCustomEdited) {
        const entName = currentEnterprise?.name || '';
        const compName = currentComplex?.name || '';
        const unitSuffix = entName ? ` - ${entName}` : compName ? ` - ${compName}` : '';
        setPlanTitle(`Kế hoạch cơ giới sản xuất Tuần ${selectedWeekNumber}${unitSuffix}`);
      }
    }
  }, [selectedWeekNumber, currentEnterprise, currentComplex, editingPlan, isTitleCustomEdited]);

  // Đồng bộ khi đổi KLH
  const handleComplexChange = (newCode: string) => {
    setComplexCode(newCode);
    setEnterpriseCode('');
    setFarmCode('');
    setPlotPlot('');
  };

  // Đồng bộ khi đổi Xí nghiệp
  const handleEnterpriseChange = (newCode: string) => {
    setEnterpriseCode(newCode);
    setFarmCode('');
    setPlotPlot('');
  };

  // Đồng bộ khi đổi Nông trường
  const handleFarmChange = (newCode: string) => {
    setFarmCode(newCode);
    const farm = mockFarms.find((f) => f.code === newCode);
    const matchingPlot = farm
      ? getStoredPlots().find((plot) => {
          const farmName = farm.name.toLowerCase();
          const plotFarmName = plot.farmName.toLowerCase();
          return plotFarmName.includes(farmName) || farmName.includes(plotFarmName);
        })
      : undefined;
    setPlotPlot(matchingPlot ? `${matchingPlot.code}: ${matchingPlot.name}` : '');
  };

  // Thêm 1 dòng công việc mới (trống hoàn toàn ngoại trừ lịch trong tuần)
  const handleAddTask = () => {
    const stageCodeToUse = selectedStageCode || 'LAM_DAT';
    if (!selectedStageCode) {
      setSelectedStageCode('LAM_DAT');
    }
    const defaultAvailableDay = getAvailableDaysForWeek(activeWeek, isViewMode)[0] || 'Thứ 2';
    setFormTasks((prev) => [
      ...prev,
      {
        id: `TASK-NEW-${Date.now()}-${prev.length + 1}`,
        jobCode: '',
        jobName: '',
        stageCode: stageCodeToUse,
        stageName: currentStageInfo.label || '',
        lotPlot: '',
        implementGroup: '',
        recommendedVehicle: '',
        targetAreaHa: 0,
        assignedVehiclesCount: 0,
        scheduledDays: defaultAvailableDay,
        notes: '',
        status: 'PENDING',
      },
    ]);
  };

  // Đổi công việc trên dòng: tự động điền nông cụ & đầu máy theo định mức hoặc lưu tên tùy chỉnh
  const handleChangeTaskJob = (index: number, val: string) => {
    const selectedJob = planningJobs.find((j) => j.code === val || j.name === val);
    if (selectedJob) {
      setFormTasks((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          jobCode: selectedJob.code,
          jobName: selectedJob.name,
          stageCode: selectedJob.stageCode,
          stageName: selectedJob.stageName,
          implementGroup: selectedJob.implementGroup,
          recommendedVehicle: selectedJob.recommendedVehicle,
          targetAreaHa: selectedJob.defaultQuota,
          assignedVehiclesCount: selectedJob.defaultVehicles,
        };
        return copy;
      });
    } else {
      setFormTasks((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          jobCode: `CUSTOM-${Date.now()}`,
          jobName: val,
        };
        return copy;
      });
    }
  };

  // Cập nhật giá trị trường trong dòng công việc
  const handleUpdateTaskField = (index: number, field: keyof WeeklyTaskItem, value: any) => {
    setFormTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Cập nhật lịch: chọn 1 thứ trong tuần
  const handleUpdateScheduleDay = (index: number, dayValue: string) => {
    handleUpdateTaskField(index, 'scheduledDays', dayValue);
  };

  // Cập nhật lịch: chọn từ thứ hoặc đến thứ (không cho chọn ngược)
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

  // Tự động đồng bộ các công việc của kế hoạch đã duyệt sang Danh sách Lệnh Điều Xe
  // NGUYÊN TẮC: MỖI KẾ HOẠCH CON (TASK) LÀ ĐÚNG 1 LỆNH ĐIỀU XE ĐỘC LẬP
  const syncPlanTasksToDispatch = (plan: WeeklyPlanItem, tasks: WeeklyTaskItem[]) => {
    try {
      const storageKey = 'thaco_all_dispatch_orders_master_v4';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as any[];
      const created: any[] = [];

      const planYear = plan.startDate ? new Date(plan.startDate).getFullYear() : new Date().getFullYear();
      const planWeek = plan.weekNumber || getWeekNumber(plan.startDate || new Date());
      const cleanPlanCode = (plan.code || '')
        .replace(/^KH-/, '')
        .replace(/^(20\d\d-)?W\d+-?/, '')
        .replace(/KOUN_MOM/g, 'KM')
        .replace(/SNOUL/g, 'SN')
        .replace(/NAM_LAO/g, 'NL');
      const planIdPart = cleanPlanCode || (plan.id ? String(plan.id).replace(/^AGRI-/, '').slice(-8) : '0001');

      const baseMondayStr = plan.startDate ? String(plan.startDate).slice(0, 10) : '2026-09-07';
      const baseMonday = new Date(baseMondayStr + 'T00:00:00');

      const MOCK_OPERATORS = [
        { id: 93001, fullName: 'Nguyễn Văn Hùng', phone: '0988 123 456', licenseClass: 'Máy kéo hạng A4' },
        { id: 93002, fullName: 'Sokha Chamnan', phone: '+855 88 765 4321', licenseClass: 'Chứng chỉ cơ giới nông nghiệp' },
        { id: 93003, fullName: 'Trần Minh Đức', phone: '0977 456 789', licenseClass: 'Máy kéo hạng A4' },
        { id: 93004, fullName: 'Phạm Quốc Bảo', phone: '0909 888 999', licenseClass: 'Chứng chỉ cơ giới' },
        { id: 93005, fullName: 'Keo Samnang', phone: '+855 97 123 4567', licenseClass: 'Máy kéo hạng A4' },
        { id: 93006, fullName: 'Bounmy Xaysana', phone: '+856 20 555 1234', licenseClass: 'Chứng chỉ cơ giới nông nghiệp' },
      ];

      // DUYỆT TỪNG KẾ HOẠCH CON (TASK) -> MỖI TASK LÀ 1 LỆNH ĐIỀU XE ĐỘC LẬP
      tasks.forEach((task, tIdx) => {
        const taskVehicles = Math.max(1, Number(task.assignedVehiclesCount) || 1);
        const { fromDay, toDay } = parseScheduledDays(task.scheduledDays);
        const days = getDaysInRange(fromDay, toDay);

        days.forEach((dayName, dayIdx) => {
          const dayOrderIdx = DAYS_OF_WEEK.findIndex((d) => dayName.startsWith(d));
          const actualDate = new Date(baseMonday);
          if (dayOrderIdx !== -1) {
            actualDate.setDate(baseMonday.getDate() + dayOrderIdx);
          }
          const year = actualDate.getFullYear();
          const month = String(actualDate.getMonth() + 1).padStart(2, '0');
          const day = String(actualDate.getDate()).padStart(2, '0');
          const dayDateStr = `${year}-${month}-${day}`;
          const dayDateDisplay = `${day}/${month}`;

          // Mã lệnh điều xe: LDX-NN-{NĂM}-W{TUẦN}-{MÃ_KH}-{SỐ_THỨ_TỰ_TASK}
          const taskSeq = String(tIdx + 1).padStart(2, '0');
          const code = days.length > 1
            ? `LDX-NN-${planYear}-W${planWeek}-${planIdPart}-${taskSeq}-D${dayIdx + 1}`
            : `LDX-NN-${planYear}-W${planWeek}-${planIdPart}-${taskSeq}`;

          if (existing.some((order) => order.code === code) || created.some((order) => order.code === code)) return;

          // Danh sách các xe được chọn trong tổ máy kéo
          const baseVehiclePrefix = task.recommendedVehicle?.includes('70') || task.recommendedVehicle?.includes('75')
            ? 'MK-75'
            : (task.recommendedVehicle?.includes('bánh cao') || task.recommendedVehicle?.includes('Boom')
              ? 'MK-BC'
              : (task.recommendedVehicle?.includes('40') ? 'MK-40' : 'MK-50'));

          const vehicleList: string[] = [];
          for (let v = 1; v <= taskVehicles; v++) {
            vehicleList.push(`${baseVehiclePrefix}-0${((tIdx * 2 + v - 1) % 8) + 1}`);
          }
          const primaryVehicleCode = vehicleList[0];

          // Phân công thợ máy
          const assignedDriver = MOCK_OPERATORS[(tIdx * 2 + dayIdx) % MOCK_OPERATORS.length];

          const noteParts: string[] = [];
          if (plan.notes) noteParts.push(`[Ghi chú kế hoạch]: ${plan.notes}`);
          if (task.notes) noteParts.push(`[Ghi chú công việc]: ${task.notes}`);

          const depTime = new Date(`${dayDateStr}T06:30:00`);
          const endTime = new Date(depTime.getTime() + 8 * 3600000);

          const targetArea = Number(task.targetAreaHa) || 0;
          const plannedFuel = Math.round(targetArea * 8);

          const newOrder = {
            id: Date.now() + created.length + tIdx * 100 + dayIdx * 10,
            code,
            orderCategory: 'NONG_NGHIEP',
            categoryLabel: 'Nông nghiệp',
            sourceType: 'PRODUCTION_ORDER',
            unit: plan.farmName || plan.enterpriseName || plan.complexName || 'Nông trường Chuối ERC 1',
            purpose: `${task.jobName} (Tổ ${taskVehicles} máy kéo) - ${dayName} (${dayDateDisplay})`,
            origin: `Bãi máy ${plan.farmName || plan.enterpriseName || plan.complexName || 'Trung tâm'}`,
            destination: task.lotPlot || plan.defaultPlot || 'Lô quy hoạch',
            departureTime: depTime.toISOString(),
            plannedEndTime: endTime.toISOString(),
            status: 'CHO_PHAN_CONG',
            isDelayed: false,

            // Thiết bị & Danh sách tổ xe (Mặc định TRỐNG khi tạo lệnh để điều phối sau)
            vehicle: undefined,
            assignedVehicleList: [],
            assignedVehiclesCount: taskVehicles,

            // Nhân sự vận hành (Mặc định TRỐNG)
            driver: undefined,
            secondaryDriverName: undefined,

            // Nông cụ & khối lượng riêng của kế hoạch con (Mặc định TRỐNG)
            implement: undefined,

            workVolumeTarget: targetArea,
            workVolumeUnit: 'Ha',
            plannedFuelLiters: plannedFuel,
            fuelStatus: 'CHUA_CAP',

            // Liên kết kế hoạch lớn & kế hoạch con
            planCode: plan.code,
            planTitle: plan.title,
            complexName: plan.complexName,
            enterpriseName: plan.enterpriseName,
            farmName: plan.farmName,
            taskJobCode: task.jobCode,
            taskJobName: task.jobName,
            taskPlot: task.lotPlot,
            taskStageName: task.stageName || plan.stageName,

            notes: noteParts.length > 0 ? noteParts.join('\n') : (task.notes || 'Nạp tự động từ Kế hoạch cơ giới sản xuất tuần'),
            planNotes: plan.notes || '',
            taskNotes: task.notes || '',
          };

          created.push(newOrder);

          // Lưu bất đồng bộ xuống Database backend
          try {
            apiClient.post('/dispatch-orders', {
              code: newOrder.code,
              unit: 'NT1',
              purpose: newOrder.purpose,
              origin: newOrder.origin,
              destination: newOrder.destination,
              sourceType: 'PRODUCTION_ORDER',
              departureTime: newOrder.departureTime,
              plannedEndTime: newOrder.plannedEndTime,
              notes: newOrder.notes,
            }).catch(() => {});
          } catch {}
        });
      });

      if (created.length > 0) {
        // Xóa bất kỳ lệnh gộp cũ chưa có hậu tố task nếu có trùng mã cơ sở
        const filteredExisting = existing.filter((ex) => {
          if (ex.code === `LDX-NN-${planYear}-W${planWeek}-${planIdPart}`) return false;
          return true;
        });
        localStorage.setItem(storageKey, JSON.stringify([...created, ...filteredExisting]));
      }
    } catch (err) {
      console.warn('Sync to dispatch master failed:', err);
    }
  };

  // Xóa dòng công việc
  const handleRemoveTask = (index: number) => {
    setFormTasks((prev) => prev.filter((_, i) => i !== index));
  };

  // Tổng kết số liệu KPI tuần
  const totalAreaHa = useMemo(() => {
    return Math.round(formTasks.reduce((sum, t) => sum + (Number(t.targetAreaHa) || 0), 0) * 10) / 10;
  }, [formTasks]);

  const totalVehiclesCount = useMemo(() => {
    return formTasks.reduce((sum, t) => sum + (Number(t.assignedVehiclesCount) || 0), 0);
  }, [formTasks]);

  // Lưu kế hoạch (DRAFT hoặc APPROVED)
  const handleSave = async (status: 'DRAFT' | 'APPROVED') => {
    if (!planCode.trim()) {
      alert('Vui lòng nhập Mã kế hoạch.');
      return;
    }
    if (formTasks.length === 0) {
      alert('Vui lòng thêm ít nhất 1 công việc cơ giới vào kế hoạch tuần.');
      return;
    }

    const startDateStr = activeWeek.startDateKey;
    const endDateStr = activeWeek.endDateKey;
    const complexName = currentComplex?.name || 'Khu liên hợp Koun Mom';
    const enterpriseName = currentEnterprise?.name || '';
    const farmName = currentFarm?.name || '';
    const autoTitle = `Kế hoạch cơ giới sản xuất Tuần ${selectedWeekNumber} - ${enterpriseName || complexName}`;
    const finalTitle = planTitle.trim() || autoTitle;

    const normalizedTasks = formTasks.map((t) => ({
      ...t,
      stageCode: selectedStageCode,
      stageName: currentStageInfo.label,
    }));

    const firstTask = normalizedTasks[0];
    const firstPlot = firstTask?.lotPlot || plotPlot || 'Lô A01';

    let unitEnum = 'NT1';
    if (complexCode === 'SNOUL') unitEnum = 'KLH_SN';
    else if (complexCode === 'NAM_LAO') unitEnum = 'KLH_NL';
    else if (enterpriseCode?.includes('2') || farmCode?.includes('2')) unitEnum = 'NT2';
    else if (enterpriseCode?.includes('3') || farmCode?.includes('3')) unitEnum = 'NT3';

    // Chuẩn bị payload đồng bộ MySQL Database khớp với CreatePlanDto
    const dbPayload = {
      code: planCode,
      title: finalTitle,
      stage: selectedStageCode,
      unit: unitEnum,
      lotPlot: firstPlot,
      targetAreaHa: totalAreaHa > 0 ? totalAreaHa : 1,
      assignedVehiclesCount: totalVehiclesCount > 0 ? totalVehiclesCount : 1,
      startDate: new Date(`${startDateStr}T00:00:00.000Z`).toISOString(),
      endDate: new Date(`${endDateStr}T23:59:59.999Z`).toISOString(),
      complexCode: complexCode || 'KOUN_MOM',
      complexName,
      enterpriseCode,
      enterpriseName,
      farmCode,
      farmName,
      defaultPlot: firstPlot,
      status: status || 'APPROVED',
      notes,
      weekNumber: selectedWeekNumber,
      items: normalizedTasks.map((t) => ({
        plotCode: t.lotPlot || firstPlot,
        plotName: t.lotPlot || firstPlot,
        jobCode: t.jobCode,
        jobName: t.jobName,
        stage: selectedStageCode,
        stageName: t.stageName || currentStageInfo.label,
        implementGroup: t.implementGroup,
        recommendedVehicle: t.recommendedVehicle,
        targetQuantity: Number(t.targetAreaHa) || 0,
        targetAreaHa: Number(t.targetAreaHa) || 0,
        plannedVehicleCount: Number(t.assignedVehiclesCount) || 1,
        assignedVehiclesCount: Number(t.assignedVehiclesCount) || 1,
        scheduledDays: t.scheduledDays,
        notes: t.notes,
        status: t.status || 'PENDING',
      })),
    };

    let savedDbId: string | undefined;
    try {
      if (editingPlan) {
        const numId = Number(editingPlan.id);
        if (!isNaN(numId) && numId > 0) {
          await operationsApi.updatePlan(numId, dbPayload);
        }
      } else {
        const created = await operationsApi.createPlan(dbPayload);
        if (created && (created as any).id) {
          savedDbId = String((created as any).id);
        }
      }
    } catch (apiErr) {
      console.warn('Backend sync failed, saving locally:', apiErr);
    }

    // Đọc danh sách mới nhất từ localStorage để không bị ghi đè
    let currentStored: WeeklyPlanItem[] = [];
    try {
      const stored = localStorage.getItem('thaco_weekly_agri_plans_v7');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) currentStored = parsed;
      }
    } catch {}
    if (currentStored.length === 0) currentStored = plans;

    let updatedPlans: WeeklyPlanItem[] = [];

    if (editingPlan) {
      updatedPlans = currentStored.map((p) =>
        p.id === editingPlan.id || p.code === planCode
          ? {
            ...p,
            code: planCode,
            title: finalTitle,
            complexCode,
            complexName,
            enterpriseCode,
            enterpriseName,
            farmCode,
            farmName,
            stageCode: selectedStageCode,
            stageName: currentStageInfo.label,
            defaultPlot: firstPlot,
            weekNumber: selectedWeekNumber,
            startDate: startDateStr,
            endDate: endDateStr,
            status,
            notes,
            createdBy: createdByUser.trim() || 'Chau Tiểu Long',
            createdAt: editingPlan.createdAt || createdAt,
            tasks: normalizedTasks,
          }
          : p
      );
    } else {
      const newPlan: WeeklyPlanItem = {
        id: savedDbId || `PLAN-W${selectedWeekNumber}-${Date.now().toString().slice(-4)}`,
        code: planCode,
        title: finalTitle,
        complexCode,
        complexName,
        enterpriseCode,
        enterpriseName,
        farmCode,
        farmName,
        stageCode: selectedStageCode,
        stageName: currentStageInfo.label,
        defaultPlot: firstPlot,
        weekNumber: selectedWeekNumber,
        startDate: startDateStr,
        endDate: endDateStr,
        status,
        notes,
        createdAt,
        createdBy: createdByUser.trim() || 'Chau Tiểu Long',
        tasks: normalizedTasks,
      };
      updatedPlans = [newPlan, ...currentStored.filter((p) => p.code !== planCode && p.id !== newPlan.id)];
    }

    // Ghi vào localStorage
    localStorage.setItem('thaco_weekly_agri_plans_v7', JSON.stringify(updatedPlans));

    // Nếu kế hoạch được duyệt, tự động nạp vào danh sách lệnh điều xe
    if (status === 'APPROVED') {
      const savedPlan = updatedPlans.find((p) => p.code === planCode) || updatedPlans[0];
      if (savedPlan) {
        syncPlanTasksToDispatch(savedPlan, normalizedTasks);
      }
    }

    // Hoàn tất lưu kế hoạch (đã đồng bộ CSDL thông qua operationsApi ở trên)

    alert(
      status === 'APPROVED'
        ? `Đã lưu & phê duyệt Kế hoạch tuần ${selectedWeekNumber} (${planCode}) thành công! Các công việc đã tự động nạp vào danh sách điều xe và đồng bộ CSDL.`
        : `Đã lưu bản nháp Kế hoạch tuần ${selectedWeekNumber} (${planCode})!`
    );

    navigate('/lenh-dieu-xe/ke-hoach/nong-nghiep');
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* 1. BREADCRUMBS & TIÊU ĐỀ TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <button
              type="button"
              onClick={() => navigate('/lenh-dieu-xe/ke-hoach')}
              className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kế hoạch sản xuất tuần
            </button>
            <span>/</span>
            <span className="text-slate-800 font-bold">
              {isViewMode
                ? `Chi tiết kế hoạch: ${editingPlan?.code || ''}`
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
                    : 'Lập kế hoạch'}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-300">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Tuần {selectedWeekNumber}
                </span>
                {editingPlan?.status && (
                  <StatusBadge status={editingPlan.status} />
                )}
              </h1>

            </div>
          </div>
        </div>

        {/* NÚT THAO TÁC NHANH TRÊN HEADER */}
        <div className="flex items-center gap-2 shrink-0">
          {isViewMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/lenh-dieu-xe/ke-hoach')}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs"
                icon={<ArrowLeft className="h-3.5 w-3.5" />}
              >
                Quay lại danh sách
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => navigate(`/lenh-dieu-xe/ke-hoach/tao-moi?editPlanId=${editPlanId}`)}
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
                onClick={() => navigate('/lenh-dieu-xe/ke-hoach')}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs"
              >
                Hủy bỏ
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSave('APPROVED')}
                className="h-9 px-4 text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-200 active:scale-98"
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                {editingPlan ? 'Lưu cập nhật & Phê duyệt' : 'Lưu & Phê duyệt kế hoạch'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. CARD 1: CẤU HÌNH TUẦN LÀM VIỆC & PHÂN CẤP ĐƠN VỊ TỪ DANH MỤC DÙNG CHUNG */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Thời gian Tuần làm việc & Phân cấp đơn vị phụ trách (Danh mục dùng chung)
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/90 rounded-xl px-3 py-1 text-xs font-bold text-emerald-800">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              Thời gian tuần: {formatDateStr(activeWeek.monday)} ➔ {formatDateStr(activeWeek.sunday)} ({selectedYear})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột trái: Năm, Tuần và Mã Kế Hoạch (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/90 rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" /> Thời gian tuần & Mã kế hoạch
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
                  placeholder="VD: KH-2026-W37-0805"
                  className={`w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs ${isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
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
                onChange={(e) => {
                  setPlanTitle(e.target.value);
                  setIsTitleCustomEdited(true);
                }}
                placeholder="Nhập tên kế hoạch sản xuất đầy đủ chi tiết..."
                className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs resize-y min-h-[64px] leading-relaxed transition-all ${
                  isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white focus:bg-white'
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Chọn Tuần sản xuất trong năm: <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={String(selectedWeekNumber)}
                onChange={(val) => setSelectedWeekNumber(Number(val))}
                options={weekOptions}
                placeholder="Chọn tuần sản xuất"
                disabled={isViewMode}
                heightClass="h-9"
                bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Giai đoạn sản xuất (1 kế hoạch / 1 giai đoạn): <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={selectedStageCode}
                onChange={(val) => handleStageChange(val)}
                options={stageOptions}
                placeholder="Chọn giai đoạn sản xuất..."
                disabled={isViewMode}
                heightClass="h-9"
                bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
              />
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày bắt đầu tuần (Thứ Hai):</span>
                <strong className="text-slate-800">{formatDateStr(activeWeek.monday)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày kết thúc tuần (Chủ Nhật):</span>
                <strong className="text-slate-800">{formatDateStr(activeWeek.sunday)}</strong>
              </div>
            </div>
          </div>

          {/* Cột phải: 3 Cấp Phân Cấp Đơn Vị từ Danh mục dùng chung (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                Phân cấp đơn vị quản lý (Danh mục chuẩn)
              </h3>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                1. KLH ➔ 2. Xí nghiệp ➔ 3. Nông trường
              </span>
            </div>

            <div className="space-y-3.5">
              {/* 1. Khu liên hợp */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  1. Thuộc Khu liên hợp: <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={complexCode}
                  onChange={(val) => handleComplexChange(val)}
                  options={complexOptions}
                  placeholder="Chọn Khu liên hợp..."
                  disabled={isViewMode}
                  heightClass="h-9"
                  bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                />
              </div>

              {/* 2. Xí nghiệp */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  2. Xí nghiệp trực thuộc: <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={enterpriseCode}
                  onChange={(val) => handleEnterpriseChange(val)}
                  options={enterpriseOptions}
                  placeholder="Chọn Xí nghiệp trực thuộc..."
                  disabled={isViewMode}
                  heightClass="h-9"
                  bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                />
              </div>

              {/* 3. Nông trường */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  3. Nông trường sản xuất: <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={farmCode}
                  onChange={(val) => handleFarmChange(val)}
                  options={farmOptions}
                  placeholder="Chọn Nông trường sản xuất..."
                  disabled={isViewMode}
                  heightClass="h-9"
                  bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CARD 2: DANH SÁCH CÁC CÔNG VIỆC CƠ GIỚI TRONG TUẦN */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
        {/* SUMMARY KPI BAR TỰ ĐỘNG (ĐƯA LÊN TRÊN ĐẦU CARD 2) */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Số lượng công việc tuần:</span>
              <strong className="text-blue-900 text-base font-black">{formTasks.length} công việc</strong>
            </div>

            <div className="w-px h-7 bg-emerald-200/80 hidden sm:block" />

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Tổng diện tích quy hoạch:</span>
              <strong className="text-emerald-900 text-base font-black">{totalAreaHa} ha</strong>
            </div>

            <div className="w-px h-7 bg-emerald-200/80 hidden sm:block" />

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">Tổng nhu cầu đầu máy cơ giới:</span>
              <strong className="text-amber-950 text-base font-black">{totalVehiclesCount} đầu xe</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 text-emerald-800 font-bold bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Kế hoạch đạt chuẩn kỹ thuật, sẵn sàng phát lệnh điều xe</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
              2
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <ListPlus className="h-4 w-4 text-emerald-600" />
                  Danh sách các hạng mục công việc trong tuần ({formTasks.length} công việc)
                </h2>
                <span
                  className={`inline-flex items-center justify-center rounded-lg px-2.5 py-0.5 text-xs font-bold border shadow-2xs ${currentStageInfo.bg} ${currentStageInfo.text} ${currentStageInfo.border}`}
                >
                  {currentStageInfo.label}
                </span>
              </div>
            </div>
          </div>

          {!isViewMode && (
            <Button
              type="button"
              size="sm"
              onClick={handleAddTask}
              className="h-8.5 px-3.5 text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs cursor-pointer active:scale-98 shrink-0"
              icon={<Plus className="h-4 w-4 stroke-[2.5]" />}
            >
              Thêm công việc vào tuần
            </Button>
          )}
        </div>

        {/* BẢNG SOẠN THẢO CÔNG VIỆC TUẦN */}
        <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200/90 text-slate-700 font-extrabold text-[11px]">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[300px]">Hạng mục công việc cơ giới</th>
                  <th className="p-3 min-w-[190px]">Lô / Thửa thực hiện</th>
                  <th className="p-3 min-w-[160px]">Nông cụ tương thích</th>
                  <th className="p-3 min-w-[160px]">Đầu máy khuyến nghị</th>
                  <th className="p-3 min-w-[95px] text-center">Khối lượng (ha)</th>
                  <th className="p-3 min-w-[90px] text-center">Nhu cầu máy</th>
                  <th className="p-3 min-w-[210px]">Lịch thực hiện trong tuần</th>
                  <th className="p-3 min-w-[280px]">Ghi chú / Lưu ý kỹ thuật</th>
                  {!isViewMode && <th className="p-3 w-12 text-center">Xóa</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {formTasks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <Wrench className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700 text-xs">Chưa có công việc nào trong kế hoạch tuần này.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Nhấn "Thêm dòng công việc" để bắt đầu khai báo công việc cơ giới.</p>
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddTask}
                          className="mt-3 text-xs font-bold border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                          icon={<Plus className="h-3.5 w-3.5" />}
                        >
                          Thêm dòng công việc đầu tiên
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  formTasks.map((task, index) => {
                  const currentDay = parseSingleDay(task.scheduledDays);
                  const dateShort = getDayDateShort(currentDay, activeWeek);
                  const dateFull = getDayDateFull(currentDay, activeWeek);

                  return (
                    <tr key={task.id || index} className="hover:bg-slate-50/70 transition-colors">
                      {/* # STT */}
                      <td className="p-3 text-center font-bold text-slate-400 align-middle">{index + 1}</td>

                      {/* Chọn Công việc (SearchableSelect Combobox / Custom Text) */}
                      <td className="p-3 align-middle">
                        <SearchableSelect
                          value={task.jobCode}
                          onChange={(val) => handleChangeTaskJob(index, val)}
                          options={jobOptions}
                          placeholder="Chọn hoặc nhập tên công việc..."
                          disabled={isViewMode}
                          allowCustomInput={false}
                          heightClass="h-9"
                          bgClass={isViewMode ? 'bg-slate-100' : 'bg-white'}
                        />
                      </td>

                      {/* Lô / Thửa (SearchableSelect Combobox / Custom Input) */}
                      <td className="p-3 align-middle">
                        <SearchableSelect
                          value={task.lotPlot}
                          onChange={(val) => handleUpdateTaskField(index, 'lotPlot', val)}
                          options={plotOptions}
                          placeholder={!farmCode ? "Chưa chọn Nông trường..." : "Chọn/nhập Lô/Thửa..."}
                          disabled={isViewMode || !farmCode}
                          allowCustomInput={false}
                          heightClass="h-9"
                          bgClass={isViewMode || !farmCode ? 'bg-slate-100' : 'bg-white'}
                        />
                      </td>

                      {/* Nông cụ */}
                      <td className="p-3 align-middle">
                        <div className="relative">
                          <input
                            value={task.implementGroup}
                            disabled={isViewMode}
                            onChange={(e) => handleUpdateTaskField(index, 'implementGroup', e.target.value)}
                            className={`w-full h-9 rounded-xl border border-amber-200 px-3 text-xs font-bold text-amber-900 focus:border-amber-500 focus:outline-none shadow-2xs ${isViewMode ? 'bg-amber-50/30 cursor-not-allowed' : 'bg-amber-50/50'
                              }`}
                          />
                        </div>
                      </td>

                      {/* Đầu máy */}
                      <td className="p-3 align-middle">
                        <div className="relative">
                          <input
                            value={task.recommendedVehicle}
                            disabled={isViewMode}
                            onChange={(e) => handleUpdateTaskField(index, 'recommendedVehicle', e.target.value)}
                            className={`w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-none shadow-2xs ${isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                              }`}
                          />
                        </div>
                      </td>

                      {/* Diện tích */}
                      <td className="p-3 text-center align-middle">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          disabled={isViewMode}
                          placeholder="0"
                          value={task.targetAreaHa || ''}
                          onChange={(e) =>
                            handleUpdateTaskField(index, 'targetAreaHa', e.target.value === '' ? 0 : Number(e.target.value))
                          }
                          className={`w-20 h-9 text-center mx-auto rounded-xl border border-slate-200 px-2 text-xs font-black text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs ${isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                            }`}
                        />
                      </td>

                      {/* Nhu cầu máy */}
                      <td className="p-3 text-center align-middle">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={isViewMode}
                          placeholder="0"
                          value={task.assignedVehiclesCount || ''}
                          onChange={(e) =>
                            handleUpdateTaskField(index, 'assignedVehiclesCount', e.target.value === '' ? 0 : Number(e.target.value))
                          }
                          className={`w-16 h-9 text-center mx-auto rounded-xl border border-amber-300 px-2 text-xs font-black text-amber-900 focus:border-amber-500 focus:outline-none shadow-2xs ${isViewMode ? 'bg-amber-50/30 cursor-not-allowed' : 'bg-amber-50'
                            }`}
                        />
                      </td>

                      {/* Lịch thực hiện trong tuần: Phương án 2 (Từ Thứ ... ➔ Đến Thứ ... kèm Badge số ngày) */}
                      <td className="p-3 align-middle">
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

                      {/* Ghi chú / Lưu ý kỹ thuật (Dạng textarea xuống dòng to rõ) */}
                      <td className="p-3 align-middle">
                        <textarea
                          rows={2}
                          disabled={isViewMode}
                          value={task.notes || ''}
                          onChange={(e) => handleUpdateTaskField(index, 'notes', e.target.value)}
                          placeholder="Nhập ghi chú chi tiết, lưu ý kỹ thuật (hỗ trợ xuống dòng)..."
                          className={`w-full min-w-[260px] rounded-xl border border-slate-200 p-2 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:bg-emerald-50/20 focus:outline-none shadow-2xs transition-all resize-y leading-relaxed ${isViewMode ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                            }`}
                        />
                      </td>

                      {/* Nút xóa */}
                      {!isViewMode && (
                        <td className="p-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(index)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Xóa công việc này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. CARD 3: GHI CHÚ CHUNG & YÊU CẦU VẬN HÀNH */}
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
            placeholder="Nhập yêu cầu điều phối đặc biệt về thời tiết, ưu tiên tiến độ làm đất, chuẩn bị bồn cấp nhiên liệu lưu động hoặc hỗ trợ kỹ thuật..."
            className={`w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none shadow-2xs ${isViewMode ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white'
              }`}
          />
        </div>
      </section>
    </div>
  );
};
