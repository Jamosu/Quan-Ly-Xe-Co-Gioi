import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const counts = await prisma.user.groupBy({ by: ['unit'], where: { role: 'DRIVER' }, _count: true });
  console.log('Driver counts by unit:');
  counts.forEach((r: any) => console.log('  ' + r.unit + ':', r._count));

  const sample = await prisma.driverProfile.findMany({ 
    take: 5, 
    select: { userId: true } 
  });
  console.log('\nSample DriverProfile:', JSON.stringify(sample, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
