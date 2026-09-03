import React from 'react';
import { Calendar, RefreshCw, Layers, Search, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useFilterStore } from '../../store/useFilterStore';
import { KLH_UNITS } from '../../api/mockData';
import { Button } from '../common/Button';

export interface FilterBarProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  showDateFilter?: boolean;
  showStatusFilter?: boolean;
  statusOptions?: { value: string; label: string }[];
  extraFilters?: React.ReactNode;
  extraActions?: React.ReactNode;
  bottomContent?: React.ReactNode;
  onRefresh?: () => void;
  onSearchChange?: (term: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  showSearch = true,
  searchPlaceholder = 'Tìm kiếm biển số xe, tài xế, mã...',
  showDateFilter = true,
  showStatusFilter = true,
  statusOptions = [
    { value: 'ALL', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'idle', label: 'Tạm dừng / Chờ lệnh' },
    { value: 'maintenance', label: 'Bảo trì / Sửa chữa' },
  ],
  extraFilters,
  extraActions,
  bottomContent,
  onRefresh,
  onSearchChange,
}) => {
  const { selectedKLH, setSelectedKLH } = useAppStore();
  const {
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    dateRange,
    setDateRange,
    resetFilters,
  } = useFilterStore();

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    if (onSearchChange) onSearchChange(val);
  };

  const handleReset = () => {
    resetFilters();
    setSelectedKLH('ALL');
    onSearchChange?.('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {/* Universal Search Input */}
          {showSearch && (
            <div className="relative min-w-[220px] sm:w-64 md:w-72 flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Tìm kiếm"
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* KLH Switcher Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <select
              value={selectedKLH}
              onChange={(e) => setSelectedKLH(e.target.value)}
              aria-label="Khu liên hợp"
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              {KLH_UNITS.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          {showStatusFilter && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Trạng thái"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Date Filter */}
          {showDateFilter && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                aria-label="Từ ngày"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                aria-label="Đến ngày"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>
          )}

          {extraFilters}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {extraActions}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Đặt lại
          </Button>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={onRefresh}
            >
              Làm mới
            </Button>
          )}
        </div>
      </div>

      {bottomContent && (
        <>
          <div className="border-t border-slate-100" />
          {bottomContent}
        </>
      )}
    </div>
  );
};
