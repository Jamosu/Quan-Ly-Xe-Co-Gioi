import { describe, expect, it } from 'vitest';
import { eventPriority, isRetryDue, retryDelayMs, sortForSync } from './syncPolicy';

describe('offline sync policy', () => {
  it('ưu tiên SOS rồi sự cố trước thao tác thường', () => {
    expect(eventPriority('SOS_CREATED')).toBe(0);
    expect(eventPriority('INCIDENT_REPORTED')).toBe(1);
    expect(eventPriority('JOB_COMPLETED')).toBe(2);
  });

  it('giữ đúng sequence trong cùng mức ưu tiên', () => {
    const rows = [
      { priority: 2, sequence_number: 3 },
      { priority: 0, sequence_number: 9 },
      { priority: 2, sequence_number: 1 },
    ];
    expect(sortForSync(rows)).toEqual([rows[1], rows[2], rows[0]]);
  });

  it('backoff lũy tiến và dừng ở 5 phút', () => {
    expect(retryDelayMs(1)).toBe(2_000);
    expect(retryDelayMs(4)).toBe(16_000);
    expect(retryDelayMs(20)).toBe(300_000);
  });

  it('chỉ retry khi đến hạn', () => {
    expect(isRetryDue(null, 1_000)).toBe(true);
    expect(isRetryDue(new Date(999).toISOString(), 1_000)).toBe(true);
    expect(isRetryDue(new Date(1_001).toISOString(), 1_000)).toBe(false);
  });
});
