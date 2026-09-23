import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Fix scheduling_policies: map old units to new
  const map: Record<string, string> = {
    'NT1': 'KOUN_MOM',
    'NT2': 'KOUN_MOM',
    'XN_BO': 'KOUN_MOM',
    'TT_BTSC': 'KOUN_MOM',
    'BAN_CO_GIOI': 'KOUN_MOM',
  };

  for (const [old, newVal] of Object.entries(map)) {
    // Check if target already exists (avoid PK conflict)
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT unit FROM scheduling_policies WHERE unit = '${newVal}'`
    );
    if (existing.length === 0) {
      // Rename
      await prisma.$executeRawUnsafe(
        `UPDATE scheduling_policies SET unit = '${newVal}' WHERE unit = '${old}'`
      );
      console.log(`Renamed ${old} → ${newVal}`);
    } else {
      // Target exists, just delete old
      await prisma.$executeRawUnsafe(
        `DELETE FROM scheduling_policies WHERE unit = '${old}'`
      );
      console.log(`Deleted old policy ${old} (target ${newVal} already exists)`);
    }
  }

  // Now shrink enum
  await prisma.$executeRawUnsafe(
    `ALTER TABLE scheduling_policies MODIFY unit enum('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL`
  );
  console.log('✓ scheduling_policies enum finalized');

  const final = await prisma.$queryRawUnsafe<any[]>(`SELECT unit FROM scheduling_policies`);
  console.log('Final scheduling_policies:', final.map((r: any) => r.unit).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
