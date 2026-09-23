import NetInfo from '@react-native-community/netinfo';
import { api, uploadImage } from './api';
import {
  applyPull, getMeta, markAttachment, markQueue, pendingAttachments, pendingQueue, setMeta,
} from './database';
import { getDeviceId, loadSession } from './session';
import { QueueItem } from './types';
import { sortForSync } from './syncPolicy';

let activeSync: Promise<boolean> | null = null;

export function syncNow() {
  if (activeSync) return activeSync;
  activeSync = runSync().finally(() => { activeSync = null; });
  return activeSync;
}

async function runSync() {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false || !(await loadSession())) return false;
  await setMeta('sync_running', '1');
  try {
    const critical = (await pendingQueue()).filter(item => item.priority <= 1);
    if (critical.length) await pushItems(critical);

    for (const attachment of await pendingAttachments()) {
      try {
        await markAttachment(attachment.id, 'SYNCING');
        const uploaded = await uploadImage(attachment.local_file_path);
        await markAttachment(attachment.id, 'SYNCED', uploaded.url);
      } catch (error) {
        await markAttachment(attachment.id, 'FAILED', undefined, error instanceof Error ? error.message : 'Upload lỗi');
      }
    }

    const normal = (await pendingQueue()).filter(item => item.priority > 1);
    if (normal.length) await pushItems(normal);
    const lastSyncAt = await getMeta('last_sync_at');
    const pulled = await api.get('/mobile/sync/pull', { params: lastSyncAt ? { since: lastSyncAt } : undefined }) as any;
    await applyPull(pulled);
    if (Array.isArray(pulled?.alerts)) {
      const { useAppStore } = require('./store');
      useAppStore.getState().setUnreadAlertsCount(pulled.alerts.filter((a: any) => !a.read).length);
    }
    return true;
  } catch (error) {
    return false;
  } finally {
    await setMeta('sync_running', '0');
  }
}

async function pushItems(items: QueueItem[]) {
  items = sortForSync(items);
  for (const item of items) await markQueue(item.event_id, 'SYNCING');
  try {
    const response = await api.post('/mobile/sync/push', {
      deviceId: await getDeviceId(), lastSyncAt: await getMeta('last_sync_at'),
      events: items.map(item => ({
        eventId: item.event_id, eventType: item.event_type, orderType: item.order_type ?? undefined,
        orderId: item.order_id ?? undefined, sequenceNumber: item.sequence_number, occurredAt: item.occurred_at,
        baseVersion: item.base_version ?? undefined, payload: JSON.parse(item.payload_json),
      })),
    }) as unknown as { processed: Array<{ eventId: string; status: string }>; failed: Array<{ eventId: string; message: string }> };
    for (const result of response.processed ?? []) {
      await markQueue(result.eventId, result.status === 'CONFLICT' ? 'CONFLICT' : result.status === 'PROCESSING' ? 'PENDING' : 'SYNCED', result);
    }
    for (const result of response.failed ?? []) await markQueue(result.eventId, 'FAILED', undefined, result.message);
  } catch (error) {
    for (const item of items) await markQueue(item.event_id, 'FAILED', undefined, error instanceof Error ? error.message : 'Đồng bộ lỗi');
  }
}

export async function initialPull() {
  try {
    const payload = await api.get('/mobile/sync/pull') as any;
    await applyPull(payload);
    if (Array.isArray(payload?.alerts)) {
      const { useAppStore } = require('./store');
      useAppStore.getState().setUnreadAlertsCount(payload.alerts.filter((a: any) => !a.read).length);
    }
  } catch {
    // Offline load fallback
  }
}
