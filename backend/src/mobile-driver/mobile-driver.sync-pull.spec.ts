import { MobileDriverService } from './mobile-driver.service';

describe('MobileDriverService syncPull', () => {
  it('pulls a dispatch again when a manager changed its daily report', async () => {
    const dispatchOrder = { findMany: jest.fn().mockResolvedValue([]) };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 5 }) },
      dispatchOrder,
      transportOrder: { findMany: jest.fn().mockResolvedValue([]) },
      internalFeedTrip: { findMany: jest.fn().mockResolvedValue([]) },
      vehicle: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new MobileDriverService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    jest.spyOn(service, 'getMyKpi').mockResolvedValue(null);
    jest.spyOn(service, 'getDriverAlerts').mockResolvedValue([]);

    const since = '2026-09-17T10:00:00.000Z';
    await service.syncPull(5, since);

    expect(dispatchOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        driverId: 5,
        OR: [
          { updatedAt: { gte: new Date(since) } },
          { dailyReport: { is: { updatedAt: { gte: new Date(since) } } } },
        ],
      }),
      include: expect.objectContaining({
        dailyReport: { include: { submittedBy: { select: { id: true, fullName: true } } } },
      }),
    }));
  });
});
