import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { getDeviceId, loadSession, saveSession } from './session';
import { DriverSession } from './types';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || Constants.expoConfig?.extra?.apiBaseUrl || 'http://10.23.3.8:3001/api').replace(/\/$/, '');

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const session = await loadSession();
  if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`;
  return config;
});

api.interceptors.response.use(
  response => response.data?.data ?? response.data,
  async (error: AxiosError) => {
    const request = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && request && !request._retried && !request.url?.includes('mobile-refresh')) {
      request._retried = true;
      const session = await loadSession();
      if (session?.refreshToken) {
        const response = await axios.post(`${API_BASE_URL}/auth/mobile-refresh`, { refreshToken: session.refreshToken, deviceId: await getDeviceId() });
        const refreshed = response.data?.data ?? response.data;
        const next: DriverSession = { ...session, ...refreshed };
        await saveSession(next);
        request.headers.Authorization = `Bearer ${next.accessToken}`;
        return api.request(request);
      }
    }
    return Promise.reject(error);
  },
);

export async function loginDriver(username: string, password: string) {
  const cleanUsername = username.trim();
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/mobile-login`, { username: cleanUsername, password, deviceId: await getDeviceId() }, { timeout: 20000 });
    return (response.data?.data ?? response.data) as DriverSession;
  } catch (error: any) {
    if (error.response?.status === 404) {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { username: cleanUsername, password, deviceId: await getDeviceId() }, { timeout: 20000 });
      return (response.data?.data ?? response.data) as DriverSession;
    }
    throw error;
  }
}

export function friendlyApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as any;
    return body?.message || body?.error?.message || (error.code === 'ECONNABORTED' ? 'Kết nối máy chủ quá thời gian.' : 'Không thể kết nối máy chủ.');
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
}

export async function uploadImage(localUri: string) {
  const session = await loadSession();
  const response = await FileSystem.uploadAsync(`${API_BASE_URL}/mobile/sync/attachments`, localUri, {
    httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.MULTIPART, fieldName: 'file',
    mimeType: 'image/jpeg', headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` },
  });
  if (response.status === 401 && session?.refreshToken) {
    const refreshResponse = await axios.post(`${API_BASE_URL}/auth/mobile-refresh`, {
      refreshToken: session.refreshToken,
      deviceId: await getDeviceId(),
    });
    const refreshed = refreshResponse.data?.data ?? refreshResponse.data;
    await saveSession({ ...session, ...refreshed });
    return uploadImage(localUri);
  }
  if (response.status < 200 || response.status >= 300) throw new Error(`Upload ảnh thất bại (${response.status}).`);
  const body = JSON.parse(response.body);
  return body.data ?? body;
}
