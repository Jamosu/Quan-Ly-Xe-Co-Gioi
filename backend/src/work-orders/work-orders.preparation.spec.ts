import {
  DispatchStatus,
  Role,
  Unit,
  WorkAssignmentMode,
  WorkOrderCategory,
  WorkOrderStatus,
} from '@prisma/client';
import { WorkOrderPreparationAction } from './dto/prepare-work-order.dto';
import { buildDriverDelayAlert, WorkOrdersService } from './work-orders.service';

describe('driver delay alert', () => {
  const now = new Date('2026-09-12T08:00:00.000Z');

  it('warns separately while waiting for acceptance and waiting for departure', () => {
    expect(buildDriverDelayAlert({ status: WorkOrderStatus.ASSIGNED, plannedStartAt: new Date('2026-09-12T07:00:00.000Z') }, now)).toMatchObject({ delayMinutes: 60, phase: 'WAITING_ACCEPTANCE' });
    expect(buildDriverDelayAlert({ status: WorkOrderStatus.DRIVER_ACCEPTED, plannedStartAt: new Date('2026-09-12T07:00:00.000Z') }, now)).toMatchObject({ delayMinutes: 60, phase: 'WAITING_DEPARTURE' });
  });

  it('does not warn before the 15-minute threshold or after execution starts', () => {
    expect(buildDriverDelayAlert({ status: WorkOrderStatus.ASSIGNED, plannedStartAt: new Date('2026-09-12T07:46:00.000Z') }, now)).toBeNull();
    expect(buildDriverDelayAlert({ status: WorkOrderStatus.IN_PROGRESS, plannedStartAt: new Date('2026-09-12T07:00:00.000Z') }, now)).toBeNull();
  });

  it('warns exactly at the 15-minute threshold', () => {
    expect(buildDriverDelayAlert({ status: WorkOrderStatus.ASSIGNED, plannedStartAt: new Date('2026-09-12T07:45:00.000Z') }, now)).toMatchObject({
      delayMinutes: 15,
      thresholdMinutes: 15,
      phase: 'WAITING_ACCEPTANCE',
    });
  });
});

describe('WorkOrdersService manual preparation', () => {
  it('returns assignment resources and timelines from one preparation context', async () => {
    const availability = {
      search: jest.fn().mockResolvedValue({
        requestedInterval: { startAt: new Date('2026-09-12T00:00:00.000Z'), endAt: new Date('2026-09-12T08:00:00.000Z') },
        policy: { unit: Unit.NT1, timezone: 'Asia/Phnom_Penh', vehicleBufferMinutes: 15, driverBufferMinutes: 15 },
        vehicles: [{ id: 9, code: 'XE-09', name: 'Máy kéo 09', available: false, availabilityStatus: 'UNAVAILABLE', reasons: [{ code: 'WORK_ORDER', message: 'Trùng lệnh' }], intervals: [], availableSlots: [] }],
        drivers: [{ id: 7, code: 'TX-07', name: 'Nguyễn Văn A', available: true, availabilityStatus: 'AVAILABLE', reasons: [], intervals: [], availableSlots: [] }],
      }),
    };
    const prisma: any = {
      vehicle: { findMany: jest.fn().mockResolvedValue([{ id: 9, code: 'XE-09', name: 'Máy kéo 09', vehicleTypeId: 2 }]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 7, code: 'TX-07', fullName: 'Nguyễn Văn A', licenseClass: 'HANG_B2' }]) },
      agriculturalImplement: { findMany: jest.fn().mockResolvedValue([{ id: 3, code: 'NC-03', name: 'Dàn cày', compatibleVehicleTypes: [] }]) },
      dispatchOrder: { findMany: jest.fn().mockResolvedValue([]) },
      transportOrder: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new WorkOrdersService(prisma, availability as never);

    const result = await service.preparationContext({
      category: WorkOrderCategory.AGRICULTURE,
      unit: Unit.NT1,
      startAt: new Date('2026-09-12T00:00:00.000Z'),
      endAt: new Date('2026-09-12T08:00:00.000Z'),
    }, { id: 5, role: Role.FARM_MANAGER, unit: Unit.NT1 });

    expect(availability.search).toHaveBeenCalledTimes(1);
    expect(result.vehicles[0]).toMatchObject({ id: 9, availability: { available: false } });
    expect(result.drivers[0]).toMatchObject({ id: 7, availability: { available: true } });
    expect(result.implements).toHaveLength(1);
  });

  it('issues an open agricultural order into the shared claim workflow', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      dispatchOrder: { create: jest.fn().mockResolvedValue({ id: 21 }) },
      operationalWorkOrder: {
        create: jest.fn().mockResolvedValue({ id: 31 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 31, status: WorkOrderStatus.OPEN_FOR_CLAIM }),
      },
      driverKpiEvent: { create: jest.fn() },
      workOrderEvent: { create: jest.fn().mockResolvedValue({}) },
      operationalAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      catalogItem: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({ code: 'KOUN_MOM' })
          .mockResolvedValueOnce({ code: 'XN_KM', parentCode: 'KOUN_MOM' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      operationalLocation: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicleType: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const availability = { assertResourcesAvailable: jest.fn().mockResolvedValue(undefined) };
    const service = new WorkOrdersService(prisma, availability as never);

    const result = await service.createManual({
      category: WorkOrderCategory.AGRICULTURE,
      unit: Unit.NT1,
      complexCode: 'KOUN_MOM',
      enterpriseCode: 'XN_KM',
      workLocationText: 'Lô A01',
      jobName: 'Cày đất',
      jobDescription: 'Cày chuẩn bị đất trồng',
      plannedStartAt: new Date('2026-09-12T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-12T08:00:00.000Z'),
      shift: 'CA_NGAY',
      origin: 'Bãi xe NT1',
      destination: 'Lô A01',
      categoryDetails: { agricultureJobType: 'Cày đất' },
      assignmentMode: WorkAssignmentMode.OPEN_ASSIGNMENT,
      vehicleId: 9,
      action: WorkOrderPreparationAction.ISSUE,
    }, { id: 5, role: Role.FARM_MANAGER, unit: Unit.NT1 });

    expect(result).toMatchObject({ id: 31, status: WorkOrderStatus.OPEN_FOR_CLAIM });
    expect(availability.assertResourcesAvailable).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 9, driverId: undefined }), expect.anything());
    expect(tx.dispatchOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: DispatchStatus.APPROVED, operationDomain: 'AGRICULTURE' }),
    }));
    expect(tx.operationalWorkOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ category: WorkOrderCategory.AGRICULTURE, status: WorkOrderStatus.OPEN_FOR_CLAIM }),
    }));
  });
});
