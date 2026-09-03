const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const snVehicles = await prisma.vehicle.findMany({
    where: { complexCode: 'SNOUL' },
    select: { id: true, code: true, name: true, category: true, assignedUnitCode: true },
    take: 5
  });
  console.log('Snoul Vehicles:', snVehicles);

  const nlVehicles = await prisma.vehicle.findMany({
    where: { complexCode: 'NAM_LAO' },
    select: { id: true, code: true, name: true, category: true, assignedUnitCode: true },
    take: 5
  });
  console.log('Nam Lao Vehicles:', nlVehicles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
