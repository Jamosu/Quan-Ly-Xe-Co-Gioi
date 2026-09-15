import { DriverEmploymentStatus, DriverLicenseClass, DriverShiftStatus, ImplementRequirement, ImplementStatus, Role, TechnicalCondition, VehicleOperationalDomain, VehicleStatus } from '@prisma/client';
import { DispatchOrdersService } from './dispatch-orders.service';

describe('DispatchOrdersService resource validation', () => {
  it('approves a draft work order before assigning it from the combined approval action', async () => {
    const prisma = {
      dispatchOrder: { update: jest.fn().mockResolvedValue({}) },
    };
    const workOrders = {
      ensureApprovedForAssignment: jest.fn().mockResolvedValue({ status: 'APPROVED' }),
      assign: jest.fn().mockResolvedValue({ status: 'ASSIGNED' }),
    };
    const service = new DispatchOrdersService(prisma as never, workOrders as never);
    const order = {
      id: 7,
      status: 'DRAFT',
      approvedAt: null,
      operationalWorkOrder: { id: 17, status: 'DRAFT' },
    };
    jest.spyOn(service, 'findOne').mockResolvedValue(order as never);
    jest.spyOn(service, 'validateResources').mockResolvedValue([]);

    await service.assign(7, {
      vehicleId: 10,
      driverId: 20,
      departureTime: new Date('2026-09-12T01:00:00Z'),
      plannedEndTime: new Date('2026-09-12T09:00:00Z'),
    }, { id: 1 } as never);

    expect(workOrders.ensureApprovedForAssignment).toHaveBeenCalledWith(17, expect.objectContaining({ id: 1 }));
    expect(workOrders.assign).toHaveBeenCalledWith(17, expect.objectContaining({ vehicleId: 10, driverId: 20 }), expect.objectContaining({ id: 1 }));
    expect(prisma.dispatchOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7 },
      data: expect.objectContaining({ approvedById: 1 }),
    }));
  });

  it('rejects a standalone order without an explicit exception reason', async () => {
    const service = new DispatchOrdersService({} as never);
    await expect(service.create({
      code: 'LDX-EX-001', unit: 'NT1' as never, purpose: 'Phát sinh', origin: 'A', destination: 'B',
    }, { id: 1 } as never)).rejects.toThrow('MANUAL_EXCEPTION');
  });

  it('reports maintenance, expired credentials, wrong class and overlap together', async () => {
    const conflict = { id: 99 };
    const prisma = {
      vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 4, status: VehicleStatus.SUA_CHUA, vehicleType: { requiredLicenseClass: (DriverLicenseClass as any)?.HANG_CE ?? 'HANG_CE' } }) },
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

  it('rejects an agriculture tractor in a construction order and requires its implement', async () => {
    const prisma = {
      vehicle: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          code: 'MK-01',
          vehicleTypeId: 10,
          status: VehicleStatus.CHO_PHAN_CONG,
          vehicleType: {
            id: 10,
            name: 'Máy kéo',
            isAssignable: true,
            operationalDomain: VehicleOperationalDomain.AGRICULTURE,
            implementRequirement: ImplementRequirement.REQUIRED,
            requiredLicenseClass: null,
          },
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          role: Role.DRIVER,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          currentShiftStatus: DriverShiftStatus.SAN_SANG,
          licenseExpiryDate: new Date('2027-01-01'),
          healthCheckExpiryDate: new Date('2027-01-01'),
        }),
      },
      dispatchOrder: {
        findUnique: jest.fn().mockResolvedValue({
          operationDomain: VehicleOperationalDomain.CONSTRUCTION,
          unit: 'NT1',
          productionOrder: null,
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      transportOrder: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new DispatchOrdersService(prisma as never);
    const reasons = await service.validateResources(
      { vehicleId: 4, driverId: 8, departureTime: new Date('2026-09-03T08:00:00Z'), plannedEndTime: new Date('2026-09-03T10:00:00Z') },
      5,
    );
    expect(reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'VEHICLE_DOMAIN_MISMATCH' }),
      expect.objectContaining({ rule: 'IMPLEMENT_REQUIRED' }),
    ]));
  });

  it('rejects an implement that is already assigned in the same time window', async () => {
    const prisma = {
      vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 1, status: VehicleStatus.CHO_PHAN_CONG, vehicleType: null }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 2, role: Role.DRIVER, employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC, currentShiftStatus: DriverShiftStatus.SAN_SANG, licenseExpiryDate: new Date('2027-01-01'), healthCheckExpiryDate: new Date('2027-01-01') }) },
      agriculturalImplement: { findUnique: jest.fn().mockResolvedValue({ id: 3, status: ImplementStatus.IN_DEPOT, technicalCondition: TechnicalCondition.GOOD }) },
      dispatchOrder: { findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 }) },
      transportOrder: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new DispatchOrdersService(prisma as never);
    const reasons = await service.validateResources({ vehicleId: 1, driverId: 2, implementId: 3, departureTime: new Date('2026-09-03T08:00:00Z'), plannedEndTime: new Date('2026-09-03T10:00:00Z') });
    expect(reasons).toContainEqual(expect.objectContaining({ resourceType: 'IMPLEMENT', rule: 'SCHEDULE_OVERLAP' }));
  });
});

describe('DispatchOrdersService operator attention summary', () => {
  it('separates orders awaiting management action from assigned orders delayed at departure', async () => {
    const prisma = {
      dispatchOrder: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, code: 'LDX-001', status: 'DRAFT', departureTime: new Date('2026-09-09T00:00:00Z'), vehicleId: null, driverId: null },
          { id: 2, code: 'LDX-002', status: 'APPROVED', departureTime: new Date('2026-09-09T01:00:00Z'), vehicleId: 10, driverId: null },
          { id: 3, code: 'LDX-003', status: 'ASSIGNED', departureTime: new Date('2026-09-09T02:00:00Z'), vehicleId: 11, driverId: 21 },
          { id: 4, code: 'LDX-004', status: 'DRIVER_ACCEPTED', departureTime: new Date('2026-09-09T03:00:00Z'), vehicleId: 12, driverId: 22 },
        ]),
      },
    };
    const service = new DispatchOrdersService(prisma as never);

    const summary = await service.overdueSummary({ id: 99, role: Role.SUPER_ADMIN } as never);

    expect(summary).toMatchObject({
      totalAttention: 2,
      pendingAction: 2,
      totalOverdue: 3,
      lateAwaitingAssignment: 1,
      lateAssigned: 1,
      lateAccepted: 1,
      awaitingApproval: 1,
      missingVehicle: 1,
      missingDriver: 2,
    });
    expect(summary.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, attentionType: 'MANAGEMENT_ACTION' }),
      expect.objectContaining({ id: 3, attentionType: 'DEPARTURE_DELAY' }),
    ]));
    expect(prisma.dispatchOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ actualDepartureTime: null }),
    }));
  });
});
