import { ForbiddenException } from '@nestjs/common';
import { Role, Unit } from '@prisma/client';
import { assertOperationalAccess, hasGlobalOperationalAccess, scopedUnit } from './operational-access';

describe('operational access', () => {
  it('allows Ban Cơ giới dispatcher to view all units', () => {
    const actor = { id: 1, role: Role.DISPATCHER, unit: Unit.BAN_CO_GIOI };
    expect(hasGlobalOperationalAccess(actor)).toBe(true);
    expect(scopedUnit(actor, Unit.NT2)).toBe(Unit.NT2);
  });
  it('forces farm manager to their own unit', () => {
    const actor = { id: 2, role: Role.FARM_MANAGER, unit: Unit.NT1 };
    expect(scopedUnit(actor)).toBe(Unit.NT1);
    expect(() => scopedUnit(actor, Unit.NT2)).toThrow(ForbiddenException);
  });
  it('lets a driver access only their assigned order', () => {
    const actor = { id: 7, role: Role.DRIVER, unit: Unit.NT1 };
    expect(() => assertOperationalAccess(actor, Unit.NT2, 7)).not.toThrow();
    expect(() => assertOperationalAccess(actor, Unit.NT1, 8)).toThrow(ForbiddenException);
  });
});
