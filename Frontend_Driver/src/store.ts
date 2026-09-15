import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { getLocalDriver, getMeta, getSyncStats, initializeDatabase, listOrders } from './database';
import { canOpenOffline, loadSession, saveSession } from './session';
import { DriverSession, LocalOrder } from './types';

interface AppState {
  ready: boolean; session: DriverSession | null; offlineUnlocked: boolean; online: boolean; syncing: boolean;
  today: LocalOrder[]; upcoming: LocalOrder[]; history: LocalOrder[];
  stats: { pending: number; failed: number; conflicts: number; sos: number; photos: number };
  lastSyncAt: string | null;
  bootstrap: () => Promise<void>;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSession: (session: DriverSession | null) => Promise<void>;
  refreshLocal: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false, session: null, offlineUnlocked: false, online: true, syncing: false,
  today: [], upcoming: [], history: [], stats: { pending: 0, failed: 0, conflicts: 0, sos: 0, photos: 0 }, lastSyncAt: null,
  bootstrap: async () => {
    await initializeDatabase();
    const [session, network, localDriver] = await Promise.all([loadSession(), NetInfo.fetch(), getLocalDriver()]);
    set({
      session, offlineUnlocked: Boolean(localDriver && canOpenOffline(session)),
      online: Boolean(network.isConnected && network.isInternetReachable !== false), ready: true,
    });
    await get().refreshLocal();
  },
  setOnline: online => set({ online }),
  setSyncing: syncing => set({ syncing }),
  setSession: async session => {
    if (session) await saveSession(session);
    set({ session, offlineUnlocked: Boolean(session) });
  },
  refreshLocal: async () => {
    const [today, upcoming, history, stats, lastSyncAt] = await Promise.all([
      listOrders('today'), listOrders('upcoming'), listOrders('history'), getSyncStats(), getMeta('last_sync_at'),
    ]);
    set({ today, upcoming, history, stats, lastSyncAt });
  },
}));
