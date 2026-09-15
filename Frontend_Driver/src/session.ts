import * as SecureStore from 'expo-secure-store';
import { DriverSession } from './types';

const SESSION_KEY = 'thaco_agri_driver_session_v1';
const DEVICE_KEY = 'thaco_agri_driver_device_id_v1';

export async function saveSession(session: DriverSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSession(): Promise<DriverSession | null> {
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as DriverSession; } catch { return null; }
}

export async function clearSession() { await SecureStore.deleteItemAsync(SESSION_KEY); }

export async function getDeviceId() {
  let value = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!value) {
    value = `android-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await SecureStore.setItemAsync(DEVICE_KEY, value);
  }
  return value;
}

export function canOpenOffline(session: DriverSession | null) {
  return Boolean(session && new Date(session.refreshExpiresAt).getTime() > Date.now());
}
