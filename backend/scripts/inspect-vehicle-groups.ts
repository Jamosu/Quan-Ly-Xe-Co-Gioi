import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.vehicle.groupBy({
    by: ['assignedUnitCode', 'category', 'status'],
    where: { assignedUnitCode: { in: ['CGTC DP', 'XN Bò AD', 'XN Chuối DP2', 'BAN CG-CK & SXCN', 'CGLĐ DP'] } },
    _count: { id: true },
  });
  console.log('Sample vehicle groups:', JSON.stringify(sample, null, 2));

  const assignable = await prisma.vehicle.groupBy({
    by: ['assignedUnitCode'],
    where: {
      assignedUnitCode: { in: ['CGTC DP', 'XN Bò AD', 'XN Chuối DP2', 'BAN CG-CK & SXCN', 'CGLĐ DP'] },
      vehicleType: { isAssignable: true, active: true },
      status: { in: ['CHO_PHAN_CONG', 'HOAT_DONG'] },
    },
    _count: { id: true },
  });
  console.log('Assignable & Ready vehicles:', assignable);
}

main().catch(console.error).finally(() => prisma.$disconnect());
