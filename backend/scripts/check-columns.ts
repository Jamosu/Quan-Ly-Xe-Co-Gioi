import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cols = await prisma.$queryRawUnsafe<any[]>('DESCRIBE vehicles');
  console.log('All Vehicle columns:');
  cols.forEach((c: any) => console.log(' ', c.Field, '|', c.Type));
}
main().catch(console.error).finally(() => prisma.$disconnect());
