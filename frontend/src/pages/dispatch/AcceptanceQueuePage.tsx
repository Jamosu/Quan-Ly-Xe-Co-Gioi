import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, ImagePlus, RefreshCw, RotateCcw, UserRound } from 'lucide-react';
import { DailyDispatchOrder, OperationalWorkOrderRecord, schedulingApi } from '../../api/scheduling';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

type QueueItem = { work: OperationalWorkOrderRecord; dispatch: DailyDispatchOrder };
const reviewable = new Set(['SUBMITTED_ON_TIME', 'LATE', 'SUBMITTED_BY_MANAGER', 'MISSING', 'REVISION_REQUESTED', 'ACCEPTED']);

export const AcceptanceQueuePage: React.FC = () => {
  const [works, setWorks] = useState<OperationalWorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [entry, setEntry] = useState<QueueItem | null>(null);
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [note, setNote] = useState('');
  const [workCompleted, setWorkCompleted] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setWorks((await schedulingApi.workOrders()).items); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được báo cáo cuối ngày.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const items = useMemo<QueueItem[]>(() => works.flatMap((work) => (work.dailyDispatchOrders ?? [])
    .filter((dispatch) => dispatch.dailyReport && reviewable.has(dispatch.dailyReport.status))
    .map((dispatch) => ({ work, dispatch }))), [works]);

  const accept = async ({ work, dispatch }: QueueItem) => {
    try { await schedulingApi.acceptDailyReport(work.id, dispatch.id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể nghiệm thu báo cáo.'); }
  };

  const revise = async ({ work, dispatch }: QueueItem) => {
    const revisionReason = window.prompt('Nội dung yêu cầu tài xế chỉnh sửa:')?.trim();
    if (!revisionReason) return;
    try { await schedulingApi.requestDailyReportRevision(work.id, dispatch.id, revisionReason); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể yêu cầu chỉnh sửa.'); }
  };

  const openEntry = (item: QueueItem) => {
    setEntry(item);
    setReason('Tài khoản hoặc ứng dụng tài xế gặp lỗi');
    setQuantity(String(item.dispatch.dailyReport?.quantityToday ?? 0));
    setNote(item.dispatch.dailyReport?.note ?? '');
    setWorkCompleted(Boolean(item.dispatch.dailyReport?.workCompleted));
    setPhotos([]);
  };

  const submitForDriver = async () => {
    if (!entry || !reason.trim()) return;
    const quantityToday = Number(quantity);
    if (!Number.isFinite(quantityToday) || quantityToday < 0) {
      setError('Khối lượng phải là số lớn hơn hoặc bằng 0.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const uploaded = await Promise.all(photos.map((file) => schedulingApi.uploadEvidence(entry.work.id, file, 'WORK_COMPLETION_PHOTO')));
      const existingUrls = entry.dispatch.dailyReport?.evidenceUrls ?? [];
      await schedulingApi.submitDailyReport(entry.work.id, {
        dispatchOrderId: entry.dispatch.id,
        quantityToday,
        unit: entry.work.targetUnit,
        note: note.trim() || undefined,
        evidenceUrls: [...existingUrls, ...uploaded.map((item) => item.url)],
        managerReason: reason.trim(),
        workCompleted,
      });
      setEntry(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể nhập báo cáo thay.');
    } finally {
      setSubmitting(false);
    }
  };

  const continueNextDay = async ({ work, dispatch }: QueueItem) => {
    const base = new Date(dispatch.scheduledStartAt ?? work.plannedStartAt); base.setDate(base.getDate() + 1);
    const raw = window.prompt('Giờ bắt đầu lệnh ngày tiếp theo (ISO):', base.toISOString().slice(0, 16));
    if (!raw) return;
    try {
      await schedulingApi.continueNextDay(work.id, {
        previousDispatchOrderId: dispatch.id, scheduledStartAt: new Date(raw).toISOString(),
        workDurationMinutes: dispatch.workDurationMinutes || 480, breakDurationMinutes: dispatch.breakDurationMinutes || 0,
        vehicleId: dispatch.vehicleId, driverId: dispatch.driverId, implementId: dispatch.implementId,
      });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tạo lệnh ngày tiếp theo.'); }
  };

  return <div className="space-y-6 p-6">
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-600 p-3 text-white"><ClipboardCheck size={24} /></div><div><h1 className="text-2xl font-bold text-slate-900">Báo cáo ngày & nghiệm thu</h1><p className="text-sm text-slate-500">Nghiệm thu từng ngày, nhập hộ và tạo lệnh tiếp tục trên cùng công việc tổng.</p></div></div>
      <Button variant="outline" icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={16} />} onClick={load}>Làm mới</Button>
    </header>
    {error && <div className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</div>}
    <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => {
      const report = item.dispatch.dailyReport!;
      return <article key={item.dispatch.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-slate-900">{item.dispatch.code}</div><div className="mt-1 text-sm text-slate-500">{item.work.jobName} · {item.work.workLocationText}</div></div><Badge variant={report.status === 'MISSING' || report.status === 'LATE' ? 'red' : report.status === 'ACCEPTED' ? 'green' : 'amber'}>{report.status}</Badge></div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-slate-50 p-3"><b>{report.quantityToday} {report.unit ?? item.work.targetUnit ?? ''}</b><div className="text-xs text-slate-500">Khối lượng ngày</div></div><div className="rounded-lg bg-slate-50 p-3"><b>{item.work.completedQuantity ?? 0} / {item.work.targetQuantity || '-'}</b><div className="text-xs text-slate-500">Đã nghiệm thu / kế hoạch</div></div></div>
        <div className="mt-3 text-xs text-slate-600">Tài xế: {item.dispatch.driver?.fullName ?? item.dispatch.driverId} · Gửi: {report.reportSubmittedAt ? new Date(report.reportSubmittedAt).toLocaleString('vi-VN') : 'Chưa gửi'}{report.submittedByType === 'MANAGER' ? ` · Nhập thay bởi ${report.submittedBy?.fullName ?? 'đội trưởng'}` : ''}</div>
        {report.note && <p className="mt-2 text-sm text-slate-700">{report.note}</p>}
        {!!report.evidenceUrls?.length && <div className="mt-3 flex gap-2 overflow-x-auto">{report.evidenceUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh nghiệm thu" className="h-20 w-28 rounded-lg border object-cover" /></a>)}</div>}
        <div className="mt-4 flex flex-wrap gap-2">{['MISSING', 'REVISION_REQUESTED'].includes(report.status) && <Button icon={<UserRound size={16} />} onClick={() => openEntry(item)}>Nhập thay</Button>}{['SUBMITTED_ON_TIME', 'LATE', 'SUBMITTED_BY_MANAGER'].includes(report.status) && <><Button variant="success" icon={<CheckCircle2 size={16} />} onClick={() => accept(item)}>Nghiệm thu</Button><Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => revise(item)}>Yêu cầu sửa</Button></>}{report.status === 'ACCEPTED' && !report.workCompleted && !item.work.dailyDispatchOrders.some((next) => next.previousDispatchOrderId === item.dispatch.id) && <Button onClick={() => continueNextDay(item)}>Tiếp tục ngày mai</Button>}</div>
      </article>;
    })}</div>
    {!loading && !items.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">Không có báo cáo ngày cần xử lý.</div>}

    <Modal isOpen={Boolean(entry)} onClose={() => !submitting && setEntry(null)} title="Nhập báo cáo thay tài xế" subtitle={entry ? `${entry.dispatch.code} · ${entry.dispatch.driver?.fullName ?? 'Tài xế được giao'}` : undefined} footer={<><Button variant="outline" onClick={() => setEntry(null)} disabled={submitting}>Hủy</Button><Button onClick={() => void submitForDriver()} disabled={submitting || !reason.trim()}>{submitting ? 'Đang đồng bộ...' : 'Gửi báo cáo'}</Button></>}>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Lý do nhập hộ *<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">Khối lượng hôm nay ({entry?.work.targetUnit ?? 'đơn vị'})<input type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">Tiến độ / ghi chú tài xế gửi qua Zalo<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><ImagePlus size={20} />Chọn ảnh nghiệm thu từ máy<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => setPhotos(Array.from(event.target.files ?? []))} /></label>
        {!!photos.length && <div className="text-sm text-slate-600">Đã chọn {photos.length} ảnh: {photos.map((file) => file.name).join(', ')}</div>}
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={workCompleted} onChange={(event) => setWorkCompleted(event.target.checked)} />Tài xế báo đã hoàn thành công việc tổng</label>
        <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Sau khi gửi, báo cáo, ảnh, người nhập hộ và lý do sẽ đồng bộ về app của đúng tài xế khi đăng nhập hoặc làm mới dữ liệu.</p>
      </div>
    </Modal>
  </div>;
};
