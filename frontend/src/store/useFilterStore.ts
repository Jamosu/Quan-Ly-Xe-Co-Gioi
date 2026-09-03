import { create } from 'zustand';

export interface FilterState {
  searchTerm: string;
  selectedStatus: string;
  selectedUnit: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  setSearchTerm: (term: string) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedUnit: (unit: string) => void;
  setDateRange: (range: { startDate: string; endDate: string }) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  searchTerm: '',
  selectedStatus: 'ALL',
  selectedUnit: 'ALL',
  dateRange: {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setSelectedUnit: (selectedUnit) => set({ selectedUnit }),
  setDateRange: (dateRange) => set({ dateRange }),
  resetFilters: () =>
    set({
      searchTerm: '',
      selectedStatus: 'ALL',
      selectedUnit: 'ALL',
      dateRange: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
    }),
}));
