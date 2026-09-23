import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const columns: any = await prisma.$queryRawUnsafe('DESCRIBE vehicles');
  console.log('Columns of vehicles table:');
  for (const c of columns) {
    if (c.Null === 'NO' && c.Default === null && c.Extra !== 'auto_increment') {
      console.log(`REQUIRED (NO DEFAULT): ${c.Field} (${c.Type})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
