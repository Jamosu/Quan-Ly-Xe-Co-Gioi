import * as XLSX from 'xlsx';
import {
  CATEGORY_METADATA,
  detectShiftedRow,
  inferCategory,
  inferFuelQuotaUnit,
  inferRegionCode,
  inferUnit,
  inferVehicleStatus,
  normalizeCode,
  normalizeExcelDate,
  normalizeIdentifier,
  normalizeManufacturer,
  normalizeNumber,
  normalizeOrigin,
  normalizePlate,
  normalizeSheetName,
  normalizeText,
  normalizeYear,
} from './normalization';
import {
  NormalizedVehicleRecord,
  ParsedWorkbook,
  WorkbookSheetInventory,
} from './types';

type VehicleField = Exclude<
  keyof NormalizedVehicleRecord,
  | 'sheet'
  | 'row'
  | 'sourcePriority'
  | 'category'
  | 'vehicleTypeCode'
  | 'assetGroup'
  | 'unit'
  | 'complexCode'
  | 'regionCode'
  | 'fuelQuotaUnit'
  | 'status'
>;

interface SheetConfig {
  sheetName: string;
  headerRow: number;
  firstDataRow: number;
  sourcePriority: number;
  columns: Partial<Record<VehicleField, number>>;
  roleDescription: string;
  specialize?: (row: unknown[], record: Record<string, unknown>) => void;
}

function vehicleCondition(row: unknown[], record: Record<string, unknown>): void {
  const machineHours = normalizeNumber(row[16]);
  if (machineHours !== undefined) record.totalMachineHours = machineHours;
  else if (normalizeText(row[16])) record.conditionStatus = normalizeText(row[16]);

  if (normalizeText(row[18])) record.conditionStatus = 'Hư hỏng / Chờ sửa';
  else if (normalizeText(row[19])) record.conditionStatus = 'Không còn sử dụng';
  else if (normalizeText(row[17]) && !record.conditionStatus) record.conditionStatus = 'Bình thường';
}

function equipmentCondition(row: unknown[], record: Record<string, unknown>): void {
  if (normalizeText(row[11])) record.conditionStatus = 'Hư hỏng / Chờ sửa';
  else if (normalizeText(row[12])) record.conditionStatus = 'Không còn sử dụng';
  else if (normalizeText(row[10])) record.conditionStatus = 'Bình thường';
}

const SHEET_CONFIGS: SheetConfig[] = [
  {
    sheetName: 'TONG KLH TN', headerRow: 2, firstDataRow: 4, sourcePriority: 60,
    roleDescription: 'Tổng hợp kỹ thuật toàn KLH',
    columns: { code: 1, name: 2, assignedUnitCode: 3, manufacturer: 4, origin: 5, manufactureYear: 6, modelName: 7, powerHp: 8, frameNumber: 9, engineNumber: 10, fuelQuotaRate: 11, contractStatus: 12 },
  },
  {
    sheetName: '02 MM KLH', headerRow: 2, firstDataRow: 3, sourcePriority: 90,
    roleDescription: 'Hồ sơ MMTB KLH',
    columns: { code: 2, oldCode: 3, bravoCode: 4, plate: 5, purchaseCondition: 6, name: 7, vehicleSubtype: 8, assignedUnitCode: 9, allocationDate: 10, conditionStatus: 11, transferHistory: 13, manufacturer: 14, origin: 15, manufactureYear: 16, modelName: 17, powerHp: 18, frameNumber: 19, engineNumber: 20, fuelQuotaRate: 21, fuelTankCapacity: 22, supplier: 23, notes: 24, imageUrl: 25 },
  },
  {
    sheetName: '02 1 NHOM XE MAY', headerRow: 2, firstDataRow: 3, sourcePriority: 100,
    roleDescription: 'Nhóm xe máy có mã tài sản',
    columns: { code: 2, oldCode: 3, bravoCode: 4, plate: 5, assetCode: 6, name: 7, vehicleSubtype: 8, assignedUnitCode: 9, allocationDate: 10, conditionStatus: 11, transferHistory: 13, manufacturer: 14, origin: 15, manufactureYear: 16, modelName: 17, powerHp: 18, frameNumber: 19, engineNumber: 20 },
  },
  {
    sheetName: '03 THIET BI', headerRow: 2, firstDataRow: 3, sourcePriority: 85,
    roleDescription: 'Thiết bị MMTB',
    columns: { code: 2, oldCode: 3, assetCode: 4, purchaseCondition: 5, name: 6, assignedUnitCode: 8, allocationDate: 9, conditionStatus: 11, transferHistory: 12, notes: 13, manufacturer: 14, modelName: 15, origin: 16, manufactureYear: 17, technicalSpecs: 18, frameNumber: 19, fuelQuotaRate: 20, productivity: 21, imageUrl: 22 },
  },
  {
    sheetName: 'XE MAY CG AGRI', headerRow: 2, firstDataRow: 4, sourcePriority: 80,
    roleDescription: 'Dữ liệu vận hành xe máy Cơ giới AGRI',
    columns: { name: 2, modelName: 4, powerHp: 8, fuelQuotaRate: 9, engineNumber: 10, frameNumber: 11, plate: 12, code: 13, manufactureYear: 14, allocationDate: 15, odoKm: 16, purchaseCondition: 21, assignedUnitCode: 22, assetCode: 26, companyOwner: 27, notes: 28 },
    specialize: vehicleCondition,
  },
  {
    sheetName: 'TB CG AGRI', headerRow: 2, firstDataRow: 4, sourcePriority: 80,
    roleDescription: 'Thiết bị Cơ giới AGRI',
    columns: { name: 3, fuelQuotaRate: 8, productivity: 9, code: 10, purchaseCondition: 14, assignedUnitCode: 15, assetCode: 19, companyOwner: 20, notes: 21 },
    specialize: equipmentCondition,
  },
  {
    sheetName: '04 XMA', headerRow: 2, firstDataRow: 3, sourcePriority: 82,
    roleDescription: 'Xe máy hai bánh',
    columns: { code: 2, oldCode: 3, assetCode: 4, name: 5, assignedUnitCode: 6, allocationDate: 7, conditionStatus: 8, notes: 9, manufacturer: 10, origin: 11, manufactureYear: 12, modelName: 13, powerHp: 14, frameNumber: 15, engineNumber: 16, fuelQuotaRate: 17, productivity: 18, imageUrl: 20 },
  },
  {
    sheetName: '03 1 NHOM TB', headerRow: 2, firstDataRow: 3, sourcePriority: 92,
    roleDescription: 'Nhóm thiết bị chi tiết',
    columns: { code: 2, oldCode: 3, assetCode: 4, purchaseCondition: 5, name: 6, vehicleSubtype: 7, assignedUnitCode: 8, allocationDate: 9, conditionStatus: 11, transferHistory: 12, notes: 13, manufacturer: 14, modelName: 15, origin: 16, manufactureYear: 17, technicalSpecs: 18, frameNumber: 19, fuelQuotaRate: 20 },
  },
  {
    sheetName: 'DANH MUC', headerRow: 1, firstDataRow: 3, sourcePriority: 98,
    roleDescription: 'Danh mục MMTB chuẩn có identifier kế toán',
    columns: { code: 2, oldCode: 3, bravoCode: 4, plate: 5, assetCode: 6, name: 7, vehicleSubtype: 8, assignedUnitCode: 9, allocationDate: 10, conditionStatus: 11, transferHistory: 13, modelName: 14, manufacturer: 15, origin: 16, manufactureYear: 17, powerHp: 18, frameNumber: 19, engineNumber: 20, dimensions: 21 },
  },
  {
    sheetName: '05 MPC', headerRow: 2, firstDataRow: 3, sourcePriority: 84,
    roleDescription: 'Máy phát cỏ',
    columns: { code: 2, oldCode: 3, assetCode: 4, name: 5, assignedUnitCode: 6, allocationDate: 7, conditionStatus: 8, notes: 9, manufacturer: 10, origin: 11, manufactureYear: 12, modelName: 13, powerHp: 14, frameNumber: 15, engineNumber: 16, fuelQuotaRate: 17, imageUrl: 18 },
  },
  {
    sheetName: '07 MFD', headerRow: 2, firstDataRow: 3, sourcePriority: 84,
    roleDescription: 'Máy phát điện',
    columns: { code: 2, oldCode: 3, assetCode: 4, name: 5, frameNumber: 6, assignedUnitCode: 7, modelName: 8, manufacturer: 9, manufactureYear: 10, origin: 11, powerHp: 12, fuelQuotaRate: 13, allocationDate: 14, conditionStatus: 15, notes: 16, currentLocationName: 17 },
  },
  {
    sheetName: '06 MCG MKH', headerRow: 2, firstDataRow: 3, sourcePriority: 84,
    roleDescription: 'Máy cưa gỗ / máy khác',
    columns: { code: 2, oldCode: 3, assetCode: 4, name: 5, assignedUnitCode: 6, allocationDate: 7, conditionStatus: 8, notes: 9, manufacturer: 10, origin: 11, manufactureYear: 12, modelName: 13, powerHp: 14, frameNumber: 15, engineNumber: 16, fuelQuotaRate: 17, imageUrl: 18 },
  },
  {
    sheetName: '08 DKDK', headerRow: 3, firstDataRow: 7, sourcePriority: 96,
    roleDescription: 'Đăng kiểm, kiểm định và phí đường bộ',
    columns: { code: 2, plate: 3, bravoCode: 4, name: 5, assignedUnitCode: 6, manufacturer: 7, manufactureYear: 8, modelName: 9, powerHp: 10, frameNumber: 11, engineNumber: 12, inspectionDate: 13, inspectionExpiryDate: 14, nextInspectionDate: 15, roadFeeDate: 16, roadFeeExpiryDate: 17, nextRoadFeeDate: 18 },
  },
  {
    sheetName: 'THIET BI DIEN NUOC', headerRow: 2, firstDataRow: 3, sourcePriority: 82,
    roleDescription: 'Thiết bị điện nước',
    columns: { code: 2, oldCode: 3, assetCode: 4, name: 5, frameNumber: 6, assignedUnitCode: 7, modelName: 8, manufacturer: 9, manufactureYear: 10, origin: 11, powerHp: 12, fuelQuotaRate: 13, allocationDate: 14, conditionStatus: 15, notes: 16, currentLocationName: 17 },
  },
  {
    sheetName: '02 1 KLH CN MA BRAVO MM', headerRow: 2, firstDataRow: 3, sourcePriority: 94,
    roleDescription: 'Đối chiếu mã Bravo và tài sản',
    columns: { code: 2, bravoCode: 3, oldCode: 4, assetCode: 5, name: 6, assignedUnitCode: 7, allocationDate: 8, conditionStatus: 9, transferHistory: 11, manufacturer: 12, origin: 13, manufactureYear: 14, modelName: 15, powerHp: 16, frameNumber: 17, engineNumber: 18 },
  },
  {
    sheetName: '03 1 TB SXCN', headerRow: 2, firstDataRow: 3, sourcePriority: 86,
    roleDescription: 'Thiết bị sản xuất chăn nuôi',
    columns: { code: 2, oldCode: 3, bravoCode: 4, assetCode: 5, name: 6, assignedUnitCode: 7, allocationDate: 8, conditionStatus: 10, transferHistory: 11, notes: 12, manufacturer: 13, origin: 14, manufactureYear: 15, technicalSpecs: 16, frameNumber: 17 },
  },
];

const CONFIG_BY_SHEET = new Map(SHEET_CONFIGS.map((item) => [item.sheetName, item]));
const REFERENCE_SHEETS = new Set(['01 TH', 'THONG SO']);

function cell(row: unknown[], column?: number): unknown {
  return column ? row[column - 1] : undefined;
}

function hasTrustedIdentifier(record: Record<string, unknown>): boolean {
  return Boolean(
    normalizeCode(record.code) ||
      normalizeIdentifier(record.bravoCode) ||
      normalizeIdentifier(record.assetCode) ||
      normalizeIdentifier(record.frameNumber) ||
      normalizeIdentifier(record.engineNumber) ||
      normalizePlate(record.plate) ||
      normalizeIdentifier(record.oldCode),
  );
}

function parseRecord(
  row: unknown[],
  rowNumber: number,
  sheet: string,
  config: SheetConfig,
): NormalizedVehicleRecord | undefined {
  const raw: Record<string, unknown> = {};
  for (const [field, column] of Object.entries(config.columns)) {
    raw[field] = cell(row, column);
  }
  config.specialize?.(row, raw);
  if (!hasTrustedIdentifier(raw)) return undefined;

  // Detect and repair rows where origin / year / model columns are shifted
  const shifted = detectShiftedRow(raw);
  if (shifted.shifted) {
    raw.manufacturer = shifted.manufacturer;
    raw.modelName = shifted.modelName;
    raw.origin = shifted.origin;
    raw.manufactureYear = shifted.manufactureYear;
  }

  const code = normalizeCode(raw.code);
  const name = normalizeText(raw.name);
  const subtype = normalizeText(raw.vehicleSubtype);
  const category = inferCategory(subtype, name, code, sheet);
  const metadata = CATEGORY_METADATA[category];
  const assignedUnitCode = normalizeText(raw.assignedUnitCode);
  const companyOwner = normalizeText(raw.companyOwner);
  const conditionStatus = normalizeText(raw.conditionStatus);

  return {
    sheet,
    row: rowNumber,
    sourcePriority: config.sourcePriority,
    code,
    oldCode: normalizeIdentifier(raw.oldCode),
    bravoCode: normalizeIdentifier(raw.bravoCode),
    assetCode: normalizeIdentifier(raw.assetCode),
    plate: normalizePlate(raw.plate),
    name,
    category,
    vehicleTypeCode: metadata.code,
    assetGroup: metadata.assetGroup,
    vehicleSubtype: subtype,
    unit: inferUnit(assignedUnitCode),
    complexCode: 'KOUN_MOM',
    regionCode: inferRegionCode(assignedUnitCode, companyOwner),
    assignedUnitCode,
    purchaseCondition: normalizeText(raw.purchaseCondition),
    allocationDate: normalizeExcelDate(raw.allocationDate),
    conditionStatus,
    transferHistory: normalizeText(raw.transferHistory),
    manufacturer: normalizeManufacturer(raw.manufacturer),
    origin: normalizeOrigin(raw.origin),
    manufactureYear: normalizeYear(raw.manufactureYear),
    modelName: normalizeText(raw.modelName),
    powerHp: normalizeText(raw.powerHp),
    frameNumber: normalizeIdentifier(raw.frameNumber),
    engineNumber: normalizeIdentifier(raw.engineNumber),
    fuelQuotaRate: normalizeNumber(raw.fuelQuotaRate),
    fuelQuotaUnit: inferFuelQuotaUnit(category, raw.fuelQuotaRate),
    fuelTankCapacity: normalizeNumber(raw.fuelTankCapacity),
    supplier: normalizeText(raw.supplier),
    notes: normalizeText(raw.notes),
    imageUrl: normalizeText(raw.imageUrl),
    technicalSpecs: normalizeText(raw.technicalSpecs),
    dimensions: normalizeText(raw.dimensions),
    productivity: normalizeText(raw.productivity),
    contractStatus: normalizeText(raw.contractStatus),
    companyOwner,
    inspectionDate: normalizeExcelDate(raw.inspectionDate),
    inspectionExpiryDate: normalizeExcelDate(raw.inspectionExpiryDate),
    nextInspectionDate: normalizeExcelDate(raw.nextInspectionDate),
    roadFeeDate: normalizeExcelDate(raw.roadFeeDate),
    roadFeeExpiryDate: normalizeExcelDate(raw.roadFeeExpiryDate),
    nextRoadFeeDate: normalizeExcelDate(raw.nextRoadFeeDate),
    status: inferVehicleStatus(conditionStatus),
    totalMachineHours: normalizeNumber(raw.totalMachineHours),
    odoKm: normalizeNumber(raw.odoKm),
    currentLocationName: normalizeText(raw.currentLocationName),
  };
}

export function readVehicleWorkbook(workbookPath: string): ParsedWorkbook {
  const workbook = XLSX.readFile(workbookPath, {
    cellDates: true,
    cellFormula: true,
    raw: true,
  });
  const records: NormalizedVehicleRecord[] = [];
  const inventory: WorkbookSheetInventory[] = [];
  let skippedRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const normalizedName = normalizeSheetName(sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });
    const nonEmptyRows = rows.filter((row) => row.some((value) => normalizeText(value))).length;
    const config = CONFIG_BY_SHEET.get(normalizedName);
    const sheetRecords: NormalizedVehicleRecord[] = [];

    if (config) {
      for (let index = config.firstDataRow - 1; index < rows.length; index += 1) {
        const record = parseRecord(rows[index], index + 1, sheetName, config);
        if (record) sheetRecords.push(record);
        else if (rows[index].some((value) => normalizeText(value))) skippedRows += 1;
      }
      records.push(...sheetRecords);
    }

    inventory.push({
      sheet: sheetName,
      nonEmptyRows,
      parsedRows: sheetRecords.length,
      role: config ? 'VEHICLE_SOURCE' : REFERENCE_SHEETS.has(normalizedName) ? 'REFERENCE' : 'IGNORED',
    });
  }

  return { workbookPath, records, inventory, skippedRows };
}
