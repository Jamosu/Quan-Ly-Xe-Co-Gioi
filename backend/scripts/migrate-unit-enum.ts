import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== Step 1: Expand enums to include new KLH values ===');

  // Thêm giá trị mới vào MySQL enums (giữ nguyên giá trị cũ để không break FK)
  const TABLES_WITH_UNIT = [
    'users',
    'vehicles',
    'production_plans',
    'dispatch_orders',
    'transport_orders',
    'fuel_warehouses',
    'agricultural_implements',
    'scheduling_policies',
  ];

  const NEW_ENUM_DEF = `enum('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH','KOUN_MOM','SNOUL','NAM_LAO')`;

  for (const table of TABLES_WITH_UNIT) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} MODIFY unit ${NEW_ENUM_DEF} NOT NULL DEFAULT 'KOUN_MOM'`);
      console.log(`  ✓ ${table} enum expanded`);
    } catch (e: any) {
      // scheduling_policies might not have NOT NULL on unit
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} MODIFY unit ${NEW_ENUM_DEF}`);
        console.log(`  ✓ ${table} enum expanded (nullable)`);
      } catch (e2: any) {
        console.log(`  ✗ ${table}: ${e2.message}`);
      }
    }
  }

  console.log('\n=== Step 2: Migrate data ===');

  // USERS
  const u1 = await prisma.$executeRawUnsafe(`UPDATE users SET unit = 'NAM_LAO' WHERE unit = 'BAN_CO_GIOI' AND code LIKE 'TX-NL-%'`);
  console.log(`Users → NAM_LAO: ${u1}`);
  const u2 = await prisma.$executeRawUnsafe(`UPDATE users SET unit = 'SNOUL' WHERE unit = 'BAN_CO_GIOI' AND code LIKE 'TX-SN-%'`);
  console.log(`Users → SNOUL: ${u2}`);
  const u3 = await prisma.$executeRawUnsafe(`UPDATE users SET unit = 'KOUN_MOM' WHERE unit IN ('NT1','NT2')`);
  console.log(`Users → KOUN_MOM (NT1/NT2): ${u3}`);
  const u4 = await prisma.$executeRawUnsafe(`UPDATE users SET unit = 'KOUN_MOM' WHERE unit IN ('BAN_CO_GIOI','XN_BO','TT_BTSC')`);
  console.log(`Users → KOUN_MOM (fallback): ${u4}`);

  // VEHICLES (by complexCode)
  const v1 = await prisma.$executeRawUnsafe(`UPDATE vehicles SET unit = 'SNOUL' WHERE unit IN ('NT1','NT2','BAN_CO_GIOI','XN_BO','TT_BTSC') AND complexCode = 'SNOUL'`);
  console.log(`Vehicles → SNOUL: ${v1}`);
  const v2 = await prisma.$executeRawUnsafe(`UPDATE vehicles SET unit = 'NAM_LAO' WHERE unit IN ('NT1','NT2','BAN_CO_GIOI','XN_BO','TT_BTSC') AND complexCode = 'NAM_LAO'`);
  console.log(`Vehicles → NAM_LAO: ${v2}`);
  const v3 = await prisma.$executeRawUnsafe(`UPDATE vehicles SET unit = 'KOUN_MOM' WHERE unit IN ('NT1','NT2','BAN_CO_GIOI','XN_BO','TT_BTSC')`);
  console.log(`Vehicles → KOUN_MOM: ${v3}`);

  // OTHER TABLES
  for (const table of ['production_plans','dispatch_orders','transport_orders','fuel_warehouses','agricultural_implements']) {
    const n = await prisma.$executeRawUnsafe(`UPDATE ${table} SET unit = 'KOUN_MOM' WHERE unit IN ('NT1','NT2','BAN_CO_GIOI','XN_BO','TT_BTSC')`);
    console.log(`${table} → KOUN_MOM: ${n}`);
  }

  // SCHEDULING POLICIES - create missing entries
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT unit FROM scheduling_policies`);
  console.log('\nExisting scheduling_policies:', existing.map((r: any) => r.unit).join(', '));

  for (const newUnit of ['KOUN_MOM', 'SNOUL', 'NAM_LAO', 'TOAN_KLH']) {
    if (!existing.some((r: any) => r.unit === newUnit)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO scheduling_policies (unit, vehicleBufferMinutes, driverBufferMinutes, timezone, completionPhotoCount, createdAt, updatedAt)
         SELECT '${newUnit}', vehicleBufferMinutes, driverBufferMinutes, timezone, completionPhotoCount, NOW(), NOW()
         FROM scheduling_policies LIMIT 1`
      );
      console.log(`Created scheduling_policy: ${newUnit}`);
    }
  }

  console.log('\n=== Step 3: Remove old enum values (shrink enum) ===');
  const FINAL_ENUM_DEF = `enum('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH')`;
  for (const table of TABLES_WITH_UNIT) {
    try {
      const col = table === 'scheduling_policies' ? 'unit VARCHAR(50) NOT NULL DEFAULT \'KOUN_MOM\'' : `unit ${FINAL_ENUM_DEF} NOT NULL DEFAULT 'KOUN_MOM'`;
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} MODIFY unit ${FINAL_ENUM_DEF} NOT NULL DEFAULT 'KOUN_MOM'`);
      console.log(`  ✓ ${table} enum finalized`);
    } catch (e: any) {
      console.log(`  ✗ ${table}: ${e.message}`);
    }
  }

  // scheduling_policies PK is unit — try without NOT NULL
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE scheduling_policies MODIFY unit enum('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH') NOT NULL`);
    console.log('  ✓ scheduling_policies PK enum finalized');
  } catch (e: any) {
    console.log('  scheduling_policies note:', e.message);
  }

  console.log('\n=== Migration Complete! ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
