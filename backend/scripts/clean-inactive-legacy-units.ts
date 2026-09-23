import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Cleaning inactive legacy units from driver_management_units ===');

  const inactiveOwners = await prisma.driverManagementUnit.findMany({
    where: { complexCode: 'KOUN_MOM', level: 'OWNER', status: 'INACTIVE' },
  });

  const ownerIds = inactiveOwners.map((o) => o.id);
  console.log(`Found ${ownerIds.length} inactive OWNER units.`);

  const inactiveTeams = await prisma.driverManagementUnit.findMany({
    where: { parentId: { in: ownerIds } },
  });
  const teamIds = inactiveTeams.map((t) => t.id);
  console.log(`Found ${teamIds.length} inactive dummy TEAM units under those owners.`);

  const allIds = [...ownerIds, ...teamIds];

  // Clean relations on these inactive units
  const delAssignments = await prisma.managementUnitManagerAssignment.deleteMany({
    where: { managementUnitId: { in: allIds } },
  });
  console.log(`Deleted ${delAssignments.count} manager assignments.`);

  const delScopes = await prisma.driverManagementAccessScope.deleteMany({
    where: { managementUnitId: { in: allIds } },
  });
  console.log(`Deleted ${delScopes.count} access scopes.`);

  // Delete inactive teams first
  const delTeams = await prisma.driverManagementUnit.deleteMany({
    where: { id: { in: teamIds } },
  });
  console.log(`Deleted ${delTeams.count} inactive teams.`);

  // Delete inactive owners
  const delOwners = await prisma.driverManagementUnit.deleteMany({
    where: { id: { in: ownerIds } },
  });
  console.log(`Deleted ${delOwners.count} inactive owners.`);

  // Verify remaining units
  const remainingOwners = await prisma.driverManagementUnit.findMany({
    where: { complexCode: 'KOUN_MOM', level: 'OWNER' },
  });
  console.log(`Remaining OWNER units at KOUN_MOM: ${remainingOwners.length}`);
  remainingOwners.forEach((o) => console.log(`  [${o.id}] ${o.code} - ${o.name} (${o.status})`));

  const remainingTeams = await prisma.driverManagementUnit.findMany({
    where: { complexCode: 'KOUN_MOM', level: 'TEAM' },
  });
  console.log(`Remaining TEAM units at KOUN_MOM: ${remainingTeams.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
