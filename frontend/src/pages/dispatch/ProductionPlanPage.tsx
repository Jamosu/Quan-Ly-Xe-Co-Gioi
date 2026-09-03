import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  MapPin,
  Plus,
  Tractor,
  TrendingUp,
  CheckCircle2,
  Send,
  Eye,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { operationsApi } from '../../api/operations';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { FilterBar } from '../../components/filters/FilterBar';
import { ErrorState, StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import type { ProductionPlanRecord } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';

const stages: Record<string, { label: string; bg: string; text: string; border: string }> = {
  LAM_DAT: { label: '1. Làm đất', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  TRONG_MOI: { label: '2. Trồng mới', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  THU_HOACH: { label: '3. Thu hoạch', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

// Danh sách trạng thái tiếng Việt
const planStatusOptions = [
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'PENDING_APPROVAL', label: 'Chờ phê duyệt' },
  { value: 'APPROVED', label: 'Đã phê duyệt' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'REJECTED', label: 'Bị từ chối' },
  { value: 'ADJUSTED', label: 'Đã điều chỉnh' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const validStatusValues = planStatusOptions.map((s) => s.value);

// Helper tính thứ 2 đầu tuần
function getMonday(dateInput: Date | string | number): Date {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper tính số tuần trong năm (ISO-8601)
function getWeekNumber(dateInput: Date | string): number {
  const target = new Date(new Date(dateInput).valueOf());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function toDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Label tuần: Tuần XX (dd/MM - dd/MM/yyyy)
function getWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekNo = getWeekNumber(monday);
  const startStr = monday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const endStr = sunday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `Tuần ${weekNo} (${startStr} - ${endStr})`;
}

function formatDateStr(d: string | Date): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const ProductionPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'weekly_cards' | 'table'>('weekly_cards');
  const [plans, setPlans] = useState<ProductionPlanRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');

  // Quản lý tuần chọn theo kiểu Date ('ALL' hoặc date string 'YYYY-MM-DD')
  const [selectedDateInput, setSelectedDateInput] = useState<string>('ALL');
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<ProductionPlanRecord | null>(null);

  const selectedStatus = useFilterStore((state) => state.selectedStatus);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await operationsApi.plans({
        page,
        limit: 50,
        search: search || undefined,
        status: validStatusValues.includes(selectedStatus) ? selectedStatus : undefined,
      });
      setPlans(result.items);
      setTotal(result.pagination.total);
    } catch {
      setError('Không thể tải kế hoạch sản xuất từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // Lọc theo giai đoạn nếu có chọn
  const stageFilteredPlans = useMemo(() => {
    if (selectedStage === 'ALL') return plans;
    return plans.filter((p) => p.stage === selectedStage);
  }, [plans, selectedStage]);

  // Tính toán tuần được chọn dựa trên ngày người dùng chọn
  const activeSelectedMondayTime = useMemo(() => {
    if (selectedDateInput === 'ALL') return null;
    return getMonday(new Date(selectedDateInput)).getTime();
  }, [selectedDateInput]);

  // Gom nhóm kế hoạch theo từng Tuần
  const plansByWeek = useMemo(() => {
    interface WeekGroup {
      mondayTime: number;
      monday: Date;
      weekLabel: string;
      weekNumber: number;
      plans: ProductionPlanRecord[];
      totalTargetHa: number;
      totalEstimatedVehicles: number;
    }

    const groupsMap = new Map<number, WeekGroup>();

    for (const plan of stageFilteredPlans) {
      const mon = getMonday(new Date(plan.startDate));
      const monTime = mon.getTime();

      if (!groupsMap.has(monTime)) {
        groupsMap.set(monTime, {
          mondayTime: monTime,
          monday: mon,
          weekLabel: getWeekLabel(mon),
          weekNumber: getWeekNumber(mon),
          plans: [],
          totalTargetHa: 0,
          totalEstimatedVehicles: 0,
        });
      }

      const group = groupsMap.get(monTime)!;
      group.plans.push(plan);
      group.totalTargetHa += plan.targetAreaHa || 0;
      group.totalEstimatedVehicles += plan.assignedVehiclesCount || 0;
    }

    let groups = Array.from(groupsMap.values()).sort((a, b) => b.mondayTime - a.mondayTime);

    // Nếu chọn một ngày cụ thể, lọc đúng Tuần của ngày đó
    if (activeSelectedMondayTime !== null) {
      groups = groups.filter((g) => g.mondayTime === activeSelectedMondayTime);
    }

    return groups;
  }, [stageFilteredPlans, activeSelectedMondayTime]);

  // Kế hoạch sau khi đã lọc cả Tuần (dành cho chế độ xem bảng)
  const finalFilteredPlans = useMemo(() => {
    if (activeSelectedMondayTime === null) return stageFilteredPlans;
    return stageFilteredPlans.filter((p) => getMonday(new Date(p.startDate)).getTime() === activeSelectedMondayTime);
  }, [stageFilteredPlans, activeSelectedMondayTime]);

  // Thống kê tổng hợp
  const totalStats = useMemo(() => {
    let targetArea = 0;
    let estimatedVehicles = 0;

    for (const plan of finalFilteredPlans) {
      targetArea += plan.targetAreaHa || 0;
      estimatedVehicles += plan.assignedVehiclesCount || 0;
    }

    return {
      targetArea: Math.round(targetArea * 10) / 10,
      approvedCount: finalFilteredPlans.filter((p) => p.status === 'APPROVED' || p.status === 'IN_PROGRESS').length,
      estimatedVehicles,
    };
  }, [finalFilteredPlans]);

  // Điều hướng Tuần qua nút trước / sau
  const handleStepWeek = (step: number) => {
    const baseDate = selectedDateInput === 'ALL' ? new Date() : new Date(selectedDateInput);
    const newDate = new Date(baseDate);
    newDate.setDate(baseDate.getDate() + step * 7);
    setSelectedDateInput(toDateKey(newDate));
  };

  const handleSelectCurrentWeek = () => {
    setSelectedDateInput(toDateKey(new Date()));
  };

  const columns: Column<ProductionPlanRecord>[] = [
    {
      key: 'week',
      title: 'Tuần thực hiện',
      sortable: true,
      render: (row) => {
        const mon = getMonday(new Date(row.startDate));
        return (
          <div>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              <Calendar className="h-3 w-3" />
              Tuần {getWeekNumber(mon)}
            </span>
            <div className="mt-1 text-[11px] text-slate-500">
              {formatDateStr(row.startDate)} ➔ {formatDateStr(row.endDate)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'code',
      title: 'Mã kế hoạch',
      sortable: true,
      render: (row) => <b className="font-mono text-primary font-bold">{row.code}</b>,
    },
    {
      key: 'title',
      title: 'Hạng mục & Cụm Lô',
      render: (row) => {
        const stageInfo = stages[row.stage] || {
          label: row.stage,
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
        };
        return (
          <div>
            <div className="font-bold text-slate-900">{row.title}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-semibold ${stageInfo.bg} ${stageInfo.text}`}>
                {stageInfo.label}
              </span>
              <span className="font-medium text-slate-700">· {row.lotPlot}</span>
              <span>· Đơn vị: <b>{row.unit}</b></span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'targetAreaHa',
      title: 'Diện tích kế hoạch',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          <span className="text-sm font-extrabold text-slate-900">{row.targetAreaHa}</span>
          <span className="ml-1 text-slate-500 font-medium">ha</span>
        </div>
      ),
    },
    {
      key: 'assignedVehiclesCount',
      title: 'Nhu cầu đầu máy dự kiến',
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-xs">
          <Tractor className="h-3.5 w-3.5 text-slate-400" />
          {row.assignedVehiclesCount} xe
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      title: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setSelectedPlanDetail(row)}
          >
            Chi tiết
          </Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={() => navigate('/lenh-dieu-xe/danh-sach')}
          >
            Phát lệnh xe
          </Button>
        </div>
      ),
    },
  ];

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await operationsApi.createPlan({
        code: form.get('code'),
        title: form.get('title'),
        stage: form.get('stage'),
        unit: form.get('unit'),
        lotPlot: form.get('lotPlot'),
        targetAreaHa: Number(form.get('targetAreaHa')),
        assignedVehiclesCount: Number(form.get('assignedVehiclesCount') || 0),
        startDate: new Date(String(form.get('startDate'))).toISOString(),
        endDate: new Date(String(form.get('endDate'))).toISOString(),
      });
      setShowCreate(false);
      await load();
    } catch {
      setError('Không thể tạo kế hoạch. Kiểm tra mã trùng và dữ liệu bắt buộc.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1 KHUNG BỘ LỌC VÀ HÀNH ĐỘNG TỔNG HỢP DUY NHẤT */}
      <FilterBar
        showDateFilter={false}
        searchPlaceholder="Tìm mã KH, tên kế hoạch hoặc lô thửa..."
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onRefresh={() => void load()}
        statusOptions={[
          { value: 'ALL', label: 'Tất cả trạng thái' },
          ...planStatusOptions,
        ]}
        extraActions={
          <div className="flex items-center gap-2 pr-1.5 border-r border-slate-200">
            <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
              In kế hoạch vụ
            </Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Lập kế hoạch tuần mới
            </Button>
          </div>
        }
        bottomContent={
          <div className="space-y-3 pt-1">
            {/* Hàng 1: Lọc Giai đoạn vụ */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 min-w-[70px]">Giai đoạn:</span>
              <button
                type="button"
                onClick={() => setSelectedStage('ALL')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedStage === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              {Object.entries(stages).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedStage(key)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedStage === key
                      ? `${info.bg} ${info.text} ${info.border} ring-2 ring-primary/20`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100" />

            {/* Hàng 2: Bộ chọn Tuần theo ngày */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 min-w-[70px]">
                <Calendar className="h-4 w-4 text-primary" /> Chọn tuần:
              </span>

              <button
                type="button"
                onClick={() => setSelectedDateInput('ALL')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedDateInput === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả các tuần
              </button>

              <button
                type="button"
                onClick={handleSelectCurrentWeek}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedDateInput === toDateKey(new Date())
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tuần hiện tại
              </button>

              {/* Ô nhập Date + Nút lùi / tiến tuần */}
              <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => handleStepWeek(-1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Lùi 1 tuần"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <input
                  type="date"
                  value={selectedDateInput === 'ALL' ? '' : selectedDateInput}
                  onChange={(e) => setSelectedDateInput(e.target.value || 'ALL')}
                  className="bg-transparent text-xs font-semibold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
                  title="Chọn ngày trong lịch để xem tuần tương ứng"
                />

                <button
                  type="button"
                  onClick={() => handleStepWeek(1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Tiến 1 tuần"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {selectedDateInput !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  {getWeekLabel(getMonday(new Date(selectedDateInput)))}
                </span>
              )}
            </div>
          </div>
        }
      />

      {/* KPI Cards Tổng quan */}
      <KPIGrid cols={4}>
        <StatCard
          label={selectedDateInput === 'ALL' ? 'Tổng kế hoạch mùa vụ' : 'Kế hoạch trong tuần'}
          value={finalFilteredPlans.length}
          icon={<Layers className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label={selectedDateInput === 'ALL' ? 'Tổng diện tích kế hoạch' : 'Diện tích tuần chọn'}
          value={`${totalStats.targetArea} ha`}
          icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          label="Đã duyệt / sẵn sàng chạy"
          value={totalStats.approvedCount}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Nhu cầu đầu máy dự kiến"
          value={`${totalStats.estimatedVehicles} xe`}
          icon={<Tractor className="h-5 w-5 text-amber-600" />}
        />
      </KPIGrid>

      {/* View Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <ViewSwitcher<'weekly_cards' | 'table'>
          value={view}
          onChange={setView}
          options={[
            { value: 'weekly_cards', label: 'Theo từng tuần (Thẻ kế hoạch trực quan)' },
            { value: 'table', label: 'Bảng danh sách chi tiết' },
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-medium text-slate-400">
          Đang tải dữ liệu kế hoạch sản xuất theo tuần...
        </div>
      ) : view === 'table' ? (
        /* GIAO DIỆN BẢNG TỔNG HỢP */
        <DataTable
          columns={columns}
          data={finalFilteredPlans}
          isLoading={loading}
          serverSide={false}
          totalItems={finalFilteredPlans.length}
          useGlobalFilters={false}
        />
      ) : (
        /* GIAO DIỆN THẺ KẾ HOẠCH THEO TỪNG TUẦN */
        <div className="space-y-6">
          {plansByWeek.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              Chưa có kế hoạch nào trong tuần hoặc ngày đã chọn. Vui lòng chọn tuần khác hoặc bấm "Tất cả các tuần".
            </div>
          ) : (
            plansByWeek.map((group) => (
              <div
                key={group.mondayTime}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
              >
                {/* Weekly Group Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/90 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary font-extrabold text-sm">
                      W{group.weekNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{group.weekLabel}</h3>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {group.plans.length} kế hoạch
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Nhu cầu ước tính: <b>{group.totalEstimatedVehicles} máy kéo/xe</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-1.5 shadow-2xs">
                      <span className="text-[11px] text-slate-500 block font-medium">Tổng diện tích tuần:</span>
                      <span className="text-sm font-extrabold text-primary">{group.totalTargetHa} ha</span>
                    </div>
                  </div>
                </div>

                {/* Danh sách các kế hoạch trong tuần */}
                <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.plans.map((plan) => {
                    const stageInfo = stages[plan.stage] || {
                      label: plan.stage,
                      bg: 'bg-slate-50',
                      text: 'text-slate-700',
                      border: 'border-slate-200',
                    };

                    return (
                      <div
                        key={plan.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-primary hover:shadow-md transition-all"
                      >
                        <div>
                          {/* Top info */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="font-mono font-bold text-primary text-xs">{plan.code}</span>
                            <StatusBadge status={plan.status} />
                          </div>

                          {/* Title & Stage */}
                          <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                            {plan.title}
                          </h4>

                          <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${stageInfo.bg} ${stageInfo.text}`}>
                                {stageInfo.label}
                              </span>
                              <span className="font-medium text-slate-700">· Đơn vị: <b>{plan.unit}</b></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800">{plan.lotPlot}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Thời gian: {formatDateStr(plan.startDate)} ➔ {formatDateStr(plan.endDate)}</span>
                            </div>
                          </div>

                          {/* Thông tin diện tích kế hoạch & nhu cầu máy */}
                          <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] text-slate-500 block font-medium">Diện tích kế hoạch:</span>
                              <div className="text-sm font-extrabold text-slate-900">
                                {plan.targetAreaHa} <span className="text-xs text-slate-500 font-normal">ha</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 block font-medium">Nhu cầu máy dự kiến:</span>
                              <div className="text-xs font-bold text-slate-800 inline-flex items-center gap-1">
                                <Tractor className="h-3.5 w-3.5 text-slate-400" />
                                {plan.assignedVehiclesCount} xe
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPlanDetail(plan)}
                            className="text-xs font-semibold text-slate-600 hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Chi tiết
                          </button>

                          <Button
                            size="sm"
                            icon={<Send className="h-3 w-3" />}
                            onClick={() => navigate('/lenh-dieu-xe/danh-sach')}
                          >
                            Phát lệnh xe
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Xem chi tiết Kế hoạch tuần */}
      <Modal
        isOpen={!!selectedPlanDetail}
        onClose={() => setSelectedPlanDetail(null)}
        title={`Chi tiết Kế hoạch sản xuất — ${selectedPlanDetail?.code ?? ''}`}
        size="lg"
      >
        {selectedPlanDetail && (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-3">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Tên kế hoạch</span>
                <h4 className="font-bold text-sm text-slate-900">{selectedPlanDetail.title}</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="block text-[11px] text-slate-400">Giai đoạn vụ</span>
                  <b>{stages[selectedPlanDetail.stage]?.label || selectedPlanDetail.stage}</b>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Đơn vị phụ trách</span>
                  <b>{selectedPlanDetail.unit}</b>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Cụm Lô / Thửa</span>
                  <b>{selectedPlanDetail.lotPlot}</b>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Trạng thái duyệt</span>
                  <span className="block mt-0.5"><StatusBadge status={selectedPlanDetail.status} /></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-600 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="block text-[11px] text-slate-400">Diện tích kế hoạch</span>
                  <span className="text-sm font-extrabold text-primary">{selectedPlanDetail.targetAreaHa} ha</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Nhu cầu đầu máy</span>
                  <b>{selectedPlanDetail.assignedVehiclesCount} xe dự kiến</b>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Thời gian thực hiện</span>
                  <b>{formatDateStr(selectedPlanDetail.startDate)} ➔ {formatDateStr(selectedPlanDetail.endDate)}</b>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-slate-600">
              <p className="text-[11px] leading-relaxed">
                💡 <b>Quy trình tiếp theo</b>: Kế hoạch tuần này sau khi được Ban Cơ giới & Giám đốc phê duyệt sẽ được chuyển sang bộ phận Điều độ để lập các <b>Lệnh điều xe</b> cụ thể (chọn máy kéo, dàn cày/bừa, tài xế và ngày chạy máy).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedPlanDetail(null)}>
                Đóng
              </Button>
              <Button
                icon={<Send className="h-3.5 w-3.5" />}
                onClick={() => {
                  setSelectedPlanDetail(null);
                  navigate('/lenh-dieu-xe/danh-sach');
                }}
              >
                Chuyển sang Lập lệnh điều xe
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Lập Kế hoạch tuần mới */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Lập kế hoạch sản xuất theo tuần" size="lg">
        <form className="grid gap-3 text-xs sm:grid-cols-2" onSubmit={create}>
          {[
            ['code', 'Mã kế hoạch (VD: KH-2026-NT1-009)'],
            ['title', 'Tên kế hoạch tuần / Hạng mục'],
            ['lotPlot', 'Cụm Lô / Thửa quy hoạch (VD: Lô B01-B04, Khoảnh 2)'],
          ].map(([name, label]) => (
            <label key={name} className={name === 'title' ? 'sm:col-span-2' : ''}>
              <span className="mb-1 block font-bold text-slate-700">{label}</span>
              <input
                name={name}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          ))}

          <label>
            <span className="mb-1 block font-bold text-slate-700">Giai đoạn vụ</span>
            <select
              name="stage"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="LAM_DAT">1. Làm đất</option>
              <option value="TRONG_MOI">2. Trồng mới</option>
              <option value="THU_HOACH">3. Thu hoạch</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Đơn vị phụ trách</span>
            <select
              name="unit"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option>NT1</option>
              <option>NT2</option>
              <option>XN_BO</option>
              <option>BAN_CO_GIOI</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Diện tích kế hoạch cần làm (ha)</span>
            <input
              name="targetAreaHa"
              type="number"
              min="0"
              step="0.1"
              required
              placeholder="VD: 48.5"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Nhu cầu đầu máy ước tính (xe)</span>
            <input
              name="assignedVehiclesCount"
              type="number"
              min="0"
              step="1"
              placeholder="VD: 6 (số lượng ước tính)"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <label>
              <span className="mb-1 block font-bold text-slate-700">Thứ 2 đầu tuần (Bắt đầu)</span>
              <input
                name="startDate"
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label>
              <span className="mb-1 block font-bold text-slate-700">Chủ nhật cuối tuần (Kết thúc)</span>
              <input
                name="endDate"
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu kế hoạch tuần'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
