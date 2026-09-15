import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, MapPin, Search, Tractor, Truck, UserRound, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

type AssetType = 'VEHICLE' | 'IMPLEMENT';

interface CandidateAsset {
  id: number;
  code: string;
  plate?: string;
  name: string;
  category?: string;
  unit: string;
  assignedUnitCode?: string;
  conditionStatus?: string;
  technicalCondition?: string;
  status: string;
  currentLocationName?: string;
  gatheringLocation?: string;
  managerName?: string;
  managerPhone?: string;
  standardPurpose?: string;
  defaultDriver?: { id: number; fullName: string; phone?: string };
}

interface Candidate {
  assetType: AssetType;
  assetId: number;
  type: 'REPAIR';
  asset: CandidateAsset;
  reason: string;
}

interface Facets {
  total: number;
  vehicles: number;
  implements: number;
}

const unwrap = (response: any) => response.data?.data ?? response.data ?? {};
const unitLabels: Record<string, string> = {
  TOAN_KLH: 'Toàn khu liên hợp', BAN_CO_GIOI: 'Ban Cơ giới', TT_BTSC: 'Trung tâm BTSC',
  NT1: 'Nông trường 1', NT2: 'Nông trường 2', XN_BO: 'Xí nghiệp Bò',
};

export const DamagedAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Candidate[]>([]);
  const [facets, setFacets] = useState<Facets>({ total: 0, vehicles: 0, implements: 0 });
  const [assetType, setAssetType] = useState<'' | AssetType>('');
  const [unit, setUnit] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = unwrap(await apiClient.get('/workshop/candidates', {
        params: { type: 'REPAIR', assetType: assetType || undefined, unit: unit || undefined, search: search || undefined, page, limit: 20 },
      }));
      setItems(data.items || []);
      setFacets(data.facets || { total: data.pagination?.total || 0, vehicles: 0, implements: 0 });
      setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
      setFilteredTotal(data.pagination?.total || 0);
      setSelected([]);
    } catch (requestError: any) {
      setItems([]);
      setError(requestError.response?.data?.message || 'Không tải được danh sách tài sản hư hỏng. Vui lòng thử lại.');
    } finally { setLoading(false); }
  }, [assetType, unit, search, page]);

  useEffect(() => { void load(); }, [load]);

  const keyOf = (candidate: Candidate) => `${candidate.assetType}-${candidate.assetId}`;
  const createTickets = async (candidates: Candidate[], openAfterCreate: boolean) => {
    if (!candidates.length) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = unwrap(await apiClient.post('/workshop/candidates/confirm', {
        candidates: candidates.map(({ assetType: candidateType, assetId, type }) => ({ assetType: candidateType, assetId, type })),
      }));
      const created = result.created || [];
      const skipped = result.skipped || [];
      if (openAfterCreate && created[0]) {
        navigate(`/xuong-btsc/yeu-cau?tab=repair&view=kanban&requestId=${created[0].id}`);
        return;
      }
      setNotice(`Đã tạo ${created.length} phiếu sửa chữa${skipped.length ? `, bỏ qua ${skipped.length} tài sản đã có phiếu` : ''}.`);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Không thể tạo phiếu sửa chữa.');
    } finally { setSaving(false); }
  };

  const selectedItems = items.filter((item) => selected.includes(keyOf(item)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Xe & thiết bị hư hỏng</h1>
          <p className="mt-1 text-sm text-slate-500">Danh sách tài sản có tình trạng hư hỏng nhưng chưa được lập phiếu sửa chữa.</p>
        </div>
        <Button disabled={!selectedItems.length || saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} onClick={() => void createTickets(selectedItems, false)}>
          Tạo phiếu cho {selectedItems.length || 0} tài sản
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => { setAssetType(''); setPage(1); }} className={`rounded-2xl border p-4 text-left ${!assetType ? 'border-primary bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-600">Tổng chờ tạo phiếu</span><AlertTriangle className="h-5 w-5 text-rose-600" /></div><p className="mt-2 text-3xl font-extrabold text-slate-900">{facets.total}</p>
        </button>
        <button onClick={() => { setAssetType('VEHICLE'); setPage(1); }} className={`rounded-2xl border p-4 text-left ${assetType === 'VEHICLE' ? 'border-primary bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-600">Xe hư hỏng</span><Truck className="h-5 w-5 text-blue-600" /></div><p className="mt-2 text-3xl font-extrabold text-slate-900">{facets.vehicles}</p>
        </button>
        <button onClick={() => { setAssetType('IMPLEMENT'); setPage(1); }} className={`rounded-2xl border p-4 text-left ${assetType === 'IMPLEMENT' ? 'border-primary bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-600">Thiết bị hư hỏng</span><Tractor className="h-5 w-5 text-amber-600" /></div><p className="mt-2 text-3xl font-extrabold text-slate-900">{facets.implements}</p>
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary" placeholder="Tìm mã, biển số, tên, đơn vị hoặc vị trí..." /></div>
        <select value={assetType} onChange={(event) => { setAssetType(event.target.value as '' | AssetType); setPage(1); }} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Tất cả tài sản</option><option value="VEHICLE">Xe</option><option value="IMPLEMENT">Thiết bị</option></select>
        <select value={unit} onChange={(event) => { setUnit(event.target.value); setPage(1); }} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Tất cả đơn vị</option>{Object.entries(unitLabels).filter(([value]) => value !== 'TOAN_KLH').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={items.length > 0 && selected.length === items.length} onChange={(event) => setSelected(event.target.checked ? items.map(keyOf) : [])} /></th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">Tài sản</th><th className="px-4 py-3">Tình trạng</th><th className="px-4 py-3">Đơn vị & vị trí</th><th className="px-4 py-3">Người phụ trách</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="py-16 text-center text-slate-500"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Đang tải dữ liệu...</td></tr> : items.map((candidate) => {
                const asset = candidate.asset;
                const location = asset.currentLocationName || asset.gatheringLocation || 'Chưa cập nhật';
                const person = asset.defaultDriver?.fullName || asset.managerName || 'Chưa phân công';
                const phone = asset.defaultDriver?.phone || asset.managerPhone;
                const key = keyOf(candidate);
                return <tr key={key} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(key)} onChange={(event) => setSelected((old) => event.target.checked ? [...old, key] : old.filter((value) => value !== key))} /></td>
                  <td className="px-4 py-3"><Badge size="sm" variant={candidate.assetType === 'VEHICLE' ? 'blue' : 'purple'}>{candidate.assetType === 'VEHICLE' ? 'Xe' : 'Thiết bị'}</Badge></td>
                  <td className="px-4 py-3"><b className="block text-primary">{asset.plate || asset.code}</b><span className="block text-xs text-slate-600">{asset.code} · {asset.name}</span><span className="text-[11px] text-slate-400">{asset.category || 'Chưa phân loại'}</span></td>
                  <td className="px-4 py-3"><Badge size="sm" variant="red">{candidate.reason}</Badge><span className="mt-1 block text-[11px] text-slate-400">Trạng thái vận hành: {asset.status}</span></td>
                  <td className="px-4 py-3"><span className="block font-semibold text-slate-700">{asset.assignedUnitCode || unitLabels[asset.unit] || asset.unit}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{location}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 font-semibold text-slate-700"><UserRound className="h-3.5 w-3.5" />{person}</span>{phone && <span className="mt-1 block text-xs text-slate-500">{phone}</span>}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" disabled={saving} icon={<Wrench className="h-3.5 w-3.5" />} onClick={() => void createTickets([candidate], true)}>Tạo phiếu</Button></td>
                </tr>;
              })}
              {!loading && !items.length && <tr><td colSpan={7} className="py-16 text-center"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" /><p className="font-bold text-slate-700">Không còn tài sản chờ tạo phiếu</p><p className="text-xs text-slate-400">Tài sản đã có phiếu được theo dõi tại Công việc xưởng.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500"><span>Trang {page}/{totalPages} · {filteredTotal} tài sản</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setPage((value) => value - 1)}>Trước</Button><Button size="sm" variant="outline" disabled={page >= totalPages || loading} icon={<ChevronRight className="h-4 w-4" />} onClick={() => setPage((value) => value + 1)}>Sau</Button></div></div>
      </div>
    </div>
  );
};

export default DamagedAssetsPage;
