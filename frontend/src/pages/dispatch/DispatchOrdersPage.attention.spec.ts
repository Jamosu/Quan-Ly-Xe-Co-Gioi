import { describe, expect, it } from 'vitest';
import type { ExtendedDispatchOrder } from './DispatchOrdersPage';
import { getOperationalOverdueReason, isDepartureDelayed, needsOperatorAttention } from './DispatchOrdersPage';

const now = new Date('2026-09-12T08:00:00.000Z').getTime();
const order = (status: string, departureTime = '2026-09-12T07:00:00.000Z') => ({
  status,
  departureTime,
  driverAcceptedAt: undefined,
} as ExtendedDispatchOrder);

describe('dispatch management attention', () => {
  it('removes an assigned order from the pending-management count', () => {
    expect(needsOperatorAttention(order('ASSIGNED'), now)).toBe(false);
    expect(isDepartureDelayed(order('ASSIGNED'), now)).toBe(true);
  });

  it('keeps an overdue draft in management attention without calling it a departure delay', () => {
    expect(needsOperatorAttention(order('DRAFT'), now)).toBe(true);
    expect(isDepartureDelayed(order('DRAFT'), now)).toBe(false);
  });

  it('clears the warning as soon as the driver accepts the order', () => {
    expect(isDepartureDelayed({ ...order('DRIVER_ACCEPTED'), driverAcceptedAt: '2026-09-12T07:45:00.000Z' }, now)).toBe(false);
  });

  it('starts the departure warning exactly at T+15 minutes', () => {
    expect(isDepartureDelayed(order('ASSIGNED', '2026-09-12T07:45:00.000Z'), now)).toBe(true);
    expect(isDepartureDelayed(order('ASSIGNED', '2026-09-12T07:45:01.000Z'), now)).toBe(false);
  });

  it('puts an unaccepted order into the overdue queue at T+2 hours', () => {
    expect(getOperationalOverdueReason(order('ASSIGNED', '2026-09-12T06:00:00.000Z'), now)).toBe('DRIVER_ACCEPTANCE');
    expect(getOperationalOverdueReason(order('ASSIGNED', '2026-09-12T06:00:01.000Z'), now)).toBeNull();
  });

  it('puts work waiting for report or acceptance into the overdue queue two hours after planned end', () => {
    expect(getOperationalOverdueReason({ ...order('IN_TRANSIT'), driverAcceptedAt: '2026-09-12T04:00:00.000Z', plannedEndTime: '2026-09-12T06:00:00.000Z' }, now)).toBe('REPORT_OR_ACCEPTANCE');
    expect(getOperationalOverdueReason({ ...order('DELIVERED'), driverAcceptedAt: '2026-09-12T04:00:00.000Z', plannedEndTime: '2026-09-12T06:00:01.000Z' }, now)).toBeNull();
  });
});
