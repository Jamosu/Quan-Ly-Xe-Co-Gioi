import React, { useEffect, useState } from 'react';
import { CalendarClock, RefreshCw, Search } from 'lucide-react';
import { schedulingApi, type AvailabilityResource, type AvailabilityResponse } from '../../api/scheduling';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ResourceTimeline } from '../../components/dispatch/ResourceTimeline';

const inputDateTime = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
};

const ResourceSection: React.FC<{ title: string; resources: AvailabilityResource[]; from: string; to: string }> = ({ title, resources, from, to }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><span className="text-sm text-slate-500">{resources.length} tài nguyên</span></div>
    <div className="space-y-4">
      {resources.map((resource) => (
        <article key={resource.id} className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><div className="font-semibold text-slate-900">{resource.code} · {resource.name}</div><div className="text-xs text-slate-500">Rảnh gần nhất: {resource.availableSlots[0] ? new Date(resource.availableSlots[0].startTime).toLocaleString('vi-VN') : 'Không có trong khoảng xem'}</div></div>
            <Badge variant={resource.availabilityStatus === 'AVAILABLE' ? 'green' : resource.availabilityStatus === 'WARNING' ? 'amber' : 'red'}>{resource.availabilityStatus}</Badge>
          </div>
          <ResourceTimeline from={from} to={to} intervals={resource.intervals} />
          {resource.reasons.length > 0 && <ul className="mt-3 space-y-1 text-sm text-rose-700">{resource.reasons.map((reason, index) => <li key={`${reason.code}-${index}`}>• {reason.message}{reason.relatedCode ? ` (${reason.relatedCode})` : ''}</li>)}</ul>}
        </article>
      ))}
      {!resources.length && <div className="py-10 text-center text-sm text-slate-500">Không có tài nguyên trong phạm vi đã chọn.</div>}
    </div>
  </section>
);

export const ResourceSchedulingPage: React.FC = () => {
  const now = new Date();
  const [startAt, setStartAt] = useState(inputDateTime(now));
  const [endAt, setEndAt] = useState(inputDateTime(new Date(now.getTime() + 8 * 3600000)));
  const [unit, setUnit] = useState('NT1');
  const [requiredDurationMinutes, setDuration] = useState(60);
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await schedulingApi.searchAvailability({ startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), unit, requiredDurationMinutes })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được lịch tài nguyên.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  return <div className="space-y-6 p-6">
    <header><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-600 p-3 text-white"><CalendarClock size={24} /></div><div><h1 className="text-2xl font-bold text-slate-900">Lịch xe và tài xế</h1><p className="text-sm text-slate-500">Availability do backend xác định; màu xanh là khoảng trống, các khối màu là khoảng bận.</p></div></div></header>
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5">
      <label className="text-sm text-slate-600">Đơn vị<select className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={unit} onChange={(e) => setUnit(e.target.value)}>{['NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm text-slate-600">Bắt đầu<input className="mt-1 w-full rounded-lg border border-slate-300 p-2" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></label>
      <label className="text-sm text-slate-600">Kết thúc<input className="mt-1 w-full rounded-lg border border-slate-300 p-2" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></label>
      <label className="text-sm text-slate-600">Thời lượng cần (phút)<input className="mt-1 w-full rounded-lg border border-slate-300 p-2" type="number" min={0} value={requiredDurationMinutes} onChange={(e) => setDuration(Number(e.target.value))} /></label>
      <div className="flex items-end"><Button className="w-full" icon={loading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />} onClick={load} disabled={loading}>Kiểm tra</Button></div>
    </section>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
    {data && <><div className="text-sm text-slate-500">Múi giờ {data.policy.timezone} · Buffer xe {data.policy.vehicleBufferMinutes} phút · Buffer tài xế {data.policy.driverBufferMinutes} phút</div><div className="grid gap-6 xl:grid-cols-2"><ResourceSection title="Xe" resources={data.vehicles} from={data.requestedInterval.startAt} to={data.requestedInterval.endAt} /><ResourceSection title="Tài xế" resources={data.drivers} from={data.requestedInterval.startAt} to={data.requestedInterval.endAt} /></div></>}
  </div>;
};
