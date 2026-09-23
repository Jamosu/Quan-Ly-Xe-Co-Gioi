const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.catalogItem.deleteMany({
    where: {
      type: {
        in: ['ENTERPRISE', 'FARM', 'PLOT', 'LAND_PARCEL']
      }
    }
  });
  console.log(`Deleted ${result.count} catalog items of types ENTERPRISE, FARM, PLOT, LAND_PARCEL from DB.`);

  const remaining = await prisma.catalogItem.groupBy({
    by: ['type'],
    _count: { _all: true },
  });
  console.log('Remaining catalog counts in DB:');
  console.log(remaining);
}

run().finally(() => prisma.$disconnect());
