const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.agriculturalImplement.count();
  console.log('Total AgriculturalImplements in DB:', count);

  const samples = await prisma.agriculturalImplement.findMany({
    take: 5,
    include: { currentVehicle: true }
  });
  console.log('Sample Implements:', JSON.stringify(samples, null, 2));

  // Count by unit
  const units = await prisma.agriculturalImplement.groupBy({
    by: ['unit'],
    _count: { id: true }
  });
  console.log('By Unit:', units);

  const compatCount = await prisma.implementVehicleTypeCompatibility.count();
  console.log('ImplementVehicleTypeCompatibility count:', compatCount);

  // Group by category
  const categories = await prisma.agriculturalImplement.groupBy({
    by: ['category'],
    _count: { id: true }
  });
  console.log('By Category:', categories);

  // Check vehicle MK-50-05
  const v = await prisma.vehicle.findFirst({
    where: { code: 'MK-50-05' },
    include: { vehicleType: true }
  });
  console.log('Vehicle MK-50-05:', JSON.stringify(v, null, 2));

  // Check implements compatible with this vehicleType
  if (v && v.vehicleTypeId) {
    const compats = await prisma.agriculturalImplement.findMany({
      where: {
        compatibleVehicleTypes: {
          some: { vehicleTypeId: v.vehicleTypeId }
        }
      },
      take: 5
    });
    const compatTotal = await prisma.agriculturalImplement.count({
      where: {
        compatibleVehicleTypes: {
          some: { vehicleTypeId: v.vehicleTypeId }
        }
      }
    });
    console.log(`Implements compatible with ${v.code} (typeId ${v.vehicleTypeId}): Total = ${compatTotal}`, compats.map(c => `${c.code} - ${c.name}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
