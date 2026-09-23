import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import {
  DriverEmploymentStatus,
  DriverLicenseClass,
  DriverShiftStatus,
  PrismaClient,
  Role,
  Unit,
} from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const prisma = new PrismaClient();
const TARGET_DRIVERS = 5;
const PASSWORD = 'Thaco@1234$';
const LICENSE_CLASSES = [
  DriverLicenseClass.HANG_B2,
  DriverLicenseClass.HANG_C,
  DriverLicenseClass.HANG_CE,
  DriverLicenseClass.HANG_B2,
  DriverLicenseClass.HANG_C,
];

const DEMO_LICENSE_CLASSES = [
  DriverLicenseClass.HANG_B2,
  DriverLicenseClass.HANG_C,
  DriverLicenseClass.HANG_CE,
];

function demoLicenses(teamId: number, index: number, primary: DriverLicenseClass) {
  const label: Record<string, string> = {
    [DriverLicenseClass.HANG_B2]: 'Hạng B2 (Máy cày, máy kéo, ô tô con, tải ≤3.5T)',
    [DriverLicenseClass.HANG_C]: 'Hạng C (Xe tải >3.5T, xe chuyên dùng hạng nặng)',
    [DriverLicenseClass.HANG_CE]: 'Hạng CE (Đầu kéo, rơ-moóc và container)',
  };
  return DEMO_LICENSE_CLASSES.map((licenseClass) => ({
    category: label[licenseClass],
    number: `GPLX-${teamId}-${String(index).padStart(2, '0')}-${licenseClass.replace('HANG_', '')}`,
    issueDate: '2025-01-01',
    expiryDate: '2035-12-31',
    issuedBy: 'Dữ liệu DEMO nghiệm thu điều lệnh',
    isPrimary: licenseClass === primary,
  }));
}

function argumentValue(name: string): string | undefined {
  const direct = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function accountKey(teamCode: string, index: number) {
  const slug = teamCode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    code: `DEMO-${teamCode}-${String(index).padStart(2, '0')}`,
    username: `demo.${slug}.${String(index).padStart(2, '0')}`,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const teamCode = argumentValue('--team-code');
  const reportPath = resolve(argumentValue('--report') || resolve(process.cwd(), 'import-reports', 'demo-driver-seed-report.json'));
  const [admin, teams] = await Promise.all([
    prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN, isActive: true }, select: { id: true } }),
    prisma.driverManagementUnit.findMany({
      where: {
        complexCode: 'KOUN_MOM',
        level: 'TEAM',
        status: 'ACTIVE',
        ...(teamCode ? { code: teamCode } : {}),
        OR: [{ vehicles: { some: {} } }, { implements: { some: {} } }],
      },
      select: { id: true, code: true, name: true, parentId: true },
      orderBy: { code: 'asc' },
    }),
  ]);
  if (!admin) throw new Error('Cần một SUPER_ADMIN đang hoạt động để ghi nhận người phân công tài xế demo.');
  const teamIds = teams.map((team) => team.id);
  const assignments = await prisma.driverManagementAssignment.findMany({
    where: {
      teamUnitId: { in: teamIds },
      effectiveTo: null,
      driver: { user: { role: Role.DRIVER, isActive: true, employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC } },
    },
    select: { driverId: true, teamUnitId: true },
  });
  const driverIdsByTeam = new Map<number, Set<number>>();
  for (const assignment of assignments) {
    if (!assignment.teamUnitId) continue;
    const ids = driverIdsByTeam.get(assignment.teamUnitId) || new Set<number>();
    ids.add(assignment.driverId);
    driverIdsByTeam.set(assignment.teamUnitId, ids);
  }
  const existingDemoCodes = new Set((await prisma.user.findMany({
    where: { code: { startsWith: 'DEMO-CG-KM-' } }, select: { code: true },
  })).map((user) => user.code));
  const additions = teams.flatMap((team) => {
    if (!team.parentId) throw new Error(`Đội ${team.code} chưa có đơn vị chủ quản.`);
    const deficit = Math.max(0, TARGET_DRIVERS - (driverIdsByTeam.get(team.id)?.size || 0));
    const slots: Array<{ team: typeof team; index: number }> = [];
    for (let index = 1; slots.length < deficit; index++) {
      if (!existingDemoCodes.has(accountKey(team.code, index).code)) slots.push({ team, index });
    }
    return slots;
  });

  if (apply && additions.length) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const { team, index } of additions) {
      const account = accountKey(team.code, index);
      const licenseClass = LICENSE_CLASSES[(index - 1) % LICENSE_CLASSES.length];
      const licensesJson = demoLicenses(team.id, index, licenseClass);
      const fullName = `Tài xế demo ${team.name} ${String(index).padStart(2, '0')}`;
      const licenseExpiryDate = new Date('2035-12-31T00:00:00.000Z');
      const healthCheckExpiryDate = new Date('2035-06-30T00:00:00.000Z');
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            code: account.code,
            username: account.username,
            passwordHash,
            fullName,
            role: Role.DRIVER,
            unit: Unit.KOUN_MOM,
            employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
            joinedDate: new Date('2026-01-01T00:00:00.000Z'),
            licenseClass,
            licenseNumber: `GPLX-${team.id}-${String(index).padStart(2, '0')}`,
            licenseExpiryDate,
            healthCheckExpiryDate,
            currentShiftStatus: DriverShiftStatus.SAN_SANG,
            currentLocation: team.name,
            isActive: true,
            notes: '[DEMO] Hồ sơ phục vụ kiểm thử vận hành; có dữ liệu GPLX B2/C/CE để nghiệm thu ba loại lệnh; không phải nhân sự thực tế.',
          },
        });
        await tx.driverProfile.create({
          data: {
            userId: user.id,
            employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
            joinedDate: new Date('2026-01-01T00:00:00.000Z'),
            licenseClass,
            licenseNumber: `GPLX-${team.id}-${String(index).padStart(2, '0')}`,
            licenseExpiryDate,
            healthCheckExpiryDate,
            currentShiftStatus: DriverShiftStatus.SAN_SANG,
            currentLocation: team.name,
            licensesJson,
          },
        });
        await tx.employeeRecord.create({
          data: {
            empCode: account.code,
            fullName,
            businessUnit: 'THACO AGRI',
            complex: 'KOUN_MOM',
            enterprise: team.name,
            team: team.name,
            position: 'Tài xế/Thợ vận hành demo',
            licenseClass,
            licenseNumber: `GPLX-${team.id}-${String(index).padStart(2, '0')}`,
            licenseExpiryDate: '31/12/2035',
            healthCheckExpiryDate: '30/06/2035',
            status: 'Hoạt động - DEMO',
            username: account.username,
            joinedDate: '01/01/2026',
          },
        });
        await tx.driverManagementAssignment.create({
          data: {
            driverId: user.id,
            managementUnitId: team.parentId!,
            teamUnitId: team.id,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
            assignedById: admin.id,
            reason: '[DEMO] Bổ sung đủ 5 tài xế cho đội có tài sản.',
          },
        });
      }, { timeout: 30_000, maxWait: 10_000 });
    }
  }

  const demoDrivers = teams.length ? await prisma.user.findMany({
    where: {
      OR: teams.map((team) => ({ code: { startsWith: `DEMO-${team.code}-` } })),
      driverProfile: { isNot: null },
    },
    select: { id: true, code: true, licenseClass: true, driverProfile: { select: { licenseClass: true } } },
  }) : [];
  if (apply) {
    for (const driver of demoDrivers) {
      const team = teams.find((candidate) => driver.code.startsWith(`DEMO-${candidate.code}-`));
      if (!team) continue;
      const index = Number(driver.code.match(/-(\d+)$/)?.[1] ?? 1);
      const primary = driver.driverProfile?.licenseClass ?? driver.licenseClass ?? DriverLicenseClass.HANG_B2;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: driver.id },
          data: { notes: '[DEMO] Hồ sơ phục vụ kiểm thử vận hành; có dữ liệu GPLX B2/C/CE để nghiệm thu ba loại lệnh; không phải nhân sự thực tế.' },
        }),
        prisma.driverProfile.update({
          where: { userId: driver.id },
          data: { licensesJson: demoLicenses(team.id, index, primary) },
        }),
      ]);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: !apply,
    targetDriversPerTeam: TARGET_DRIVERS,
    teamsWithAssets: teams.length,
    driversToCreate: additions.length,
    driversNormalized: apply ? demoDrivers.length : 0,
    additions: teams.map((team) => ({
      teamCode: team.code,
      teamName: team.name,
      existingDrivers: driverIdsByTeam.get(team.id)?.size || 0,
      created: additions.filter((item) => item.team.id === team.id).length,
    })),
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
