export type AvailabilitySeverity = 'WARNING' | 'BLOCK';

export interface BusyInterval {
  type: string;
  startTime: Date;
  endTime: Date;
  status?: string;
  relatedId?: number;
  relatedCode?: string;
  reasonCode?: string;
}

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export const overlaps = (
  requestedStart: Date,
  requestedEnd: Date,
  existingStart: Date,
  existingEnd: Date,
) => requestedStart < existingEnd && requestedEnd > existingStart;

export const mergeBusyIntervals = (intervals: BusyInterval[]): BusyInterval[] => {
  const sorted = [...intervals].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime() || a.endTime.getTime() - b.endTime.getTime(),
  );
  const merged: BusyInterval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last || interval.startTime > last.endTime) {
      merged.push({ ...interval });
      continue;
    }
    if (interval.endTime > last.endTime) last.endTime = interval.endTime;
    if (last.type !== interval.type) last.type = 'MERGED_BUSY';
  }
  return merged;
};

export const calculateFreeSlots = (
  from: Date,
  to: Date,
  intervals: BusyInterval[],
  requiredDurationMinutes = 0,
): AvailableSlot[] => {
  const clipped = intervals
    .filter((item) => overlaps(from, to, item.startTime, item.endTime))
    .map((item) => ({
      ...item,
      startTime: item.startTime < from ? from : item.startTime,
      endTime: item.endTime > to ? to : item.endTime,
    }));
  const merged = mergeBusyIntervals(clipped);
  const slots: AvailableSlot[] = [];
  let cursor = from;
  for (const interval of merged) {
    if (cursor < interval.startTime) {
      const durationMinutes = (interval.startTime.getTime() - cursor.getTime()) / 60000;
      if (durationMinutes >= requiredDurationMinutes) slots.push({ startTime: cursor, endTime: interval.startTime, durationMinutes });
    }
    if (interval.endTime > cursor) cursor = interval.endTime;
  }
  if (cursor < to) {
    const durationMinutes = (to.getTime() - cursor.getTime()) / 60000;
    if (durationMinutes >= requiredDurationMinutes) slots.push({ startTime: cursor, endTime: to, durationMinutes });
  }
  return slots;
};

export const withBuffer = (interval: BusyInterval, minutes: number): BusyInterval => ({
  ...interval,
  startTime: new Date(interval.startTime.getTime() - minutes * 60000),
  endTime: new Date(interval.endTime.getTime() + minutes * 60000),
});
