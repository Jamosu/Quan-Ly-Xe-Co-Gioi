import { DriverEmploymentStatus, DriverLicenseClass, DriverShiftStatus, Role, VehicleStatus } from '@prisma/client';
import { DispatchOrdersService } from './dispatch-orders.service';

describe('DispatchOrdersService resource validation', () => {
  it('reports maintenance, expired credentials, wrong class and overlap together', async () => {
    const conflict = { id: 99 };
    const prisma = {
      vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 4, status: VehicleStatus.SUA_CHUA, vehicleType: { requiredLicenseClass: DriverLicenseClass.HANG_FC } }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 8, role: Role.DRIVER, employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC, currentShiftStatus: DriverShiftStatus.SAN_SANG, licenseClass: DriverLicenseClass.HANG_C, licenseExpiryDate: new Date('2025-01-01'), healthCheckExpiryDate: new Date('2025-01-01') }) },
      dispatchOrder: { findFirst: jest.fn().mockResolvedValue(conflict) },
      transportOrder: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new DispatchOrdersService(prisma as never);
    const reasons = await service.validateResources({ vehicleId: 4, driverId: 8, departureTime: new Date('2026-09-03T08:00:00Z'), plannedEndTime: new Date('2026-09-03T10:00:00Z') });
    expect(reasons.map((reason) => reason.rule)).toEqual(expect.arrayContaining(['STATUS', 'LICENSE_CLASS', 'LICENSE_EXPIRED', 'HEALTH_EXPIRED', 'SCHEDULE_OVERLAP']));
    expect(reasons.filter((reason) => reason.rule === 'SCHEDULE_OVERLAP')).toHaveLength(2);
  });

  it('rejects an inverted schedule without querying resources', async () => {
    const prisma = { vehicle: { findUnique: jest.fn() } };
    const service = new DispatchOrdersService(prisma as never);
    const reasons = await service.validateResources({ vehicleId: 1, driverId: 2, departureTime: new Date('2026-09-03T10:00:00Z'), plannedEndTime: new Date('2026-09-03T09:00:00Z') });
    expect(reasons).toEqual([expect.objectContaining({ rule: 'INVALID_WINDOW' })]);
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
  });
});
