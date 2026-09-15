import type { MobileEventType, QueueItem } from './types';

export function eventPriority(eventType: MobileEventType) {
  if (eventType === 'SOS_CREATED') return 0;
  if (eventType === 'INCIDENT_REPORTED') return 1;
  return 2;
}

export function retryDelayMs(attempt: number, baseMs = 2_000, maxMs = 5 * 60_000) {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(maxMs, baseMs * 2 ** (safeAttempt - 1));
}

export function sortForSync<T extends Pick<QueueItem, 'priority' | 'sequence_number'>>(items: T[]) {
  return [...items].sort((left, right) => left.priority - right.priority || left.sequence_number - right.sequence_number);
}

export function isRetryDue(nextRetryAt: string | null | undefined, now = Date.now()) {
  if (!nextRetryAt) return true;
  const value = Date.parse(nextRetryAt);
  return Number.isNaN(value) || value <= now;
}
