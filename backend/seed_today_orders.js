const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding today (2026-09-08) real construction and transport records in DB...');

  const requester = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }) || await prisma.user.findFirst();

  // 1. Check Construction Machines
  const m1 = await prisma.vehicle.findFirst({ where: { code: 'CHT-MĐA-001' } });
  const m2 = await prisma.vehicle.findFirst({ where: { code: 'CHT-MUI-005' } });
  const m3 = await prisma.vehicle.findFirst({ where: { code: 'CHT-BAN-004' } });
  const m4 = await prisma.vehicle.findFirst({ where: { code: 'CHT-XLU-001' } });

  const d1 = await prisma.user.findFirst({ where: { role: 'DRIVER', fullName: { contains: 'Minh' } } });
  const d2 = await prisma.user.findFirst({ where: { role: 'DRIVER', fullName: { contains: 'Huy' } } });
  const d3 = await prisma.user.findFirst({ where: { role: 'DRIVER', fullName: { contains: 'Đức' } } });
  const d4 = await prisma.user.findFirst({ where: { role: 'DRIVER', fullName: { contains: 'An' } } });

  const constructionOrders = [
    {
      code: 'LC-20260908-001',
      purpose: 'San gạt, bù vê nền đường giao thông nội bộ Lô B04-B08',
      unit: 'NT1',
      status: 'WORKING',
      sourceType: 'MANUAL',
      origin: 'Bãi máy Trung tâm Snoul',
      destination: 'Tuyến đường liên lô B04-B08',
      vehicleId: m3?.id,
      driverId: d3?.id,
      requesterId: requester.id,
      departureTime: new Date('2026-09-08T00:00:00.000Z'), // 07:00 ICT
      plannedEndTime: new Date('2026-09-08T08:00:00.000Z'), // 15:00 ICT
      notes: 'Bù vê mép đường chống ngập úng trước mùa mưa.',
    },
    {
      code: 'LC-20260908-002',
      purpose: 'San ủi mặt bằng khu sản xuất chuối mở rộng Lô E1-E4',
      unit: 'NT1',
      status: 'WORKING',
      sourceType: 'MANUAL',
      origin: 'Bãi máy Koun Mom',
      destination: 'Lô mở rộng E1-E4',
      vehicleId: m2?.id,
      driverId: d2?.id,
      requesterId: requester.id,
      departureTime: new Date('2026-09-08T00:30:00.000Z'), // 07:30 ICT
      plannedEndTime: new Date('2026-09-08T09:30:00.000Z'), // 16:30 ICT
      notes: 'Đẩy ủi lớp đất mặt và san phẳng mặt bằng theo thiết kế.',
    },
    {
      code: 'LC-20260908-003',
      purpose: 'Đào đắp mương tiêu thoát nước chống ngập úng Lô D02-D06',
      unit: 'NT1',
      status: 'ASSIGNED',
      sourceType: 'MANUAL',
      origin: 'Bãi máy Nông trường 1',
      destination: 'Tuyến mương Lô D02-D06',
      vehicleId: m1?.id,
      driverId: d1?.id,
      requesterId: requester.id,
      departureTime: new Date('2026-09-08T01:00:00.000Z'), // 08:00 ICT
      plannedEndTime: new Date('2026-09-08T09:00:00.000Z'), // 16:00 ICT
      notes: 'Đào vét sạch bùn rác, khơi thông dòng chảy thoát nước kịp thời.',
    },
    {
      code: 'LC-20260908-004',
      purpose: 'Lu rung đầm lèn mặt đường công vụ Nông trường Chuối',
      unit: 'BAN_CO_GIOI',
      status: 'COMPLETED',
      sourceType: 'MANUAL',
      origin: 'Bãi máy Ban Cơ giới',
      destination: 'Tuyến đường trục Km 0 - Km 3',
      vehicleId: m4?.id,
      driverId: d4?.id,
      requesterId: requester.id,
      departureTime: new Date('2026-09-07T23:30:00.000Z'), // 06:30 ICT
      plannedEndTime: new Date('2026-09-08T07:30:00.000Z'), // 14:30 ICT
      notes: 'Đạt độ chặt K95 nghiệm thu theo biên bản.',
    },
  ];

  for (const co of constructionOrders) {
    await prisma.dispatchOrder.upsert({
      where: { code: co.code },
      update: co,
      create: co,
    });
    console.log(`Upserted construction dispatch order: ${co.code}`);
  }

  // 2. Transport Orders
  const t1 = await prisma.vehicle.findFirst({ where: { category: 'XE_TAI' } });
  const t2 = await prisma.vehicle.findFirst({ where: { category: 'XE_BEN' } });
  const t3 = await prisma.vehicle.findFirst({ where: { category: 'XE_BON' } }) || t1;

  const td1 = await prisma.user.findFirst({ where: { role: 'DRIVER', fullName: { contains: 'Nam' } } }) || d1;
  const td2 = await prisma.user.findFirst({ where: { role: 'DRIVER', fullName: { contains: 'Hải' } } }) || d2;
  const td3 = await prisma.user.findFirst({ where: { role: 'DRIVER', fullName: { contains: 'Thành' } } }) || d4;

  const transportOrders = [
    {
      code: 'LVC-20260908-001',
      routeType: 'ONE_WAY',
      flowType: 'STANDARD',
      unit: 'BAN_CO_GIOI',
      status: 'IN_TRANSIT',
      requestDate: new Date('2026-09-08T00:00:00.000Z'),
      executionDate: new Date('2026-09-08T00:00:00.000Z'),
      departureTime: new Date('2026-09-08T07:00:00.000Z'), // 14:00 ICT
      plannedEndTime: new Date('2026-09-08T10:00:00.000Z'),
      vehicleId: t1?.id,
      driverId: td1?.id,
      origin: 'Lô C02-C05 Nông trường 2',
      destination: 'Xưởng đóng gói Chuối NT2',
      cargoType: 'Chuối tươi thu hoạch chuyển xưởng đóng gói',
      tonnage: 16,
      distanceKm: 25,
      plannedFuelLiters: 12,
      palletCount: 16,
      notes: '16 Pallet chuối tươi chuyển gấp về packhouse.',
    },
    {
      code: 'LVC-20260908-002',
      routeType: 'ONE_WAY',
      flowType: 'STANDARD',
      unit: 'BAN_CO_GIOI',
      status: 'ASSIGNED',
      requestDate: new Date('2026-09-08T00:00:00.000Z'),
      executionDate: new Date('2026-09-08T00:00:00.000Z'),
      departureTime: new Date('2026-09-08T08:30:00.000Z'), // 15:30 ICT
      plannedEndTime: new Date('2026-09-08T11:30:00.000Z'),
      vehicleId: t2?.id,
      driverId: td2?.id,
      origin: 'Kho Vật tư Trung tâm Snoul',
      destination: 'Kho trung chuyển Nông trường 1',
      cargoType: 'Phân bón NPK 16-16-8 THACO',
      tonnage: 20,
      distanceKm: 35,
      plannedFuelLiters: 15,
      palletCount: 20,
      notes: 'Bốc hàng tại kho phân trung tâm, giao chòi tập kết NT1.',
    },
    {
      code: 'LVC-20260908-003',
      routeType: 'ONE_WAY',
      flowType: 'STANDARD',
      unit: 'BAN_CO_GIOI',
      status: 'DRAFT',
      requestDate: new Date('2026-09-08T00:00:00.000Z'),
      executionDate: new Date('2026-09-08T00:00:00.000Z'),
      departureTime: new Date('2026-09-08T06:00:00.000Z'), // 13:00 ICT
      plannedEndTime: new Date('2026-09-08T09:00:00.000Z'),
      vehicleId: t3?.id,
      driverId: td3?.id,
      origin: 'Kho Xăng dầu Trung tâm Nam Lào',
      destination: 'Tuyến mương Lô C05-C08',
      cargoType: 'Dầu Diezel cấp lưu động 3.000 Lít',
      tonnage: 3,
      distanceKm: 28,
      plannedFuelLiters: 10,
      palletCount: 0,
      notes: 'Tiếp dầu diezel lưu động cho các máy xúc ca chiều.',
    },
  ];

  for (const to of transportOrders) {
    const existing = await prisma.transportOrder.findUnique({ where: { code: to.code } });
    if (!existing) {
      const created = await prisma.transportOrder.create({ data: to });
      await prisma.transportItem.create({
        data: {
          transportOrderId: created.id,
          cargoName: to.cargoType,
          unitOfMeasure: to.palletCount > 0 ? 'Pallet' : 'Lít',
          plannedQuantity: to.palletCount > 0 ? to.palletCount : 3000,
          actualQuantity: to.palletCount > 0 ? to.palletCount : 3000,
          pickupLocation: to.origin,
          deliveryLocation: to.destination,
        }
      });
      console.log(`Created transport order: ${to.code}`);
    } else {
      await prisma.transportOrder.update({
        where: { code: to.code },
        data: to,
      });
      console.log(`Updated transport order: ${to.code}`);
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
