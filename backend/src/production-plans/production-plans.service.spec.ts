import { ProductionPlansService } from './production-plans.service';
import { DispatchStatus, PlanType, Unit } from '@prisma/client';

describe('ProductionPlansService plan-to-order expansion', () => {
  const service = new ProductionPlansService({} as never);

  it('expands an inclusive Vietnamese weekday range', () => {
    const dates = (service as any).scheduledDates(
      new Date('2026-09-07T00:00:00.000Z'),
      new Date('2026-09-07T00:00:00.000Z'),
      'Thứ 4 - Chủ Nhật',
    ) as Date[];
    expect(dates).toHaveLength(5);
    expect(dates.map((date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)).toEqual([
      '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13',
    ]);
  });

  it('produces the expected 13 daily vehicle slots for the current approved plan', () => {
    const start = new Date('2026-09-07T00:00:00.000Z');
    const total = ['Thứ 4 - Chủ Nhật', 'Thứ 4 - Thứ 7', 'Thứ 4 - Thứ 7']
      .reduce((sum, range) => sum + (service as any).scheduledDates(start, start, range).length, 0);
    expect(total).toBe(13);
  });

  it('creates one unique order per item, vehicle and scheduled day', async () => {
    const created: Array<{ data: { generationKey: string } }> = [];
    const tx: any = {
      productionPlan: { findUnique: jest.fn().mockResolvedValue({
        id: 7, unit: Unit.KOUN_MOM, planType: PlanType.AGRICULTURE,
        lotPlot: 'A01', enterpriseName: 'NT1', farmName: 'Farm',
        startDate: new Date('2026-09-07T00:00:00.000Z'), endDate: new Date('2026-09-13T00:00:00.000Z'),
        items: [{ id: 11, jobName: 'Cày đất', jobCode: 'CD', plotName: 'A01', location: null,
          workDate: new Date('2026-09-07T00:00:00.000Z'), scheduledDays: 'Thứ 2 - Thứ 3',
          plannedVehicleCount: 2, notes: null, origin: null, destination: null, targetUnit: 'ha', targetQuantity: 10 }],
        productionOrders: [],
      }) },
      productionOrder: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 20 }) },
      dispatchOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (value) => { created.push(value); return { id: created.length }; }),
      },
      operationalWorkOrder: { upsert: jest.fn().mockResolvedValue({}) },
      productionPlanItem: { update: jest.fn().mockResolvedValue({}) },
    };

    const result = await (service as any).reconcileGeneratedOrders(tx, 7, { id: 99 });

    expect(result).toMatchObject({ createdCount: 4, updatedCount: 0, cancelledCount: 0 });
    expect(new Set(created.map((entry) => entry.data.generationKey)).size).toBe(4);
    expect(tx.operationalWorkOrder.upsert).toHaveBeenCalledTimes(4);
  });

  it('cancels obsolete not-started orders but retains started orders with a warning', async () => {
    const tx: any = {
      productionPlan: { findUnique: jest.fn().mockResolvedValue({
        id: 8, unit: Unit.KOUN_MOM, planType: PlanType.CONSTRUCTION, lotPlot: 'CT',
        startDate: new Date(), endDate: new Date(), items: [],
        productionOrders: [{ dispatchOrders: [
          { id: 1, code: 'WAITING', generationKey: 'old-1', status: DispatchStatus.PENDING_APPROVAL, operationalWorkOrder: null, vehicleId: null, driverId: null },
          { id: 2, code: 'STARTED', generationKey: 'old-2', status: DispatchStatus.DEPARTED, operationalWorkOrder: null, vehicleId: null, driverId: null },
        ], transportOrders: [] }],
      }) },
      dispatchOrder: { update: jest.fn().mockResolvedValue({}) },
      operationalAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    const result = await (service as any).reconcileGeneratedOrders(tx, 8, { id: 99 });

    expect(result.cancelledCount).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(tx.dispatchOrder.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
    expect(tx.dispatchOrder.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 } }));
    expect(tx.operationalAuditLog.create).toHaveBeenCalledTimes(1);
  });
});
