import { EquipmentUsageMode, ImplementCategory, Role, Unit } from '@prisma/client';
import { ImplementsService } from './implements.service';

describe('ImplementsService statistics scope', () => {
  it('uses the same unit/category/usage-mode scope for every KPI', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const service = new ImplementsService({ agriculturalImplement: { count } } as never);

    await service.getStatistics({
      unit: Unit.NAM_LAO,
      category: ImplementCategory.DAN_CAY,
      usageMode: EquipmentUsageMode.ATTACHABLE,
      managementUnitId: 27,
    }, { id: 1, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH });

    expect(count).toHaveBeenCalledTimes(8);
    for (const [argument] of count.mock.calls) {
      expect(argument.where.AND).toEqual(expect.arrayContaining([
        { unit: Unit.NAM_LAO },
        { category: ImplementCategory.DAN_CAY },
        { usageMode: EquipmentUsageMode.ATTACHABLE },
        { managementUnitId: 27 },
      ]));
    }
  });
});
