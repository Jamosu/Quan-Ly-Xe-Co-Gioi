import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  HardHat,
  Building2,
  ListPlus,
  FileText,
  MapPin,
  Layers,
  Wrench,
  Fuel,
  User,
  UserCheck,
  Tractor,
  CheckCircle2,
  LayoutGrid,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { SearchableSelect, type SelectOption } from '../common/SearchableSelect';
import { ResourceTimeline } from './ResourceTimeline';
import { formatDateStr, getWeekNumber } from '../../pages/dispatch/ProductionPlanPage';
import { calculateEndTimeFormatted, type FormState } from './DispatchOrderForm';
import type { OperationalWorkOrderRecord } from '../../api/scheduling';
import type { DriverManagementUnit } from '../../api/driverManagementApi';

export interface ConstructionOrderFormBlocksProps {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  sourceOrder: OperationalWorkOrderRecord | null;
  activeWeek: { weekNumber: number; monday: Date; sunday: Date; label: string };
  yearOptions: SelectOption[];
  weekOptions: SelectOption[];
  complexOptions: SelectOption[];
  selectedComplex: any;
  managementUnits?: DriverManagementUnit[];
  managementUnitOptions?: SelectOption[];
  selectManagementUnit?: (val: string) => void;
  enterpriseOptions?: SelectOption[];
  availableEnterprises?: any[];
  complexes?: any[];
  constructionJobOptions: SelectOption[];
  availableConstructionJobs: any[];
  constructionSiteOptions: SelectOption[];
  constructionTeamOptions?: SelectOption[];
  vehicleOptions: SelectOption[];
  driverOptions: SelectOption[];
  implementOptions: SelectOption[];
  selectedVehicle: any;
  selectedDriver: any;
  selectedImplement: any;
  handleDurationChange: (hours: number) => void;
  handleBreakChange?: (hours: number) => void;
  handleStartTimeChange?: (val: string) => void;
  handleSetCurrentTime?: () => void;
  handleVehicleChange: (val: string) => void;
  handleDriverChange?: (val: string) => void;
  autoVehicleNotice?: {
    type: 'PRIMARY_1' | 'PRIMARY_2' | 'SECONDARY' | 'ALL_BUSY' | 'NO_ASSIGNED';
    message: string;
    badge: string;
    tone: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  } | null;
  onCloseNotice?: () => void;
  handleSelectConstructionJob: (val: string) => void;
  handleSelectConstructionSite: (val: string) => void;
  constructionCategoryOptions?: SelectOption[];
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/15 disabled:bg-slate-100 disabled:cursor-not-allowed';

export const ConstructionOrderFormBlocks: React.FC<ConstructionOrderFormBlocksProps> = ({
  form,
  update,
  setForm,
  sourceOrder,
  activeWeek,
  yearOptions,
  weekOptions,
  complexOptions,
  selectedComplex,
  managementUnits,
  managementUnitOptions,
  selectManagementUnit,
  enterpriseOptions,
  availableEnterprises,
  complexes,
  constructionCategoryOptions,
  constructionJobOptions,
  availableConstructionJobs,
  constructionSiteOptions,
  constructionTeamOptions,
  vehicleOptions,
  driverOptions,
  implementOptions,
  selectedVehicle,
  selectedDriver,
  selectedImplement,
  handleDurationChange,
  handleBreakChange,
  handleStartTimeChange,
  handleSetCurrentTime,
  handleVehicleChange,
  handleDriverChange,
  autoVehicleNotice,
  onCloseNotice,
  handleSelectConstructionJob,
  handleSelectConstructionSite,
}) => {
  const [viewMode, setViewMode] = useState<'CARD' | 'TABLE'>('CARD');

  const categoryOptions = useMemo(() => {
    return constructionCategoryOptions || [];
  }, [constructionCategoryOptions]);

  const selectedManagementUnit = useMemo(() => {
    return (managementUnits || []).find((u) => String(u.id) === form.managementUnitId);
  }, [managementUnits, form.managementUnitId]);

  const unitVehicleCount = useMemo(() => {
    if (!selectedManagementUnit) return 0;
    return selectedManagementUnit.vehicleCount ?? selectedManagementUnit._count?.vehicles ?? 0;
  }, [selectedManagementUnit]);

  const unitDriverCount = useMemo(() => {
    if (!selectedManagementUnit) return 0;
    return selectedManagementUnit.driverCount ?? selectedManagementUnit._count?.teamAssignments ?? 0;
  }, [selectedManagementUnit]);
  const driverCount = { total: driverOptions.length, selectable: driverOptions.filter((item) => !item.disabled).length };
  const vehicleCount = { total: vehicleOptions.length, selectable: vehicleOptions.filter((item) => !item.disabled).length };
  const implementCount = { total: implementOptions.length, selectable: implementOptions.filter((item) => !item.disabled).length };

  const selectedImplementIds = useMemo(() => {
    if (Array.isArray(form.implementIds) && form.implementIds.length > 0) return form.implementIds;
    return form.implementId ? [form.implementId] : [];
  }, [form.implementIds, form.implementId]);

  const handleAddImplement = (val: string) => {
    if (!val) return;
    if (!selectedImplementIds.includes(val)) {
      const nextIds = [...selectedImplementIds, val];
      setForm((old) => ({ ...old, implementId: nextIds[0], implementIds: nextIds }));
    }
  };

  const handleRemoveImplement = (idToRemove: string) => {
    const nextIds = selectedImplementIds.filter((id) => id !== idToRemove);
    setForm((old) => ({ ...old, implementId: nextIds[0] || '', implementIds: nextIds }));
  };

  const handleClearImplements = () => {
    setForm((old) => ({ ...old, implementId: '', implementIds: [] }));
  };

  const selectedImplementItems = useMemo(() => {
    return selectedImplementIds.map((id) => {
      const opt = implementOptions.find((o) => o.value === id);
      return {
        id,
        label: opt?.label || (selectedImplement && String(selectedImplement.id) === id ? `${selectedImplement.code} — ${selectedImplement.name}` : `Thiết bị #${id}`),
      };
    });
  }, [selectedImplementIds, implementOptions, selectedImplement]);

  return (
    <>
      {/* 1. KHỐI 1: THỜI GIAN TUẦN THI CÔNG & PHÂN CẤP ĐƠN VỊ PHỤ TRÁCH */}
      <section className="rounded-2xl border border-amber-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <HardHat className="h-4 w-4 text-amber-600" />
              Thời gian Tuần thi công & Phân cấp đơn vị phụ trách (Danh mục dùng chung)
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/90 rounded-xl px-3 py-1 text-xs font-bold text-amber-900">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>
              Thời gian tuần: {formatDateStr(activeWeek.monday)} ➔ {formatDateStr(activeWeek.sunday)} ({form.selectedYear})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột trái: Năm và Tuần (6 cols) */}
          <div className="lg:col-span-6 bg-amber-50/40 rounded-xl p-4 border border-amber-200/70 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-amber-600" /> Thời gian tuần & Nội dung thi công
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Năm làm việc: <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={String(form.selectedYear)}
                  onChange={(val) => {
                    const y = Number(val);
                    const curY = new Date().getFullYear();
                    const curW = getWeekNumber(new Date());
                    let nextW = form.selectedWeekNumber;
                    if (y === curY && nextW < curW) {
                      nextW = curW;
                    }
                    setForm((old) => ({
                      ...old,
                      selectedYear: y,
                      selectedWeekNumber: nextW,
                      planTitle: `Điều động cơ giới thi công công trình Tuần ${nextW}`,
                    }));
                  }}
                  options={yearOptions}
                  placeholder="Chọn năm"
                  disabled={Boolean(sourceOrder)}
                  heightClass="h-9"
                  bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Chọn Tuần thi công: <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={String(form.selectedWeekNumber)}
                  onChange={(val) => {
                    const w = Number(val);
                    setForm((old) => ({
                      ...old,
                      selectedWeekNumber: w,
                      planTitle: `Điều động cơ giới thi công công trình Tuần ${w}`,
                    }));
                  }}
                  options={weekOptions}
                  placeholder="Chọn tuần thi công"
                  disabled={Boolean(sourceOrder)}
                  heightClass="h-9"
                  bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Phân loại hạng mục thi công: <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={form.constructionCategory}
                onChange={(val) => {
                  setForm((old) => ({
                    ...old,
                    constructionCategory: val,
                    jobCode: '',
                    jobName: '',
                  }));
                }}
                options={categoryOptions}
                placeholder="Chọn phân loại hạng mục thi công..."
                disabled={Boolean(sourceOrder)}
                heightClass="h-9"
                bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nội dung / Mục đích điều động thi công: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={form.planTitle}
                onChange={(e) => update('planTitle', e.target.value)}
                placeholder="Nhập mục đích hoặc nội dung điều động máy công trình..."
                className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none shadow-2xs resize-y min-h-[56px] leading-relaxed transition-all ${
                  sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white focus:bg-white'
                }`}
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

          {/* Cột phải: Phân cấp đơn vị quản lý (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
                Phân cấp đơn vị quản lý (Danh mục chuẩn)
              </h3>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                1. KLH ➔ 2. Xí nghiệp / Ban quản lý
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Khu vực quản lý của lệnh */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-amber-900">
                    Đội cơ giới quản lý lệnh <span className="text-rose-500">*</span>
                  </label>
                  {selectedManagementUnit && (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300">
                        <Tractor className="w-3 h-3 text-amber-700" />
                        <span>{unitVehicleCount} xe</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-300">
                        <UserCheck className="w-3 h-3 text-blue-700" />
                        <span>{unitDriverCount} tài xế</span>
                      </span>
                    </div>
                  )}
                </div>
                <SearchableSelect
                  value={form.managementUnitId}
                  onChange={(val) => {
                    if (selectManagementUnit) {
                      selectManagementUnit(val);
                    } else {
                      update('managementUnitId', val);
                    }
                  }}
                  options={managementUnitOptions || []}
                  placeholder="Chọn Đội cơ giới trước khi chọn tài xế và xe..."
                  disabled={Boolean(sourceOrder)}
                  heightClass="h-10"
                  bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                />
                {selectedManagementUnit ? (
                  <div className="mt-2 pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-950">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        <span>Xe đang có:</span>
                        <strong className="text-amber-800 text-xs">{unitVehicleCount} xe</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                        <span>Tài xế đang có:</span>
                        <strong className="text-blue-700 text-xs">{unitDriverCount} tài xế</strong>
                      </span>
                    </div>
                    {selectedManagementUnit.currentManager?.manager?.fullName && (
                      <div className="text-[10.5px] text-amber-800 font-medium">
                        <span className="text-slate-500">Đội trưởng: </span>
                        <span className="font-bold">{selectedManagementUnit.currentManager.manager.fullName}</span>
                        {selectedManagementUnit.currentManager.manager.phone && (
                          <span className="text-slate-500 ml-1">({selectedManagementUnit.currentManager.manager.phone})</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] font-semibold text-amber-700">Tài xế, xe và thiết bị chỉ được tải từ Đội cơ giới này.</p>
                )}
              </div>

              {/* 1. Khu liên hợp */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  1. Thuộc Khu liên hợp: <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={form.complexCode}
                  onChange={(val) => {
                    const comp = complexes?.find((c) => c.code === val);
                    setForm((old) => ({
                      ...old,
                      complexCode: val,
                      complexName: comp?.name || selectedComplex?.name || val,
                      unit: val,
                      enterpriseCode: '',
                      enterpriseName: '',
                      teamCode: '',
                      teamName: '',
                      workLocationKey: '',
                      workLocationText: '',
                      destination: '',
                      vehicleId: '',
                      driverId: '',
                      implementId: '',
                    }));
                  }}
                  options={complexOptions}
                  placeholder="Chọn Khu liên hợp..."
                  disabled={Boolean(sourceOrder) || Boolean(form.managementUnitId)}
                  heightClass="h-9"
                  bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                />
              </div>

              {/* 2. Đơn vị quản lý / Xí nghiệp */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  2. Đơn vị quản lý (Ban / Xí nghiệp): <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={form.enterpriseCode}
                  onChange={(val) => {
                    const ent = availableEnterprises?.find((e) => e.code === val);
                    setForm((old) => ({
                      ...old,
                      enterpriseCode: val,
                      enterpriseName: ent?.name || val,
                      teamCode: '',
                      teamName: '',
                      workLocationKey: '',
                      workLocationText: '',
                      destination: '',
                      vehicleId: '',
                      driverId: '',
                      implementId: '',
                    }));
                  }}
                  options={enterpriseOptions || []}
                  placeholder={!form.complexCode ? 'Chưa chọn Khu liên hợp...' : 'Chọn Đơn vị quản lý...'}
                  disabled={Boolean(sourceOrder) || !form.complexCode}
                  heightClass="h-9"
                  bgClass={sourceOrder || !form.complexCode ? 'bg-slate-100' : 'bg-white'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KHỐI 2: HẠNG MỤC CÔNG VIỆC CÔNG TRÌNH & TUYẾN / VỊ TRÍ THỰC HIỆN */}
      <section className="rounded-2xl border border-amber-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
              2
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ListPlus className="h-4 w-4 text-amber-600" />
                Hạng mục công việc công trình & Tuyến / Vị trí thực hiện
              </h2>
              <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-0.5 text-xs font-bold border shadow-2xs bg-amber-50 text-amber-800 border-amber-200">
                {categoryOptions.find((c) => c.value === form.constructionCategory)?.label || 'San gạt & Lu lèn nền đường'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Nút chuyển đổi chế độ xem: Dạng thẻ vs Dạng bảng */}
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-bold text-slate-600 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setViewMode('CARD')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'CARD'
                    ? 'bg-white text-amber-800 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900 text-slate-600'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Dạng thẻ (Đầy đủ chữ)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-white text-amber-800 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900 text-slate-600'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Dạng bảng mở rộng</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700">
              <span>
                Quy mô: <strong className="text-amber-700 font-extrabold">{form.targetQuantity || '1.5'} {form.targetUnit || 'km'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Định mức: <strong className="text-slate-800">{form.fuelQuota || 14.5} Lít/h</strong>
              </span>
            </div>
          </div>
        </div>

        {/* CHẾ ĐỘ 1: DẠNG THẺ CHI TIẾT */}
        {viewMode === 'CARD' ? (
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-amber-700 text-white text-xs font-black flex items-center justify-center shadow-xs">
                  1
                </span>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Hạng mục công trình #1 • {categoryOptions.find((c) => c.value === form.constructionCategory)?.label || 'San gạt mặt bằng'}
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200">
                Đang chuẩn bị điều động
              </span>
            </div>

            {/* HÀNG 1: NHIỆM VỤ CÔNG TRÌNH & CÔNG TRƯỜNG */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Cột 1: Hạng mục công việc công trình (7 cột) */}
              <div className="lg:col-span-7 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    <span>Hạng mục công việc công trình:</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  {form.jobCode && !form.jobCode.startsWith('CUSTOM-') && (
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                      {form.jobCode}
                    </span>
                  )}
                </label>
                <SearchableSelect
                  value={form.jobCode?.startsWith('CUSTOM-') && form.jobName ? form.jobName : form.jobCode}
                  onChange={handleSelectConstructionJob}
                  options={constructionJobOptions}
                  placeholder="Chọn công việc công trình..."
                  disabled={Boolean(sourceOrder)}
                  allowCustomInput={true}
                  heightClass="h-10"
                  roundedClass="rounded-xl"
                  bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                  className="w-full"
                  inputClassName="border-amber-600/70 text-amber-950 font-bold px-3 text-xs shadow-2xs"
                />
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Quy chuẩn thi công:</span>
                  <span className="truncate">{form.jobDescription || form.jobName || 'Tiêu chuẩn lu lèn nền K95'}</span>
                </div>
              </div>

              {/* Cột 2: Tuyến / Vị trí / Công trường thi công (5 cột) */}
              <div className="lg:col-span-5 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-600" />
                    <span>Tuyến / Vị trí / Công trường thi công:</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  {form.workLocationKey && (
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {form.workLocationKey}
                    </span>
                  )}
                </label>
                <SearchableSelect
                  value={form.workLocationText}
                  onChange={handleSelectConstructionSite}
                  options={constructionSiteOptions}
                  placeholder="Chọn Tuyến hoặc Vị trí thi công..."
                  disabled={Boolean(sourceOrder)}
                  allowCustomInput
                  heightClass="h-10"
                  roundedClass="rounded-xl"
                  bgClass={sourceOrder ? 'bg-slate-100' : 'bg-white'}
                  className="w-full"
                  inputClassName="border-amber-600/70 text-amber-950 font-bold px-3 text-xs shadow-2xs"
                />
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Điểm xuất phát:</span>
                  <span className="truncate">{form.origin || 'Bãi tập kết Ban Xây dựng'}</span>
                </div>
              </div>
            </div>

            {/* HÀNG 2: MÁY ĐỀ XUẤT, THIẾT BỊ PHỤ TRỢ & QUY MÔ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
              {/* Cột 1: Máy thi công đề xuất (5 cột) */}
              <div className="lg:col-span-5 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <HardHat className="h-3.5 w-3.5 text-amber-600" />
                  <span>Máy công trình đề xuất:</span>
                </label>
                <input
                  value={form.equipmentType || form.recommendedVehicle}
                  disabled={Boolean(sourceOrder)}
                  onChange={(e) => {
                    update('equipmentType', e.target.value);
                    update('recommendedVehicle', e.target.value);
                  }}
                  placeholder="Máy san gạt GD555 & Xe lu rung 14T"
                  className={`w-full h-10 rounded-xl border border-amber-200 px-3.5 text-xs font-bold text-amber-900 focus:border-amber-500 focus:outline-none shadow-2xs ${
                    sourceOrder ? 'bg-amber-50/30 cursor-not-allowed' : 'bg-amber-50/70'
                  }`}
                />
                <span className="text-[10.5px] text-amber-800/80 font-medium block">
                  Tự động đề xuất theo quy chuẩn ca máy công trình
                </span>
              </div>

              {/* Cột 2: Thiết bị phụ trợ / Gầu đào / Búa (4 cột) */}
              <div className="lg:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-slate-600" />
                  <span>Thiết bị phụ trợ / Nông cụ kèm theo:</span>
                </label>
                <input
                  value={form.implementGroup}
                  disabled={Boolean(sourceOrder)}
                  onChange={(e) => update('implementGroup', e.target.value)}
                  placeholder="Lưỡi ben san gạt & Trục lu rung"
                  className={`w-full h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800 focus:border-amber-600 focus:outline-none shadow-2xs ${
                    sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                  }`}
                />
                <span className="text-[10.5px] text-slate-500 font-medium block">
                  Phụ kiện hoặc công cụ chuyên dụng gắn kèm
                </span>
              </div>

              {/* Cột 3: Khối lượng quy mô mục tiêu (3 cột) */}
              <div className="lg:col-span-3 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  <span>Quy mô mục tiêu: <span className="text-rose-500">*</span></span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={Boolean(sourceOrder)}
                    placeholder="1.5"
                    value={form.targetQuantity || ''}
                    onChange={(e) => update('targetQuantity', e.target.value)}
                    className={`w-3/5 h-10 rounded-xl border border-amber-300 px-3 text-center text-sm font-black text-amber-950 focus:border-amber-600 focus:outline-none shadow-2xs ${
                      sourceOrder ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                  <select
                    value={form.targetUnit || 'km'}
                    disabled={Boolean(sourceOrder)}
                    onChange={(e) => update('targetUnit', e.target.value)}
                    className="w-2/5 h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 shadow-2xs focus:border-amber-600 focus:outline-none"
                  >
                    <option value="km">km</option>
                    <option value="m³">m³</option>
                    <option value="giờ máy">giờ máy</option>
                    <option value="m²">m²</option>
                  </select>
                </div>
                <span className="text-[10.5px] text-slate-500 font-medium block text-center">
                  Khối lượng dự kiến
                </span>
              </div>
            </div>

            {/* HÀNG 3: BẢNG TÓM TẮT THÔNG SỐ (4 THÔNG SỐ RÕ RÀNG ĐẦY ĐỦ) */}
            <div className="pt-2 border-t border-amber-200/80">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                📋 Bảng tóm tắt thông số kỹ thuật tác vụ công trình:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="bg-white rounded-xl p-3 border border-amber-200/80 shadow-2xs space-y-1">
                  <span className="text-[10.5px] text-slate-500 font-medium">Vị trí / Tuyến thi công:</span>
                  <strong className="text-xs text-amber-900 block font-bold leading-snug">
                    {form.workLocationText || 'Chưa chọn vị trí'}
                  </strong>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-200/80 shadow-2xs space-y-1">
                  <span className="text-[10.5px] text-slate-500 font-medium">Quy mô mục tiêu:</span>
                  <strong className="text-xs text-slate-800 block font-bold">
                    {form.targetQuantity || '1.5'} {form.targetUnit || 'km'}
                  </strong>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-200/80 shadow-2xs space-y-1">
                  <span className="text-[10.5px] text-slate-500 font-medium">Máy thi công đề xuất:</span>
                  <strong className="text-xs text-amber-900 block font-bold truncate">
                    {form.equipmentType || form.recommendedVehicle || 'Máy san gạt GD555'}
                  </strong>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-200/80 shadow-2xs space-y-1">
                  <span className="text-[10.5px] text-slate-500 font-medium">Định mức tiêu hao dầu:</span>
                  <strong className="text-xs text-slate-800 block font-bold">
                    {form.fuelQuota || 14.5} {form.fuelUnit || 'Lít/h'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CHẾ ĐỘ 2: DẠNG BẢNG MỞ RỘNG */
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-50/70 border-b border-amber-200/80 text-amber-950 font-extrabold text-[11px] uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">STT</th>
                    <th className="p-3 w-24">Mã CV</th>
                    <th className="p-3 min-w-[200px]">Hạng mục công việc công trình</th>
                    <th className="p-3 min-w-[180px]">Vị trí / Công trường</th>
                    <th className="p-3 w-28 text-center">Khối lượng</th>
                    <th className="p-3 min-w-[160px]">Máy công trình đề xuất</th>
                    <th className="p-3 w-32 text-center">Định mức dầu</th>
                    <th className="p-3 w-28 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {availableConstructionJobs.map((j, idx) => {
                    const isSelected = form.jobCode === j.code;
                    return (
                      <tr
                        key={j.code}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-50/80 font-bold text-amber-950' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleSelectConstructionJob(j.code)}
                      >
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-amber-800">{j.code}</td>
                        <td className="p-3">
                          <span className="block text-slate-900 font-bold">{j.name}</span>
                          <span className="block text-[11px] text-slate-500 font-normal">{j.description}</span>
                        </td>
                        <td className="p-3 text-slate-700">
                          {form.workLocationText || 'Theo tuyến phân công'}
                        </td>
                        <td className="p-3 text-center font-bold text-amber-900">
                          {form.targetQuantity || '1.5'} {j.defaultUnit || 'km'}
                        </td>
                        <td className="p-3 text-slate-700">{j.recommendedVehicle}</td>
                        <td className="p-3 text-center">
                          <span className="inline-block bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded font-bold text-[11px]">
                            {j.fuelQuota} {j.fuelUnit}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectConstructionJob(j.code);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-700 text-white shadow-2xs'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? 'Đã chọn' : 'Chọn'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 3. KHỐI 3: ĐIỀU ĐỘNG MÁY CÔNG TRÌNH, THỢ VẬN HÀNH & PHÁT HÀNH LỆNH */}
      <section className="rounded-2xl border border-amber-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
              3
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              Điều động Máy công trình, Thợ vận hành & Phát hành lệnh
            </h2>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            Kiểm tra xung đột thời gian thực
          </span>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
          {/* DÒNG 1: THỜI GIAN CA MÁY (COMPACT 1 HÀNG) */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 shrink-0">Ca máy:</span>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => (handleStartTimeChange ? handleStartTimeChange(e.target.value) : update('startTime', e.target.value))}
                  className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 shadow-2xs focus:border-amber-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSetCurrentTime}
                  title="Chỉnh về ngày giờ hiện tại"
                  className="h-7 px-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-[10.5px] font-bold text-amber-800 shrink-0 cursor-pointer"
                >
                  Hiện tại
                </button>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={form.durationHours}
                  onChange={(e) => handleDurationChange(Math.max(0.5, Number(e.target.value)))}
                  className="w-12 h-7 rounded-lg border border-slate-300 bg-white text-center text-[11px] font-extrabold text-slate-900 shadow-2xs focus:border-amber-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 font-medium">giờ</span>

                <span className="text-slate-300 mx-1">|</span>
                <span className="text-[11px] font-bold text-slate-700 shrink-0">Nghỉ trưa:</span>
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.5"
                  value={form.breakHours ?? 1}
                  onChange={(e) => handleBreakChange ? handleBreakChange(Math.max(0, Number(e.target.value))) : update('breakHours', Math.max(0, Number(e.target.value)))}
                  className="w-11 h-7 rounded-lg border border-slate-300 bg-white text-center text-[11px] font-extrabold text-slate-900 shadow-2xs focus:border-amber-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 font-medium">giờ</span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Ca:</span>
                {[4, 8, 10, 12].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleDurationChange(h)}
                    className={`h-6 px-2 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                      form.durationHours === h
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
                <span className="text-slate-200 mx-0.5">|</span>
                <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Nghỉ:</span>
                {[0, 1, 1.5, 2].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleBreakChange ? handleBreakChange(b) : update('breakHours', b)}
                    className={`h-6 px-2 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                      (form.breakHours ?? 1) === b
                        ? 'bg-amber-800 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {b === 0 ? '0h' : `${b}h`}
                  </button>
                ))}
              </div>
            </div>

            {/* DÒNG DƯỚI CA MÁY: KẾT THÚC CA LÚC */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-0.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Kết thúc ca lúc:</span>
                <span className="font-bold text-slate-800">
                  {calculateEndTimeFormatted(form.startTime || form.plannedStartAt, form.durationHours, form.breakHours ?? 1)}
                </span>
              </div>
              {(form.breakHours ?? 1) > 0 ? (
                <span className="text-[10.5px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                  Đã cộng {form.breakHours ?? 1}h nghỉ trưa (Tổng thời lượng: {form.durationHours + (form.breakHours ?? 1)}h)
                </span>
              ) : (
                <span className="text-[10.5px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Không nghỉ trưa / Làm liên tục
                </span>
              )}
            </div>
          </div>

          {/* DÒNG 2: 3 CỘT NGUỒN LỰC: 1. THỢ MÁY (ƯU TIÊN) | 2. MÁY CÔNG TRÌNH (TỰ ĐỘNG THEO TÀI) | 3. PHỤ KIỆN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Cột 1: Chọn Thợ máy / Lái máy công trình (ƯU TIÊN CHỌN TRƯỚC) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                  <span>1. Thợ máy / Lái máy công trình:</span>
                  <span className="text-[10px] font-mono text-indigo-700">({driverCount.selectable}/{driverCount.total})</span>
                </span>
                {selectedDriver ? (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 rounded truncate max-w-[120px]">
                    {selectedDriver.fullName}
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Ưu tiên chọn trước
                  </span>
                )}
              </label>
              <SearchableSelect
                value={form.driverId}
                onChange={handleDriverChange || ((val) => update('driverId', val))}
                options={driverOptions}
                allowCustomInput={false}
                placeholder="-- Chọn thợ máy / lái xe --"
                heightClass="h-9"
                roundedClass="rounded-lg"
                bgClass="bg-white"
                className="w-full"
                inputClassName="text-xs font-semibold text-slate-900 border-indigo-300 shadow-2xs focus:border-indigo-600"
                emptyOptionLabel="-- Chọn thợ máy / lái xe --"
                emptyValue=""
              />
              {form.managementUnitId && driverCount.total === 0 && <p className="text-[10.5px] font-semibold text-rose-700">Đội này chưa có tài xế đang được phân công.</p>}
              {form.managementUnitId && driverCount.total > 0 && driverCount.selectable === 0 && <p className="text-[10.5px] font-semibold text-amber-700">Không có tài xế đủ điều kiện. Mở danh sách để xem rõ hạng GPLX, nghỉ phép/nghỉ ca, đang vận hành hoặc trùng lệnh.</p>}
              {selectedDriver && (
                <div className="rounded-lg bg-indigo-50/70 border border-indigo-200/80 px-2.5 py-1.5 text-[11px] text-indigo-950 flex items-center justify-between">
                  <span className="font-semibold truncate">{selectedDriver.fullName} • {selectedDriver.licenseClass || 'Chứng chỉ thợ máy'}</span>
                  <span className="font-bold text-indigo-800 shrink-0 ml-1">{selectedDriver.phone || 'Sẵn sàng'}</span>
                </div>
              )}
            </div>

            {/* Cột 2: Chọn Máy công trình (TỰ ĐỘNG GÁN THEO TÀI XẾ) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <HardHat className="h-3.5 w-3.5 text-amber-600" />
                  <span>2. Máy công trình / Thiết bị xe máy:</span>
                  <span className="text-[10px] font-mono text-amber-700">({vehicleCount.selectable}/{vehicleCount.total})</span>
                </span>
                {selectedVehicle ? (
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 rounded">
                    {selectedVehicle.code}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium italic">
                    Tự động theo tài xế
                  </span>
                )}
              </label>
              <SearchableSelect
                value={form.vehicleId}
                onChange={handleVehicleChange}
                options={vehicleOptions}
                allowCustomInput={false}
                placeholder="-- Chọn máy công trình --"
                heightClass="h-9"
                roundedClass="rounded-lg"
                bgClass="bg-white"
                className="w-full"
                inputClassName="text-xs font-semibold text-slate-900 border-slate-300 shadow-2xs"
                emptyOptionLabel="-- Chọn máy công trình --"
                emptyValue=""
              />
              {form.managementUnitId && vehicleCount.total === 0 && <p className="text-[10.5px] font-semibold text-rose-700">Đội này chưa có xe/máy.</p>}
              {form.managementUnitId && vehicleCount.total > 0 && vehicleCount.selectable === 0 && <p className="text-[10.5px] font-semibold text-amber-700">Không có máy phù hợp hoặc đang sẵn sàng.</p>}
              {selectedVehicle && (
                <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 px-2.5 py-1.5 text-[11px] text-amber-950 flex items-center justify-between">
                  <span className="font-semibold truncate">{selectedVehicle.name} • {selectedVehicle.plate || 'Chưa gắn biển'}</span>
                  <span className="font-bold text-amber-800 shrink-0 ml-1">{selectedVehicle.fuelQuotaRate || 14.5} L/h</span>
                </div>
              )}
            </div>

            {/* Cột 3: Chọn Thiết bị phụ trợ (HỖ TRỢ CHỌN NHIỀU THIẾT BỊ) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-blue-600" />
                  <span>3. Thiết bị phụ trợ / Gầu / Búa:</span>
                  <span className="text-[10px] font-mono text-blue-700">({implementCount.selectable}/{implementCount.total})</span>
                </span>
                {selectedImplementIds.length > 0 && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded-full border border-blue-200">
                    Đã chọn {selectedImplementIds.length} thiết bị
                  </span>
                )}
              </label>
              <SearchableSelect
                value=""
                onChange={handleAddImplement}
                options={implementOptions.filter((o) => !selectedImplementIds.includes(o.value))}
                placeholder={selectedImplementIds.length > 0 ? "+ Chọn thêm thiết bị phụ trợ..." : "-- Chọn thiết bị phụ trợ --"}
                heightClass="h-9"
                roundedClass="rounded-lg"
                bgClass="bg-white"
                className="w-full"
                inputClassName="text-xs font-semibold text-slate-900 border-slate-300 shadow-2xs"
                emptyOptionLabel={selectedImplementIds.length > 0 ? "+ Chọn thêm thiết bị phụ trợ..." : "-- Không gắn thiết bị phụ trợ --"}
                emptyValue=""
              />
              {form.managementUnitId && implementCount.total === 0 && <p className="text-[10.5px] font-semibold text-slate-600">Đội này không có thiết bị gắn kèm.</p>}
              {form.managementUnitId && implementCount.total > 0 && implementCount.selectable === 0 && <p className="text-[10.5px] font-semibold text-amber-700">Không có thiết bị phù hợp với loại lệnh hoặc xe đã chọn.</p>}
              {selectedImplementItems.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedImplementItems.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200/90 rounded-lg px-2 py-1 text-[11px] font-bold shadow-2xs"
                      >
                        <Wrench className="h-3 w-3 text-blue-600 shrink-0" />
                        <span className="truncate max-w-[180px]">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImplement(item.id)}
                          className="ml-1 text-slate-400 hover:text-rose-600 font-black text-xs hover:bg-rose-100 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors"
                          title="Bỏ chọn thiết bị này"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {selectedImplementIds.length > 1 && (
                    <button
                      type="button"
                      onClick={handleClearImplements}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold underline block"
                    >
                      Bỏ chọn tất cả ({selectedImplementIds.length} thiết bị)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* THÔNG BÁO TỰ ĐỘNG GÁN XE THEO TÀI XẾ */}
          {autoVehicleNotice && (
            <div
              className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs transition-all shadow-2xs ${
                autoVehicleNotice.tone === 'emerald'
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : autoVehicleNotice.tone === 'amber'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : autoVehicleNotice.tone === 'blue'
                  ? 'bg-blue-50/90 border-blue-300 text-blue-950'
                  : autoVehicleNotice.tone === 'rose'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    autoVehicleNotice.tone === 'emerald'
                      ? 'bg-emerald-200 text-emerald-900'
                      : autoVehicleNotice.tone === 'amber'
                      ? 'bg-amber-200 text-amber-900'
                      : autoVehicleNotice.tone === 'blue'
                      ? 'bg-blue-200 text-blue-900'
                      : autoVehicleNotice.tone === 'rose'
                      ? 'bg-rose-200 text-rose-900'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {autoVehicleNotice.badge}
                </span>
                <p className="font-semibold text-xs leading-relaxed">{autoVehicleNotice.message}</p>
              </div>
              <button
                type="button"
                onClick={onCloseNotice}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-200/50"
                title="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* DÒNG 3: DỰ TOÁN NHIÊN LIỆU & GHI CHÚ */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-amber-500" />
              <span>Dầu dự toán ca máy:</span>
              <strong className="text-amber-900 font-extrabold text-sm">
                {(form.durationHours * (selectedVehicle?.fuelQuotaRate || 14.5)).toFixed(1)} Lít
              </strong>
              <span className="text-slate-400 text-[11px]">
                (Ca {form.durationHours}h × {selectedVehicle?.fuelQuotaRate || 14.5} L/h)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500">Chế độ giao việc:</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                Giao cứng (Chỉ định đích danh)
              </span>
            </div>
          </div>
        </div>

        {/* TIMELINE NGUỒN LỰC */}
        {(selectedVehicle || selectedDriver) && (
          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            {selectedVehicle && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <b className="text-xs font-black text-slate-800">
                      {selectedVehicle.code} — {selectedVehicle.name}
                    </b>
                    <span className="block text-[10.5px] text-slate-500">
                      Biển số: {selectedVehicle.plate || 'Chưa gắn'}
                    </span>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold bg-amber-100 text-amber-800">
                    Sẵn sàng
                  </span>
                </div>
                {selectedVehicle.availability?.intervals && (
                  <ResourceTimeline
                    from={new Date(form.plannedStartAt).toISOString()}
                    to={new Date(form.plannedEndAt).toISOString()}
                    intervals={selectedVehicle.availability.intervals}
                  />
                )}
              </div>
            )}

            {selectedDriver && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <b className="text-xs font-black text-slate-800">
                      {selectedDriver.fullName}
                    </b>
                    <span className="block text-[10.5px] text-slate-500">
                      Chứng chỉ: {selectedDriver.licenseClass || 'Thợ máy công trình'} • ĐT: {selectedDriver.phone || '—'}
                    </span>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold bg-amber-100 text-amber-800">
                    Đủ điều kiện
                  </span>
                </div>
                {selectedDriver.availability?.intervals && (
                  <ResourceTimeline
                    from={new Date(form.plannedStartAt).toISOString()}
                    to={new Date(form.plannedEndAt).toISOString()}
                    intervals={selectedDriver.availability.intervals}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
};
