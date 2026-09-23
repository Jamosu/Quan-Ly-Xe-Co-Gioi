import { describe, expect, it } from 'vitest';
import { getEffectiveDriverManager, groupDriversByManagement } from './driverManagementGrouping';

const ownerManager = { id: 10, fullName: 'Quản lý đơn vị' };
const teamManager = { id: 20, fullName: 'Quản lý đội' };

describe('driver management grouping', () => {
  it('ưu tiên quản lý PRIMARY của đội trước quản lý đơn vị', () => {
    expect(getEffectiveDriverManager({
      id: 1,
      employmentStatus: 'DANG_LAM_VIEC',
      management: { manager: teamManager, teamManager, ownerManager },
    })).toEqual(teamManager);
  });

  it('nhóm mỗi lái xe đúng một lần theo đơn vị và quản lý hiệu lực', () => {
    const groups = groupDriversByManagement([
      {
        id: 1,
        employmentStatus: 'DANG_LAM_VIEC',
        currentShiftStatus: 'DANG_VAN_HANH',
        managementUnit: { id: 100, name: 'Xí nghiệp A' },
        teamUnit: { id: 101, name: 'Đội 1' },
        management: { teamManager, ownerManager },
      },
      {
        id: 2,
        employmentStatus: 'DANG_LAM_VIEC',
        currentShiftStatus: 'SAN_SANG',
        managementUnit: { id: 100, name: 'Xí nghiệp A' },
        management: { ownerManager },
      },
      {
        id: 3,
        employmentStatus: 'DA_NGHI_VIEC',
        currentShiftStatus: 'SAN_SANG',
        managementUnit: null,
        management: null,
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ total: 2, operating: 1, ready: 1, inactive: 0 });
    expect(groups[0].managers.map((group) => group.manager?.id)).toEqual([20, 10]);
    expect(groups.flatMap((unit) => unit.managers.flatMap((manager) => manager.drivers))).toHaveLength(3);
    expect(groups[1]).toMatchObject({ unit: null, total: 1, inactive: 1 });
  });
});
