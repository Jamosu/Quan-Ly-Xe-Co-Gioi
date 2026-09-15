const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const [drivers, vehicles, plans, dispatchOrders] = await Promise.all([
    p.user.findMany({
      where: { role: 'DRIVER', isActive: true, employmentStatus: 'DANG_LAM_VIEC', currentShiftStatus: 'SAN_SANG' },
      select: { id: true, code: true, fullName: true, unit: true, licenseClass: true, licenseExpiryDate: true, healthCheckExpiryDate: true, currentShiftStatus: true },
      take: 8
    }),
    p.vehicle.findMany({
      where: { status: 'CHO_PHAN_CONG' },
      select: { id: true, code: true, plate: true, unit: true, status: true, vehicleTypeId: true },
      take: 8
    }),
    p.productionPlan.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, code: true, title: true, planType: true, unit: true, weekNumber: true, startDate: true, endDate: true },
      take: 5
    }),
    p.dispatchOrder.findMany({
      where: { status: { notIn: ['CANCELLED'] } },
      select: { id: true, code: true, status: true, vehicleId: true, driverId: true, departureTime: true, plannedEndTime: true, unit: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  console.log('=== DRIVERS AVAILABLE (SAN_SANG) ===');
  console.log(JSON.stringify(drivers, null, 2));
  console.log('\n=== VEHICLES AVAILABLE (CHO_PHAN_CONG) ===');
  console.log(JSON.stringify(vehicles, null, 2));
  console.log('\n=== PLANS APPROVED ===');
  console.log(JSON.stringify(plans, null, 2));
  console.log('\n=== RECENT DISPATCH ORDERS ===');
  console.log(JSON.stringify(dispatchOrders, null, 2));

  await p.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
