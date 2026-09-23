import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find ALL tables with unit column
  const tables = await prisma.$queryRawUnsafe<any[]>(
    `SELECT TABLE_NAME FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'unit' AND TABLE_NAME NOT IN ('scheduling_policies')`
  );
  
  console.log('Tables with unit column:');
  for (const row of tables) {
    const table = row.TABLE_NAME;
    const old = await prisma.$queryRawUnsafe<any[]>(
      `SELECT unit, COUNT(*) as cnt FROM ${table} WHERE unit IN ('NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI') GROUP BY unit`
    );
    if (old.length > 0) {
      console.log(`  ${table}: OLD VALUES FOUND!`, old);
    } else {
      // Check enum definition
      const colInfo = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = 'unit'`
      );
      const colType = (colInfo[0] as any)?.COLUMN_TYPE || '';
      const hasOld = colType.includes('NT1') || colType.includes('BAN_CO_GIOI');
      if (hasOld) {
        console.log(`  ${table}: enum still has old values: ${colType.substring(0,80)}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
