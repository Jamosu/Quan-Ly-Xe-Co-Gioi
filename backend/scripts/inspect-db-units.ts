import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const units = await prisma.driverManagementUnit.findMany({
    where: { complexCode: 'KOUN_MOM' },
    include: {
      managerAssignments: { include: { manager: true } },
      mainDepot: true,
    },
  });

  console.log('Total KOUN_MOM units:', units.length);
  const owners = units.filter((u) => u.level === 'OWNER' && u.status === 'ACTIVE');
  console.log('\n--- ACTIVE KOUN_MOM OWNERS (count:', owners.length, ') ---');
  for (const o of owners) {
    console.log(
      o.id,
      o.code.padEnd(20),
      `"${o.name}"`.padEnd(45),
      'mainDepotId:',
      o.mainDepotId,
      'mgrName:',
      o.managerName,
      'mgrPhone:',
      o.managerPhone,
      'assignments:',
      o.managerAssignments.map((a) => `${a.id}:${a.manager?.fullName}`),
    );
  }

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
