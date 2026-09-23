import {
  PrismaClient,
  Role,
  Unit,
  DriverManagementLevel,
  DriverManagementUnitType,
  DriverManagementUnitStatus,
  ManagementUnitManagerType,
  CatalogType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface ManagerDef {
  code: string;
  fullName: string;
  phone: string;
  username: string;
  unit: Unit;
  position: string;
  complexCode: string;
  teamCode: string;
  ownerCode: string;
}

const MANAGERS_SNOUL: ManagerDef[] = [
  {
    code: 'CB-DTCG-SN-02',
    fullName: 'Đỗ Hữu Phước',
    phone: '0918234101',
    username: 'cgm.sn.0918234101',
    unit: Unit.SNOUL,
    position: 'Đội trưởng Đội Máy kéo & Nông cụ',
    complexCode: 'SNOUL',
    teamCode: 'TO-SN-01',
    ownerCode: 'DV-SN-BCG',
  },
  {
    code: 'CB-DTCG-SN-03',
    fullName: 'Trần Đình Trọng',
    phone: '0918234102',
    username: 'cgm.sn.0918234102',
    unit: Unit.SNOUL,
    position: 'Tổ trưởng Tổ Xe Công vụ & Tuần tra',
    complexCode: 'SNOUL',
    teamCode: 'TO-SN-02',
    ownerCode: 'DV-SN-BCG',
  },
  {
    code: 'CB-DTCG-SN-04',
    fullName: 'Lê Hoàng Long',
    phone: '0918234103',
    username: 'cgm.sn.0918234103',
    unit: Unit.SNOUL,
    position: 'Đội trưởng Đội Xe Container & Đầu kéo',
    complexCode: 'SNOUL',
    teamCode: 'TO-SN-03',
    ownerCode: 'DV-SN-LOGISTICS',
  },
  {
    code: 'CB-DTCG-SN-05',
    fullName: 'Nguyễn Văn Thắng',
    phone: '0918234104',
    username: 'cgm.sn.0918234104',
    unit: Unit.SNOUL,
    position: 'Đội trưởng Đội Xe Ben Vận chuyển',
    complexCode: 'SNOUL',
    teamCode: 'TO-SN-04',
    ownerCode: 'DV-SN-LOGISTICS',
  },
  {
    code: 'CB-DTCG-SN-06',
    fullName: 'Bùi Quang Huy',
    phone: '0918234105',
    username: 'cgm.sn.0918234105',
    unit: Unit.SNOUL,
    position: 'Tổ trưởng Kỹ thuật Sửa chữa & Cứu hộ',
    complexCode: 'SNOUL',
    teamCode: 'TO-SN-05',
    ownerCode: 'DV-SN-BTSC',
  },
];

const MANAGERS_NAM_LAO: ManagerDef[] = [
  {
    code: 'CB-DTCG-NL-02',
    fullName: 'Hoàng Văn Thái',
    phone: '0913567101',
    username: 'cgm.nl.0913567101',
    unit: Unit.NAM_LAO,
    position: 'Đội trưởng Đội Cơ giới Làm đất',
    complexCode: 'NAM_LAO',
    teamCode: 'TO-NL-01',
    ownerCode: 'DV-NL-BCG',
  },
  {
    code: 'CB-DTCG-NL-03',
    fullName: 'Nguyễn Phúc Hưng',
    phone: '0913567102',
    username: 'cgm.nl.0913567102',
    unit: Unit.NAM_LAO,
    position: 'Đội trưởng Đội Vận tải Hàng hóa & Nông sản',
    complexCode: 'NAM_LAO',
    teamCode: 'TO-NL-02',
    ownerCode: 'DV-NL-BCG',
  },
  {
    code: 'CB-DTCG-NL-04',
    fullName: 'Đặng Ngọc Toàn',
    phone: '0913567103',
    username: 'cgm.nl.0913567103',
    unit: Unit.NAM_LAO,
    position: 'Đội trưởng Đội Cơ giới Cao su',
    complexCode: 'NAM_LAO',
    teamCode: 'TO-NL-03',
    ownerCode: 'DV-NL-VCAY',
  },
  {
    code: 'CB-DTCG-NL-05',
    fullName: 'Phạm Minh Tuấn',
    phone: '0913567104',
    username: 'cgm.nl.0913567104',
    unit: Unit.NAM_LAO,
    position: 'Đội trưởng Đội Cơ giới Cây ăn trái',
    complexCode: 'NAM_LAO',
    teamCode: 'TO-NL-04',
    ownerCode: 'DV-NL-VCAY',
  },
  {
    code: 'CB-DTCG-NL-06',
    fullName: 'Vũ Đình Nam',
    phone: '0913567105',
    username: 'cgm.nl.0913567105',
    unit: Unit.NAM_LAO,
    position: 'Tổ trưởng Kỹ thuật Sửa chữa & Xe bồn',
    complexCode: 'NAM_LAO',
    teamCode: 'TO-NL-05',
    ownerCode: 'DV-NL-BTSC',
  },
  {
    code: 'CB-DTCG-NL-07',
    fullName: 'Lương Đình Khoa',
    phone: '0913567106',
    username: 'cgm.nl.0913567106',
    unit: Unit.NAM_LAO,
    position: 'Đội trưởng Đội Vận tải Cơ giới 01',
    complexCode: 'NAM_LAO',
    teamCode: 'DOI_VT_CG_01',
    ownerCode: 'DV-NL-BCG',
  },
];

async function main() {
  console.log('🚀 Bắt đầu khởi tạo & chuẩn hóa dữ liệu Quản lý & Tài xế cho 3 KLH...');

  const admin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, isActive: true },
    select: { id: true },
  });
  const adminId = admin?.id ?? 1;
  const passwordHash = await bcrypt.hash('Thaco@1234$', 10);
  const effectiveDate = new Date('2024-01-01');

  // Helper để upsert user + employeeRecord cho manager
  async function upsertManager(m: ManagerDef) {
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ username: m.username }, { code: m.code }, { phone: m.phone }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          code: m.code,
          username: m.username,
          fullName: m.fullName,
          phone: m.phone,
          passwordHash: passwordHash,
          unit: m.unit,
          role: Role.FARM_MANAGER,
          isActive: true,
        },
      });
      console.log(`  ➕ Tạo Quản lý User: [${m.code}] ${m.fullName} (${m.phone})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          code: m.code,
          fullName: m.fullName,
          phone: m.phone,
          unit: m.unit,
          role: Role.FARM_MANAGER,
          isActive: true,
        },
      });
      console.log(`  🔄 Cập nhật Quản lý User: [${m.code}] ${m.fullName}`);
    }

    // Upsert EmployeeRecord
    await prisma.employeeRecord.upsert({
      where: { empCode: m.code },
      create: {
        empCode: m.code,
        fullName: m.fullName,
        phone: m.phone,
        position: m.position,
        businessUnit: `KLH ${m.complexCode}`,
        complex: `KLH ${m.complexCode}`,
        status: 'Đang làm việc',
        email: `${m.username}@thacoagri.com.vn`,
      },
      update: {
        fullName: m.fullName,
        phone: m.phone,
        position: m.position,
        businessUnit: `KLH ${m.complexCode}`,
        complex: `KLH ${m.complexCode}`,
        status: 'Đang làm việc',
      },
    });

    // Upsert CatalogItem (CG_MANAGER)
    await prisma.catalogItem.upsert({
      where: { id: `CGM-${m.code}` },
      create: {
        id: `CGM-${m.code}`,
        code: m.code,
        name: m.fullName,
        type: CatalogType.CG_MANAGER,
        parentCode: m.complexCode,
        phone: m.phone,
        status: 'HOAT_DONG',
        description: `${m.position} - KLH ${m.complexCode}`,
      },
      update: {
        name: m.fullName,
        parentCode: m.complexCode,
        phone: m.phone,
        status: 'HOAT_DONG',
        description: `${m.position} - KLH ${m.complexCode}`,
      },
    });

    return user;
  }

  // =========================================================================
  // 1. SNOUL: KÍCH HOẠT ĐƠN VỊ & CẤU HÌNH QUẢN LÝ
  // =========================================================================
  console.log('\n--- 1. Cấu hình Quản lý & Phân công cho KLH SNOUL ---');

  // Kích hoạt các Đơn vị Chủ quản cấp 2 của Snoul
  await prisma.driverManagementUnit.updateMany({
    where: {
      complexCode: 'SNOUL',
      code: { in: ['DV-SN-BCG', 'DV-SN-LOGISTICS', 'DV-SN-BTSC'] },
    },
    data: { status: DriverManagementUnitStatus.ACTIVE },
  });

  // Kích hoạt các Đội/Tổ cấp 3 của Snoul
  await prisma.driverManagementUnit.updateMany({
    where: {
      complexCode: 'SNOUL',
      code: { in: ['TO-SN-01', 'TO-SN-02', 'TO-SN-03', 'TO-SN-04', 'TO-SN-05'] },
    },
    data: { status: DriverManagementUnitStatus.ACTIVE },
  });

  // Đảm bảo Phan Thành Tâm là trưởng đơn vị chủ quản DV-SN-BCG
  const snoulHead = await prisma.user.findFirst({ where: { username: 'quanly.snoul' } });
  const snBcUnit = await prisma.driverManagementUnit.findFirst({ where: { complexCode: 'SNOUL', code: 'DV-SN-BCG' } });
  if (snoulHead && snBcUnit) {
    const existing = await prisma.managementUnitManagerAssignment.findFirst({
      where: { managementUnitId: snBcUnit.id, effectiveTo: null },
    });
    if (!existing) {
      await prisma.managementUnitManagerAssignment.create({
        data: {
          managementUnitId: snBcUnit.id,
          managerUserId: snoulHead.id,
          managerType: ManagementUnitManagerType.PRIMARY,
          effectiveFrom: effectiveDate,
          assignedById: adminId,
          reason: 'Bổ nhiệm Trưởng Ban Cơ giới KLH Snoul',
        },
      });
    }
  }

  for (const m of MANAGERS_SNOUL) {
    const user = await upsertManager(m);
    const teamUnit = await prisma.driverManagementUnit.findFirst({
      where: { complexCode: m.complexCode, code: m.teamCode },
    });

    if (teamUnit) {
      // Kết thúc các phân công cũ nếu có
      await prisma.managementUnitManagerAssignment.updateMany({
        where: {
          managementUnitId: teamUnit.id,
          effectiveTo: null,
          managerUserId: { not: user.id },
        },
        data: { effectiveTo: new Date(), reason: 'Thay thế quản lý mới' },
      });

      // Tạo hoặc duy trì phân công active
      const active = await prisma.managementUnitManagerAssignment.findFirst({
        where: { managementUnitId: teamUnit.id, managerUserId: user.id, effectiveTo: null },
      });
      if (!active) {
        await prisma.managementUnitManagerAssignment.create({
          data: {
            managementUnitId: teamUnit.id,
            managerUserId: user.id,
            managerType: ManagementUnitManagerType.PRIMARY,
            effectiveFrom: effectiveDate,
            assignedById: adminId,
            reason: `Bổ nhiệm ${m.position}`,
          },
        });
        console.log(`  🔗 Đã gán Quản lý: ${m.fullName} -> Đội [${teamUnit.code}] ${teamUnit.name}`);
      }

    // Helper để gán phạm vi quản lý
    const existingScope = await prisma.driverManagementAccessScope.findFirst({
      where: { userId: user.id, complexCode: m.complexCode, managementUnitId: teamUnit.id },
    });
    if (!existingScope) {
      await prisma.driverManagementAccessScope.create({
        data: {
          userId: user.id,
          complexCode: m.complexCode,
          managementUnitId: teamUnit.id,
          canManageCatalog: true,
          canAssignDrivers: true,
          grantedById: adminId,
        },
      });
    } else {
      await prisma.driverManagementAccessScope.update({
        where: { id: existingScope.id },
        data: {
          canManageCatalog: true,
          canAssignDrivers: true,
        },
      });
    }
    }
  }

  // =========================================================================
  // 2. NAM LÀO: TẠO QUẢN LÝ & GÁN VÀO ĐỘI/TỔ
  // =========================================================================
  console.log('\n--- 2. Cấu hình Quản lý & Phân công cho KLH NAM LÀO ---');

  // Kích hoạt các Đơn vị Chủ quản cấp 2 của Nam Lào
  await prisma.driverManagementUnit.updateMany({
    where: {
      complexCode: 'NAM_LAO',
      code: { in: ['DV-NL-BCG', 'DV-NL-VCAY', 'DV-NL-BTSC'] },
    },
    data: { status: DriverManagementUnitStatus.ACTIVE },
  });

  // Kích hoạt các Đội/Tổ cấp 3 của Nam Lào
  await prisma.driverManagementUnit.updateMany({
    where: {
      complexCode: 'NAM_LAO',
      code: { in: ['TO-NL-01', 'TO-NL-02', 'TO-NL-03', 'TO-NL-04', 'TO-NL-05', 'DOI_VT_CG_01'] },
    },
    data: { status: DriverManagementUnitStatus.ACTIVE },
  });

  // Đảm bảo Vũ Đức Thịnh là trưởng đơn vị chủ quản DV-NL-BCG
  const namLaoHead = await prisma.user.findFirst({ where: { username: 'quanly.namlao' } });
  const nlBcUnit = await prisma.driverManagementUnit.findFirst({ where: { complexCode: 'NAM_LAO', code: 'DV-NL-BCG' } });
  if (namLaoHead && nlBcUnit) {
    const existing = await prisma.managementUnitManagerAssignment.findFirst({
      where: { managementUnitId: nlBcUnit.id, effectiveTo: null },
    });
    if (!existing) {
      await prisma.managementUnitManagerAssignment.create({
        data: {
          managementUnitId: nlBcUnit.id,
          managerUserId: namLaoHead.id,
          managerType: ManagementUnitManagerType.PRIMARY,
          effectiveFrom: effectiveDate,
          assignedById: adminId,
          reason: 'Bổ nhiệm Trưởng Ban Cơ giới KLH Nam Lào',
        },
      });
    }
  }

  for (const m of MANAGERS_NAM_LAO) {
    const user = await upsertManager(m);
    const teamUnit = await prisma.driverManagementUnit.findFirst({
      where: { complexCode: m.complexCode, code: m.teamCode },
    });

    if (teamUnit) {
      await prisma.managementUnitManagerAssignment.updateMany({
        where: {
          managementUnitId: teamUnit.id,
          effectiveTo: null,
          managerUserId: { not: user.id },
        },
        data: { effectiveTo: new Date(), reason: 'Thay thế quản lý mới' },
      });

      const active = await prisma.managementUnitManagerAssignment.findFirst({
        where: { managementUnitId: teamUnit.id, managerUserId: user.id, effectiveTo: null },
      });
      if (!active) {
        await prisma.managementUnitManagerAssignment.create({
          data: {
            managementUnitId: teamUnit.id,
            managerUserId: user.id,
            managerType: ManagementUnitManagerType.PRIMARY,
            effectiveFrom: effectiveDate,
            assignedById: adminId,
            reason: `Bổ nhiệm ${m.position}`,
          },
        });
        console.log(`  🔗 Đã gán Quản lý: ${m.fullName} -> Đội [${teamUnit.code}] ${teamUnit.name}`);
      }

      const existingScope = await prisma.driverManagementAccessScope.findFirst({
        where: { userId: user.id, complexCode: m.complexCode, managementUnitId: teamUnit.id },
      });
      if (!existingScope) {
        await prisma.driverManagementAccessScope.create({
          data: {
            userId: user.id,
            complexCode: m.complexCode,
            managementUnitId: teamUnit.id,
            canManageCatalog: true,
            canAssignDrivers: true,
            grantedById: adminId,
          },
        });
      } else {
        await prisma.driverManagementAccessScope.update({
          where: { id: existingScope.id },
          data: {
            canManageCatalog: true,
            canAssignDrivers: true,
          },
        });
      }
    }
  }

  // =========================================================================
  // 3. KOUN MOM: PHÂN BỔ 101 TÀI XẾ ĐỀU CHO CÁC ĐỘI & QUẢN LÝ
  // =========================================================================
  console.log('\n--- 3. Phân bổ 101 tài xế KLH KOUN MOM theo các Đội & Nhân sự Quản lý ---');

  const kmDrivers = await prisma.user.findMany({
    where: { role: Role.DRIVER, unit: Unit.KOUN_MOM },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, fullName: true },
  });

  // 14 Teams và Owner Units tại Koun Mom có Manager
  const kmTeamDistribution = [
    { ownerCode: 'XN-KM-DP', teamCode: 'CG-KM-CGLD-DP', count: 10 },        // Nguyễn Tấn Triều (Làm đất DP)
    { ownerCode: 'XN-KM-DP', teamCode: 'CG-KM-CGTC-DP', count: 10 },        // Phạm Ngọc Hải (Thi công DP)
    { ownerCode: 'XN-KM-DP', teamCode: 'CG-KM-XN-CHUOI-DP1', count: 10 },   // Thái Cao Lưu (Chuối DP1)
    { ownerCode: 'XN-KM-DP', teamCode: 'CG-KM-XN-CHUOI-DP2', count: 10 },   // Huỳnh Quang Viên (Chuối DP2)
    { ownerCode: 'XN-KM-DP', teamCode: 'CG-KM-XN-CHUOI-DP3', count: 10 },   // Thạch Ngọc Vững (Chuối DP3)
    { ownerCode: 'XN-KM-DP', teamCode: 'CG-KM-XOAI-DP', count: 6 },         // Hà Văn Nghĩa (Xoài DP)
    { ownerCode: 'XN-KM-KLH', teamCode: 'CG-KM-CGLD-XN-BO', count: 7 },     // T.Q.Đ Ngọc Hải (Làm đất Bò)
    { ownerCode: 'XN-KM-AD', teamCode: 'CG-KM-XN-BO-AD', count: 7 },        // Trần Văn Nam (Bò AD)
    { ownerCode: 'XN-KM-LP', teamCode: 'CG-KM-XN-CHUOI-LP1', count: 7 },    // Nguyễn Ngọc Nhân (Chuối LP1)
    { ownerCode: 'XN-KM-LP', teamCode: 'CG-KM-XN-CHUOI-LP3', count: 7 },    // Lê Cao Nghị (Chuối LP3)
    { ownerCode: 'XN-KM-AD', teamCode: 'CG-KM-BUOI-AD', count: 6 },         // Huỳnh Đông Giang (Bưởi AD)
    { ownerCode: 'XN-KM-KLH', teamCode: 'CG-KM-PHONG-GNVC', count: 7 },     // Lâm Quốc Cường (Container/Vận tải)
    { ownerCode: 'XN-KM-KLH', teamCode: 'CG-KM-TRAM-TRON-BE-TONG', count: 4 }, // Phạm Nhật Thịnh (Trạm trộn)
    { ownerCode: 'XN-KM-KLH', teamCode: 'CG-KM-BAN-DIEN-NUOC', count: 0 },  // còn lại
  ];

  // Map units
  const kmUnits = await prisma.driverManagementUnit.findMany({ where: { complexCode: 'KOUN_MOM' } });
  const kmUnitByCode = new Map(kmUnits.map((u) => [u.code, u]));

  let driverIdx = 0;
  for (let tIdx = 0; tIdx < kmTeamDistribution.length; tIdx++) {
    const dist = kmTeamDistribution[tIdx];
    const isLast = tIdx === kmTeamDistribution.length - 1;
    const targetCount = isLast ? (kmDrivers.length - driverIdx) : dist.count;

    const ownerUnit = kmUnitByCode.get(dist.ownerCode);
    const teamUnit = kmUnitByCode.get(dist.teamCode);

    if (!ownerUnit || !teamUnit) {
      console.warn(`⚠️ Không tìm thấy unit: ${dist.ownerCode} hoặc ${dist.teamCode}`);
      continue;
    }

    const slice = kmDrivers.slice(driverIdx, driverIdx + targetCount);
    driverIdx += targetCount;

    for (const d of slice) {
      const activeAssign = await prisma.driverManagementAssignment.findFirst({
        where: { driverId: d.id, effectiveTo: null },
      });

      if (!activeAssign) {
        await prisma.driverManagementAssignment.create({
          data: {
            driverId: d.id,
            managementUnitId: ownerUnit.id,
            teamUnitId: teamUnit.id,
            effectiveFrom: effectiveDate,
            assignedById: adminId,
            reason: `Phân công công tác: ${teamUnit.name}`,
          },
        });
      } else {
        await prisma.driverManagementAssignment.update({
          where: { id: activeAssign.id },
          data: {
            managementUnitId: ownerUnit.id,
            teamUnitId: teamUnit.id,
          },
        });
      }

      // Cập nhật EmployeeRecord team/enterprise tương ứng
      await prisma.employeeRecord.updateMany({
        where: { empCode: d.code },
        data: {
          enterprise: ownerUnit.name,
          team: teamUnit.name,
        },
      });
    }

    console.log(`  ✅ Đã phân ${slice.length} tài xế vào [${teamUnit.code}] ${teamUnit.name} (Chủ quản: ${ownerUnit.name})`);
  }

  // =========================================================================
  // 4. KIỂM TRA & TỔNG KẾT DỮ LIỆU
  // =========================================================================
  console.log('\n--- 4. Kiểm tra tổng thể các Đội/Tổ và Nhân sự Quản lý ---');
  const allTeams = await prisma.driverManagementUnit.findMany({
    where: { level: DriverManagementLevel.TEAM, status: DriverManagementUnitStatus.ACTIVE },
    include: {
      parent: true,
      managerAssignments: {
        where: {
          managerType: ManagementUnitManagerType.PRIMARY,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
        },
        include: { manager: true },
      },
      _count: {
        select: { teamAssignments: { where: { effectiveTo: null } } },
      },
    },
    orderBy: [{ complexCode: 'asc' }, { code: 'asc' }],
  });

  let totalManagedDrivers = 0;
  let teamsWithManager = 0;

  for (const t of allTeams) {
    const manager = t.managerAssignments[0]?.manager;
    const count = t._count.teamAssignments;
    if (count > 0 || manager) {
      if (manager) teamsWithManager++;
      totalManagedDrivers += count;
      console.log(
        `[${t.complexCode}] ${t.code.padEnd(20)} | Quản lý: ${(manager?.fullName || 'CHƯA CÓ').padEnd(22)} (${manager?.phone || 'N/A'}) | Nhân sự: ${count} tài xế`
      );
    }
  }

  console.log(`\n🎉 HOÀN TẤT THÀNH CÔNG!`);
  console.log(`- Tổng số đội có quản lý: ${teamsWithManager}`);
  console.log(`- Tổng số tài xế đã liên kết quản lý và đội: ${totalManagedDrivers} tài xế`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
