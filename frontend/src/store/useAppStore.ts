import { create } from 'zustand';

export interface AlertItem {
  id: string | number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category?: string;
  alertType?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  isRead?: boolean;
  readAt?: string | Date | null;
  occurredAt?: string | Date;
  title: string;
  message: string;
  location?: string;
  vehicle?: { id: number; code: string; plate: string; name?: string; category?: string };
  implement?: { id: number; code: string; name: string; status?: string; technicalCondition?: string };
  driver?: { id: number; fullName: string; phone?: string };
  handledBy?: { id: number; fullName: string };
  handlingReason?: string;
  targetUrl?: string;
  metadataJson?: {
    expiryDate?: string;
    remainingDays?: number;
    complianceType?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string | Date;
}

export interface HeaderAlert {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  detail?: string;
}

export interface AuthUser {
  id: number | string;
  code?: string;
  username: string;
  fullName: string;
  role: string;
  unit?: string;
  assignedUnit?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  complexCode?: string;
  complexName?: string;
}

export interface AppState {
  selectedKLH: string;
  isSidebarCollapsed: boolean;
  activeEmergencyCount: number;
  systemAlerts: AlertItem[];
  isGlobalRefreshing: boolean;
  headerAlert: HeaderAlert | null;
  currentUser: AuthUser | null;
  setSelectedKLH: (klh: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setEmergencyCount: (count: number) => void;
  setSystemAlerts: (alerts: AlertItem[]) => void;
  markAlertRead: (id: string | number, readAt?: string | Date) => void;
  setGlobalRefreshing: (refreshing: boolean) => void;
  setHeaderAlert: (alert: HeaderAlert | null) => void;
  setCurrentUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const getSavedUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('thaco_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const savedKLH = typeof window !== 'undefined' ? localStorage.getItem('thaco_selected_klh') || 'ALL' : 'ALL';

export const useAppStore = create<AppState>((set) => ({
  selectedKLH: savedKLH,
  isSidebarCollapsed: false,
  activeEmergencyCount: 0,
  systemAlerts: [],
  isGlobalRefreshing: false,
  headerAlert: null,
  currentUser: getSavedUser(),
  setSelectedKLH: (klh) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thaco_selected_klh', klh);
    }
    set({ selectedKLH: klh });
  },
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setEmergencyCount: (count) => set({ activeEmergencyCount: count }),
  setSystemAlerts: (alerts) => set({
    systemAlerts: alerts,
    activeEmergencyCount: alerts.filter((alert) => !alert.isRead).length,
  }),
  markAlertRead: (id, readAt = new Date().toISOString()) => set((state) => {
    const alerts = state.systemAlerts.map((alert) => String(alert.id) === String(id)
      ? { ...alert, isRead: true, readAt }
      : alert);
    return { systemAlerts: alerts, activeEmergencyCount: alerts.filter((alert) => !alert.isRead).length };
  }),
  setGlobalRefreshing: (refreshing) => set({ isGlobalRefreshing: refreshing }),
  setHeaderAlert: (alert) => set({ headerAlert: alert }),
  setCurrentUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        sessionStorage.setItem('thaco_auth_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('thaco_auth_user');
      }
    }
    set({ currentUser: user });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('thaco_agri_jwt_token');
      sessionStorage.removeItem('thaco_auth_user');
      localStorage.removeItem('thaco_agri_jwt_token');
    }
    set({ currentUser: null });
  },
}));
