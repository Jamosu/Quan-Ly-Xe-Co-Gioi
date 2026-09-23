import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const unassigned = await prisma.vehicle.groupBy({
    by: ['category'],
    where: { managementUnitId: null, complexCode: 'KOUN_MOM' },
    _count: { id: true },
  });
  console.log('Unassigned vehicles in KOUN_MOM by category:', unassigned);

  const sampleVehicles = await prisma.vehicle.findMany({
    where: { managementUnitId: null, complexCode: 'KOUN_MOM', category: { in: ['MAY_CAY', 'MAY_KEO', 'MAY_DAO', 'MAY_UI', 'XE_BEN', 'XE_TAI'] } },
    select: { id: true, code: true, name: true, category: true, assignedUnitCode: true, vehicleType: { select: { name: true, operationalDomain: true } } },
    take: 15,
  });
  console.log('Sample unassigned:', sampleVehicles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
