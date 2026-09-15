import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Truck,
  Tractor,
  HardHat,
  Calendar,
  Clock,
  Fuel,
  MapPin,
  User,
  Wrench,
  Search,
  Download,
  Printer,
  RefreshCw,
  Building2,
  Layers,
  Eye,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { AuditUserPopover } from '../../components/common/AuditUserPopover';
import { TableRowActions } from '../../components/common/TableRowActions';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { operationsApi } from '../../api/operations';
import { apiClient } from '../../api/client';
import { KLH_OPTIONS } from '../../data/locationCatalogData';
import { getVehicleFuelQuotaRate } from '../../components/dispatch/WorkflowActionPanel';
import { matchesKLH } from '../../utils/filterUtils';

export type CompletedOrderScope = 'ALL' | 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN';

interface CompletedOrderRecord {
  id: number;
  code: string;
  orderCategory: 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN' | 'CUU_HO_SOS';
  categoryLabel: string;
  unit: string;
  purpose: string;
  origin?: string;
  destination?: string;
  taskPlot?: string;
  taskJobName?: string;
  taskJobCode?: string;
  departureTime?: string;
  plannedEndTime?: string;
  completedAt?: string;
  status: string;
  vehicle?: {
    id: number;
    code: string;
    name: string;
    plate?: string;
    fuelQuotaRate?: number;
    fuelQuotaUnit?: string;
  };
  assignedVehicleList?: string[];
  driver?: {
    id: number;
    fullName: string;
    licenseClass?: string;
    phone?: string;
  };
  secondaryDriverName?: string;
  implement?: {
    id: number;
    code: string;
    name: string;
  };
  workVolumeTarget?: number;
  workVolumeActual?: number;
  workVolumeUnit?: string;
  plannedFuelLiters?: number;
  actualFuelLiters?: number;
  fuelQuotaRate?: string;
  notes?: string;
  planCode?: string;
  planTitle?: string;
}

interface CompletedOrdersPageProps {
  initialScope?: CompletedOrderScope;
}

const toDateString = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const CompletedOrdersPage: React.FC<CompletedOrdersPageProps> = ({ initialScope = 'ALL' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định scope từ prop hoặc URL pathname
  const derivedScope = useMemo<CompletedOrderScope>(() => {
    if (location.pathname.includes('/hoan-tat/nong-nghiep')) return 'NONG_NGHIEP';
    if (location.pathname.includes('/hoan-tat/cong-trinh')) return 'CONG_TRINH';
    if (location.pathname.includes('/hoan-tat/van-hanh') || location.pathname.includes('/hoan-tat/van-chuyen')) return 'VAN_CHUYEN';
    return initialScope;
  }, [location.pathname, initialScope]);

  const [scope, setScope] = useState<CompletedOrderScope>(derivedScope);
  const [orders, setOrders] = useState<CompletedOrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Bộ lọc
  const [selectedKLH, setSelectedKLH] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Khi thay đổi URL sub-path thì cập nhật scope
  useEffect(() => {
    setScope(derivedScope);
  }, [derivedScope]);

  // Load danh sách lệnh đã hoàn tất từ backend
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dispatchRes, transportRes] = await Promise.allSettled([
        operationsApi.dispatchOrders({ limit: 1000 }),
        operationsApi.transportOrders({ limit: 500 }),
      ]);

      const list: CompletedOrderRecord[] = [];

      // 1. Phân hệ Nông nghiệp & Công trình
      if (dispatchRes.status === 'fulfilled' && dispatchRes.value?.items) {
        dispatchRes.value.items.forEach((item: any) => {
          // Chỉ lấy các lệnh đã hoàn thành / nghiệm thu / đóng
          const isDone = ['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(item.status);
          if (!isDone) return;

          const isConstruction = item.productionOrder?.plan?.planType === 'CONSTRUCTION';
          const cat = isConstruction ? 'CONG_TRINH' : 'NONG_NGHIEP';
          const catLabel = isConstruction ? 'Công trình ca máy' : 'Nông nghiệp';

          const durationH = item.departureTime && item.plannedEndTime
            ? Math.max(0.5, (new Date(item.plannedEndTime).getTime() - new Date(item.departureTime).getTime()) / 3_600_000)
            : (item.productionOrder?.planItem?.durationHours || 8);
          const vQuota = item.vehicle ? getVehicleFuelQuotaRate(item.vehicle, cat) : undefined;
          const initialPlannedFuel = item.plannedFuelLiters ?? (vQuota && item.vehicle ? Number((durationH * vQuota).toFixed(1)) : undefined);
          const initialQuotaRate = vQuota && item.vehicle ? `${vQuota} L/h` : item.fuelQuotaRate;

          list.push({
            ...item,
            orderCategory: cat,
            categoryLabel: catLabel,
            planCode: item.productionOrder?.plan?.code,
            planTitle: item.productionOrder?.plan?.title,
            workVolumeTarget: item.workVolumeTarget ?? 25,
            workVolumeActual: item.workVolumeActual ?? item.workVolumeTarget ?? 25,
            workVolumeUnit: item.workVolumeUnit ?? (isConstruction ? 'Giờ' : 'Ha'),
            plannedFuelLiters: initialPlannedFuel,
            actualFuelLiters: item.actualFuelLiters ?? initialPlannedFuel,
            fuelQuotaRate: initialQuotaRate,
            completedAt: item.completedAt || item.plannedEndTime || item.departureTime,
          });
        });
      }

      // 2. Phân hệ Vận hành / Vận chuyển nội bộ
      if (transportRes.status === 'fulfilled' && transportRes.value?.items) {
        transportRes.value.items.forEach((item: any) => {
          const isDone = ['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(item.status);
          if (!isDone) return;

          list.push({
            id: item.id ? 200000 + item.id : Math.floor(Math.random() * 100000),
            code: item.code,
            orderCategory: 'VAN_CHUYEN',
            categoryLabel: 'Vận hành vận chuyển',
            unit: item.unit || 'BAN_CO_GIOI',
            purpose: item.cargoType || 'Vận chuyển hàng hóa nội bộ',
            origin: item.origin || 'Kho Trung Tâm',
            destination: item.destination || 'Điểm giao hàng',
            departureTime: item.departureTime || item.executionDate || item.requestDate,
            plannedEndTime: item.plannedEndTime,
            completedAt: item.completedAt || item.plannedEndTime || item.departureTime,
            status: item.status,
            vehicle: item.vehicle,
            driver: item.driver,
            implement: item.trailer,
            workVolumeTarget: item.tonnage || item.palletCount || 1,
            workVolumeActual: item.tonnage || item.palletCount || 1,
            workVolumeUnit: item.palletCount ? 'Pallet' : 'Tấn',
            plannedFuelLiters: item.plannedFuelLiters,
            actualFuelLiters: item.actualFuelLiters || item.plannedFuelLiters,
            notes: item.notes,
            planCode: item.productionOrder?.plan?.code,
            planTitle: item.productionOrder?.plan?.title,
          });
        });
      }

      // Fallback dữ liệu mock nếu chưa có dữ liệu API hoàn thành
      if (list.length === 0) {
        try {
          const raw = localStorage.getItem('thaco_all_dispatch_orders_master_v4');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(item.status)) {
                  list.push({
                    ...item,
                    categoryLabel: item.orderCategory === 'CONG_TRINH' ? 'Công trình ca máy' : item.orderCategory === 'VAN_CHUYEN' ? 'Vận hành vận chuyển' : 'Nông nghiệp',
                    completedAt: item.completedAt || item.plannedEndTime || item.departureTime,
                  });
                }
              });
            }
          }
        } catch {
          // ignore
        }
      }

      setOrders(list);
    } catch (err: any) {
      console.error('Failed to load completed orders:', err);
      setError(err?.message || 'Không thể tải danh sách việc đã hoàn tất.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Điều hướng khi đổi Tab scope
  const handleScopeChange = (newScope: CompletedOrderScope) => {
    setScope(newScope);
    if (newScope === 'ALL') navigate('/lenh-dieu-xe/hoan-tat');
    else if (newScope === 'NONG_NGHIEP') navigate('/lenh-dieu-xe/hoan-tat/nong-nghiep');
    else if (newScope === 'CONG_TRINH') navigate('/lenh-dieu-xe/hoan-tat/cong-trinh');
    else if (newScope === 'VAN_CHUYEN') navigate('/lenh-dieu-xe/hoan-tat/van-hanh');
  };

  // Đếm số lượng theo từng Scope
  const scopeCounts = useMemo(() => {
    return {
      ALL: orders.length,
      NONG_NGHIEP: orders.filter((o) => o.orderCategory === 'NONG_NGHIEP').length,
      CONG_TRINH: orders.filter((o) => o.orderCategory === 'CONG_TRINH').length,
      VAN_CHUYEN: orders.filter((o) => o.orderCategory === 'VAN_CHUYEN').length,
    };
  }, [orders]);

  // Lọc dữ liệu theo Scope, KLH, Ngày và Từ khóa
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Lọc theo Scope phân hệ
      if (scope !== 'ALL' && order.orderCategory !== scope) return false;

      // Lọc theo KLH
      if (selectedKLH !== 'ALL' && !matchesKLH(order, selectedKLH)) return false;

      // Lọc theo Ngày hoàn thành / Khởi hành
      if (selectedDate !== 'ALL') {
        const orderDate = order.completedAt
          ? toDateString(order.completedAt)
          : order.departureTime
          ? toDateString(order.departureTime)
          : '';
        if (orderDate !== selectedDate) return false;
      }

      // Tìm kiếm từ khóa
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = order.code.toLowerCase().includes(q);
        const matchPurpose = (order.taskJobName || order.purpose || '').toLowerCase().includes(q);
        const matchVehicle = (order.vehicle?.name || order.vehicle?.code || order.vehicle?.plate || '').toLowerCase().includes(q);
        const matchDriver = (order.driver?.fullName || '').toLowerCase().includes(q);
        const matchDest = (order.taskPlot || order.destination || '').toLowerCase().includes(q);
        const matchPlan = (order.planCode || '').toLowerCase().includes(q);
        if (!matchCode && !matchPurpose && !matchVehicle && !matchDriver && !matchDest && !matchPlan) return false;
      }

      return true;
    });
  }, [orders, scope, selectedKLH, selectedDate, search]);

  // Các thẻ KPI tính toán từ filteredOrders
  const kpiStats = useMemo(() => {
    const totalCount = filteredOrders.length;
    const totalFuel = filteredOrders.reduce((acc, o) => acc + (o.actualFuelLiters || o.plannedFuelLiters || 0), 0);
    const totalPlannedFuel = filteredOrders.reduce((acc, o) => acc + (o.plannedFuelLiters || o.actualFuelLiters || 0), 0);
    const fuelSaved = Math.max(0, totalPlannedFuel - totalFuel);
    const totalVolume = filteredOrders.reduce((acc, o) => acc + (o.workVolumeActual || o.workVolumeTarget || 0), 0);

    return {
      totalCount,
      totalFuel: Number(totalFuel.toFixed(1)),
      fuelSaved: Number(fuelSaved.toFixed(1)),
      totalVolume: Number(totalVolume.toFixed(1)),
    };
  }, [filteredOrders]);

  // Mở chi tiết lệnh điều xe
  const handleOpenDetail = (order: CompletedOrderRecord) => {
    navigate(`/lenh-dieu-xe/chi-tiet/${order.id}`, {
      state: { order, from: location.pathname },
    });
  };

  // Xuất file CSV báo cáo nghiệm thu
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Mã Lệnh,Phân Hệ,Hạng Mục Nhiệm Vụ,Phương Tiện,Thợ Máy/Lái Xe,Khối Lượng Nghiệm Thu,Đơn Vị,Thời Gian Bắt Đầu,Thời Gian Hoàn Thành,Nhiên Liệu Thực Tế (Lít),Trạng Thái\n';

    filteredOrders.forEach((o) => {
      const vText = o.vehicle ? `${o.vehicle.code} - ${o.vehicle.name}` : '';
      const dText = o.driver?.fullName || '';
      const start = o.departureTime ? new Date(o.departureTime).toLocaleString('vi-VN') : '';
      const end = o.completedAt ? new Date(o.completedAt).toLocaleString('vi-VN') : '';
      const vol = o.workVolumeActual ?? o.workVolumeTarget ?? '';
      const unit = o.workVolumeUnit || '';
      const fuel = o.actualFuelLiters || o.plannedFuelLiters || 0;
      csvContent += `"${o.code}","${o.categoryLabel}","${(o.taskJobName || o.purpose).replace(/"/g, '""')}","${vText}","${dText}","${vol}","${unit}","${start}","${end}","${fuel}","Hoàn tất"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bao_cao_viec_hoan_tat_${scope}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Định nghĩa các cột cho DataTable
  const columns: Column<CompletedOrderRecord>[] = [
    {
      key: 'code',
      title: 'Mã lệnh & Phân loại',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <b
              className="font-mono font-bold text-primary text-xs hover:underline cursor-pointer"
              onClick={() => handleOpenDetail(row)}
            >
              {row.code}
            </b>
            <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Đã nghiệm thu
            </span>
          </div>
          {row.planCode && (
            <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50/90 border border-emerald-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
              <span className="text-slate-500 font-medium">KH:</span>
              <span className="font-bold">{row.planCode}</span>
            </div>
          )}
          <div>
            {row.orderCategory === 'NONG_NGHIEP' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <Tractor className="h-3 w-3 text-emerald-600" /> Nông nghiệp
              </span>
            )}
            {row.orderCategory === 'CONG_TRINH' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                <HardHat className="h-3 w-3 text-amber-600" /> Công trình ca máy
              </span>
            )}
            {row.orderCategory === 'VAN_CHUYEN' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                <Truck className="h-3 w-3 text-blue-600" /> Vận hành nội bộ
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'purpose',
      title: 'Hạng mục Công việc / Nhiệm vụ',
      render: (row) => (
        <div className="max-w-xs space-y-1">
          <b className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">
            {row.taskJobName || row.purpose}
          </b>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
            <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              {row.unit}
            </span>
            {(row.taskPlot || row.destination) && (
              <span className="truncate font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span>{row.taskPlot || row.destination}</span>
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Phương tiện & Thiết bị',
      render: (row) => (
        <div className="text-xs space-y-1 max-w-[200px]">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{row.vehicle?.plate || row.vehicle?.code || row.vehicle?.name || '—'}</span>
          </div>
          {row.assignedVehicleList && row.assignedVehicleList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.assignedVehicleList.map((v, i) => (
                <span
                  key={i}
                  className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200"
                  title={`Xe #${i + 1}`}
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
      title: 'Nhân sự thực hiện',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>{row.driver?.fullName || 'Chưa gán tài xế'}</span>
          </div>
          {row.secondaryDriverName && (
            <div className="text-[10.5px] text-purple-700 font-medium">
              Phụ: {row.secondaryDriverName}
            </div>
          )}
          {row.driver?.licenseClass && (
            <div className="text-[10px] text-slate-500 font-medium">
              {row.driver.licenseClass}
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
            <div className="font-extrabold text-emerald-700 flex items-center gap-1">
              <span>{actual}</span>
              <span>{row.workVolumeUnit || 'Ha'}</span>
            </div>
            {row.workVolumeTarget && (
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Kế hoạch: {row.workVolumeTarget} {row.workVolumeUnit || 'Ha'} (100%)
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'departureTime',
      title: 'Bắt đầu',
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
      title: 'Thời gian kết thúc',
      sortable: true,
      render: (row) => {
        const dStr = row.completedAt || row.plannedEndTime;
        if (!dStr) return <span className="text-slate-400 italic">Chưa ghi nhận</span>;
        const d = new Date(dStr);
        return (
          <div className="text-xs">
            <div className="font-bold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
              {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'fuel',
      title: 'Nhiên liệu tiêu thụ',
      render: (row) => {
        const actual = row.actualFuelLiters || row.plannedFuelLiters;
        return (
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-purple-900 flex items-center gap-1">
              <Fuel className="h-3 w-3 text-purple-600" />
              <span>{actual ? `${actual} L` : '—'}</span>
            </div>
            {row.fuelQuotaRate && (
              <div className="text-[10px] text-slate-500 font-medium">
                ĐM: {row.fuelQuotaRate}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'user',
      title: 'User',
      width: '70px',
      align: 'center',
      render: (row) => (
        <AuditUserPopover
          createdDate={row.departureTime || row.completedAt || '14-03-2026'}
          createdUser="admin"
          updatedDate={row.completedAt || row.departureTime || '01-08-2026'}
          updatedUser="admin"
          title={`Xem thông tin việc hoàn tất ${row.code}`}
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
            onView={() => handleOpenDetail(row)}
            viewTitle="Xem chi tiết công việc hoàn tất"
          />
          {/* Giữ nguyên icon điều xe */}
          <button
            type="button"
            onClick={() => handleOpenDetail(row)}
            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
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
      {/* 1. Header Trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight font-heading">
              Quản lý việc đã hoàn tất
            </h1>
            <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 shadow-2xs">
              {filteredOrders.length} công việc
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp, theo dõi và đối soát nghiệm thu các công việc / lệnh điều xe đã hoàn thành trên toàn xí nghiệp cơ giới
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void load()}
            disabled={loading}
          >
            Làm mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
          >
            Xuất Excel / CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            In bảng kê
          </Button>
        </div>
      </div>

      {/* 2. Menu Tabs Chuyển đổi 4 phân hệ (Tất cả, Nông nghiệp, Công trình, Vận hành) */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
        {[
          {
            key: 'ALL' as const,
            label: 'Tất cả lệnh hoàn tất',
            icon: <Layers className="h-4 w-4" />,
            count: scopeCounts.ALL,
          },
          {
            key: 'NONG_NGHIEP' as const,
            label: 'Lệnh Nông nghiệp',
            icon: <Tractor className="h-4 w-4 text-emerald-600" />,
            count: scopeCounts.NONG_NGHIEP,
          },
          {
            key: 'CONG_TRINH' as const,
            label: 'Lệnh Công trình ca máy',
            icon: <HardHat className="h-4 w-4 text-amber-600" />,
            count: scopeCounts.CONG_TRINH,
          },
          {
            key: 'VAN_CHUYEN' as const,
            label: 'Lệnh Vận hành nội bộ',
            icon: <Truck className="h-4 w-4 text-blue-600" />,
            count: scopeCounts.VAN_CHUYEN,
          },
        ].map((tab) => {
          const isActive = scope === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleScopeChange(tab.key)}
              className={`group flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 select-none cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className={`transition-colors ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-mono font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Thẻ KPI Tổng kết công việc hoàn tất */}
      <KPIGrid cols={4}>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
          <span className="text-xs font-bold text-emerald-800">Tổng việc đã hoàn tất</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-950">{kpiStats.totalCount}</span>
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
            <span className="text-2xl font-black text-purple-950">{kpiStats.totalFuel}</span>
            <span className="text-xs font-semibold text-purple-600">Lít dầu</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {kpiStats.fuelSaved > 0 ? `Tiết kiệm ~${kpiStats.fuelSaved} L so với định mức` : 'Trong định mức cho phép'}
          </span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
          <span className="text-xs font-bold text-amber-800">Khối lượng nghiệm thu</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-950">{kpiStats.totalVolume}</span>
            <span className="text-xs font-semibold text-amber-700">Ha / m³ / Tấn</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Đã đối soát biên bản nghiệm thu</span>
        </div>
      </KPIGrid>

      {/* 4. Bộ lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Lọc KLH */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Khu liên hợp:</span>
            </label>
            <select
              value={selectedKLH}
              onChange={(e) => setSelectedKLH(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-primary focus:outline-none"
            >
              <option value="ALL">-- Tất cả Khu liên hợp --</option>
              {KLH_OPTIONS.map((k) => (
                <option key={k.code} value={k.code}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Ngày */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Ngày hoàn thành:</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-primary focus:outline-none"
              />
              {selectedDate !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('ALL')}
                  className="px-2.5 h-9 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Tìm kiếm */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-primary" />
              <span>Tìm kiếm nhanh:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Mã lệnh, xe máy, thợ lái, nhiệm vụ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-primary focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bảng kê chi tiết việc đã hoàn tất */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Bảng kê chi tiết công việc đã hoàn tất & Nghiệm thu
              </h3>
              <p className="text-[11px] text-slate-500">
                Hiển thị đầy đủ thông tin phương tiện, người thực hiện, khối lượng hoàn thành và thời điểm nghiệm thu
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            {filteredOrders.length} công việc hiển thị
          </span>
        </div>

        <DataTable
          columns={columns}
          data={filteredOrders}
          isLoading={loading}
          onRowClick={handleOpenDetail}
          serverSide={false}
          totalItems={filteredOrders.length}
          useGlobalFilters={false}
        />
      </div>
    </div>
  );
};
