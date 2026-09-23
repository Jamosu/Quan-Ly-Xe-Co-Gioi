import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  for (const code of ['CG-KM-BAN-DIEN-NUOC', 'CG-KM-PHONG-GNVC']) {
    const t = await prisma.driverManagementUnit.findFirst({ where: { code } });
    if (!t) continue;
    const impls = await prisma.agriculturalImplement.findMany({ where: { managementUnitId: t.id } });
    console.log(code, 'implements:');
    for (const i of impls) {
      console.log(`  - [${i.code}] ${i.name} (cat=${i.category}, usageMode=${i.usageMode}, cond=${i.technicalCondition}, status=${i.status})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
