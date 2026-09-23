import { businessCode, normalize, readSourceRows, summarize } from './import-koun-mom-cg-management';

describe('Koun Mom mechanical management workbook', () => {
  it('keeps source rows without a manager unassigned', () => {
    const rows = readSourceRows();
    expect(rows.filter((row) => !row.managerName)).toHaveLength(6);
    expect(rows.find((row) => row.unitName.normalize('NFC').includes('DP4'))?.managerName).toBeUndefined();
    expect(rows.some((row) => normalize(row.unitName) === 'XN CHUOI LP4')).toBe(false);
  });
  it('keeps the approved source controls and deterministic mappings', () => {
    const rows = readSourceRows();
    const summary = summarize(rows);
    expect({
      teams: summary.teams,
      withManager: summary.withManager,
      withoutManager: summary.withoutManager,
      locations: summary.locations,
    }).toEqual({ teams: 27, withManager: 21, withoutManager: 6, locations: 18 });
    expect(summary.blankUnits).toEqual([
      'BAN CG-CK & SXCN',
      'THADICONS A&I',
      'THAGRICONS',
      'XN CHUOI DP4',
      'XN CHUOI LP2',
      'XUONG CO KHI DP',
    ]);
    expect(businessCode('CG-KM', 'XN Chuối DP1')).toBe('CG-KM-XN-CHUOI-DP1');
    expect(normalize('XN Bò AD')).toBe(normalize('XN Bò AD'));
    expect(rows.find((row) => normalize(row.unitName) === normalize('XN Bò AD'))).toMatchObject({
      managerName: 'Trần Văn Nam',
      phone: '0971993540',
      location: 'Lô 28 XN Bò',
    });
  });
});
