const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const driversWithTasks = await prisma.dispatchOrder.findMany({
    where: { driverId: { not: null } },
    select: { driverId: true, code: true, status: true, driver: { select: { username: true, fullName: true } } },
    take: 10,
  });
  console.log('Drivers with dispatch orders:', driversWithTasks);
}

main().finally(() => prisma.$disconnect());
