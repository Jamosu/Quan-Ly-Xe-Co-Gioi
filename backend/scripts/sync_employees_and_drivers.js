const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const driversToSync = [
    {
      empCode: 'TX-NT1-001',
      fullName: 'Trần Đình Trọng',
      businessUnit: 'Nông trường 1',
      complex: 'Koun Mom (Campuchia)',
      enterprise: 'Xí nghiệp Chuối 1',
      farm: 'Nông trường 1',
      team: 'Đội Xe Cơ Giới NT1',
      position: 'Thợ vận hành máy cày Kubota',
      licenseClass: 'HANG_B2',
      licenseNumber: 'GPLX-KM-88991',
      licenseExpiryDate: '2028-12-31',
      healthCheckExpiryDate: '2026-12-31',
      status: 'Đang làm việc',
      username: 'tx.kounmom',
      phone: '0988123456',
      email: 'tx.kounmom@thacoagri.com.vn',
    },
    {
      empCode: 'TX-SN-001',
      fullName: 'Phan Văn Đức',
      businessUnit: 'Ban Cơ Giới Snoul',
      complex: 'Snoul (Campuchia)',
      enterprise: 'Ban Cơ Giới Snoul',
      farm: 'Khu công nghiệp Snoul',
      team: 'Đội Xe Đầu Kéo Container',
      position: 'Lái xe đầu kéo Container lạnh',
      licenseClass: 'HANG_CE',
      licenseNumber: 'GPLX-SN-77221',
      licenseExpiryDate: '2028-10-15',
      healthCheckExpiryDate: '2026-11-20',
      status: 'Đang làm việc',
      username: 'tx.snoul',
      phone: '0977234567',
      email: 'tx.snoul@thacoagri.com.vn',
    },
    {
      empCode: 'TX-NL-001',
      fullName: 'Khamphou Somlith',
      businessUnit: 'Ban Cơ Giới Nam Lào',
      complex: 'Nam Lào (Attapeu)',
      enterprise: 'Xí nghiệp Nông nghiệp Nam Lào',
      farm: 'Nông trường Cây ăn trái 2',
      team: 'Đội Cơ Giới Làm Đất Nam Lào',
      position: 'Thợ vận hành máy gặt đập & máy cày',
      licenseClass: 'HANG_B2',
      licenseNumber: 'GPLX-NL-66331',
      licenseExpiryDate: '2029-05-18',
      healthCheckExpiryDate: '2026-09-30',
      status: 'Đang làm việc',
      username: 'tx.namlao',
      phone: '0966345678',
      email: 'tx.namlao@thacoagri.com.vn',
    },
    {
      empCode: 'CB-QL-KM01',
      fullName: 'Lê Văn Hùng',
      businessUnit: 'Ban Quản lý Nông trường',
      complex: 'Koun Mom (Campuchia)',
      enterprise: 'Xí nghiệp Chuối 1',
      farm: 'Nông trường 1',
      team: 'Ban Quản đốc',
      position: 'Quản đốc Nông trường 1',
      licenseClass: 'HANG_B2',
      licenseNumber: 'GPLX-KM-11223',
      licenseExpiryDate: '2029-01-01',
      healthCheckExpiryDate: '2027-01-01',
      status: 'Đang làm việc',
      username: 'quanly.kounmom',
      phone: '0912345678',
      email: 'quanly.kounmom@thacoagri.com.vn',
    },
    {
      empCode: 'ADMIN-001',
      fullName: 'Quản trị viên Hệ thống',
      businessUnit: 'Văn phòng Điều hành',
      complex: 'Toàn bộ Khu Liên Hợp',
      enterprise: 'Văn phòng Điều hành Trung tâm',
      farm: 'Trụ sở Điều hành',
      team: 'Ban CNTT & Cơ giới',
      position: 'Quản trị viên Hệ thống (Admin)',
      licenseClass: null,
      licenseNumber: null,
      licenseExpiryDate: null,
      healthCheckExpiryDate: null,
      status: 'Đang làm việc',
      username: 'admin',
      phone: '0901234567',
      email: 'admin@thacoagri.com.vn',
    }
  ];

  for (const emp of driversToSync) {
    const existing = await prisma.employeeRecord.findFirst({
      where: {
        OR: [
          { empCode: emp.empCode },
          { username: emp.username }
        ]
      }
    });

    if (existing) {
      await prisma.employeeRecord.update({
        where: { id: existing.id },
        data: emp
      });
      console.log('Updated employeeRecord:', emp.empCode, emp.fullName);
    } else {
      await prisma.employeeRecord.create({
        data: emp
      });
      console.log('Created employeeRecord:', emp.empCode, emp.fullName);
    }
  }

  // Also sync User codes
  for (const emp of driversToSync) {
    const u = await prisma.user.findUnique({ where: { username: emp.username } });
    if (u) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          code: emp.empCode,
          fullName: emp.fullName,
          phone: emp.phone,
        }
      });
      console.log('Synced user code with empCode:', u.username, '->', emp.empCode);
    }
  }

  console.log('Sync completed successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
