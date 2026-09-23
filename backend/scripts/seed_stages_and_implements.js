const { PrismaClient, ImplementCategory, ImplementStatus, TechnicalCondition, EquipmentUsageMode, Unit, CatalogType } = require('@prisma/client');
const prisma = new PrismaClient();

const STAGES_BY_PLAN_TYPE = {
  NONG_NGHIEP: [
    { code: 'LAM_DAT', name: '1. Làm đất' },
    { code: 'TRONG_MOI', name: '2. Trồng mới & Chăm sóc' },
    { code: 'THU_HOACH', name: '3. Thu hoạch' },
  ],
  CONG_TRINH: [
    { code: 'DAO_DAP', name: '1. Đào đắp mương máng & hồ đập' },
    { code: 'SAN_LAP', name: '2. San lấp mặt bằng & tạo cos nền' },
    { code: 'GIAO_THONG', name: '3. Mở đường & Lu lèn giao thông nội bộ' },
    { code: 'BAO_DUONG', name: '4. Nạo vét & Duy tu hạ tầng công trình' },
  ],
  VAN_CHUYEN: [
    { code: 'CHUYEN_CHUOI', name: '1. Vận chuyển chuối xuất khẩu' },
    { code: 'CHUYEN_THUC_AN', name: '2. Vận chuyển thức ăn gia súc (Bò)' },
    { code: 'CHUYEN_VAT_TU', name: '3. Vận chuyển phân bón & vật tư' },
    { code: 'CHUYEN_NOI_BO', name: '4. Tiếp liệu & Điều chuyển cơ giới' },
  ],
};

const INITIAL_STAGES = [
  // Nông nghiệp
  { id: 'STG-NN-01', code: 'LAM_DAT', name: '1. Làm đất', planType: 'NONG_NGHIEP', description: 'Cày sâu 30cm, bừa đĩa tơi xốp, phay xới tạo luống', sequence: 1, status: 'active' },
  { id: 'STG-NN-02', code: 'TRONG_MOI', name: '2. Trồng mới & Chăm sóc', planType: 'NONG_NGHIEP', description: 'Khoan hố đặt bầu, rải vôi khử trùng, bón lót hữu cơ, phun thuốc BVTV', sequence: 2, status: 'active' },
  { id: 'STG-NN-03', code: 'THU_HOACH', name: '3. Thu hoạch', planType: 'NONG_NGHIEP', description: 'Cắt buồng chuối, gom kéo mooc về trạm đóng gói, băm nghiền thân cây', sequence: 3, status: 'active' },

  // Công trình
  { id: 'STG-CT-01', code: 'DAO_DAP', name: '1. Đào đắp mương máng & hồ đập', planType: 'CONG_TRINH', description: 'Đào mương trục chính, nạo vét bùn lắng, đào hố móng hồ lắng sinh học', sequence: 1, status: 'active' },
  { id: 'STG-CT-02', code: 'SAN_LAP', name: '2. San lấp mặt bằng & tạo cos nền', planType: 'CONG_TRINH', description: 'Ủi gạt tạo mặt bằng sân bãi, đắp bờ bao ngăn lũ và kè chống sạt lở', sequence: 2, status: 'active' },
  { id: 'STG-CT-03', code: 'GIAO_THONG', name: '3. Mở đường & Lu lèn giao thông nội bộ', planType: 'CONG_TRINH', description: 'Bù vê tạo mặt đường, rải cấp phối đá dăm và lu rung đạt K95', sequence: 3, status: 'active' },
  { id: 'STG-CT-04', code: 'BAO_DUONG', name: '4. Nạo vét & Duy tu hạ tầng công trình', planType: 'CONG_TRINH', description: 'Duy tu định kỳ đường trục nội bộ và hệ thống mương máng mùa mưa lũ', sequence: 4, status: 'active' },

  // Vận chuyển
  { id: 'STG-VC-01', code: 'CHUYEN_CHUOI', name: '1. Vận chuyển chuối xuất khẩu', planType: 'VAN_CHUYEN', description: 'Chở buồng tươi về xưởng đóng gói và chở cont lạnh 40ft về kho trung tâm', sequence: 1, status: 'active' },
  { id: 'STG-VC-02', code: 'CHUYEN_THUC_AN', name: '2. Vận chuyển thức ăn gia súc (Bò)', planType: 'VAN_CHUYEN', description: 'Chở thân lá chuối tươi, bắp sinh khối về hầm ủ chua và trại bò thịt', sequence: 2, status: 'active' },
  { id: 'STG-VC-03', code: 'CHUYEN_VAT_TU', name: '3. Vận chuyển phân bón & vật tư', planType: 'VAN_CHUYEN', description: 'Vận chuyển phân bón, vôi, ống tưới, bao buồng từ kho tổng về chòi tập kết', sequence: 3, status: 'active' },
  { id: 'STG-VC-04', code: 'CHUYEN_NOI_BO', name: '4. Tiếp liệu & Điều chuyển cơ giới', planType: 'VAN_CHUYEN', description: 'Tiếp ứng dầu Diesel, nước sinh hoạt và điều chuyển máy móc nông cụ', sequence: 4, status: 'active' },
];

const INITIAL_IMPLEMENTS = [
  // Nông nghiệp
  { id: 'IMP-NN-01', code: 'NC-CAY-01', name: 'Dàn cày 3 - 4 chảo', planType: 'NONG_NGHIEP', category: 'Cày xới đất', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Cày phá lâm, khử chua tầng đáy', status: 'active' },
  { id: 'IMP-NN-02', code: 'NC-BUA-01', name: 'Dàn bừa đĩa 24 chảo', planType: 'NONG_NGHIEP', category: 'Làm mịn đất', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Bừa tơi xốp mặt đất sau cày lật', status: 'active' },
  { id: 'IMP-NN-03', code: 'NC-XOI-01', name: 'Dàn xới đất phay', planType: 'NONG_NGHIEP', category: 'Làm mịn đất', compatibleVehicles: 'Máy kéo 50 - 70HP', description: 'Phay xới mặt luống đặt bầu chuối', status: 'active' },
  { id: 'IMP-NN-04', code: 'NC-LUONG-01', name: 'Dàn lên luống 2 tim', planType: 'NONG_NGHIEP', category: 'Tạo luống', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Lên luống cao 35cm chuẩn thoát nước', status: 'active' },
  { id: 'IMP-NN-05', code: 'NC-KHOAN-01', name: 'Dàn khoan hố tự hành', planType: 'NONG_NGHIEP', category: 'Trồng mới', compatibleVehicles: 'Máy kéo nhỏ 40 - 50HP', description: 'Khoan hố đặt bầu chuối cấy mô', status: 'active' },
  { id: 'IMP-NN-06', code: 'NC-RAIPHAN-01', name: 'Dàn rải phân / vôi đĩa quay', planType: 'NONG_NGHIEP', category: 'Chăm sóc', compatibleVehicles: 'Máy kéo 40 - 50HP', description: 'Rải vôi bột và phân hữu cơ vi sinh', status: 'active' },
  { id: 'IMP-NN-07', code: 'NC-PHUN-01', name: 'Dàn phun thuốc boom 12m', planType: 'NONG_NGHIEP', category: 'BVTV', compatibleVehicles: 'Máy kéo bánh cao 50 - 60HP', description: 'Phun phòng trừ nấm bệnh Sigatoka', status: 'active' },
  { id: 'IMP-NN-08', code: 'NC-MOOC-01', name: 'Rơ-moóc chuyên dụng treo chuối', planType: 'NONG_NGHIEP', category: 'Thu hoạch', compatibleVehicles: 'Máy kéo 50 - 70HP', description: 'Đệm mút giảm chấn chống trầy xước buồng chuối', status: 'active' },
  { id: 'IMP-NN-09', code: 'NC-BAM-01', name: 'Dàn băm thân cây PTO', planType: 'NONG_NGHIEP', category: 'Thu hoạch', compatibleVehicles: 'Máy kéo 70 - 90HP', description: 'Băm mịn thân cây rải đều mặt ruộng', status: 'active' },
  { id: 'IMP-NN-10', code: 'NC-NONE-01', name: 'Không gắn nông cụ (Xe tự hành)', planType: 'NONG_NGHIEP', category: 'Khác', compatibleVehicles: 'Mọi dòng máy kéo', description: 'Xe di chuyển không mang theo nông cụ', status: 'active' },

  // Công trình
  { id: 'IMP-CT-01', code: 'TB-NONE-CT', name: 'Không gắn nông cụ (Xe cơ giới thi công độc lập)', planType: 'CONG_TRINH', category: 'Thi công', compatibleVehicles: 'Máy ủi, máy đào, máy san', description: 'Thi công với trang bị nguyên bản của xe', status: 'active' },
  { id: 'IMP-CT-02', code: 'TB-GAU-01', name: 'Gầu đào 0.5 - 0.8m³', planType: 'CONG_TRINH', category: 'Đào đắp', compatibleVehicles: 'Máy đào bánh xích PC200', description: 'Đào mương máng thoát nước, vét bùn', status: 'active' },
  { id: 'IMP-CT-03', code: 'TB-LUI-01', name: 'Lưỡi ủi san phẳng đất', planType: 'CONG_TRINH', category: 'San gạt', compatibleVehicles: 'Máy ủi D6R, D6', description: 'San lấp mặt bằng, đắp bờ bao ngăn lũ', status: 'active' },
  { id: 'IMP-CT-04', code: 'TB-BUA-01', name: 'Búa đập đá thủy lực', planType: 'CONG_TRINH', category: 'Phá vỡ', compatibleVehicles: 'Máy đào PC200', description: 'Phá đá móng công trình, san lấp nền', status: 'active' },
  { id: 'IMP-CT-05', code: 'TB-LU-01', name: 'Trống lu rung thép', planType: 'CONG_TRINH', category: 'Đầm nén', compatibleVehicles: 'Xe lu rung 14T', description: 'Đầm nén nền đường nội bộ K95', status: 'active' },

  // Vận chuyển
  { id: 'IMP-VC-01', code: 'MOOC-CH-01', name: 'Rơ-moóc chuyên dụng chở chuối', planType: 'VAN_CHUYEN', category: 'Nông sản', compatibleVehicles: 'Xe đầu kéo, máy kéo', description: 'Chở chuối tươi từ lô về xưởng sơ chế', status: 'active' },
  { id: 'IMP-VC-02', code: 'MOOC-SAN-01', name: 'Sơ-mi rơ-moóc sàn 40ft', planType: 'VAN_CHUYEN', category: 'Vật tư', compatibleVehicles: 'Đầu kéo container', description: 'Chở vật tư cồng kềnh, cuộn ống tưới, phân bón', status: 'active' },
  { id: 'IMP-VC-03', code: 'MOOC-CONT-01', name: 'Sơ-mi rơ-moóc xương chở cont', planType: 'VAN_CHUYEN', category: 'Container', compatibleVehicles: 'Đầu kéo container', description: 'Kéo container 40ft chuối lạnh xuất khẩu', status: 'active' },
  { id: 'IMP-VC-04', code: 'THUNG-BEN-01', name: 'Thùng ben tự đổ 8 - 15 tấn', planType: 'VAN_CHUYEN', category: 'Ben tự đổ', compatibleVehicles: 'Xe ben 10 - 15T', description: 'Chở phân bón, đất đá san lấp, phế phẩm', status: 'active' },
  { id: 'IMP-VC-05', code: 'XITEC-BON-01', name: 'Bồn xitec chuyên dụng bơm xả lưu động', planType: 'VAN_CHUYEN', category: 'Nhiên liệu & Nước', compatibleVehicles: 'Xe bồn xitec 5 khối', description: 'Tiếp dầu diesel và nước cho máy ngoài đồng', status: 'active' },
];

function mapImplementCategory(code, name, category) {
  const text = (name + ' ' + category + ' ' + code).toLowerCase();
  if (text.includes('cày')) return ImplementCategory.DAN_CAY;
  if (text.includes('bừa')) return ImplementCategory.DAN_BUA;
  if (text.includes('xới') || text.includes('phay') || text.includes('luống') || text.includes('khoan')) return ImplementCategory.DAN_XOI;
  if (text.includes('rải phân') || text.includes('bón')) return ImplementCategory.DAN_RAI_PHAN;
  if (text.includes('phun')) return ImplementCategory.DAN_PHUN_THUOC;
  if (text.includes('mooc') || text.includes('rơ-moóc') || text.includes('sơ-mi') || text.includes('ben') || text.includes('xitec')) return ImplementCategory.RO_MOOC;
  return ImplementCategory.DAN_CAY;
}

async function main() {
  console.log('--- 1. BẮT ĐẦU SEED GIAI ĐOẠN / STAGES VÀO DATABASE ---');

  const planTypeNames = {
    NONG_NGHIEP: 'Cơ giới Nông nghiệp',
    CONG_TRINH: 'Máy Công trình',
    VAN_CHUYEN: 'Vận chuyển nội bộ',
  };

  for (const stg of INITIAL_STAGES) {
    const parentName = planTypeNames[stg.planType] || stg.planType;
    await prisma.catalogItem.upsert({
      where: { id: stg.id },
      update: {
        code: stg.code,
        name: stg.name,
        type: CatalogType.JOB_TYPE,
        parentCode: stg.planType,
        parentName: parentName,
        description: stg.description,
        status: 'HOAT_DONG',
        systemId: String(stg.sequence),
        updatedUser: 'admin',
        updatedDate: '14-09-2026',
      },
      create: {
        id: stg.id,
        code: stg.code,
        name: stg.name,
        type: CatalogType.JOB_TYPE,
        parentCode: stg.planType,
        parentName: parentName,
        description: stg.description,
        status: 'HOAT_DONG',
        systemId: String(stg.sequence),
        createdUser: 'admin',
        createdDate: '14-03-2026',
        updatedUser: 'admin',
        updatedDate: '14-09-2026',
      },
    });
    console.log(`✓ Đã lưu Giai đoạn: [${stg.id}] ${stg.name} (${stg.planType})`);
  }

  console.log('\n--- 2. BẮT ĐẦU SEED DANH MỤC NÔNG CỤ / THIẾT BỊ PHỤ TRỢ VÀO DATABASE ---');

  for (const imp of INITIAL_IMPLEMENTS) {
    const prismaCategory = mapImplementCategory(imp.code, imp.name, imp.category);
    const usageMode = imp.code.includes('NONE') ? EquipmentUsageMode.STANDALONE : EquipmentUsageMode.ATTACHABLE;

    // 2.1. Upsert vào bảng AgriculturalImplement (agricultural_implements)
    await prisma.agriculturalImplement.upsert({
      where: { code: imp.code },
      update: {
        name: imp.name,
        category: prismaCategory,
        unit: Unit.KOUN_MOM,
        status: ImplementStatus.IN_DEPOT,
        technicalCondition: TechnicalCondition.GOOD,
        standardPurpose: `${imp.planType} - ${imp.category}: ${imp.description}. Tương thích: ${imp.compatibleVehicles}`,
        usageMode: usageMode,
        sourceGroup: imp.planType,
        gatheringLocation: 'Bãi tập kết Trung tâm',
        managerName: 'Nguyễn Tấn Triều',
        managerPhone: '0908 123 456',
      },
      create: {
        code: imp.code,
        name: imp.name,
        category: prismaCategory,
        unit: Unit.KOUN_MOM,
        status: ImplementStatus.IN_DEPOT,
        technicalCondition: TechnicalCondition.GOOD,
        standardPurpose: `${imp.planType} - ${imp.category}: ${imp.description}. Tương thích: ${imp.compatibleVehicles}`,
        usageMode: usageMode,
        sourceGroup: imp.planType,
        gatheringLocation: 'Bãi tập kết Trung tâm',
        managerName: 'Nguyễn Tấn Triều',
        managerPhone: '0908 123 456',
      },
    });

    // 2.2. Upsert vào CatalogItem (catalogs) để đồng bộ tìm kiếm toàn hệ thống
    await prisma.catalogItem.upsert({
      where: { id: imp.id },
      update: {
        code: imp.code,
        name: imp.name,
        type: CatalogType.VEHICLE_CATEGORY,
        parentCode: imp.planType,
        parentName: imp.category,
        description: `${imp.description} | Xe tương thích: ${imp.compatibleVehicles}`,
        status: 'HOAT_DONG',
        updatedUser: 'admin',
        updatedDate: '14-09-2026',
      },
      create: {
        id: imp.id,
        code: imp.code,
        name: imp.name,
        type: CatalogType.VEHICLE_CATEGORY,
        parentCode: imp.planType,
        parentName: imp.category,
        description: `${imp.description} | Xe tương thích: ${imp.compatibleVehicles}`,
        status: 'HOAT_DONG',
        createdUser: 'admin',
        createdDate: '14-03-2026',
        updatedUser: 'admin',
        updatedDate: '14-09-2026',
      },
    });

    console.log(`✓ Đã lưu Nông cụ/Thiết bị: [${imp.code}] ${imp.name} (${imp.planType} - ${imp.category})`);
  }

  console.log('\n=== TỔNG KẾT DỮ LIỆU ĐÃ LƯU XUỐNG DATABASE ===');
  const stageCount = await prisma.catalogItem.count({ where: { type: CatalogType.JOB_TYPE } });
  const impCatalogCount = await prisma.catalogItem.count({ where: { type: CatalogType.VEHICLE_CATEGORY } });
  const totalImplementsInDb = await prisma.agriculturalImplement.count();
  
  console.log(`1. Tổng số Giai đoạn (JOB_TYPE) trong Catalog: ${stageCount}`);
  console.log(`2. Tổng số Danh mục nông cụ trong Catalog: ${impCatalogCount}`);
  console.log(`3. Tổng số AgriculturalImplements thực tế trong DB: ${totalImplementsInDb}`);
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
