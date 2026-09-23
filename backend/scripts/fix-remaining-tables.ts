import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const OLD_VALS = `'NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI'`;
const EXPANDED_ENUM = `enum('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH','KOUN_MOM','SNOUL','NAM_LAO')`;
const FINAL_ENUM = `enum('KOUN_MOM','SNOUL','NAM_LAO','TOAN_KLH')`;

async function main() {
  // 1. alert_events: expand enum & migrate data
  await prisma.$executeRawUnsafe(`ALTER TABLE alert_events MODIFY unit ${EXPANDED_ENUM} NULL`);
  await prisma.$executeRawUnsafe(`UPDATE alert_events SET unit = 'KOUN_MOM' WHERE unit IN (${OLD_VALS})`);
  await prisma.$executeRawUnsafe(`ALTER TABLE alert_events MODIFY unit ${FINAL_ENUM} NULL`);
  console.log('✓ alert_events done');

  // 2. operational_locations
  await prisma.$executeRawUnsafe(`ALTER TABLE operational_locations MODIFY unit ${EXPANDED_ENUM} NULL`);
  const n2 = await prisma.$executeRawUnsafe(`UPDATE operational_locations SET unit = 'KOUN_MOM' WHERE unit IN (${OLD_VALS})`);
  await prisma.$executeRawUnsafe(`ALTER TABLE operational_locations MODIFY unit ${FINAL_ENUM} NULL`);
  console.log(`✓ operational_locations done (${n2} rows updated)`);

  // 3. operational_work_orders
  await prisma.$executeRawUnsafe(`ALTER TABLE operational_work_orders MODIFY unit ${EXPANDED_ENUM} NOT NULL DEFAULT 'KOUN_MOM'`);
  const n3 = await prisma.$executeRawUnsafe(`UPDATE operational_work_orders SET unit = 'KOUN_MOM' WHERE unit IN (${OLD_VALS})`);
  await prisma.$executeRawUnsafe(`ALTER TABLE operational_work_orders MODIFY unit ${FINAL_ENUM} NOT NULL DEFAULT 'KOUN_MOM'`);
  console.log(`✓ operational_work_orders done (${n3} rows updated)`);

  // 4. production_orders
  await prisma.$executeRawUnsafe(`ALTER TABLE production_orders MODIFY unit ${EXPANDED_ENUM} NOT NULL DEFAULT 'KOUN_MOM'`);
  const n4 = await prisma.$executeRawUnsafe(`UPDATE production_orders SET unit = 'KOUN_MOM' WHERE unit IN (${OLD_VALS})`);
  await prisma.$executeRawUnsafe(`ALTER TABLE production_orders MODIFY unit ${FINAL_ENUM} NOT NULL DEFAULT 'KOUN_MOM'`);
  console.log(`✓ production_orders done (${n4} rows updated)`);

  console.log('\n✅ All tables migrated. Now run: npx prisma db push --accept-data-loss');
}

main().catch(console.error).finally(() => prisma.$disconnect());
