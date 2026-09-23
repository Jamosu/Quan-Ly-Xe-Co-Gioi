import type { NavigateFunction } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { AlertItem } from '../store/useAppStore';

export const ALERT_CATEGORY_LABELS: Record<string, string> = {
  SOS: 'Cứu hộ SOS',
  MAINTENANCE: 'Bảo dưỡng',
  EQUIPMENT: 'Thiết bị',
  DISPATCH: 'Điều xe',
  FUEL: 'Nhiên liệu',
  GPS: 'GPS',
  COMPLIANCE: 'Hồ sơ tài xế',
  SYSTEM: 'Hệ thống',
};

const severityRank: Record<AlertItem['severity'], number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

export const compareOperationalAlerts = (a: AlertItem, b: AlertItem) => {
  const unread = Number(Boolean(a.isRead)) - Number(Boolean(b.isRead));
  if (unread) return unread;
  const sos = Number(b.category === 'SOS') - Number(a.category === 'SOS');
  if (sos) return sos;
  const severity = severityRank[a.severity] - severityRank[b.severity];
  if (severity) return severity;
  return new Date(b.occurredAt || b.createdAt).getTime() - new Date(a.occurredAt || a.createdAt).getTime();
};

const safeInternalUrl = (value?: string) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return undefined;
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.origin === window.location.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : undefined;
  } catch {
    return undefined;
  }
};

export const resolveAlertTarget = (alert: AlertItem) => {
  if (alert.category === 'SOS' && alert.sourceId) return `/gps/realtime?sosId=${encodeURIComponent(String(alert.sourceId))}`;
  return safeInternalUrl(alert.targetUrl) || `/canh-bao/chua-xu-ly?alertId=${encodeURIComponent(String(alert.id))}`;
};

export const navigateToAlert = async (
  alert: AlertItem,
  navigate: NavigateFunction,
  markRead: (id: string | number, readAt?: string | Date) => void,
  onRead?: (readAt?: string | Date) => void,
) => {
  if (!alert.isRead) {
    try {
      const response = await apiClient.patch(`/alerts/${alert.id}/read`);
      const payload = response.data?.data || response.data;
      markRead(alert.id, payload?.readAt);
      onRead?.(payload?.readAt);
    } catch {
      // Reading state must never block the operator from reaching the handling screen.
    }
  }
  navigate(resolveAlertTarget(alert));
};
