import { ForbiddenException } from '@nestjs/common';
import { Role, Unit } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService driver profile access', () => {
  const prisma = {
    user: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), count: jest.fn().mockResolvedValue(1) },
    employeeRecord: { findMany: jest.fn().mockResolvedValue([]) },
    driverManagementUnit: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
    driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([]) },
    managementUnitManagerAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  } as any;
  const service = new UsersService(prisma, { getPresence: jest.fn() } as any);

  beforeEach(() => jest.clearAllMocks());

  it('limits a unit manager list to their assigned OWNER scope', async () => {
    prisma.driverManagementAccessScope.findMany.mockResolvedValueOnce([
      { managementUnitId: 1, complexCode: 'KOUN_MOM', isManagerProjection: false },
    ]);
    await service.findDriverProfiles({}, { id: 2, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM });
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toBe(Role.DRIVER);
    expect(where.driverProfile.is.OR).toEqual(expect.arrayContaining([
      { vehicleAssignments: { some: { status: 'ACTIVE', vehicle: { managementUnitId: { in: [1] } } } } },
    ]));
  });

  it('rejects a cross-unit list request', async () => {
    await expect(service.findDriverProfiles(
      { unit: Unit.SNOUL },
      { id: 2, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects profile updates from roles outside the approved editors', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 9, unit: Unit.KOUN_MOM, username: 'driver9' });
    await expect(service.updateDriverProfile(
      9,
      { licenseNumber: 'NEW-001' },
      { id: 3, role: Role.DISPATCHER, unit: Unit.KOUN_MOM },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a farm manager to update a driver in their own unit', async () => {
    const tx = {
      user: {
        update: jest.fn().mockResolvedValue({
          id: 9,
          fullName: 'Driver 9',
          employmentStatus: 'DANG_LAM_VIEC',
        }),
      },
      employeeRecord: { upsert: jest.fn() },
      driverProfile: { upsert: jest.fn() },
    };
    prisma.user.findFirst.mockResolvedValue({
      id: 9,
      code: 'TX-009',
      username: 'driver9',
      unit: Unit.KOUN_MOM,
      driverProfile: null,
    });
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));
    jest.spyOn(service, 'findDriverProfile').mockResolvedValue({
      id: 9,
      licenseNumber: 'NEW-001',
    } as any);

    await expect(service.updateDriverProfile(
      9,
      { licenseNumber: 'NEW-001' },
      { id: 2, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM },
    )).resolves.toMatchObject({ id: 9, licenseNumber: 'NEW-001' });

    expect(tx.user.update).toHaveBeenCalled();
    expect(tx.employeeRecord.upsert).toHaveBeenCalled();
    expect(tx.driverProfile.upsert).toHaveBeenCalled();
  });

  it('rejects a farm manager updating another unit', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 9, unit: Unit.SNOUL, username: 'driver9' });
    await expect(service.updateDriverProfile(
      9,
      { licenseNumber: 'NEW-001' },
      { id: 2, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a driver outside the manager scope even in the same complex', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 9, unit: Unit.KOUN_MOM, username: 'driver9' });
    prisma.user.count.mockResolvedValueOnce(0);
    await expect(service.updateDriverProfile(
      9,
      { licenseNumber: 'NEW-001' },
      { id: 2, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });
});
