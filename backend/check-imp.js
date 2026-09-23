const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.agriculturalImplement.count();
  const withAssignedUnitCode = await prisma.agriculturalImplement.count({
    where: { assignedUnitCode: { not: null } }
  });
  const withoutAssignedUnitCode = await prisma.agriculturalImplement.count({
    where: { OR: [{ assignedUnitCode: null }, { assignedUnitCode: '' }] }
  });
  console.log('Total implements:', total);
  console.log('With assignedUnitCode:', withAssignedUnitCode);
  console.log('Without assignedUnitCode:', withoutAssignedUnitCode);

  const byAssignedUnit = await prisma.agriculturalImplement.groupBy({
    by: ['assignedUnitCode'],
    _count: { id: true }
  });
  console.log('By assignedUnitCode:', JSON.stringify(byAssignedUnit, null, 2));

  // Check implements where usageMode = ATTACHABLE (761)
  const attachableTotal = await prisma.agriculturalImplement.count({ where: { usageMode: 'ATTACHABLE' } });
  const attachableWithoutUnit = await prisma.agriculturalImplement.count({
    where: { usageMode: 'ATTACHABLE', OR: [{ assignedUnitCode: null }, { assignedUnitCode: '' }] }
  });
  console.log('Attachable total:', attachableTotal, 'without unit:', attachableWithoutUnit);
}

main().finally(() => prisma.$disconnect());
