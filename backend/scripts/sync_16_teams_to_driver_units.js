const { PrismaClient, DriverManagementLevel, DriverManagementUnitType, DriverManagementUnitStatus } = require('@prisma/client');

const prisma = new PrismaClient();

const TEAMS_16 = [
  {
    code: 'DOI_CGLD_02',
    name: 'Đội Cơ giới Làm đất 02',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BCG',
    description: 'Quản lý: Nguyễn Văn Hải (0918.111.002). Vận hành các tổ máy cày xới, bừa phẳng và san gạt đất phục vụ nông trường.',
  },
  {
    code: 'DOI_VT_NOI_BO',
    name: 'Đội Vận tải Nội bộ',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BCG',
    description: 'Quản lý: Trần Văn Khương (0918.311.006). Vận chuyển vật tư, nông sản nội bộ giữa các nông trường và tổng kho.',
  },
  {
    code: 'DOI_VAN_TAI',
    name: 'Đội Vận tải',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'SNOUL',
    parentCode: 'DV-SN-LOGISTICS',
    description: 'Quản lý: Phan Thành Tâm (0918.505.009). Đội xe tải vận chuyển nông sản và vật tư khu liên hợp Snoul.',
  },
  {
    code: 'DOI_CG_NT1',
    name: 'Đội Cơ giới Nông trường 1',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-CHUOI',
    description: 'Quản lý: Phạm Quốc Thiện (0918.505.012). Chuyên trách cơ giới làm đất, phun thuốc và vận chuyển chuối buồng Nông trường 1.',
  },
  {
    code: 'TO_CO_VU_NT2',
    name: 'Tổ Cơ vụ Nông trường 2',
    unitType: DriverManagementUnitType.TO,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-CHUOI',
    description: 'Quản lý: Lê Văn Thắng (0903.345.678). Phục vụ ca máy cày xới, tưới tiêu và thu hoạch buồng chuối Nông trường 2.',
  },
  {
    code: 'DOI_XE_BEN_10T',
    name: 'Đội Xe ben 10T',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'SNOUL',
    parentCode: 'DV-SN-LOGISTICS',
    description: 'Quản lý: Trần Đình Trọng (0901.123.456). Vận hành dàn xe ben tự đổ chở chuối, đất đắp và phụ phẩm nông nghiệp.',
  },
  {
    code: 'DOI_XE_CONT_DD',
    name: 'Đội Xe Container Đường dài',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-CHUOI',
    description: 'Quản lý: Đặng Hoàng Nam (0912.334.455). Chuyên vận chuyển container chuối xuất khẩu ra cảng và hàng đối lưu đường dài.',
  },
  {
    code: 'TO_DIEU_HANH',
    name: 'Tổ Điều hành',
    unitType: DriverManagementUnitType.TO,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BCG',
    description: 'Quản lý: Nguyễn Văn Minh (0908.889.900). Điều độ lệnh điều xe công tác, theo dõi hành trình GPS và phân bổ tài xế.',
  },
  {
    code: 'DOI_VT_CG_01',
    name: 'Đội Vận tải Cơ giới 01',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'NAM_LAO',
    parentCode: 'DV-NL-BCG',
    description: 'Quản lý: Vũ Đức Thịnh (0913.456.789). Vận tải hàng hóa, vật tư và nông sản tại Khu Liên Hợp Nam Lào.',
  },
  {
    code: 'DOI_VC_TMR',
    name: 'Đội Vận chuyển thức ăn TMR',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BO',
    description: 'Quản lý: Hoàng Quốc Việt (0909.112.233). Vận chuyển phụ phẩm băm trộn TMR cấp phát cho các chuồng nuôi bò.',
  },
  {
    code: 'DOI_CUU_HO_KT',
    name: 'Đội Cứu hộ Kỹ thuật',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BTSC',
    description: 'Quản lý: Bùi Anh Tuấn (0915.223.344). Phản ứng nhanh cứu hộ xe hỏng hóc, sửa chữa khẩn cấp tại hiện trường lô thửa.',
  },
  {
    code: 'DOI_XE_CONTAINER',
    name: 'Đội Xe Container',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'SNOUL',
    parentCode: 'DV-SN-LOGISTICS',
    description: 'Quản lý: Ngô Quang Huy (0916.334.455). Vận tải container nông sản và vật tư tổng kho tại KLH Snoul.',
  },
  {
    code: 'TO_THU_NGHIEM_MAY',
    name: 'Tổ Thử nghiệm máy',
    unitType: DriverManagementUnitType.TO,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BTSC',
    description: 'Quản lý: Đinh Trọng Hưng (0917.445.566). Đăng kiểm nội bộ, chạy thử xe sau đại tu và thử nghiệm nông cụ mới.',
  },
  {
    code: 'TO_XE_CONG_VU',
    name: 'Tổ Xe Công vụ',
    unitType: DriverManagementUnitType.TO,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BCG',
    description: 'Quản lý: Lý Kiến Quốc (0918.556.677). Vận hành xe bán tải công vụ, đưa đón cán bộ kỹ sư và ban lãnh đạo.',
  },
  {
    code: 'DOI_CG_TRONG_CO',
    name: 'Đội Cơ giới Trồng cỏ',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BO',
    description: 'Quản lý: Dương Văn Tiến (0919.667.788). Cày bừa, gieo hạt, tưới nước và vận hành máy gặt cắt cỏ phục vụ xí nghiệp bò.',
  },
  {
    code: 'DOI_CAU_CUU_HO',
    name: 'Đội Xe Cẩu & Cứu hộ',
    unitType: DriverManagementUnitType.DOI,
    complexCode: 'KOUN_MOM',
    parentCode: 'DV-KM-BTSC',
    description: 'Quản lý: Trịnh Thanh Bình (0902.778.899). Vận hành xe cẩu tự hành bốc xếp máy móc và cẩu kéo cứu hộ cơ giới.',
  },
];

async function main() {
  console.log('🔄 Đang đồng bộ dữ liệu 16 Đội/Tổ xe cơ giới vào Danh mục Quản lý Hồ sơ Tài xế...');

  for (const item of TEAMS_16) {
    const parentUnit = await prisma.driverManagementUnit.findFirst({
      where: {
        complexCode: item.complexCode,
        code: item.parentCode,
        level: DriverManagementLevel.OWNER,
      },
    });

    if (!parentUnit) {
      console.warn(`⚠️ Không tìm thấy đơn vị chủ quản: ${item.parentCode} tại KLH ${item.complexCode}`);
      continue;
    }

    const team = await prisma.driverManagementUnit.upsert({
      where: {
        complexCode_code: {
          complexCode: item.complexCode,
          code: item.code,
        },
      },
      update: {
        name: item.name,
        level: DriverManagementLevel.TEAM,
        unitType: item.unitType,
        parentId: parentUnit.id,
        description: item.description,
        status: DriverManagementUnitStatus.ACTIVE,
      },
      create: {
        complexCode: item.complexCode,
        code: item.code,
        name: item.name,
        level: DriverManagementLevel.TEAM,
        unitType: item.unitType,
        parentId: parentUnit.id,
        description: item.description,
        status: DriverManagementUnitStatus.ACTIVE,
      },
    });

    console.log(`✅ [${team.complexCode}] Đội/Tổ: ${team.code} - ${team.name} (Chủ quản: ${parentUnit.name})`);
  }

  // Thống kê tổng số Đội/Tổ hiện có
  const totalTeams = await prisma.driverManagementUnit.count({
    where: { level: DriverManagementLevel.TEAM },
  });
  console.log(`\n🎉 Hoàn tất đồng bộ! Hiện có tổng cộng ${totalTeams} Đội/Tổ trực thuộc trong hệ thống.`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
