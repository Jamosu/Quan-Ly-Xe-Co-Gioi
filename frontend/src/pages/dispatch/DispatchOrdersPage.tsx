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
} from 'lucide-react';
import { operationsApi } from '../../api/operations';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { FilterBar } from '../../components/filters/FilterBar';
import { ErrorState, formatDateTime, StatusBadge, ViewSwitcher } from '../../components/operations/OperationUi';
import type { DispatchOrderRecord } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';

const groups = [
  { key: 'pending', title: 'Chờ duyệt', statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] },
  { key: 'assigned', title: 'Đã giao / di chuyển', statuses: ['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED'] },
  { key: 'working', title: 'Đang làm việc', statuses: ['WORKING'] },
  { key: 'completed', title: 'Hoàn tất / nghiệm thu', statuses: ['COMPLETED', 'ACCEPTED', 'CLOSED'] },
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
  const [view, setView] = useState<'kanban' | 'daily_timeline' | 'table'>('kanban');
  const [orders, setOrders] = useState<DispatchOrderRecord[]>([]);
  const [selected, setSelected] = useState<DispatchOrderRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Bộ lọc & sắp xếp theo ngày
  const [selectedDate, setSelectedDate] = useState<string>('ALL'); // 'ALL' hoặc 'YYYY-MM-DD'
  const [sortOrder, setSortOrder] = useState<'time_asc' | 'time_desc'>('time_asc');

  const selectedStatus = useFilterStore((state) => state.selectedStatus);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await operationsApi.dispatchOrders({
        page,
        limit: 50,
        search: search || undefined,
        status: groups.some((group) => group.statuses.includes(selectedStatus)) ? selectedStatus : undefined,
      });
      setOrders(result.items);
      setTotal(result.pagination.total);
    } catch {
      setError('Không thể tải lệnh điều xe từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // Danh sách các ngày duy nhất có lệnh điều xe (được sắp xếp)
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    for (const order of orders) {
      if (order.departureTime) {
        datesSet.add(toDateString(order.departureTime));
      } else if (order.plannedEndTime) {
        datesSet.add(toDateString(order.plannedEndTime));
      }
    }
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Lọc danh sách theo ngày được chọn
  const dateFilteredOrders = useMemo(() => {
    let list = orders;
    if (selectedDate !== 'ALL') {
      list = list.filter((order) => {
        const depDate = order.departureTime ? toDateString(order.departureTime) : '';
        const endDate = order.plannedEndTime ? toDateString(order.plannedEndTime) : '';
        return depDate === selectedDate || endDate === selectedDate;
      });
    }

    // Sắp xếp theo ngày giờ khởi hành
    return [...list].sort((a, b) => {
      const timeA = a.departureTime ? new Date(a.departureTime).getTime() : 0;
      const timeB = b.departureTime ? new Date(b.departureTime).getTime() : 0;
      return sortOrder === 'time_asc' ? timeA - timeB : timeB - timeA;
    });
  }, [orders, selectedDate, sortOrder]);

  // Gom nhóm theo ngày cho chế độ Daily Timeline
  const ordersByDay = useMemo(() => {
    const map = new Map<string, DispatchOrderRecord[]>();
    for (const order of dateFilteredOrders) {
      const key = order.departureTime ? toDateString(order.departureTime) : 'Chưa xếp ngày';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
    }
    return Array.from(map.entries()).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
  }, [dateFilteredOrders]);

  // Kanban groups dựa trên danh sách đã lọc ngày
  const grouped = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      orders: dateFilteredOrders.filter((order) => group.statuses.includes(order.status)),
    }));
  }, [dateFilteredOrders]);

  // Điều hướng ngày nhanh
  const handleStepDate = (days: number) => {
    const base = selectedDate === 'ALL' ? new Date() : new Date(selectedDate);
    base.setDate(base.getDate() + days);
    setSelectedDate(toDateString(base));
  };

  const handleSelectToday = () => {
    setSelectedDate(toDateString(new Date()));
  };

  const columns: Column<DispatchOrderRecord>[] = [
    {
      key: 'code',
      title: 'Mã lệnh',
      sortable: true,
      render: (row) => <b className="font-semibold text-primary">{row.code}</b>,
    },
    {
      key: 'departureTime',
      title: 'Ngày & Giờ đi',
      sortable: true,
      render: (row) => {
        if (!row.departureTime) return <span className="text-slate-400">—</span>;
        const d = new Date(row.departureTime);
        return (
          <div>
            <div className="font-semibold text-slate-900">
              {d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-500">
              {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'purpose',
      title: 'Nhiệm vụ',
      render: (row) => (
        <div>
          <b className="font-semibold text-slate-900">{row.purpose}</b>
          <small className="block text-[11px] text-slate-500">Nguồn: {row.sourceType} · {row.unit}</small>
        </div>
      ),
    },
    {
      key: 'vehicle',
      title: 'Xe & Nông cụ',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800">
            {row.vehicle?.plate || row.vehicle?.code || row.legacyVehicle || 'Chưa gán'}
          </div>
          {row.implement && (
            <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
              + {row.implement.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'driver',
      title: 'Tài xế',
      render: (row) => (
        <span className="font-medium text-slate-700">
          {row.driver?.fullName || row.legacyDriver || 'Chưa gán'}
        </span>
      ),
    },
    {
      key: 'route',
      title: 'Lộ trình',
      render: (row) => (
        <div className="text-xs">
          <span className="font-medium text-slate-700">{row.origin}</span>
          <span className="mx-1 text-slate-400">➔</span>
          <span className="font-medium text-slate-900">{row.destination}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={row.status} />
          {row.isDelayed && (
            <span title="Cảnh báo trễ tiến độ">
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
      await operationsApi.createDispatch({
        code: form.get('code'),
        unit: form.get('unit'),
        purpose: form.get('purpose'),
        origin: form.get('origin'),
        destination: form.get('destination'),
        departureTime: form.get('departureTime') ? new Date(String(form.get('departureTime'))).toISOString() : undefined,
        plannedEndTime: form.get('plannedEndTime') ? new Date(String(form.get('plannedEndTime'))).toISOString() : undefined,
      });
      setShowCreate(false);
      await load();
    } catch {
      setError('Không thể tạo lệnh điều xe. Kiểm tra dữ liệu và mã lệnh.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Quản lý lệnh điều xe</h1>
          <p className="text-xs text-slate-500">
            Sắp xếp & lọc theo từng ngày, theo dõi phê duyệt, phân công, tài xế xác nhận và nghiệm thu ca.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            In / Lưu PDF
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Lập lệnh
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
          ...groups.flatMap((group) => group.statuses).map((value) => ({ value, label: value })),
        ]}
      />

      {/* THANH CHỌN VÀ SẮP XẾP THEO NGÀY */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
            <Calendar className="h-4 w-4 text-primary" /> Chọn ngày:
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
            Tất cả các ngày
          </button>

          <button
            type="button"
            onClick={handleSelectToday}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedDate === toDateString(new Date())
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hôm nay
          </button>

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

          {availableDates.length > 0 && selectedDate === 'ALL' && (
            <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500">
              <span>(Có {availableDates.length} ngày có dữ liệu)</span>
            </div>
          )}
        </div>

        {/* Nút sắp xếp thứ tự giờ */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'time_asc' ? 'time_desc' : 'time_asc')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
            <span>
              {sortOrder === 'time_asc' ? 'Sắp xếp: Giờ đi sớm ➔ muộn' : 'Sắp xếp: Giờ đi muộn ➔ sớm'}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPIGrid cols={4}>
        <StatCard
          label={selectedDate === 'ALL' ? 'Tổng lệnh điều xe' : `Lệnh trong ngày (${selectedDate})`}
          value={dateFilteredOrders.length}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Chờ duyệt / phân công"
          value={grouped[0].orders.length}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          label="Đang làm việc"
          value={dateFilteredOrders.filter((o) => o.status === 'WORKING').length}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Cảnh báo trễ"
          value={dateFilteredOrders.filter((o) => o.isDelayed).length}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        />
      </KPIGrid>

      {/* View Switcher */}
      <ViewSwitcher<'kanban' | 'daily_timeline' | 'table'>
        value={view}
        onChange={setView}
        options={[
          { value: 'kanban', label: 'Kanban 4 nhóm trạng thái' },
          { value: 'daily_timeline', label: 'Lịch trình theo từng ngày' },
          { value: 'table', label: 'Bảng danh sách chi tiết' },
        ]}
      />

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-medium text-slate-400">
          Đang tải dữ liệu lệnh điều xe...
        </div>
      ) : view === 'table' ? (
        /* GIAO DIỆN BẢNG */
        <DataTable
          columns={columns}
          data={dateFilteredOrders}
          isLoading={loading}
          onRowClick={setSelected}
          serverSide={false}
          totalItems={dateFilteredOrders.length}
          useGlobalFilters={false}
        />
      ) : view === 'daily_timeline' ? (
        /* GIAO DIỆN LỊCH TRÌNH THEO TỪNG NGÀY */
        <div className="space-y-4">
          {ordersByDay.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              Không có lệnh điều xe nào trong ngày hoặc bộ lọc đã chọn.
            </div>
          ) : (
            ordersByDay.map(([dayKey, dayOrders]) => {
              const formattedDate =
                dayKey !== 'Chưa xếp ngày'
                  ? new Date(dayKey).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : 'Chưa xác định ngày';

              const isToday = dayKey === toDateString(new Date());

              return (
                <div key={dayKey} className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  {/* Header ngày */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 border-b ${
                      isToday ? 'bg-primary/10 border-primary/20' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className={`h-4 w-4 ${isToday ? 'text-primary' : 'text-slate-500'}`} />
                      <h3 className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-slate-900'}`}>
                        {formattedDate}
                      </h3>
                      {isToday && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {dayOrders.length} lệnh điều động
                    </span>
                  </div>

                  {/* Danh sách lệnh trong ngày */}
                  <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {dayOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => setSelected(order)}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-xs hover:border-primary hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <b className="font-mono text-primary font-bold text-sm">{order.code}</b>
                          <div className="flex items-center gap-1">
                            <StatusBadge status={order.status} />
                            {order.isDelayed && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          </div>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm mb-2">{order.purpose}</h4>

                        <div className="space-y-1.5 text-slate-600 text-[11px] mb-3">
                          <div className="flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">
                              {order.vehicle?.plate || order.vehicle?.code || order.legacyVehicle || 'Chưa gán xe'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{order.driver?.fullName || order.legacyDriver || 'Chưa gán tài xế'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>Giờ xuất phát: <b>{formatDateTime(order.departureTime)}</b></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{order.origin} ➔ {order.destination}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
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
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs shadow-xs hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <b className="text-primary font-mono font-bold">{order.code}</b>
                      {order.isDelayed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="h-3 w-3" /> Trễ
                        </span>
                      )}
                    </div>

                    <h4 className="my-1.5 font-bold text-slate-900 leading-snug line-clamp-2">{order.purpose}</h4>

                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <p className="font-semibold text-slate-800">
                        {order.vehicle?.plate || order.vehicle?.code || order.legacyVehicle || 'Chưa gán xe'}
                      </p>
                      <p className="text-slate-500">
                        {order.driver?.fullName || order.legacyDriver || 'Chưa gán tài xế'}
                      </p>
                      <p className="text-slate-500 flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatDateTime(order.departureTime)}
                      </p>
                      <p className="text-slate-500 truncate">{order.origin} ➔ {order.destination}</p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
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
      )}

      {/* Modal Chi tiết Lệnh điều xe */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Chi tiết lệnh ${selected?.code ?? ''}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 text-xs">
              <p>
                <span className="text-slate-500 block font-medium mb-0.5">Nhiệm vụ</span>
                <b className="text-slate-900 text-sm">{selected.purpose}</b>
              </p>
              <p>
                <span className="text-slate-500 block font-medium mb-0.5">Trạng thái</span>
                <span className="block">
                  <StatusBadge status={selected.status} />
                </span>
              </p>
              <p>
                <span className="text-slate-500 block font-medium mb-0.5">Phương tiện</span>
                <b className="text-slate-800">
                  {selected.vehicle?.plate || selected.vehicle?.code || selected.legacyVehicle || 'Chưa gán'}
                </b>
              </p>
              <p>
                <span className="text-slate-500 block font-medium mb-0.5">Tài xế</span>
                <b className="text-slate-800">
                  {selected.driver?.fullName || selected.legacyDriver || 'Chưa gán'}
                </b>
              </p>
              <p>
                <span className="text-slate-500 block font-medium mb-0.5">Lộ trình di chuyển</span>
                <b className="text-slate-800">{selected.origin} ➔ {selected.destination}</b>
              </p>
              <p>
                <span className="text-slate-500 block font-medium mb-0.5">Giờ yêu cầu khởi hành</span>
                <b className="text-slate-800">{formatDateTime(selected.departureTime)}</b>
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => window.print()}>In phiếu</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Lập Lệnh điều xe mới */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Lập lệnh điều xe mới" size="lg">
        <form onSubmit={create} className="grid gap-3 text-xs sm:grid-cols-2">
          {[
            ['code', 'Mã lệnh điều xe (VD: LDX-2026-009)'],
            ['purpose', 'Nhiệm vụ điều động'],
            ['origin', 'Điểm đi / Nơi xuất phát'],
            ['destination', 'Điểm đến / Nơi tiếp nhận'],
          ].map(([name, label]) => (
            <label key={name}>
              <span className="mb-1 block font-bold text-slate-700">{label}</span>
              <input
                name={name}
                required
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          ))}

          <label>
            <span className="mb-1 block font-bold text-slate-700">Đơn vị</span>
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
            <span className="mb-1 block font-bold text-slate-700">Thời gian bắt đầu dự kiến</span>
            <input
              name="departureTime"
              type="datetime-local"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block font-bold text-slate-700">Thời gian kết thúc dự kiến</span>
            <input
              name="plannedEndTime"
              type="datetime-local"
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
