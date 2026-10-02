import {
  DriverManagementLevel,
  DriverManagementUnitStatus,
  ManagementUnitManagerType,
  Role,
  Unit,
} from '@prisma/client';
import { DriverManagementService } from './driver-management.service';

const actor = { id: 1, role: Role.SUPER_ADMIN, unit: Unit.KOUN_MOM };

describe('DriverManagementService', () => {
  it('lets an admin load all active TEAM units for dispatch', async () => {
    const prisma: any = {
      driverManagementUnit: { findMany: jest.fn().mockResolvedValue([]) },
      vehicle: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    await new DriverManagementService(prisma).findUnits({
      level: DriverManagementLevel.TEAM,
      status: DriverManagementUnitStatus.ACTIVE,
    }, actor);

    expect(prisma.driverManagementUnit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        level: DriverManagementLevel.TEAM,
        status: DriverManagementUnitStatus.ACTIVE,
      }),
    }));
  });

  it('limits a team leader to the active TEAM unit assigned in mechanical management', async () => {
    const manager = { id: 7, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM };
    const prisma: any = {
      driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([{
        managementUnitId: 20,
        complexCode: 'KOUN_MOM',
        isManagerProjection: true,
      }]) },
      managementUnitManagerAssignment: { findMany: jest.fn().mockResolvedValue([{ managementUnitId: 20 }]) },
      driverManagementUnit: { findMany: jest.fn().mockResolvedValue([]) },
      vehicle: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    await new DriverManagementService(prisma).findUnits({
      level: DriverManagementLevel.TEAM,
      status: DriverManagementUnitStatus.ACTIVE,
    }, manager);

    expect(prisma.driverManagementUnit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        complexCode: 'KOUN_MOM',
        level: DriverManagementLevel.TEAM,
        status: DriverManagementUnitStatus.ACTIVE,
        OR: [{ complexCode: 'KOUN_MOM', OR: [{ id: 20 }, { parentId: 20 }] }],
      }),
    }));
  });

  it('returns current manager and OWNER aggregates including child teams', async () => {
    const prisma: any = {
      driverManagementUnit: {
        findMany: jest.fn().mockResolvedValue([{
          id: 10,
          level: DriverManagementLevel.OWNER,
          managerAssignments: [{ id: 50, manager: { id: 7, fullName: 'Quản lý thật' } }],
          children: [
            { _count: { vehicles: 3, implements: 1, workOrders: 2, teamAssignments: 4 } },
            { _count: { vehicles: 2, implements: 2, workOrders: 3, teamAssignments: 5 } },
          ],
          _count: { children: 2, vehicles: 1, implements: 1, workOrders: 1, ownerAssignments: 1, teamAssignments: 0 },
        }]),
      },
      vehicle: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    const result = await new DriverManagementService(prisma).findUnits({}, actor);

    expect(result[0]).toMatchObject({
      currentManager: { id: 50 },
      teamCount: 2,
      vehicleCount: 6,
      implementCount: 4,
      workOrderCount: 6,
      driverCount: 10,
    });
  });

  it('assigns a real FARM_MANAGER directly to a TEAM', async () => {
    const assignment = { id: 99, managementUnitId: 20, managerUserId: 7 };
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      driverManagementUnit: { findUnique: jest.fn().mockResolvedValue({ id: 20, level: DriverManagementLevel.TEAM, status: DriverManagementUnitStatus.ACTIVE, complexCode: 'KOUN_MOM' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 7, role: Role.FARM_MANAGER, isActive: true }) },
      catalogItem: { findUnique: jest.fn() },
      managementUnitManagerAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(assignment),
      },
      driverManagementAccessScope: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
      operationalAuditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };

    const result = await new DriverManagementService(prisma).createManagerAssignment({
      managementUnitId: 20,
      managerUserId: 7,
      managerType: ManagementUnitManagerType.PRIMARY,
      effectiveFrom: '2026-09-18T00:00:00.000Z',
    }, actor);

    expect(result).toBe(assignment);
    expect(tx.managementUnitManagerAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ managementUnitId: 20, managerUserId: 7 }),
    }));
  });

  it('lets a TEAM manager assign a driver only to their own team', async () => {
    const manager = { id: 7, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM };
    const owner = { id: 10, level: DriverManagementLevel.OWNER, status: DriverManagementUnitStatus.ACTIVE, complexCode: 'KOUN_MOM' };
    const tx: any = {
      driverManagementAssignment: {
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 1, teamUnitId: 20 }),
      },
    };
    const prisma: any = {
      driverManagementUnit: { findUnique: jest.fn(({ where }) => where.id === 10 ? owner : ({ id: where.id, level: DriverManagementLevel.TEAM, parentId: 10, status: DriverManagementUnitStatus.ACTIVE })) },
      driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([{ managementUnitId: 20, complexCode: 'KOUN_MOM', canAssignDrivers: true, isManagerProjection: false }]) },
      driverProfile: { findUnique: jest.fn().mockResolvedValue({ userId: 9 }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new DriverManagementService(prisma);
    await expect(service.assignDriver({ driverId: 9, managementUnitId: 10, teamUnitId: 20 }, manager)).resolves.toMatchObject({ teamUnitId: 20 });
    await expect(service.assignDriver({ driverId: 9, managementUnitId: 10, teamUnitId: 21 }, manager)).rejects.toThrow();
  });

  it('closes the old assignment before creating its replacement', async () => {
    const previous = {
      id: 50,
      managementUnitId: 20,
      managerUserId: 7,
      managerType: ManagementUnitManagerType.PRIMARY,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      effectiveTo: null,
      reason: null,
      managementUnit: { id: 20, complexCode: 'KOUN_MOM' },
    };
    const replacement = { id: 51, managementUnitId: 20, managerUserId: 8 };
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      managementUnitManagerAssignment: {
        findUnique: jest.fn().mockResolvedValue(previous),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ ...previous, effectiveTo: new Date('2026-09-18T00:00:00.000Z') }),
        create: jest.fn().mockResolvedValue(replacement),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 8, role: Role.FARM_MANAGER, isActive: true }) },
      driverManagementAccessScope: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 2 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      operationalAuditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };

    await new DriverManagementService(prisma).replaceManagerAssignment(50, {
      managementUnitId: 20,
      managerUserId: 8,
      effectiveFrom: '2026-09-18T00:00:00.000Z',
    }, actor);

    expect(tx.managementUnitManagerAssignment.update).toHaveBeenCalledWith({
      where: { id: 50 },
      data: expect.objectContaining({ effectiveTo: new Date('2026-09-18T00:00:00.000Z') }),
    });
    expect(tx.managementUnitManagerAssignment.create).toHaveBeenCalled();
  });
});
