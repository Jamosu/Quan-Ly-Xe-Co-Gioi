const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const depts = await prisma.catalogItem.findMany({ where: { type: 'DEPARTMENT' } });
  console.log('DEPARTMENT items in DB:', depts.length);
  depts.forEach(d => console.log(`- [${d.code}] ${d.name} (parent: ${d.parentCode})`));

  // Check if any vehicle, driver, user, dispatch order, or other catalog item references department codes
  const deptCodes = depts.map(d => d.code);
  const deptNames = depts.map(d => d.name);
  console.log('\nChecking references for codes:', deptCodes);

  // Users
  const usersWithDept = await prisma.user.findMany({
    where: {
      OR: [
        { unit: { in: [...deptCodes, ...deptNames] } }
      ]
    }
  });
  console.log('Users matching department:', usersWithDept.length);

  // Vehicles
  const vehiclesWithDept = await prisma.vehicle.findMany({
    where: {
      OR: [
        { department: { in: [...deptCodes, ...deptNames] } },
        { managingUnit: { in: [...deptCodes, ...deptNames] } }
      ]
    }
  });
  console.log('Vehicles matching department:', vehiclesWithDept.length);

  // Dispatch Orders
  const orders = await prisma.dispatchOrder.findMany({
    where: {
      OR: [
        { requestingDepartment: { in: [...deptCodes, ...deptNames] } },
        { managingUnit: { in: [...deptCodes, ...deptNames] } }
      ]
    }
  });
  console.log('Dispatch orders matching department:', orders.length);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
