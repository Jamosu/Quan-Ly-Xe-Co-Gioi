import { PrismaClient, ImplementCategory } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const team = await prisma.driverManagementUnit.findFirst({ where: { code: 'CG-KM-BAN-DIEN-NUOC' } });
  const impls = await prisma.agriculturalImplement.findMany({
    where: {
      managementUnitId: team!.id,
      category: { in: [ImplementCategory.DAN_CAY, ImplementCategory.DAN_BUA, ImplementCategory.DAN_XOI, ImplementCategory.RO_MOOC, ImplementCategory.DAN_PHUN_THUOC] },
      AND: [
        { name: { not: { contains: 'định hình' } } },
        { name: { not: { contains: 'dinh hinh' } } },
        { name: { not: { contains: 'SMRM' } } },
      ],
    },
  });
  console.log('Filtered agri implements count in Ban dien nuoc:', impls.length);
  for (const i of impls) {
    console.log(`- ${i.code}: ${i.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
