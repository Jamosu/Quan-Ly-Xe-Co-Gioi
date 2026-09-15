import { DriverEmploymentStatus, DriverLicenseClass } from '@prisma/client';

export enum DriverComplianceStatus {
  MISSING = 'MISSING',
  EXPIRED = 'EXPIRED',
  EXPIRING_30 = 'EXPIRING_30',
  EXPIRING_60 = 'EXPIRING_60',
  VALID = 'VALID',
}

interface ComplianceSource {
  employmentStatus?: DriverEmploymentStatus | null;
  licenseClass?: DriverLicenseClass | null;
  licenseNumber?: string | null;
  licenseExpiryDate?: Date | null;
  healthCheckExpiryDate?: Date | null;
}

export const resolveDriverComplianceFields = (user: ComplianceSource, profile?: ComplianceSource | null) => ({
  employmentStatus: profile?.employmentStatus ?? user.employmentStatus,
  licenseClass: profile?.licenseClass ?? user.licenseClass,
  licenseNumber: profile?.licenseNumber ?? user.licenseNumber,
  licenseExpiryDate: profile?.licenseExpiryDate ?? user.licenseExpiryDate,
  healthCheckExpiryDate: profile?.healthCheckExpiryDate ?? user.healthCheckExpiryDate,
});

const dateKeyInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day));
};

export const daysUntilExpiry = (
  expiryDate: Date,
  now = new Date(),
  timeZone = 'Asia/Phnom_Penh',
) => {
  // Expiry fields are business dates stored at UTC midnight. Read their UTC date
  // components so an expiry occurring "today" is consistently day 0 in KLH time.
  const expiryDay = Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate());
  const currentDay = dateKeyInTimeZone(now, timeZone);
  return Math.round((expiryDay - currentDay) / 86_400_000);
};

export const getDriverComplianceStatus = (
  fields: Pick<ComplianceSource, 'licenseNumber' | 'licenseExpiryDate' | 'healthCheckExpiryDate'>,
  now = new Date(),
): DriverComplianceStatus => {
  if (!fields.licenseNumber || !fields.licenseExpiryDate || !fields.healthCheckExpiryDate) {
    return DriverComplianceStatus.MISSING;
  }
  const remainingDays = Math.min(
    daysUntilExpiry(fields.licenseExpiryDate, now),
    daysUntilExpiry(fields.healthCheckExpiryDate, now),
  );
  if (remainingDays < 0) return DriverComplianceStatus.EXPIRED;
  if (remainingDays <= 30) return DriverComplianceStatus.EXPIRING_30;
  if (remainingDays <= 60) return DriverComplianceStatus.EXPIRING_60;
  return DriverComplianceStatus.VALID;
};
