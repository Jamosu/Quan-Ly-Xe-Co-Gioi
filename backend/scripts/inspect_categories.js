const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.vehicleDriverAssignment.findMany({
    include: {
      vehicle: { select: { id: true, code: true, name: true, category: true, unit: true } },
      driver: { include: { user: { select: { id: true, username: true, fullName: true, unit: true } } } }
    }
  });

  const categoryMap = {};
  for (const a of assignments) {
    const cat = a.vehicle.category;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push({
      driverId: a.driver.userId,
      username: a.driver.user.username,
      fullName: a.driver.user.fullName,
      unit: a.driver.user.unit,
      vehicleId: a.vehicle.id,
      vehicleCode: a.vehicle.code,
      vehicleName: a.vehicle.name,
    });
  }

  for (const [cat, list] of Object.entries(categoryMap)) {
    console.log('=== CATEGORY ' + cat + ' (' + list.length + ' assignments) ===');
    list.slice(0, 5).forEach(x => console.log('  - [' + x.driverId + '] ' + x.username + ' (' + x.fullName + ') -> ' + x.vehicleCode + ' (' + x.vehicleName + ') [' + x.unit + ']'));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
