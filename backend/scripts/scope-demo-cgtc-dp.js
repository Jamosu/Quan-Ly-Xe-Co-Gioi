// Assign the public FARM_MANAGER demo account to one real Koun Mom team.
// Dry-run by default. Run with --apply after deploying the scoped API.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient, Role } = require('@prisma/client');

const backendDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(backendDir, '..', 'output');
const databases = [
  ['local', '.env'],
  ['production', '.env.production'],
].map(([name, file]) => {
  const url = dotenv.parse(fs.readFileSync(path.join(backendDir, file))).DATABASE_URL;
  if (!url) throw new Error(`Thiếu DATABASE_URL trong ${file}.`);
  return { name, url, db: new PrismaClient({ datasources: { db: { url } } }) };
});
if (databases[0].url === databases[1].url) throw new Error('Local và production phải là hai database khác nhau.');

async function inspect({ name, db }) {
  const [user, unit, admin] = await Promise.all([
    db.user.findUnique({ where: { username: 'quanly.kounmom' }, select: { id: true, code: true, fullName: true, role: true } }),
    db.driverManagementUnit.findFirst({ where: { complexCode: 'KOUN_MOM', code: 'CG-KM-CGTC-DP', level: 'TEAM', status: 'ACTIVE' }, select: { id: true, code: true, name: true } }),
    db.user.findUnique({ where: { username: 'admin' }, select: { id: true, role: true } }),
  ]);
  if (!user || user.role !== Role.FARM_MANAGER || !unit || !admin || admin.role !== Role.SUPER_ADMIN) {
    throw new Error(`${name}: thiếu tài khoản hoặc đơn vị quản lý hợp lệ.`);
  }
  const [scopes, vehicles, drivers] = await Promise.all([
    db.driverManagementAccessScope.findMany({ where: { userId: user.id } }),
    db.vehicle.count({ where: { managementUnitId: unit.id } }),
    db.driverProfile.count({ where: { vehicleAssignments: { some: { status: 'ACTIVE', vehicle: { managementUnitId: unit.id } } } } }),
  ]);
  if (vehicles === 0 || drivers === 0) throw new Error(`${name}: đơn vị đã chọn không có cả xe và tài xế.`);
  if (scopes.some((scope) => scope.complexCode !== 'KOUN_MOM' || (scope.managementUnitId && scope.managementUnitId !== unit.id))) {
    throw new Error(`${name}: tài khoản mẫu có phạm vi khác, cần xem lại trước khi thay đổi.`);
  }
  return { name, db, user, unit, admin, scopes, vehicles, drivers };
}

async function main() {
  const states = await Promise.all(databases.map(inspect));
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', states: states.map(({ name, unit, vehicles, drivers, scopes }) => ({
    database: name, unit: unit.code, vehicles, drivers, existingScopeUnitIds: scopes.map((scope) => scope.managementUnitId),
  })) }, null, 2));
  if (!process.argv.includes('--apply')) return;
  fs.mkdirSync(outputDir, { recursive: true });
  const snapshotPath = path.join(outputDir, `demo-manager-scope-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(states.map(({ name, user, scopes }) => ({ name, user, scopes })), null, 2));
  for (const { db, user, unit, admin } of states) {
    await db.$transaction(async (tx) => {
      await tx.driverManagementAccessScope.deleteMany({ where: { userId: user.id, complexCode: 'KOUN_MOM', managementUnitId: null } });
      const existing = await tx.driverManagementAccessScope.findFirst({ where: { userId: user.id, complexCode: 'KOUN_MOM', managementUnitId: unit.id } });
      if (!existing) await tx.driverManagementAccessScope.create({ data: {
        userId: user.id, complexCode: 'KOUN_MOM', managementUnitId: unit.id,
        canManageCatalog: true, canAssignDrivers: true, grantedById: admin.id,
      } });
      await tx.user.update({ where: { id: user.id }, data: { fullName: 'Tài khoản mẫu CGTC DP' } });
    });
  }
  console.log(JSON.stringify({ applied: true, snapshotPath }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { await Promise.all(databases.map(({ db }) => db.$disconnect())); });
