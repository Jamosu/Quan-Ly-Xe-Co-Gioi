import { create } from 'zustand';

export interface HeaderAlert {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  detail?: string;
}

export interface AppState {
  selectedKLH: string;
  isSidebarCollapsed: boolean;
  activeEmergencyCount: number;
  isGlobalRefreshing: boolean;
  headerAlert: HeaderAlert | null;
  setSelectedKLH: (klh: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setEmergencyCount: (count: number) => void;
  setGlobalRefreshing: (refreshing: boolean) => void;
  setHeaderAlert: (alert: HeaderAlert | null) => void;
}

const savedKLH = typeof window !== 'undefined' ? localStorage.getItem('thaco_selected_klh') || 'ALL' : 'ALL';

export const useAppStore = create<AppState>((set) => ({
  selectedKLH: savedKLH,
  isSidebarCollapsed: false,
  activeEmergencyCount: 18,
  isGlobalRefreshing: false,
  headerAlert: null,
  setSelectedKLH: (klh) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thaco_selected_klh', klh);
    }
    set({ selectedKLH: klh });
  },
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setEmergencyCount: (count) => set({ activeEmergencyCount: count }),
  setGlobalRefreshing: (refreshing) => set({ isGlobalRefreshing: refreshing }),
  setHeaderAlert: (alert) => set({ headerAlert: alert }),
}));

