import { ForbiddenException } from '@nestjs/common';
import { Role, Unit } from '@prisma/client';
import { assertOperationalAccess, hasGlobalOperationalAccess, scopedUnit } from './operational-access';

describe('operational access', () => {
  it('never treats a missing actor as global access', () => {
    expect(hasGlobalOperationalAccess(undefined)).toBe(false);
    expect(() => scopedUnit(undefined, Unit.KOUN_MOM)).toThrow();
    expect(() => assertOperationalAccess(undefined, Unit.KOUN_MOM)).toThrow();
  });
  it('gives the general-manager dispatcher global operational access', () => {
    const actor = { id: 1, role: Role.DISPATCHER, unit: Unit.TOAN_KLH };
    expect(hasGlobalOperationalAccess(actor)).toBe(true);
    expect(scopedUnit(actor, Unit.KOUN_MOM)).toBe(Unit.KOUN_MOM);
  });
  it('forces farm manager to their own unit', () => {
    const actor = { id: 2, role: Role.FARM_MANAGER, unit: Unit.KOUN_MOM };
    expect(scopedUnit(actor)).toBe(Unit.KOUN_MOM);
    expect(() => scopedUnit(actor, Unit.SNOUL)).toThrow(ForbiddenException);
  });
  it('lets a driver access only their assigned order', () => {
    const actor = { id: 7, role: Role.DRIVER, unit: Unit.KOUN_MOM };
    expect(() => assertOperationalAccess(actor, Unit.KOUN_MOM, 7)).not.toThrow();
    expect(() => assertOperationalAccess(actor, Unit.KOUN_MOM, 8)).toThrow(ForbiddenException);
  });
});
