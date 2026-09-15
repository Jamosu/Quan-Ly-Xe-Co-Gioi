import { MaintenanceStatus, Role, Unit, VehicleStatus } from '@prisma/client';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  const start = new Date('2026-09-15T08:00:00.000Z');
  const end = new Date('2026-09-15T09:00:00.000Z');

  const createPrisma = (maintenanceStart: Date, maintenanceEnd: Date) => ({
    schedulingPolicy: { findUnique: jest.fn().mockResolvedValue({ vehicleBufferMinutes: 15, driverBufferMinutes: 0, timezone: 'Asia/Phnom_Penh' }) },
    vehicle: { findMany: jest.fn().mockResolvedValue([{ id: 1, code: 'XE-01', name: 'Xe 01', unit: Unit.NT1, status: VehicleStatus.CHO_PHAN_CONG, vehicleType: null }]) },
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
      { id: 1, code: 'XE-01', name: 'Xe 01', unit: Unit.NT1, status: VehicleStatus.CHO_PHAN_CONG, vehicleType: null },
      { id: 2, code: 'XE-02', name: 'Xe 02', unit: Unit.NT1, status: VehicleStatus.CHO_PHAN_CONG, vehicleType: null },
    ]);
    prisma.workshopRequest.findMany.mockReset().mockResolvedValue([]);

    const result = await new AvailabilityService(prisma as any).search({ startAt: start, endAt: end, vehicleIds: [1, 2] }, actor);

    expect(result.vehicles).toHaveLength(2);
    expect(prisma.workVehicleAssignment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.workshopRequest.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.workDriverAssignment.findMany).toHaveBeenCalledTimes(1);
  });
});
