import { describe, expect, it } from 'vitest';
import {
  calculateLicenseStats,
  filterLicensesByStatus,
  getDateComplianceStatus,
  matchDriverToUnit,
  type ComplianceStatus,
  type LicenseRecord,
} from './LicenseExpiryPage';

const createMockRecord = (id: number, complianceStatus: ComplianceStatus): LicenseRecord => ({
  id,
  code: `TX-${String(id).padStart(3, '0')}`,
  fullName: `Tài xế ${id}`,
  unit: 'KOUN_MOM',
  employmentStatus: 'ACTIVE',
  isActive: true,
  complianceStatus,
});

const generateDataset = () => {
  const records: LicenseRecord[] = [];
  let idCounter = 1;

  // 74 VALID
  for (let i = 0; i < 74; i++) {
    records.push(createMockRecord(idCounter++, 'VALID'));
  }
  // 3 EXPIRING_60
  for (let i = 0; i < 3; i++) {
    records.push(createMockRecord(idCounter++, 'EXPIRING_60'));
  }
  // 6 EXPIRING_30
  for (let i = 0; i < 6; i++) {
    records.push(createMockRecord(idCounter++, 'EXPIRING_30'));
  }
  // 6 EXPIRED
  for (let i = 0; i < 6; i++) {
    records.push(createMockRecord(idCounter++, 'EXPIRED'));
  }

  return records;
};

describe('LicenseExpiryPage stats and filtering', () => {
  const dataset = generateDataset();

  it('calculates correct KPI stats (89 total, 6 expired, 9 expiring <= 60d, 74 valid)', () => {
    const stats = calculateLicenseStats(dataset);
    expect(stats.total).toBe(89);
    expect(stats.expired).toBe(6);
    expect(stats.expiring).toBe(9); // 3 EXPIRING_60 + 6 EXPIRING_30
    expect(stats.valid).toBe(74);
  });

  it('keeps KPI stats persistent and independent of current filter status', () => {
    const expiredList = filterLicensesByStatus(dataset, 'EXPIRED');
    expect(expiredList.length).toBe(6);

    // Stats computed from full dataset remain 89 / 6 / 9 / 74
    const statsFromFull = calculateLicenseStats(dataset);
    expect(statsFromFull.total).toBe(89);
    expect(statsFromFull.expired).toBe(6);
    expect(statsFromFull.expiring).toBe(9);
    expect(statsFromFull.valid).toBe(74);
  });

  it('filters licenses correctly for each quick filter option', () => {
    expect(filterLicensesByStatus(dataset, 'ALL').length).toBe(89);
    expect(filterLicensesByStatus(dataset, 'EXPIRED').length).toBe(6);
    expect(filterLicensesByStatus(dataset, 'EXPIRING_LE_60').length).toBe(9);
    expect(filterLicensesByStatus(dataset, 'EXPIRING_30').length).toBe(6);
    expect(filterLicensesByStatus(dataset, 'EXPIRING_60').length).toBe(3);
    expect(filterLicensesByStatus(dataset, 'VALID').length).toBe(74);
    expect(filterLicensesByStatus(dataset, 'MISSING').length).toBe(0);
  });

  it('handles card re-click toggle logic (returning to ALL)', () => {
    const toggleStatus = (currentStatus: string, targetStatus: string): string => {
      if (targetStatus === 'ALL') return 'ALL';
      if (targetStatus === 'EXPIRING_LE_60') {
        const isExpiringActive =
          currentStatus === 'EXPIRING_LE_60' ||
          currentStatus === 'EXPIRING_30' ||
          currentStatus === 'EXPIRING_60';
        return isExpiringActive ? 'ALL' : 'EXPIRING_LE_60';
      }
      return currentStatus === targetStatus ? 'ALL' : targetStatus;
    };

    // Selecting EXPIRED from ALL
    expect(toggleStatus('ALL', 'EXPIRED')).toBe('EXPIRED');
    // Clicking EXPIRED again returns to ALL
    expect(toggleStatus('EXPIRED', 'EXPIRED')).toBe('ALL');

    // Selecting EXPIRING_LE_60 from ALL
    expect(toggleStatus('ALL', 'EXPIRING_LE_60')).toBe('EXPIRING_LE_60');
    // Clicking EXPIRING_LE_60 again returns to ALL
    expect(toggleStatus('EXPIRING_LE_60', 'EXPIRING_LE_60')).toBe('ALL');
    // Clicking EXPIRING_LE_60 when dropdown was on sub-filter EXPIRING_30 returns to ALL
    expect(toggleStatus('EXPIRING_30', 'EXPIRING_LE_60')).toBe('ALL');

    // Selecting VALID from ALL
    expect(toggleStatus('ALL', 'VALID')).toBe('VALID');
    // Clicking VALID again returns to ALL
    expect(toggleStatus('VALID', 'VALID')).toBe('ALL');

    // Clicking ALL always returns ALL
    expect(toggleStatus('EXPIRED', 'ALL')).toBe('ALL');
    expect(toggleStatus('ALL', 'ALL')).toBe('ALL');
  });

  it('updates stats and moves driver out of expired/expiring when renewed to VALID', () => {
    // Clone dataset
    const updatedDataset = dataset.map((item) => ({ ...item }));
    // Find an expired driver and renew to VALID
    const expiredIdx = updatedDataset.findIndex((d) => d.complianceStatus === 'EXPIRED');
    expect(expiredIdx).toBeGreaterThanOrEqual(0);
    updatedDataset[expiredIdx].complianceStatus = 'VALID';

    const newStats = calculateLicenseStats(updatedDataset);
    expect(newStats.total).toBe(89);
    expect(newStats.expired).toBe(5); // reduced from 6 to 5
    expect(newStats.expiring).toBe(9);
    expect(newStats.valid).toBe(75); // increased from 74 to 75

    // In filtered view of EXPIRED, the driver is no longer present
    const newExpiredList = filterLicensesByStatus(updatedDataset, 'EXPIRED');
    expect(newExpiredList.length).toBe(5);
    expect(newExpiredList.some((d) => d.id === updatedDataset[expiredIdx].id)).toBe(false);
  });

  it('matches drivers to verified management units and team units correctly', () => {
    const driverSample1: LicenseRecord = {
      id: 1,
      code: 'TX-001',
      fullName: 'Nguyễn Văn Minh',
      unit: 'KOUN_MOM',
      employmentStatus: 'ACTIVE',
      isActive: true,
      complianceStatus: 'VALID',
      managementUnit: {
        id: 101,
        complexCode: 'KOUN_MOM',
        code: 'XN_CHUOI_DP1',
        name: 'Xí nghiệp Chuối DP1',
        level: 'OWNER',
        unitType: 'XI_NGHIEP',
        status: 'ACTIVE',
      },
      teamUnit: {
        id: 201,
        complexCode: 'KOUN_MOM',
        code: 'DOI_01',
        name: 'Đội 01',
        level: 'TEAM',
        unitType: 'DOI',
        parentId: 101,
        status: 'ACTIVE',
      },
      managementAssignment: {
        managementUnitId: 101,
        teamUnitId: 201,
      },
      assignedVehicle: { id: 10, code: 'XE-01', name: 'Xe 01' },
    };

    const driverUnclassified: LicenseRecord = {
      id: 2,
      code: 'TX-002',
      fullName: 'Trần Văn Nam',
      unit: 'KOUN_MOM',
      employmentStatus: 'ACTIVE',
      isActive: true,
      complianceStatus: 'VALID',
      assignedVehicle: { id: 20, code: 'XE-02', name: 'Xe 02' },
      employee: { complex: 'KOUN_MOM', enterprise: 'XN Bò AD', team: 'Tổ 1' },
    };

    // ALL returns true
    expect(matchDriverToUnit(driverSample1, 'ALL')).toBe(true);
    expect(matchDriverToUnit(driverUnclassified, 'ALL')).toBe(true);

    // ID matching for Owner and Team
    expect(matchDriverToUnit(driverSample1, '101')).toBe(true);
    expect(matchDriverToUnit(driverSample1, '101', '201')).toBe(true);
    expect(matchDriverToUnit(driverSample1, '101', '999')).toBe(false);

    // Code and name matching
    expect(matchDriverToUnit(driverSample1, 'XN_CHUOI_DP1')).toBe(true);
    expect(matchDriverToUnit(driverSample1, 'Xí nghiệp Chuối DP1')).toBe(true);
    expect(matchDriverToUnit(driverSample1, 'Xí nghiệp Chuối DP1', 'Đội 01')).toBe(true);

    // Unverified driver is not matched via vehicle or employee string
    expect(matchDriverToUnit(driverUnclassified, '101')).toBe(false);
    expect(matchDriverToUnit(driverUnclassified, 'XN Bò AD')).toBe(false);
    expect(matchDriverToUnit(driverSample1, 'Trạm trộn bê tông')).toBe(false);
  });

  it('determines individual date compliance status accurately', () => {
    expect(getDateComplianceStatus(null)).toBe('MISSING');
    expect(getDateComplianceStatus('')).toBe('MISSING');

    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const pastDate = new Date(now.getTime() - 5 * 86_400_000);
    expect(getDateComplianceStatus(fmt(pastDate))).toBe('EXPIRED');

    const exp15 = new Date(now.getTime() + 15 * 86_400_000);
    expect(getDateComplianceStatus(fmt(exp15))).toBe('EXPIRING_30');

    const exp45 = new Date(now.getTime() + 45 * 86_400_000);
    expect(getDateComplianceStatus(fmt(exp45))).toBe('EXPIRING_60');

    const exp120 = new Date(now.getTime() + 120 * 86_400_000);
    expect(getDateComplianceStatus(fmt(exp120))).toBe('VALID');
  });
});
