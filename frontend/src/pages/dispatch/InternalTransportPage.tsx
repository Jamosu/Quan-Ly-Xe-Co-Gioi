import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  MapPin,
  Package,
  Plus,
  Route,
  Truck,
  Upload,
  User,
  CheckCircle2,
} from 'lucide-react';
import { operationsApi } from '../../api/operations';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { FilterBar } from '../../components/filters/FilterBar';
import { ErrorState, StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import type { ImportPreview, ImportWorkbookPayload, TransportOrderRecord } from '../../types';
import { readTransportWorkbook } from '../../utils/transportWorkbook';
import { useFilterStore } from '../../store/useFilterStore';

const boards = [
  { title: 'Chờ duyệt', statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] },
  { title: 'Đã phân công', statuses: ['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'] },
  { title: 'Đang vận chuyển', statuses: ['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING'] },
  { title: 'Đã giao / hoàn tất', statuses: ['DELIVERED', 'ACCEPTED', 'COMPLETED'] },
];

// Định dạng thời gian rõ ràng tiếng Việt (dd/MM/yyyy HH:mm)
function formatDateTimeVN(value?: string | Date): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${timeStr} · ${dateStr}`;
}

function formatDateKey(value?: string | Date): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TIME_SLOTS = [
  { label: '06:00', hour: 6 },
  { label: '08:00', hour: 8 },
  { label: '10:00', hour: 10 },
  { label: '12:00', hour: 12 },
  { label: '14:00', hour: 14 },
  { label: '16:00', hour: 16 },
  { label: '18:00', hour: 18 },
  { label: '20:00', hour: 20 },
];

export const InternalTransportPage: React.FC = () => {
  const [view, setView] = useState<'scheduler' | 'board' | 'table'>('scheduler');
  const [orders, setOrders] = useState<TransportOrderRecord[]>([]);
  const [selected, setSelected] = useState<TransportOrderRecord | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quản lý ngày cho Scheduler
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workbook, setWorkbook] = useState<ImportWorkbookPayload | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  const selectedStatus = useFilterStore((state) => state.selectedStatus);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await operationsApi.transportOrders({
        page,
        limit: 50,
        search: search || undefined,
        status: boards.some((board) => board.statuses.includes(selectedStatus)) ? selectedStatus : undefined,
      });
      setOrders(result.items);
      setTotal(result.pagination.total);
    } catch {
      setError('Không thể tải danh sách vận chuyển.');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // Tìm danh sách tất cả các ngày có chuyến
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const order of orders) {
      if (order.departureTime) {
        dates.add(formatDateKey(order.departureTime));
      } else if (order.executionDate) {
        dates.add(formatDateKey(order.executionDate));
      } else if (order.requestDate) {
        dates.add(formatDateKey(order.requestDate));
      }
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Nếu mới tải về và có dữ liệu, chọn ngày gần nhất mặc định cho Scheduler
  useEffect(() => {
    if (selectedDate === 'ALL' && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Lọc chuyến theo ngày đang chọn
  const filteredOrders = useMemo(() => {
    if (selectedDate === 'ALL') return orders;
    return orders.filter((order) => {
      const dKey = formatDateKey(order.departureTime || order.executionDate || order.requestDate);
      return dKey === selectedDate;
    });
  }, [orders, selectedDate]);

  // Nhóm theo xe (Lanes) cho ngày đã chọn
  const lanes = useMemo(() => {
    const result = new Map<string, TransportOrderRecord[]>();
    for (const order of filteredOrders) {
      const key = order.vehicle?.plate || order.vehicle?.code || order.legacyVehicle || 'Chưa phân xe';
      result.set(key, [...(result.get(key) ?? []), order]);
    }
    return [...result.entries()];
  }, [filteredOrders]);

  // Điều hướng ngày
  const handleStepDate = (days: number) => {
    const base = selectedDate === 'ALL' ? new Date() : new Date(selectedDate);
    base.setDate(base.getDate() + days);
    setSelectedDate(formatDateKey(base));
  };

  const handleSelectToday = () => {
    setSelectedDate(formatDateKey(new Date()));
  };

  const columns: Column<TransportOrderRecord>[] = [
    {
      key: 'code',
      title: 'Mã chuyến',
      sortable: true,
      render: (row) => <b className="font-semibold text-primary">{row.code}</b>,
    },
    {
      key: 'departureTime',
      title: 'Thời gian xuất phát',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-medium text-slate-800">
          {formatDateTimeVN(row.departureTime)}
        </span>
      ),
    },
    {
      key: 'items',
      title: 'Hàng hóa & Khối lượng',
      render: (row) => (
        <div>
          <b className="text-slate-900">{row.cargoType || row.items[0]?.cargoName || 'Chưa có hàng'}</b>
          <small className="block text-[11px] text-slate-500">
            {row.tonnage ? `${row.tonnage} tấn · ` : ''}{row.items.length} dòng hàng
          </small>
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Xe / Tài xế',
      render: (row) => (
        <div>
          <b className="text-slate-900">{row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle || 'Chưa đối soát'}</b>
          <small className="block text-[11px] text-slate-500">{row.driver?.fullName || row.legacyDriver || 'Chưa đối soát'}</small>
        </div>
      ),
    },
    {
      key: 'route',
      title: 'Điểm nhận → Giao',
      render: (row) => (
        <div className="text-xs">
          <span className="text-slate-700">{row.origin || '—'}</span>
          <span className="mx-1 text-slate-400">➔</span>
          <span className="font-medium text-slate-900">{row.destination || '—'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={row.status} />
          {row.isRouteDeviated && (
            <span title="Cảnh báo lệch tuyến">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </span>
          )}
        </div>
      ),
    },
  ];

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await operationsApi.createTransport({
        code: form.get('code'),
        unit: form.get('unit'),
        routeType: form.get('routeType'),
        flowType: form.get('flowType'),
        requestDate: form.get('requestDate') ? new Date(String(form.get('requestDate'))).toISOString() : undefined,
        executionDate: form.get('executionDate') ? new Date(String(form.get('executionDate'))).toISOString() : undefined,
        origin: form.get('origin'),
        destination: form.get('destination'),
        cargoType: form.get('cargoName'),
        items: [
          {
            cargoName: form.get('cargoName'),
            unitOfMeasure: form.get('unitOfMeasure'),
            plannedQuantity: Number(form.get('quantity')),
            pickupLocation: form.get('origin'),
            deliveryLocation: form.get('destination'),
          },
        ],
      });
      setShowCreate(false);
      await load();
    } catch {
      setError('Không thể tạo vận đơn. Kiểm tra dữ liệu và mã chuyến.');
    } finally {
      setSaving(false);
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setPreview(null);
    try {
      const parsed = await readTransportWorkbook(file);
      setWorkbook(parsed);
      setPreview(await operationsApi.previewImport(parsed));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đọc file Excel.');
      setShowImport(false);
    } finally {
      setImporting(false);
    }
  };

  const commit = async () => {
    if (!workbook || !preview?.canCommit) return;
    setImporting(true);
    try {
      await operationsApi.commitImport(workbook);
      setShowImport(false);
      setWorkbook(null);
      setPreview(null);
      await load();
    } catch {
      setError('Không thể commit file; file có thể đã được nhập hoặc dữ liệu đã thay đổi.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Lệnh vận chuyển nội bộ</h1>
          <p className="text-xs text-slate-500">
            Scheduler điều độ theo xe và khung giờ trong ngày, board 4 nhóm trạng thái và bảng kê chuyến.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => setShowImport(true)}>
            Nhập Excel
          </Button>
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            In / Lưu PDF
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Lập vận đơn
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        showDateFilter={false}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onRefresh={() => void load()}
        statusOptions={[
          { value: 'ALL', label: 'Tất cả trạng thái' },
          ...boards.flatMap((board) => board.statuses).map((value) => ({ value, label: value })),
        ]}
      />

      {/* KPI Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label={selectedDate === 'ALL' ? 'Tổng chuyến' : `Chuyến ngày (${selectedDate})`}
          value={filteredOrders.length}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Đang vận chuyển"
          value={filteredOrders.filter((o) => o.status === 'IN_TRANSIT').length}
          icon={<Route className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          label="Dòng hàng hóa"
          value={filteredOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)}
          icon={<Package className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Cảnh báo lệch tuyến"
          value={filteredOrders.filter((o) => o.isRouteDeviated).length}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        />
      </KPIGrid>

      {/* Special feed notification */}
      {orders.some((order) => order.flowType === 'LIVESTOCK_FEED_3_LEG') && (
        <div className="rounded-2xl bg-emerald-900 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Luồng thức ăn chăn nuôi 3 chặng khép kín</h3>
          </div>
          <p className="mt-1 text-xs text-emerald-100">
            Xí nghiệp trồng trọt ➔ Xí nghiệp chăn nuôi bò ➔ Trung tâm chế biến TMR. Đối lưu hàng và tối ưu hóa chi phí.
          </p>
        </div>
      )}

      {/* View Switcher Tabs */}
      <ViewSwitcher<'scheduler' | 'board' | 'table'>
        value={view}
        onChange={setView}
        options={[
          { value: 'scheduler', label: 'Scheduler lịch chạy theo xe' },
          { value: 'board', label: 'Board 4 nhóm trạng thái' },
          { value: 'table', label: 'Bảng kê danh sách chuyến' },
        ]}
      />

      {/* THANH CHỌN NGÀY DÀNH CHO SCHEDULER */}
      {view === 'scheduler' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
              <Calendar className="h-4 w-4 text-primary" /> Ngày điều độ:
            </span>

            <button
              type="button"
              onClick={() => setSelectedDate('ALL')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedDate === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ngày
            </button>

            <button
              type="button"
              onClick={handleSelectToday}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedDate === formatDateKey(new Date())
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hôm nay
            </button>

            {/* Quick date dropdown */}
            {availableDates.length > 0 && (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-primary focus:outline-none"
              >
                {availableDates.map((dStr) => (
                  <option key={dStr} value={dStr}>
                    Ngày {new Date(dStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                title="Ngày trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                className="bg-transparent text-xs font-semibold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
              />

              <button
                type="button"
                onClick={() => handleStepDate(1)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                title="Ngày sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl px-3 py-1.5">
            <span>{lanes.length} phương tiện</span>
            <span className="mx-1.5">·</span>
            <span className="text-primary font-bold">{filteredOrders.length} chuyến vận chuyển</span>
          </div>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-medium text-slate-400">
          Đang tải dữ liệu vận chuyển...
        </div>
      ) : view === 'table' ? (
        /* GIAO DIỆN BẢNG */
        <DataTable
          columns={columns}
          data={orders}
          isLoading={loading}
          onRowClick={setSelected}
          serverSide
          controlledPage={page}
          totalItems={total}
          onPageChange={setPage}
          useGlobalFilters={false}
        />
      ) : view === 'board' ? (
        /* GIAO DIỆN BOARD 4 NHÓM */
        <div className="grid gap-3 lg:grid-cols-4">
          {boards.map((board) => {
            const boardOrders = orders.filter((order) => board.statuses.includes(order.status));
            return (
              <section key={board.title} className="min-h-72 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                <h3 className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold text-slate-800">
                  <span>{board.title}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                    {boardOrders.length}
                  </span>
                </h3>

                <div className="space-y-2.5">
                  {boardOrders.map((order) => (
                    <button
                      type="button"
                      key={order.id}
                      onClick={() => setSelected(order)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs shadow-xs hover:border-primary hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <b className="text-primary font-mono font-bold">{order.code}</b>
                        {order.isRouteDeviated && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-3 w-3" /> Lệch tuyến
                          </span>
                        )}
                      </div>

                      <h4 className="my-1.5 font-bold text-slate-900 leading-snug line-clamp-2">
                        {order.items[0]?.cargoName || order.cargoType || 'Chưa rõ hàng'}
                      </h4>

                      <div className="space-y-1 text-slate-600 text-[11px]">
                        <p className="font-semibold text-slate-800">
                          {order.vehicle?.plate || order.vehicle?.code || order.legacyVehicle || 'Chưa phân xe'}
                        </p>
                        <p className="text-slate-500">
                          {order.driver?.fullName || order.legacyDriver || 'Chưa gán tài xế'}
                        </p>
                        <p className="text-slate-500 flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatDateTimeVN(order.departureTime)}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                        <StatusBadge status={order.status} />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {order.routeType === 'TWO_WAY' ? '2 chiều' : '1 chiều'}
                        </span>
                      </div>
                    </button>
                  ))}

                  {!boardOrders.length && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
                      Không có chuyến
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* GIAO DIỆN SCHEDULER ĐIỀU ĐỘ THEO XE & KHUNG GIỜ */
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="min-w-[960px]">
            {/* Header Timeline */}
            <div className="grid grid-cols-[180px_repeat(8,1fr)] border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <div className="p-3.5 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" /> Phương tiện
              </div>
              {TIME_SLOTS.map((slot) => (
                <div className="border-l border-slate-200 p-3 text-center" key={slot.label}>
                  {slot.label}
                </div>
              ))}
            </div>

            {/* Vehicle Rows */}
            {lanes.length === 0 ? (
              <div className="p-16 text-center text-sm font-medium text-slate-400">
                Không có lịch chạy xe nào trong ngày đã chọn. Vui lòng chọn ngày khác hoặc chọn "Tất cả ngày".
              </div>
            ) : (
              lanes.map(([vehicle, trips]) => (
                <div
                  className="grid min-h-[90px] grid-cols-[180px_1fr] border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  key={vehicle}
                >
                  {/* Cột Tên xe */}
                  <div className="p-3.5 flex flex-col justify-center border-r border-slate-200 bg-slate-50/30">
                    <span className="text-xs font-bold text-slate-900">{vehicle}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      {trips.length} chuyến chạy
                    </span>
                  </div>

                  {/* Grid 8 slot timeline */}
                  <div className="relative grid grid-cols-8 p-1.5 gap-2 items-center">
                    {trips.map((trip) => {
                      const depDate = trip.departureTime ? new Date(trip.departureTime) : null;
                      const hour = depDate ? depDate.getHours() + depDate.getMinutes() / 60 : 6;

                      // Tính toán vị trí cột (06:00 -> 22:00 tương ứng 8 cột, mỗi cột 2 tiếng)
                      // Cột 1: 06:00-08:00, Cột 2: 08:00-10:00, Cột 3: 10:00-12:00, Cột 4: 12:00-14:00, Cột 5: 14:00-16:00, Cột 6: 16:00-18:00, Cột 7: 18:00-20:00, Cột 8: 20:00-22:00
                      const rawCol = Math.floor((hour - 6) / 2) + 1;
                      const column = Math.max(1, Math.min(8, rawCol));

                      // Kiểm tra xung đột thời gian với chuyến khác của cùng xe trong vòng 1.5 giờ
                      const conflict = trips.some(
                        (other) =>
                          other.id !== trip.id &&
                          !!trip.departureTime &&
                          !!other.departureTime &&
                          Math.abs(new Date(other.departureTime).getTime() - new Date(trip.departureTime).getTime()) <
                            90 * 60 * 1000
                      );

                      return (
                        <button
                          type="button"
                          key={trip.id}
                          onClick={() => setSelected(trip)}
                          style={{ gridColumn: `${column} / span 2` }}
                          className={`z-10 rounded-xl border p-2.5 text-left text-xs shadow-xs transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
                            conflict
                              ? 'border-red-300 bg-red-50/90 text-red-900 ring-1 ring-red-400'
                              : 'border-emerald-200 bg-emerald-50/90 text-emerald-950 hover:bg-emerald-100/90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold font-mono text-primary text-[11px]">{trip.code}</span>
                            {conflict && (
                              <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1 py-0.2 rounded">
                                Trùng giờ
                              </span>
                            )}
                          </div>

                          <div className="font-semibold text-[11px] text-slate-900 truncate">
                            {trip.items[0]?.cargoName || trip.cargoType || 'Chưa rõ hàng'}
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{formatDateTimeVN(trip.departureTime)}</span>
                          </div>

                          <div className="mt-0.5 text-[10px] text-slate-500 truncate">
                            {trip.origin} ➔ {trip.destination}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Chi tiết chuyến vận chuyển */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Chi tiết chuyến vận chuyển ${selected?.code ?? ''}`}
        size="xl"
      >
        {selected && (
          <div className="space-y-4 text-xs">
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
              <div>
                <span className="text-slate-500 block font-medium">Phương tiện</span>
                <b className="text-slate-900 text-sm">
                  {selected.vehicle?.plate || selected.vehicle?.code || selected.legacyVehicle || 'Chưa đối soát'}
                </b>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Tài xế</span>
                <b className="text-slate-900 text-sm">
                  {selected.driver?.fullName || selected.legacyDriver || 'Chưa đối soát'}
                </b>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Hình thức vận tải</span>
                <b className="text-slate-900 text-sm">
                  {selected.routeType === 'TWO_WAY' ? 'Hai chiều / Đối lưu' : 'Một chiều'}
                </b>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Thời gian xuất phát</span>
                <b className="text-slate-900">{formatDateTimeVN(selected.departureTime)}</b>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Lộ trình</span>
                <b className="text-slate-900">{selected.origin || '—'} ➔ {selected.destination || '—'}</b>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Trạng thái</span>
                <span className="block mt-0.5"><StatusBadge status={selected.status} /></span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                Bảng kê hàng hóa ({selected.items.length} dòng hàng)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Mã VT</th>
                      <th className="p-2.5">Tên hàng hóa</th>
                      <th className="p-2.5">ĐVT</th>
                      <th className="p-2.5 text-right">SL Kế hoạch</th>
                      <th className="p-2.5 text-right">SL Thực tế</th>
                      <th className="p-2.5">Nơi nhận</th>
                      <th className="p-2.5">Nơi giao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{item.materialCode || '—'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{item.cargoName}</td>
                        <td className="p-2.5 text-slate-600">{item.unitOfMeasure}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-900">{item.plannedQuantity}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-700">{item.actualQuantity ?? '—'}</td>
                        <td className="p-2.5 text-slate-600">{item.pickupLocation || '—'}</td>
                        <td className="p-2.5 text-slate-600">{item.deliveryLocation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={() => window.print()}>In phiếu chuyến</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Import Excel */}
      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Nhập lịch vận chuyển từ Excel"
        size="xl"
      >
        <div className="space-y-4 text-xs">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => void chooseFile(event.target.files?.[0])}
            className="w-full rounded-xl border border-slate-200 p-2 text-xs"
          />
          {importing && <p className="text-slate-500">Đang đọc và kiểm tra dữ liệu file Excel...</p>}
          {preview && (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                <StatCard label="Tổng chuyến" value={preview.tripCount} />
                <StatCard label="Dòng hàng hóa" value={preview.itemCount} />
                <StatCard label="Cảnh báo" value={preview.warnings.length} />
                <StatCard label="Lỗi dữ liệu" value={preview.errors.length} />
              </div>
              {preview.errors.map((item) => (
                <p key={`e-${item.rowNumber}-${item.field}`} className="text-red-700 font-semibold">
                  Dòng {item.rowNumber}: {item.message}
                </p>
              ))}
              {preview.warnings.slice(0, 20).map((item) => (
                <p key={`w-${item.rowNumber}-${item.field}`} className="text-amber-700 font-medium">
                  Dòng {item.rowNumber}: {item.message}
                </p>
              ))}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button disabled={!preview.canCommit || importing} onClick={() => void commit()}>
                  Xác nhận ghi {preview.tripCount} chuyến
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Lập Vận đơn mới */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Lập vận đơn mới" size="lg">
        <form onSubmit={create} className="grid gap-3 text-xs sm:grid-cols-2">
          {[
            ['code', 'Mã chuyến (VD: LVC-2026-009)'],
            ['cargoName', 'Hàng hóa / Mặt hàng'],
            ['origin', 'Nơi nhận hàng'],
            ['destination', 'Nơi giao hàng'],
            ['unitOfMeasure', 'Đơn vị tính (Tấn, Pallet, Thùng...)'],
            ['quantity', 'Số lượng / Khối lượng'],
          ].map(([name, label]) => (
            <label key={name}>
              <span className="mb-1 block font-bold text-slate-700">{label}</span>
              <input
                name={name}
                type={name === 'quantity' ? 'number' : 'text'}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          ))}

          <label>
            <span className="mb-1 block font-bold text-slate-700">Đơn vị phụ trách</span>
            <select
              name="unit"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option>BAN_CO_GIOI</option>
              <option>NT1</option>
              <option>NT2</option>
              <option>XN_BO</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Hình thức vận tải</span>
            <select
              name="routeType"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ONE_WAY">Một chiều</option>
              <option value="TWO_WAY">Hai chiều / Đối lưu</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Luồng vận chuyển</span>
            <select
              name="flowType"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="STANDARD">Thông thường</option>
              <option value="LIVESTOCK_FEED_3_LEG">Thức ăn 3 chặng</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block font-bold text-slate-700">Ngày yêu cầu</span>
            <input
              name="requestDate"
              type="date"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block font-bold text-slate-700">Ngày thực hiện</span>
            <input
              name="executionDate"
              type="date"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu bản nháp'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
