const { execSync } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('🚀 [THACO AGRI BACKEND] Initializing Production Environment');
console.log('====================================================');

// 1. Synchronize database schema with Prisma schema
console.log('🔄 [Database] Synchronizing schema with target database...');
try {
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
  });
  console.log('✅ [Database] Schema successfully synchronized with target database.');
} catch (pushErr) {
  console.error('⚠️ [Database] prisma db push encountered an issue:', pushErr.message);
  try {
    console.log('🔄 [Database] Attempting prisma migrate deploy as fallback...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: process.env,
    });
    console.log('✅ [Database] Migrations deployed successfully.');
  } catch (migrateErr) {
    console.error('❌ [Database] Migration deploy also failed:', migrateErr.message);
  }
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
