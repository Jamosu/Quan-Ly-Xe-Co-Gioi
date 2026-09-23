import { MaintenanceStatus, Role, Unit, VehicleStatus } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import { DriverEmploymentStatus, DriverLicenseClass, DriverShiftStatus, WorkOrderCategory } from '@prisma/client';

describe('AvailabilityService', () => {
  const start = new Date('2026-09-15T08:00:00.000Z');
  const end = new Date('2026-09-15T09:00:00.000Z');

  const createPrisma = (maintenanceStart: Date, maintenanceEnd: Date) => ({
    schedulingPolicy: { findUnique: jest.fn().mockResolvedValue({ vehicleBufferMinutes: 15, driverBufferMinutes: 0, timezone: 'Asia/Phnom_Penh' }) },
    vehicle: { findMany: jest.fn().mockResolvedValue([{ id: 1, code: 'XE-01', name: 'Xe 01', unit: Unit.KOUN_MOM, status: VehicleStatus.CHO_PHAN_CONG, vehicleType: null }]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    workVehicleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    workDriverAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    workExecutionSegment: { findMany: jest.fn().mockResolvedValue([]) },
    workshopRequest: { findMany: jest.fn()
      .mockResolvedValueOnce([{ id: 10, vehicleId: 1, status: 'PLANNED', plannedStartAt: maintenanceStart, plannedEndAt: maintenanceEnd, startedAt: null, completedAt: null, createdAt: maintenanceStart }])
      .mockResolvedValueOnce([]) },
    vehicleUnavailability: { findMany: jest.fn().mockResolvedValue([]) },
    driverUnavailability: { findMany: jest.fn().mockResolvedValue([]) },
    dispatchOrder: { findMany: jest.fn().mockResolvedValue([]) },
    transportOrder: { findMany: jest.fn().mockResolvedValue([]) },
    internalFeedTrip: { findMany: jest.fn().mockResolvedValue([]) },
  });

  const actor = { id: 1, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH };

  it('returns a warning when only the configured buffer overlaps', async () => {
    const prisma = createPrisma(new Date('2026-09-15T09:10:00.000Z'), new Date('2026-09-15T10:00:00.000Z'));
    const result = await new AvailabilityService(prisma as any).search({ startAt: start, endAt: end, vehicleIds: [1] }, actor);
    expect(result.vehicles[0].availabilityStatus).toBe('WARNING');
    expect(result.vehicles[0].available).toBe(true);
    expect(result.vehicles[0].reasons[0]).toMatchObject({ code: 'BUFFER_TIME_WARNING', severity: 'WARNING', conflictInterval: { overlapMinutes: 5 } });
  });

  it('returns a blocking reason with conflict details for a real overlap', async () => {
    const prisma = createPrisma(new Date('2026-09-15T08:30:00.000Z'), new Date('2026-09-15T10:00:00.000Z'));
    const result = await new AvailabilityService(prisma as any).search({ startAt: start, endAt: end, vehicleIds: [1] }, actor);
    expect(result.vehicles[0].availabilityStatus).toBe('UNAVAILABLE');
    expect(result.vehicles[0].reasons[0]).toMatchObject({ code: 'VEHICLE_MAINTENANCE', severity: 'BLOCK', relatedId: 10, conflictInterval: { overlapMinutes: 30 } });
  });

  it('loads conflicts in one batch instead of querying once per resource', async () => {
    const prisma = createPrisma(new Date('2026-09-15T10:00:00.000Z'), new Date('2026-09-15T11:00:00.000Z'));
    prisma.vehicle.findMany.mockResolvedValue([
      { id: 1, code: 'XE-01', name: 'Xe 01', unit: Unit.KOUN_MOM, status: VehicleStatus.CHO_PHAN_CONG, vehicleType: null },
      { id: 2, code: 'XE-02', name: 'Xe 02', unit: Unit.KOUN_MOM, status: VehicleStatus.CHO_PHAN_CONG, vehicleType: null },
    ]);
    prisma.workshopRequest.findMany.mockReset().mockResolvedValue([]);

    const result = await new AvailabilityService(prisma as any).search({ startAt: start, endAt: end, vehicleIds: [1, 2] }, actor);

    expect(result.vehicles).toHaveLength(2);
    expect(prisma.workVehicleAssignment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.workshopRequest.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.workDriverAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  it('accepts an active supplemental B2 license for an agricultural order', async () => {
    const prisma = createPrisma(new Date('2026-09-15T10:00:00.000Z'), new Date('2026-09-15T11:00:00.000Z'));
    prisma.vehicle.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([{
      id: 7,
      code: 'TX-07',
      fullName: 'Tài xế hạng C có B2 bổ sung',
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      currentShiftStatus: DriverShiftStatus.SAN_SANG,
      licenseClass: DriverLicenseClass.HANG_C,
      driverProfile: {
        employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
        currentShiftStatus: DriverShiftStatus.SAN_SANG,
        licenseClass: DriverLicenseClass.HANG_C,
        licensesJson: [{ category: 'Hạng B2 (Máy cày, máy kéo)', expiryDate: '2035-12-31' }],
      },
    }]);
    prisma.workshopRequest.findMany.mockReset().mockResolvedValue([]);

    const result = await new AvailabilityService(prisma as any).search({
      startAt: start,
      endAt: end,
      driverIds: [7],
      category: WorkOrderCategory.AGRICULTURE,
    }, actor);

    expect(result.drivers[0]).toMatchObject({ available: true, reasons: [] });
  });

  it('states whether a driver is on leave instead of returning a generic busy reason', async () => {
    const prisma = createPrisma(new Date('2026-09-15T10:00:00.000Z'), new Date('2026-09-15T11:00:00.000Z'));
    prisma.vehicle.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([{
      id: 8,
      code: 'TX-08',
      fullName: 'Tài xế nghỉ phép',
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      currentShiftStatus: DriverShiftStatus.SAN_SANG,
      licenseClass: DriverLicenseClass.HANG_B2,
      driverProfile: null,
    }]);
    prisma.driverUnavailability.findMany.mockResolvedValue([{
      id: 20,
      driverId: 8,
      type: 'LEAVE',
      startAt: start,
      endAt: end,
      reason: 'Nghỉ phép năm',
    }]);
    prisma.workshopRequest.findMany.mockReset().mockResolvedValue([]);

    const result = await new AvailabilityService(prisma as any).search({ startAt: start, endAt: end, driverIds: [8] }, actor);

    expect(result.drivers[0].reasons[0]).toMatchObject({
      code: 'DRIVER_LEAVE',
      message: 'Tài xế đang nghỉ phép trong khung giờ này. Lý do: Nghỉ phép năm',
    });
  });
});
