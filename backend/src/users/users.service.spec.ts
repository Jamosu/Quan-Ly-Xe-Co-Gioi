import { ForbiddenException } from '@nestjs/common';
import { Role, Unit } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService driver profile access', () => {
  const prisma = {
    user: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    employeeRecord: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
  const service = new UsersService(prisma, { getPresence: jest.fn() } as any);

  beforeEach(() => jest.clearAllMocks());

  it('limits a unit manager list to their own unit', async () => {
    await service.findDriverProfiles({}, { id: 2, role: Role.FARM_MANAGER, unit: Unit.NT1 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: Role.DRIVER, unit: Unit.NT1 },
    }));
  });

  it('rejects a cross-unit list request', async () => {
    await expect(service.findDriverProfiles(
      { unit: Unit.NT2 },
      { id: 2, role: Role.FARM_MANAGER, unit: Unit.NT1 },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects profile updates from roles outside the approved editors', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 9, unit: Unit.NT1, username: 'driver9' });
    await expect(service.updateDriverProfile(
      9,
      { licenseNumber: 'NEW-001' },
      { id: 3, role: Role.DISPATCHER, unit: Unit.NT1 },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a farm manager updating another unit', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 9, unit: Unit.NT2, username: 'driver9' });
    await expect(service.updateDriverProfile(
      9,
      { licenseNumber: 'NEW-001' },
      { id: 2, role: Role.FARM_MANAGER, unit: Unit.NT1 },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });
});
