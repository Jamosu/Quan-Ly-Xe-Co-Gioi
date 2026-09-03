import React, { useEffect, useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Download, Filter } from 'lucide-react';
import { Button } from '../common/Button';
import { useFilterStore } from '../../store/useFilterStore';
import { useAppStore } from '../../store/useAppStore';

import { filterItems } from '../../utils/filterUtils';

export interface Column<T> {
  key: string;
  title: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  filterElement?: React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  showSearch?: boolean;
  showExport?: boolean;
  showPagination?: boolean;
  useGlobalFilters?: boolean;
  serverSide?: boolean;
  controlledPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchKeys,
  title,
  subtitle,
  actions,
  pageSize = 20,
  onRowClick,
  isLoading = false,
  showSearch = true,
  showExport = true,
  showPagination = true,
  useGlobalFilters = true,
  serverSide = false,
  controlledPage,
  totalItems,
  onPageChange,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const globalSearchTerm = useFilterStore((state) => state.searchTerm);
  const selectedStatus = useFilterStore((state) => state.selectedStatus);
  const dateRange = useFilterStore((state) => state.dateRange);
  const selectedKLH = useAppStore((state) => state.selectedKLH);

  // Filter by search, KLH, status and dateRange
  const filteredData = useMemo(() => {
    if (serverSide) return data;
    const activeSearch = searchTerm || (useGlobalFilters ? globalSearchTerm : '');
    return filterItems(data, {
      searchTerm: activeSearch,
      selectedKLH: useGlobalFilters ? selectedKLH : 'ALL',
      selectedStatus: useGlobalFilters ? selectedStatus : 'ALL',
      dateRange: useGlobalFilters ? dateRange : undefined,
      searchKeys: searchKeys as string[],
    });
  }, [data, searchTerm, globalSearchTerm, selectedKLH, selectedStatus, dateRange, searchKeys, useGlobalFilters, serverSide]);

  // Sort data
  const sortedData = useMemo(() => {
    if (serverSide || !sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      
      const comparison = valA > valB ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection, serverSide]);

  // Pagination
  const activePage = controlledPage ?? currentPage;
  const resolvedTotal = serverSide ? (totalItems ?? data.length) : sortedData.length;
  const totalPages = Math.ceil(resolvedTotal / pageSize) || 1;

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedData = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    if (serverSide) return sortedData;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, activePage, pageSize, serverSide]);

  const changePage = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages));
    if (onPageChange) onPageChange(next);
    else setCurrentPage(next);
  };

  // Compute page numbers list: 1 2 3 ... totalPages
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (activePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (activePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', activePage - 1, activePage, activePage + 1, '...', totalPages];
  }, [activePage, totalPages]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    if (!sortedData.length) return;
    const headers = columns.map(c => `"${c.title}"`).join(',');
    const rows = sortedData.map(row => 
      columns.map(c => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xuat-du-lieu-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const hasColumnFilters = useMemo(
    () => columns.some((c) => c.filterElement !== undefined && c.filterElement !== null),
    [columns]
  );

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header section with title and search */}
      {(title || showSearch || showExport || actions) && (
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {title && <h3 className="font-heading font-bold text-slate-900 text-sm">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {showSearch && (
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            )}

            {showExport && (
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportCSV}
              >
                Xuất file
              </Button>
            )}

            {actions}
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2 px-2.5 w-10 text-center">STT</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2 px-2.5 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer hover:text-slate-900 select-none' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`inline-flex items-center gap-1.5 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <span>{col.title}</span>
                    {col.sortable && (
                      <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? 'text-primary' : 'text-slate-300'}`} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
            {hasColumnFilters && (
              <tr className="bg-slate-100/90 border-t border-slate-200/80 text-slate-700 font-normal">
                <th className="py-1.5 px-2 text-center font-normal">
                  <Filter className="w-3 h-3 text-slate-400 mx-auto" />
                </th>
                {columns.map((col) => (
                  <th key={`filter-${col.key}`} className="py-1.5 px-2 font-normal" style={{ width: col.width }}>
                    {col.filterElement || null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-10 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-10 text-center text-slate-400">
                  Không tìm thấy bản ghi dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-slate-50/70 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  <td className="py-2 px-2.5 text-center text-slate-400 font-medium text-xs">
                    {(activePage - 1) * pageSize + idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2 px-2.5 text-slate-800 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                      style={{ width: col.width }}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {showPagination && (
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="font-medium">
            Hiển thị <span className="font-bold text-slate-900">{paginatedData.length > 0 ? (activePage - 1) * pageSize + 1 : 0}</span> –{' '}
            <span className="font-bold text-slate-900">{Math.min((activePage - 1) * pageSize + paginatedData.length, resolvedTotal)}</span> trên{' '}
            <span className="font-bold text-slate-900">{resolvedTotal}</span> bản ghi ({pageSize} dòng/trang)
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Nút Về Trang Trước */}
            <button
              onClick={() => changePage(activePage - 1)}
              disabled={activePage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Các nút số trang: 1 2 3 ... 15 */}
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-1 text-slate-400 font-bold select-none">
                    ...
                  </span>
                );
              }
              const pageNum = Number(page);
              const isActive = pageNum === activePage;
              return (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => changePage(pageNum)}
                  className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-[#1B4D20] text-white shadow-sm ring-1 ring-[#1B4D20]'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Nút Trang Sau */}
            <button
              onClick={() => changePage(activePage + 1)}
              disabled={activePage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Nút Trang Cuối */}
            {activePage < totalPages && totalPages > 5 && (
              <button
                onClick={() => changePage(totalPages)}
                className="ml-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-[#1B4D20] transition-colors"
                title="Đến trang cuối cùng"
              >
                Trang cuối ({totalPages})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
