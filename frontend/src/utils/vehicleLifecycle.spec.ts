import { describe, expect, it } from 'vitest';
import { isLiquidatedAssignedUnit } from './vehicleLifecycle';

describe('vehicle lifecycle', () => {
  it('distinguishes liquidated vehicles from temporarily stopped vehicles', () => {
    expect(isLiquidatedAssignedUnit('Loại biên')).toBe(true);
    expect(isLiquidatedAssignedUnit('Thanh lý')).toBe(true);
    expect(isLiquidatedAssignedUnit('XN Chuối DP1')).toBe(false);
    expect(isLiquidatedAssignedUnit(undefined)).toBe(false);
  });
});
