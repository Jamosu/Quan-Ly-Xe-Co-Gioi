import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Cập nhật unit của tài xế TX-SN- → SNOUL, TX-NL- → NAM_LAO (đã migrate nhưng verify)
  const sn = await prisma.$executeRawUnsafe(
    `UPDATE users SET unit = 'SNOUL' WHERE code LIKE 'TX-SN-%' AND unit != 'SNOUL'`
  );
  const nl = await prisma.$executeRawUnsafe(
    `UPDATE users SET unit = 'NAM_LAO' WHERE code LIKE 'TX-NL-%' AND unit != 'NAM_LAO'`
  );
  const km = await prisma.$executeRawUnsafe(
    `UPDATE users SET unit = 'KOUN_MOM' WHERE code LIKE 'TX-KM-%' AND unit != 'KOUN_MOM'`
  );
  console.log(`TX-SN → SNOUL: ${sn}, TX-NL → NAM_LAO: ${nl}, TX-KM → KOUN_MOM: ${km}`);

  // Verify final counts
  const counts = await prisma.$queryRawUnsafe<any[]>(
    `SELECT unit, COUNT(*) as cnt FROM users WHERE role = 'DRIVER' GROUP BY unit`
  );
  console.log('\nDriver counts by new unit:');
  counts.forEach((r: any) => console.log(`  ${r.unit}: ${r.cnt}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
