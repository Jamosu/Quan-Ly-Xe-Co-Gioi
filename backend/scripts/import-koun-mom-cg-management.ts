import 'dotenv/config';
import * as XLSX from 'xlsx';
import {
  DriverManagementUnit,
  ManagementUnitManagerType,
  OperationalLocationType,
  PrismaClient,
  Role,
  Unit,
  User,
} from '@prisma/client';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const prisma = new PrismaClient();
const COMPLEX_CODE = 'KOUN_MOM';

export interface CgManagementSourceRow {
  sourceRow: number;
  unitName: string;
  managerName?: string;
  phone?: string;
  location?: string;
}

export const normalize = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .trim()
  .replace(/\s+/g, ' ')
  .toUpperCase();

const digits = (value?: string | null) => (value || '').replace(/\D/g, '');

export const businessCode = (prefix: string, value: string) => `${prefix}-${normalize(value)
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')}`;

function defaultWorkbook(): string {
  for (const directory of [resolve(process.cwd(), 'docs'), resolve(process.cwd(), '..', 'docs')]) {
    if (!existsSync(directory)) continue;
    const name = readdirSync(directory).find((item) => item.startsWith('00.') && item.toUpperCase().includes('KOUN MOM') && item.endsWith('.xlsx'));
    if (name) return resolve(directory, name);
  }
  throw new Error('Không tìm thấy file 00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx');
}

export function readSourceRows(workbookPath = defaultWorkbook()): CgManagementSourceRow[] {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => normalize(name).includes('NS QUAN LY CG'));
  if (!sheetName) throw new Error('Không tìm thấy sheet NS QUẢN LÝ CG.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
  const headerIndex = rows.findIndex((row) => normalize(row[0]).includes('DON VI') && normalize(row[1]).includes('HO & TEN'));
  if (headerIndex < 0) throw new Error('Không tìm thấy dòng tiêu đề ĐƠN VỊ / HỌ & TÊN.');
  return rows.slice(headerIndex + 1).flatMap((row, index) => {
    const unitName = String(row[0] ?? '').trim();
    if (!unitName) return [];
    return [{
      sourceRow: headerIndex + index + 2,
      unitName,
      managerName: String(row[1] ?? '').trim() || undefined,
      phone: String(row[2] ?? '').trim() || undefined,
      location: String(row[3] ?? '').trim() || undefined,
    }];
  });
}

export function summarize(rows: CgManagementSourceRow[]) {
  return {
    teams: rows.length,
    withManager: rows.filter((row) => row.managerName).length,
    withoutManager: rows.filter((row) => !row.managerName).length,
    locations: new Set(rows.flatMap((row) => row.location ? [normalize(row.location)] : [])).size,
    blankUnits: rows.filter((row) => !row.managerName && !row.location).map((row) => normalize(row.unitName)).sort(),
  };
}

type ExistingUnit = Pick<DriverManagementUnit, 'id' | 'code' | 'name' | 'complexCode'>;
type ExistingUser = Pick<User, 'id' | 'fullName' | 'phone'>;

function resolveUnit(row: CgManagementSourceRow, units: ExistingUnit[]): ExistingUnit {
  const matches = units.filter((unit) => normalize(unit.name) === normalize(row.unitName));
  if (matches.length !== 1) {
    throw new Error(`Đơn vị Excel dòng ${row.sourceRow} "${row.unitName}" khớp ${matches.length} đơn vị ACTIVE tại KOUN_MOM; không tự tạo hoặc chọn thay.`);
  }
  return matches[0];
}

function resolveManager(row: CgManagementSourceRow, users: ExistingUser[]): ExistingUser | undefined {
  if (!row.managerName) return undefined;
  const phone = digits(row.phone);
  const phoneMatches = phone ? users.filter((user) => digits(user.phone) === phone) : [];
  if (phoneMatches.length === 1) return phoneMatches[0];
  if (phoneMatches.length > 1) return undefined;
  const nameMatches = users.filter((user) => normalize(user.fullName) === normalize(row.managerName));
  return nameMatches.length === 1 ? nameMatches[0] : undefined;
}

async function loadResolution(rows: CgManagementSourceRow[]) {
  const [units, users, vehicles] = await Promise.all([
    prisma.driverManagementUnit.findMany({
      where: { complexCode: COMPLEX_CODE, status: 'ACTIVE' },
      select: { id: true, code: true, name: true, complexCode: true },
    }),
    prisma.user.findMany({
      where: { unit: Unit.KOUN_MOM },
      select: { id: true, fullName: true, phone: true },
    }),
    prisma.vehicle.findMany({
      where: { unit: Unit.KOUN_MOM },
      select: { id: true, assignedUnitCode: true },
    }),
  ]);
  const resolvedRows = rows.map((row) => ({
    row,
    unit: resolveUnit(row, units),
    manager: resolveManager(row, users),
  }));
  const rowByUnitName = new Map(resolvedRows.map((item) => [normalize(item.row.unitName), item]));
  const unmatchedVehicleUnits = [...vehicles.reduce((counts, vehicle) => {
    const key = normalize(vehicle.assignedUnitCode);
    if (!key || rowByUnitName.has(key)) return counts;
    counts.set(vehicle.assignedUnitCode!, (counts.get(vehicle.assignedUnitCode!) || 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()].map(([unitName, vehicleCount]) => ({ unitName, vehicleCount }));
  return { units, users, vehicles, resolvedRows, rowByUnitName, unmatchedVehicleUnits };
}

async function applyImport(rows: CgManagementSourceRow[]) {
  const resolution = await loadResolution(rows);
  const admin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN, isActive: true }, select: { id: true } });
  if (!admin) throw new Error('Cần một SUPER_ADMIN đang hoạt động để ghi lịch sử phân công quản lý.');

  const report = {
    ...summarize(rows),
    linkedVehicles: 0,
    linkedManagers: 0,
    endedSyntheticAssignments: 0,
    deactivatedDuplicateUnits: 0,
    deletedInvalidLp4Units: 0,
    clearedInvalidLp4VehicleLinks: 0,
    clearedInvalidLp4ImplementLinks: 0,
    clearedSyntheticVehicleManagers: 0,
    unresolvedManagers: resolution.resolvedRows
      .filter((item) => item.row.managerName && !item.manager)
      .map((item) => ({ sourceRow: item.row.sourceRow, unitName: item.row.unitName, managerName: item.row.managerName, phone: item.row.phone })),
    unmatchedVehicleUnits: resolution.unmatchedVehicleUnits,
  };

  await prisma.$transaction(async (tx) => {
    const depotByName = new Map<string, number>();
    for (const item of resolution.resolvedRows) {
      const { row, unit } = item;
      let depotId: number | null = null;
      if (row.location) {
        const existing = await tx.operationalLocation.findUnique({
          where: { name_complexCode: { name: row.location, complexCode: COMPLEX_CODE } },
        });
        const depot = existing
          ? await tx.operationalLocation.update({
              where: { id: existing.id },
              data: { type: OperationalLocationType.DEPOT, unit: Unit.KOUN_MOM, active: true, address: row.location },
            })
          : await tx.operationalLocation.create({
              data: {
                code: businessCode('DEPOT-KM', row.location),
                name: row.location,
                type: OperationalLocationType.DEPOT,
                unit: Unit.KOUN_MOM,
                complexCode: COMPLEX_CODE,
                address: row.location,
                active: true,
              },
            });
        depotId = depot.id;
        depotByName.set(normalize(row.location), depot.id);
      }
      await tx.driverManagementUnit.update({ where: { id: unit.id }, data: { mainDepotId: depotId } });

      if (!row.managerName) {
        const synthetic = await tx.managementUnitManagerAssignment.findMany({
          where: { managementUnitId: unit.id, effectiveTo: null, legacyCatalogId: { startsWith: 'CGM-KM-' } },
          select: { id: true },
        });
        if (synthetic.length) {
          await tx.managementUnitManagerAssignment.updateMany({
            where: { id: { in: synthetic.map((assignment) => assignment.id) } },
            data: { effectiveTo: new Date(), reason: `Excel dòng ${row.sourceRow} không có nhân sự quản lý.` },
          });
          report.endedSyntheticAssignments += synthetic.length;
        }
        continue;
      }
      if (!item.manager) continue;

      const current = await tx.managementUnitManagerAssignment.findFirst({
        where: {
          managementUnitId: unit.id,
          managerType: ManagementUnitManagerType.PRIMARY,
          effectiveTo: null,
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (current) {
        if (current.managerUserId !== item.manager.id) {
          await tx.managementUnitManagerAssignment.update({
            where: { id: current.id },
            data: { managerUserId: item.manager.id, reason: `Đối soát Excel dòng ${row.sourceRow}.` },
          });
        }
      } else {
        await tx.managementUnitManagerAssignment.create({
          data: {
            managementUnitId: unit.id,
            managerUserId: item.manager.id,
            managerType: ManagementUnitManagerType.PRIMARY,
            effectiveFrom: new Date(),
            assignedById: admin.id,
            reason: `Đối soát Excel dòng ${row.sourceRow}.`,
          },
        });
      }
      report.linkedManagers += 1;
    }

    for (const vehicle of resolution.vehicles) {
      const source = resolution.rowByUnitName.get(normalize(vehicle.assignedUnitCode));
      if (!source) continue;
      const homeDepotId = source.row.location ? depotByName.get(normalize(source.row.location)) ?? null : null;
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: {
          assignedUnitCode: source.row.unitName,
          managementUnitId: source.unit.id,
          homeDepotId,
          managerName: source.row.managerName ?? null,
          managerPhone: source.row.phone ?? null,
        },
      });
      report.linkedVehicles += 1;
    }

    // LP4 appears in historical asset sheets, but is not a management unit in
    // the authoritative NS QUẢN LÝ CG roster. Preserve the raw asset label while
    // removing the synthetic management links and invented manager data.
    const invalidLp4Names = new Set(['XN CHUOI LP4', 'XN LP4']);
    const invalidLp4Vehicles = await tx.vehicle.findMany({
      where: { unit: Unit.KOUN_MOM, assignedUnitCode: { not: null } },
      select: { id: true, assignedUnitCode: true, managementUnitId: true, managerName: true, managerPhone: true },
    });
    const invalidLp4VehicleIds = invalidLp4Vehicles
      .filter((vehicle) => invalidLp4Names.has(normalize(vehicle.assignedUnitCode)))
      .map((vehicle) => vehicle.id);
    if (invalidLp4VehicleIds.length) {
      const result = await tx.vehicle.updateMany({
        where: { id: { in: invalidLp4VehicleIds } },
        data: { managementUnitId: null, managerName: null, managerPhone: null },
      });
      report.clearedInvalidLp4VehicleLinks = result.count;
    }

    const invalidLp4Implements = await tx.agriculturalImplement.findMany({
      where: { assignedUnitCode: { not: null } },
      select: { id: true, assignedUnitCode: true },
    });
    const invalidLp4ImplementIds = invalidLp4Implements
      .filter((item) => invalidLp4Names.has(normalize(item.assignedUnitCode)))
      .map((item) => item.id);
    if (invalidLp4ImplementIds.length) {
      const result = await tx.agriculturalImplement.updateMany({
        where: { id: { in: invalidLp4ImplementIds } },
        data: { managementUnitId: null },
      });
      report.clearedInvalidLp4ImplementLinks = result.count;
    }

    const invalidLp4Units = await tx.driverManagementUnit.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            children: true,
            vehicles: true,
            implements: true,
            managerAssignments: true,
            ownerAssignments: true,
            teamAssignments: true,
            accessScopes: true,
            workOrders: true,
            alertEvents: true,
          },
        },
      },
    });
    const invalidLp4UnitIds = invalidLp4Units
      .filter((unit) => invalidLp4Names.has(normalize(unit.name)))
      .filter((unit) => Object.values(unit._count).every((count) => count === 0))
      .map((unit) => unit.id);
    if (invalidLp4UnitIds.length) {
      const result = await tx.driverManagementUnit.deleteMany({
        where: { id: { in: invalidLp4UnitIds } },
      });
      report.deletedInvalidLp4Units = result.count;
    }

    const syntheticManagerNames = new Set([
      'NGUYEN VAN A',
      'NGUYEN VAN B',
      'TRAN VAN C',
      'LE VAN D',
      'NGUYEN VAN E',
      'PHAM VAN F',
      'TRAN VAN G',
      'NGUYEN VAN H',
      'LE VAN I',
      'TRAN VAN J',
      'NGUYEN VAN K',
    ]);
    const syntheticManagerVehicleIds = (await tx.vehicle.findMany({
      where: { unit: Unit.KOUN_MOM, managerName: { not: null } },
      select: { id: true, managerName: true },
    }))
      .filter((vehicle) => syntheticManagerNames.has(normalize(vehicle.managerName)))
      .map((vehicle) => vehicle.id);
    if (syntheticManagerVehicleIds.length) {
      const result = await tx.vehicle.updateMany({
        where: { id: { in: syntheticManagerVehicleIds } },
        data: { managerName: null, managerPhone: null },
      });
      report.clearedSyntheticVehicleManagers = result.count;
    }

    const canonicalUnitIds = resolution.resolvedRows.map((item) => item.unit.id);
    const safeDuplicates = await tx.driverManagementUnit.findMany({
      where: {
        status: 'ACTIVE',
        id: { notIn: canonicalUnitIds },
        vehicles: { none: {} },
        implements: { none: {} },
        children: { none: {} },
        managerAssignments: { none: {} },
        ownerAssignments: { none: {} },
        teamAssignments: { none: {} },
        accessScopes: { none: {} },
        workOrders: { none: {} },
        alertEvents: { none: {} },
      },
      select: { id: true, name: true },
    });
    const sourceNames = new Set(rows.map((row) => normalize(row.unitName)));
    const duplicateIds = safeDuplicates.filter((unit) => sourceNames.has(normalize(unit.name))).map((unit) => unit.id);
    if (duplicateIds.length) {
      const result = await tx.driverManagementUnit.updateMany({ where: { id: { in: duplicateIds } }, data: { status: 'INACTIVE' } });
      report.deactivatedDuplicateUnits = result.count;
    }
  }, { timeout: 120_000, maxWait: 20_000 });

  return report;
}

function assertSource(rows: CgManagementSourceRow[]) {
  const summary = summarize(rows);
  const expectedBlankUnits = [
    'BAN CG-CK & SXCN',
    'Thadicons A&I',
    'Thagricons',
    'XN Chuối DP4',
    'XN Chuối LP2',
    'Xưởng Cơ khí DP',
  ].map(normalize).sort();
  if (
    summary.teams !== 27
    || summary.withManager !== 21
    || summary.withoutManager !== 6
    || summary.locations !== 18
    || JSON.stringify(summary.blankUnits) !== JSON.stringify(expectedBlankUnits)
    || rows.some((row) => ['XN CHUOI LP4', 'XN LP4'].includes(normalize(row.unitName)))
  ) {
    throw new Error(`Dữ liệu nguồn không đúng kiểm soát: ${JSON.stringify(summary)}`);
  }
}

async function main() {
  const workbookArg = process.argv.find((arg) => arg.startsWith('--file='))?.slice('--file='.length);
  const reportArg = process.argv.find((arg) => arg.startsWith('--report='))?.slice('--report='.length);
  const rows = readSourceRows(workbookArg ? resolve(workbookArg) : undefined);
  assertSource(rows);
  const resolution = await loadResolution(rows);
  const preview = {
    ...summarize(rows),
    matchedVehicles: resolution.vehicles.length - resolution.unmatchedVehicleUnits.reduce((sum, item) => sum + item.vehicleCount, 0),
    unresolvedManagers: resolution.resolvedRows
      .filter((item) => item.row.managerName && !item.manager)
      .map((item) => ({ sourceRow: item.row.sourceRow, unitName: item.row.unitName, managerName: item.row.managerName, phone: item.row.phone })),
    unmatchedVehicleUnits: resolution.unmatchedVehicleUnits,
  };
  const result = process.argv.includes('--apply')
    ? { mode: 'applied', ...(await applyImport(rows)) }
    : { mode: 'dry-run', ...preview };
  const reportPath = resolve(reportArg || resolve(process.cwd(), 'import-reports', 'cg-management-report.json'));
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ ...result, reportPath }, null, 2));
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
