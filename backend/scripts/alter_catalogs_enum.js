const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('ALTERING catalogs table column type...');
  await prisma.$queryRawUnsafe(`
    ALTER TABLE catalogs MODIFY COLUMN type ENUM(
      'COMPLEX',
      'REGION',
      'DEPARTMENT',
      'ENTERPRISE',
      'FARM',
      'TEAM',
      'PLOT',
      'LAND_PARCEL',
      'VEHICLE_CATEGORY',
      'JOB_TYPE',
      'POSITION',
      'JOB_ITEM',
      'ORDER_TYPE',
      'ROUTE',
      'CONSTRUCTION_SITE',
      'SPARE_PART',
      'TECHNICAL_QUOTA',
      'CG_MANAGER'
    ) NOT NULL;
  `);
  console.log('Successfully altered catalogs enum in MySQL!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
