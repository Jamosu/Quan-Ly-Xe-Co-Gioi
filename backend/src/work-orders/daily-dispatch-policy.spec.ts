import { DailyReportStatus, DispatchAcceptStatus } from '@prisma/client';
import { calculateScheduledEnd, classifyDailyReportSubmission, classifyShiftAcceptance } from './work-orders.service';

describe('daily dispatch timing policy', () => {
  const at = (time: string) => new Date(`2026-09-17T${time}:00+07:00`);

  it('adds both working and break minutes without shifting for a late acceptance', () => {
    expect(calculateScheduledEnd(at('07:00'), 480, 120)).toEqual(at('17:00'));
    expect(classifyShiftAcceptance(at('07:00'), at('07:13'), 15)).toEqual({ status: DispatchAcceptStatus.WITHIN_GRACE, delayMinutes: 13 });
  });

  it('classifies the shift acceptance boundary', () => {
    expect(classifyShiftAcceptance(at('07:00'), at('07:00'), 15).status).toBe(DispatchAcceptStatus.ON_TIME);
    expect(classifyShiftAcceptance(at('07:00'), at('07:15'), 15).status).toBe(DispatchAcceptStatus.WITHIN_GRACE);
    expect(classifyShiftAcceptance(at('07:00'), at('07:16'), 15)).toEqual({ status: DispatchAcceptStatus.LATE, delayMinutes: 16 });
  });

  it('classifies the daily report deadline boundary', () => {
    expect(classifyDailyReportSubmission(at('17:15'), at('17:08')).status).toBe(DailyReportStatus.SUBMITTED_ON_TIME);
    expect(classifyDailyReportSubmission(at('17:15'), at('17:15')).status).toBe(DailyReportStatus.SUBMITTED_ON_TIME);
    expect(classifyDailyReportSubmission(at('17:15'), at('17:16'))).toEqual({ status: DailyReportStatus.LATE, delayMinutes: 1 });
  });
});
