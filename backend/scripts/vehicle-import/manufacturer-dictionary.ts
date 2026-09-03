import { foldText, normalizeText } from './normalization';

/**
 * Canonical manufacturer names and alias mappings.
 *
 * Every alias (folded uppercase, diacritics stripped) maps to the
 * official spelling used in THACO AGRI Master Data.
 */

export const MANUFACTURER_ALIASES: Record<string, string> = {
  // --- A ---
  'ATLAS COPCO': 'ATLAS COPCO',
  'ATLASCOPCO': 'ATLAS COPCO',

  // --- B ---
  'BELL': 'BELL',
  'BOMAG': 'BOMAG',
  'BOSCH': 'BOSCH',

  // --- C ---
  'CASE': 'CASE',
  'CASE IH': 'CASE IH',
  'CASEIH': 'CASE IH',
  'CATERPILLAR': 'CATERPILLAR',
  'CAT': 'CATERPILLAR',
  'CELIKEL': 'CELIKEL',
  'CHANGLIN': 'CHANGLIN',
  'CIMC': 'CIMC',
  'CUMMINS': 'CUMMINS',

  // --- D ---
  'DAEWOO': 'DAEWOO',
  'DENYO': 'DENYO',
  'DEUTZ': 'DEUTZ',
  'DOOSAN': 'DOOSAN',
  'DONGFENG': 'DONGFENG',

  // --- F ---
  'FIAT': 'FIAT',
  'FOTON': 'FOTON',
  'FORD': 'FORD',
  'FURUKAWA': 'FURUKAWA',

  // --- H ---
  'HELI': 'HELI',
  'HINO': 'HINO',
  'HITACHI': 'HITACHI',
  'HONDA': 'HONDA',
  'HOWO': 'HOWO',
  'HUYNDAI': 'HYUNDAI',
  'HYUNDAI': 'HYUNDAI',
  'HD': 'HYUNDAI',

  // --- I ---
  'ISUZU': 'ISUZU',
  'IHI': 'IHI',

  // --- J ---
  'JCB': 'JCB',
  'JOHN DEERE': 'JOHN DEERE',
  'JOHNDEERE': 'JOHN DEERE',
  'DEERE': 'JOHN DEERE',

  // --- K ---
  'KATO': 'KATO',
  'KAWASAKI': 'KAWASAKI',
  'KOBELCO': 'KOBELCO',
  'KOBUTA': 'KUBOTA',
  'KOMATSU': 'KOMATSU',
  'KUBOTA': 'KUBOTA',
  'KUHN': 'KUHN',

  // --- L ---
  'LIUGONG': 'LIUGONG',
  'LOVOL': 'LOVOL',
  'LONKING': 'LONKING',

  // --- M ---
  'MASSEY FERGUSON': 'MASSEY FERGUSON',
  'MASSEYFERGUSON': 'MASSEY FERGUSON',
  'MF': 'MASSEY FERGUSON',
  'MAZDA': 'MAZDA',
  'MERCEDES': 'MERCEDES-BENZ',
  'MERCEDES BENZ': 'MERCEDES-BENZ',
  'MERCEDESBENZ': 'MERCEDES-BENZ',
  'MITSUBISHI': 'MITSUBISHI',
  'MTZ': 'MTZ (BELARUS)',
  'MTZ BELARUS': 'MTZ (BELARUS)',

  // --- N ---
  'NEW HOLLAND': 'NEW HOLLAND',
  'NEWHOLLAND': 'NEW HOLLAND',
  'NISSAN': 'NISSAN',

  // --- P ---
  'PERKINS': 'PERKINS',

  // --- S ---
  'SAKAI': 'SAKAI',
  'SAMSUNG': 'SAMSUNG',
  'SANY': 'SANY',
  'SHANTUI': 'SHANTUI',
  'SDLG': 'SDLG',
  'SUMITOMO': 'SUMITOMO',
  'SUZUKI': 'SUZUKI',

  // --- T ---
  'THACO': 'THACO AGRI',
  'THACOAGRI': 'THACO AGRI',
  'THACO AGRI': 'THACO AGRI',
  'CK CGH': 'THACO AGRI',
  'CKCGH': 'THACO AGRI',
  'CO KHI CO GIOI HOA': 'THACO AGRI',
  'TOYOTA': 'TOYOTA',

  // --- V ---
  'VINAXUKI': 'VINAXUKI',
  'VOLVO': 'VOLVO',

  // --- X ---
  'XCMG': 'XCMG',

  // --- Y ---
  'YAMAHA': 'YAMAHA',
  'YANMAR': 'YANMAR',

  // --- Z ---
  'ZOOMLION': 'ZOOMLION',
};

/**
 * Resolve a raw manufacturer string to its canonical form.
 *
 * Returns the canonical name or the uppercased original if no alias matched.
 * Returns undefined for empty / garbage values.
 */
export function lookupManufacturer(value: unknown): string | undefined {
  const raw = normalizeText(value);
  if (!raw) return undefined;

  const upper = raw.toUpperCase().trim();
  // If it's purely numeric, it's not a manufacturer
  if (/^\d+$/.test(upper)) return undefined;

  const folded = foldText(raw).trim();
  if (!folded) return undefined;

  return MANUFACTURER_ALIASES[folded] || upper;
}
