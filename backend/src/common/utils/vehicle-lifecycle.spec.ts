import { VehicleStatus } from '@prisma/client';
import { isLiquidatedAssignedUnit, operationalVehicleWhere } from './vehicle-lifecycle';

describe('vehicle lifecycle', () => {
  it('recognizes source labels used for liquidation and archival', () => {
    expect(isLiquidatedAssignedUnit('Loại biên')).toBe(true);
    expect(isLiquidatedAssignedUnit('Thanh lý')).toBe(true);
    expect(isLiquidatedAssignedUnit('XN Chuối DP1')).toBe(false);
  });

  it('only allows operational statuses in resource selectors', () => {
    expect(operationalVehicleWhere.status).toEqual({
      in: [VehicleStatus.CHO_PHAN_CONG, VehicleStatus.HOAT_DONG],
    });
    expect(operationalVehicleWhere.NOT).toBeDefined();
  });
});
