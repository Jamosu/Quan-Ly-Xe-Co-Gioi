import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const team = await prisma.driverManagementUnit.findFirst({
    where: { code: 'CG-KM-BAN-CG-CK-SXCN' },
    include: {
      vehicles: {
        include: { vehicleType: true },
      },
      implements: true,
    },
  });

  console.log('BAN CG-CK & SXCN vehicles:');
  for (const v of team?.vehicles || []) {
    console.log(`- [${v.code}] ${v.name} | Cat: ${v.category} | Domain: ${v.vehicleType?.operationalDomain} | Type: ${v.vehicleType?.name} | Status: ${v.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
