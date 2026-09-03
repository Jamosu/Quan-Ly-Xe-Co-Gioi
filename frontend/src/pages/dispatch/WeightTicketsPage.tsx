import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Compass, Printer, Scale } from 'lucide-react';
import { operationsApi } from '../../api/operations';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { KPIGrid } from '../../components/data-display/KPIGrid';
import { StatCard } from '../../components/data-display/StatCard';
import { FilterBar } from '../../components/filters/FilterBar';
import { ErrorState, StatusBadge } from '../../components/operations/OperationUi';
import type { OperationConfirmationRecord } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';

export const WeightTicketsPage: React.FC = () => {
  const [items, setItems] = useState<OperationConfirmationRecord[]>([]); const [selected, setSelected] = useState<OperationConfirmationRecord | null>(null);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const selectedStatus = useFilterStore((state) => state.selectedStatus);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await operationsApi.confirmations({ page, limit: 20, search: search || undefined, status: ['PENDING', 'CONFIRMED', 'REJECTED'].includes(selectedStatus) ? selectedStatus : undefined }); setItems(result.items); setTotal(result.pagination.total); } catch { setError('Không thể tải phiếu cân và nghiệm thu GPS.'); } finally { setLoading(false); } }, [page, search, selectedStatus]); useEffect(() => { void load(); }, [load]);
  const columns: Column<OperationConfirmationRecord>[] = [
    { key: 'code', title: 'Số phiếu', render: (row) => <div><b className="text-primary">{row.code}</b><small className="block text-slate-500">{row.dispatchOrder?.code || row.transportOrder?.code}</small></div> },
    { key: 'vehicle', title: 'Xe & tài xế', render: (row) => { const parent = row.dispatchOrder || row.transportOrder; return <div><b>{parent?.vehicle?.plate || parent?.vehicle?.code || '—'}</b><small className="block text-slate-500">{parent?.driver?.fullName || '—'}</small></div>; } },
    { key: 'type', title: 'Loại', render: (row) => row.type === 'WEIGHT' ? 'Phiếu cân' : 'Nghiệm thu GPS' },
    { key: 'result', title: 'Kết quả', render: (row) => row.type === 'WEIGHT' ? `${row.netWeightTons ?? 0} tấn` : `${row.measuredAreaHa ?? 0} ha / ${row.machineHours ?? 0} giờ` },
    { key: 'routeLocation', title: 'Địa điểm' },
    { key: 'status', title: 'Trạng thái', render: (row) => <StatusBadge status={row.status}/> },
  ];
  const confirm = async () => { if (!selected) return; setSaving(true); try { const updated = await operationsApi.confirm(selected.id); setSelected(updated); await load(); } catch { setError('Không thể xác nhận phiếu. Kiểm tra quyền và trạng thái hiện tại.'); } finally { setSaving(false); } };
  return <div className="space-y-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-extrabold">Xác nhận khối lượng & GPS</h1><p className="text-xs text-slate-500">Phiếu cân và nghiệm thu diện tích lấy trực tiếp từ API.</p></div><Button variant="outline" icon={<Printer className="h-4 w-4"/>} onClick={() => window.print()}>In biên bản</Button></div>
    <FilterBar showDateFilter={false} onSearchChange={(value) => { setPage(1); setSearch(value); }} onRefresh={() => void load()} statusOptions={[{ value: 'ALL', label: 'Tất cả' }, { value: 'PENDING', label: 'Chờ xác nhận' }, { value: 'CONFIRMED', label: 'Đã xác nhận' }, { value: 'REJECTED', label: 'Từ chối' }]}/>
    <KPIGrid cols={4}><StatCard label="Tổng phiếu" value={total}/><StatCard label="Khối lượng" value={`${items.filter((item) => item.type === 'WEIGHT').reduce((sum, item) => sum + (item.netWeightTons || 0), 0).toFixed(2)} tấn`} icon={<Scale className="h-5 w-5"/>}/><StatCard label="Diện tích GPS" value={`${items.filter((item) => item.type === 'GPS').reduce((sum, item) => sum + (item.measuredAreaHa || 0), 0).toFixed(2)} ha`} icon={<Compass className="h-5 w-5"/>}/><StatCard label="Chờ xác nhận" value={items.filter((item) => item.status === 'PENDING').length} icon={<CheckCircle2 className="h-5 w-5"/>}/></KPIGrid>
    {error ? <ErrorState message={error} onRetry={() => void load()}/> : <DataTable columns={columns} data={items} isLoading={loading} onRowClick={setSelected} serverSide controlledPage={page} totalItems={total} onPageChange={setPage} useGlobalFilters={false}/>} 
    <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Phiếu ${selected?.code ?? ''}`} size="lg">{selected && <div className="space-y-4 text-sm"><div className="rounded-xl border bg-slate-50 p-4"><p>Lệnh: <b>{selected.dispatchOrder?.code || selected.transportOrder?.code}</b></p><p>Địa điểm: <b>{selected.routeLocation || '—'}</b></p></div>{selected.type === 'WEIGHT' ? <div className="grid grid-cols-3 gap-3 rounded-xl bg-emerald-50 p-4 text-center"><p>Tổng tải<b className="block text-lg">{selected.grossWeightTons ?? 0}</b></p><p>Trọng bì<b className="block text-lg">{selected.tareWeightTons ?? 0}</b></p><p>Trọng tịnh<b className="block text-lg">{selected.netWeightTons ?? 0}</b></p></div> : <div className="grid grid-cols-2 gap-3 rounded-xl bg-emerald-50 p-4 text-center"><p>Diện tích GPS<b className="block text-lg">{selected.measuredAreaHa ?? 0} ha</b></p><p>Giờ máy<b className="block text-lg">{selected.machineHours ?? 0} giờ</b></p></div>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => window.print()}>In phiếu</Button>{selected.status === 'PENDING' && <Button disabled={saving} onClick={() => void confirm()}>{saving ? 'Đang xác nhận...' : 'Xác nhận'}</Button>}</div></div>}</Modal>
  </div>;
};
