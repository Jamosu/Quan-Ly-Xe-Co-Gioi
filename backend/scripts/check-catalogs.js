const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const counts = await prisma.catalogItem.groupBy({
    by: ['type'],
    _count: { _all: true },
  });
  console.log('Current catalog counts in DB:');
  console.log(counts);
}

run().finally(() => prisma.$disconnect());
