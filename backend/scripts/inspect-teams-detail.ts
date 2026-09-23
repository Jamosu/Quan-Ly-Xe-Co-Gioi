import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const units = await prisma.driverManagementUnit.findMany({
    where: { level: 'TEAM', status: 'ACTIVE' },
    include: {
      parent: true,
      managerAssignments: { where: { effectiveTo: null }, include: { manager: true } },
      vehicles: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          category: true,
          vehicleType: { select: { id: true, code: true, name: true, operationalDomain: true, requiredLicenseClass: true } },
        },
      },
      implements: { select: { id: true, code: true, name: true, status: true, category: true } },
      teamAssignments: {
        where: { effectiveTo: null },
        include: {
          driver: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: [{ complexCode: 'asc' }, { code: 'asc' }],
  });

  const summary = units.map((u) => {
    const mgrs = u.managerAssignments.map((m) => `${m.manager.fullName} (${m.manager.username})`).join(', ') || 'CHƯA CÓ';
    const vCount = u.vehicles.length;
    const iCount = u.implements.length;
    const dCount = u.teamAssignments.length;
    const domains: Record<string, number> = {};
    for (const v of u.vehicles) {
      const d = v.vehicleType?.operationalDomain || 'CHUA_GAN_DOMAIN';
      domains[d] = (domains[d] || 0) + 1;
    }
    const ratio = vCount > 0 ? (dCount / vCount).toFixed(2) : 'N/A';
    return {
      complex: u.complexCode,
      code: u.code,
      name: u.name,
      parentCode: u.parent?.code ?? 'N/A',
      parentName: u.parent?.name ?? 'N/A',
      managers: mgrs,
      vehicleCount: vCount,
      domains,
      implementCount: iCount,
      driverCount: dCount,
      ratio,
      deficitFor70Pct: Math.max(0, Math.ceil(vCount * 0.7) - dCount),
    };
  });

  const outputPath = path.resolve(__dirname, '../import-reports/teams-inspection.json');
  fs.writeFileSync(outputPath, JSON.stringify({ units, summary }, null, 2));

  console.log('| KLH | Mã Đội | Tên Đội | Đội trưởng / Quản lý | Số xe | Phân bổ xe | Nông cụ | Số TX | Tỉ lệ TX/Xe | Cần thêm (7/10) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const s of summary) {
    const domainStr = Object.entries(s.domains).map(([k, v]) => `${k}:${v}`).join(', ') || '-';
    console.log(`| ${s.complex} | ${s.code} | ${s.name} | ${s.managers} | ${s.vehicleCount} | ${domainStr} | ${s.implementCount} | ${s.driverCount} | ${s.ratio} | ${s.deficitFor70Pct} |`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
