export const isLiquidatedAssignedUnit = (value: unknown): boolean => {
  const key = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  return ['LOAI BIEN', 'THANH LY', 'DA LOAI BIEN', 'DA THANH LY', 'LUU TRU'].includes(key);
};
