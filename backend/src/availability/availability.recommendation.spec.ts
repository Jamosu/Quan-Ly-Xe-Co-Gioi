import { Role, Unit, VehicleStatus, WorkAssignmentStatus, WorkOrderStatus } from '@prisma/client';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService proximity recommendations', () => {
  const actor = { id: 1, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH };
  const plannedStartAt = new Date(Date.now() + 90 * 60_000);

  const targetOrder = {
    id: 99,
    unit: Unit.KOUN_MOM,
    plannedStartAt,
    dispatchOrder: { destination: 'Lô mới', destinationLocation: { id: 5, name: 'Lô mới', lat: 13.5, lng: 106.8 }, productionOrder: { planItem: { vehicleTypeId: 7 } } },
    transportOrder: null,
  };

  const vehicle = (id: number, lng: number) => ({
    id, code: `XE-${id}`, name: `Xe ${id}`, plate: null, unit: Unit.KOUN_MOM,
    status: id === 2 ? VehicleStatus.HOAT_DONG : VehicleStatus.CHO_PHAN_CONG,
    vehicleType: { id: 7, isAssignable: true }, vehicleTypeId: 7,
    gpsImei: null, lastGpsUpdate: null, currentLat: null, currentLng: null,
    homeDepot: { id: id + 10, name: `Bãi ${id}`, lat: 13.5, lng },
  });

  it('ranks an available vehicle and includes a vehicle finishing within 60 minutes', async () => {
    const finishingWork = {
      id: 44,
      plannedEndAt: new Date(Date.now() + 30 * 60_000),
      journeyLegs: [], evidence: [], dispatchOrder: null, transportOrder: null,
      status: WorkOrderStatus.IN_PROGRESS,
    };
    const prisma = {
      operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(targetOrder) },
      operationalLocation: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicle: { findMany: jest.fn().mockResolvedValue([vehicle(1, 106.79), vehicle(2, 106.795)]) },
      user: { count: jest.fn().mockResolvedValue(1) },
      workVehicleAssignment: {
        findMany: jest.fn().mockResolvedValue([{ vehicleId: 2, workOrderId: 44, status: WorkAssignmentStatus.ACCEPTED, workOrder: finishingWork }]),
      },
    };
    const previous = process.env.ROUTING_BASE_URL;
    delete process.env.ROUTING_BASE_URL;
    const result = await new AvailabilityService(prisma as any).recommendVehicles({ workOrderId: 99 }, actor);
    if (previous === undefined) delete process.env.ROUTING_BASE_URL; else process.env.ROUTING_BASE_URL = previous;

    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations.map((item) => item.availability)).toContain('FINISHING_SOON');
    expect(result.recommendations[0]).toMatchObject({ positionSource: 'HOME_DEPOT', etaSource: 'HAVERSINE', driverAvailable: true });
  });

  it('excludes a busy vehicle whose task ends outside the configured window', async () => {
    const prisma = {
      operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(targetOrder) },
      operationalLocation: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicle: { findMany: jest.fn().mockResolvedValue([vehicle(2, 106.795)]) },
      user: { count: jest.fn().mockResolvedValue(0) },
      workVehicleAssignment: { findMany: jest.fn().mockResolvedValue([{ vehicleId: 2, workOrderId: 45, workOrder: { plannedEndAt: new Date(Date.now() + 61 * 60_000), journeyLegs: [], evidence: [], dispatchOrder: null, transportOrder: null, status: WorkOrderStatus.IN_PROGRESS } }]) },
    };
    const result = await new AvailabilityService(prisma as any).recommendVehicles({ workOrderId: 99, finishingWindowMinutes: 60 }, actor);
    expect(result.recommendations).toEqual([]);
    expect(result.excluded[0].reasons[0].code).toBe('SCHEDULE_CONFLICT');
  });

  it('reports maintenance and wrong-type exclusions instead of silently dropping vehicles', async () => {
    const maintenanceVehicle = { ...vehicle(3, 106.79), status: VehicleStatus.BAO_DUONG };
    const wrongTypeVehicle = { ...vehicle(4, 106.79), vehicleTypeId: 8, vehicleType: { id: 8, isAssignable: true } };
    const prisma = {
      operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(targetOrder) },
      operationalLocation: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
      vehicle: { findMany: jest.fn().mockResolvedValue([maintenanceVehicle, wrongTypeVehicle]) },
      user: { count: jest.fn().mockResolvedValue(1) },
      workVehicleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const result = await new AvailabilityService(prisma as any).recommendVehicles({ workOrderId: 99 }, actor);

    expect(result.recommendations).toEqual([]);
    expect(result.excluded.map((item) => item.reasons[0].code)).toEqual(['UNDER_MAINTENANCE', 'WRONG_VEHICLE_TYPE']);
    expect(prisma.workVehicleAssignment.findMany).toHaveBeenCalledTimes(1);
  });
});
