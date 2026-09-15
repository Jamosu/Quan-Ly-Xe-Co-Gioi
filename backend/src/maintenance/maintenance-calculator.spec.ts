import { MaintenanceAlertTier, MaintenanceOccurrenceStatus } from '@prisma/client';
import { ENGINE_HOUR_MILESTONES, ODOMETER_KM_MILESTONES, calculateOccurrenceState, currentCycleIndex } from './maintenance-calculator';

describe('multi-cycle maintenance calculator', () => {
  test.each([
    [79.99, MaintenanceAlertTier.GREEN],
    [80, MaintenanceAlertTier.AMBER],
    [99.99, MaintenanceAlertTier.AMBER],
    [100, MaintenanceAlertTier.RED],
    [110, MaintenanceAlertTier.RED],
  ])('classifies %s%% at the configured boundary', (percent, tier) => {
    const state = calculateOccurrenceState(percent, 0, 100);
    expect(state.alertTier).toBe(tier);
    expect(state.explanationRequired).toBe(false);
  });

  it('requires an explanation only when progress is over 110%', () => {
    const state = calculateOccurrenceState(110.01, 0, 100);
    expect(state.status).toBe(MaintenanceOccurrenceStatus.OVERDUE);
    expect(state.explanationRequired).toBe(true);
  });

  it('calculates progress from the previous milestone', () => {
    expect(calculateOccurrenceState(450, 250, 500).progressPercent).toBe(80);
    expect(calculateOccurrenceState(450, 250, 500).alertTier).toBe(MaintenanceAlertTier.AMBER);
  });

  it('contains all approved hour and odometer milestones', () => {
    expect([...ENGINE_HOUR_MILESTONES]).toEqual([50, 250, 500, 750, 1000, 1250, 1500, 1750, 2000]);
    expect([...ODOMETER_KM_MILESTONES]).toEqual([500, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000]);
  });

  it('repeats after the maximum without resetting the total meter', () => {
    expect(currentCycleIndex(2000, 2000)).toBe(0);
    expect(currentCycleIndex(2000.01, 2000)).toBe(1);
    const cycleBase = currentCycleIndex(2250, 2000) * 2000;
    expect(ENGINE_HOUR_MILESTONES.map((value) => cycleBase + value).slice(0, 3)).toEqual([2050, 2250, 2500]);
  });

  it('identifies every crossed milestone when telemetry jumps', () => {
    const crossed = ENGINE_HOUR_MILESTONES.filter((value) => value > 40 && value <= 800);
    expect(crossed).toEqual([50, 250, 500, 750]);
  });
});
