const { PrismaClient, DispatchStatus, TransportStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { username: 'minh.nv' } });
  if (!user) {
    console.log('Driver minh.nv not found!');
    return;
  }

  // Find or create a vehicle for driver
  let vehicle = await prisma.vehicle.findFirst({ where: { code: 'MK-023' } });
  if (!vehicle) {
    vehicle = await prisma.vehicle.findFirst();
  }

  // Update driver assigned vehicle
  await prisma.user.update({
    where: { id: user.id },
    data: {
      assignedVehicleId: vehicle?.id || null,
      currentShiftStatus: 'SAN_SANG',
    },
  });

  const today = new Date();
  const startToday = new Date(today);
  startToday.setHours(7, 0, 0, 0);

  const endToday = new Date(today);
  endToday.setHours(11, 30, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const endTomorrow = new Date(tomorrow);
  endTomorrow.setHours(12, 0, 0, 0);

  // 1. Dispatch Order: Cày đất Lô A12 (Active today - WORKING)
  await prisma.dispatchOrder.upsert({
    where: { code: 'LDX-20260912-001' },
    update: {
      driverId: user.id,
      vehicleId: vehicle?.id || null,
      status: DispatchStatus.WORKING,
      actualStartTime: startToday,
      purpose: 'Cày đất Lô A12',
      origin: 'Bãi đỗ cơ giới KLH Koun Mom',
      destination: 'Nông trường Ia Puch • Lô A12',
      departureTime: startToday,
      plannedEndTime: endToday,
      notes: '[Diện tích: 8.5 ha, hoàn thành 5.2 ha]',
    },
    create: {
      code: 'LDX-20260912-001',
      unit: user.unit,
      purpose: 'Cày đất Lô A12',
      origin: 'Bãi đỗ cơ giới KLH Koun Mom',
      destination: 'Nông trường Ia Puch • Lô A12',
      departureTime: startToday,
      plannedEndTime: endToday,
      status: DispatchStatus.WORKING,
      driverId: user.id,
      requesterId: user.id,
      vehicleId: vehicle?.id || null,
      actualStartTime: startToday,
      notes: '[Diện tích: 8.5 ha, hoàn thành 5.2 ha]',
      sourceType: 'MANUAL',
    },
  });

  // 2. Transport Order: Vận chuyển phân hữu cơ Lô B04 (Upcoming)
  await prisma.transportOrder.upsert({
    where: { code: 'VD-20260912-002' },
    update: {
      driverId: user.id,
      vehicleId: vehicle?.id || null,
      status: TransportStatus.ASSIGNED,
      departureTime: tomorrow,
      plannedEndTime: endTomorrow,
      cargoType: 'Vận chuyển phân hữu cơ vi sinh',
      origin: 'Kho Tổng Vật Tư KLH',
      destination: 'Lô B04 • Nông trường 2',
    },
    create: {
      code: 'VD-20260912-002',
      unit: user.unit,
      cargoType: 'Vận chuyển phân hữu cơ vi sinh',
      tonnage: 12.5,
      origin: 'Kho Tổng Vật Tư KLH',
      destination: 'Lô B04 • Nông trường 2',
      departureTime: tomorrow,
      plannedEndTime: endTomorrow,
      status: TransportStatus.ASSIGNED,
      driverId: user.id,
      vehicleId: vehicle?.id || null,
    },
  });

  console.log('Successfully seeded tasks for minh.nv!');
}

main().finally(() => prisma.$disconnect());
