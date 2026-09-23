const { execSync } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('🚀 [THACO AGRI BACKEND] Initializing Production Environment');
console.log('====================================================');

// 1. Apply committed production migrations before starting the API.
console.log('🔄 [Database] Applying production migrations...');
try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
  });
  console.log('✅ [Database] Production migrations applied successfully.');
} catch (migrateErr) {
  console.error('❌ [Database] Migration deploy failed:', migrateErr.message);
  process.exit(1);
}

// 2. Check if database has data; if users table is empty, auto-restore production dump
async function checkAndSeed() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch (_) {
      userCount = 0;
    }
    console.log(`ℹ️ [Database] Current user count: ${userCount}`);

    if (userCount === 0) {
      console.log('🌱 [Database] Database is empty. Attempting to restore production data dump...');
      try {
        const { restoreDump } = require('./restore-production-dump');
        await restoreDump();
        console.log('✅ [Database] Production dump restored successfully.');
      } catch (dumpErr) {
        console.warn('⚠️ [Database] Could not restore full dump, running seed.ts instead:', dumpErr.message);
        try {
          execSync('npx ts-node prisma/seed.ts', {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '..'),
            env: process.env,
          });
          console.log('✅ [Database] Seed completed successfully.');
        } catch (seedErr) {
          console.error('⚠️ [Database] Seed script error:', seedErr.message);
        }
      }
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error('⚠️ [Database] Check/seed check error:', err.message);
  }

  // 3. Start the NestJS application
  console.log('🚀 [Server] Launching NestJS Application...');
  require('../dist/main.js');
}

checkAndSeed();
