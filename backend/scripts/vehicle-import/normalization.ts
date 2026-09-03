import {
  FuelQuotaUnit,
  Unit,
  VehicleCategory,
  VehicleStatus,
} from '@prisma/client';
import { lookupCountry, isStandardCountry } from './country-dictionary';
import { lookupManufacturer } from './manufacturer-dictionary';
import { CategoryMetadata } from './types';

const EMPTY_VALUES = new Set([
  '',
  '-',
  '--',
  'N/A',
  '#N/A',
  '#REF!',
  '#VALUE!',
  'NULL',
  'NONE',
]);

const NON_IDENTIFIER_VALUES = new Set([
  ...EMPTY_VALUES,
  'CCN',
  'MỚI',
  'MOI',
  'ĐQSD',
  'DQSD',
  'KLH',
  'X',
]);

export const CATEGORY_METADATA: Record<VehicleCategory, CategoryMetadata> = {
  MAY_DAO: { code: 'MAY_DAO', name: 'Máy đào', assetGroup: 'MAY_CONG_TRINH', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_UI: { code: 'MAY_UI', name: 'Máy ủi', assetGroup: 'MAY_CONG_TRINH', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_SAN: { code: 'MAY_SAN', name: 'Máy san / xe ban', assetGroup: 'MAY_CONG_TRINH', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_LU: { code: 'MAY_LU', name: 'Máy lu', assetGroup: 'MAY_CONG_TRINH', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_XUC_LAT: { code: 'MAY_XUC_LAT', name: 'Máy xúc lật', assetGroup: 'MAY_CONG_TRINH', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  XE_XUC: { code: 'XE_XUC', name: 'Xe xúc', assetGroup: 'MAY_CONG_TRINH', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_CAY: { code: 'MAY_CAY', name: 'Máy cày', assetGroup: 'MAY_NONG_NGHIEP', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_KEO: { code: 'MAY_KEO', name: 'Máy kéo', assetGroup: 'MAY_NONG_NGHIEP', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_GAT_DAP: { code: 'MAY_GAT_DAP', name: 'Máy gặt đập', assetGroup: 'MAY_NONG_NGHIEP', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  XE_TAI: { code: 'XE_TAI', name: 'Xe tải', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_KM' },
  XE_BEN: { code: 'XE_BEN', name: 'Xe ben', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_KM' },
  XE_BON: { code: 'XE_BON', name: 'Xe bồn / xe téc', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_KM' },
  XE_CONTAINER: { code: 'XE_CONTAINER', name: 'Xe đầu kéo container', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_KM' },
  XE_BAN_TAI: { code: 'XE_BAN_TAI', name: 'Xe bán tải', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_KM' },
  XE_CHUYEN_DUNG: { code: 'XE_CHUYEN_DUNG', name: 'Xe / máy chuyên dùng', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  XE_CONG_VU: { code: 'XE_CONG_VU', name: 'Xe công vụ', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_KM' },
  XE_CHO_NGUOI: { code: 'XE_CHO_NGUOI', name: 'Xe chở người', assetGroup: 'XE_VAN_TAI_CONG_VU', defaultFuelQuotaUnit: 'L_PER_KM' },
  XE_NANG: { code: 'XE_NANG', name: 'Xe nâng', assetGroup: 'THIET_BI_PHU_TRO', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_PHAT_DIEN: { code: 'MAY_PHAT_DIEN', name: 'Máy phát điện', assetGroup: 'THIET_BI_PHU_TRO', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_PHAT_CO: { code: 'MAY_PHAT_CO', name: 'Máy phát cỏ', assetGroup: 'THIET_BI_PHU_TRO', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_CUA: { code: 'MAY_CUA', name: 'Máy cưa', assetGroup: 'THIET_BI_PHU_TRO', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  MAY_BOM: { code: 'MAY_BOM', name: 'Máy bơm', assetGroup: 'THIET_BI_PHU_TRO', defaultFuelQuotaUnit: 'L_PER_HOUR' },
  XE_MAY_2_BANH: { code: 'XE_MAY_2_BANH', name: 'Xe máy hai bánh', assetGroup: 'THIET_BI_PHU_TRO', defaultFuelQuotaUnit: 'L_PER_KM' },
  THIET_BI_NONG_CU: { code: 'THIET_BI_NONG_CU', name: 'Thiết bị & nông cụ', assetGroup: 'THIET_BI_PHU_TRO', defaultFuelQuotaUnit: 'L_PER_HOUR' },
};

export function normalizeText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value)
    .normalize('NFC')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || EMPTY_VALUES.has(text.toUpperCase())) return undefined;
  return text;
}

export function foldText(value: unknown): string {
  return (normalizeText(value) || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase();
}

export function normalizeSheetName(value: unknown): string {
  return foldText(value).replace(/[^A-Z0-9]+/g, ' ').trim();
}

export function normalizeCode(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const normalized = text.toUpperCase().replace(/\s+/g, '');
  if (NON_IDENTIFIER_VALUES.has(normalized)) return undefined;
  if (!/[A-ZÀ-Ỹ].*\d|\d.*[A-ZÀ-Ỹ]/i.test(normalized)) return undefined;
  return normalized;
}

export function normalizeIdentifier(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const normalized = text.toUpperCase().replace(/\s+/g, '');
  if (NON_IDENTIFIER_VALUES.has(normalized)) return undefined;
  const folded = foldText(normalized).replace(/[^A-Z0-9]/g, '');
  if (
    !folded ||
    /^(MOI|DQSD|MOIDQSD|NIL|NONE|NULL|CCN|KHONG|CHUA|X)$/.test(folded) ||
    /^(MATSO|CHUACO|KHONGCO|KHONGRO)/.test(folded) ||
    (/^\d+$/.test(folded) && folded.length < 5)
  ) {
    return undefined;
  }
  return normalized;
}

export function identityKey(value: unknown): string | undefined {
  const identifier = normalizeIdentifier(value);
  if (!identifier) return undefined;
  const key = foldText(identifier).replace(/[^A-Z0-9]/g, '');
  return key.length >= 3 ? key : undefined;
}

export function normalizePlate(value: unknown): string | undefined {
  const identifier = normalizeIdentifier(value);
  return identifier?.replace(/\s+/g, '');
}

export function normalizeManufacturer(value: unknown): string | undefined {
  return lookupManufacturer(value);
}

export function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = normalizeText(value);
  if (!text) return undefined;
  const firstNumber = text.replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
  if (!firstNumber) return undefined;
  const parsed = Number(firstNumber[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Strict year validation: must be between 1970 and currentYear + 1.
 * Prevents values like 2100 (from "CALABRIA 2100") being treated as years.
 */
export function normalizeYear(value: unknown): number | undefined {
  const number = normalizeNumber(value);
  if (!number) return undefined;
  const year = Math.trunc(number);
  const maxYear = new Date().getFullYear() + 1;
  return year >= 1970 && year <= maxYear ? year : undefined;
}

/**
 * Normalize origin (country of manufacture) using the country dictionary.
 * Returns the canonical Vietnamese country name, or undefined if the value
 * is not recognized as a valid country (e.g. "2025", "SMRM 2T", "T2000S").
 */
export function normalizeOrigin(value: unknown): string | undefined {
  return lookupCountry(value);
}

/**
 * Heuristic to detect and repair rows where origin / year / model columns
 * have been shifted in the original Excel sheet.
 *
 * For sheets that declare columns in order: manufacturer, modelName, origin, manufactureYear
 * (or manufacturer, origin, manufactureYear, modelName), a common data-entry error is:
 *   - The "origin" cell contains a 4-digit year (e.g. 2026)
 *   - The "year" cell contains a model name (e.g. CALABRIA 2100)
 *   - The "model" cell contains a country name (e.g. THỔ NHĨ KỲ)
 *
 * This function inspects the raw values and swaps them back to their
 * correct semantic positions.
 */
export function detectShiftedRow(raw: Record<string, unknown>): {
  manufacturer?: unknown;
  modelName?: unknown;
  origin?: unknown;
  manufactureYear?: unknown;
  shifted: boolean;
} {
  const originRaw = normalizeText(raw.origin);
  const yearRaw = normalizeText(raw.manufactureYear);
  const modelRaw = normalizeText(raw.modelName);

  let shifted = false;
  let manufacturer = raw.manufacturer;
  let modelName = raw.modelName;
  let origin = raw.origin;
  let manufactureYear = raw.manufactureYear;

  // Case 1: origin cell has a 4-digit number (probable year) and
  //         year cell has text with letters (probable model name)
  if (originRaw && /^\d{4}$/.test(originRaw.trim())) {
    // The origin cell is actually a year
    const candidateYear = Number(originRaw.trim());
    const maxYear = new Date().getFullYear() + 1;
    if (candidateYear >= 1970 && candidateYear <= maxYear) {
      // Check if modelName cell looks like a country
      if (modelRaw && isStandardCountry(modelRaw)) {
        // Swap: model→origin, origin→year, year→model
        origin = modelRaw;
        manufactureYear = originRaw;
        modelName = yearRaw;
        shifted = true;
      } else {
        // Just swap origin↔year
        manufactureYear = originRaw;
        origin = yearRaw && isStandardCountry(yearRaw) ? yearRaw : undefined;
        shifted = true;
      }
    }
  }

  // Case 2: year cell has a recognizable country name
  if (!shifted && yearRaw && isStandardCountry(yearRaw) && originRaw && !isStandardCountry(originRaw)) {
    origin = yearRaw;
    manufactureYear = originRaw;
    shifted = true;
  }

  // Case 3: manufacturer cell contains a recognizable country name
  // (e.g. manufacturer="CAMBODIA", origin="NAGATA" or origin=undefined → move country to origin)
  const mfRaw = normalizeText(manufacturer);
  const resolvedOrigin = normalizeText(origin);
  if (mfRaw && isStandardCountry(mfRaw)) {
    if (!resolvedOrigin || !isStandardCountry(resolvedOrigin)) {
      // manufacturer has a country, origin doesn't → move country to origin
      origin = mfRaw;
      // If origin previously had a value that's not a country, it might be the real manufacturer
      if (resolvedOrigin && !isStandardCountry(resolvedOrigin)) {
        manufacturer = resolvedOrigin;
      } else {
        manufacturer = undefined;
      }
      shifted = true;
    }
  }

  return { manufacturer, modelName, origin, manufactureYear, shifted };
}

export function normalizeExcelDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 86400000);
  }
  const text = normalizeText(value);
  if (!text) return undefined;
  const dmy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) {
    const date = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function inferCategory(...values: unknown[]): VehicleCategory {
  const text = foldText(values.filter(Boolean).join(' '));
  const has = (pattern: RegExp) => pattern.test(text);

  if (has(/MAY PHAT DIEN|M PHAT DIEN|MF[DĐ]/)) return 'MAY_PHAT_DIEN';
  if (has(/MAY PHAT CO|M PHAT CO|MPC/)) return 'MAY_PHAT_CO';
  if (has(/MAY CUA|CUA GO|MCG/)) return 'MAY_CUA';
  if (has(/MAY BOM|BOM CHONG NGAP|MBT/)) return 'MAY_BOM';
  if (has(/XE MAY|XMA/)) return 'XE_MAY_2_BANH';
  if (has(/MAY GAT|GAT DAP/)) return 'MAY_GAT_DAP';
  if (has(/MAY DAO|M DAO|MDA/)) return 'MAY_DAO';
  if (has(/MAY UI|M UI|MUI/)) return 'MAY_UI';
  if (has(/MAY SAN|XE BAN|M SAN/)) return 'MAY_SAN';
  if (has(/MAY LU|XE LU|M LU/)) return 'MAY_LU';
  if (has(/XUC LAT/)) return 'MAY_XUC_LAT';
  if (has(/XE XUC/)) return 'XE_XUC';
  if (has(/MAY CAY/)) return 'MAY_CAY';
  if (has(/MAY KEO|M KEO/)) return 'MAY_KEO';
  if (has(/CONTAINER|DAU KEO|ROMOOC LANH/)) return 'XE_CONTAINER';
  if (has(/XE BEN/)) return 'XE_BEN';
  if (has(/XE BON|XE TEC|BON NUOC|BON DAU/)) return 'XE_BON';
  if (has(/BAN TAI|PICKUP/)) return 'XE_BAN_TAI';
  if (has(/XE NANG/)) return 'XE_NANG';
  if (has(/XE BUS|CHO NGUOI|CHO CONG NHAN|CHO CBCNV/)) return 'XE_CHO_NGUOI';
  if (has(/XE CONG VU/)) return 'XE_CONG_VU';
  if (has(/XE TAI|X TAI|TAI THUNG|TAI DONG LANH/)) return 'XE_TAI';
  if (has(/THIET BI|NONG CU|RO MOOC|ROMOOC|DAN CAY|DAN BUA|CAU|GAU|BUA DUC/)) {
    return 'THIET_BI_NONG_CU';
  }
  return 'XE_CHUYEN_DUNG';
}

export function inferFuelQuotaUnit(
  category: VehicleCategory,
  rawValue?: unknown,
): FuelQuotaUnit {
  const text = foldText(rawValue);
  if (/\/\s*HA|L\/HA/.test(text)) return 'L_PER_HA';
  if (/KM/.test(text)) return 'L_PER_KM';
  return CATEGORY_METADATA[category].defaultFuelQuotaUnit;
}

export function inferRegionCode(assignedUnit?: unknown, owner?: unknown): string | undefined {
  const text = foldText(`${normalizeText(assignedUnit) || ''} ${normalizeText(owner) || ''}`);
  if (/(^|\s)DP(\d|\s|$)|DAUN PENH/.test(text)) return 'DP';
  if (/(^|\s)LP(\d|\s|$)|LUMPHAT/.test(text)) return 'LP';
  if (/(^|\s)AD(\d|\s|$)|ANDONG MEAS/.test(text)) return 'AD';
  return text ? 'KLH' : undefined;
}

export function inferUnit(value?: unknown): Unit {
  const text = foldText(value);
  if (/XN BO|XI NGHIEP BO|XNB/.test(text)) return 'XN_BO';
  if (/BTSC|BAO TRI|SUA CHUA/.test(text)) return 'TT_BTSC';
  if (/NT ?1|NONG TRUONG ?1/.test(text)) return 'NT1';
  if (/NT ?2|NONG TRUONG ?2/.test(text)) return 'NT2';
  return 'BAN_CO_GIOI';
}

export function inferVehicleStatus(condition?: unknown): VehicleStatus {
  const text = foldText(condition);
  if (/HU HONG|HONG|CHO SUA|SUA CHUA/.test(text)) return 'SUA_CHUA';
  if (/KHONG CON|NGUNG|THANH LY|TAM DUNG/.test(text)) return 'TAM_DUNG';
  if (/BAO DUONG/.test(text)) return 'BAO_DUONG';
  if (/BINH THUONG|DANG HD|HOAT DONG|MOI/.test(text)) return 'HOAT_DONG';
  return 'CHO_PHAN_CONG';
}
