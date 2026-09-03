import { foldText, normalizeText } from './normalization';

export const STANDARD_COUNTRIES = [
  'VIỆT NAM',
  'NHẬT BẢN',
  'HÀN QUỐC',
  'TRUNG QUỐC',
  'MỸ',
  'ĐỨC',
  'THỔ NHĨ KỲ',
  'ẤN ĐỘ',
  'THÁI LAN',
  'CAMPUCHIA',
  'BELARUS',
  'NGA',
  'ITALIA',
  'BRAZIL',
  'ĐÀI LOAN',
  'ANH',
  'PHÁP',
  'TÂY BAN NHA',
  'THỤY ĐIỂN',
  'CANADA',
  'BA LAN',
  'INDONESIA',
  'MALAYSIA',
] as const;

export type StandardCountry = (typeof STANDARD_COUNTRIES)[number];

const FOLDED_COUNTRY_MAP: Record<string, string> = {
  // --- Việt Nam ---
  'VIET NAM': 'VIỆT NAM',
  'VIETNAM': 'VIỆT NAM',
  'VN': 'VIỆT NAM',
  'VIET': 'VIỆT NAM',
  'CK CGH': 'VIỆT NAM',
  'CKCGH': 'VIỆT NAM',
  'CO KHI CO GIOI HOA': 'VIỆT NAM',
  'NOI BO THACO': 'VIỆT NAM',

  // --- Nhật Bản ---
  'NHAT BAN': 'NHẬT BẢN',
  'NHAT': 'NHẬT BẢN',
  'JAPAN': 'NHẬT BẢN',
  'JP': 'NHẬT BẢN',

  // --- Hàn Quốc ---
  'HAN QUOC': 'HÀN QUỐC',
  'HAN': 'HÀN QUỐC',
  'KOREA': 'HÀN QUỐC',
  'SOUTH KOREA': 'HÀN QUỐC',
  'KR': 'HÀN QUỐC',

  // --- Trung Quốc ---
  'TRUNG QUOC': 'TRUNG QUỐC',
  'CHINA': 'TRUNG QUỐC',
  'CN': 'TRUNG QUỐC',
  'TQ': 'TRUNG QUỐC',

  // --- Mỹ ---
  'MY': 'MỸ',
  'MI': 'MỸ',
  'USA': 'MỸ',
  'US': 'MỸ',
  'HOA KY': 'MỸ',
  'UNITED STATES': 'MỸ',

  // --- Đức ---
  'DUC': 'ĐỨC',
  'GERMANY': 'ĐỨC',
  'DE': 'ĐỨC',

  // --- Thổ Nhĩ Kỳ ---
  'THO NHI KY': 'THỔ NHĨ KỲ',
  'TURKEY': 'THỔ NHĨ KỲ',
  'TR': 'THỔ NHĨ KỲ',

  // --- Ấn Độ ---
  'AN DO': 'ẤN ĐỘ',
  'INDIA': 'ẤN ĐỘ',
  'IN': 'ẤN ĐỘ',

  // --- Thái Lan ---
  'THAI LAN': 'THÁI LAN',
  'THAILAND': 'THÁI LAN',
  'TH': 'THÁI LAN',

  // --- Campuchia ---
  'CAMPUCHIA': 'CAMPUCHIA',
  'CAMBODIA': 'CAMPUCHIA',
  'KH': 'CAMPUCHIA',
  'CAM': 'CAMPUCHIA',

  // --- Belarus ---
  'BELARUS': 'BELARUS',
  'BY': 'BELARUS',

  // --- Nga ---
  'NGA': 'NGA',
  'RUSSIA': 'NGA',
  'RU': 'NGA',
  'LIEN XO': 'NGA',
  'SOVIET': 'NGA',

  // --- Italia ---
  'ITALIA': 'ITALIA',
  'ITALY': 'ITALIA',
  'Y': 'ITALIA',
  'IT': 'ITALIA',

  // --- Brazil ---
  'BRAZIL': 'BRAZIL',
  'BR': 'BRAZIL',

  // --- Đài Loan ---
  'DAI LOAN': 'ĐÀI LOAN',
  'TAIWAN': 'ĐÀI LOAN',
  'TW': 'ĐÀI LOAN',

  // --- Anh ---
  'ANH': 'ANH',
  'UK': 'ANH',
  'ENGLAND': 'ANH',
  'GREAT BRITAIN': 'ANH',

  // --- Pháp ---
  'PHAP': 'PHÁP',
  'FRANCE': 'PHÁP',
  'FR': 'PHÁP',

  // --- Tây Ban Nha ---
  'TAY BAN NHA': 'TÂY BAN NHA',
  'SPAIN': 'TÂY BAN NHA',
  'ES': 'TÂY BAN NHA',

  // --- Thụy Điển ---
  'THUY DIEN': 'THỤY ĐIỂN',
  'SWEDEN': 'THỤY ĐIỂN',
  'SE': 'THỤY ĐIỂN',

  // --- Canada ---
  'CANADA': 'CANADA',
  'CA': 'CANADA',

  // --- Ba Lan ---
  'BA LAN': 'BA LAN',
  'POLAND': 'BA LAN',
  'PL': 'BA LAN',

  // --- Indonesia ---
  'INDONESIA': 'INDONESIA',

  // --- Malaysia ---
  'MALAYSIA': 'MALAYSIA',
};

/**
 * Resolve a raw origin string to its canonical Vietnamese country name.
 *
 * Returns undefined if the value is:
 *  - empty / null
 *  - a 4-digit number (probable year mistakenly in origin column)
 *  - not a recognized country name or alias
 */
export function lookupCountry(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = normalizeText(value);
  if (!raw) return undefined;

  // A 4-digit number is definitely NOT a country
  if (/^\d{4}$/.test(raw.trim())) {
    return undefined;
  }

  // Pure numbers are not countries
  if (/^\d+$/.test(raw.trim())) {
    return undefined;
  }

  const folded = foldText(raw).trim();
  if (!folded) return undefined;

  return FOLDED_COUNTRY_MAP[folded] || undefined;
}

/**
 * Check if a raw value is a recognized standard country.
 */
export function isStandardCountry(value: unknown): boolean {
  return lookupCountry(value) !== undefined;
}
