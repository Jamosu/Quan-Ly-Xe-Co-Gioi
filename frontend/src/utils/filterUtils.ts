export interface FilterCriteria {
  searchTerm?: string;
  selectedKLH?: string;
  selectedStatus?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  searchKeys?: string[];
}

export function matchesKLH(item: any, selectedKLH?: string): boolean {
  if (!selectedKLH || selectedKLH === 'ALL') return true;

  const itemKLH = (item.klhId || item.klhCode || item.klh || item.unitId || item.complexCode || '').toString().toUpperCase();
  if (itemKLH && itemKLH === selectedKLH.toUpperCase()) return true;

  const klhKeywords: Record<string, string[]> = {
    SNOUL: ['snoul', 'snuol', 'sn', 'kratie'],
    KOUN_MOM: ['koun mom', 'km', 'ratanakiri'],
    NAM_LAO: ['nam lào', 'nam lao', 'lao', 'attapeu', 'at', 'hagl'],
    HAGL_AGRI: ['attapeu', 'at', 'hagl', 'nam lào'],
    IA_PUCH: ['ia puch', 'ip', 'gia lai'],
  };

  const keywords = klhKeywords[selectedKLH] || [selectedKLH.toLowerCase()];
  const textToCheck = `${item.klhName || ''} ${item.unitName || ''} ${item.location || ''} ${item.address || ''} ${item.code || ''} ${item.internalCode || ''} ${item.teamUnit || ''} ${item.fromLocation || ''} ${item.toLocation || ''} ${item.assignedUnitCode || ''} ${item.regionCode || ''}`.toLowerCase();

  return keywords.some((kw) => textToCheck.includes(kw));
}

export function matchesStatus(item: any, selectedStatus?: string): boolean {
  if (!selectedStatus || selectedStatus === 'ALL') return true;

  const status = String(item.status || item.workStatus || item.orderStatus || item.currentStep || '').toLowerCase();
  if (!status) return true;

  const target = selectedStatus.toLowerCase();
  if (status === target) return true;

  // Semantic grouping
  if (target === 'active') {
    return ['active', 'running', 'in_progress', 'ready', 'active_valid', 'đang chạy', 'đang hoạt động', 'sẵn sàng / đang chạy'].includes(status);
  }
  if (target === 'idle') {
    return ['idle', 'idling', 'stopped', 'pending', 'waiting', 'nổ máy dừng', 'tạm dừng', 'chờ điều động', 'chờ điều phối'].includes(status);
  }
  if (target === 'maintenance') {
    return ['maintenance', 'repairing', 'waiting_parts', 'in_repair', 'broken', 'bảo trì', 'bảo dưỡng', 'bảo dưỡng xưởng'].includes(status);
  }

  return status.includes(target);
}

export function matchesSearch(item: any, searchTerm?: string, searchKeys?: string[]): boolean {
  if (!searchTerm) return true;
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;

  if (searchKeys && searchKeys.length > 0) {
    return searchKeys.some((key) => {
      const val = item[key];
      return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
    });
  }

  return Object.values(item).some((val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'object') return false;
    return String(val).toLowerCase().includes(term);
  });
}

export function matchesDateRange(item: any, dateRange?: { startDate?: string; endDate?: string }): boolean {
  if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) return true;

  const dateField = item.date || item.createdAt || item.orderDate || item.occurredAt || item.startTime || item.createdDate || item.inspectionExpiry;
  if (!dateField) return true;

  const itemDate = String(dateField).slice(0, 10);
  if (dateRange.startDate && itemDate < dateRange.startDate) return false;
  if (dateRange.endDate && itemDate > dateRange.endDate) return false;
  return true;
}

export function filterItems<T extends Record<string, any>>(items: T[], criteria: FilterCriteria): T[] {
  if (!items || items.length === 0) return [];

  return items.filter((item) => {
    if (!matchesKLH(item, criteria.selectedKLH)) return false;
    if (!matchesStatus(item, criteria.selectedStatus)) return false;
    if (!matchesSearch(item, criteria.searchTerm, criteria.searchKeys)) return false;
    if (!matchesDateRange(item, criteria.dateRange)) return false;
    return true;
  });
}
