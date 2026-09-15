import { DriverEmploymentStatus, DriverLicenseClass } from '@prisma/client';
import {
  daysUntilExpiry,
  DriverComplianceStatus,
  getDriverComplianceStatus,
  resolveDriverComplianceFields,
} from './driver-compliance';

describe('driver compliance', () => {
  const now = new Date('2026-09-14T02:00:00.000Z');
  const fields = (expiry: string) => ({
    licenseNumber: 'GPLX-001',
    licenseExpiryDate: new Date(expiry),
    healthCheckExpiryDate: new Date('2030-01-01T00:00:00.000Z'),
  });

  it.each([
    ['2026-11-13T00:00:00.000Z', 60, DriverComplianceStatus.EXPIRING_60],
    ['2026-10-14T00:00:00.000Z', 30, DriverComplianceStatus.EXPIRING_30],
    ['2026-09-14T00:00:00.000Z', 0, DriverComplianceStatus.EXPIRING_30],
    ['2026-09-13T00:00:00.000Z', -1, DriverComplianceStatus.EXPIRED],
  ])('classifies %s at the expected boundary', (expiry, remaining, status) => {
    expect(daysUntilExpiry(new Date(expiry), now)).toBe(remaining);
    expect(getDriverComplianceStatus(fields(expiry), now)).toBe(status);
  });

  it('returns missing when any required current credential field is absent', () => {
    expect(getDriverComplianceStatus({ ...fields('2027-01-01T00:00:00.000Z'), licenseNumber: null }, now))
      .toBe(DriverComplianceStatus.MISSING);
  });

  it('prefers DriverProfile values and falls back field-by-field to User', () => {
    const user = {
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      licenseClass: DriverLicenseClass.HANG_B2,
      licenseNumber: 'USER-001',
      licenseExpiryDate: new Date('2028-01-01T00:00:00.000Z'),
      healthCheckExpiryDate: new Date('2028-02-01T00:00:00.000Z'),
    };
    const result = resolveDriverComplianceFields(user, {
      employmentStatus: DriverEmploymentStatus.DA_NGHI_VIEC,
      licenseClass: DriverLicenseClass.HANG_C,
      licenseNumber: 'PROFILE-001',
      licenseExpiryDate: null,
      healthCheckExpiryDate: new Date('2029-02-01T00:00:00.000Z'),
    });
    expect(result).toEqual({
      employmentStatus: DriverEmploymentStatus.DA_NGHI_VIEC,
      licenseClass: DriverLicenseClass.HANG_C,
      licenseNumber: 'PROFILE-001',
      licenseExpiryDate: user.licenseExpiryDate,
      healthCheckExpiryDate: new Date('2029-02-01T00:00:00.000Z'),
    });
  });
});
