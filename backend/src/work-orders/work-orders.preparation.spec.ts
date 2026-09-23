import {
  DispatchStatus,
  Role,
  Unit,
  VehicleOperationalDomain,
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
        policy: { unit: Unit.KOUN_MOM, timezone: 'Asia/Phnom_Penh', vehicleBufferMinutes: 15, driverBufferMinutes: 15 },
        vehicles: [{ id: 9, code: 'XE-09', name: 'Máy kéo 09', available: false, availabilityStatus: 'UNAVAILABLE', reasons: [{ code: 'WORK_ORDER', message: 'Trùng lệnh' }], intervals: [], availableSlots: [] }],
        drivers: [
          { id: 7, code: 'TX-07', name: 'Nguyễn Văn A', available: true, availabilityStatus: 'AVAILABLE', reasons: [], intervals: [], availableSlots: [] },
          { id: 8, code: 'TX-KM-090', name: 'Nguyễn Văn B', available: false, availabilityStatus: 'UNAVAILABLE', reasons: [{ code: 'LICENSE_CLASS_MISMATCH', message: 'GPLX không phù hợp.' }], intervals: [], availableSlots: [] },
        ],
      }),
    };
    const prisma: any = {
      driverManagementUnit: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, code: 'XN_KM', name: 'XN KM', level: 'OWNER', status: 'ACTIVE', complexCode: 'KOUN_MOM' }),
        findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      },
      driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([{ id: 1, managementUnitId: 1, complexCode: 'KOUN_MOM', isManagerProjection: false }]) },
      vehicle: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          managementUnitId: 1,
          unit: Unit.KOUN_MOM,
          complexCode: 'KOUN_MOM',
          status: 'CHO_PHAN_CONG',
          assignedUnitCode: 'XN Chuối DP1',
          vehicleTypeId: 2,
          vehicleType: { id: 2, active: true, isAssignable: true, operationalDomain: VehicleOperationalDomain.AGRICULTURE },
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 9, code: 'XE-09', name: 'Máy kéo 09', status: 'CHO_PHAN_CONG', vehicleTypeId: 2, vehicleType: { id: 2, active: true, isAssignable: true, operationalDomain: VehicleOperationalDomain.AGRICULTURE } },
          { id: 10, code: 'XE-10', name: 'Xe tải 10', status: 'CHO_PHAN_CONG', vehicleTypeId: 3, vehicleType: { id: 3, active: true, isAssignable: true, operationalDomain: VehicleOperationalDomain.TRANSPORT } },
        ]),
      },
      user: { findMany: jest.fn().mockResolvedValue([
        { id: 7, code: 'TX-07', fullName: 'Nguyễn Văn A', licenseClass: 'HANG_B2' },
        { id: 8, code: 'TX-KM-090', fullName: 'Nguyễn Văn B', licenseClass: 'HANG_C' },
      ]) },
      agriculturalImplement: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([{
        id: 3, code: 'NC-03', name: 'Dàn cày', category: 'DAN_CAY', sourceGroup: null,
        usageMode: 'ATTACHABLE', technicalCondition: 'GOOD', status: 'IN_DEPOT', currentVehicleId: null,
        compatibleVehicleTypes: [{ vehicleTypeId: 2 }],
      }]) },
      dispatchOrder: { findMany: jest.fn().mockResolvedValue([]) },
      transportOrder: { findMany: jest.fn().mockResolvedValue([]) },
      operationalWorkOrder: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new WorkOrdersService(prisma, availability as never);

    const result = await service.preparationContext({
      managementUnitId: 1,
      category: WorkOrderCategory.AGRICULTURE,
      unit: Unit.KOUN_MOM,
      complexCode: 'KOUN_MOM',
      vehicleId: 9,
      startAt: new Date('2026-09-12T00:00:00.000Z'),
      endAt: new Date('2026-09-12T08:00:00.000Z'),
    }, { id: 5, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM });

    expect(availability.search).toHaveBeenCalledTimes(1);
    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles.find((item) => item.id === 9)).toMatchObject({ availability: { available: false }, selection: { selectable: false } });
    expect(result.drivers).toHaveLength(2);
    expect(result.drivers.find((item) => item.id === 7)).toMatchObject({ availability: { available: true }, selection: { selectable: true } });
    expect(result.drivers.find((item) => item.id === 8)).toMatchObject({ selection: { selectable: false, reasons: [{ code: 'LICENSE_CLASS_MISMATCH' }] } });
    expect(result.implements[0]).toMatchObject({ id: 3, selection: { selectable: true } });
    expect(result.summary).toEqual({
      vehicles: { total: 1, selectable: 0 },
      drivers: { total: 2, selectable: 1 },
      implements: { total: 1, selectable: 1 },
    });
    expect(prisma.agriculturalImplement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        unit: Unit.KOUN_MOM,
        usageMode: 'ATTACHABLE',
        compatibleVehicleTypes: {
          some: { vehicleType: { operationalDomain: VehicleOperationalDomain.AGRICULTURE, isAssignable: true } },
        },
      }),
    }));
  });

  it('rejects a preparation context whose unit differs from the selected complex', async () => {
    const service = new WorkOrdersService({ driverManagementUnit: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, level: 'OWNER', status: 'ACTIVE', complexCode: 'KOUN_MOM' }),
      findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
    } } as never, { search: jest.fn() } as never);

    await expect(service.preparationContext({
      managementUnitId: 1,
      category: WorkOrderCategory.AGRICULTURE,
      unit: Unit.KOUN_MOM,
      complexCode: 'NAM_LAO',
      startAt: new Date('2026-09-12T00:00:00.000Z'),
      endAt: new Date('2026-09-12T08:00:00.000Z'),
    }, { id: 5, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH })).rejects.toThrow(
      'Đơn vị điều xe không khớp Khu liên hợp đã chọn.',
    );
  });

  it.each([
    ['team leader', { id: 5, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM }],
    ['admin', { id: 1, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH }],
  ])('issues an open agricultural order for %s when the catalog enterprise differs from the resource team', async (_label, operationalActor) => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      driverManagementUnit: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      agriculturalImplement: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicle: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          managementUnitId: 1,
          unit: Unit.KOUN_MOM,
          complexCode: 'KOUN_MOM',
          vehicleTypeId: 2,
          vehicleType: {
            id: 2,
            active: true,
            isAssignable: true,
            operationalDomain: VehicleOperationalDomain.AGRICULTURE,
          },
        }),
      },
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
      driverManagementUnit: { findUnique: jest.fn().mockResolvedValue({ id: 1, code: 'XN_KM', name: 'XN KM', level: 'OWNER', status: 'ACTIVE', complexCode: 'KOUN_MOM' }) },
      driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([{ id: 1, managementUnitId: 1, complexCode: 'KOUN_MOM', isManagerProjection: false }]) },
      catalogItem: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({ code: 'KOUN_MOM' })
          .mockResolvedValueOnce({ code: 'XN_AD', parentCode: 'KOUN_MOM' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      operationalLocation: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicleType: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const availability = { assertResourcesAvailable: jest.fn().mockResolvedValue(undefined) };
    const service = new WorkOrdersService(prisma, availability as never);

    const result = await service.createManual({
      managementUnitId: 1,
      category: WorkOrderCategory.AGRICULTURE,
      unit: Unit.KOUN_MOM,
      complexCode: 'KOUN_MOM',
      enterpriseCode: 'XN_AD',
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
    }, operationalActor);

    expect(result).toMatchObject({ id: 31, status: WorkOrderStatus.OPEN_FOR_CLAIM });
    expect(availability.assertResourcesAvailable).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 9, driverId: undefined }), expect.anything());
    expect(tx.dispatchOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: DispatchStatus.APPROVED, operationDomain: 'AGRICULTURE' }),
    }));
    expect(tx.operationalWorkOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ category: WorkOrderCategory.AGRICULTURE, status: WorkOrderStatus.OPEN_FOR_CLAIM }),
    }));
  });

  it('rejects and rolls back when the selected vehicle belongs to another unit', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      driverManagementUnit: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      agriculturalImplement: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicle: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          managementUnitId: 2,
          unit: Unit.NAM_LAO,
          complexCode: 'NAM_LAO',
          vehicleTypeId: 2,
          vehicleType: { id: 2, active: true, isAssignable: true, operationalDomain: VehicleOperationalDomain.AGRICULTURE },
        }),
      },
      dispatchOrder: { create: jest.fn() },
    };
    const prisma: any = {
      driverManagementUnit: { findUnique: jest.fn().mockResolvedValue({ id: 1, code: 'XN_KM', name: 'XN KM', level: 'OWNER', status: 'ACTIVE', complexCode: 'KOUN_MOM' }) },
      driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([{ id: 1, managementUnitId: 1, complexCode: 'KOUN_MOM', isManagerProjection: false }]) },
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
    const service = new WorkOrdersService(prisma, { assertResourcesAvailable: jest.fn() } as never);

    await expect(service.createManual({
      managementUnitId: 1,
      category: WorkOrderCategory.AGRICULTURE,
      unit: Unit.KOUN_MOM,
      complexCode: 'KOUN_MOM',
      enterpriseCode: 'XN_KM',
      workLocationText: 'Lô A01',
      jobName: 'Cày đất',
      jobDescription: 'Cày chuẩn bị đất trồng',
      plannedStartAt: new Date('2026-09-12T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-12T08:00:00.000Z'),
      shift: 'CA_NGAY',
      origin: 'Bãi xe',
      destination: 'Lô A01',
      categoryDetails: { agricultureJobType: 'Cày đất' },
      assignmentMode: WorkAssignmentMode.OPEN_ASSIGNMENT,
      vehicleId: 9,
      action: WorkOrderPreparationAction.ISSUE,
    }, { id: 5, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VEHICLE_SCOPE_MISMATCH' }),
    });

    expect(tx.dispatchOrder.create).not.toHaveBeenCalled();
  });
});
