// One-time, additive sync of the active management directory from local MySQL.
// Dry-run by default. Run with --apply only after reviewing the printed counts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { PrismaClient, Role, Unit } = require('@prisma/client');

const backendDir = path.resolve(__dirname, '..');
const sourceUrl = dotenv.parse(fs.readFileSync(path.join(backendDir, '.env'))).DATABASE_URL;
const targetUrl = dotenv.parse(fs.readFileSync(path.join(backendDir, '.env.production'))).DATABASE_URL;
if (!sourceUrl || !targetUrl || sourceUrl === targetUrl) throw new Error('Cần hai DATABASE_URL khác nhau.');

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });
const key = (row) => `${row.complexCode}|${row.code}`;
const depotKey = (row) => `${row.complexCode}|${row.name}`;
const outputDir = path.resolve(backendDir, '..', 'output');

async function load() {
  const now = new Date();
  const [units, depots, assignments, targetUnits, targetDepots, targetUsers] = await Promise.all([
    source.driverManagementUnit.findMany({ where: { status: 'ACTIVE' }, orderBy: [{ level: 'asc' }, { complexCode: 'asc' }, { code: 'asc' }] }),
    source.operationalLocation.findMany({ where: { type: 'DEPOT', active: true } }),
    source.managementUnitManagerAssignment.findMany({
      where: { managementUnit: { status: 'ACTIVE' }, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      include: { managementUnit: { select: { complexCode: true, code: true } }, manager: true },
    }),
    target.driverManagementUnit.findMany(),
    target.operationalLocation.findMany({ where: { type: 'DEPOT' } }),
    target.user.findMany({ select: { id: true, code: true, username: true } }),
  ]);
  const unitById = new Map(units.map((row) => [row.id, row]));
  for (const unit of units) {
    if (unit.level === 'TEAM' && (!unit.parentId || !unitById.has(unit.parentId))) {
      throw new Error(`Thiếu đơn vị cha ACTIVE cho ${key(unit)}.`);
    }
  }
  const sourceKeys = new Set(units.map(key));
  const targetByKey = new Map(targetUnits.map((row) => [key(row), row]));
  for (const unit of units) {
    const existing = targetByKey.get(key(unit));
    if (existing && existing.status !== 'ACTIVE') throw new Error(`Mã ${key(unit)} đã tồn tại nhưng INACTIVE trên production.`);
  }
  const people = [...new Map(assignments.map((row) => [row.manager.code, row.manager])).values()];
  const targetByCode = new Map(targetUsers.map((row) => [row.code, row]));
  const targetByUsername = new Map(targetUsers.map((row) => [row.username, row]));
  for (const person of people) {
    if (person.role !== Role.FARM_MANAGER) throw new Error(`User ${person.code} không phải FARM_MANAGER.`);
    if (targetByCode.has(person.code) && targetByCode.get(person.code).username !== person.username) throw new Error(`Trùng mã nhân sự ${person.code}.`);
    if (targetByUsername.has(person.username) && targetByUsername.get(person.username).code !== person.code) throw new Error(`Trùng username ${person.username}.`);
  }
  const existingDepots = new Map(targetDepots.map((row) => [depotKey(row), row]));
  const targetDepotCodes = new Map(targetDepots.map((row) => [row.code, row]));
  for (const depot of depots) {
    if (!existingDepots.has(depotKey(depot)) && targetDepotCodes.has(depot.code)) throw new Error(`Trùng mã bãi xe ${depot.code}.`);
  }
  const sourceDepotIds = new Set(depots.map((row) => row.id));
  for (const unit of units) {
    if (unit.mainDepotId && !sourceDepotIds.has(unit.mainDepotId)) throw new Error(`Thiếu bãi xe ACTIVE cho ${key(unit)}.`);
  }
  return {
    units, depots, assignments, people, targetUnits, targetDepots, unitById,
    targetByKey, existingDepots,
    newUnits: units.filter((row) => !targetByKey.has(key(row))),
    oldUnits: targetUnits.filter((row) => row.status === 'ACTIVE' && !sourceKeys.has(key(row))),
    newDepots: depots.filter((row) => !existingDepots.has(depotKey(row))),
    newPeople: people.filter((row) => !targetByCode.has(row.code)),
  };
}

async function assertOldUnitsUnreferenced(oldUnits) {
  if (!oldUnits.length) return;
  const references = [
    ['vehicles', 'managementUnitId'], ['agricultural_implements', 'managementUnitId'],
    ['alert_events', 'managementUnitId'], ['operational_work_orders', 'managementUnitId'],
    ['driver_management_assignments', 'managementUnitId'], ['driver_management_assignments', 'teamUnitId'],
    ['driver_management_access_scopes', 'managementUnitId'], ['management_unit_manager_assignments', 'managementUnitId'],
    ['driver_management_units', 'parentId'],
  ];
  const ids = oldUnits.map((row) => row.id);
  for (const [table, column] of references) {
    const rows = await target.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${column}\` IN (${ids.map(() => '?').join(',')})`, ...ids);
    if (Number(rows[0].n)) throw new Error(`Đơn vị cũ còn được tham chiếu tại ${table}.${column}; dừng đồng bộ.`);
  }
}

async function main() {
  const data = await load();
  await assertOldUnitsUnreferenced(data.oldUnits);
  const summary = {
    sourceActiveOwners: data.units.filter((row) => row.level === 'OWNER').length,
    sourceActiveTeams: data.units.filter((row) => row.level === 'TEAM').length,
    productionOldUnitsToDeactivate: data.oldUnits.length,
    unitsToCreate: data.newUnits.length,
    depotsToCreate: data.newDepots.length,
    managerAccountsToCreate: data.newPeople.length,
    activeManagerAssignments: data.assignments.length,
  };
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', ...summary }, null, 2));
  if (!process.argv.includes('--apply')) return;

  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotPath = path.join(outputDir, `cg-production-before-${stamp}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify({ units: data.targetUnits, depots: data.targetDepots }, null, 2));

  const credentials = await Promise.all(data.newPeople.map(async (person) => {
    const password = crypto.randomBytes(18).toString('base64url');
    return { person, password, passwordHash: await bcrypt.hash(password, 10) };
  }));
  const demoHash = await bcrypt.hash('123', 10);
  const admin = await target.user.findUnique({ where: { username: 'admin' }, select: { id: true, role: true } });
  if (!admin || admin.role !== Role.SUPER_ADMIN) throw new Error('Không có admin production hợp lệ.');

  await target.$transaction(async (tx) => {
    await tx.driverManagementUnit.updateMany({ where: { id: { in: data.oldUnits.map((row) => row.id) } }, data: { status: 'INACTIVE' } });
    const depotIds = new Map(data.targetDepots.map((row) => [depotKey(row), row.id]));
    for (const depot of data.newDepots) {
      const created = await tx.operationalLocation.create({ data: {
        code: depot.code, name: depot.name, type: depot.type, unit: depot.unit,
        complexCode: depot.complexCode, enterpriseCode: depot.enterpriseCode,
        regionName: depot.regionName, address: depot.address, lat: depot.lat,
        lng: depot.lng, geofenceRadiusM: depot.geofenceRadiusM, active: depot.active,
      } });
      depotIds.set(depotKey(depot), created.id);
    }
    const unitIds = new Map(data.targetUnits.map((row) => [key(row), row.id]));
    const sourceDepotsById = new Map(data.depots.map((row) => [row.id, row]));
    for (const level of ['OWNER', 'TEAM']) {
      for (const unit of data.units.filter((row) => row.level === level)) {
        if (unitIds.has(key(unit))) continue;
        const parent = unit.parentId ? data.unitById.get(unit.parentId) : null;
        const depot = unit.mainDepotId ? sourceDepotsById.get(unit.mainDepotId) : null;
        const created = await tx.driverManagementUnit.create({ data: {
          complexCode: unit.complexCode, code: unit.code, name: unit.name,
          level: unit.level, unitType: unit.unitType, status: unit.status,
          parentId: parent ? unitIds.get(key(parent)) : null,
          mainDepotId: depot ? depotIds.get(depotKey(depot)) || null : null,
          description: unit.description, managerName: unit.managerName, managerPhone: unit.managerPhone,
        } });
        unitIds.set(key(unit), created.id);
      }
    }
    const userIds = new Map((await tx.user.findMany({ select: { id: true, code: true } })).map((row) => [row.code, row.id]));
    for (const { person, passwordHash } of credentials) {
      const created = await tx.user.create({ data: {
        code: person.code, username: person.username, fullName: person.fullName,
        phone: person.phone, role: Role.FARM_MANAGER, unit: person.unit,
        passwordHash, isActive: person.isActive,
      } });
      userIds.set(person.code, created.id);
    }
    for (const assignment of data.assignments) {
      const unitId = unitIds.get(key(assignment.managementUnit));
      const managerId = userIds.get(assignment.manager.code);
      const existing = await tx.managementUnitManagerAssignment.findFirst({
        where: { managementUnitId: unitId, managerUserId: managerId, effectiveTo: null },
      });
      if (!existing) await tx.managementUnitManagerAssignment.create({ data: {
        managementUnitId: unitId, managerUserId: managerId, managerType: assignment.managerType,
        effectiveFrom: assignment.effectiveFrom, effectiveTo: assignment.effectiveTo,
        assignedById: admin.id, reason: 'Đồng bộ danh mục quản lý từ local ngày 2026-09-23.',
      } });
      const scope = await tx.driverManagementAccessScope.findFirst({ where: {
        userId: managerId, complexCode: assignment.managementUnit.complexCode, managementUnitId: unitId,
      } });
      if (!scope) await tx.driverManagementAccessScope.create({ data: {
        userId: managerId, complexCode: assignment.managementUnit.complexCode, managementUnitId: unitId,
        canManageCatalog: true, canAssignDrivers: true, isManagerProjection: true, grantedById: admin.id,
      } });
    }
    const demoAdmin = await tx.user.findUnique({ where: { username: 'quanly.toanhe' } });
    if (demoAdmin && (demoAdmin.code !== 'QLTH-DEMO' || demoAdmin.role !== Role.SUPER_ADMIN)) throw new Error('Tài khoản quanly.toanhe bị trùng.');
    if (!demoAdmin) await tx.user.create({ data: {
      code: 'QLTH-DEMO', username: 'quanly.toanhe', fullName: 'Nhân sự quản lý toàn hệ thống',
      passwordHash: demoHash, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH, isActive: true,
    } });
    const demoManager = await tx.user.findUnique({ where: { username: 'quanly.kounmom' } });
    if (!demoManager || demoManager.role !== Role.FARM_MANAGER) throw new Error('Thiếu tài khoản quản lý mẫu.');
    const sampleScope = await tx.driverManagementAccessScope.findFirst({ where: {
      userId: demoManager.id, complexCode: 'KOUN_MOM', managementUnitId: null,
    } });
    if (!sampleScope) await tx.driverManagementAccessScope.create({ data: {
      userId: demoManager.id, complexCode: 'KOUN_MOM', managementUnitId: null,
      canManageCatalog: true, canAssignDrivers: true, grantedById: admin.id,
    } });
  }, { timeout: 120000 });

  const credentialPath = path.join(outputDir, `cg-manager-credentials-${stamp}.csv`);
  const csv = ['code,username,password', ...credentials.map(({ person, password }) =>
    [person.code, person.username, password].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\r\n');
  fs.writeFileSync(credentialPath, '\uFEFF' + csv);
  await source.$transaction(async (tx) => {
    const localAdmin = await tx.user.findUnique({ where: { username: 'admin' }, select: { id: true, role: true } });
    if (!localAdmin || localAdmin.role !== Role.SUPER_ADMIN) throw new Error('Không có admin local hợp lệ.');
    const demoAdmin = await tx.user.findUnique({ where: { username: 'quanly.toanhe' } });
    if (demoAdmin && (demoAdmin.code !== 'QLTH-DEMO' || demoAdmin.role !== Role.SUPER_ADMIN)) throw new Error('Tài khoản quanly.toanhe bị trùng trên local.');
    if (!demoAdmin) await tx.user.create({ data: {
      code: 'QLTH-DEMO', username: 'quanly.toanhe', fullName: 'Nhân sự quản lý toàn hệ thống',
      passwordHash: demoHash, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH, isActive: true,
    } });
    const demoManager = await tx.user.findUnique({ where: { username: 'quanly.kounmom' } });
    if (!demoManager || demoManager.role !== Role.FARM_MANAGER) throw new Error('Thiếu tài khoản quản lý mẫu trên local.');
    await tx.user.update({ where: { id: demoManager.id }, data: { passwordHash: demoHash } });
    const sampleScope = await tx.driverManagementAccessScope.findFirst({ where: {
      userId: demoManager.id, complexCode: 'KOUN_MOM', managementUnitId: null,
    } });
    if (!sampleScope) await tx.driverManagementAccessScope.create({ data: {
      userId: demoManager.id, complexCode: 'KOUN_MOM', managementUnitId: null,
      canManageCatalog: true, canAssignDrivers: true, grantedById: localAdmin.id,
    } });
  });
  console.log(JSON.stringify({ applied: true, snapshotPath, credentialPath, ...summary }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { await source.$disconnect(); await target.$disconnect(); });
