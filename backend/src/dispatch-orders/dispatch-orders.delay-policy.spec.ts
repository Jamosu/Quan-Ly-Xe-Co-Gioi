import { DispatchStatus, Unit, WorkAssignmentStatus, WorkOrderStatus } from '@prisma/client';
import { DispatchOrdersService } from './dispatch-orders.service';

const delayedOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  code: 'LDX-007',
  status: DispatchStatus.ASSIGNED,
  requesterId: 10,
  assignedById: 11,
  vehicleId: 20,
  driverId: 30,
  unit: Unit.KOUN_MOM,
  destination: 'Lô A01',
  operationalWorkOrder: null,
  ...overrides,
});

describe('DispatchOrdersService 15/45-minute delay policy', () => {
  it('creates the first warning exactly at T+15 minutes', async () => {
    const order = delayedOrder();
    const tx = {
      dispatchOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      operationalAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      dispatchOrder: { findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([order]) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const alerts = { emit: jest.fn().mockResolvedValue({ id: 1 }) };
    const service = new DispatchOrdersService(prisma as never, undefined, alerts as never);

    const result = await service.checkDelayedOrders(new Date('2026-09-14T08:15:00.000Z'));

    expect(result).toEqual({ updatedCount: 1, warningCount: 1, reopenedCount: 0 });
    expect(prisma.dispatchOrder.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        vehicleId: { not: null },
        driverId: { not: null },
        departureTime: { lte: new Date('2026-09-14T08:00:00.000Z') },
      }),
    }));
    expect(tx.dispatchOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { isDelayed: true } }));
    expect(alerts.emit).toHaveBeenCalledWith(expect.objectContaining({
      alertType: 'DELAYED_DEPARTURE',
      thresholdValue: 15,
      dedupeKey: 'DISPATCH:DELAYED:7',
    }), tx);
  });

  it('sends the second alert, releases the old driver, and reopens exactly at T+45 minutes', async () => {
    const order = delayedOrder({
      operationalWorkOrder: { id: 70, status: WorkOrderStatus.ASSIGNED },
    });
    const tx = {
      dispatchOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      workVehicleAssignment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      workDriverAssignment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      operationalWorkOrder: { update: jest.fn().mockResolvedValue({}) },
      driverKpiEvent: { create: jest.fn().mockResolvedValue({}) },
      workOrderEvent: { create: jest.fn().mockResolvedValue({}) },
      operationalAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      dispatchOrder: { findMany: jest.fn().mockResolvedValueOnce([order]).mockResolvedValueOnce([]) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const alerts = { emit: jest.fn().mockResolvedValue({ id: 2 }) };
    const service = new DispatchOrdersService(prisma as never, undefined, alerts as never);

    const result = await service.checkDelayedOrders(new Date('2026-09-14T08:45:00.000Z'));

    expect(result).toEqual({ updatedCount: 0, warningCount: 0, reopenedCount: 1 });
    expect(prisma.dispatchOrder.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        status: { in: [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED] },
        departureTime: { lte: new Date('2026-09-14T08:00:00.000Z') },
        operationalWorkOrder: { is: { status: { not: WorkOrderStatus.OPEN_FOR_CLAIM } } },
      }),
    }));
    expect(tx.dispatchOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: DispatchStatus.APPROVED, driverId: null, isDelayed: true }),
    }));
    expect(tx.operationalWorkOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 70 },
      data: expect.objectContaining({ assignmentMode: 'OPEN_ASSIGNMENT', status: WorkOrderStatus.OPEN_FOR_CLAIM }),
    }));
    expect(tx.workDriverAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: WorkAssignmentStatus.REASSIGNED }),
    }));
    expect(tx.workVehicleAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: WorkAssignmentStatus.REASSIGNED }),
    }));
    expect(tx.driverKpiEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ driverId: 30, type: 'REASSIGNED' }),
    }));
    expect(alerts.emit).toHaveBeenCalledWith(expect.objectContaining({
      alertType: 'DELAYED_DEPARTURE_REOPENED',
      thresholdValue: 45,
      dedupeKey: 'DISPATCH:REOPEN:7',
    }), tx);
  });

  it('does not reopen before the T+45 boundary', async () => {
    const prisma = {
      dispatchOrder: { findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]) },
      $transaction: jest.fn(),
    };
    const service = new DispatchOrdersService(prisma as never);

    await expect(service.checkDelayedOrders(new Date('2026-09-14T08:44:59.000Z'))).resolves.toEqual({
      updatedCount: 0,
      warningCount: 0,
      reopenedCount: 0,
    });
    expect(prisma.dispatchOrder.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ departureTime: { lte: new Date('2026-09-14T07:59:59.000Z') } }),
    }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
