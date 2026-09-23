import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  Role,
  Unit,
  WorkAcceptanceStatus,
  WorkAssignmentMode,
  WorkAssignmentStatus,
  WorkOrderCategory,
  WorkOrderStatus,
  WorkOrderType,
  VehicleOperationalDomain,
} from '@prisma/client';
import { WorkOrdersService } from './work-orders.service';

const driver = { id: 20, role: Role.DRIVER, unit: Unit.KOUN_MOM };
const manager = { id: 10, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM };

const baseOrder = (status: WorkOrderStatus, overrides: Record<string, unknown> = {}) => ({
  id: 7,
  type: WorkOrderType.DISPATCH,
  unit: Unit.KOUN_MOM,
  status,
  version: 3,
  assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT,
  plannedStartAt: new Date('2026-09-14T01:00:00.000Z'),
  plannedEndAt: new Date('2026-09-14T09:00:00.000Z'),
  dispatchOrderId: null,
  transportOrderId: null,
  internalFeedTripId: null,
  ...overrides,
});

const transactionPrisma = (tx: Record<string, any>) => ({
  $transaction: jest.fn(async (callback: (client: any) => unknown) => callback(tx)),
});

const lockedTx = (order: ReturnType<typeof baseOrder>) => ({
  $queryRaw: jest.fn().mockResolvedValue([{ id: order.id }]),
  operationalWorkOrder: {
    findUnique: jest.fn().mockResolvedValue(order),
    update: jest.fn().mockResolvedValue({ ...order, version: order.version + 1 }),
  },
  workOrderEvent: { create: jest.fn().mockResolvedValue({}) },
  workBreakSession: { findFirst: jest.fn().mockResolvedValue(null) },
  workPauseSession: { findFirst: jest.fn().mockResolvedValue(null) },
});

describe('WorkOrdersService business-flow guards', () => {
  it('lets a driver claim an open trip with their current primary vehicle', async () => {
    const order = baseOrder(WorkOrderStatus.OPEN_FOR_CLAIM, {
      assignmentMode: WorkAssignmentMode.OPEN_ASSIGNMENT,
      category: WorkOrderCategory.AGRICULTURE,
      requestedVehicleTypeId: 101,
    });
    const tx = {
      ...lockedTx(order),
      workVehicleAssignment: {
        findFirst: jest.fn().mockResolvedValue({ id: 41, vehicleId: 501 }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 42 }),
      },
      vehicleDriverAssignment: { findFirst: jest.fn().mockResolvedValue({ vehicleId: 502 }) },
      user: { findUnique: jest.fn().mockResolvedValue({ assignedVehicleId: 502 }) },
      vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 502, unit: Unit.KOUN_MOM, vehicleTypeId: 101, vehicleType: { isAssignable: true, operationalDomain: VehicleOperationalDomain.AGRICULTURE } }) },
      driverProfile: { findUnique: jest.fn().mockResolvedValue({ userId: driver.id }) },
      workDriverAssignment: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 51 }) },
      driverKpiEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const availability = { assertResourcesAvailable: jest.fn().mockResolvedValue({}) };
    const service = new WorkOrdersService(transactionPrisma(tx) as never, availability as never);

    await expect(service.claim(order.id, { vehicleId: 502 }, driver)).resolves.toBeDefined();

    expect(tx.workVehicleAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 41 },
      data: expect.objectContaining({ status: WorkAssignmentStatus.REASSIGNED }),
    }));
    expect(tx.workVehicleAssignment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ vehicleId: 502 }) }));
    expect(availability.assertResourcesAvailable).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 502, driverId: driver.id, category: WorkOrderCategory.AGRICULTURE }), driver);
    expect(tx.workOrderEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'CLAIM', payload: { vehicleId: 502, vehicleSource: 'DRIVER_CURRENT' } }) }));
  });

  it('rejects a vehicle that is neither assigned to the driver nor reserved for the trip', async () => {
    const order = baseOrder(WorkOrderStatus.OPEN_FOR_CLAIM, { assignmentMode: WorkAssignmentMode.OPEN_ASSIGNMENT, category: WorkOrderCategory.AGRICULTURE });
    const tx = {
      ...lockedTx(order),
      workVehicleAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 41, vehicleId: 501 }) },
      vehicleDriverAssignment: { findFirst: jest.fn().mockResolvedValue({ vehicleId: 502 }) },
      user: { findUnique: jest.fn().mockResolvedValue({ assignedVehicleId: 502 }) },
    };
    const service = new WorkOrdersService(transactionPrisma(tx) as never, {} as never);

    await expect(service.claim(order.id, { vehicleId: 999 }, driver)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VEHICLE_NOT_CLAIMABLE' }),
    });
  });

  it('test_driver_accept_requires_assigned_and_ownership', async () => {
    const order = baseOrder(WorkOrderStatus.ASSIGNED);
    const tx = {
      ...lockedTx(order),
      workDriverAssignment: {
        findFirst: jest.fn().mockResolvedValue({ id: 31, driverId: driver.id }),
        update: jest.fn().mockResolvedValue({}),
      },
      driverKpiEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new WorkOrdersService(transactionPrisma(tx) as never, {} as never);

    await expect(service.driverAccept(order.id, driver)).resolves.toBeDefined();
    expect(tx.workDriverAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: WorkAssignmentStatus.ACCEPTED }),
    }));

    tx.operationalWorkOrder.findUnique.mockResolvedValue(baseOrder(WorkOrderStatus.DRIVER_ACCEPTED));
    await expect(service.driverAccept(order.id, driver)).rejects.toThrow('DRIVER_ACCEPTED');

    tx.operationalWorkOrder.findUnique.mockResolvedValue(order);
    tx.workDriverAssignment.findFirst.mockResolvedValue({ id: 32, driverId: 999 });
    await expect(service.driverAccept(order.id, driver)).rejects.toThrow(ForbiddenException);
  });

  it('test_start_requires_received', async () => {
    const order = baseOrder(WorkOrderStatus.ASSIGNED);
    const tx = lockedTx(order);
    const service = new WorkOrdersService(transactionPrisma(tx) as never, {} as never);

    await expect(service.startExecution(order.id, {}, driver)).rejects.toThrow('ASSIGNED');
    expect(tx.operationalWorkOrder.update).not.toHaveBeenCalled();
  });

  it('test_complete_requires_started', async () => {
    const order = baseOrder(WorkOrderStatus.IN_PROGRESS);
    const tx = {
      ...lockedTx(order),
      workExecutionSegment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new WorkOrdersService(transactionPrisma(tx) as never, {} as never);

    await expect(service.finishExecution(order.id, {}, driver)).rejects.toThrow(/đoạn thực hiện đang mở/i);
    expect(tx.operationalWorkOrder.update).not.toHaveBeenCalled();
  });

  it('test_acceptance_requires_files', async () => {
    const order = baseOrder(WorkOrderStatus.IN_PROGRESS);
    const tx = {
      ...lockedTx(order),
      workDriverAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 31, driverId: driver.id }) },
      workExecutionSegment: { findFirst: jest.fn().mockResolvedValue(null) },
      schedulingPolicy: { findUnique: jest.fn().mockResolvedValue({ completionPhotoCount: 1 }) },
      workEvidence: { count: jest.fn().mockResolvedValue(0) },
      workAcceptance: { create: jest.fn() },
    };
    const service = new WorkOrdersService(transactionPrisma(tx) as never, {} as never);

    await expect(service.submitAcceptance(order.id, driver)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'COMPLETION_EVIDENCE_REQUIRED', requiredPhotos: 1, currentPhotos: 0 }),
    });
    expect(tx.workAcceptance.create).not.toHaveBeenCalled();
  });

  it('test_rejected_acceptance_requires_reason', async () => {
    const order = baseOrder(WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE);
    const tx = lockedTx(order);
    const service = new WorkOrdersService(transactionPrisma(tx) as never, {} as never);

    await expect(service.reviewAcceptance(order.id, false, undefined, manager)).rejects.toThrow('phải có lý do');
    expect(tx.operationalWorkOrder.update).not.toHaveBeenCalled();
  });

  it('test_rejected_acceptance_can_be_resubmitted_without_deleting_history', async () => {
    const submitted = baseOrder(WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE);
    const reviewTx = {
      ...lockedTx(submitted),
      workAcceptance: {
        findFirst: jest.fn().mockResolvedValue({ id: 41, status: WorkAcceptanceStatus.PENDING }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
      },
    };
    const reviewService = new WorkOrdersService(transactionPrisma(reviewTx) as never, {} as never);
    await reviewService.reviewAcceptance(submitted.id, false, 'Thiếu ảnh góc phải', manager);
    expect(reviewTx.workAcceptance.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 41 },
      data: expect.objectContaining({ status: WorkAcceptanceStatus.REWORK_REQUIRED, reason: 'Thiếu ảnh góc phải' }),
    }));
    expect(reviewTx.workAcceptance.delete).not.toHaveBeenCalled();

    const reworked = baseOrder(WorkOrderStatus.IN_PROGRESS);
    const resubmitTx = {
      ...lockedTx(reworked),
      workDriverAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 31, driverId: driver.id }) },
      workExecutionSegment: { findFirst: jest.fn().mockResolvedValue(null) },
      schedulingPolicy: { findUnique: jest.fn().mockResolvedValue({ completionPhotoCount: 1 }) },
      workEvidence: { count: jest.fn().mockResolvedValue(1) },
      workAcceptance: { create: jest.fn().mockResolvedValue({ id: 42 }) },
    };
    const resubmitService = new WorkOrdersService(transactionPrisma(resubmitTx) as never, {} as never);
    await resubmitService.submitAcceptance(reworked.id, driver);
    expect(resubmitTx.workAcceptance.create).toHaveBeenCalledWith({ data: { workOrderId: reworked.id } });
  });

  it('test_stale_version_returns_conflict_before_assignment_mutation', async () => {
    const order = baseOrder(WorkOrderStatus.APPROVED, { version: 4 });
    const tx = {
      ...lockedTx(order),
      workVehicleAssignment: { updateMany: jest.fn(), create: jest.fn() },
      workDriverAssignment: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    };
    const service = new WorkOrdersService(transactionPrisma(tx) as never, {} as never);

    await expect(service.assign(order.id, {
      vehicleId: 5,
      driverId: driver.id,
      assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT,
      expectedVersion: 3,
    }, manager)).rejects.toThrow(ConflictException);
    expect(tx.workVehicleAssignment.updateMany).not.toHaveBeenCalled();
    expect(tx.workDriverAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('test_driver_cannot_access_other_order', async () => {
    const order = {
      ...baseOrder(WorkOrderStatus.ASSIGNED),
      driverAssignments: [{ driverId: 999, status: WorkAssignmentStatus.ASSIGNED }],
    };
    const prisma = { operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(order) } };
    const service = new WorkOrdersService(prisma as never, {} as never);

    await expect(service.findOne(order.id, driver)).rejects.toThrow(ForbiddenException);
  });
});
