import { resolveManagementTeam } from './management-unit-resolution';

const teams = [
  { id: 1, code: 'CG-KM-XN-CHUOI-DP1', name: 'XN Chuối DP1', parentId: 10 },
  { id: 2, code: 'CG-KM-PHONG-GNVC', name: 'Phòng GNVC', parentId: 11 },
  { id: 3, code: 'CG-KM-XOAI-DP', name: 'Xoài DP', parentId: 10 },
  { id: 4, code: 'CG-KM-XOAI-AD', name: 'Xoài AD', parentId: 12 },
  { id: 5, code: 'CG-KM-XN-BO-AD', name: 'XN Bò AD', parentId: 12 },
];

describe('management unit resolution', () => {
  it('matches canonical names and approved aliases', () => {
    expect(resolveManagementTeam('XN Chuối DP1', teams)).toMatchObject({ kind: 'MATCHED', method: 'EXACT', team: { id: 1 } });
    expect(resolveManagementTeam('XN DP1', teams)).toMatchObject({ kind: 'MATCHED', method: 'ALIAS', team: { id: 1 } });
    expect(resolveManagementTeam('GNVC', teams)).toMatchObject({ kind: 'MATCHED', method: 'ALIAS', team: { id: 2 } });
    expect(resolveManagementTeam('CAT DP', teams)).toMatchObject({ kind: 'MATCHED', method: 'ALIAS', team: { id: 3 } });
    expect(resolveManagementTeam('NT XOÀI AD', teams)).toMatchObject({ kind: 'MATCHED', method: 'ALIAS', team: { id: 4 } });
    expect(resolveManagementTeam('XNB', teams)).toMatchObject({ kind: 'MATCHED', method: 'ALIAS', team: { id: 5 } });
  });

  it('keeps blank, LP4 and ambiguous AD labels unassigned', () => {
    expect(resolveManagementTeam('', teams)).toMatchObject({ kind: 'UNRESOLVED', reason: 'BLANK' });
    expect(resolveManagementTeam('XN LP4', teams)).toMatchObject({ kind: 'UNRESOLVED', reason: 'EXCLUDED' });
    expect(resolveManagementTeam('CAT AD', teams)).toMatchObject({ kind: 'UNRESOLVED', reason: 'EXCLUDED' });
  });

  it('treats Loại biên and Thanh lý as liquidation, not management units', () => {
    expect(resolveManagementTeam('Loại biên', teams)).toEqual({ kind: 'LIQUIDATED', source: 'Loại biên' });
    expect(resolveManagementTeam('Thanh lý', teams)).toEqual({ kind: 'LIQUIDATED', source: 'Thanh lý' });
  });
});
