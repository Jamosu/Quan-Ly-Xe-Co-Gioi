const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding comprehensive dispatch orders for the current week (2026-09-21 to 2026-09-27)...');

  // Requester (Admin / Dispatcher)
  const requester = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  }) || await prisma.user.findFirst();

  if (!requester) {
    throw new Error('No admin user found to act as order creator/approver.');
  }

  // 1. Identify Key Drivers
  // Driver 1: Nguyen Van Minh (Agricultural Tractor)
  const d1 = await prisma.user.findFirst({
    where: { role: 'DRIVER', username: 'km.tx001' }
  });
  // Driver 2: Ngo Tien Duy (Excavator / Construction)
  const d2 = await prisma.user.findFirst({
    where: { role: 'DRIVER', username: 'km.tx031' }
  });
  // Driver 3: Pham Minh Duy (Dump Truck / Transport)
  const d3 = await prisma.user.findFirst({
    where: { role: 'DRIVER', username: 'km.tx061' }
  });
  // Driver 4: Vannak Dara (Fuel Tanker Truck)
  const d4 = await prisma.user.findFirst({
    where: { role: 'DRIVER', username: 'km.tx066' }
  });

  console.log('Selected Drivers:');
  console.log(`- D1: ${d1?.fullName} (${d1?.username}, ID: ${d1?.id})`);
  console.log(`- D2: ${d2?.fullName} (${d2?.username}, ID: ${d2?.id})`);
  console.log(`- D3: ${d3?.fullName} (${d3?.username}, ID: ${d3?.id})`);
  console.log(`- D4: ${d4?.fullName} (${d4?.username}, ID: ${d4?.id})`);

  // 2. Identify Matching Assigned Vehicles
  const v1 = await prisma.vehicle.findFirst({ where: { code: 'CNN-MKX-002' } }); // CT65 Crawler Tractor
  const v2 = await prisma.vehicle.findFirst({ where: { code: 'CHT-MĐA-001' } }); // KOBELCO Excavator
  const v3 = await prisma.vehicle.findFirst({ where: { code: 'CHT-XTA-014' } }); // AUMAN Dump Truck
  const v4 = await prisma.vehicle.findFirst({ where: { code: 'CHT-XBO-005' } }); // AUMAN Fuel Tanker

  console.log('Selected Vehicles:');
  console.log(`- V1: ${v1?.code} - ${v1?.name}`);
  console.log(`- V2: ${v2?.code} - ${v2?.name}`);
  console.log(`- V3: ${v3?.code} - ${v3?.name}`);
  console.log(`- V4: ${v4?.code} - ${v4?.name}`);

  // Ensure Driver Profiles exist
  for (const drv of [d1, d2, d3, d4].filter(Boolean)) {
    await prisma.driverProfile.upsert({
      where: { userId: drv.id },
      update: {
        employmentStatus: 'DANG_LAM_VIEC',
        currentShiftStatus: drv.id === d1.id ? 'DANG_VAN_HANH' : 'SAN_SANG',
      },
      create: {
        userId: drv.id,
        employmentStatus: 'DANG_LAM_VIEC',
        licenseClass: 'HANG_B2',
        currentShiftStatus: drv.id === d1.id ? 'DANG_VAN_HANH' : 'SAN_SANG',
        currentLocation: 'Bãi máy Đội CGLĐ Daun Penh',
      }
    });
  }

  // 3. Define the Week Orders Schedule (2026-09-21 to 2026-09-27)
  const ordersConfig = [
    // ==========================================
    // DRIVER 1: NGUYEN VAN MINH (km.tx001) - MAY CAY CT65 (CNN-MKX-002)
    // ==========================================
    {
      code: 'LDX-NN-20260921-001',
      category: 'AGRICULTURE',
      domain: 'AGRICULTURE',
      type: 'DISPATCH',
      jobName: 'Cày vỡ đất chuẩn bị trồng chuối vụ 2 - Lô B01-B03',
      jobDescription: 'Cày sâu 35cm phá lớp đất đế cày, phơi ải chuẩn bị bừa tơi xốp cho đợt xuống giống chuối mới.',
      origin: 'Bãi máy Đội CGLĐ Daun Penh',
      destination: 'Lô Chuối B01-B03, Xí nghiệp Chuối DP1',
      vehicleId: v1?.id,
      driverId: d1?.id,
      managementUnitId: 117, // CGLD DP
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 4.5,
      targetUnit: 'Ha',
      completedQuantity: 4.5,
      plannedStartAt: new Date('2026-09-21T00:00:00.000Z'), // 07:00 ICT
      plannedEndAt: new Date('2026-09-21T08:00:00.000Z'),   // 15:00 ICT
      workStatus: 'ACCEPTED',
      dispatchStatus: 'COMPLETED',
      notes: 'Hoàn thành 100% diện tích lô B01-B03 theo biên bản nghiệm thu kỹ thuật.',
      execution: {
        startedAt: new Date('2026-09-21T00:15:00.000Z'),
        endedAt: new Date('2026-09-21T08:05:00.000Z'),
        startOdoKm: 1210,
        endOdoKm: 1228,
        startMachineHours: 308.0,
        endMachineHours: 315.5,
        workingMinutes: 440,
        breakMinutes: 30,
        quantity: 4.5,
      },
      dailyReport: {
        reportDate: new Date('2026-09-21'),
        status: 'ACCEPTED',
        quantityToday: 4.5,
        unit: 'Ha',
        startOdoKm: 1210,
        endOdoKm: 1228,
        startMachineHours: 308.0,
        endMachineHours: 315.5,
        fuelLiters: 48,
      },
    },
    {
      code: 'LDX-NN-20260922-001',
      category: 'AGRICULTURE',
      domain: 'AGRICULTURE',
      type: 'DISPATCH',
      jobName: 'Bừa phẳng đất và lên luống rãnh thoát nước - Lô B04-B06',
      jobDescription: 'Bừa đĩa tơi xốp 2 lượt và tạo luống cao 40cm, vét rãnh tiêu thoát nước chống ngập mùa mưa.',
      origin: 'Bãi máy Đội CGLĐ Daun Penh',
      destination: 'Lô Chuối B04-B06, Xí nghiệp Chuối DP1',
      vehicleId: v1?.id,
      driverId: d1?.id,
      managementUnitId: 117,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 5.0,
      targetUnit: 'Ha',
      completedQuantity: 5.0,
      plannedStartAt: new Date('2026-09-22T00:00:00.000Z'), // 07:00 ICT
      plannedEndAt: new Date('2026-09-22T08:30:00.000Z'),   // 15:30 ICT
      workStatus: 'ACCEPTED',
      dispatchStatus: 'COMPLETED',
      notes: 'Đã hoàn thành đúng tiêu chuẩn luống cao và khơi thông rãnh tiêu nước.',
      execution: {
        startedAt: new Date('2026-09-22T00:10:00.000Z'),
        endedAt: new Date('2026-09-22T08:20:00.000Z'),
        startOdoKm: 1228,
        endOdoKm: 1250,
        startMachineHours: 315.5,
        endMachineHours: 324.5,
        workingMinutes: 460,
        breakMinutes: 30,
        quantity: 5.0,
      },
      dailyReport: {
        reportDate: new Date('2026-09-22'),
        status: 'ACCEPTED',
        quantityToday: 5.0,
        unit: 'Ha',
        startOdoKm: 1228,
        endOdoKm: 1250,
        startMachineHours: 315.5,
        endMachineHours: 324.5,
        fuelLiters: 52,
      },
    },
    {
      code: 'LDX-NN-20260923-001',
      category: 'AGRICULTURE',
      domain: 'AGRICULTURE',
      type: 'DISPATCH',
      jobName: 'Cày bừa tơi xốp đất & bón lót phân vi sinh - Lô B07-B08',
      jobDescription: 'Rải phân vi sinh bón lót 5 tấn/ha kết hợp cày vùi bừa phẳng bề mặt tạo luống.',
      origin: 'Bãi máy Đội CGLĐ Daun Penh',
      destination: 'Lô Chuối B07-B08, Xí nghiệp Chuối DP1',
      vehicleId: v1?.id,
      driverId: d1?.id,
      managementUnitId: 117,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 4.0,
      targetUnit: 'Ha',
      completedQuantity: 2.8,
      plannedStartAt: new Date('2026-09-23T00:00:00.000Z'), // 07:00 ICT
      plannedEndAt: new Date('2026-09-23T09:30:00.000Z'),   // 16:30 ICT
      workStatus: 'IN_PROGRESS',
      dispatchStatus: 'WORKING',
      notes: 'Đang vận hành tại hiện trường. Đã hoàn thành 70% khối lượng ca ngày hôm nay.',
      execution: {
        startedAt: new Date('2026-09-23T00:15:00.000Z'),
        endedAt: null, // Still active
        startOdoKm: 1250,
        endOdoKm: null,
        startMachineHours: 324.5,
        endMachineHours: null,
        workingMinutes: 280,
        breakMinutes: 45,
        quantity: 2.8,
      },
      dailyReport: {
        reportDate: new Date('2026-09-23'),
        status: 'DRAFT',
        quantityToday: 2.8,
        unit: 'Ha',
        startOdoKm: 1250,
        endOdoKm: 1264,
        startMachineHours: 324.5,
        endMachineHours: 329.8,
        fuelLiters: 32,
      },
    },
    {
      code: 'LDX-NN-20260923-002',
      category: 'AGRICULTURE',
      domain: 'AGRICULTURE',
      type: 'DISPATCH',
      jobName: 'Xới cỏ mép luống và làm sạch cỏ bờ bao chống cháy - Lô B09',
      jobDescription: 'Vận hành dàn xới mép dọn dẹp thực bì dọc hành lang mương bờ bao chống cháy cuối ngày.',
      origin: 'Lô B07-B08, Xí nghiệp Chuối DP1',
      destination: 'Lô B09, Xí nghiệp Chuối DP1',
      vehicleId: v1?.id,
      driverId: d1?.id,
      managementUnitId: 117,
      unit: 'KOUN_MOM',
      shift: 'CA_CHIEU',
      targetQuantity: 1.5,
      targetUnit: 'Ha',
      completedQuantity: 0,
      plannedStartAt: new Date('2026-09-23T08:00:00.000Z'), // 15:00 ICT
      plannedEndAt: new Date('2026-09-23T11:00:00.000Z'),   // 18:00 ICT
      workStatus: 'ASSIGNED',
      dispatchStatus: 'ASSIGNED',
      notes: 'Lệnh đã giao ca chiều. Chờ tài xế xác nhận nhận lệnh và di chuyển.',
    },
    {
      code: 'LDX-NN-20260924-001',
      category: 'AGRICULTURE',
      domain: 'AGRICULTURE',
      type: 'DISPATCH',
      jobName: 'Cày rãnh thoát nước sâu 40cm chuẩn bị lắp tưới - Lô C01-C03',
      jobDescription: 'Rạch rãnh đặt ống tưới nhỏ giọt kết hợp tiêu thoát nước liên lô C01 đến C03.',
      origin: 'Bãi máy Đội CGLĐ Daun Penh',
      destination: 'Lô Chuối C01-C03, Xí nghiệp Chuối DP2',
      vehicleId: v1?.id,
      driverId: d1?.id,
      managementUnitId: 117,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 4.8,
      targetUnit: 'Ha',
      completedQuantity: 0,
      plannedStartAt: new Date('2026-09-24T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-24T09:00:00.000Z'),
      workStatus: 'ASSIGNED',
      dispatchStatus: 'ASSIGNED',
      notes: 'Kế hoạch điều động ngày mai. Kiểm tra dàn rạch rãnh trước khi xuất phát.',
    },
    {
      code: 'LDX-NN-20260925-001',
      category: 'AGRICULTURE',
      domain: 'AGRICULTURE',
      type: 'DISPATCH',
      jobName: 'Bừa đĩa phá váng mặt ruộng sau mưa và san gạt bề mặt - Lô C04-C06',
      jobDescription: 'Phá váng bề mặt chống nghẹt rễ cây con, hoàn thiện mặt bằng trước khi trồng giống.',
      origin: 'Bãi máy Đội CGLĐ Daun Penh',
      destination: 'Lô Chuối C04-C06, Xí nghiệp Chuối DP2',
      vehicleId: v1?.id,
      driverId: d1?.id,
      managementUnitId: 117,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 5.2,
      targetUnit: 'Ha',
      completedQuantity: 0,
      plannedStartAt: new Date('2026-09-25T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-25T08:30:00.000Z'),
      workStatus: 'ASSIGNED',
      dispatchStatus: 'ASSIGNED',
      notes: 'Kế hoạch thứ Sáu. Chú ý tốc độ bừa giữ độ sâu ổn định.',
    },
    {
      code: 'LDX-NN-20260926-001',
      category: 'AGRICULTURE',
      domain: 'AGRICULTURE',
      type: 'DISPATCH',
      jobName: 'Bảo dưỡng Cấp 1 (BDC1) & cày dọn vành đai chống cháy cuối tuần',
      jobDescription: 'Thực hiện kiểm tra siết bu-lông, bôi trơn các khớp xích, cày dọn 2 lượt vành đai bảo vệ.',
      origin: 'Bãi máy Đội CGLĐ Daun Penh',
      destination: 'Vành đai Nông trường Chuối Daun Penh',
      vehicleId: v1?.id,
      driverId: d1?.id,
      managementUnitId: 117,
      unit: 'KOUN_MOM',
      shift: 'CA_SANG',
      targetQuantity: 2.0,
      targetUnit: 'Ha',
      completedQuantity: 0,
      plannedStartAt: new Date('2026-09-26T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-26T04:30:00.000Z'),
      workStatus: 'ASSIGNED',
      dispatchStatus: 'ASSIGNED',
      notes: 'Thực hiện BDC1 đầu ca trên App trước khi xuất phát.',
    },

    // ==========================================
    // DRIVER 2: NGO TIEN DUY (km.tx031) - MAY DAO KOBELCO (CHT-MĐA-001)
    // ==========================================
    {
      code: 'LDX-CT-20260921-001',
      category: 'CONSTRUCTION',
      domain: 'CONSTRUCTION',
      type: 'DISPATCH',
      jobName: 'Đào mương tiêu thủy thoát úng Lô D01-D04',
      jobDescription: 'Đào mương tiêu thủy kích thước đáy 1.2m, miệng 2.5m, sâu 1.8m khơi thông dòng chảy thoát lũ.',
      origin: 'Bãi máy Ban Cơ giới',
      destination: 'Tuyến mương Lô D01-D04, XN Chuối DP2',
      vehicleId: v2?.id,
      driverId: d2?.id,
      managementUnitId: 109, // XN Chuối DP2
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 250,
      targetUnit: 'm',
      completedQuantity: 250,
      plannedStartAt: new Date('2026-09-21T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-21T09:00:00.000Z'),
      workStatus: 'ACCEPTED',
      dispatchStatus: 'COMPLETED',
      notes: 'Nghiệm thu đạt cao độ thiết kế và độ dốc thoát nước chuẩn.',
    },
    {
      code: 'LDX-CT-20260923-001',
      category: 'CONSTRUCTION',
      domain: 'CONSTRUCTION',
      type: 'DISPATCH',
      jobName: 'Đào đắp bờ bao chống ngập úng Lô Chuối trũng E02',
      jobDescription: 'Đào xúc bùn đất đắp đê bao cao 1.5m bảo vệ diện tích chuối mới trồng khỏi ngập úng.',
      origin: 'Bãi máy XN Chuối DP2',
      destination: 'Khu vực trũng Lô E02, XN Chuối DP2',
      vehicleId: v2?.id,
      driverId: d2?.id,
      managementUnitId: 109,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 180,
      targetUnit: 'm',
      completedQuantity: 120,
      plannedStartAt: new Date('2026-09-23T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-23T09:00:00.000Z'),
      workStatus: 'IN_PROGRESS',
      dispatchStatus: 'WORKING',
      notes: 'Đang thi công đắp bờ bao ca ngày hôm nay.',
    },
    {
      code: 'LDX-CT-20260924-001',
      category: 'CONSTRUCTION',
      domain: 'CONSTRUCTION',
      type: 'DISPATCH',
      jobName: 'Đào rãnh tuyến cáp ngầm và ống cấp nước tự động Lô E03',
      jobDescription: 'Đào rãnh kỹ thuật sâu 80cm rộng 50cm phục vụ lắp đặt hệ thống châm phân tự động.',
      origin: 'Bãi máy XN Chuối DP2',
      destination: 'Lô Chuối E03, XN Chuối DP2',
      vehicleId: v2?.id,
      driverId: d2?.id,
      managementUnitId: 109,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 300,
      targetUnit: 'm',
      completedQuantity: 0,
      plannedStartAt: new Date('2026-09-24T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-24T09:00:00.000Z'),
      workStatus: 'ASSIGNED',
      dispatchStatus: 'ASSIGNED',
      notes: 'Kế hoạch ngày mai. Lưu ý tránh va chạm đường ống hiện hữu.',
    },

    // ==========================================
    // DRIVER 3: PHAM MINH DUY (km.tx061) - XE BEN AUMAN (CHT-XTA-014)
    // ==========================================
    {
      code: 'LVC-NB-20260921-001',
      category: 'TRANSPORT',
      domain: 'TRANSPORT',
      type: 'TRANSPORT',
      jobName: 'Vận chuyển đá cấp phối 0x4 rải mặt đường liên lô B',
      jobDescription: 'Chở đá dăm 0x4 từ mỏ đá về san lấp ổ gà và gia cố mặt đường trục chính liên lô B.',
      origin: 'Mỏ đá Trung tâm Daun Penh',
      destination: 'Tuyến đường liên lô B01-B08',
      vehicleId: v3?.id,
      driverId: d3?.id,
      managementUnitId: 116,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 90,
      targetUnit: 'Tấn',
      completedQuantity: 90,
      plannedStartAt: new Date('2026-09-21T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-21T09:00:00.000Z'),
      workStatus: 'ACCEPTED',
      dispatchStatus: 'COMPLETED',
      notes: 'Hoàn tất 6 chuyến chở đá đúng khối lượng 90 tấn.',
    },
    {
      code: 'LVC-NB-20260923-001',
      category: 'TRANSPORT',
      domain: 'TRANSPORT',
      type: 'TRANSPORT',
      jobName: 'Vận chuyển 18 tấn phân hữu cơ vi sinh về Kho trung chuyển DP1',
      jobDescription: 'Bốc hàng tại Tổng kho vật tư KLH Koun Mom chuyển giao chòi tập kết vật tư XN Chuối DP1.',
      origin: 'Tổng kho Vật tư KLH Koun Mom',
      destination: 'Kho trung chuyển Nông trường Chuối DP1',
      vehicleId: v3?.id,
      driverId: d3?.id,
      managementUnitId: 116,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 18,
      targetUnit: 'Tấn',
      completedQuantity: 18,
      plannedStartAt: new Date('2026-09-23T01:00:00.000Z'), // 08:00 ICT
      plannedEndAt: new Date('2026-09-23T08:00:00.000Z'),   // 15:00 ICT
      workStatus: 'IN_PROGRESS',
      dispatchStatus: 'WORKING',
      notes: 'Đang vận chuyển chuyến thứ 2 trong ca.',
    },
    {
      code: 'LVC-NB-20260925-001',
      category: 'TRANSPORT',
      domain: 'TRANSPORT',
      type: 'TRANSPORT',
      jobName: 'Vận chuyển chuối buồng từ Xưởng đóng gói về Kho lạnh xuất khẩu',
      jobDescription: 'Chở chuối tươi đóng pallet chuyển kho bảo quản nhiệt độ chuẩn xuất khẩu cảng Sihanoukville.',
      origin: 'Xưởng đóng gói Packhouse DP1',
      destination: 'Kho lạnh Trung tâm KLH Koun Mom',
      vehicleId: v3?.id,
      driverId: d3?.id,
      managementUnitId: 116,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 32,
      targetUnit: 'Tấn',
      completedQuantity: 0,
      plannedStartAt: new Date('2026-09-25T00:00:00.000Z'),
      plannedEndAt: new Date('2026-09-25T08:00:00.000Z'),
      workStatus: 'ASSIGNED',
      dispatchStatus: 'ASSIGNED',
      notes: 'Kế hoạch thứ Sáu. Chằng buộc dây an toàn chống dập chuối.',
    },

    // ==========================================
    // DRIVER 4: VANNAK DARA (km.tx066) - XE BON CAP DAU (CHT-XBO-005)
    // ==========================================
    {
      code: 'LVC-NB-20260923-002',
      category: 'TRANSPORT',
      domain: 'SUPPORT',
      type: 'TRANSPORT',
      jobName: 'Tiếp dầu Diezel lưu động 4.000 Lít cho máy cày & máy đào tại hiện trường',
      jobDescription: 'Bơm dầu cấp phát trực tiếp cho 6 máy cày Lô B và 3 máy đào Lô E phục vụ thi công liên tục.',
      origin: 'Kho Xăng dầu Trung tâm Daun Penh',
      destination: 'Hiện trường Lô B & Lô E, XN Chuối Daun Penh',
      vehicleId: v4?.id,
      driverId: d4?.id,
      managementUnitId: 115,
      unit: 'KOUN_MOM',
      shift: 'CA_NGAY',
      targetQuantity: 4000,
      targetUnit: 'Lít',
      completedQuantity: 2800,
      plannedStartAt: new Date('2026-09-23T01:30:00.000Z'), // 08:30 ICT
      plannedEndAt: new Date('2026-09-23T09:00:00.000Z'),   // 16:00 ICT
      workStatus: 'IN_PROGRESS',
      dispatchStatus: 'WORKING',
      notes: 'Đang bơm dầu tại hiện trường Lô B07.',
    },
  ];

  console.log(`\nProcessing ${ordersConfig.length} dispatch orders across the week...`);

  for (const cfg of ordersConfig) {
    if (!cfg.vehicleId || !cfg.driverId) {
      console.warn(`⚠️ Skipping ${cfg.code} because vehicle or driver not found.`);
      continue;
    }

    // 1. Create or update DispatchOrder (or TransportOrder)
    let dispatchId = null;
    let transportId = null;

    if (cfg.type === 'DISPATCH') {
      const dispatchData = {
        code: cfg.code,
        requesterId: requester.id,
        unit: cfg.unit,
        purpose: cfg.jobName,
        origin: cfg.origin,
        destination: cfg.destination,
        sourceType: 'MANUAL',
        operationDomain: cfg.domain,
        vehicleId: cfg.vehicleId,
        driverId: cfg.driverId,
        departureTime: cfg.plannedStartAt,
        plannedEndTime: cfg.plannedEndAt,
        scheduledStartAt: cfg.plannedStartAt,
        scheduledEndAt: cfg.plannedEndAt,
        workDurationMinutes: 480,
        breakDurationMinutes: 30,
        status: cfg.dispatchStatus,
        assignedById: requester.id,
        assignedAt: new Date(),
        notes: cfg.notes,
      };

      const dispatch = await prisma.dispatchOrder.upsert({
        where: { code: cfg.code },
        update: dispatchData,
        create: dispatchData,
      });
      dispatchId = dispatch.id;
    } else {
      const transportData = {
        code: cfg.code,
        sourceType: 'MANUAL',
        routeType: 'ONE_WAY',
        unit: cfg.unit,
        requestDate: new Date(),
        executionDate: cfg.plannedStartAt,
        cargoType: cfg.jobName,
        tonnage: cfg.targetQuantity,
        origin: cfg.origin,
        destination: cfg.destination,
        vehicleId: cfg.vehicleId,
        driverId: cfg.driverId,
        departureTime: cfg.plannedStartAt,
        plannedEndTime: cfg.plannedEndAt,
        status: cfg.dispatchStatus === 'COMPLETED' ? 'COMPLETED' : cfg.dispatchStatus === 'WORKING' ? 'IN_TRANSIT' : 'ASSIGNED',
        assignedAt: new Date(),
        notes: cfg.notes,
      };

      const transport = await prisma.transportOrder.upsert({
        where: { code: cfg.code },
        update: transportData,
        create: transportData,
      });
      transportId = transport.id;

      // Add transport item
      await prisma.transportItem.deleteMany({ where: { transportOrderId: transport.id } });
      await prisma.transportItem.create({
        data: {
          transportOrderId: transport.id,
          cargoName: cfg.jobName,
          unitOfMeasure: cfg.targetUnit,
          plannedQuantity: cfg.targetQuantity,
          actualQuantity: cfg.completedQuantity,
          pickupLocation: cfg.origin,
          deliveryLocation: cfg.destination,
        }
      });
    }

    // 2. Create or update OperationalWorkOrder
    const existingWo = await prisma.operationalWorkOrder.findFirst({
      where: {
        OR: [
          dispatchId ? { dispatchOrderId: dispatchId } : null,
          transportId ? { transportOrderId: transportId } : null,
        ].filter(Boolean)
      }
    });

    const woData = {
      managementUnitId: cfg.managementUnitId,
      type: cfg.type,
      unit: cfg.unit,
      category: cfg.category,
      sourceType: 'MANUAL',
      assignmentMode: 'FIXED_ASSIGNMENT',
      status: cfg.workStatus,
      plannedStartAt: cfg.plannedStartAt,
      plannedEndAt: cfg.plannedEndAt,
      complexCode: 'KOUN_MOM',
      complexName: 'Khu liên hợp Koun Mom',
      enterpriseCode: 'XN-KM-DP',
      enterpriseName: 'Khu vực Daun Penh (DP)',
      farmCode: 'DP1',
      farmName: 'Xí nghiệp Chuối DP1',
      jobName: cfg.jobName,
      jobDescription: cfg.jobDescription,
      shift: cfg.shift,
      priority: 'NORMAL',
      targetQuantity: cfg.targetQuantity,
      targetUnit: cfg.targetUnit,
      completedQuantity: cfg.completedQuantity,
      notes: cfg.notes,
      dispatchOrderId: dispatchId,
      transportOrderId: transportId,
      createdById: requester.id,
      approvedById: requester.id,
      approvedAt: new Date(),
    };

    let workOrder;
    if (existingWo) {
      workOrder = await prisma.operationalWorkOrder.update({
        where: { id: existingWo.id },
        data: woData,
      });
    } else {
      workOrder = await prisma.operationalWorkOrder.create({
        data: woData,
      });
    }

    // Link back to dispatch order
    if (dispatchId) {
      await prisma.dispatchOrder.update({
        where: { id: dispatchId },
        data: { workOrderId: workOrder.id }
      });
    }

    // 3. Work Vehicle Assignment
    await prisma.workVehicleAssignment.deleteMany({ where: { workOrderId: workOrder.id } });
    await prisma.workVehicleAssignment.create({
      data: {
        workOrderId: workOrder.id,
        vehicleId: cfg.vehicleId,
        status: cfg.workStatus === 'ACCEPTED' ? 'COMPLETED' : 'ACCEPTED',
        startAt: cfg.plannedStartAt,
        endAt: cfg.plannedEndAt,
        assignedById: requester.id,
      }
    });

    // 4. Work Driver Assignment
    await prisma.workDriverAssignment.deleteMany({ where: { workOrderId: workOrder.id } });
    await prisma.workDriverAssignment.create({
      data: {
        workOrderId: workOrder.id,
        driverId: cfg.driverId,
        status: cfg.workStatus === 'ACCEPTED' ? 'COMPLETED' : 'ACCEPTED',
        startAt: cfg.plannedStartAt,
        endAt: cfg.plannedEndAt,
        assignedById: requester.id,
        acceptedAt: cfg.plannedStartAt,
      }
    });

    // 5. Execution Segment (for Completed or Active orders)
    if (cfg.execution) {
      await prisma.workExecutionSegment.deleteMany({ where: { workOrderId: workOrder.id } });
      await prisma.workExecutionSegment.create({
        data: {
          workOrderId: workOrder.id,
          vehicleId: cfg.vehicleId,
          driverId: cfg.driverId,
          startedAt: cfg.execution.startedAt,
          endedAt: cfg.execution.endedAt,
          workDate: cfg.plannedStartAt,
          status: cfg.execution.endedAt ? 'ENDED' : 'ACTIVE',
          grossMinutes: cfg.execution.workingMinutes + cfg.execution.breakMinutes,
          breakMinutes: cfg.execution.breakMinutes,
          workingMinutes: cfg.execution.workingMinutes,
          startOdoKm: cfg.execution.startOdoKm,
          endOdoKm: cfg.execution.endOdoKm,
          startMachineHours: cfg.execution.startMachineHours,
          endMachineHours: cfg.execution.endMachineHours,
          quantity: cfg.execution.quantity,
          notes: cfg.notes,
        }
      });
    }

    // 6. Daily Report (if applicable)
    if (cfg.dailyReport && dispatchId) {
      await prisma.dailyReport.deleteMany({ where: { dispatchOrderId: dispatchId } });
      await prisma.dailyReport.create({
        data: {
          dispatchOrderId: dispatchId,
          workOrderId: workOrder.id,
          originalDriverId: cfg.driverId,
          reportDate: cfg.dailyReport.reportDate,
          status: cfg.dailyReport.status,
          quantityToday: cfg.dailyReport.quantityToday,
          unit: cfg.dailyReport.unit,
          startMachineHours: cfg.dailyReport.startMachineHours,
          endMachineHours: cfg.dailyReport.endMachineHours,
          startOdoKm: cfg.dailyReport.startOdoKm,
          endOdoKm: cfg.dailyReport.endOdoKm,
          fuelLiters: cfg.dailyReport.fuelLiters,
        }
      });
    }

    // 7. WorkOrderEvent history
    await prisma.workOrderEvent.create({
      data: {
        workOrderId: workOrder.id,
        actorId: requester.id,
        action: 'CREATE_AND_ISSUE_ORDER',
        newStatus: cfg.workStatus,
        payload: {
          code: cfg.code,
          vehicleId: cfg.vehicleId,
          driverId: cfg.driverId,
          status: cfg.workStatus,
        }
      }
    });

    console.log(`✅ [${cfg.code}] -> WO #${workOrder.id} (${cfg.workStatus}) | Driver: ${cfg.driverId} | Vehicle: ${cfg.vehicleId}`);
  }

  // Update vehicle current status
  if (v1) {
    await prisma.vehicle.update({
      where: { id: v1.id },
      data: {
        status: 'HOAT_DONG',
        odoKm: 1264,
        totalMachineHours: 329.8,
        currentLocationName: 'Lô Chuối B07-B08, Xí nghiệp Chuối DP1',
      }
    });
  }

  console.log('\n🎉 Finished seeding weekly dispatch orders successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding weekly dispatch orders:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
