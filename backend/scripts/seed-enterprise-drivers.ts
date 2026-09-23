import {
  PrismaClient,
  Role,
  Unit,
  DriverEmploymentStatus,
  DriverShiftStatus,
  DriverLicenseClass,
  VehicleDriverAssignmentType,
  VehicleDriverAssignmentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const VIETNAMESE_FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const VIETNAMESE_MIDDLE_NAMES = ['Văn', 'Quốc', 'Thanh', 'Hữu', 'Đình', 'Minh', 'Hải', 'Đức', 'Gia', 'Trọng', 'Công', 'Xuân', 'Kim', 'Bảo'];
const VIETNAMESE_LAST_NAMES = ['Minh', 'Huy', 'Nam', 'Hải', 'Thành', 'An', 'Đạt', 'Phúc', 'Tâm', 'Khoa', 'Tuấn', 'Duy', 'Tài', 'Linh', 'Bình', 'Hùng', 'Vinh', 'Hậu', 'Lợi', 'Thuận'];

const KHMER_NAMES = [
  'Sokha Chamnan', 'Keo Sarath', 'Sok Phearith', 'Chan Vibol', 'Seng Rithy',
  'Choun Vanna', 'Samnang Rath', 'Vannak Dara', 'Heng Sovann', 'Buntha Chea',
  'Pich Samat', 'Mony Pich', 'Ratanak Sambath', 'Chhaya Roth', 'Socheat Vichea',
  'Kosal Vuthy', 'Kimheng Srun', 'Thearith Kong', 'Boran Sareth', 'Chanthy Men',
];

interface EnterpriseDef {
  unit: Unit;
  code: string;
  name: string;
  managementUnitId: number;
  teams: {
    nongNghiep: string;
    congTrinh: string;
    vanChuyen: string;
  };
}

const ENTERPRISES: EnterpriseDef[] = [
  {
    unit: Unit.KOUN_MOM,
    code: 'NT1',
    name: 'Xí nghiệp Chuối Daun Penh',
    managementUnitId: 2, // Đơn vị Cơ giới & Vận tải Chuối
    teams: {
      nongNghiep: 'Đội Cơ giới Làm đất NT1',
      congTrinh: 'Đội Xe Công trình NT1',
      vanChuyen: 'Đội Vận tải Chuối NT1',
    },
  },
  {
    unit: Unit.KOUN_MOM,
    code: 'NT2',
    name: 'Xí nghiệp Chuối Lumphat',
    managementUnitId: 2, // Đơn vị Cơ giới & Vận tải Chuối
    teams: {
      nongNghiep: 'Đội Cơ giới Làm đất NT2',
      congTrinh: 'Đội Xe Công trình NT2',
      vanChuyen: 'Đội Vận tải Chuối NT2',
    },
  },
  {
    unit: Unit.KOUN_MOM,
    code: 'XN_BO',
    name: 'Xí nghiệp Chăn nuôi Bò Koun Mom',
    managementUnitId: 3, // Đơn vị Cơ giới Chăn nuôi Bò
    teams: {
      nongNghiep: 'Đội Cơ giới Trồng & Thu hoạch Cỏ',
      congTrinh: 'Đội Công trình Chuồng trại Bò',
      vanChuyen: 'Đội Vận chuyển Thức ăn TMR',
    },
  },
  {
    unit: Unit.KOUN_MOM,
    code: 'BAN_CO_GIOI',
    name: 'Ban Cơ giới KLH Koun Mom',
    managementUnitId: 1, // Ban Cơ giới KLH Koun Mom
    teams: {
      nongNghiep: 'Đội Thi công Khai hoang Nông nghiệp',
      congTrinh: 'Đội Cơ giới San ủi Thi công',
      vanChuyen: 'Đội Xe Container Đường dài',
    },
  },
  {
    unit: Unit.KOUN_MOM,
    code: 'TT_BTSC',
    name: 'Trung tâm BTSC Koun Mom',
    managementUnitId: 4, // Trung tâm BTSC Koun Mom
    teams: {
      nongNghiep: 'Tổ Thử nghiệm & Chạy thử Máy Nông nghiệp',
      congTrinh: 'Đội Cơ giới Thử tải & Sửa chữa',
      vanChuyen: 'Đội Xe Cứu hộ & Bồn Nhiên liệu',
    },
  },
];

async function main() {
  console.log('🚀 Bắt đầu thiết kế lại toàn bộ 100 tài xế (20 tài xế/xí nghiệp x 5 xí nghiệp KLH KOUN MOM)...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Fetch available vehicles grouped by category
  const [agriVehicles, constrVehicles, transVehicles] = await Promise.all([
    prisma.vehicle.findMany({
      where: { category: { in: ['MAY_CAY', 'MAY_KEO'] } },
      select: { id: true, code: true, name: true, category: true, plate: true, unit: true },
      orderBy: { id: 'asc' },
    }),
    prisma.vehicle.findMany({
      where: { category: { in: ['MAY_DAO', 'MAY_UI', 'MAY_LU', 'MAY_SAN', 'MAY_XUC_LAT'] } },
      select: { id: true, code: true, name: true, category: true, plate: true, unit: true },
      orderBy: { id: 'asc' },
    }),
    prisma.vehicle.findMany({
      where: { category: { in: ['XE_BEN', 'XE_TAI', 'XE_CONTAINER', 'XE_BON'] } },
      select: { id: true, code: true, name: true, category: true, plate: true, unit: true },
      orderBy: { id: 'asc' },
    }),
  ]);

  console.log(`📦 Tìm thấy: ${agriVehicles.length} xe nông nghiệp, ${constrVehicles.length} xe công trình, ${transVehicles.length} xe vận chuyển.`);

  if (agriVehicles.length < 35 || constrVehicles.length < 35 || transVehicles.length < 30) {
    throw new Error('Không đủ phương tiện trong DB để phân bổ cho 100 tài xế!');
  }

  // Clear all old assignments to build a clean, conflict-free state
  console.log('🧹 Dọn dẹp phân công xe cũ để đảm bảo không bị xung đột phân quyền...');
  await prisma.vehicleDriverAssignment.deleteMany({});
  await prisma.driverManagementAssignment.deleteMany({});
  await prisma.vehicle.updateMany({ data: { defaultDriverId: null } });
  await prisma.user.updateMany({ where: { role: Role.DRIVER }, data: { assignedVehicleId: null } });

  let driverCounter = 1;
  let agriIdx = 0;
  let constrIdx = 0;
  let transIdx = 0;

  for (let eIndex = 0; eIndex < ENTERPRISES.length; eIndex++) {
    const ent = ENTERPRISES[eIndex];
    console.log(`\n🏢 Đang xử lý xí nghiệp ${eIndex + 1}/5: ${ent.name} (${ent.code})...`);

    const enterpriseDrivers: Array<{
      id: number;
      jobCategory: 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN';
      code: string;
      fullName: string;
    }> = [];

    // Create 20 drivers for this enterprise
    for (let i = 1; i <= 20; i++) {
      const code = `TX-${String(driverCounter).padStart(3, '0')}`;
      let fullName = '';
      if (driverCounter === 1) {
        fullName = 'Nguyễn Văn Minh'; // Keep the user's primary driver
      } else if (i % 3 === 0 && KHMER_NAMES[(driverCounter + i) % KHMER_NAMES.length]) {
        fullName = KHMER_NAMES[(driverCounter + i) % KHMER_NAMES.length];
      } else {
        const fn = VIETNAMESE_FIRST_NAMES[(driverCounter * 3 + i) % VIETNAMESE_FIRST_NAMES.length];
        const mn = VIETNAMESE_MIDDLE_NAMES[(driverCounter * 7 + i) % VIETNAMESE_MIDDLE_NAMES.length];
        const ln = VIETNAMESE_LAST_NAMES[(driverCounter * 5 + i) % VIETNAMESE_LAST_NAMES.length];
        fullName = `${fn} ${mn} ${ln}`;
      }

      const username = `driver.${code.toLowerCase().replace('-', '')}`;
      const phone = `09${Math.floor(10000000 + Math.random() * 89999999)}`;

      // Assign Job Category: 1-7 = Nông nghiệp (7), 8-14 = Công trình (7), 15-20 = Vận chuyển (6)
      let jobCategory: 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN';
      let team = '';
      let position = '';
      let licenseClass: DriverLicenseClass = DriverLicenseClass.HANG_B2;
      let licenseNumber = `79${Math.floor(1000000000 + Math.random() * 8999999999)}`;
      let licenseExpiry = new Date('2028-08-26');
      let licenses: any[] = [];

      if (i <= 7) {
        // NÔNG NGHIỆP
        jobCategory = 'NONG_NGHIEP';
        team = ent.teams.nongNghiep;
        position = i % 2 === 0 ? 'Thợ vận hành máy kéo Kubota / John Deere' : 'Thợ lái máy cày bánh hơi nông nghiệp';
        licenseClass = DriverLicenseClass.HANG_B2;
        licenseExpiry = new Date('2028-06-15');
        licenses = [
          {
            category: 'Hạng B2 (Máy cày, ô tô con <9 chỗ, tải <3.5T)',
            number: licenseNumber,
            issueDate: '2023-06-15',
            expiryDate: '2028-06-15',
            issuedBy: 'Sở GTVT Tỉnh Đồng Nai',
            isPrimary: true,
          },
          {
            category: 'Chứng chỉ vận hành máy kéo & cơ giới nông nghiệp',
            number: `CC-NN-${1000 + driverCounter}`,
            issueDate: '2022-04-10',
            expiryDate: '2032-04-10',
            issuedBy: 'Trường Đào tạo Kỹ thuật & Cơ giới THACO AGRI',
            isPrimary: false,
          },
        ];
      } else if (i <= 14) {
        // CÔNG TRÌNH
        jobCategory = 'CONG_TRINH';
        team = ent.teams.congTrinh;
        const constrPositions = [
          'Thợ vận hành máy đào bánh xích gàu 1.2m3',
          'Thợ lái máy ủi làm đất lòng hồ',
          'Thợ vận hành máy lu rung nền đường',
          'Thợ lái máy san đất mặt bằng',
        ];
        position = constrPositions[(driverCounter + i) % constrPositions.length];
        licenseClass = DriverLicenseClass.HANG_C;
        licenseExpiry = new Date('2027-11-20');
        licenses = [
          {
            category: 'Chứng chỉ vận hành máy xúc đào & thi công công trình',
            number: `CC-CT-${2000 + driverCounter}`,
            issueDate: '2021-08-10',
            expiryDate: '2031-08-10',
            issuedBy: 'Trường Cao đẳng Cơ giới Nông nghiệp & Công trình',
            isPrimary: true,
          },
          {
            category: 'Hạng C (Xe tải, xe ben >3.5T, máy kéo rơ-moóc)',
            number: licenseNumber,
            issueDate: '2022-11-20',
            expiryDate: '2027-11-20',
            issuedBy: 'Sở GTVT TP. Hồ Chí Minh',
            isPrimary: false,
          },
        ];
      } else {
        // VẬN CHUYỂN
        jobCategory = 'VAN_CHUYEN';
        team = ent.teams.vanChuyen;
        const transPositions = [
          'Lái xe tải ben 10T vận chuyển',
          'Lái xe đầu kéo Container xuất khẩu',
          'Lái xe bồn tiếp nhiên liệu lưu động',
          'Lái xe tải thùng chuyển nông sản',
        ];
        position = transPositions[(driverCounter + i) % transPositions.length];
        licenseClass = i === 16 ? DriverLicenseClass.HANG_CE : DriverLicenseClass.HANG_C;
        licenseExpiry = new Date('2028-12-10');
        licenses = [
          {
            category: licenseClass === DriverLicenseClass.HANG_CE
              ? 'Hạng CE (Xe đầu kéo rơ-moóc, Container)'
              : 'Hạng C (Xe tải ben >3.5T)',
            number: licenseNumber,
            issueDate: '2023-12-10',
            expiryDate: '2028-12-10',
            issuedBy: 'Sở GTVT Tỉnh Bình Dương',
            isPrimary: true,
          },
          {
            category: 'Chứng chỉ huấn luyện an toàn vận tải & PCCC phương tiện',
            number: `AT-VT-${3000 + driverCounter}`,
            issueDate: '2024-01-15',
            expiryDate: '2027-01-15',
            issuedBy: 'Cục Cảnh sát PCCC & CNCH',
            isPrimary: false,
          },
        ];
      }

      // Upsert User
      const user = await prisma.user.upsert({
        where: { code },
        update: {
          username,
          fullName,
          phone,
          unit: ent.unit,
          role: Role.DRIVER,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          currentShiftStatus: DriverShiftStatus.SAN_SANG,
          licenseClass,
          licenseNumber,
          licenseExpiryDate: licenseExpiry,
          healthCheckExpiryDate: new Date('2027-05-15'),
          currentLocation: `Xí nghiệp ${ent.code} - ${team}`,
          joinedDate: new Date('2022-03-01'),
          isActive: true,
        },
        create: {
          code,
          username,
          passwordHash,
          fullName,
          phone,
          unit: ent.unit,
          role: Role.DRIVER,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          currentShiftStatus: DriverShiftStatus.SAN_SANG,
          licenseClass,
          licenseNumber,
          licenseExpiryDate: licenseExpiry,
          healthCheckExpiryDate: new Date('2027-05-15'),
          currentLocation: `Xí nghiệp ${ent.code} - ${team}`,
          joinedDate: new Date('2022-03-01'),
          isActive: true,
        },
      });

      // Upsert EmployeeRecord
      await prisma.employeeRecord.upsert({
        where: { empCode: code },
        update: {
          fullName,
          phone,
          email: `${username}@thacoagri.vn`,
          businessUnit: ent.name,
          enterprise: ent.name,
          complex: 'KOUN_MOM',
          farm: ent.name,
          team,
          position,
          licenseClass,
          licenseNumber,
          licenseExpiryDate: licenseExpiry.toISOString().slice(0, 10),
          healthCheckExpiryDate: '2027-05-15',
          status: 'Đang làm việc',
          joinedDate: '2022-03-01',
        },
        create: {
          empCode: code,
          fullName,
          phone,
          email: `${username}@thacoagri.vn`,
          businessUnit: ent.name,
          enterprise: ent.name,
          complex: 'KOUN_MOM',
          farm: ent.name,
          team,
          position,
          licenseClass,
          licenseNumber,
          licenseExpiryDate: licenseExpiry.toISOString().slice(0, 10),
          healthCheckExpiryDate: '2027-05-15',
          status: 'Đang làm việc',
          joinedDate: '2022-03-01',
        },
      });

      // Upsert DriverProfile with multiple licensesJson
      await prisma.driverProfile.upsert({
        where: { userId: user.id },
        update: {
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          joinedDate: new Date('2022-03-01'),
          licenseClass,
          licenseNumber,
          licenseExpiryDate: licenseExpiry,
          healthCheckExpiryDate: new Date('2027-05-15'),
          currentShiftStatus: DriverShiftStatus.SAN_SANG,
          currentLocation: `Xí nghiệp ${ent.code} - ${team}`,
          licensesJson: licenses,
        },
        create: {
          userId: user.id,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          joinedDate: new Date('2022-03-01'),
          licenseClass,
          licenseNumber,
          licenseExpiryDate: licenseExpiry,
          healthCheckExpiryDate: new Date('2027-05-15'),
          currentShiftStatus: DriverShiftStatus.SAN_SANG,
          currentLocation: `Xí nghiệp ${ent.code} - ${team}`,
          licensesJson: licenses,
        },
      });

      // Create Driver Management Assignment
      await prisma.driverManagementAssignment.create({
        data: {
          driverId: user.id,
          managementUnitId: ent.managementUnitId,
          effectiveFrom: new Date('2022-03-01'),
          reason: 'Phân công xí nghiệp & đội quản lý',
          assignedById: 1, // Admin
        },
      });

      enterpriseDrivers.push({
        id: user.id,
        jobCategory,
        code,
        fullName,
      });

      driverCounter++;
    }

    // Now assign PRIMARY and SECONDARY vehicles strictly matching domain:
    // Rule:
    // 1-2 PRIMARY vehicles (custodian holding the vehicle).
    // 1-2 SECONDARY vehicles (for co-managing another driver's vehicle in same group).
    const agriGroup = enterpriseDrivers.filter((d) => d.jobCategory === 'NONG_NGHIEP');
    const constrGroup = enterpriseDrivers.filter((d) => d.jobCategory === 'CONG_TRINH');
    const transGroup = enterpriseDrivers.filter((d) => d.jobCategory === 'VAN_CHUYEN');

    // Helper to assign primary and secondary
    async function assignVehiclesForGroup(group: typeof enterpriseDrivers, vehiclePool: typeof agriVehicles, getPoolIdx: () => number, incPoolIdx: () => void) {
      const primaryVehicleMap: Array<{ driverId: number; vehicleId: number }> = [];

      // 1. Assign 1-2 PRIMARY vehicles to each driver in this group
      for (let g = 0; g < group.length; g++) {
        const driver = group[g];
        // Driver gets 1 primary vehicle (or 2 for first few drivers)
        const countPrimary = g < 2 ? 2 : 1;
        for (let c = 0; c < countPrimary; c++) {
          const v = vehiclePool[getPoolIdx() % vehiclePool.length];
          incPoolIdx();

          await prisma.vehicleDriverAssignment.create({
            data: {
              driverId: driver.id,
              vehicleId: v.id,
              type: VehicleDriverAssignmentType.PRIMARY,
              status: VehicleDriverAssignmentStatus.ACTIVE,
              effectiveFrom: new Date('2024-01-01'),
              assignedById: 1,
              reason: 'Tài xế quản lý và giữ xe chính',
            },
          });

          await prisma.vehicle.update({
            where: { id: v.id },
            data: { defaultDriverId: driver.id, unit: ent.unit },
          });

          await prisma.user.update({
            where: { id: driver.id },
            data: { assignedVehicleId: v.id },
          });

          primaryVehicleMap.push({ driverId: driver.id, vehicleId: v.id });
        }
      }

      // 2. Assign 1-2 SECONDARY vehicles to each driver (co-managing partner's vehicle in the same group)
      // "Xe chính là xe mà tài xế giữ nhưng đối với Tài xế khác có thể là xe phụ để hỗ trợ cùng quản lí tài sản.."
      for (let g = 0; g < group.length; g++) {
        const driver = group[g];
        // Pick primary vehicles of OTHER drivers in the same group to be this driver's secondary vehicles
        const otherDriversVehicles = primaryVehicleMap.filter((item) => item.driverId !== driver.id);
        const countSecondary = 1; // 1 secondary vehicle per driver
        for (let s = 0; s < countSecondary; s++) {
          const partnerVehicle = otherDriversVehicles[(g + s) % otherDriversVehicles.length];
          if (partnerVehicle) {
            await prisma.vehicleDriverAssignment.create({
              data: {
                driverId: driver.id,
                vehicleId: partnerVehicle.vehicleId,
                type: VehicleDriverAssignmentType.SECONDARY,
                status: VehicleDriverAssignmentStatus.ACTIVE,
                effectiveFrom: new Date('2024-01-01'),
                assignedById: 1,
                reason: 'Hỗ trợ đồng quản lý tài sản phương tiện (Xe phụ)',
              },
            });
          }
        }
      }
    }

    // Assign for Agri
    await assignVehiclesForGroup(agriGroup, agriVehicles, () => agriIdx, () => { agriIdx++; });
    // Assign for Constr
    await assignVehiclesForGroup(constrGroup, constrVehicles, () => constrIdx, () => { constrIdx++; });
    // Assign for Trans
    await assignVehiclesForGroup(transGroup, transVehicles, () => transIdx, () => { transIdx++; });

    console.log(`✅ Hoàn thành phân công cho ${enterpriseDrivers.length} tài xế tại ${ent.name}`);
  }

  // Also clean up any extraneous older dummy driver accounts beyond TX-100 if any
  const leftoverDrivers = await prisma.user.findMany({
    where: {
      role: Role.DRIVER,
      code: { notIn: Array.from({ length: 100 }, (_, i) => `TX-${String(i + 1).padStart(3, '0')}`) },
    },
    select: { id: true, code: true },
  });

  if (leftoverDrivers.length > 0) {
    console.log(`🧹 Đánh dấu nghỉ việc cho ${leftoverDrivers.length} tài xế cũ ngoài danh sách chuẩn 100 người...`);
    const leftoverIds = leftoverDrivers.map((d) => d.id);
    await prisma.vehicleDriverAssignment.deleteMany({ where: { driverId: { in: leftoverIds } } });
    await prisma.driverManagementAssignment.deleteMany({ where: { driverId: { in: leftoverIds } } });
    await prisma.driverProfile.updateMany({
      where: { userId: { in: leftoverIds } },
      data: { employmentStatus: DriverEmploymentStatus.DA_NGHI_VIEC },
    });
    await prisma.employeeRecord.updateMany({
      where: { empCode: { in: leftoverDrivers.map((d) => d.code) } },
      data: { status: 'Đã nghỉ việc' },
    });
    await prisma.user.updateMany({
      where: { id: { in: leftoverIds } },
      data: { isActive: false, employmentStatus: DriverEmploymentStatus.DA_NGHI_VIEC, assignedVehicleId: null },
    });
  }

  console.log('\n🎉 THÀNH CÔNG! Đã khởi tạo hoàn tất 100 tài xế chuẩn hóa cho 5 xí nghiệp KLH Koun Mom.');
  console.log('- 100% tài xế có đầy đủ User, EmployeeRecord, DriverProfile với licensesJson nhiều bằng.');
  console.log('- Mỗi tài xế phụ trách 1-2 xe chính và 1 xe phụ đồng quản lý.');
  console.log('- Phân định chính xác 3 chuyên ngành: Nông nghiệp, Công trình, Vận chuyển không chồng lấn!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed tài xế:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
