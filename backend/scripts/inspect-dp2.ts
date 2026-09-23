import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const team = await prisma.driverManagementUnit.findFirst({
    where: { code: 'CG-KM-XN-CHUOI-DP2' },
    include: {
      vehicles: {
        where: { vehicleType: { operationalDomain: 'AGRICULTURE' } },
        include: { vehicleType: true },
      },
      implements: true,
      teamAssignments: {
        where: { effectiveTo: null },
        include: {
          driver: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  console.log('XN Chuối DP2:');
  console.log('Agri Vehicles count:', team?.vehicles.length);
  console.log('Implements count:', team?.implements.length);
  console.log('Drivers count:', team?.teamAssignments.length);
  for (const a of team?.teamAssignments || []) {
    const u = a.driver.user;
    const p = a.driver;
    console.log(`Driver [${u.code}] ${u.fullName}: status=${u.employmentStatus}/${u.currentShiftStatus}, userLic=${u.licenseClass}, profLic=${p.licenseClass}, licensesJson=${JSON.stringify(p.licensesJson)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
