export type ReportInputMode = 'QUANTITY' | 'PERCENT';

export function resolveDailyReportQuantity(
  input: number,
  mode: ReportInputMode,
  completedQuantity: number,
  targetQuantity: number,
) {
  if (!Number.isFinite(input) || input < 0) return { valid: false, quantityToday: 0, projectedPercent: 0 };
  if (mode === 'QUANTITY' || targetQuantity <= 0) {
    const projected = completedQuantity + input;
    return {
      valid: targetQuantity <= 0 || projected <= targetQuantity + 1e-9,
      quantityToday: input,
      projectedPercent: targetQuantity > 0 ? Math.min(100, projected / targetQuantity * 100) : 0,
    };
  }

  const approvedPercent = completedQuantity / targetQuantity * 100;
  return {
    valid: input + 1e-9 >= approvedPercent && input <= 100,
    quantityToday: Math.max(0, targetQuantity * input / 100 - completedQuantity),
    projectedPercent: input,
  };
}
