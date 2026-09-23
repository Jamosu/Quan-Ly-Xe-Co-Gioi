import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DriverManagementUnitStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationalActor } from './operational-access';

type Db = PrismaService | Prisma.TransactionClient;

export async function assertManagementUnitAccess(db: Db, actor: OperationalActor, managementUnitId: number) {
  const unit = await db.driverManagementUnit.findUnique({ where: { id: managementUnitId } });
  if (!unit || unit.status !== DriverManagementUnitStatus.ACTIVE) {
    throw new NotFoundException('Không tìm thấy khu vực quản lý đang hoạt động.');
  }
  if (actor.role === Role.SUPER_ADMIN || actor.role === Role.DISPATCHER) return unit;
  if (actor.role === Role.FARM_MANAGER) {
    const scopes = await db.driverManagementAccessScope.findMany({
      where: { userId: actor.id, complexCode: unit.complexCode, OR: [{ managementUnitId }, { managementUnitId: null }] },
    });
    const manualScope = scopes.some((scope) => !scope.isManagerProjection);
    const projectedScope = scopes.some((scope) => scope.isManagerProjection && scope.managementUnitId === managementUnitId);
    if (manualScope) return unit;
    if (projectedScope) {
      const now = new Date();
      const activeAssignment = await db.managementUnitManagerAssignment.findFirst({ where: { managerUserId: actor.id, managementUnitId, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, select: { id: true } });
      if (activeAssignment) return unit;
    }
  } else if (actor.unit === unit.complexCode) {
    return unit;
  }
  throw new ForbiddenException('Khu vực nằm ngoài phạm vi quản lý được cấp.');
}

export async function resourceManagementUnitIds(db: Db, managementUnitId: number): Promise<number[]> {
  const units = await db.driverManagementUnit.findMany({
    where: {
      status: DriverManagementUnitStatus.ACTIVE,
      OR: [{ id: managementUnitId }, { parentId: managementUnitId }],
    },
    select: { id: true },
  });
  return units.map((unit) => unit.id);
}

export async function scopedManagementUnitIds(db: Db, actor: OperationalActor): Promise<number[] | null> {
  if (actor.role === Role.SUPER_ADMIN || actor.role === Role.DISPATCHER) return null;
  if (actor.role === Role.FARM_MANAGER) {
    const scopes = await db.driverManagementAccessScope.findMany({ where: { userId: actor.id }, select: { managementUnitId: true, complexCode: true, isManagerProjection: true } });
    const projectedIds = scopes.filter((scope) => scope.isManagerProjection && scope.managementUnitId).map((scope) => scope.managementUnitId!);
    const now = new Date();
    const activeProjected = projectedIds.length ? await db.managementUnitManagerAssignment.findMany({
      where: { managerUserId: actor.id, managementUnitId: { in: projectedIds }, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      select: { managementUnitId: true },
    }) : [];
    const activeProjectedIds = new Set(activeProjected.map((item) => item.managementUnitId));
    const effectiveScopes = scopes.filter((scope) => !scope.isManagerProjection || (scope.managementUnitId && activeProjectedIds.has(scope.managementUnitId)));
    const explicit = effectiveScopes.flatMap((scope) => scope.managementUnitId ? [scope.managementUnitId] : []);
    const broadComplexes = effectiveScopes.filter((scope) => !scope.managementUnitId).map((scope) => scope.complexCode);
    const explicitWithChildren = explicit.length ? await db.driverManagementUnit.findMany({
      where: { status: DriverManagementUnitStatus.ACTIVE, OR: [{ id: { in: explicit } }, { parentId: { in: explicit } }] },
      select: { id: true },
    }) : [];
    if (!broadComplexes.length) return [...new Set(explicitWithChildren.map((unit) => unit.id))];
    const units = await db.driverManagementUnit.findMany({
      where: { complexCode: { in: broadComplexes }, status: DriverManagementUnitStatus.ACTIVE },
      select: { id: true },
    });
    return [...new Set([...explicitWithChildren.map((unit) => unit.id), ...units.map((unit) => unit.id)])];
  }
  const units = await db.driverManagementUnit.findMany({
    where: { complexCode: actor.unit, status: DriverManagementUnitStatus.ACTIVE },
    select: { id: true },
  });
  return units.map((unit) => unit.id);
}
