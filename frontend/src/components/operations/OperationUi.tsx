import { AlertTriangle, RefreshCw, Table2, Calendar, Kanban, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

const labels: Record<string, string> = {
  DRAFT: 'Nháp', PENDING_APPROVAL: 'Chờ duyệt', CHO_DUYET: 'Chờ duyệt', CHO_PHAN_CONG: 'Chờ phân công',
  APPROVED: 'Đã duyệt', ASSIGNED: 'Đã phân công',
  DRIVER_ACCEPTED: 'Tài xế đã nhận', DEPARTED: 'Đã xuất phát', WORKING: 'Đang làm việc',
  IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn thành', ACCEPTED: 'Đã nghiệm thu', CLOSED: 'Đã đóng',
  REJECTED: 'Bị từ chối', ADJUSTED: 'Đã điều chỉnh', CANCELLED: 'Đã hủy', AT_PICKUP: 'Đến điểm nhận',
  LOADING: 'Đang bốc hàng', IN_TRANSIT: 'Đang vận chuyển', AT_DELIVERY: 'Đến điểm giao',
  UNLOADING: 'Đang dỡ hàng', DELIVERED: 'Đã giao hàng', CONFIRMED: 'Đã xác nhận', PENDING: 'Chờ xác nhận',
  OVERDUE: 'Quá hạn',
};

export const statusLabel = (status: string) => labels[status] ?? status;
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant = status.includes('COMPLETED') || status === 'CLOSED' || status === 'CONFIRMED' ? 'blue' :
    status.includes('REJECT') || status.includes('CANCEL') || status === 'OVERDUE' ? 'red' :
    ['WORKING', 'IN_PROGRESS', 'IN_TRANSIT', 'APPROVED', 'ACCEPTED'].includes(status) ? 'green' : 'amber';
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
};

export interface ViewOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export function ViewSwitcher<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T;
  options: Array<ViewOption<T>>;
  onChange: (value: T) => void;
  className?: string;
}) {
  const getDefaultIcon = (val: string, lbl: string) => {
    const text = `${val} ${lbl}`.toLowerCase();
    if (text.includes('hoàn tất') || text.includes('hoàn thành') || text.includes('completed') || text.includes('nghiệm thu')) {
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
    }
    if (text.includes('table') || text.includes('bảng') || text.includes('danh sách')) {
      return <Table2 className="h-4 w-4 shrink-0" />;
    }
    if (text.includes('scheduler') || text.includes('timeline') || text.includes('lịch') || text.includes('ngày')) {
      return <Calendar className="h-4 w-4 shrink-0" />;
    }
    if (text.includes('kanban') || text.includes('board') || text.includes('nhóm') || text.includes('trạng thái')) {
      return <Kanban className="h-4 w-4 shrink-0" />;
    }
    if (text.includes('card') || text.includes('thẻ') || text.includes('tuần') || text.includes('grid')) {
      return <LayoutGrid className="h-4 w-4 shrink-0" />;
    }
    return null;
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs ${className}`}>
      {options.map((option) => {
        const isActive = value === option.value;
        const icon = option.icon ?? getDefaultIcon(option.value, option.label);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`group flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 select-none cursor-pointer active:scale-95 ${
              isActive
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {icon && (
              <span className={`transition-colors ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800"><AlertTriangle className="mx-auto mb-2 h-6 w-6"/><p className="font-semibold">{message}</p><Button className="mt-3" variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4"/>} onClick={onRetry}>Thử lại</Button></div>;

export const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
