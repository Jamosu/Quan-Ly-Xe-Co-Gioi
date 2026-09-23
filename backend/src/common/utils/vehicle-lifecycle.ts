import { Prisma, VehicleStatus } from '@prisma/client';

export const LIQUIDATED_ASSIGNED_UNIT = 'Loại biên';

const LIQUIDATED_UNIT_KEYS = new Set([
  'LOAI BIEN',
  'THANH LY',
  'DA LOAI BIEN',
  'DA THANH LY',
  'LUU TRU',
]);

export const liquidatedVehicleWhere: Prisma.VehicleWhereInput = {
  assignedUnitCode: {
    in: ['Loại biên', 'Thanh lý', 'Đã loại biên', 'Đã thanh lý', 'Lưu trữ'],
  },
};

export const operationalVehicleWhere: Prisma.VehicleWhereInput = {
  status: { in: [VehicleStatus.CHO_PHAN_CONG, VehicleStatus.HOAT_DONG] },
  NOT: liquidatedVehicleWhere,
};

export function isLiquidatedAssignedUnit(value: unknown): boolean {
  const key = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return LIQUIDATED_UNIT_KEYS.has(key);
}
