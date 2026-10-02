const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
          vehicleAssignments: {
            include: {
              vehicle: {
                select: { id: true, code: true, name: true, plate: true, category: true, status: true }
              }
            }
          }
        }
      }
    },
    take: 30,
  });

  console.log(`Found ${drivers.length} drivers:`);
  for (const d of drivers) {
    const vas = d.driverProfile?.vehicleAssignments?.map(a => `${a.vehicle.code} (${a.vehicle.category} - ${a.vehicle.name})`).join(', ') || 'Chưa gán';
    console.log(`- [${d.id}] ${d.username} | ${d.fullName} | ${d.unit} | Shift: ${d.driverProfile?.currentShiftStatus} | Gán xe: ${vas}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
