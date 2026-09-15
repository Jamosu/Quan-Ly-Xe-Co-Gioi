const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const admins = await p.user.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true },
    select: { id: true, username: true, fullName: true, role: true, unit: true }
  });
  console.log('ADMINS:', JSON.stringify(admins, null, 2));

  const dispatchers = await p.user.findMany({
    where: { role: 'DISPATCHER', isActive: true },
    select: { id: true, username: true, fullName: true, role: true, unit: true },
    take: 3
  });
  console.log('DISPATCHERS:', JSON.stringify(dispatchers, null, 2));

  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
