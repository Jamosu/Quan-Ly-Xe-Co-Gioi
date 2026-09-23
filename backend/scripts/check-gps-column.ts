import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const columns: any = await prisma.$queryRawUnsafe("SHOW COLUMNS FROM vehicles WHERE Field = 'lastGpsUpdate'");
  console.log('lastGpsUpdate column info:', columns);
}

main().catch(console.error).finally(() => prisma.$disconnect());
