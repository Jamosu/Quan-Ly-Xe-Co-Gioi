const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Altering production_plans...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`production_plans\`
      MODIFY COLUMN \`stage\` ENUM('LAM_DAT','TRONG_MOI','THU_HOACH','VAN_CHUYEN','HAU_CAN') NOT NULL DEFAULT 'LAM_DAT'
    `);
    console.log('✅ stage enum updated');
  } catch(e) { console.log('stage enum:', e.message); }

  const planCols = [
    { name: 'weekNumber', sql: 'ADD COLUMN `weekNumber` INT NULL' },
    { name: 'complexName', sql: 'ADD COLUMN `complexName` VARCHAR(191) NULL' },
    { name: 'enterpriseCode', sql: 'ADD COLUMN `enterpriseCode` VARCHAR(191) NULL' },
    { name: 'enterpriseName', sql: 'ADD COLUMN `enterpriseName` VARCHAR(191) NULL' },
    { name: 'farmCode', sql: 'ADD COLUMN `farmCode` VARCHAR(191) NULL' },
    { name: 'farmName', sql: 'ADD COLUMN `farmName` VARCHAR(191) NULL' },
    { name: 'notes', sql: 'ADD COLUMN `notes` TEXT NULL' },
  ];

  for (const col of planCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`production_plans\` ${col.sql}`);
      console.log('✅ added col ' + col.name);
    } catch(e) { console.log('col ' + col.name + ':', e.message); }
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`production_plan_items\`
      MODIFY COLUMN \`stage\` ENUM('LAM_DAT','TRONG_MOI','THU_HOACH','VAN_CHUYEN','HAU_CAN') NOT NULL
    `);
    console.log('✅ plan_items stage enum updated');
  } catch(e) { console.log('plan_items stage enum:', e.message); }

  const itemCols = [
    { name: 'jobCode', sql: 'ADD COLUMN `jobCode` VARCHAR(191) NULL' },
    { name: 'implementGroup', sql: 'ADD COLUMN `implementGroup` VARCHAR(191) NULL' },
    { name: 'recommendedVehicle', sql: 'ADD COLUMN `recommendedVehicle` VARCHAR(191) NULL' },
    { name: 'scheduledDays', sql: 'ADD COLUMN `scheduledDays` VARCHAR(191) NULL' },
    { name: 'taskStatus', sql: 'ADD COLUMN `taskStatus` VARCHAR(191) NULL DEFAULT "PENDING"' },
  ];

  for (const col of itemCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`production_plan_items\` ${col.sql}`);
      console.log('✅ added col ' + col.name);
    } catch(e) { console.log('col ' + col.name + ':', e.message); }
  }

  console.log('Done altering database!');
  process.exit(0);
}
run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
