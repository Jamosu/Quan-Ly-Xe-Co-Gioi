import { DailyReportStatus, DailyReportSubmitterType, DispatchStatus, Role, Unit, WorkOrderCategory, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { WorkOrdersService } from './work-orders.service';

const manager = { id: 9, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM };
const baseOrder = { id: 21, managementUnitId: 1, type: WorkOrderType.DISPATCH, unit: Unit.KOUN_MOM, category: WorkOrderCategory.AGRICULTURE, status: WorkOrderStatus.IN_PROGRESS, completedQuantity: 10, targetUnit: 'ha', dispatchOrderId: 31, plannedStartAt: new Date('2026-09-17T00:00:00Z'), plannedEndAt: new Date('2026-09-17T10:00:00Z') };
const transactional = (tx: any, outside: Record<string, unknown> = {}) => ({ ...outside, $transaction: jest.fn((callback: any) => callback(tx)) });

describe('daily dispatch manager flow', () => {
  it('records a manager-submitted report without impersonating the driver', async () => {
    const report = { id: 71, dispatchOrderId: 31, workOrderId: 21, originalDriverId: 5, status: DailyReportStatus.SUBMITTED_BY_MANAGER };
    const tx: any = {
      $queryRaw: jest.fn(),
      operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(baseOrder) },
      dispatchOrder: { findUnique: jest.fn().mockResolvedValue({ id: 31, code: 'DX-31', workOrderId: 21, driverId: 5, dailyReport: null, reportDeadlineAt: new Date(Date.now() + 60_000), scheduledStartAt: new Date(), status: DispatchStatus.WAITING_REPORT }), update: jest.fn() },
      dailyReport: { upsert: jest.fn().mockResolvedValue(report) },
      driverKpiEvent: { create: jest.fn() }, workOrderEvent: { create: jest.fn() },
    };
    const service = new WorkOrdersService(transactional(tx) as never, {} as never);
    await expect(service.submitDailyReport(21, { dispatchOrderId: 31, quantityToday: 7, managerReason: 'Tài xế mất điện thoại' }, manager)).resolves.toEqual(report);
    expect(tx.dailyReport.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ originalDriverId: 5, submittedByType: DailyReportSubmitterType.MANAGER, submittedByUserId: manager.id, managerReason: 'Tài xế mất điện thoại' }),
    }));
    expect(tx.workOrderEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'DAILY_REPORT_SUBMIT_BY_MANAGER', actorId: manager.id }) }));
  });

  it('creates exactly one next-day dispatch on the same work order with replaceable resources', async () => {
    const previous: any = { id: 31, code: 'LDX-NN-OLD', workOrderId: 21, status: DispatchStatus.ACCEPTED, scheduledStartAt: new Date('2026-09-17T00:00:00Z'), workDurationMinutes: 480, breakDurationMinutes: 60, vehicleId: 2, driverId: 5, implementId: 8, origin: 'Bãi', destination: 'Lô C1', dailyReport: { status: DailyReportStatus.ACCEPTED, workCompleted: false } };
    const aggregate: any = { ...baseOrder, driverAssignments: [], dailyDispatchOrders: [previous] };
    const tx: any = {
      $queryRaw: jest.fn(), schedulingPolicy: { findUnique: jest.fn().mockResolvedValue(null) },
      dispatchOrder: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 32, code: 'LDX-NN-NEW' }) },
      workVehicleAssignment: { updateMany: jest.fn(), create: jest.fn() }, workDriverAssignment: { updateMany: jest.fn(), create: jest.fn() },
      operationalWorkOrder: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue(aggregate) },
      driverKpiEvent: { create: jest.fn() }, workOrderEvent: { create: jest.fn() }, alertEvent: { upsert: jest.fn() },
    };
    const prisma = transactional(tx, {
      operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(aggregate) },
      driverManagementUnit: { findUnique: jest.fn().mockResolvedValue({ id: 1, level: 'OWNER', status: 'ACTIVE', complexCode: 'KOUN_MOM' }) },
      driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([{ id: 1, managementUnitId: 1, complexCode: 'KOUN_MOM', isManagerProjection: false }]) },
    });
    const availability = { assertResourcesAvailable: jest.fn().mockResolvedValue(undefined) };
    const service = new WorkOrdersService(prisma as never, availability as never);
    await service.continueNextDay(21, { previousDispatchOrderId: 31, scheduledStartAt: new Date('2026-09-18T00:00:00Z'), vehicleId: 3, driverId: 6 }, manager);
    expect(tx.dispatchOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ workOrderId: 21, previousDispatchOrderId: 31, vehicleId: 3, driverId: 6, status: DispatchStatus.ASSIGNED }) }));
    expect(tx.operationalWorkOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED }) }));
  });

  it('closes the aggregate only when the manager accepts a completion report', async () => {
    const report: any = { id: 71, dispatchOrderId: 31, workOrderId: 21, originalDriverId: 5, status: DailyReportStatus.SUBMITTED_ON_TIME, quantityToday: 7, workCompleted: true, reportSubmittedAt: new Date() };
    const tx: any = {
      $queryRaw: jest.fn(), operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(baseOrder), update: jest.fn() },
      dailyReport: { findUnique: jest.fn().mockResolvedValue(report), update: jest.fn() }, dispatchOrder: { update: jest.fn() },
      workAcceptance: { create: jest.fn() }, driverKpiEvent: { create: jest.fn() }, workOrderEvent: { create: jest.fn() },
      workVehicleAssignment: { findFirst: jest.fn().mockResolvedValue(null) }, workDriverAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new WorkOrdersService(transactional(tx) as never, {} as never);
    await service.acceptDailyReport(21, 31, {}, manager);
    expect(tx.workAcceptance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', reviewedById: manager.id }) }));
    expect(tx.operationalWorkOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: WorkOrderStatus.ACCEPTED, completedQuantity: 17 }) }));
  });
});
