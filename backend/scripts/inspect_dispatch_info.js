const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DRIVER USERS ===');
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    select: {
      id: true,
      username: true,
      fullName: true,
      unit: true,
      phone: true,
      driverProfile: {
        select: {
          licenseClass: true,
          currentShiftStatus: true,
          currentLocation: true,
          vehicleAssignments: {
            include: { vehicle: { select: { id: true, code: true, name: true, plate: true, category: true, status: true } } }
          }
        }
      }
    },
    take: 20,
  });
  console.log(`Found ${drivers.length} drivers:`);
  for (const d of drivers) {
    const assignedVehicles = d.driverProfile?.vehicleAssignments?.map(v => `${v.vehicle.code} (${v.vehicle.name})`).join(', ') || 'None';
    console.log(`- ID: ${d.id} | User: ${d.username} | Name: ${d.fullName} | Unit: ${d.unit} | Assigned: ${assignedVehicles} | Status: ${d.driverProfile?.currentShiftStatus}`);
  }

  console.log('\n=== COUNTS ===');
  console.log('Dispatch Orders:', await prisma.dispatchOrder.count());
  console.log('Operational Work Orders:', await prisma.operationalWorkOrder.count());
  console.log('Transport Orders:', await prisma.transportOrder.count());
  console.log('Production Plans:', await prisma.productionPlan.count());

  console.log('\n=== LATEST DISPATCH ORDERS ===');
  const latestOrders = await prisma.dispatchOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      driver: { select: { id: true, username: true, fullName: true } },
      vehicle: { select: { id: true, code: true, name: true, plate: true } },
      operationalWorkOrder: { select: { id: true, status: true, plannedStartAt: true, plannedEndAt: true } }
    }
  });
  for (const o of latestOrders) {
    console.log(`- Code: ${o.code} | Status: ${o.status} | Vehicle: ${o.vehicle?.code} | Driver: ${o.driver?.fullName} (${o.driver?.username}) | WorkOrder: ${o.operationalWorkOrder?.id} (${o.operationalWorkOrder?.status})`);
  }

  console.log('\n=== LATEST OPERATIONAL WORK ORDERS ===');
  const latestWo = await prisma.operationalWorkOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      dispatchOrder: { select: { code: true } },
      transportOrder: { select: { code: true } },
      vehicleAssignments: { include: { vehicle: { select: { code: true } } } },
      driverAssignments: { include: { driver: { select: { username: true, fullName: true } } } }
    }
  });
  for (const w of latestWo) {
    const drvs = w.driverAssignments.map(a => a.driver.username).join(', ');
    const vehs = w.vehicleAssignments.map(a => a.vehicle.code).join(', ');
    console.log(`- WO #${w.id} | Type: ${w.type} | Status: ${w.status} | Start: ${w.plannedStartAt} | Drivers: ${drvs} | Vehs: ${vehs}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
