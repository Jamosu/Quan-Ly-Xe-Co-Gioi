const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function restoreDump() {
  const dumpPath = path.resolve(__dirname, '../prisma/production_data_dump.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error(`❌ Dump file not found: ${dumpPath}`);
    process.exit(1);
  }

  console.log(`📦 Loading dump file: ${dumpPath}...`);
  const content = fs.readFileSync(dumpPath, 'utf8');
  
  // Split statements by semicolon followed by newline
  const rawStatements = content.split(/;\r?\n/);
  console.log(`Found ${rawStatements.length} potential SQL statements.`);

  const prisma = new PrismaClient();

  try {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    console.log('✅ Disabled foreign key checks.');

    let executed = 0;
    for (let i = 0; i < rawStatements.length; i++) {
      let stmt = rawStatements[i].trim();
      // Remove comment lines from start
      stmt = stmt.replace(/^--.*$/gm, '').trim();
      if (!stmt) continue;

      try {
        await prisma.$executeRawUnsafe(stmt);
        executed++;
        if (executed % 50 === 0) {
          console.log(`  Progress: ${executed} statements executed...`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Warning on statement ${i + 1} (${stmt.slice(0, 50)}...): ${err.message}`);
      }
    }

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    console.log(`✅ Successfully executed ${executed} statements. Foreign keys re-enabled.`);

    const vehicleCount = await prisma.vehicle.count();
    const implementCount = await prisma.agriculturalImplement.count();
    const userCount = await prisma.user.count();
    console.log(`🎉 Verification:`);
    console.log(`  - Vehicles: ${vehicleCount}`);
    console.log(`  - Implements: ${implementCount}`);
    console.log(`  - Users: ${userCount}`);
  } catch (err) {
    console.error('❌ Fatal error during restore:', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  restoreDump();
}

module.exports = { restoreDump };
