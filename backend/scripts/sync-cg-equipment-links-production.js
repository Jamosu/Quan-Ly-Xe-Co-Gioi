// Synchronize vehicle/implement organization fields by unique asset code.
// Local MySQL is the source of truth. Dry-run by default; --apply writes Aiven.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

const backendDir = path.resolve(__dirname, '..');
const localUrl = dotenv.parse(fs.readFileSync(path.join(backendDir, '.env'))).DATABASE_URL;
const productionUrl = dotenv.parse(fs.readFileSync(path.join(backendDir, '.env.production'))).DATABASE_URL;
if (!localUrl || !productionUrl || localUrl === productionUrl) throw new Error('Cần hai DATABASE_URL khác nhau.');
const local = new PrismaClient({ datasources: { db: { url: localUrl } } });
const production = new PrismaClient({ datasources: { db: { url: productionUrl } } });
const key = (row) => `${row.complexCode}|${row.code}`;
const same = (a, b) => a === b || (a == null && b == null);

function assertUnique(rows, label) {
  const codes = new Set(rows.map((row) => row.code));
  if (codes.size !== rows.length) throw new Error(`Mã ${label} bị trùng; dừng đồng bộ.`);
  return new Map(rows.map((row) => [row.code, row]));
}

function plan(sourceRows, targetRows, sourceUnits, targetUnits, fields, label) {
  const sourceByCode = assertUnique(sourceRows, `${label} local`);
  assertUnique(targetRows, `${label} production`);
  const changes = [];
  let productionOnly = 0;
  let differentNames = 0;
  let movedComplex = 0;
  for (const target of targetRows) {
    const source = sourceByCode.get(target.code);
    if (!source) { productionOnly++; continue; }
    if (source.name !== target.name) differentNames++;
    const sourceUnit = source.managementUnitId ? sourceUnits.get(source.managementUnitId) : null;
    if (source.managementUnitId && (!sourceUnit || sourceUnit.status !== 'ACTIVE')) throw new Error(`Đơn vị local không ACTIVE cho ${label} ${source.code}.`);
    const targetUnit = sourceUnit ? targetUnits.get(key(sourceUnit)) : null;
    if (sourceUnit && (!targetUnit || targetUnit.status !== 'ACTIVE')) throw new Error(`Thiếu đơn vị production cho ${label} ${source.code}.`);
    if (sourceUnit && sourceUnit.complexCode !== (source.complexCode || source.unit)) throw new Error(`KLH local không khớp đơn vị của ${label} ${source.code}.`);
    const desired = Object.fromEntries(fields.map((field) => [field, field === 'managementUnitId' ? targetUnit?.id ?? null : source[field]]));
    if (fields.every((field) => same(target[field], desired[field]))) continue;
    if ('complexCode' in desired && target.complexCode !== desired.complexCode) movedComplex++;
    changes.push({ code: target.code, before: Object.fromEntries(fields.map((field) => [field, target[field]])), after: desired });
  }
  return { label, changes, sourceTotal: sourceRows.length, productionTotal: targetRows.length,
    localOnly: sourceRows.length - (targetRows.length - productionOnly), productionOnly, differentNames, movedComplex };
}

async function updateBatches(tx, table, fields, changes) {
  for (let start = 0; start < changes.length; start += 100) {
    const batch = changes.slice(start, start + 100);
    const params = [];
    const assignments = fields.map((field) => {
      const cases = batch.map((change) => { params.push(change.code, change.after[field]); return 'WHEN ? THEN ?'; }).join(' ');
      return `\`${field}\` = CASE \`code\` ${cases} ELSE \`${field}\` END`;
    });
    params.push(...batch.map((change) => change.code));
    const sql = `UPDATE \`${table}\` SET ${assignments.join(', ')} WHERE \`code\` IN (${batch.map(() => '?').join(', ')})`;
    const updated = await tx.$executeRawUnsafe(sql, ...params);
    if (updated !== batch.length) throw new Error(`Số ${table} cập nhật không khớp: ${updated}/${batch.length}.`);
  }
}

async function main() {
  const [localUnits, productionUnits, localVehicles, productionVehicles, localImplements, productionImplements] = await Promise.all([
    local.driverManagementUnit.findMany({ select: { id: true, code: true, complexCode: true, status: true } }),
    production.driverManagementUnit.findMany({ select: { id: true, code: true, complexCode: true, status: true } }),
    local.vehicle.findMany(),
    production.vehicle.findMany({ select: { code: true, name: true, plate: true, complexCode: true, unit: true, assignedUnitCode: true, managementUnitId: true } }),
    local.agriculturalImplement.findMany({ select: { code: true, name: true, unit: true, assignedUnitCode: true, managementUnitId: true } }),
    production.agriculturalImplement.findMany({ select: { code: true, name: true, unit: true, assignedUnitCode: true, managementUnitId: true } }),
  ]);
  const localUnitsById = new Map(localUnits.map((row) => [row.id, row]));
  const productionUnitsByKey = new Map(productionUnits.map((row) => [key(row), row]));
  const vehicles = plan(localVehicles, productionVehicles, localUnitsById, productionUnitsByKey,
    ['complexCode', 'unit', 'assignedUnitCode', 'managementUnitId'], 'xe');
  const productionVehicleCodes = new Set(productionVehicles.map((row) => row.code));
  const productionPlates = new Set(productionVehicles.map((row) => row.plate).filter(Boolean));
  const newVehicles = localVehicles.filter((row) => !productionVehicleCodes.has(row.code));
  for (const vehicle of newVehicles) {
    if (vehicle.plate && productionPlates.has(vehicle.plate)) throw new Error(`Trùng biển số production cho mã mới ${vehicle.code}.`);
    if (['manufacturerRefId', 'modelRefId', 'defaultDriverId', 'secondaryDriverId', 'homeDepotId'].some((field) => vehicle[field] != null)) {
      throw new Error(`Xe mới ${vehicle.code} có FK chưa được ánh xạ; dừng đồng bộ.`);
    }
  }
  const [localTypes, productionTypes] = await Promise.all([
    local.vehicleType.findMany({ select: { id: true, code: true } }),
    production.vehicleType.findMany({ select: { id: true, code: true } }),
  ]);
  const localTypesById = new Map(localTypes.map((row) => [row.id, row]));
  const productionTypesByCode = new Map(productionTypes.map((row) => [row.code, row]));
  const newVehicleData = newVehicles.map(({ id, vehicleTypeId, managementUnitId, ...row }) => {
    const sourceUnit = localUnitsById.get(managementUnitId);
    const targetUnit = sourceUnit && productionUnitsByKey.get(key(sourceUnit));
    const sourceType = localTypesById.get(vehicleTypeId);
    const targetType = sourceType && productionTypesByCode.get(sourceType.code);
    if (!targetUnit || targetUnit.status !== 'ACTIVE' || !targetType || sourceUnit.complexCode !== row.complexCode) {
      throw new Error(`Thiếu ánh xạ loại xe/đơn vị production cho mã mới ${row.code}.`);
    }
    return { ...row, vehicleTypeId: targetType.id, managementUnitId: targetUnit.id };
  });
  const implementsResult = plan(localImplements, productionImplements, localUnitsById, productionUnitsByKey,
    ['unit', 'assignedUnitCode', 'managementUnitId'], 'thiết bị');
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    vehicles: { ...vehicles, changes: vehicles.changes.length, toCreate: newVehicleData.length }, implements: { ...implementsResult, changes: implementsResult.changes.length },
  }, (name, value) => name === 'changes' && Array.isArray(value) ? undefined : value, 2));
  if (!process.argv.includes('--apply')) return;
  const outputDir = path.resolve(backendDir, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const snapshotPath = path.join(outputDir, `cg-equipment-links-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify({ vehicles: vehicles.changes, implements: implementsResult.changes, newVehicleCodes: newVehicles.map((row) => row.code) }, null, 2));
  await production.$transaction(async (tx) => {
    await updateBatches(tx, 'vehicles', ['complexCode', 'unit', 'assignedUnitCode', 'managementUnitId'], vehicles.changes);
    await updateBatches(tx, 'agricultural_implements', ['unit', 'assignedUnitCode', 'managementUnitId'], implementsResult.changes);
    if (newVehicleData.length) await tx.vehicle.createMany({ data: newVehicleData });
  }, { timeout: 120000 });
  console.log(JSON.stringify({ applied: true, snapshotPath, vehiclesUpdated: vehicles.changes.length, vehiclesCreated: newVehicleData.length, implementsUpdated: implementsResult.changes.length }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { await local.$disconnect(); await production.$disconnect(); });
