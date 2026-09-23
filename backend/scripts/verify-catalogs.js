const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.catalogItem.groupBy({
    by: ['type'],
    _count: {
      _all: true
    }
  });
  console.log('--- Current Catalog counts by type in Database ---');
  counts.forEach(c => console.log(`${c.type}: ${c._count._all}`));
  
  const targetTypes = ['ENTERPRISE', 'FARM', 'PLOT', 'LAND_PARCEL'];
  for (const t of targetTypes) {
    const total = await prisma.catalogItem.count({ where: { type: t } });
    console.log(`Target ${t}: ${total} items`);
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
