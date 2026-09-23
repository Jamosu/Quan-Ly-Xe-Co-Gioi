const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.catalogItem.deleteMany({
    where: { type: 'DEPARTMENT' }
  });
  console.log(`Deleted ${deleted.count} DEPARTMENT records from database.`);

  const remaining = await prisma.catalogItem.count({
    where: { type: 'DEPARTMENT' }
  });
  console.log(`Remaining DEPARTMENT records: ${remaining}`);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
