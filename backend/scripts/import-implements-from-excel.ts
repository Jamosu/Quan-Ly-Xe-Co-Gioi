import 'dotenv/config';
import * as XLSX from 'xlsx';
import {
  EquipmentUsageMode,
  ImplementCategory,
  ImplementStatus,
  PrismaClient,
  TechnicalCondition,
  Unit,
  VehicleCategory,
} from '@prisma/client';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { resolveManagementTeam } from './vehicle-import/management-unit-resolution';

const prisma = new PrismaClient();

export interface ExcelImplementRow {
  code: string;
  name: string;
  subType: string;
  unit: string;
  condition: string;
  notes: string;
  brand: string;
  model: string;
  origin: string;
  year: number | null;
  specs: string;
  serial: string;
  fuelQuota: number | null;
  purchaseCondition: string;
}

interface WorkbookContact {
  mgr: string;
  addr: string;
  phone: string;
}

function argumentValue(name: string): string | undefined {
  const direct = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function findDefaultWorkbook(): string {
  for (const directory of [resolve(process.cwd(), 'docs'), resolve(process.cwd(), '..', 'docs')]) {
    if (!existsSync(directory)) continue;
    const file = readdirSync(directory).find(
      (name) => name.startsWith('00.') && name.toUpperCase().includes('KOUN MOM') && name.endsWith('.xlsx'),
    );
    if (file) return resolve(directory, file);
  }
  throw new Error('Không tìm thấy workbook 00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx');
}

function inferCategory(name: string, subType: string): ImplementCategory {
  const text = `${name} ${subType}`.toLowerCase();
  if (/cày|cày|cna|cch/.test(text)) return ImplementCategory.DAN_CAY;
  if (/bừa|bừa|bua/.test(text)) return ImplementCategory.DAN_BUA;
  if (/xới|xới|úp luống|luống|rãnh|rãnh/.test(text)) return ImplementCategory.DAN_XOI;
  if (/phân|vôi|vôi|rải|rải/.test(text)) return ImplementCategory.DAN_RAI_PHAN;
  if (/phun|xịt|khử trùng|bvtv/.test(text)) return ImplementCategory.DAN_PHUN_THUOC;
  return ImplementCategory.RO_MOOC;
}

export function inferUsageMode(raw: ExcelImplementRow): EquipmentUsageMode {
  const code = raw.code.toUpperCase();
  const name = raw.name.toLowerCase();
  if (
    code.startsWith('CHT-CNA-') || code.startsWith('CHT-BDU-') || code.startsWith('CHT-GĐH-') || code.startsWith('CHT-ĐTL-')
    || name.includes('gắn sau') || /^(dàn|giàn|thiết bị|rơ mooc|rơ-moóc|smrm|gầu|búa|đầm|bộ bánh)(\s|$)/i.test(raw.name)
  ) return EquipmentUsageMode.ATTACHABLE;
  if (/^(máy kéo chuối|máy cao áp|máy nổ|cối trộn|súng phun|máy tời)(\s|$)/i.test(raw.name) || /máy băm.*cố định/i.test(raw.name)) {
    return EquipmentUsageMode.STANDALONE;
  }
  return EquipmentUsageMode.UNCLASSIFIED;
}

export function compatibleCategories(raw: ExcelImplementRow, usageMode: EquipmentUsageMode): VehicleCategory[] {
  if (usageMode !== EquipmentUsageMode.ATTACHABLE) return [];
  const code = raw.code.toUpperCase();
  if (code.startsWith('CHT-CNA-')) return [VehicleCategory.MAY_UI];
  if (code.startsWith('CHT-BDU-') || code.startsWith('CHT-GĐH-') || code.startsWith('CHT-ĐTL-')) return [VehicleCategory.MAY_DAO];
  if (code.startsWith('TND-') || /^SMRM(\s|$)/i.test(raw.name)) return [VehicleCategory.XE_CONTAINER];
  return [VehicleCategory.MAY_KEO, VehicleCategory.MAY_CAY];
}

export function deduplicateImplements(rows: ExcelImplementRow[]): ExcelImplementRow[] {
  const unique = new Map<string, ExcelImplementRow>();
  for (const row of rows) {
    const previous = unique.get(row.code);
    if (!previous) {
      unique.set(row.code, row);
      continue;
    }
    if (JSON.stringify(previous) !== JSON.stringify(row)) {
      throw new Error(`Mã thiết bị ${row.code} bị trùng nhưng nội dung khác nhau trong workbook.`);
    }
  }
  return [...unique.values()];
}

export function readImplementWorkbook(workbookPath: string) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const contactRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['TB CG AGRI'], { header: 1, defval: '' });
  const contacts = new Map<string, WorkbookContact>();
  for (let index = 3; index < contactRows.length; index++) {
    const row = contactRows[index];
    const code = String(row?.[9] ?? '').trim();
    if (!code || code === '-' || code.startsWith('KLH')) continue;
    contacts.set(code, {
      mgr: String(row[15] ?? '').trim(),
      addr: String(row[16] ?? '').trim(),
      phone: String(row[17] ?? '').trim(),
    });
  }

  const sheetName = workbook.SheetNames.find((name) => name.includes('03.1'));
  if (!sheetName) throw new Error('Không tìm thấy sheet 03.1 NHÓM TB.');
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
  const parsed: ExcelImplementRow[] = [];
  let currentSubType = 'Nông cụ cơ giới';
  for (let index = 4; index < sheetRows.length; index++) {
    const row = sheetRows[index];
    const col0 = String(row?.[0] ?? '').trim();
    const col1 = String(row?.[1] ?? '').trim();
    if (/^(-|I\.|II\.|III\.|IV\.|V\.)$/.test(col0) && col1 && !/^[CTK]/.test(col1)) {
      currentSubType = col1;
      continue;
    }
    if (!col1 || col1 === '-' || /^(KLH|NHÓM|I\.|II\.|III\.|IV\.|V\.)/.test(col1) || col1.length < 4) continue;
    const name = String(row[5] ?? '').trim();
    if (!name) continue;
    const year = Number(row[16]);
    const fuelQuota = Number(row[19]);
    parsed.push({
      code: col1,
      name,
      subType: currentSubType,
      unit: String(row[7] ?? '').trim(),
      condition: String(row[10] ?? '').trim(),
      notes: String(row[12] ?? '').trim(),
      brand: String(row[13] ?? '').trim(),
      model: String(row[14] ?? '').trim(),
      origin: String(row[15] ?? '').trim(),
      year: Number.isFinite(year) && year > 1980 ? year : null,
      specs: String(row[17] ?? '').trim(),
      serial: String(row[18] ?? '').trim(),
      fuelQuota: Number.isFinite(fuelQuota) && fuelQuota > 0 ? fuelQuota : null,
      purchaseCondition: String(row[4] ?? '').trim(),
    });
  }
  return { sourceRows: parsed.length, rows: deduplicateImplements(parsed), contacts };
}

function conditionFor(raw: ExcelImplementRow) {
  const text = `${raw.condition} ${raw.notes}`.toLowerCase();
  const needsRepair = /hỏng|hỏng|^hư|\shư|xsc|xưởng sc/.test(text);
  return {
    status: needsRepair ? ImplementStatus.MAINTENANCE : ImplementStatus.IN_DEPOT,
    technicalCondition: needsRepair ? TechnicalCondition.NEED_REPAIR : TechnicalCondition.GOOD,
  };
}

function purposeFor(raw: ExcelImplementRow) {
  return [
    raw.unit ? `Đơn vị: ${raw.unit}` : '',
    raw.brand ? `Hãng: ${raw.brand}` : '',
    raw.model ? `Model: ${raw.model}` : '',
    raw.subType ? `Nhóm: ${raw.subType}` : '',
    raw.purchaseCondition ? `Tình trạng mua: ${raw.purchaseCondition}` : '',
    raw.year ? `Năm SX: ${raw.year}` : '',
    raw.notes ? `Ghi chú: ${raw.notes}` : '',
  ].filter(Boolean).join(' · ').slice(0, 191);
}

async function findOutOfWorkbook(sourceCodes: string[]) {
  return prisma.agriculturalImplement.findMany({
    where: { unit: Unit.KOUN_MOM, code: { notIn: sourceCodes } },
    select: {
      id: true,
      code: true,
      _count: { select: {
        attachmentLogs: true,
        dispatchOrders: true,
        transportOrders: true,
        repairTickets: true,
        workshopRequests: true,
        owedPartNotes: true,
        alertEvents: true,
      } },
    },
    orderBy: { code: 'asc' },
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const workbookPath = resolve(argumentValue('--file') || findDefaultWorkbook());
  const reportPath = resolve(argumentValue('--report') || resolve(process.cwd(), 'import-reports', 'implement-import-report.json'));
  const workbook = readImplementWorkbook(workbookPath);
  const teams = await prisma.driverManagementUnit.findMany({
    where: { complexCode: 'KOUN_MOM', level: 'TEAM', status: 'ACTIVE' },
    select: { id: true, code: true, name: true, parentId: true },
  });
  const vehicleTypes = await prisma.vehicleType.findMany({ select: { id: true, category: true } });
  const existingCodes = new Set((await prisma.agriculturalImplement.findMany({
    where: { code: { in: workbook.rows.map((row) => row.code) } }, select: { code: true },
  })).map((item) => item.code));
  const extras = await findOutOfWorkbook(workbook.rows.map((row) => row.code));
  const blocked = extras.filter((item) => Object.values(item._count).some((count) => count > 0));
  if (blocked.length) throw new Error(`Không xóa thiết bị ngoài workbook đang có nghiệp vụ: ${blocked.map((item) => item.code).join(', ')}`);

  const resolutions = workbook.rows.map((row) => ({ row, resolution: resolveManagementTeam(row.unit, teams) }));
  const unresolved = new Map<string, { label: string; reason: string; count: number }>();
  for (const item of resolutions) {
    if (item.resolution.kind !== 'UNRESOLVED') continue;
    const key = `${item.resolution.reason}:${item.resolution.source}`;
    const current = unresolved.get(key);
    unresolved.set(key, { label: item.resolution.source, reason: item.resolution.reason, count: (current?.count || 0) + 1 });
  }

  if (apply) {
    for (let start = 0; start < resolutions.length; start += 50) {
      await prisma.$transaction(resolutions.slice(start, start + 50).map(({ row, resolution }) => {
        const usageMode = inferUsageMode(row);
        const compatibilityIds = vehicleTypes
          .filter((type) => type.category && compatibleCategories(row, usageMode).includes(type.category))
          .map((type) => type.id);
        const contact = workbook.contacts.get(row.code);
        const initialCondition = conditionFor(row);
        const liquidated = resolution.kind === 'LIQUIDATED';
        const staticData = {
          name: row.name,
          category: inferCategory(row.name, row.subType),
          unit: Unit.KOUN_MOM,
          usageMode,
          sourceGroup: row.subType,
          standardPurpose: purposeFor(row),
          managerName: contact?.mgr || null,
          gatheringLocation: contact?.addr || null,
          managerPhone: contact?.phone || null,
          assignedUnitCode: row.unit || null,
          managementUnitId: resolution.kind === 'MATCHED' ? resolution.team.id : null,
        };
        return prisma.agriculturalImplement.upsert({
          where: { code: row.code },
          create: {
            code: row.code,
            ...staticData,
            status: liquidated ? ImplementStatus.MAINTENANCE : initialCondition.status,
            technicalCondition: liquidated ? TechnicalCondition.WORN_OUT : initialCondition.technicalCondition,
            compatibleVehicleTypes: compatibilityIds.length
              ? { create: compatibilityIds.map((vehicleTypeId) => ({ vehicleTypeId, source: 'WORKBOOK_RULE' })) }
              : undefined,
          },
          update: {
            ...staticData,
            ...(liquidated ? { status: ImplementStatus.MAINTENANCE, technicalCondition: TechnicalCondition.WORN_OUT } : {}),
            compatibleVehicleTypes: {
              deleteMany: {},
              ...(compatibilityIds.length ? { create: compatibilityIds.map((vehicleTypeId) => ({ vehicleTypeId, source: 'WORKBOOK_RULE' })) } : {}),
            },
          },
        });
      }));
    }
    if (extras.length) await prisma.agriculturalImplement.deleteMany({ where: { id: { in: extras.map((item) => item.id) } } });
  }

  const report = {
    workbook: basename(workbookPath),
    generatedAt: new Date().toISOString(),
    dryRun: !apply,
    sourceRows: workbook.sourceRows,
    uniqueImplements: workbook.rows.length,
    duplicateRowsMerged: workbook.sourceRows - workbook.rows.length,
    inserted: workbook.rows.filter((row) => !existingCodes.has(row.code)).length,
    updated: workbook.rows.filter((row) => existingCodes.has(row.code)).length,
    removedOutOfWorkbook: extras.map((item) => item.code),
    managementUnits: {
      exact: resolutions.filter((item) => item.resolution.kind === 'MATCHED' && item.resolution.method === 'EXACT').length,
      alias: resolutions.filter((item) => item.resolution.kind === 'MATCHED' && item.resolution.method === 'ALIAS').length,
      liquidated: resolutions.filter((item) => item.resolution.kind === 'LIQUIDATED').length,
      unresolved: [...unresolved.values()].sort((a, b) => b.count - a.count),
    },
    databaseImplementCount: apply
      ? await prisma.agriculturalImplement.count({ where: { unit: Unit.KOUN_MOM } })
      : await prisma.agriculturalImplement.count({ where: { unit: Unit.KOUN_MOM } }),
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
