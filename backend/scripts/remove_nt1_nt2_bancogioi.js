const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Updating Database to remove NT1, NT2, Ban_co_gioi ---');

  // 1. Update employeeRecord for Koun Mom driver
  await prisma.employeeRecord.updateMany({
    where: {
      OR: [
        { empCode: 'TX-NT1-001' },
        { empCode: 'TX-KM-001' },
        { username: 'tx.kounmom' }
      ]
    },
    data: {
      empCode: 'TX-KM-001',
      fullName: 'Trần Đình Trọng',
      complex: 'KLH Koun Mom',
      businessUnit: 'KLH Koun Mom',
      enterprise: 'KLH Koun Mom',
      farm: 'KLH Koun Mom',
      team: 'Đội xe KLH Koun Mom',
      position: 'Lái xe cơ giới - KLH Koun Mom'
    }
  });

  // 2. Update employeeRecord for Koun Mom manager
  await prisma.employeeRecord.updateMany({
    where: {
      OR: [
        { empCode: 'CB-QL-KM01' },
        { username: 'quanly.kounmom' }
      ]
    },
    data: {
      empCode: 'CB-QL-KM01',
      fullName: 'Lê Văn Hùng',
      complex: 'KLH Koun Mom',
      businessUnit: 'KLH Koun Mom',
      enterprise: 'KLH Koun Mom',
      farm: 'KLH Koun Mom',
      team: 'Ban Điều Hành KLH Koun Mom',
      position: 'Nhân sự quản lý - KLH Koun Mom'
    }
  });

  // 3. Update employeeRecord for Snoul driver
  await prisma.employeeRecord.updateMany({
    where: {
      OR: [
        { empCode: 'TX-SN-001' },
        { username: 'tx.snoul' }
      ]
    },
    data: {
      empCode: 'TX-SN-001',
      fullName: 'Phan Văn Đức',
      complex: 'KLH Snoul',
      businessUnit: 'KLH Snoul',
      enterprise: 'KLH Snoul',
      farm: 'KLH Snoul',
      team: 'Đội xe KLH Snoul',
      position: 'Lái xe đầu kéo Container - KLH Snoul'
    }
  });

  // 4. Update employeeRecord for Nam Lao driver
  await prisma.employeeRecord.updateMany({
    where: {
      OR: [
        { empCode: 'TX-NL-001' },
        { username: 'tx.namlao' }
      ]
    },
    data: {
      empCode: 'TX-NL-001',
      fullName: 'Khamphou Somlith',
      complex: 'KLH Nam Lào',
      businessUnit: 'KLH Nam Lào',
      enterprise: 'KLH Nam Lào',
      farm: 'KLH Nam Lào',
      team: 'Đội xe KLH Nam Lào',
      position: 'Lái xe cơ giới - KLH Nam Lào'
    }
  });

  // 5. Update employeeRecord for Admin
  await prisma.employeeRecord.updateMany({
    where: {
      OR: [
        { empCode: 'ADMIN-001' },
        { username: 'admin' }
      ]
    },
    data: {
      empCode: 'ADMIN-001',
      fullName: 'Quản trị viên Hệ thống',
      complex: 'Toàn bộ 3 Khu Liên Hợp',
      businessUnit: 'Toàn bộ 3 Khu Liên Hợp',
      enterprise: 'Văn phòng Điều hành Trung tâm',
      farm: 'Toàn bộ 3 Khu Liên Hợp',
      team: 'Văn phòng Điều hành',
      position: 'Quản trị viên Hệ thống (Admin)'
    }
  });

  // 6. Update users table code
  await prisma.user.updateMany({
    where: { username: 'tx.kounmom' },
    data: { code: 'TX-KM-001' }
  });

  console.log('✅ Database updated successfully!');
  const checkEmps = await prisma.employeeRecord.findMany({
    where: {
      empCode: { in: ['ADMIN-001', 'CB-QL-KM01', 'TX-KM-001', 'TX-SN-001', 'TX-NL-001'] }
    },
    select: { empCode: true, fullName: true, complex: true, businessUnit: true, position: true }
  });
  console.log('Verified employees:', JSON.stringify(checkEmps, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
