import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vehicleCounts = await prisma.vehicle.groupBy({
    by: ['complexCode', 'unit'],
    _count: { id: true },
  });
  console.log('Vehicle counts by complex/unit:', vehicleCounts);

  const vehicleWithUnitId = await prisma.vehicle.count({
    where: { managementUnitId: { not: null } },
  });
  const vehicleWithoutUnitId = await prisma.vehicle.count({
    where: { managementUnitId: null },
  });
  console.log('Vehicles with managementUnitId:', vehicleWithUnitId, 'without:', vehicleWithoutUnitId);

  const snoulVehicles = await prisma.vehicle.findMany({
    where: { complexCode: 'SNOUL' },
    select: { id: true, code: true, name: true, managementUnitId: true, assignedUnitCode: true },
    take: 5,
  });
  console.log('Sample SNOUL vehicles:', snoulVehicles);

  const namLaoVehicles = await prisma.vehicle.findMany({
    where: { complexCode: 'NAM_LAO' },
    select: { id: true, code: true, name: true, managementUnitId: true, assignedUnitCode: true },
    take: 5,
  });
  console.log('Sample NAM_LAO vehicles:', namLaoVehicles);

  const implementCounts = await prisma.agriculturalImplement.groupBy({
    by: ['unit'],
    _count: { id: true },
  });
  console.log('Implement counts by unit:', implementCounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
