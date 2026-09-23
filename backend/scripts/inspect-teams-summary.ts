import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.driverManagementUnit.findMany({
    where: { level: 'TEAM', status: 'ACTIVE' },
    select: {
      id: true,
      code: true,
      name: true,
      complexCode: true,
      managerAssignments: { where: { effectiveTo: null }, include: { manager: true } },
      _count: {
        select: {
          vehicles: true,
          implements: true,
          teamAssignments: { where: { effectiveTo: null } },
        },
      },
    },
    orderBy: [{ complexCode: 'asc' }, { code: 'asc' }],
  });

  console.log('ACTIVE TEAMS SUMMARY:');
  for (const t of teams) {
    const mgr = t.managerAssignments.map((m) => m.manager.fullName).join(', ') || 'Chưa có';
    console.log(`- [${t.complexCode}] [${t.code}] ${t.name}: Mgr = ${mgr}, Vehicles = ${t._count.vehicles}, Implements = ${t._count.implements}, Drivers = ${t._count.teamAssignments}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
