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

// Danh sách họ tên Việt Nam phong phú
const VIETNAMESE_FIRST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đoàn', 'Đinh', 'Trương', 'Lương',
];
const VIETNAMESE_MIDDLE_NAMES = [
  'Văn', 'Quốc', 'Thanh', 'Hữu', 'Đình', 'Minh', 'Hải', 'Đức', 'Gia', 'Trọng',
  'Công', 'Xuân', 'Kim', 'Bảo', 'Quang', 'Tiến', 'Hồng', 'Duy', 'Ngọc', 'Phước',
];
const VIETNAMESE_LAST_NAMES = [
  'Minh', 'Huy', 'Nam', 'Hải', 'Thành', 'An', 'Đạt', 'Phúc', 'Tâm', 'Khoa',
  'Tuấn', 'Duy', 'Tài', 'Linh', 'Bình', 'Hùng', 'Vinh', 'Hậu', 'Lợi', 'Thuận',
  'Dũng', 'Khánh', 'Thắng', 'Toàn', 'Cường', 'Sơn', 'Long', 'Kiên', 'Phong', 'Trung',
];

// Danh sách họ tên Khmer (Campuchia) cho Koun Mom & Snoul
const KHMER_NAMES = [
  'Sokha Chamnan', 'Keo Sarath', 'Sok Phearith', 'Chan Vibol', 'Seng Rithy',
  'Choun Vanna', 'Samnang Rath', 'Vannak Dara', 'Heng Sovann', 'Buntha Chea',
  'Pich Samat', 'Mony Pich', 'Ratanak Sambath', 'Chhaya Roth', 'Socheat Vichea',
  'Kosal Vuthy', 'Kimheng Srun', 'Thearith Kong', 'Boran Sareth', 'Chanthy Men',
  'Vannak Meas', 'Sopheap Ouk', 'Thyda Chem', 'Channarong Nuon', 'Darith Phok',
  'Chhay Seng', 'Visal Ros', 'Rithy Khem', 'Veasna Nou', 'Khemara Seng',
  'Sambath Prak', 'Sovannareach Tep', 'Sokun Heng', 'Borey Vong', 'Makara Keo',
];

// Danh sách họ tên Lào (Lao) cho Nam Lào (Attapeu)
const LAO_NAMES = [
  'Khamphou Somlith', 'Bounmy Sisavath', 'Somphone Phomvihane', 'Thonglith Keobounphan', 'Phouthone Chanthavong',
  'Bounxou Vorachit', 'Khamxay Sayasone', 'Anousone Inthavong', 'Chanthala Souphanouvong', 'Vilayvanh Douangdy',
  'Sombath Somphou', 'Phanomphone Phimmasone', 'Khampheng Boupha', 'Vansy Vilayphone', 'Sengaloun Southichak',
  'Soukkhathammavong Khamphet', 'Noy Xaysombath', 'Daovone Philavong', 'Phetmany Siphandone', 'Khamkeo Phommachanh',
  'Sisavath Vongphet', 'Aloun Bounkham', 'Soubanh Xayavong', 'Chanthone Keomany', 'Khamfeuang Vongsa',
  'Somchit Douangpaseuth', 'Bounthavy Inthasane', 'Thongdam Phothisane', 'Phonesavanh Sengmany', 'Bounnhang Vorasane',
];

interface KlhConfig {
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
  complexName: string;
  codePrefix: string;
  usernamePrefix: string;
  unitEnum: Unit;
  namesLanguage: 'KHMER' | 'LAO';
  managementUnits: {
    agri: { ownerId: number; teamIds: number[]; ownerName: string; teamNames: string[] };
    constr: { ownerId: number; teamIds: number[]; ownerName: string; teamNames: string[] };
    trans: { ownerId: number; teamIds: number[]; ownerName: string; teamNames: string[] };
  };
}

const KLH_CONFIGS: KlhConfig[] = [
  {
    complexCode: 'KOUN_MOM',
    complexName: 'KLH Koun Mom',
    codePrefix: 'TX-KM-',
    usernamePrefix: 'km.tx',
    unitEnum: Unit.KOUN_MOM,
    namesLanguage: 'KHMER',
    managementUnits: {
      agri: {
        ownerId: 2, // DV-KM-CHUOI
        teamIds: [14, 15, 18], // Đội Cơ giới Chuối 1, Chuối 2, Thu hoạch Cỏ
        ownerName: 'Đơn vị Cơ giới & Vận tải Chuối Koun Mom',
        teamNames: ['Đội Cơ giới Nông trường Chuối 1', 'Đội Cơ giới Nông trường Chuối 2', 'Đội Cơ giới Đồng cỏ & Thu hoạch Sinh khối'],
      },
      constr: {
        ownerId: 1, // DV-KM-BCG
        teamIds: [11, 31], // Đội Cơ giới Làm đất, Đội Cơ giới Làm đất 02
        ownerName: 'Ban Cơ giới KLH Koun Mom',
        teamNames: ['Đội Xe Cơ giới Làm đất Koun Mom', 'Đội Cơ giới Làm đất 02'],
      },
      trans: {
        ownerId: 2, // DV-KM-CHUOI
        teamIds: [16, 13, 20], // Đội Container Chuối, Vận tải Tổng kho, Xe Bồn Dầu
        ownerName: 'Đơn vị Cơ giới & Vận tải Chuối Koun Mom',
        teamNames: ['Đội Xe Container Chuối Xuất khẩu', 'Đội Vận tải Tổng kho Koun Mom', 'Tổ Cấp phát & Vận hành Xe Bồn Dầu'],
      },
    },
  },
  {
    complexCode: 'SNOUL',
    complexName: 'KLH Snoul',
    codePrefix: 'TX-SN-',
    usernamePrefix: 'sn.tx',
    unitEnum: Unit.SNOUL,
    namesLanguage: 'KHMER',
    managementUnits: {
      agri: {
        ownerId: 5, // DV-SN-BCG
        teamIds: [21], // Đội Máy kéo & Nông cụ Snoul
        ownerName: 'Ban Cơ giới KLH Snoul',
        teamNames: ['Đội Máy kéo & Nông cụ Snoul'],
      },
      constr: {
        ownerId: 5, // DV-SN-BCG
        teamIds: [22], // Tổ Xe Công vụ & Thi công Snoul
        ownerName: 'Ban Cơ giới KLH Snoul',
        teamNames: ['Tổ Xe Công vụ & Cơ giới Thi công Snoul'],
      },
      trans: {
        ownerId: 6, // DV-SN-LOGISTICS
        teamIds: [23, 24, 25], // Container & Đầu kéo, Xe Ben, Sửa chữa & Cứu hộ
        ownerName: 'Đơn vị Vận tải & Logistics Snoul',
        teamNames: ['Đội Xe Container & Đầu kéo Snoul', 'Đội Xe Ben Vận chuyển Vật tư & Đất đá', 'Tổ Sửa chữa & Cứu hộ Cơ giới Snoul'],
      },
    },
  },
  {
    complexCode: 'NAM_LAO',
    complexName: 'KLH Nam Lào',
    codePrefix: 'TX-NL-',
    usernamePrefix: 'nl.tx',
    unitEnum: Unit.NAM_LAO,
    namesLanguage: 'LAO',
    managementUnits: {
      agri: {
        ownerId: 9, // DV-NL-VCAY
        teamIds: [28, 29], // Đội Cơ giới Cao su, Cây ăn trái
        ownerName: 'Đơn vị Cơ giới Cây ăn trái & Cao su Nam Lào',
        teamNames: ['Đội Cơ giới Nông trường Cao su Nam Lào', 'Đội Cơ giới Cây ăn trái Nam Lào'],
      },
      constr: {
        ownerId: 8, // DV-NL-BCG
        teamIds: [26], // Đội Cơ giới Làm đất Nam Lào
        ownerName: 'Ban Cơ giới KLH Nam Lào',
        teamNames: ['Đội Xe Cơ giới Làm đất Nam Lào'],
      },
      trans: {
        ownerId: 8, // DV-NL-BCG
        teamIds: [27, 39, 30], // Vận tải Nông sản, Vận tải Cơ giới 01, Xe bồn dầu
        ownerName: 'Ban Cơ giới KLH Nam Lào',
        teamNames: ['Đội Vận tải Hàng hóa & Nông sản Nam Lào', 'Đội Vận tải Cơ giới 01 Nam Lào', 'Tổ Kỹ thuật Sửa chữa & Xe bồn Dầu Nam Lào'],
      },
    },
  },
];

async function main() {
  console.log('========================================================================');
  console.log('🚀 BẮT ĐẦU RESET & TẠO MỚI 100 NHÂN VIÊN/TÀI XẾ CHO MỖI KHU LIÊN HỢP');
  console.log('   (Tỉ lệ mỗi KLH: 30 Nông nghiệp - 30 Công trình - 40 Vận hành)');
  console.log('========================================================================\n');

  const passwordHash = await bcrypt.hash('123456', 10);

  // --------------------------------------------------------------------------
  // BƯỚC 1: XÓA SẠCH TOÀN BỘ DATA TÀI XẾ & HỒ SƠ CŨ
  // --------------------------------------------------------------------------
  console.log('🧹 Bước 1: Dọn dẹp toàn bộ dữ liệu tài xế, hồ sơ và phân công cũ...');
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
  try {
    await prisma.vehicle.updateMany({
      data: {
        defaultDriverId: null,
        secondaryDriverId: null,
      },
    });

    await prisma.user.updateMany({
      data: {
        assignedVehicleId: null,
      },
    });

    await prisma.vehicleDriverAssignment.deleteMany({});
    await prisma.driverManagementAssignment.deleteMany({});
    await prisma.driverUnavailability.deleteMany({});
    await prisma.driverKpiEvent.deleteMany({});
    await prisma.driverKpi.deleteMany({});
    await prisma.driverSosAlert.deleteMany({});
    await prisma.workDriverAssignment.deleteMany({});
    await prisma.workExecutionSegment.deleteMany({});
    await prisma.$executeRawUnsafe(`DELETE FROM mobile_sessions`);
    await prisma.$executeRawUnsafe(`DELETE FROM mobile_sync_events`);
    await prisma.$executeRawUnsafe(`DELETE FROM internal_feed_trips`);
    await prisma.$executeRawUnsafe(`UPDATE alert_events SET driverId = NULL`);
    await prisma.$executeRawUnsafe(`UPDATE dispatch_orders SET driverId = NULL`);
    await prisma.$executeRawUnsafe(`UPDATE transport_orders SET driverId = NULL`);
    await prisma.$executeRawUnsafe(`UPDATE production_plot_progresses SET driverId = NULL`);
    await prisma.$executeRawUnsafe(`UPDATE repair_tickets SET reportedByDriverId = NULL`);
    await prisma.fuelDispenseTicket.deleteMany({});
    await prisma.driverManagementAccessScope.deleteMany({
      where: { user: { role: Role.DRIVER } },
    });
    await prisma.driverProfile.deleteMany({});

    const deletedDrivers = await prisma.user.deleteMany({
      where: { role: Role.DRIVER },
    });
    console.log(`   -> Đã xóa ${deletedDrivers.count} tài khoản tài xế cũ trong bảng users.`);

    const deletedEmployees = await prisma.employeeRecord.deleteMany({});
    console.log(`   -> Đã xóa ${deletedEmployees.count} hồ sơ nhân sự cũ trong bảng employees.`);
  } finally {
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
  }

  // --------------------------------------------------------------------------
  // BƯỚC 2: TẠO/CẬP NHẬT CÁC TÀI KHOẢN QUẢN TRỊ & ĐIỀU ĐỘ (ADMIN & MANAGERS)
  // --------------------------------------------------------------------------
  console.log('\n👑 Bước 2: Khởi tạo/Đồng bộ tài khoản Ban Quản Lý & Điều hành...');

  const managementUsers = [
    {
      code: 'ADMIN-001',
      username: 'admin',
      fullName: 'Quản trị viên Hệ thống',
      role: Role.SUPER_ADMIN,
      unit: Unit.TOAN_KLH,
      phone: '0901234567',
      position: 'Quản trị viên Hệ thống (Admin)',
      complex: 'Toàn bộ 3 Khu Liên Hợp',
      enterprise: 'Văn phòng Điều hành THACO AGRI',
      team: 'Ban Công nghệ Thông tin & Cơ giới',
    },
    {
      code: 'CB-QL-KM01',
      username: 'quanly.kounmom',
      fullName: 'Lê Văn Hùng',
      role: Role.FARM_MANAGER,
      unit: Unit.KOUN_MOM,
      phone: '0912345678',
      position: 'Giám đốc Điều hành KLH Koun Mom',
      complex: 'KLH Koun Mom',
      enterprise: 'Xí nghiệp Chuối Daun Penh',
      team: 'Ban Lãnh đạo Xí nghiệp',
    },
    {
      code: 'CB-QL-SN01',
      username: 'quanly.snoul',
      fullName: 'Phan Thành Tâm',
      role: Role.FARM_MANAGER,
      unit: Unit.KOUN_MOM,
      phone: '0918505009',
      position: 'Giám đốc Điều hành KLH Snoul',
      complex: 'KLH Snoul',
      enterprise: 'Ban Cơ giới KLH Snoul',
      team: 'Ban Lãnh đạo KLH Snoul',
    },
    {
      code: 'CB-QL-NL01',
      username: 'quanly.namlao',
      fullName: 'Vũ Đức Thịnh',
      role: Role.FARM_MANAGER,
      unit: Unit.KOUN_MOM,
      phone: '0913456789',
      position: 'Giám đốc Điều hành KLH Nam Lào',
      complex: 'KLH Nam Lào',
      enterprise: 'Ban Cơ giới KLH Nam Lào',
      team: 'Ban Lãnh đạo KLH Nam Lào',
    },
    {
      code: 'CB-DD-001',
      username: 'dispatcher.dat',
      fullName: 'Trần Quốc Đạt',
      role: Role.DISPATCHER,
      unit: Unit.KOUN_MOM,
      phone: '0908889901',
      position: 'Trưởng ban Điều độ Cơ giới',
      complex: 'KLH Koun Mom',
      enterprise: 'Ban Cơ giới KLH Koun Mom',
      team: 'Tổ Điều hành & Điều xe',
    },
    {
      code: 'CB-BT-001',
      username: 'ql.xuong',
      fullName: 'Nguyễn Ngọc Anh Tú',
      role: Role.WORKSHOP_MANAGER,
      unit: Unit.KOUN_MOM,
      phone: '0905123456',
      position: 'Trưởng Trung tâm Bảo dưỡng Sửa chữa',
      complex: 'KLH Koun Mom',
      enterprise: 'Trung tâm BTSC Koun Mom',
      team: 'Xưởng Sửa chữa Cơ giới Trung tâm',
    },
    {
      code: 'CB-XD-001',
      username: 'kho.xangdau',
      fullName: 'Bùi Tấn Tài',
      role: Role.FUEL_STOREKEEPER,
      unit: Unit.KOUN_MOM,
      phone: '0906234567',
      position: 'Thủ kho Xăng dầu & Nhiên liệu',
      complex: 'KLH Koun Mom',
      enterprise: 'Ban Cơ giới KLH Koun Mom',
      team: 'Trạm Cấp phát Xăng dầu Koun Mom',
    },
  ];

  for (const m of managementUsers) {
    await prisma.user.upsert({
      where: { username: m.username },
      update: {
        code: m.code,
        fullName: m.fullName,
        role: m.role,
        unit: m.unit,
        phone: m.phone,
        isActive: true,
      },
      create: {
        code: m.code,
        username: m.username,
        passwordHash,
        fullName: m.fullName,
        role: m.role,
        unit: m.unit,
        phone: m.phone,
        isActive: true,
      },
    });

    await prisma.employeeRecord.upsert({
      where: { empCode: m.code },
      update: {
        fullName: m.fullName,
        phone: m.phone,
        email: `${m.username}@thacoagri.com.vn`,
        businessUnit: m.complex,
        complex: m.complex,
        enterprise: m.enterprise,
        farm: m.enterprise,
        team: m.team,
        position: m.position,
        status: 'Đang làm việc',
        joinedDate: '2021-01-15',
        salaryGrade: 'Bậc 7/7',
        baseSalary: 25000000,
        coefficients: 3.5,
      },
      create: {
        empCode: m.code,
        fullName: m.fullName,
        phone: m.phone,
        email: `${m.username}@thacoagri.com.vn`,
        businessUnit: m.complex,
        complex: m.complex,
        enterprise: m.enterprise,
        farm: m.enterprise,
        team: m.team,
        position: m.position,
        status: 'Đang làm việc',
        joinedDate: '2021-01-15',
        salaryGrade: 'Bậc 7/7',
        baseSalary: 25000000,
        coefficients: 3.5,
      },
    });
  }
  console.log(`   -> Đã khởi tạo thành công ${managementUsers.length} tài khoản quản trị & cán bộ quản lý.`);

  // --------------------------------------------------------------------------
  // BƯỚC 3: TẠO 100 NHÂN VIÊN/TÀI XẾ CHO MỖI KLH (30 NÔNG NGHIỆP, 30 CÔNG TRÌNH, 40 VẬN HÀNH)
  // --------------------------------------------------------------------------
  let globalDriverTotal = 0;

  for (const klh of KLH_CONFIGS) {
    console.log(`\n🏢 Bước 3.${KLH_CONFIGS.indexOf(klh) + 1}: Tạo 100 nhân sự cho ${klh.complexName} (${klh.complexCode})...`);

    // 1. Lấy danh sách xe thực tế từ DB của KLH này
    const [agriVehicles, constrVehicles, transVehicles] = await Promise.all([
      prisma.vehicle.findMany({
        where: {
          complexCode: klh.complexCode,
          category: { in: ['MAY_KEO', 'MAY_CAY'] },
        },
        select: { id: true, code: true, name: true, category: true, plate: true },
        take: 30,
        orderBy: { id: 'asc' },
      }),
      prisma.vehicle.findMany({
        where: {
          complexCode: klh.complexCode,
          category: { in: ['MAY_DAO', 'MAY_UI', 'MAY_LU', 'MAY_SAN', 'MAY_XUC_LAT'] },
        },
        select: { id: true, code: true, name: true, category: true, plate: true },
        take: 30,
        orderBy: { id: 'asc' },
      }),
      prisma.vehicle.findMany({
        where: {
          complexCode: klh.complexCode,
          category: { in: ['XE_BEN', 'XE_TAI', 'XE_CONTAINER', 'XE_BON', 'XE_NANG'] },
        },
        select: { id: true, code: true, name: true, category: true, plate: true },
        take: 40,
        orderBy: { id: 'asc' },
      }),
    ]);

    console.log(`   - Phương tiện sẵn sàng: ${agriVehicles.length} xe Nông nghiệp, ${constrVehicles.length} xe Công trình, ${transVehicles.length} xe Vận chuyển.`);

    let createdCount = 0;

    for (let i = 1; i <= 100; i++) {
      const padIndex = String(i).padStart(3, '0');
      const empCode = `${klh.codePrefix}${padIndex}`; // TX-KM-001, TX-SN-001, TX-NL-001
      const username = `${klh.usernamePrefix}${padIndex}`; // km.tx001, sn.tx001, nl.tx001

      // Họ và tên
      let fullName = '';
      if (klh.namesLanguage === 'KHMER' && (i % 2 === 0 || i % 3 === 0)) {
        fullName = KHMER_NAMES[(i * 7) % KHMER_NAMES.length];
      } else if (klh.namesLanguage === 'LAO' && (i % 2 === 0 || i % 3 === 0)) {
        fullName = LAO_NAMES[(i * 7) % LAO_NAMES.length];
      } else {
        const fn = VIETNAMESE_FIRST_NAMES[(i * 3) % VIETNAMESE_FIRST_NAMES.length];
        const mn = VIETNAMESE_MIDDLE_NAMES[(i * 5) % VIETNAMESE_MIDDLE_NAMES.length];
        const ln = VIETNAMESE_LAST_NAMES[(i * 11) % VIETNAMESE_LAST_NAMES.length];
        fullName = `${fn} ${mn} ${ln}`;
      }

      // Giữ tên Nguyễn Văn Minh cho tài xế KM đầu tiên
      if (klh.complexCode === 'KOUN_MOM' && i === 1) {
        fullName = 'Nguyễn Văn Minh';
      }

      const phonePrefixes = ['0912', '0918', '0903', '0977', '0986', '0966', '0825', '0387'];
      const phone = `${phonePrefixes[(i + 3) % phonePrefixes.length]}${String(100000 + ((i * 8765) % 899999))}`;

      // Phân bổ 30 Nông nghiệp, 30 Công trình, 40 Vận chuyển
      let categoryDomain: 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN';
      let position = '';
      let licenseClass: DriverLicenseClass = DriverLicenseClass.HANG_B2;
      let targetVehicle = null;
      let ownerId = 0;
      let teamId = 0;
      let ownerName = '';
      let teamName = '';

      if (i <= 30) {
        // --------------------------------------------------------------------
        // 30 NÔNG NGHIỆP (Index 1 - 30)
        // --------------------------------------------------------------------
        categoryDomain = 'NONG_NGHIEP';
        const agriPositions = [
          'Thợ lái máy cày xới nông nghiệp',
          'Thợ vận hành máy kéo Kubota / John Deere',
          'Thợ máy thu hoạch & bón phân cơ giới',
          'Thợ lái máy cày bừa phẳng mặt ruộng',
        ];
        position = agriPositions[i % agriPositions.length];
        licenseClass = DriverLicenseClass.HANG_B2;
        targetVehicle = agriVehicles[(i - 1) % agriVehicles.length] || null;

        ownerId = klh.managementUnits.agri.ownerId;
        teamId = klh.managementUnits.agri.teamIds[(i - 1) % klh.managementUnits.agri.teamIds.length];
        ownerName = klh.managementUnits.agri.ownerName;
        teamName = klh.managementUnits.agri.teamNames[(i - 1) % klh.managementUnits.agri.teamNames.length];
      } else if (i <= 60) {
        // --------------------------------------------------------------------
        // 30 CÔNG TRÌNH (Index 31 - 60)
        // --------------------------------------------------------------------
        categoryDomain = 'CONG_TRINH';
        const constrPositions = [
          'Thợ vận hành máy đào bánh xích gàu 1.2m3',
          'Thợ lái máy ủi làm đất & san nền',
          'Thợ vận hành máy lu rung nền đường',
          'Thợ lái máy san đất mặt bằng',
          'Thợ vận hành máy xúc lật',
        ];
        position = constrPositions[(i - 31) % constrPositions.length];
        licenseClass = DriverLicenseClass.HANG_C;
        targetVehicle = constrVehicles[(i - 31) % constrVehicles.length] || null;

        ownerId = klh.managementUnits.constr.ownerId;
        teamId = klh.managementUnits.constr.teamIds[(i - 31) % klh.managementUnits.constr.teamIds.length];
        ownerName = klh.managementUnits.constr.ownerName;
        teamName = klh.managementUnits.constr.teamNames[(i - 31) % klh.managementUnits.constr.teamNames.length];
      } else {
        // --------------------------------------------------------------------
        // 40 VẬN HÀNH / VẬN CHUYỂN (Index 61 - 100)
        // --------------------------------------------------------------------
        categoryDomain = 'VAN_CHUYEN';
        const transIdx = i - 61;
        if (transIdx < 15) {
          position = 'Lái xe đầu kéo Container xuất khẩu';
          licenseClass = DriverLicenseClass.HANG_CE;
        } else if (transIdx < 30) {
          position = 'Lái xe tải ben 10T vận chuyển';
          licenseClass = DriverLicenseClass.HANG_C;
        } else if (transIdx < 36) {
          position = 'Lái xe tải thùng vận chuyển nông sản';
          licenseClass = DriverLicenseClass.HANG_C;
        } else {
          position = 'Lái xe bồn tiếp nhiên liệu lưu động';
          licenseClass = DriverLicenseClass.HANG_C;
        }

        targetVehicle = transVehicles[transIdx % transVehicles.length] || null;
        ownerId = klh.managementUnits.trans.ownerId;
        teamId = klh.managementUnits.trans.teamIds[transIdx % klh.managementUnits.trans.teamIds.length];
        ownerName = klh.managementUnits.trans.ownerName;
        teamName = klh.managementUnits.trans.teamNames[transIdx % klh.managementUnits.trans.teamNames.length];
      }

      const licenseNumber = `79${String(1000000000 + ((i * 1234567) % 8999999999)).slice(0, 10)}`;
      const licenseExpiryDate = new Date(2028 + (i % 4), (i % 12), 15);
      const healthCheckExpiryDate = new Date(2026, 11, 31);
      const joinedDate = new Date(2022 + (i % 3), (i % 12), 1);

      const licensesJson = [
        {
          category: licenseClass === DriverLicenseClass.HANG_CE
            ? 'Hạng CE (Xe đầu kéo rơ-moóc, Container)'
            : licenseClass === DriverLicenseClass.HANG_C
            ? 'Hạng C (Xe tải ben >3.5T, xe chuyên dùng)'
            : 'Hạng B2 (Máy cày, máy kéo, ô tô con, tải ≤3.5T)',
          number: licenseNumber,
          issueDate: '2023-05-15',
          expiryDate: licenseExpiryDate.toISOString().slice(0, 10),
          issuedBy: 'Sở GTVT',
          isPrimary: true,
        },
        {
          category: categoryDomain === 'NONG_NGHIEP'
            ? 'Chứng chỉ vận hành máy kéo & cơ giới nông nghiệp'
            : categoryDomain === 'CONG_TRINH'
            ? 'Chứng chỉ vận hành máy đào, ủi, xúc & máy thi công'
            : 'Chứng chỉ an toàn vận tải hàng hóa & bốc dỡ',
          number: `CC-${categoryDomain.slice(0, 2)}-${1000 + i}`,
          issueDate: '2022-04-10',
          expiryDate: '2032-04-10',
          issuedBy: 'Trường Kỹ thuật & Cơ giới THACO AGRI',
          isPrimary: false,
        },
      ];

      // 1. Tạo User (Tài khoản người dùng)
      const user = await prisma.user.create({
        data: {
          code: empCode,
          username,
          passwordHash,
          fullName,
          phone,
          unit: klh.unitEnum,
          role: Role.DRIVER,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          currentShiftStatus: DriverShiftStatus.SAN_SANG,
          licenseClass,
          licenseNumber,
          licenseExpiryDate,
          healthCheckExpiryDate,
          currentLocation: `${klh.complexName} - ${teamName}`,
          joinedDate,
          isActive: true,
          assignedVehicleId: targetVehicle?.id || null,
        },
      });

      // 2. Tạo EmployeeRecord (Hồ sơ nhân viên)
      await prisma.employeeRecord.create({
        data: {
          empCode,
          fullName,
          phone,
          email: `${username}@thacoagri.com.vn`,
          businessUnit: klh.complexName,
          complex: klh.complexName,
          enterprise: ownerName,
          farm: ownerName,
          team: teamName,
          position,
          licenseClass,
          licenseNumber,
          licenseExpiryDate: licenseExpiryDate.toISOString().slice(0, 10),
          healthCheckExpiryDate: healthCheckExpiryDate.toISOString().slice(0, 10),
          status: 'Đang làm việc',
          joinedDate: joinedDate.toISOString().slice(0, 10),
          idCardNumber: `079${String(100000000 + ((i * 54321) % 899999999)).slice(0, 9)}`,
          idCardIssueDate: '2021-08-10',
          idCardIssuePlace: 'Cục CS QLHC về TTXH',
          salaryGrade: `Bậc ${3 + (i % 4)}/7`,
          baseSalary: 12000000 + (i % 6) * 1000000,
          coefficients: 2.2 + (i % 6) * 0.15,
        },
      });

      // 3. Tạo DriverProfile (Hồ sơ lái xe 360)
      await prisma.driverProfile.create({
        data: {
          userId: user.id,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          joinedDate,
          licenseClass,
          licenseNumber,
          licenseExpiryDate,
          healthCheckExpiryDate,
          currentShiftStatus: DriverShiftStatus.SAN_SANG,
          currentLocation: `${klh.complexName} - ${teamName}`,
          licensesJson,
        },
      });

      // 4. Phân công đơn vị quản lý (DriverManagementAssignment)
      await prisma.driverManagementAssignment.create({
        data: {
          driverId: user.id,
          managementUnitId: ownerId,
          teamUnitId: teamId,
          effectiveFrom: joinedDate,
          reason: 'Phân công xí nghiệp & đội quản lý',
          assignedById: 1, // Admin
        },
      });

      // 5. Phân công phương tiện chính (VehicleDriverAssignment)
      if (targetVehicle) {
        await prisma.vehicleDriverAssignment.create({
          data: {
            driverId: user.id,
            vehicleId: targetVehicle.id,
            type: VehicleDriverAssignmentType.PRIMARY,
            status: VehicleDriverAssignmentStatus.ACTIVE,
            effectiveFrom: joinedDate,
            assignedById: 1,
            reason: `Gán xe chính cho ${position}`,
          },
        });

        // Đồng bộ defaultDriverId trên Vehicle
        await prisma.vehicle.update({
          where: { id: targetVehicle.id },
          data: { defaultDriverId: user.id },
        });
      }

      createdCount++;
      globalDriverTotal++;
    }

    console.log(`   ✅ Đã tạo thành công ${createdCount}/100 nhân sự cho ${klh.complexName}:`);
    console.log(`      • 30 Nông nghiệp (${klh.codePrefix}001 - ${klh.codePrefix}030)`);
    console.log(`      • 30 Công trình  (${klh.codePrefix}031 - ${klh.codePrefix}060)`);
    console.log(`      • 40 Vận hành    (${klh.codePrefix}061 - ${klh.codePrefix}100)`);
  }

  console.log('\n========================================================================');
  console.log(`🎉 HOÀN TẤT THÀNH CÔNG! Đã tạo mới tổng cộng ${globalDriverTotal} nhân viên/tài xế`);
  console.log('   Đồng bộ 100% qua cả 3 màn hình:');
  console.log('   1. http://localhost:5173/lai-xe/ho-so (Hồ sơ lái xe)');
  console.log('   2. http://localhost:5173/phan-quyen/nhan-vien (Danh sách nhân viên)');
  console.log('   3. http://localhost:5173/phan-quyen/nguoi-dung (Tài khoản người dùng)');
  console.log('========================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi thực thi script reset và seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
