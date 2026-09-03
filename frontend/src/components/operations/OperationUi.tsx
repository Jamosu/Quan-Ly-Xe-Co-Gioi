import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

const labels: Record<string, string> = {
  DRAFT: 'Nháp', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', ASSIGNED: 'Đã phân công',
  DRIVER_ACCEPTED: 'Tài xế đã nhận', DEPARTED: 'Đã xuất phát', WORKING: 'Đang làm việc',
  IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn thành', ACCEPTED: 'Đã nghiệm thu', CLOSED: 'Đã đóng',
  REJECTED: 'Bị từ chối', ADJUSTED: 'Đã điều chỉnh', CANCELLED: 'Đã hủy', AT_PICKUP: 'Đến điểm nhận',
  LOADING: 'Đang bốc hàng', IN_TRANSIT: 'Đang vận chuyển', AT_DELIVERY: 'Đến điểm giao',
  UNLOADING: 'Đang dỡ hàng', DELIVERED: 'Đã giao hàng', CONFIRMED: 'Đã xác nhận', PENDING: 'Chờ xác nhận',
};

export const statusLabel = (status: string) => labels[status] ?? status;
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant = status.includes('COMPLETED') || status === 'CLOSED' || status === 'CONFIRMED' ? 'blue' :
    status.includes('REJECT') || status.includes('CANCEL') ? 'red' :
    ['WORKING', 'IN_PROGRESS', 'IN_TRANSIT', 'APPROVED', 'ACCEPTED'].includes(status) ? 'green' : 'amber';
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
};

export function ViewSwitcher<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`rounded-xl px-3.5 py-1.5 text-xs font-bold ${value === option.value ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{option.label}</button>)}</div>;
}

export const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800"><AlertTriangle className="mx-auto mb-2 h-6 w-6"/><p className="font-semibold">{message}</p><Button className="mt-3" variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4"/>} onClick={onRetry}>Thử lại</Button></div>;

export const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
