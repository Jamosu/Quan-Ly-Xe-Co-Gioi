const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emps = await prisma.employeeRecord.findMany({
    where: {
      OR: [
        { empCode: { in: ['ACC-TX-KM01', 'ACC-TX-SN01', 'ACC-TX-NL01', 'TX-NT1-001', 'TX-SN-001', 'TX-NL-001', 'KM-TX-001', 'SN-TX-001', 'NL-TX-001', 'CB-QL-KM01'] } },
        { fullName: { in: ['Trần Đình Trọng', 'Phan Văn Đức', 'Khamphou Somlith', 'Lê Văn Hùng'] } }
      ]
    }
  });
  console.log('Found matching employeeRecords in DB:', emps.length);
  emps.forEach(e => console.log(e.id, '|', e.empCode, '|', e.fullName, '|', e.position, '|', e.complex, '|', e.licenseClass, '|', e.phone));
  await prisma.$disconnect();
}
main().catch(console.error);
