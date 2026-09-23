const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sourceGroups = await prisma.agriculturalImplement.groupBy({
    by: ['sourceGroup'],
    _count: { id: true }
  });
  console.log('Source groups in implements:', JSON.stringify(sourceGroups, null, 2));

  const categories = await prisma.agriculturalImplement.groupBy({
    by: ['category'],
    _count: { id: true }
  });
  console.log('Categories in implements:', JSON.stringify(categories, null, 2));
}

main().finally(() => prisma.$disconnect());
