import React, { useMemo } from 'react';
import { WorkOrder } from '../../types';
import { Badge } from '../common/Badge';
import { Clock, AlertCircle, User, Wrench } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { useAppStore } from '../../store/useAppStore';
import { filterItems } from '../../utils/filterUtils';

export interface KanbanBoardProps {
  orders: WorkOrder[];
  onOrderClick?: (order: WorkOrder) => void;
}

const STEPS: { key: WorkOrder['currentStep']; label: string; color: string }[] = [
  { key: 'Tiếp nhận', label: '1. Tiếp nhận báo hỏng', color: 'border-sky-500' },
  { key: 'Đang sửa chữa', label: '2. Đang sửa chữa tại xưởng', color: 'border-amber-500' },
  { key: 'Chờ vật tư phụ tùng', label: '3. Chờ cung ứng phụ tùng', color: 'border-rose-500' },
  { key: 'Kiểm thử KCS', label: '4. Kiểm thử KCS & Chạy thử', color: 'border-purple-500' },
  { key: 'Đã xuất xưởng', label: '5. Đã hoàn thành xuất xưởng', color: 'border-emerald-500' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ orders, onOrderClick }) => {
  const globalSearchTerm = useFilterStore((state) => state.searchTerm);
  const selectedStatus = useFilterStore((state) => state.selectedStatus);
  const selectedKLH = useAppStore((state) => state.selectedKLH);

  const displayOrders = useMemo(() => {
    return filterItems(orders, {
      searchTerm: globalSearchTerm,
      selectedKLH,
      selectedStatus,
    });
  }, [orders, globalSearchTerm, selectedKLH, selectedStatus]);

  const getPriorityBadge = (priority: WorkOrder['priority']) => {
    switch (priority) {
      case 'critical_sos':
        return <Badge variant="red" dot>Khẩn cấp SOS</Badge>;
      case 'high':
        return <Badge variant="amber">Ưu tiên cao</Badge>;
      case 'medium':
        return <Badge variant="blue">Trung bình</Badge>;
      default:
        return <Badge variant="gray">Tiêu chuẩn</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
      {STEPS.map((step) => {
        const stepOrders = displayOrders.filter((o) => o.currentStep === step.key);

        return (
          <div
            key={step.key}
            className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-w-[240px]"
          >
            {/* Step Column Header */}
            <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b-2 ${step.color}`}>
              <h4 className="text-xs font-bold text-slate-800 font-heading truncate">{step.label}</h4>
              <span className="text-[11px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                {stepOrders.length}
              </span>
            </div>

            {/* Orders Cards List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-0.5">
              {stepOrders.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/40">
                  Không có phiếu
                </div>
              ) : (
                stepOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onOrderClick && onOrderClick(order)}
                    className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-primary-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[11px] font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {order.plateNumber}
                      </span>
                      {getPriorityBadge(order.priority)}
                    </div>

                    <div className="text-[11px] text-slate-500 line-clamp-1">{order.vehicleType}</div>
                    
                    <p className="text-xs text-slate-700 font-medium my-2 line-clamp-2 leading-relaxed">
                      {order.issueDescription}
                    </p>

                    <div className="space-y-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {order.leadTechnician}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {order.sparePartsCostVND.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Hạn: {order.estimatedCompletion.slice(5)}
                        </span>
                        <span>{order.laborHours}h công</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
