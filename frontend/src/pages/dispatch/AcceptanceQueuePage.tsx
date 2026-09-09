import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCw, RotateCcw } from 'lucide-react';
import { schedulingApi, type OperationalWorkOrderRecord } from '../../api/scheduling';
import { Button } from '../../components/common/Button';

const code = (item: OperationalWorkOrderRecord) => item.dispatchOrder?.code ?? item.transportOrder?.code ?? item.internalFeedTrip?.code ?? `WO-${item.id}`;

export const AcceptanceQueuePage: React.FC = () => {
  const [items, setItems] = useState<OperationalWorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setItems((await schedulingApi.workOrders({ status: 'SUBMITTED_FOR_ACCEPTANCE' })).items); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được hàng chờ nghiệm thu.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const review = async (id: number, approved: boolean) => {
    const reason = approved ? undefined : window.prompt('Nhập lý do yêu cầu làm lại:')?.trim();
    if (!approved && !reason) return;
    try { approved ? await schedulingApi.approveAcceptance(id) : await schedulingApi.rejectAcceptance(id, reason!); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể nghiệm thu.'); }
  };
  return <div className="space-y-6 p-6"><header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-600 p-3 text-white"><ClipboardCheck size={24} /></div><div><h1 className="text-2xl font-bold text-slate-900">Hàng chờ nghiệm thu</h1><p className="text-sm text-slate-500">Chỉ công việc đã kết thúc execution và đủ bằng chứng mới xuất hiện.</p></div></div><Button variant="outline" icon={<RefreshCw className={loading ? 'animate-spin' : ''} size={16} />} onClick={load}>Làm mới</Button></header>{error && <div className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</div>}<div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="font-bold text-slate-900">{code(item)}</div><div className="mt-1 text-sm text-slate-500">{item.type} · {item.unit} · {new Date(item.plannedStartAt).toLocaleString('vi-VN')}</div><div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><div className="rounded-lg bg-slate-50 p-3"><b>{item.executionSegments.length}</b><div className="text-xs text-slate-500">Đoạn chạy</div></div><div className="rounded-lg bg-slate-50 p-3"><b>{item.driverAssignments.length}</b><div className="text-xs text-slate-500">Phân công</div></div><div className="rounded-lg bg-slate-50 p-3"><b>{item.evidence.length}</b><div className="text-xs text-slate-500">Bằng chứng</div></div></div><div className="mt-4 flex gap-2"><Button variant="success" icon={<CheckCircle2 size={16} />} onClick={() => review(item.id, true)}>Đạt</Button><Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => review(item.id, false)}>Làm lại</Button></div></article>)}</div>{!loading && !items.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">Không có công việc chờ nghiệm thu.</div>}</div>;
};
