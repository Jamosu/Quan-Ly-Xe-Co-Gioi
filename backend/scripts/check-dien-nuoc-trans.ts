import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const team = await prisma.driverManagementUnit.findFirst({
    where: { code: 'CG-KM-BAN-DIEN-NUOC' },
    include: {
      vehicles: {
        where: { vehicleType: { operationalDomain: 'TRANSPORT' } },
        include: { vehicleType: true },
      },
    },
  });

  console.log('Ban điện nước TRANSPORT vehicles:');
  for (const v of team?.vehicles || []) {
    console.log(`- [${v.code}] ${v.name} | Cat: ${v.category} | Type: ${v.vehicleType?.name} (assignable=${v.vehicleType?.isAssignable}, active=${v.vehicleType?.active}) | Status: ${v.status} | Condition: ${v.conditionStatus}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
