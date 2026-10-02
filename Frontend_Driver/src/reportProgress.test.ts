import { describe, expect, it } from 'vitest';
import { resolveDailyReportQuantity } from './reportProgress';

describe('daily report progress input', () => {
  it('converts cumulative percent to today quantity without exceeding the target', () => {
    const completed = resolveDailyReportQuantity(100, 'PERCENT', 2.8, 4);
    expect(completed.valid).toBe(true);
    expect(completed.quantityToday).toBeCloseTo(1.2);
    expect(completed.projectedPercent).toBe(100);
    expect(resolveDailyReportQuantity(50, 'PERCENT', 2.8, 4).valid).toBe(false);
    expect(resolveDailyReportQuantity(1.3, 'QUANTITY', 2.8, 4).valid).toBe(false);
  });
});
