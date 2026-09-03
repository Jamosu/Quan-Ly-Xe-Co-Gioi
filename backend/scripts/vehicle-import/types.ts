import {
  FuelQuotaUnit,
  Unit,
  VehicleCategory,
  VehicleStatus,
} from '@prisma/client';

export interface WorkbookSheetInventory {
  sheet: string;
  nonEmptyRows: number;
  parsedRows: number;
  role: 'VEHICLE_SOURCE' | 'REFERENCE' | 'IGNORED';
}

export interface NormalizedVehicleRecord {
  sheet: string;
  row: number;
  sourcePriority: number;
  code?: string;
  oldCode?: string;
  bravoCode?: string;
  assetCode?: string;
  plate?: string;
  name?: string;
  category: VehicleCategory;
  vehicleTypeCode: string;
  assetGroup: string;
  vehicleSubtype?: string;
  unit: Unit;
  complexCode: string;
  regionCode?: string;
  assignedUnitCode?: string;
  purchaseCondition?: string;
  allocationDate?: Date;
  conditionStatus?: string;
  transferHistory?: string;
  manufacturer?: string;
  origin?: string;
  manufactureYear?: number;
  modelName?: string;
  powerHp?: string;
  frameNumber?: string;
  engineNumber?: string;
  fuelQuotaRate?: number;
  fuelQuotaUnit: FuelQuotaUnit;
  fuelTankCapacity?: number;
  supplier?: string;
  notes?: string;
  imageUrl?: string;
  technicalSpecs?: string;
  dimensions?: string;
  productivity?: string;
  contractStatus?: string;
  companyOwner?: string;
  inspectionDate?: Date;
  inspectionExpiryDate?: Date;
  nextInspectionDate?: Date;
  roadFeeDate?: Date;
  roadFeeExpiryDate?: Date;
  nextRoadFeeDate?: Date;
  status: VehicleStatus;
  totalMachineHours?: number;
  odoKm?: number;
  currentLocationName?: string;
}

export interface ResolvedVehicle extends NormalizedVehicleRecord {
  code: string;
  name: string;
  sourceSheets: string[];
  sourceRows: Array<{ sheet: string; row: number }>;
  recordCount: number;
}

export interface ImportConflict {
  sheet: string;
  row: number;
  values: Record<string, unknown>;
  candidateVehicles: string[];
  reason: string;
}

export interface IdentityResolutionResult {
  vehicles: ResolvedVehicle[];
  unresolved: NormalizedVehicleRecord[];
  conflicts: ImportConflict[];
  mergedRows: number;
}

export interface ParsedWorkbook {
  workbookPath: string;
  records: NormalizedVehicleRecord[];
  inventory: WorkbookSheetInventory[];
  skippedRows: number;
}

export interface VehicleImportReport {
  workbook: string;
  generatedAt: string;
  dryRun: boolean;
  sheets: WorkbookSheetInventory[];
  totalWorkbookNonEmptyRows: number;
  totalRowsRead: number;
  uniqueVehicles: number;
  newVehicles: number;
  updatedVehicles: number;
  inserted: number;
  updated: number;
  mergedRows: number;
  unresolvedRows: number;
  conflicts: ImportConflict[];
  skippedRows: number;
  databaseVehicleCount?: number;
}

export interface CategoryMetadata {
  code: VehicleCategory;
  name: string;
  assetGroup: string;
  defaultFuelQuotaUnit: FuelQuotaUnit;
}
