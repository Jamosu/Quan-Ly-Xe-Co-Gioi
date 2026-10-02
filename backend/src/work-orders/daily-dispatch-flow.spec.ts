import { DailyReportStatus, DailyReportSubmitterType, DispatchStatus, Role, Unit, WorkOrderCategory, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { WorkOrdersService } from './work-orders.service';

const manager = { id: 9, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM };
const dispatcher = { id: 8, role: Role.DISPATCHER, unit: Unit.KOUN_MOM };
const driver = { id: 5, role: Role.DRIVER, unit: Unit.KOUN_MOM, username: 'km.tx001' };
const baseOrder = { id: 21, managementUnitId: 1, type: WorkOrderType.DISPATCH, unit: Unit.KOUN_MOM, category: WorkOrderCategory.AGRICULTURE, status: WorkOrderStatus.IN_PROGRESS, completedQuantity: 5, targetQuantity: 10, targetUnit: 'ha', dispatchOrderId: 31, plannedStartAt: new Date('2026-09-17T00:00:00Z'), plannedEndAt: new Date('2026-09-17T10:00:00Z') };
const transactional = (tx: any, outside: Record<string, unknown> = {}) => ({ ...outside, $transaction: jest.fn((callback: any) => callback(tx)) });

describe('daily dispatch manager flow', () => {
  it('opens the driver report after arrival and requires quantity, description, and evidence', async () => {
    const dispatch = { id: 31, workOrderId: 21, driverId: driver.id, status: DispatchStatus.DRIVER_ACCEPTED, dailyReport: null, reportDeadlineAt: new Date(Date.now() + 60_000) };
    const tx: any = {
      $queryRaw: jest.fn(),
      operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(baseOrder) },
      dispatchOrder: { findUnique: jest.fn().mockResolvedValue(dispatch) },
    };
    const service = new WorkOrdersService(transactional(tx) as never, {} as never);

    await expect(service.submitDailyReport(21, { dispatchOrderId: 31, quantityToday: 1, note: 'Đã cày đất', evidenceUrls: ['evidence.jpg'] }, driver))
      .rejects.toThrow('sau khi tài xế đã đến điểm làm việc');

    tx.dispatchOrder.findUnique.mockResolvedValue({ ...dispatch, status: DispatchStatus.AT_WORKSITE });
    await expect(service.submitDailyReport(21, { dispatchOrderId: 31, quantityToday: 6, note: 'Đã cày đất', evidenceUrls: ['evidence.jpg'] }, driver))
      .rejects.toThrow('tối đa 5');
    await expect(service.submitDailyReport(21, { dispatchOrderId: 31, quantityToday: 1, note: 'Đã cày đất' }, driver))
      .rejects.toThrow('ít nhất một ảnh minh chứng');
  });

  it('blocks device actions on a work session from a previous day', async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(baseOrder) },
      workDriverAssignment: { findFirst: jest.fn().mockResolvedValue({ driverId: driver.id }) },
      workExecutionSegment: { findFirst: jest.fn().mockResolvedValue({ id: 88, workDate: new Date('2026-09-23T00:00:00Z'), status: 'ACTIVE' }) },
    };
    const service = new WorkOrdersService(transactional(tx) as never, {} as never);

    await expect(service.startBreak(21, { type: 'LUNCH' as never }, driver))
      .rejects.toThrow('Phiên làm việc thuộc ngày trước');
  });

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
    await expect(service.submitDailyReport(21, { dispatchOrderId: 31, quantityToday: 3, managerReason: 'Tài xế mất điện thoại' }, dispatcher)).resolves.toEqual(report);
    expect(tx.dailyReport.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ originalDriverId: 5, submittedByType: DailyReportSubmitterType.MANAGER, submittedByUserId: dispatcher.id, managerReason: 'Tài xế mất điện thoại' }),
    }));
    expect(tx.workOrderEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'DAILY_REPORT_SUBMIT_BY_MANAGER', actorId: dispatcher.id }) }));
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

  it('moves an unresolved old dispatch to a new day without overwriting its missing report', async () => {
    const previous: any = { id: 31, code: 'LDX-NN-OLD', workOrderId: 21, status: DispatchStatus.WAITING_REPORT, scheduledStartAt: new Date('2026-09-23T00:00:00Z'), workDurationMinutes: 480, breakDurationMinutes: 0, vehicleId: 2, driverId: 5, origin: 'Bãi', destination: 'Lô C1', dailyReport: { status: DailyReportStatus.MISSING, workCompleted: false } };
    const aggregate: any = { ...baseOrder, driverAssignments: [], dailyDispatchOrders: [previous] };
    const tx: any = {
      $queryRaw: jest.fn(), schedulingPolicy: { findUnique: jest.fn().mockResolvedValue(null) },
      workExecutionSegment: { findFirst: jest.fn().mockResolvedValue(null) },
      dispatchOrder: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 33, code: 'LDX-NN-NEW' }) },
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

    await service.continueNextDay(21, { previousDispatchOrderId: 31, scheduledStartAt: new Date('2026-09-29T00:00:00Z'), vehicleId: 3, driverId: 6, notes: 'Điều chuyển lệnh tồn đọng', reassignUnresolved: true }, manager);

    expect(tx.dispatchOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ previousDispatchOrderId: 31, vehicleId: 3, driverId: 6 }) }));
    expect(tx.workOrderEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'REASSIGN_BACKLOG', reason: 'Điều chuyển lệnh tồn đọng' }) }));
  });

  it('accepts the completed quantity but keeps the aggregate open until the driver reaches the depot', async () => {
    const report: any = { id: 71, dispatchOrderId: 31, workOrderId: 21, originalDriverId: 5, status: DailyReportStatus.SUBMITTED_ON_TIME, quantityToday: 5, workCompleted: true, reportSubmittedAt: new Date() };
    const tx: any = {
      $queryRaw: jest.fn(), operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(baseOrder), update: jest.fn() },
      dailyReport: { findUnique: jest.fn().mockResolvedValue(report), update: jest.fn() }, dispatchOrder: { findUnique: jest.fn().mockResolvedValue({ id: 31, status: DispatchStatus.RETURNING_TO_DEPOT, returnTime: null }), update: jest.fn() },
      workAcceptance: { create: jest.fn() }, driverKpiEvent: { create: jest.fn() }, workOrderEvent: { create: jest.fn() },
      workVehicleAssignment: { findFirst: jest.fn().mockResolvedValue(null) }, workDriverAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new WorkOrdersService(transactional(tx) as never, {} as never);
    await service.acceptDailyReport(21, 31, {}, manager);
    expect(tx.workAcceptance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', reviewedById: manager.id }) }));
    expect(tx.operationalWorkOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: WorkOrderStatus.ACCEPTED, completedQuantity: 10 }) }));
  });

  it('carries 5/10 ha into day two and becomes 8/10 ha only after approving 3 ha', async () => {
    const report: any = { id: 72, dispatchOrderId: 32, workOrderId: 21, originalDriverId: 5, status: DailyReportStatus.SUBMITTED_ON_TIME, quantityToday: 3, workCompleted: false, reportSubmittedAt: new Date() };
    const tx: any = {
      $queryRaw: jest.fn(), operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(baseOrder), update: jest.fn() },
      dailyReport: { findUnique: jest.fn().mockResolvedValue(report), update: jest.fn() }, dispatchOrder: { findUnique: jest.fn().mockResolvedValue({ id: 32, status: DispatchStatus.COMPLETED, returnTime: new Date() }), update: jest.fn() },
      workAcceptance: { create: jest.fn() }, driverKpiEvent: { create: jest.fn() }, workOrderEvent: { create: jest.fn() },
    };
    const service = new WorkOrdersService(transactional(tx) as never, {} as never);
    await service.acceptDailyReport(21, 32, {}, manager);
    expect(tx.operationalWorkOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ completedQuantity: 8 }) }));
  });

  it('rejects approval when another report already consumed the remaining quantity', async () => {
    const report: any = { id: 73, dispatchOrderId: 33, workOrderId: 21, originalDriverId: 5, status: DailyReportStatus.SUBMITTED_ON_TIME, quantityToday: 6, workCompleted: false };
    const tx: any = {
      $queryRaw: jest.fn(), operationalWorkOrder: { findUnique: jest.fn().mockResolvedValue(baseOrder) },
      dailyReport: { findUnique: jest.fn().mockResolvedValue(report) },
      dispatchOrder: { findUnique: jest.fn().mockResolvedValue({ id: 33, status: DispatchStatus.COMPLETED, returnTime: new Date() }) },
    };
    const service = new WorkOrdersService(transactional(tx) as never, {} as never);

    await expect(service.acceptDailyReport(21, 33, {}, manager)).rejects.toThrow('vượt phần còn lại 5');
  });
});
