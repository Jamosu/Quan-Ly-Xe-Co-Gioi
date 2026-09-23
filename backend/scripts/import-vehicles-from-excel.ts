import 'dotenv/config';
import { Prisma, PrismaClient, VehicleCategory, VehicleStatus } from '@prisma/client';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { resolveVehicleIdentities } from './vehicle-import/identity-resolution';
import { CATEGORY_METADATA } from './vehicle-import/normalization';
import { ResolvedVehicle, VehicleImportReport } from './vehicle-import/types';
import { classifyWorkbookSources, readVehicleWorkbook } from './vehicle-import/workbook-reader';
import { readImplementWorkbook } from './import-implements-from-excel';
import {
  ManagementUnitResolution,
  resolveManagementTeam,
} from './vehicle-import/management-unit-resolution';

const prisma = new PrismaClient();

export function partitionVehicleCandidates(
  vehicles: ResolvedVehicle[],
  implementCodes: ReadonlySet<string>,
) {
  const accepted: ResolvedVehicle[] = [];
  const excludedEquipment: ResolvedVehicle[] = [];
  const classificationConflicts: ResolvedVehicle[] = [];

  for (const vehicle of vehicles) {
    if (!implementCodes.has(vehicle.code)) {
      accepted.push(vehicle);
      continue;
    }
    if (classifyWorkbookSources(vehicle.sourceSheets) === 'CONFLICT') {
      classificationConflicts.push(vehicle);
    } else {
      excludedEquipment.push(vehicle);
    }
  }
  return { accepted, excludedEquipment, classificationConflicts };
}

function argumentValue(name: string): string | undefined {
  const direct = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function findDefaultWorkbook(): string {
  const directories = [resolve(process.cwd(), 'docs'), resolve(process.cwd(), '..', 'docs')];
  for (const directory of directories) {
    if (!existsSync(directory)) continue;
    const file = readdirSync(directory).find(
      (name) => name.startsWith('00.') && name.toUpperCase().includes('KOUN MOM') && name.endsWith('.xlsx'),
    );
    if (file) return resolve(directory, file);
  }
  throw new Error('Không tìm thấy workbook 00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx');
}

function cleanData<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== ''),
  ) as T;
}

function vehicleCreateData(
  vehicle: ResolvedVehicle,
  vehicleTypeId: number,
  manufacturerRefId?: number,
  modelRefId?: number,
  management?: ManagementUnitResolution,
): Prisma.VehicleUncheckedCreateInput {
  return cleanData<Prisma.VehicleUncheckedCreateInput>({
    code: vehicle.code,
    oldCode: vehicle.oldCode ?? null,
    bravoCode: vehicle.bravoCode ?? null,
    assetCode: vehicle.assetCode ?? null,
    plate: vehicle.plate ?? null,
    purchaseCondition: vehicle.purchaseCondition ?? null,
    name: vehicle.name,
    category: vehicle.category,
    vehicleTypeId,
    assetGroup: vehicle.assetGroup ?? null,
    vehicleSubtype: vehicle.vehicleSubtype ?? null,
    unit: vehicle.unit,
    complexCode: vehicle.complexCode,
    assignedUnitCode: vehicle.assignedUnitCode ?? null,
    managementUnitId: management?.kind === 'MATCHED' ? management.team.id : null,
    regionCode: vehicle.regionCode ?? null,
    allocationDate: vehicle.allocationDate ?? null,
    conditionStatus: vehicle.conditionStatus ?? null,
    transferHistory: vehicle.transferHistory ?? null,
    manufacturer: vehicle.manufacturer ?? null,
    origin: vehicle.origin ?? null,
    manufactureYear: vehicle.manufactureYear ?? null,
    modelName: vehicle.modelName ?? null,
    powerHp: vehicle.powerHp ?? null,
    frameNumber: vehicle.frameNumber ?? null,
    engineNumber: vehicle.engineNumber ?? null,
    fuelQuotaRate: vehicle.fuelQuotaRate ?? null,
    fuelQuotaUnit: vehicle.fuelQuotaUnit,
    fuelTankCapacity: vehicle.fuelTankCapacity ?? null,
    supplier: vehicle.supplier ?? null,
    notes: vehicle.notes ?? null,
    imageUrl: vehicle.imageUrl ?? null,
    technicalSpecs: vehicle.technicalSpecs ?? null,
    dimensions: vehicle.dimensions ?? null,
    productivity: vehicle.productivity ?? null,
    contractStatus: vehicle.contractStatus ?? null,
    companyOwner: vehicle.companyOwner ?? null,
    inspectionDate: vehicle.inspectionDate ?? null,
    inspectionExpiryDate: vehicle.inspectionExpiryDate ?? null,
    nextInspectionDate: vehicle.nextInspectionDate ?? null,
    roadFeeDate: vehicle.roadFeeDate ?? null,
    roadFeeExpiryDate: vehicle.roadFeeExpiryDate ?? null,
    nextRoadFeeDate: vehicle.nextRoadFeeDate ?? null,
    status: management?.kind === 'LIQUIDATED' ? VehicleStatus.TAM_DUNG : vehicle.status,
    totalMachineHours: vehicle.totalMachineHours ?? 0,
    odoKm: vehicle.odoKm ?? 0,
    fuelRateStandard: vehicle.fuelQuotaRate ?? 12.5,
    currentLat: null,
    currentLng: null,
    currentLocationName: vehicle.currentLocationName ?? null,
    lastGpsUpdate: null,
    manufacturerRefId: manufacturerRefId ?? null,
    modelRefId: modelRefId ?? null,
    sourceSheets: vehicle.sourceSheets as Prisma.InputJsonValue,
    importMetadata: {
      sourceRows: vehicle.sourceRows,
      mergedRecordCount: vehicle.recordCount,
    } as Prisma.InputJsonValue,
  });
}

function vehicleUpdateData(
  vehicle: ResolvedVehicle,
  vehicleTypeId: number,
  manufacturerRefId?: number,
  modelRefId?: number,
  management?: ManagementUnitResolution,
): Prisma.VehicleUncheckedUpdateInput {
  const {
    totalMachineHours: _hours,
    odoKm: _odo,
    status: _status,
    currentLat: _currentLat,
    currentLng: _currentLng,
    currentLocationName: _currentLocationName,
    lastGpsUpdate: _lastGpsUpdate,
    ...createData
  } = vehicleCreateData(
    vehicle, vehicleTypeId, manufacturerRefId, modelRefId, management,
  );
  return {
    ...createData,
    managementUnitId: management?.kind === 'MATCHED' ? management.team.id : null,
    ...(management?.kind === 'LIQUIDATED' ? { status: VehicleStatus.TAM_DUNG } : {}),
  };
}

async function loadManagementResolutions(vehicles: ResolvedVehicle[]) {
  const teams = await prisma.driverManagementUnit.findMany({
    where: { complexCode: 'KOUN_MOM', level: 'TEAM', status: 'ACTIVE' },
    select: { id: true, code: true, name: true, parentId: true },
  });
  const byCode = new Map<string, ManagementUnitResolution>();
  const unresolved = new Map<string, { label: string; reason: string; count: number }>();
  let exact = 0;
  let alias = 0;
  let liquidated = 0;
  for (const vehicle of vehicles) {
    const resolution = resolveManagementTeam(vehicle.assignedUnitCode, teams);
    byCode.set(vehicle.code, resolution);
    if (resolution.kind === 'MATCHED') resolution.method === 'EXACT' ? exact++ : alias++;
    else if (resolution.kind === 'LIQUIDATED') liquidated++;
    else {
      const key = `${resolution.reason}:${resolution.source}`;
      const current = unresolved.get(key);
      unresolved.set(key, {
        label: resolution.source,
        reason: resolution.reason,
        count: (current?.count || 0) + 1,
      });
    }
  }
  return {
    byCode,
    report: { exact, alias, liquidated, unresolved: [...unresolved.values()].sort((a, b) => b.count - a.count) },
  };
}

async function findOutOfWorkbookVehicles(sourceCodes: string[]) {
  return prisma.vehicle.findMany({
    where: { complexCode: 'KOUN_MOM', code: { notIn: sourceCodes } },
    select: {
      id: true,
      code: true,
    },
    orderBy: { code: 'asc' },
  });
}

async function upsertVehicleTypes(vehicles: ResolvedVehicle[]): Promise<Map<string, number>> {
  const categories = [...new Set(vehicles.map((vehicle) => vehicle.category))] as VehicleCategory[];
  const sourceLabels = new Map<VehicleCategory, Set<string>>();
  for (const vehicle of vehicles) {
    const labels = sourceLabels.get(vehicle.category) || new Set<string>();
    if (vehicle.vehicleSubtype) labels.add(vehicle.vehicleSubtype);
    sourceLabels.set(vehicle.category, labels);
  }

  for (const category of categories) {
    const metadata = CATEGORY_METADATA[category];
    const isAssignable = metadata.assetGroup !== 'THIET_BI_PHU_TRO';
    await prisma.vehicleType.upsert({
      where: { code: metadata.code },
      create: {
        code: metadata.code,
        name: metadata.name,
        category,
        assetGroup: metadata.assetGroup,
        defaultMaintenanceHours: 250,
        defaultFuelQuotaUnit: metadata.defaultFuelQuotaUnit,
        isAssignable,
        sourceLabels: [...(sourceLabels.get(category) || [])].slice(0, 100),
      },
      update: {
        name: metadata.name,
        category,
        assetGroup: metadata.assetGroup,
        defaultFuelQuotaUnit: metadata.defaultFuelQuotaUnit,
        isAssignable,
        sourceLabels: [...(sourceLabels.get(category) || [])].slice(0, 100),
        active: true,
      },
    });
  }

  const types = await prisma.vehicleType.findMany({
    where: { code: { in: categories } },
    select: { id: true, code: true },
  });
  return new Map(types.map((type) => [type.code, type.id]));
}

/**
 * Seed VehicleManufacturer table from resolved vehicles.
 * Returns a map: canonicalName → id
 */
async function upsertManufacturers(vehicles: ResolvedVehicle[]): Promise<Map<string, number>> {
  const manufacturerOrigins = new Map<string, string | undefined>();
  for (const vehicle of vehicles) {
    if (!vehicle.manufacturer) continue;
    const currentOrigin = manufacturerOrigins.get(vehicle.manufacturer);
    if (!manufacturerOrigins.has(vehicle.manufacturer) || (!currentOrigin && vehicle.origin)) {
      manufacturerOrigins.set(vehicle.manufacturer, vehicle.origin);
    }
  }

  for (const [name, origin] of manufacturerOrigins) {
    await prisma.vehicleManufacturer.upsert({
      where: { name },
      create: {
        name,
        countryName: origin,
      },
      update: {
        ...(origin ? { countryName: origin } : {}),
      },
    });
  }

  const records = await prisma.vehicleManufacturer.findMany({
    select: { id: true, name: true },
  });
  return new Map(records.map((r) => [r.name, r.id]));
}

/**
 * Seed VehicleModel table from resolved vehicles.
 * Returns a map: "manufacturerName::modelName" → id
 */
async function upsertModels(
  vehicles: ResolvedVehicle[],
  manufacturerIds: Map<string, number>,
): Promise<Map<string, number>> {
  const modelSet = new Set<string>();
  for (const vehicle of vehicles) {
    if (!vehicle.modelName || !vehicle.manufacturer) continue;
    const key = `${vehicle.manufacturer}::${vehicle.modelName}`;
    if (modelSet.has(key)) continue;
    modelSet.add(key);

    const manufacturerId = manufacturerIds.get(vehicle.manufacturer);
    if (!manufacturerId) continue;

    await prisma.vehicleModel.upsert({
      where: {
        name_manufacturerId: {
          name: vehicle.modelName,
          manufacturerId,
        },
      },
      create: {
        name: vehicle.modelName,
        manufacturerId,
        categoryHint: vehicle.category,
      },
      update: {},
    });
  }

  const records = await prisma.vehicleModel.findMany({
    include: { manufacturer: { select: { name: true } } },
  });
  return new Map(
    records.map((r) => [`${r.manufacturer.name}::${r.name}`, r.id]),
  );
}

async function importVehicles(vehicles: ResolvedVehicle[]): Promise<{
  inserted: number;
  updated: number;
  databaseVehicleCount: number;
  retainedOutOfWorkbook: string[];
}> {
  const existing = await prisma.vehicle.findMany({
    where: { code: { in: vehicles.map((vehicle) => vehicle.code) } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((vehicle) => vehicle.code));
  const vehicleTypeIds = await upsertVehicleTypes(vehicles);
  const management = await loadManagementResolutions(vehicles);
  const outOfWorkbook = await findOutOfWorkbookVehicles(vehicles.map((vehicle) => vehicle.code));

  // Seed manufacturer & model master data
  console.log('  🏭 Seeding VehicleManufacturer...');
  const manufacturerIds = await upsertManufacturers(vehicles);
  console.log(`     ${manufacturerIds.size} hãng sản xuất`);

  console.log('  📋 Seeding VehicleModel...');
  const modelIds = await upsertModels(vehicles, manufacturerIds);
  console.log(`     ${modelIds.size} model`);

  const batchSize = 100;

  for (let start = 0; start < vehicles.length; start += batchSize) {
    const batch = vehicles.slice(start, start + batchSize);
    await prisma.$transaction(
      batch.map((vehicle) => {
        const vehicleTypeId = vehicleTypeIds.get(vehicle.vehicleTypeCode);
        if (!vehicleTypeId) throw new Error(`Thiếu VehicleType ${vehicle.vehicleTypeCode}`);

        const manufacturerRefId = vehicle.manufacturer
          ? manufacturerIds.get(vehicle.manufacturer)
          : undefined;
        const modelRefId =
          vehicle.manufacturer && vehicle.modelName
            ? modelIds.get(`${vehicle.manufacturer}::${vehicle.modelName}`)
            : undefined;

        return prisma.vehicle.upsert({
          where: { code: vehicle.code },
          create: vehicleCreateData(vehicle, vehicleTypeId, manufacturerRefId, modelRefId, management.byCode.get(vehicle.code)),
          update: vehicleUpdateData(vehicle, vehicleTypeId, manufacturerRefId, modelRefId, management.byCode.get(vehicle.code)),
        });
      }),
    );
  }

  return {
    inserted: vehicles.filter((vehicle) => !existingCodes.has(vehicle.code)).length,
    updated: vehicles.filter((vehicle) => existingCodes.has(vehicle.code)).length,
    databaseVehicleCount: await prisma.vehicle.count({ where: { complexCode: 'KOUN_MOM' } }),
    retainedOutOfWorkbook: outOfWorkbook.map((vehicle) => vehicle.code),
  };
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply');
  const workbookPath = resolve(argumentValue('--file') || findDefaultWorkbook());
  const outputPath = resolve(
    argumentValue('--report') || resolve(process.cwd(), 'import-reports', 'vehicle-import-report.json'),
  );

  const parsed = readVehicleWorkbook(workbookPath);
  const resolved = resolveVehicleIdentities(parsed.records);
  const implementWorkbook = readImplementWorkbook(workbookPath);
  const partitioned = partitionVehicleCandidates(
    resolved.vehicles,
    new Set(implementWorkbook.rows.map((row) => row.code)),
  );
  const vehicles = partitioned.accepted;
  const existing = await prisma.vehicle.findMany({
    where: { code: { in: vehicles.map((vehicle) => vehicle.code) } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((vehicle) => vehicle.code));
  const management = await loadManagementResolutions(vehicles);
  const outOfWorkbook = await findOutOfWorkbookVehicles(vehicles.map((vehicle) => vehicle.code));
  let result = {
    inserted: vehicles.filter((vehicle) => !existingCodes.has(vehicle.code)).length,
    updated: vehicles.filter((vehicle) => existingCodes.has(vehicle.code)).length,
    databaseVehicleCount: await prisma.vehicle.count({ where: { complexCode: 'KOUN_MOM' } }),
    retainedOutOfWorkbook: outOfWorkbook.map((vehicle) => vehicle.code),
  };
  if (!dryRun && partitioned.classificationConflicts.length === 0) result = await importVehicles(vehicles);

  const report: VehicleImportReport = {
    workbook: basename(workbookPath),
    generatedAt: new Date().toISOString(),
    dryRun,
    sheets: parsed.inventory,
    totalWorkbookNonEmptyRows: parsed.inventory.reduce((sum, sheet) => sum + sheet.nonEmptyRows, 0),
    totalRowsRead: parsed.records.length,
    uniqueVehicles: vehicles.length,
    newVehicles: result.inserted,
    updatedVehicles: result.updated,
    inserted: result.inserted,
    updated: result.updated,
    mergedRows: resolved.mergedRows,
    unresolvedRows: resolved.unresolved.length,
    unresolved: resolved.unresolved.map((row) => ({
      sheet: row.sheet,
      row: row.row,
      code: row.code,
      oldCode: row.oldCode,
      bravoCode: row.bravoCode,
      assetCode: row.assetCode,
      plate: row.plate,
      frameNumber: row.frameNumber,
      engineNumber: row.engineNumber,
    })),
    conflicts: resolved.conflicts,
    excludedEquipmentCount: partitioned.excludedEquipment.length,
    excludedEquipment: partitioned.excludedEquipment.map(({ code, name, sourceSheets }) => ({ code, name, sourceSheets })),
    classificationConflicts: partitioned.classificationConflicts.map(({ code, name, sourceSheets }) => ({ code, name, sourceSheets })),
    skippedRows: parsed.skippedRows,
    databaseVehicleCount: result.databaseVehicleCount,
    managementUnits: management.report,
    retainedOutOfWorkbook: result.retainedOutOfWorkbook,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        workbook: report.workbook,
        dryRun: report.dryRun,
        totalRowsRead: report.totalRowsRead,
        uniqueVehicles: report.uniqueVehicles,
        inserted: report.inserted,
        updated: report.updated,
        mergedRows: report.mergedRows,
        unresolvedRows: report.unresolvedRows,
        conflictCount: report.conflicts.length,
        excludedEquipmentCount: report.excludedEquipmentCount,
        classificationConflictCount: report.classificationConflicts.length,
        retainedOutOfWorkbookCount: report.retainedOutOfWorkbook?.length || 0,
        skippedRows: report.skippedRows,
        databaseVehicleCount: report.databaseVehicleCount,
        reportPath: outputPath,
      },
      null,
      2,
    ),
  );
  if (report.classificationConflicts.length) {
    throw new Error(
      `Dừng import vì mã xuất hiện đồng thời ở nguồn xe và thiết bị: ${report.classificationConflicts.map((item) => item.code).join(', ')}`,
    );
  }
}

if (require.main === module) {
  main()
    .catch((error: Error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
