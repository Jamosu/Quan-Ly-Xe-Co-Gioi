import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.agriculturalImplement.count();
  const attachable = await prisma.agriculturalImplement.count({ where: { usageMode: 'ATTACHABLE' } });
  const byCategory = await prisma.agriculturalImplement.groupBy({ by: ['category'], _count: true });
  const withCompat = await prisma.agriculturalImplement.count({
    where: { compatibleVehicleTypes: { some: {} } },
  });

  // Check if VehicleType has operationalDomain
  const agriVehTypes = await prisma.vehicleType.findMany({
    where: { operationalDomain: 'AGRICULTURE' },
    select: { id: true, code: true, name: true },
  });
  const implWithAgriCompat = await prisma.agriculturalImplement.count({
    where: {
      compatibleVehicleTypes: {
        some: { vehicleType: { operationalDomain: 'AGRICULTURE' } },
      },
    },
  });
  const implWithConstrCompat = await prisma.agriculturalImplement.count({
    where: {
      compatibleVehicleTypes: {
        some: { vehicleType: { operationalDomain: 'CONSTRUCTION' } },
      },
    },
  });
  const implWithTransportCompat = await prisma.agriculturalImplement.count({
    where: {
      compatibleVehicleTypes: {
        some: { vehicleType: { operationalDomain: 'TRANSPORT' } },
      },
    },
  });

  console.log('=== AgriculturalImplement Stats ===');
  console.log('Total:', total);
  console.log('Attachable:', attachable);
  console.log('With compatibleVehicleTypes:', withCompat);
  console.log('With AGRICULTURE domain compat:', implWithAgriCompat);
  console.log('With CONSTRUCTION domain compat:', implWithConstrCompat);
  console.log('With TRANSPORT domain compat:', implWithTransportCompat);
  console.log('By category:');
  byCategory.forEach((r) => console.log(`  ${r.category}: ${r._count}`));
  console.log('\nAgriculture VehicleTypes (sample 10):');
  agriVehTypes.slice(0, 10).forEach((v) => console.log(`  [${v.id}] ${v.code} - ${v.name}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
