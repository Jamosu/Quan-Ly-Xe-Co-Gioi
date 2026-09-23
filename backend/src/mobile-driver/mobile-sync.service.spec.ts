import { MobileSyncEventStatus } from '@prisma/client';
import { MobileSyncService } from './mobile-sync.service';

describe('MobileSyncService', () => {
  it('reserves an event before executing it and publishes only after processing', async () => {
    const prisma = {
      mobileSyncEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const realtime = { publish: jest.fn() };
    const service = new MobileSyncService(prisma as any, {} as any, {} as any, realtime as any);
    (service as any).loadOwnedOrder = jest.fn().mockResolvedValue({ id: 8, driverId: 3, status: 'ASSIGNED', version: 1, workOrderId: 20, unit: 'KOUN_MOM' });
    (service as any).runCommand = jest.fn().mockResolvedValue({ status: 'DRIVER_ACCEPTED' });

    await (service as any).processOne(3, 'device-1', {
      eventId: '4d942d57-d6ad-4f66-a7d5-1d9385109215', eventType: 'ORDER_ACCEPTED', orderType: 'DISPATCH',
      orderId: 8, sequenceNumber: 1, occurredAt: '2026-09-17T10:00:00.000Z', baseVersion: 1, payload: {},
    });

    expect(prisma.mobileSyncEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: MobileSyncEventStatus.PROCESSING }) }));
    expect(prisma.mobileSyncEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: MobileSyncEventStatus.PROCESSED }) }));
    expect(realtime.publish).toHaveBeenCalledWith(expect.objectContaining({ entityId: 8, unit: 'KOUN_MOM' }));
  });

  it('maps legacy JOB_COMPLETED to end-of-day without completing the order', async () => {
    const workOrders = {
      endWorkSession: jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
    };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 3, role: 'DRIVER', unit: 'KOUN_MOM' }) } };
    const service = new MobileSyncService(prisma as any, {} as any, workOrders as any, { publish: jest.fn() } as any);
    const result = await (service as any).runCommand(3, 'device-1', {
      eventType: 'JOB_COMPLETED',
      payload: { finishOdoKm: 12510 },
    }, { id: 8, driverId: 3, status: 'WORKING', version: 4, workOrderId: 20, unit: 'KOUN_MOM' });

    expect(workOrders.endWorkSession).toHaveBeenCalledWith(20, expect.objectContaining({
      endOdoKm: 12510,
      confirmNoProgress: true,
    }), expect.objectContaining({ id: 3 }));
    expect(result).toEqual({ status: 'IN_PROGRESS' });
  });

  it('does not execute a retried eventId twice', async () => {
    const prisma = {
      mobileSyncEvent: {
        findUnique: jest.fn().mockResolvedValue({ status: MobileSyncEventStatus.PROCESSED, result: { ok: true }, createdAt: new Date() }),
      },
    };
    const service = new MobileSyncService(prisma as any, {} as any, {} as any, { publish: jest.fn() } as any);
    (service as any).runCommand = jest.fn();

    const result = await (service as any).processOne(3, 'device-1', {
      eventId: '4d942d57-d6ad-4f66-a7d5-1d9385109215', eventType: 'WORK_SESSION_ENDED', orderType: 'DISPATCH',
      orderId: 8, sequenceNumber: 2, occurredAt: '2026-09-17T11:00:00.000Z', baseVersion: 4, payload: {},
    });

    expect(result.status).toBe('ALREADY_PROCESSED');
    expect((service as any).runCommand).not.toHaveBeenCalled();
  });

  it('rebases sequential offline events inside the same push batch', async () => {
    const prisma = {
      mobileSyncEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new MobileSyncService(prisma as any, {} as any, {} as any, { publish: jest.fn() } as any);
    (service as any).loadOwnedOrder = jest.fn().mockResolvedValue({ id: 8, driverId: 3, status: 'IN_PROGRESS', version: 5, workOrderId: 20, unit: 'KOUN_MOM' });
    (service as any).runCommand = jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' });

    const result = await (service as any).processOne(3, 'device-1', {
      eventId: 'bd715ae1-28d4-4a1d-81f0-01b28ea42216', eventType: 'WORK_SESSION_ENDED', orderType: 'DISPATCH',
      orderId: 8, sequenceNumber: 3, occurredAt: '2026-09-17T12:00:00.000Z', baseVersion: 4, payload: {},
    }, 5);

    expect(result.status).toBe('PROCESSED');
    expect((service as any).runCommand).toHaveBeenCalled();
  });
});
