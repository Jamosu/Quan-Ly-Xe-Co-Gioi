import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService schedule', () => {
  it('returns synchronized occurrences and meaningful legacy meters without refreshing every vehicle', async () => {
    const occurrences = [{ id: 1 }];
    const legacy = [{ id: 2, hoursSinceLastService: 125 }];
    const prisma = {
      maintenanceOccurrence: { findMany: jest.fn().mockResolvedValue(occurrences) },
      vehicle: { findMany: jest.fn().mockResolvedValue(legacy) },
    };
    const service = new MaintenanceService(prisma as any, {} as any, {} as any);
    const refresh = jest.spyOn(service, 'refreshVehicleOccurrences');

    await expect(service.getUpcomingSchedule()).resolves.toEqual({ occurrences, legacy });
    expect(refresh).not.toHaveBeenCalled();
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ hoursSinceLastService: { gt: 0 } }),
    }));
  });
});

