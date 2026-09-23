import { ForbiddenException } from '@nestjs/common';
import { DriverManagementLevel, DriverManagementUnitStatus, Role, Unit } from '@prisma/client';
import { assertManagementUnitAccess, resourceManagementUnitIds, scopedManagementUnitIds } from './management-scope';

const actor = { id: 7, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM };
const unit = {
  id: 12,
  complexCode: 'KOUN_MOM',
  level: DriverManagementLevel.OWNER,
  status: DriverManagementUnitStatus.ACTIVE,
};

function db(scope: { managementUnitId: number | null; complexCode: string; isManagerProjection: boolean }, active = false) {
  return {
    driverManagementUnit: {
      findUnique: jest.fn().mockResolvedValue(unit),
      findMany: jest.fn().mockResolvedValue([{ id: unit.id }]),
    },
    driverManagementAccessScope: { findMany: jest.fn().mockResolvedValue([scope]) },
    managementUnitManagerAssignment: {
      findFirst: jest.fn().mockResolvedValue(active ? { id: 99 } : null),
      findMany: jest.fn().mockResolvedValue(active ? [{ managementUnitId: unit.id }] : []),
    },
  } as any;
}

describe('management-unit scope', () => {
  it('does not activate a projected scope before its manager assignment starts', async () => {
    const prisma = db({ managementUnitId: unit.id, complexCode: unit.complexCode, isManagerProjection: true });
    await expect(assertManagementUnitAccess(prisma, actor, unit.id)).rejects.toThrow(ForbiddenException);
    await expect(scopedManagementUnitIds(prisma, actor)).resolves.toEqual([]);
  });

  it('accepts a projected scope while its manager assignment is active', async () => {
    const prisma = db({ managementUnitId: unit.id, complexCode: unit.complexCode, isManagerProjection: true }, true);
    await expect(assertManagementUnitAccess(prisma, actor, unit.id)).resolves.toEqual(unit);
    await expect(scopedManagementUnitIds(prisma, actor)).resolves.toEqual([unit.id]);
  });

  it('keeps an independently granted scope without a manager assignment', async () => {
    const prisma = db({ managementUnitId: unit.id, complexCode: unit.complexCode, isManagerProjection: false });
    await expect(assertManagementUnitAccess(prisma, actor, unit.id)).resolves.toEqual(unit);
    await expect(scopedManagementUnitIds(prisma, actor)).resolves.toEqual([unit.id]);
  });

  it('includes active child teams when loading resources for an owner area', async () => {
    const prisma = db({ managementUnitId: unit.id, complexCode: unit.complexCode, isManagerProjection: false });
    prisma.driverManagementUnit.findMany.mockResolvedValue([{ id: unit.id }, { id: 21 }, { id: 22 }]);

    await expect(resourceManagementUnitIds(prisma, unit.id)).resolves.toEqual([unit.id, 21, 22]);
    expect(prisma.driverManagementUnit.findMany).toHaveBeenCalledWith({
      where: {
        status: DriverManagementUnitStatus.ACTIVE,
        OR: [{ id: unit.id }, { parentId: unit.id }],
      },
      select: { id: true },
    });
  });
});
