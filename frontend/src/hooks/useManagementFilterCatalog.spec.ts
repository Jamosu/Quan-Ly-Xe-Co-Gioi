import { describe, expect, it } from 'vitest';
import { DriverManagementUnit } from '../api/driverManagementApi';
import { buildManagementFilterManagers } from './useManagementFilterCatalog';

describe('management filter catalog', () => {
  it('giữ đủ đơn vị và gộp quản lý dùng chung mà không bỏ bản ghi số lượng 0', () => {
    const units = [
      { id: 1, name: 'XN A', currentManager: { manager: { id: 10, fullName: 'Nguyễn Văn A', phone: '0901' } } },
      { id: 2, name: 'XN B', currentManager: { manager: { id: 10, fullName: 'Nguyễn Văn A', phone: '0901' } } },
      { id: 3, name: 'XN C', currentManager: null },
    ] as DriverManagementUnit[];

    expect(units).toHaveLength(3);
    expect(buildManagementFilterManagers(units)).toEqual([{
      id: 10,
      code: undefined,
      name: 'Nguyễn Văn A',
      phone: '0901',
      unitIds: [1, 2],
    }]);
  });
});
