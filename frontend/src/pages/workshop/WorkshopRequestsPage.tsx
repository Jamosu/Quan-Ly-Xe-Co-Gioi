import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Columns as Columns3, List, Loader2, Plus, RefreshCw, Search, Truck, Wrench } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

type RequestType = 'MAINTENANCE' | 'REPAIR';
type AssetType = 'VEHICLE' | 'IMPLEMENT';
type RequestStatus = 'RECEIVED' | 'ASSESSED' | 'PLANNED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'WAITING_VENDOR' | 'READY_FOR_ACCEPTANCE' | 'REWORK_REQUIRED' | 'HANDED_OVER' | 'COMPLETED' | 'CANCELLED';
type RepairRoute = 'INTERNAL' | 'WARRANTY_VENDOR' | 'OUTSOURCED_VENDOR';

interface Asset {
  id: number;
  code: string;
  plate?: string;
  name: string;
  unit?: string;
  conditionStatus?: string;
  technicalCondition?: string;
}

interface DocumentItem {
  id: number;
  type: string;
  status: string;
  documentNo?: string;
}

interface WorkshopRequest {
  id: number;
  code: string;
  type: RequestType;
  source: string;
  status: RequestStatus;
  repairRoute: RepairRoute;
  priority: string;
  issueDescription: string;
  rootCause?: string;
  resolution?: string;
  vendorName?: string;
  vendorContact?: string;
  vendorSentAt?: string;
  vendorExpectedReturnAt?: string;
  vendorReturnedAt?: string;
  vendorNotes?: string;
  estimatedCostVnd: number;
  actualCostVnd: number;
  createdAt: string;
  vehicle?: Asset;
  implement?: Asset;
  assignedTechnician?: { id: number; fullName: string };
  documents: DocumentItem[];
}

const unwrap = (response: any) => response.data?.data ?? response.data;
const typeLabels: Record<RequestType, string> = { MAINTENANCE: 'Bảo dưỡng', REPAIR: 'Sửa chữa' };
const statusLabels: Record<RequestStatus, string> = {
  RECEIVED: 'Chờ tiếp nhận', ASSESSED: 'Đã đánh giá', PLANNED: 'Đã lập kế hoạch', IN_PROGRESS: 'Đang thực hiện',
  WAITING_PARTS: 'Chờ vật tư', WAITING_VENDOR: 'Chờ nhà cung cấp', READY_FOR_ACCEPTANCE: 'Chờ nghiệm thu',
  REWORK_REQUIRED: 'Cần sửa lại', HANDED_OVER: 'Đã bàn giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy',
};
const routeLabels: Record<RepairRoute, string> = { INTERNAL: 'Sửa nội bộ', WARRANTY_VENDOR: 'Bảo hành NCC', OUTSOURCED_VENDOR: 'Thuê ngoài' };
const sourceLabels: Record<string, string> = { MANUAL: 'Tạo thủ công', ASSET_PROFILE: 'Hồ sơ tài sản', MAINTENANCE_PLAN: 'Kế hoạch bảo dưỡng', SOS: 'SOS', ASSET_CONDITION: 'Tình trạng tài sản' };
const documentLabels: Record<string, string> = {
  BM09_REQUEST: 'BM09 · Phiếu yêu cầu', BM01_INCIDENT: 'BM01 · Biên bản sự việc', BM02_REPAIR: 'BM02 · Phiếu sửa chữa',
  BM03_VENDOR_FEEDBACK: 'BM03 · Phản hồi NCC', BM10_REPAIR_HISTORY: 'BM10 · Lịch sử sửa chữa',
  BM11_TECHNICAL_REPORT: 'BM11 · Báo cáo kỹ thuật', BM12_ACCEPTANCE: 'BM12 · Biên bản nghiệm thu',
};
const documentStatusLabels: Record<string, string> = { NOT_STARTED: 'Chưa thực hiện', IN_PROGRESS: 'Đang thực hiện', WAITING_APPROVAL: 'Chờ duyệt', COMPLETED: 'Hoàn tất' };
const stages: Array<{ title: string; statuses: RequestStatus[]; color: string }> = [
  { title: 'Chờ tiếp nhận', statuses: ['RECEIVED'], color: 'border-slate-300' },
  { title: 'Đánh giá & kế hoạch', statuses: ['ASSESSED', 'PLANNED'], color: 'border-sky-300' },
  { title: 'Đang thực hiện', statuses: ['IN_PROGRESS', 'WAITING_PARTS', 'WAITING_VENDOR', 'REWORK_REQUIRED'], color: 'border-amber-300' },
  { title: 'Chờ nghiệm thu', statuses: ['READY_FOR_ACCEPTANCE'], color: 'border-violet-300' },
  { title: 'Bàn giao', statuses: ['HANDED_OVER'], color: 'border-emerald-300' },
  { title: 'Hoàn tất', statuses: ['COMPLETED', 'CANCELLED'], color: 'border-green-300' },
];

const assetName = (item: WorkshopRequest) => {
  const asset = item.vehicle || item.implement;
  return asset ? `${asset.plate ? `${asset.plate} · ` : ''}${asset.code} · ${asset.name}` : 'Chưa xác định tài sản';
};
const dateInput = (value?: string) => value ? new Date(value).toISOString().slice(0, 10) : '';

export const WorkshopRequestsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const legacyRepair = location.pathname.endsWith('/phieu-sua-chua');
  const defaultKanban = location.pathname.endsWith('/tien-do');
  const tab: RequestType = legacyRepair || params.get('tab') === 'repair' ? 'REPAIR' : 'MAINTENANCE';
  const view = (params.get('view') || (defaultKanban ? 'kanban' : 'table')) as 'table' | 'kanban';
  const [requests, setRequests] = useState<WorkshopRequest[]>([]);
  const [search, setSearch] = useState('');
  const [assetType, setAssetType] = useState<'' | AssetType>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<WorkshopRequest | null>(null);
  const [edit, setEdit] = useState<Record<string, any>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ assetType: (params.get('assetType')?.toUpperCase() || 'VEHICLE') as AssetType, assetId: params.get('assetId') || '', issueDescription: '', repairRoute: 'INTERNAL' as RepairRoute });
  const [saving, setSaving] = useState(false);

  const changeParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const query = { type: tab, assetType: assetType || undefined, search: search || undefined, page: 1, limit: 1000 };
      const requestRes = await apiClient.get('/workshop/requests', { params: query });
      const requestData = unwrap(requestRes) || {};
      setRequests(requestData.items || []);
      const requestedId = Number(params.get('requestId'));
      if (requestedId) {
        const found = (requestData.items || []).find((item: WorkshopRequest) => item.id === requestedId);
        if (found) openDetail(found);
        else {
          const detail = unwrap(await apiClient.get(`/workshop/requests/${requestedId}`));
          if (detail?.type === tab) openDetail(detail);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không tải được dữ liệu công việc xưởng.');
    } finally { setLoading(false); }
  }, [tab, assetType, search, params.get('requestId')]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (params.get('assetId')) setShowCreate(true); }, []);

  const openDetail = (item: WorkshopRequest) => {
    setSelected(item);
    setEdit({ status: item.status, repairRoute: item.repairRoute, rootCause: item.rootCause || '', resolution: item.resolution || '', vendorName: item.vendorName || '', vendorContact: item.vendorContact || '', vendorSentAt: dateInput(item.vendorSentAt), vendorExpectedReturnAt: dateInput(item.vendorExpectedReturnAt), vendorReturnedAt: dateInput(item.vendorReturnedAt), vendorNotes: item.vendorNotes || '', estimatedCostVnd: item.estimatedCostVnd || 0, actualCostVnd: item.actualCostVnd || 0 });
    changeParams({ requestId: String(item.id) });
  };
  const closeDetail = () => { setSelected(null); changeParams({ requestId: null }); };
  const setTab = (next: RequestType) => navigate(`/xuong-btsc/yeu-cau?tab=${next === 'REPAIR' ? 'repair' : 'maintenance'}&view=${view}`);
  const setView = (next: 'table' | 'kanban') => changeParams({ view: next });

  const createRequest = async () => {
    if (!createForm.assetId || !createForm.issueDescription.trim()) return;
    setSaving(true);
    try {
      const created = unwrap(await apiClient.post('/workshop/requests', { type: tab, source: 'MANUAL', vehicleId: createForm.assetType === 'VEHICLE' ? Number(createForm.assetId) : undefined, implementId: createForm.assetType === 'IMPLEMENT' ? Number(createForm.assetId) : undefined, issueDescription: createForm.issueDescription, repairRoute: createForm.repairRoute }));
      setShowCreate(false); setCreateForm((old) => ({ ...old, issueDescription: '' })); await load(); openDetail(created);
    } finally { setSaving(false); }
  };

  const saveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = { ...edit };
      ['vendorSentAt', 'vendorExpectedReturnAt', 'vendorReturnedAt'].forEach((key) => { payload[key] = payload[key] ? new Date(payload[key]).toISOString() : undefined; });
      const updated = unwrap(await apiClient.patch(`/workshop/requests/${selected.id}`, payload));
      setSelected(updated); await load();
    } finally { setSaving(false); }
  };

  const updateDocument = async (document: DocumentItem, status: string) => {
    if (!selected) return;
    await apiClient.patch(`/workshop/requests/${selected.id}/documents/${document.type}`, { status });
    const updated = unwrap(await apiClient.get(`/workshop/requests/${selected.id}`));
    setSelected(updated);
  };

  const activeCount = requests.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length;
  const externalCount = requests.filter((r) => r.repairRoute !== 'INTERNAL' && !['COMPLETED', 'CANCELLED'].includes(r.status)).length;
  const waitingCount = requests.filter((r) => ['WAITING_PARTS', 'WAITING_VENDOR'].includes(r.status)).length;
  const completedCount = requests.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Công việc xưởng BTSC</h1><p className="mt-1 text-sm text-slate-500">Một luồng từ tiếp nhận, đánh giá, thực hiện đến nghiệm thu và bàn giao.</p></div>
        <div className="flex gap-2"><Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>Làm mới</Button><Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Tạo yêu cầu</Button></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex gap-1">{(['MAINTENANCE', 'REPAIR'] as RequestType[]).map((value) => <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-5 py-2.5 text-sm font-bold ${tab === value ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{value === 'MAINTENANCE' ? 'Bảo dưỡng' : 'Sửa chữa'}</button>)}</div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1"><button onClick={() => setView('kanban')} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === 'kanban' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}><Columns3 className="h-4 w-4" />Kanban</button><button onClick={() => setView('table')} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}><List className="h-4 w-4" />Danh sách</button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Đang mở', activeCount, Wrench, 'text-sky-700 bg-sky-50'], ['Chờ vật tư/NCC', waitingCount, Truck, 'text-amber-700 bg-amber-50'], ['Sửa ngoài', externalCount, ClipboardList, 'text-violet-700 bg-violet-50'], ['Hoàn tất', completedCount, CheckCircle2, 'text-emerald-700 bg-emerald-50']].map(([label, value, Icon, color]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></div><div className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></div></div></div>)}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã phiếu, biển số, mã tài sản..." className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
        <select value={assetType} onChange={(e) => setAssetType(e.target.value as any)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Tất cả tài sản</option><option value="VEHICLE">Xe</option><option value="IMPLEMENT">Thiết bị</option></select>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Đang tải dữ liệu thật...</div> : view === 'kanban' ? (
        <div className="grid min-w-[1100px] grid-cols-6 gap-3 overflow-x-auto pb-2">{stages.map((stage) => { const items = requests.filter((r) => stage.statuses.includes(r.status)); return <section key={stage.title} className={`min-h-72 rounded-2xl border-t-4 ${stage.color} bg-slate-100 p-2`}><div className="mb-2 flex items-center justify-between px-1"><h3 className="text-xs font-extrabold text-slate-700">{stage.title}</h3><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{items.length}</span></div><div className="space-y-2">{items.map((item) => <button key={item.id} onClick={() => openDetail(item)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-primary"><div className="flex items-start justify-between gap-2"><span className="text-xs font-extrabold text-primary">{item.code}</span><Badge size="sm" variant={item.status === 'COMPLETED' ? 'green' : item.status.includes('WAITING') ? 'amber' : 'blue'}>{statusLabels[item.status]}</Badge></div><p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-800">{item.issueDescription}</p><p className="mt-2 truncate text-[11px] text-slate-500">{assetName(item)}</p></button>)}{!items.length && <p className="py-8 text-center text-xs text-slate-400">Không có công việc</p>}</div></section>; })}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Mã phiếu</th><th className="px-4 py-3">Tài sản</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Phân luồng</th></tr></thead><tbody className="divide-y divide-slate-100">{requests.map((item) => <tr key={item.id} onClick={() => openDetail(item)} className="cursor-pointer hover:bg-slate-50"><td className="px-4 py-3 font-bold text-primary">{item.code}</td><td className="px-4 py-3 font-semibold text-slate-700">{assetName(item)}</td><td className="max-w-xs truncate px-4 py-3 text-slate-600">{item.issueDescription}</td><td className="px-4 py-3 text-xs text-slate-500">{sourceLabels[item.source] || item.source}</td><td className="px-4 py-3"><Badge size="sm" variant={item.status === 'COMPLETED' ? 'green' : item.status.includes('WAITING') ? 'amber' : 'blue'}>{statusLabels[item.status]}</Badge></td><td className="px-4 py-3 text-xs">{routeLabels[item.repairRoute]}</td></tr>)}{!requests.length && <tr><td colSpan={6} className="py-12 text-center text-slate-400">Chưa có yêu cầu {typeLabels[tab].toLowerCase()}.</td></tr>}</tbody></table></div></div>
      )}

      <Modal isOpen={Boolean(selected)} onClose={closeDetail} title={selected?.code || 'Chi tiết yêu cầu'} subtitle={selected ? `${typeLabels[selected.type]} · ${assetName(selected)}` : ''} size="3xl" footer={<><Button variant="outline" onClick={closeDetail}>Đóng</Button><Button disabled={saving} onClick={() => void saveDetail()}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button></>}>
        {selected && <div className="grid gap-6 lg:grid-cols-2"><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Trạng thái<select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Phân luồng<select value={edit.repairRoute} onChange={(e) => setEdit({ ...edit, repairRoute: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm">{Object.entries(routeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label className="block text-xs font-semibold text-slate-600">Mô tả<textarea value={selected.issueDescription} readOnly className="mt-1 h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm" /></label><label className="block text-xs font-semibold text-slate-600">Nguyên nhân<textarea value={edit.rootCause} onChange={(e) => setEdit({ ...edit, rootCause: e.target.value })} className="mt-1 h-20 w-full rounded-xl border border-slate-200 p-2 text-sm" /></label><label className="block text-xs font-semibold text-slate-600">Giải pháp<textarea value={edit.resolution} onChange={(e) => setEdit({ ...edit, resolution: e.target.value })} className="mt-1 h-20 w-full rounded-xl border border-slate-200 p-2 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Chi phí dự kiến<input type="number" min="0" value={edit.estimatedCostVnd} onChange={(e) => setEdit({ ...edit, estimatedCostVnd: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Chi phí thực tế<input type="number" min="0" value={edit.actualCostVnd} onChange={(e) => setEdit({ ...edit, actualCostVnd: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" /></label></div>{edit.repairRoute !== 'INTERNAL' && <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-3"><h3 className="text-sm font-bold text-violet-800">Thông tin nhà cung cấp</h3><div className="grid grid-cols-2 gap-3"><input placeholder="Tên nhà cung cấp *" value={edit.vendorName} onChange={(e) => setEdit({ ...edit, vendorName: e.target.value })} className="rounded-lg border p-2 text-sm" /><input placeholder="Người liên hệ" value={edit.vendorContact} onChange={(e) => setEdit({ ...edit, vendorContact: e.target.value })} className="rounded-lg border p-2 text-sm" /><label className="text-xs">Ngày gửi *<input type="date" value={edit.vendorSentAt} onChange={(e) => setEdit({ ...edit, vendorSentAt: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label><label className="text-xs">Hẹn trả *<input type="date" value={edit.vendorExpectedReturnAt} onChange={(e) => setEdit({ ...edit, vendorExpectedReturnAt: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label><label className="text-xs">Ngày nhận lại<input type="date" value={edit.vendorReturnedAt} onChange={(e) => setEdit({ ...edit, vendorReturnedAt: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label></div></div>}</div><div><h3 className="mb-3 text-sm font-extrabold text-slate-800">Hồ sơ biểu mẫu</h3><div className="space-y-2">{selected.documents.map((document) => <div key={document.type} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><span className="text-xs font-semibold text-slate-700">{documentLabels[document.type] || document.type}</span><select value={document.status} onChange={(e) => void updateDocument(document, e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">{Object.entries(documentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}</div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><p>Nguồn: <strong>{sourceLabels[selected.source] || selected.source}</strong></p><p className="mt-1">Kỹ thuật viên: <strong>{selected.assignedTechnician?.fullName || 'Chưa phân công'}</strong></p><p className="mt-1">Khởi tạo: <strong>{new Date(selected.createdAt).toLocaleString('vi-VN')}</strong></p></div></div></div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`Tạo yêu cầu ${typeLabels[tab].toLowerCase()}`} subtitle="Nhập ID tài sản hoặc mở từ hồ sơ xe/thiết bị để được điền sẵn." footer={<><Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button><Button disabled={saving || !createForm.assetId || !createForm.issueDescription.trim()} onClick={() => void createRequest()}>Tạo yêu cầu</Button></>}>
        <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Loại tài sản<select value={createForm.assetType} onChange={(e) => setCreateForm({ ...createForm, assetType: e.target.value as AssetType })} className="mt-1 w-full rounded-xl border p-2 text-sm"><option value="VEHICLE">Xe</option><option value="IMPLEMENT">Thiết bị</option></select></label><label className="text-xs font-semibold">ID tài sản<input type="number" min="1" value={createForm.assetId} onChange={(e) => setCreateForm({ ...createForm, assetId: e.target.value })} className="mt-1 w-full rounded-xl border p-2 text-sm" /></label></div>{tab === 'REPAIR' && <label className="block text-xs font-semibold">Phân luồng<select value={createForm.repairRoute} onChange={(e) => setCreateForm({ ...createForm, repairRoute: e.target.value as RepairRoute })} className="mt-1 w-full rounded-xl border p-2 text-sm">{Object.entries(routeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}<label className="block text-xs font-semibold">Nội dung yêu cầu<textarea autoFocus value={createForm.issueDescription} onChange={(e) => setCreateForm({ ...createForm, issueDescription: e.target.value })} className="mt-1 h-28 w-full rounded-xl border p-2 text-sm" placeholder={tab === 'REPAIR' ? 'Mô tả hư hỏng...' : 'Nội dung bảo dưỡng...'} /></label></div>
      </Modal>
    </div>
  );
};

export default WorkshopRequestsPage;
