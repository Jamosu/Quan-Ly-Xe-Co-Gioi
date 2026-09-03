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
}

main().catch(console.error).finally(() => prisma.$disconnect());
