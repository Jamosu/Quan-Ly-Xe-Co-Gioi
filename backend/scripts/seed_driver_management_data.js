const { PrismaClient, DriverManagementLevel, DriverManagementUnitType, DriverManagementUnitStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu seed Dữ liệu Chuẩn hóa cho Danh mục Quản lý Hồ sơ Tài xế...');

  // Lấy admin user để làm grantor / assigner
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  const adminId = admin ? admin.id : 1;

  // --------------------------------------------------------------------------
  // 1. TẠO CÁC ĐƠN VỊ CHỦ QUẢN CẤP 2 (OWNER)
  // --------------------------------------------------------------------------
  const ownerUnitsDef = [
    // KOUN MOM
    {
      complexCode: 'KOUN_MOM',
      code: 'DV-KM-BCG',
      name: 'Ban Cơ giới KLH Koun Mom',
      unitType: DriverManagementUnitType.BAN,
      description: 'Quản lý toàn bộ phương tiện cơ giới làm đất, công vụ và kho bãi tập trung tại KLH Koun Mom',
    },
    {
      complexCode: 'KOUN_MOM',
      code: 'DV-KM-CHUOI',
      name: 'Đơn vị Cơ giới & Vận tải Chuối',
      unitType: DriverManagementUnitType.XI_NGHIEP,
      description: 'Quản lý máy kéo nông trường chuối và đội xe container vận tải xuất khẩu chuối Dole',
    },
    {
      complexCode: 'KOUN_MOM',
      code: 'DV-KM-BO',
      name: 'Đơn vị Cơ giới Chăn nuôi Bò',
      unitType: DriverManagementUnitType.XI_NGHIEP,
      description: 'Quản lý xe chở thức ăn TMR, dàn máy thu hoạch cỏ và máy móc cơ giới phục vụ chăn nuôi bò',
    },
    {
      complexCode: 'KOUN_MOM',
      code: 'DV-KM-BTSC',
      name: 'Trung tâm Bảo dưỡng Sửa chữa Koun Mom',
      unitType: DriverManagementUnitType.TRUNG_TAM,
      description: 'Quản lý đội xe cứu hộ 24/7, xe bồn cấp phát nhiên liệu lưu động và xưởng cơ khí BTSC',
    },

    // SNOUL
    {
      complexCode: 'SNOUL',
      code: 'DV-SN-BCG',
      name: 'Ban Cơ giới KLH Snoul',
      unitType: DriverManagementUnitType.BAN,
      description: 'Quản lý máy kéo nông nghiệp, nông cụ và xe công vụ tại KLH Snoul',
    },
    {
      complexCode: 'SNOUL',
      code: 'DV-SN-LOGISTICS',
      name: 'Đơn vị Vận tải & Logistics Snoul',
      unitType: DriverManagementUnitType.XI_NGHIEP,
      description: 'Quản lý đội xe đầu kéo container và xe ben vận chuyển nông sản, phân bón tại Snoul',
    },
    {
      complexCode: 'SNOUL',
      code: 'DV-SN-BTSC',
      name: 'Trung tâm BTSC & Cơ điện Snoul',
      unitType: DriverManagementUnitType.TRUNG_TAM,
      description: 'Trung tâm bảo dưỡng sửa chữa và trạm cấp dầu tại KLH Snoul',
    },

    // NAM LAO
    {
      complexCode: 'NAM_LAO',
      code: 'DV-NL-BCG',
      name: 'Ban Cơ giới KLH Nam Lào',
      unitType: DriverManagementUnitType.BAN,
      description: 'Quản lý máy móc cơ giới làm đất và đội vận tải hàng hóa tại KLH Nam Lào',
    },
    {
      complexCode: 'NAM_LAO',
      code: 'DV-NL-VCAY',
      name: 'Đơn vị Cơ giới Cây ăn trái & Cao su',
      unitType: DriverManagementUnitType.XI_NGHIEP,
      description: 'Quản lý xe máy nông nghiệp phục vụ nông trường cao su và vườn cây ăn trái Nam Lào',
    },
    {
      complexCode: 'NAM_LAO',
      code: 'DV-NL-BTSC',
      name: 'Trung tâm BTSC Nam Lào',
      unitType: DriverManagementUnitType.TRUNG_TAM,
      description: 'Quản lý xưởng sửa chữa cơ giới, tổ hàn phục hồi và trạm xăng dầu Nam Lào',
    },
  ];

  const ownerUnitMap = new Map();

  for (const def of ownerUnitsDef) {
    const unit = await prisma.driverManagementUnit.upsert({
      where: {
        complexCode_code: {
          complexCode: def.complexCode,
          code: def.code,
        },
      },
      update: {
        name: def.name,
        level: DriverManagementLevel.OWNER,
        unitType: def.unitType,
        description: def.description,
        status: DriverManagementUnitStatus.ACTIVE,
      },
      create: {
        complexCode: def.complexCode,
        code: def.code,
        name: def.name,
        level: DriverManagementLevel.OWNER,
        unitType: def.unitType,
        description: def.description,
        status: DriverManagementUnitStatus.ACTIVE,
      },
    });
    ownerUnitMap.set(`${def.complexCode}:${def.code}`, unit);
    console.log(`✅ Đã tạo Đơn vị Cấp 2: [${unit.complexCode}] ${unit.code} - ${unit.name}`);
  }

  // --------------------------------------------------------------------------
  // 2. TẠO CÁC ĐỘI/TỔ TRỰC THUỘC CẤP 3 (TEAM)
  // --------------------------------------------------------------------------
  const teamUnitsDef = [
    // KOUN MOM
    {
      parentKey: 'KOUN_MOM:DV-KM-BCG',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-01',
      name: 'Đội Xe Cơ giới Làm đất Koun Mom',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận hành các máy kéo công suất lớn, máy cày xới, máy san gạt làm đất đầu vụ',
    },
    {
      parentKey: 'KOUN_MOM:DV-KM-BCG',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-02',
      name: 'Tổ Xe Công vụ & Đưa đón Koun Mom',
      unitType: DriverManagementUnitType.TO,
      description: 'Vận hành xe bán tải, xe đưa đón cán bộ kỹ sư và nhân viên công vụ',
    },
    {
      parentKey: 'KOUN_MOM:DV-KM-BCG',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-03',
      name: 'Đội Vận tải Tổng kho Koun Mom',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận chuyển phân bón NPK, vật tư, bao bì từ tổng kho đến các nông trường',
    },

    {
      parentKey: 'KOUN_MOM:DV-KM-CHUOI',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-04',
      name: 'Đội Cơ giới Nông trường Chuối 1',
      unitType: DriverManagementUnitType.DOI,
      description: 'Phục vụ cày xới, phun thuốc và vận chuyển chuối buồng tại Nông trường 1',
    },
    {
      parentKey: 'KOUN_MOM:DV-KM-CHUOI',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-05',
      name: 'Đội Cơ giới Nông trường Chuối 2',
      unitType: DriverManagementUnitType.DOI,
      description: 'Phục vụ cày xới, phun thuốc và vận chuyển chuối buồng tại Nông trường 2',
    },
    {
      parentKey: 'KOUN_MOM:DV-KM-CHUOI',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-06',
      name: 'Đội Xe Container Chuối Xuất khẩu',
      unitType: DriverManagementUnitType.DOI,
      description: 'Đội ngũ lái xe đầu kéo kéo container lạnh chở chuối xuất khẩu ra cảng',
    },

    {
      parentKey: 'KOUN_MOM:DV-KM-BO',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-07',
      name: 'Đội Xe Vận chuyển Thức ăn TMR',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận chuyển phụ phẩm, thức ăn tinh và băm trộn TMR cấp phát cho các trại bò',
    },
    {
      parentKey: 'KOUN_MOM:DV-KM-BO',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-08',
      name: 'Đội Cơ giới Đồng cỏ & Thu hoạch Sinh khối',
      unitType: DriverManagementUnitType.DOI,
      description: 'Cày xới, bón phân, tưới nước và vận hành máy gặt cắt cỏ tươi',
    },

    {
      parentKey: 'KOUN_MOM:DV-KM-BTSC',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-09',
      name: 'Tổ Cứu hộ & Sửa chữa Lưu động 24/7',
      unitType: DriverManagementUnitType.TO,
      description: 'Ứng cứu sự cố kỹ thuật hỏng hóc giữa ruộng và kéo xe hư hỏng về xưởng',
    },
    {
      parentKey: 'KOUN_MOM:DV-KM-BTSC',
      complexCode: 'KOUN_MOM',
      code: 'TO-KM-10',
      name: 'Tổ Cấp phát & Vận hành Xe Bồn Dầu',
      unitType: DriverManagementUnitType.TO,
      description: 'Lái xe bồn tiếp dầu DO tận ruộng cho máy cày và quản lý cây xăng trung tâm',
    },

    // SNOUL
    {
      parentKey: 'SNOUL:DV-SN-BCG',
      complexCode: 'SNOUL',
      code: 'TO-SN-01',
      name: 'Đội Máy kéo & Nông cụ Snoul',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận hành các tổ máy cày xới, bừa phẳng và thiết bị nông cụ phụ trợ',
    },
    {
      parentKey: 'SNOUL:DV-SN-BCG',
      complexCode: 'SNOUL',
      code: 'TO-SN-02',
      name: 'Tổ Xe Công vụ Snoul',
      unitType: DriverManagementUnitType.TO,
      description: 'Vận hành xe bán tải công tác và tuần tra an ninh nông trường',
    },
    {
      parentKey: 'SNOUL:DV-SN-LOGISTICS',
      complexCode: 'SNOUL',
      code: 'TO-SN-03',
      name: 'Đội Xe Container & Đầu kéo Snoul',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận tải đối lưu đường dài và container chuối nông sản Snoul',
    },
    {
      parentKey: 'SNOUL:DV-SN-LOGISTICS',
      complexCode: 'SNOUL',
      code: 'TO-SN-04',
      name: 'Đội Xe Ben Vận chuyển Vật tư & Đất đá',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận chuyển đất làm đường, phân bón và phụ phẩm nông nghiệp',
    },
    {
      parentKey: 'SNOUL:DV-SN-BTSC',
      complexCode: 'SNOUL',
      code: 'TO-SN-05',
      name: 'Tổ Sửa chữa & Cứu hộ Cơ giới Snoul',
      unitType: DriverManagementUnitType.TO,
      description: 'Bảo dưỡng định kỳ và sửa chữa cơ giới lưu động',
    },

    // NAM LAO
    {
      parentKey: 'NAM_LAO:DV-NL-BCG',
      complexCode: 'NAM_LAO',
      code: 'TO-NL-01',
      name: 'Đội Xe Cơ giới Làm đất Nam Lào',
      unitType: DriverManagementUnitType.DOI,
      description: 'Cày xới, san phẳng và dọn dẹp thực bì đất trồng cây',
    },
    {
      parentKey: 'NAM_LAO:DV-NL-BCG',
      complexCode: 'NAM_LAO',
      code: 'TO-NL-02',
      name: 'Đội Vận tải Hàng hóa & Nông sản Nam Lào',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận tải hàng hóa, phân bón và sản phẩm thu hoạch',
    },
    {
      parentKey: 'NAM_LAO:DV-NL-VCAY',
      complexCode: 'NAM_LAO',
      code: 'TO-NL-03',
      name: 'Đội Cơ giới Nông trường Cao su Nam Lào',
      unitType: DriverManagementUnitType.DOI,
      description: 'Vận chuyển mủ cao su và cơ giới chăm sóc vườn cây cao su',
    },
    {
      parentKey: 'NAM_LAO:DV-NL-VCAY',
      complexCode: 'NAM_LAO',
      code: 'TO-NL-04',
      name: 'Đội Cơ giới Cây ăn trái Nam Lào',
      unitType: DriverManagementUnitType.DOI,
      description: 'Phục vụ cơ giới vườn xoài, bưởi, sầu riêng Nam Lào',
    },
    {
      parentKey: 'NAM_LAO:DV-NL-BTSC',
      complexCode: 'NAM_LAO',
      code: 'TO-NL-05',
      name: 'Tổ Kỹ thuật Sửa chữa & Xe bồn Dầu Nam Lào',
      unitType: DriverManagementUnitType.TO,
      description: 'Sửa chữa bảo dưỡng và tiếp nhiên liệu lưu động',
    },
  ];

  const teamUnitMap = new Map();

  for (const def of teamUnitsDef) {
    const parentUnit = ownerUnitMap.get(def.parentKey);
    if (!parentUnit) {
      console.warn(`⚠️ Không tìm thấy parentUnit cho ${def.parentKey}`);
      continue;
    }

    const team = await prisma.driverManagementUnit.upsert({
      where: {
        complexCode_code: {
          complexCode: def.complexCode,
          code: def.code,
        },
      },
      update: {
        name: def.name,
        level: DriverManagementLevel.TEAM,
        unitType: def.unitType,
        parentId: parentUnit.id,
        description: def.description,
        status: DriverManagementUnitStatus.ACTIVE,
      },
      create: {
        complexCode: def.complexCode,
        code: def.code,
        name: def.name,
        level: DriverManagementLevel.TEAM,
        unitType: def.unitType,
        parentId: parentUnit.id,
        description: def.description,
        status: DriverManagementUnitStatus.ACTIVE,
      },
    });
    teamUnitMap.set(`${def.complexCode}:${def.code}`, team);
    console.log(`  └─ ✅ Đã tạo Đội/Tổ Cấp 3: [${team.complexCode}] ${team.code} - ${team.name} (Thuộc: ${parentUnit.name})`);
  }

  // --------------------------------------------------------------------------
  // 3. CẤP PHẠM VI QUẢN LÝ (DRIVER MANAGEMENT ACCESS SCOPES)
  // --------------------------------------------------------------------------
  console.log('🔄 Đang khởi tạo Phạm vi Quản lý (Access Scopes)...');
  const farmManager = await prisma.user.findFirst({ where: { username: 'quanly.kounmom' } });
  if (farmManager) {
    await prisma.driverManagementAccessScope.upsert({
      where: {
        driver_mgmt_scope_user_comp_unit_key: {
          userId: farmManager.id,
          complexCode: 'KOUN_MOM',
          managementUnitId: 0, // In Prisma unique nullable, handle carefully
        },
      },
      update: {
        canManageCatalog: true,
        canAssignDrivers: true,
        grantedById: adminId,
      },
      create: {
        userId: farmManager.id,
        complexCode: 'KOUN_MOM',
        managementUnitId: null,
        canManageCatalog: true,
        canAssignDrivers: true,
        grantedById: adminId,
      },
    }).catch(async () => {
      // Fallback if null unique conflict in MySQL
      const existing = await prisma.driverManagementAccessScope.findFirst({
        where: { userId: farmManager.id, complexCode: 'KOUN_MOM', managementUnitId: null },
      });
      if (!existing) {
        await prisma.driverManagementAccessScope.create({
          data: {
            userId: farmManager.id,
            complexCode: 'KOUN_MOM',
            managementUnitId: null,
            canManageCatalog: true,
            canAssignDrivers: true,
            grantedById: adminId,
          },
        });
      }
    });
    console.log(`✅ Đã cấp quyền Quản lý Toàn KLH Koun Mom cho: ${farmManager.fullName} (${farmManager.username})`);
  }

  // --------------------------------------------------------------------------
  // 4. TẠO PROFILE & GÁN ĐIỀU CHUYỂN BAN ĐẦU CHO TẤT CẢ TÀI XẾ
  // --------------------------------------------------------------------------
  console.log('🔄 Đang kiểm tra & gán Đơn vị chủ quản / Đội tổ cho tất cả tài xế...');

  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    select: { id: true, code: true, fullName: true, username: true },
  });

  const employeeRecords = await prisma.employeeRecord.findMany();
  const empMap = new Map(employeeRecords.map((e) => [e.empCode, e]));

  // Đảm bảo mọi driver đều có DriverProfile
  for (const driver of drivers) {
    let profile = await prisma.driverProfile.findUnique({ where: { userId: driver.id } });
    if (!profile) {
      profile = await prisma.driverProfile.create({
        data: {
          userId: driver.id,
          employmentStatus: 'DANG_LAM_VIEC',
          currentShiftStatus: 'SAN_SANG',
          joinedDate: new Date('2024-01-01'),
        },
      });
      console.log(`  └─ ➕ Đã tạo DriverProfile mới cho tài xế: ${driver.fullName} (${driver.username})`);
    }

    // Xác định KLH của tài xế
    const emp = empMap.get(driver.code);
    const uName = (driver.username || '').toLowerCase();
    const uCode = (driver.code || '').toUpperCase();
    const empComp = (emp?.complex || '').toUpperCase();
    const empPos = (emp?.position || '').toLowerCase();

    let complexCode = 'KOUN_MOM';
    if (uName.includes('snoul') || uCode.includes('SN') || empComp.includes('SNOUL')) {
      complexCode = 'SNOUL';
    } else if (uName.includes('namlao') || uCode.includes('NL') || empComp.includes('LAO')) {
      complexCode = 'NAM_LAO';
    }

    // Chọn Đơn vị chủ quản và Đội tổ phù hợp dựa trên nhiệm vụ/xe
    let ownerCode = 'DV-KM-BCG';
    let teamCode = 'TO-KM-01';

    if (complexCode === 'SNOUL') {
      if (empPos.includes('container') || empPos.includes('đầu kéo') || empPos.includes('ben')) {
        ownerCode = 'DV-SN-LOGISTICS';
        teamCode = empPos.includes('ben') ? 'TO-SN-04' : 'TO-SN-03';
      } else if (empPos.includes('cứu hộ') || empPos.includes('sửa chữa') || empPos.includes('thợ máy')) {
        ownerCode = 'DV-SN-BTSC';
        teamCode = 'TO-SN-05';
      } else {
        ownerCode = 'DV-SN-BCG';
        teamCode = empPos.includes('bán tải') ? 'TO-SN-02' : 'TO-SN-01';
      }
    } else if (complexCode === 'NAM_LAO') {
      if (empPos.includes('cao su') || empPos.includes('ăn trái') || empPos.includes('vườn')) {
        ownerCode = 'DV-NL-VCAY';
        teamCode = empPos.includes('cao su') ? 'TO-NL-03' : 'TO-NL-04';
      } else if (empPos.includes('cứu hộ') || empPos.includes('sửa chữa') || empPos.includes('dầu')) {
        ownerCode = 'DV-NL-BTSC';
        teamCode = 'TO-NL-05';
      } else {
        ownerCode = 'DV-NL-BCG';
        teamCode = empPos.includes('hàng') || empPos.includes('vận tải') ? 'TO-NL-02' : 'TO-NL-01';
      }
    } else {
      // KOUN MOM
      if (empPos.includes('bò') || empPos.includes('tmr') || empPos.includes('cỏ')) {
        ownerCode = 'DV-KM-BO';
        teamCode = empPos.includes('tmr') ? 'TO-KM-07' : 'TO-KM-08';
      } else if (empPos.includes('chuối') || empPos.includes('container')) {
        ownerCode = 'DV-KM-CHUOI';
        teamCode = empPos.includes('container') ? 'TO-KM-06' : (empPos.includes('dp2') || empPos.includes('nt2') ? 'TO-KM-05' : 'TO-KM-04');
      } else if (empPos.includes('cứu hộ') || empPos.includes('sửa chữa') || empPos.includes('bồn')) {
        ownerCode = 'DV-KM-BTSC';
        teamCode = empPos.includes('bồn') || empPos.includes('dầu') ? 'TO-KM-10' : 'TO-KM-09';
      } else {
        ownerCode = 'DV-KM-BCG';
        teamCode = empPos.includes('bán tải') || empPos.includes('công vụ') ? 'TO-KM-02' : (empPos.includes('kho') || empPos.includes('phân bón') ? 'TO-KM-03' : 'TO-KM-01');
      }
    }

    const ownerUnit = ownerUnitMap.get(`${complexCode}:${ownerCode}`);
    const teamUnit = teamUnitMap.get(`${complexCode}:${teamCode}`);

    if (ownerUnit) {
      // Kiểm tra xem đã có assignment active chưa
      const activeAssignment = await prisma.driverManagementAssignment.findFirst({
        where: { driverId: driver.id, effectiveTo: null },
      });

      if (!activeAssignment) {
        await prisma.driverManagementAssignment.create({
          data: {
            driverId: driver.id,
            managementUnitId: ownerUnit.id,
            teamUnitId: teamUnit ? teamUnit.id : null,
            effectiveFrom: new Date('2024-01-01'),
            effectiveTo: null,
            reason: 'Phân công biên chế ban đầu theo kế hoạch chuẩn hóa hồ sơ tài xế THACO AGRI',
            assignedById: adminId,
          },
        });
      } else {
        // Cập nhật nếu cần
        await prisma.driverManagementAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            managementUnitId: ownerUnit.id,
            teamUnitId: teamUnit ? teamUnit.id : null,
          },
        });
      }
    }
  }

  console.log(`✅ Đã phân bổ và điều chuyển thành công cho toàn bộ ${drivers.length} tài xế vào Đơn vị chủ quản & Đội/Tổ tương ứng!`);
  console.log('🎉 Hoàn tất seed dữ liệu Danh mục Quản lý Hồ sơ Tài xế!');
}

main()
  .catch((err) => {
    console.error('❌ Lỗi seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
