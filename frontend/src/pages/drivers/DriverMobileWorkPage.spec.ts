import { describe, expect, it } from 'vitest';
import type { OperationalWorkOrderRecord } from '../../api/scheduling';
import { getDriverDelayInfo, nextJourneyAction } from './DriverMobileWorkPage';

const base = { id: 1, unit: 'KOUN_MOM', assignmentMode: 'FIXED_ASSIGNMENT', plannedStartAt: '2026-09-11T00:00:00Z', plannedEndAt: '2026-09-11T08:00:00Z', version: 1, vehicleAssignments: [], driverAssignments: [], executionSegments: [], evidence: [] } as unknown as OperationalWorkOrderRecord;

describe('driver journey action selection', () => {
  it('keeps dispatch work and depot return as separate steps', () => {
    expect(nextJourneyAction({ ...base, type: 'DISPATCH', status: 'DRIVER_ACCEPTED', dispatchOrder: { code: 'LC-1', purpose: 'Cày', origin: 'Bãi', destination: 'Lô', status: 'DRIVER_ACCEPTED' }, journeyLegs: [] })).toBe('DEPART_TO_WORK');
    expect(nextJourneyAction({ ...base, type: 'DISPATCH', status: 'IN_PROGRESS', dispatchOrder: { code: 'LC-1', purpose: 'Cày', origin: 'Bãi', destination: 'Lô', status: 'AT_WORKSITE' }, journeyLegs: [{ id: 1, sequence: 1, type: 'OUTBOUND', status: 'AT_DELIVERY', originName: 'Bãi', destinationName: 'Lô', isEmpty: false }] })).toBe('START_WORK');
    expect(nextJourneyAction({ ...base, type: 'DISPATCH', status: 'IN_PROGRESS', dispatchOrder: { code: 'LC-1', purpose: 'Cày', origin: 'Bãi', destination: 'Lô', status: 'WORKING' }, journeyLegs: [{ id: 1, sequence: 1, type: 'OUTBOUND', status: 'COMPLETED', originName: 'Bãi', destinationName: 'Lô', isEmpty: false }] })).toBe('RETURN_TO_DEPOT');
  });

  it('skips loading and unloading for an empty return leg', () => {
    const transport = { ...base, type: 'TRANSPORT', status: 'IN_PROGRESS', transportOrder: { code: 'VC-1', status: 'IN_TRANSIT', routeType: 'TWO_WAY' as const }, journeyLegs: [{ id: 2, sequence: 2, type: 'RETURN' as const, status: 'AT_PICKUP' as const, originName: 'Kho B', destinationName: 'Kho A', isEmpty: true }] } as OperationalWorkOrderRecord;
    expect(nextJourneyAction(transport)).toBe('DEPART_PICKUP');
    expect(nextJourneyAction({ ...transport, journeyLegs: [{ ...transport.journeyLegs[0], status: 'AT_DELIVERY' }] })).toBe('COMPLETE_DELIVERY');
  });
});

describe('driver late-order warning', () => {
  const now = new Date('2026-09-12T08:00:00.000Z').getTime();

  it('warns an assigned driver when acceptance is late', () => {
    expect(getDriverDelayInfo({ ...base, status: 'ASSIGNED', type: 'DISPATCH' } as OperationalWorkOrderRecord, now)).toMatchObject({ delayMinutes: 1_920, phase: 'WAITING_ACCEPTANCE' });
  });

  it('changes the warning after the driver accepts and clears it after departure', () => {
    expect(getDriverDelayInfo({ ...base, status: 'DRIVER_ACCEPTED', type: 'DISPATCH' } as OperationalWorkOrderRecord, now)).toMatchObject({ phase: 'WAITING_DEPARTURE' });
    expect(getDriverDelayInfo({ ...base, status: 'IN_PROGRESS', type: 'DISPATCH' } as OperationalWorkOrderRecord, now)).toBeNull();
  });

  it('does not warn inside the 15-minute grace period', () => {
    const recent = { ...base, status: 'ASSIGNED', type: 'DISPATCH', plannedStartAt: '2026-09-12T07:46:00.000Z' } as OperationalWorkOrderRecord;
    expect(getDriverDelayInfo(recent, now)).toBeNull();
  });

  it('warns exactly at the 15-minute threshold', () => {
    const boundary = { ...base, status: 'ASSIGNED', type: 'DISPATCH', plannedStartAt: '2026-09-12T07:45:00.000Z' } as OperationalWorkOrderRecord;
    expect(getDriverDelayInfo(boundary, now)).toMatchObject({ delayMinutes: 15, thresholdMinutes: 15 });
  });
});
