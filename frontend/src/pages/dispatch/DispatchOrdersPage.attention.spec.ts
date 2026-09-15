import { describe, expect, it } from 'vitest';
import type { ExtendedDispatchOrder } from './DispatchOrdersPage';
import { isDepartureDelayed, needsOperatorAttention } from './DispatchOrdersPage';

const now = new Date('2026-09-12T08:00:00.000Z').getTime();
const order = (status: string, departureTime = '2026-09-12T07:00:00.000Z') => ({
  status,
  departureTime,
  actualDepartureTime: undefined,
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

  it('clears the departure warning once an actual departure is recorded', () => {
    expect(isDepartureDelayed({ ...order('DRIVER_ACCEPTED'), actualDepartureTime: '2026-09-12T07:45:00.000Z' }, now)).toBe(false);
  });

  it('starts the departure warning exactly at T+15 minutes', () => {
    expect(isDepartureDelayed(order('ASSIGNED', '2026-09-12T07:45:00.000Z'), now)).toBe(true);
    expect(isDepartureDelayed(order('ASSIGNED', '2026-09-12T07:45:01.000Z'), now)).toBe(false);
  });
});
