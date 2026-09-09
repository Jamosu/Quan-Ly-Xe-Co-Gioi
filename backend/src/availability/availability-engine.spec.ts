import { calculateFreeSlots, mergeBusyIntervals, overlaps, withBuffer } from './availability-engine';

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 8, 8, hour, minute));

describe('availability engine', () => {
  it('treats equal boundaries as non-overlap when buffer is zero', () => {
    expect(overlaps(at(10), at(11), at(9), at(10))).toBe(false);
    expect(overlaps(at(10), at(11), at(11), at(12))).toBe(false);
  });

  it.each([
    [at(9, 30), at(10, 30)],
    [at(10, 30), at(11, 30)],
    [at(10, 15), at(10, 45)],
    [at(9), at(12)],
  ])('detects every overlap shape', (start, end) => {
    expect(overlaps(start, end, at(10), at(11))).toBe(true);
  });

  it('expands intervals with buffer', () => {
    const interval = withBuffer({ type: 'WORK', startTime: at(10), endTime: at(11) }, 15);
    expect(interval.startTime).toEqual(at(9, 45));
    expect(interval.endTime).toEqual(at(11, 15));
  });

  it('merges overlapping and touching busy intervals', () => {
    const result = mergeBusyIntervals([
      { type: 'WORK', startTime: at(10), endTime: at(11) },
      { type: 'REPAIR', startTime: at(10, 30), endTime: at(12) },
      { type: 'LEAVE', startTime: at(12), endTime: at(13) },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toEqual(at(10));
    expect(result[0].endTime).toEqual(at(13));
  });

  it('returns only free slots long enough for the requested duration', () => {
    const result = calculateFreeSlots(at(8), at(17), [
      { type: 'WORK', startTime: at(9), endTime: at(10) },
      { type: 'WORK', startTime: at(12), endTime: at(16) },
    ], 90);
    expect(result).toEqual([
      { startTime: at(10), endTime: at(12), durationMinutes: 120 },
    ]);
  });
});
