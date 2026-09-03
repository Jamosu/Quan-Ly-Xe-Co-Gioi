const { PrismaClient, Role, DriverEmploymentStatus, DriverShiftStatus, DriverLicenseClass, VehicleStatus, DispatchStatus, RepairTier, RepairStatus, KpiGrade } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('=== BẮT ĐẦU TẠO DỮ LIỆU TEST ĐA KHU LIÊN HỢP (KOUN MOM, SNOUL, NAM LÀO) ===');

  const passwordHash = await bcrypt.hash('123456', 10);

  // Lấy admin user làm requester / operator
  const adminUser = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } }) || await prisma.user.findFirst();

  // Lấy fuel warehouse mặc định
  let fuelWarehouse = await prisma.fuelWarehouse.findFirst();
  if (!fuelWarehouse) {
    fuelWarehouse = await prisma.fuelWarehouse.create({
      data: {
        code: 'KHO_DO_TT',
        name: 'Kho Xăng Dầu Trung Tâm THACO AGRI',
        location: 'Khu trung tâm kỹ thuật',
        currentStockLiters: 150000,
        maxCapacityLiters: 250000,
        type: 'MAIN_DEPOT',
        unit: 'BAN_CO_GIOI',
      },
    });
  }

  // 1. Lấy danh sách xe thực tế từ database theo từng KLH
  const kmVehicles = await prisma.vehicle.findMany({ where: { complexCode: 'KOUN_MOM' }, take: 40 });
  const snVehicles = await prisma.vehicle.findMany({ where: { complexCode: 'SNOUL' }, take: 40 });
  const nlVehicles = await prisma.vehicle.findMany({ where: { complexCode: 'NAM_LAO' }, take: 40 });

  console.log(`Đã lấy xe thực tế: ${kmVehicles.length} xe Koun Mom, ${snVehicles.length} xe Snoul, ${nlVehicles.length} xe Nam Lào.`);

  const complexesData = [
    {
      code: 'KOUN_MOM',
      name: 'Khu liên hợp Koun Mom',
      prefix: 'KM',
      enterprises: ['Xí nghiệp Chuối Lumphat 1', 'Xí nghiệp Chuối Daun Penh', 'Xí nghiệp Chăn nuôi Bò Koun Mom', 'Xưởng BTSC Cơ giới Koun Mom'],
      farms: ['Nông trường Chuối 1', 'Nông trường Chuối 2', 'Nông trường Chuối Daun Penh 3', 'Khu chuồng trại Bò Lumphat'],
      teams: ['Đội Cơ giới Làm đất 02', 'Đội Xe ben 10T', 'Đội Xe Container', 'Đội Vận chuyển thức ăn TMR', 'Đội Vận tải Nội bộ'],
      drivers: [
        { name: 'Nguyễn Văn Hùng', code: 'KM-TX-001', pos: 'Lái xe đầu kéo Container', lic: DriverLicenseClass.HANG_FC },
        { name: 'Trần Đình Trọng', code: 'KM-TX-002', pos: 'Thợ vận hành máy cày Kubota', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Lê Hoàng Long', code: 'KM-TX-003', pos: 'Tài xế xe ben 10T chở chuối', lic: DriverLicenseClass.HANG_C },
        { name: 'Phạm Minh Tuấn', code: 'KM-TX-004', pos: 'Thợ vận hành máy kéo John Deere', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Vũ Quốc Huy', code: 'KM-TX-005', pos: 'Lái xe bồn tưới nước tự động', lic: DriverLicenseClass.HANG_C },
        { name: 'Sokha Rith', code: 'KM-TX-006', pos: 'Thợ máy đào xới đất', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Chanthy Vanna', code: 'KM-TX-007', pos: 'Lái xe tải nhẹ phân phối vật tư', lic: DriverLicenseClass.HANG_C },
        { name: 'Bùi Thanh Sang', code: 'KM-TX-008', pos: 'Tài xế xe cẩu tự hành', lic: DriverLicenseClass.HANG_C },
        { name: 'Đỗ Hữu Nghĩa', code: 'KM-TX-009', pos: 'Thợ vận hành máy phun thuốc', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Hoàng Văn Thắng', code: 'KM-TX-010', pos: 'Lái xe bán tải công vụ nông trường', lic: DriverLicenseClass.HANG_B2 },
        { name: 'Keo Sovann', code: 'KM-TX-011', pos: 'Tài xế xe cấp dầu lưu động', lic: DriverLicenseClass.HANG_C },
        { name: 'Đinh Công Toàn', code: 'KM-TX-012', pos: 'Lái xe container lạnh xuất khẩu', lic: DriverLicenseClass.HANG_FC },
      ],
      vehicles: kmVehicles,
    },
    {
      code: 'SNOUL',
      name: 'Khu liên hợp Snoul',
      prefix: 'SN',
      enterprises: ['Xí nghiệp Cao su Snoul', 'Xí nghiệp Bò thịt Snoul 1', 'Xí nghiệp Trồng cỏ & Thức ăn TMR', 'Xưởng BTSC Snoul'],
      farms: ['Nông trường Cao su 1', 'Nông trường Cao su 2', 'Nông trường Trồng cỏ TMR', 'Khu chuồng trại Bò Vỗ béo'],
      teams: ['Đội Cơ giới Trồng cỏ', 'Đội Xe Container Đường dài', 'Đội Cứu hộ Kỹ thuật', 'Đội Vận chuyển thức ăn TMR', 'Đội Xe ben 10T'],
      drivers: [
        { name: 'Phan Văn Đức', code: 'SN-TX-001', pos: 'Lái xe đầu kéo Container lạnh', lic: DriverLicenseClass.HANG_FC },
        { name: 'Võ Minh Trí', code: 'SN-TX-002', pos: 'Thợ vận hành máy cày Kubota M7040', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Hồ Tấn Tài', code: 'SN-TX-003', pos: 'Tài xế xe bồn chở nước & mật rỉ', lic: DriverLicenseClass.HANG_C },
        { name: 'Ngô Quang Hải', code: 'SN-TX-004', pos: 'Thợ vận hành máy kéo John Deere', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Meas Samnang', code: 'SN-TX-005', pos: 'Lái xe ben Howo 10T chở phân', lic: DriverLicenseClass.HANG_C },
        { name: 'Rithy Panha', code: 'SN-TX-006', pos: 'Thợ vận hành máy băm cỏ TMR', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Đặng Văn Lực', code: 'SN-TX-007', pos: 'Tài xế xe cứu hộ kỹ thuật 24/7', lic: DriverLicenseClass.HANG_C },
        { name: 'Lương Xuân Trường', code: 'SN-TX-008', pos: 'Lái xe tải cẩu phục vụ nông trường', lic: DriverLicenseClass.HANG_C },
        { name: 'Heng Sambath', code: 'SN-TX-009', pos: 'Thợ lái máy san gạt đường lô', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Trương Đình Luật', code: 'SN-TX-010', pos: 'Lái xe bán tải kiểm tra vườn cao su', lic: DriverLicenseClass.HANG_B2 },
        { name: 'Nguyễn Thành Chung', code: 'SN-TX-011', pos: 'Lái xe đầu kéo bồn sữa/thức ăn', lic: DriverLicenseClass.HANG_FC },
        { name: 'Bun Rith', code: 'SN-TX-012', pos: 'Thợ vận hành máy đào mương tiêu', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
      ],
      vehicles: snVehicles,
    },
    {
      code: 'NAM_LAO',
      name: 'Khu liên hợp Nam Lào',
      prefix: 'NL',
      enterprises: ['Xí nghiệp Trồng trọt Nam Lào', 'Xí nghiệp Cơ giới Hóa Nông nghiệp Attapeu', 'Xí nghiệp Bò Thịt Nam Lào', 'Xưởng Cơ khí & BTSC Attapeu'],
      farms: ['Nông trường Nông nghiệp 1 Attapeu', 'Nông trường Trồng ngô & Đậu nành 2', 'Nông trường Cỏ chăn nuôi 3', 'Khu chăn nuôi Bò giống Nam Lào'],
      teams: ['Đội Cơ giới Nông trường 1', 'Đội Vận tải Cơ giới 01', 'Đội Xe ben 10T', 'Đội Xe Công vụ', 'Đội Xe Cẩu & Cứu hộ'],
      drivers: [
        { name: 'Khamphou Somlith', code: 'NL-TX-001', pos: 'Thợ vận hành máy gặt đập liên hợp', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Bounmy Sisavath', code: 'NL-TX-002', pos: 'Thợ vận hành máy cày Kubota', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Nguyễn Văn Quyết', code: 'NL-TX-003', pos: 'Lái xe đầu kéo vận chuyển nông sản', lic: DriverLicenseClass.HANG_FC },
        { name: 'Soukthavy Phone', code: 'NL-TX-004', pos: 'Tài xế xe ben 10T chở nông sản', lic: DriverLicenseClass.HANG_C },
        { name: 'Vongdeuan Khamsing', code: 'NL-TX-005', pos: 'Thợ vận hành máy kéo John Deere 75HP', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Đoàn Văn Hậu', code: 'NL-TX-006', pos: 'Lái xe bồn cấp nước sinh hoạt & trang trại', lic: DriverLicenseClass.HANG_C },
        { name: 'Saysana Bouttavong', code: 'NL-TX-007', pos: 'Thợ vận hành máy gieo hạt tự động', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Thongsavanh Seng', code: 'NL-TX-008', pos: 'Tài xế xe tải chở phân bón NPK', lic: DriverLicenseClass.HANG_C },
        { name: 'Vũ Văn Thanh', code: 'NL-TX-009', pos: 'Lái xe bán tải điều hành sản xuất', lic: DriverLicenseClass.HANG_B2 },
        { name: 'Phommavong Phout', code: 'NL-TX-010', pos: 'Thợ lái máy cày xới đất đa năng', lic: DriverLicenseClass.BANG_MAY_NONG_NGHIEP },
        { name: 'Lê Văn Xuân', code: 'NL-TX-011', pos: 'Tài xế xe cẩu cứu hộ nông trường', lic: DriverLicenseClass.HANG_C },
        { name: 'Sengdeuan Keo', code: 'NL-TX-012', pos: 'Lái xe đầu kéo mooc sàn chở máy', lic: DriverLicenseClass.HANG_FC },
      ],
      vehicles: nlVehicles,
    },
  ];

  let totalDriversCreated = 0;
  let totalDispatchCreated = 0;
  let totalFuelCreated = 0;
  let totalMaintCreated = 0;

  for (const comp of complexesData) {
    console.log(`\n--- XỬ LÝ KHU LIÊN HỢP: ${comp.name} (${comp.code}) ---`);

    for (let i = 0; i < comp.drivers.length; i++) {
      const d = comp.drivers[i];
      const username = d.code.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const enterprise = comp.enterprises[i % comp.enterprises.length];
      const farm = comp.farms[i % comp.farms.length];
      const team = comp.teams[i % comp.teams.length];
      const vehicle = comp.vehicles[i % comp.vehicles.length];

      // Upsert User (Driver)
      const user = await prisma.user.upsert({
        where: { username },
        create: {
          code: d.code,
          username,
          passwordHash,
          fullName: d.name,
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          role: Role.DRIVER,
          unit: 'NT1',
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          currentShiftStatus: i % 4 === 0 ? DriverShiftStatus.DANG_VAN_HANH : DriverShiftStatus.SAN_SANG,
          currentLocation: `${farm} · ${comp.name}`,
          licenseClass: d.lic,
          licenseNumber: `GPLX-${comp.prefix}-${1000 + i}`,
          licenseExpiryDate: new Date(2027, 5, 15),
          healthCheckExpiryDate: new Date(2026, 11, 20),
          joinedDate: new Date(2023, i % 12, (i * 2 + 1) % 28 + 1),
          isActive: true,
        },
        update: {
          fullName: d.name,
          role: Role.DRIVER,
          licenseClass: d.lic,
          licenseNumber: `GPLX-${comp.prefix}-${1000 + i}`,
          licenseExpiryDate: new Date(2027, 5, 15),
          healthCheckExpiryDate: new Date(2026, 11, 20),
        },
      });

      // Upsert EmployeeRecord với complex chính xác
      await prisma.employeeRecord.upsert({
        where: { empCode: d.code },
        create: {
          empCode: d.code,
          fullName: d.name,
          complex: comp.code,
          enterprise,
          farm,
          team,
          position: d.pos,
          businessUnit: `${enterprise} - ${comp.name}`,
          email: `${username}@thacoagri.com.vn`,
          idCardNumber: `079${Math.floor(100000000 + Math.random() * 900000000)}`,
          idCardIssueDate: '2021-05-10',
          idCardIssuePlace: 'Cục CS QLHC về TTXH',
          status: 'Đang làm việc',
          licenseClass: d.lic,
          licenseNumber: `GPLX-${comp.prefix}-${1000 + i}`,
          licenseExpiryDate: '2027-06-15',
          healthCheckExpiryDate: '2026-12-20',
          joinedDate: '2023-01-15',
        },
        update: {
          complex: comp.code,
          enterprise,
          farm,
          team,
          position: d.pos,
          businessUnit: `${enterprise} - ${comp.name}`,
          licenseClass: d.lic,
          licenseNumber: `GPLX-${comp.prefix}-${1000 + i}`,
          licenseExpiryDate: '2027-06-15',
          healthCheckExpiryDate: '2026-12-20',
        },
      });

      // Gán xe chính cho tài xế
      if (vehicle) {
        await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: {
            defaultDriverId: user.id,
            status: i % 5 === 0 ? VehicleStatus.BAO_DUONG : VehicleStatus.HOAT_DONG,
          },
        });
      }

      totalDriversCreated++;

      // Tạo Lệnh điều xe thực tế cho KLH này
      if (i < 6 && vehicle && adminUser) {
        const orderCode = `LC-${comp.prefix}-${2026000 + i}`;
        await prisma.dispatchOrder.upsert({
          where: { code: orderCode },
          create: {
            code: orderCode,
            vehicleId: vehicle.id,
            driverId: user.id,
            requesterId: adminUser.id,
            purpose: i % 2 === 0 ? 'Vận chuyển nông sản thu hoạch và chuối về xưởng' : 'San gạt cày xới đất gieo trồng vụ mới',
            origin: `Kho cơ giới Trung tâm ${comp.name}`,
            destination: `${farm}, Lô A${i + 1}`,
            departureTime: new Date(2026, 2, 1, 6, 30),
            returnTime: new Date(2026, 2, 1, 17, 30),
            status: i % 2 === 0 ? DispatchStatus.WORKING : DispatchStatus.COMPLETED,
            unit: 'NT1',
            notes: `Lệnh điều động vận hành tại ${comp.name}`,
          },
          update: {
            vehicleId: vehicle.id,
            driverId: user.id,
          },
        });
        totalDispatchCreated++;

        // Tạo Phiếu cấp phát nhiên liệu thực tế
        const fuelCode = `PXK-DO-${comp.prefix}-${2026000 + i}`;
        await prisma.fuelDispenseTicket.upsert({
          where: { ticketCode: fuelCode },
          create: {
            ticketCode: fuelCode,
            warehouseId: fuelWarehouse.id,
            vehicleId: vehicle.id,
            driverId: user.id,
            operatorId: adminUser.id,
            dispensedLiters: 80.0 + i * 15,
            engineOdoHours: 1200 + i * 85,
            quotaLiters: 75.0 + i * 15,
            varianceLiters: 5.0,
            variancePercent: 6.2,
            isExcess: false,
            dispensedAt: new Date(2026, 2, 2, 7, 15),
          },
          update: {
            vehicleId: vehicle.id,
            driverId: user.id,
          },
        });
        totalFuelCreated++;

        // Tạo Phiếu sửa chữa thực tế
        const repairCode = `SC-${comp.prefix}-${2026000 + i}`;
        await prisma.repairTicket.upsert({
          where: { code: repairCode },
          create: {
            code: repairCode,
            vehicleId: vehicle.id,
            reportedByDriverId: user.id,
            assignedTechnicianId: adminUser.id,
            repairTier: RepairTier.TIEU_TU,
            issueDescription: `Kiểm tra bảo dưỡng định kỳ hệ thống thủy lực và lọc nhớt tại ${comp.name}`,
            status: i % 2 === 0 ? RepairStatus.IN_REPAIR : RepairStatus.COMPLETED,
            estimatedCostVnd: 3500000 + i * 500000,
            actualCostVnd: 3200000 + i * 500000,
            receivedDate: new Date(2026, 1, 20 + i),
            completedDate: new Date(2026, 1, 22 + i),
          },
          update: {
            vehicleId: vehicle.id,
          },
        });
        totalMaintCreated++;
      }
    }
  }

  // Cập nhật cả 50 tài xế cũ phân bổ đều vào 3 KLH nếu chưa có complex
  const existingDrivers = await prisma.user.findMany({ where: { role: Role.DRIVER } });
  for (let i = 0; i < existingDrivers.length; i++) {
    const drv = existingDrivers[i];
    const targetComp = complexesData[i % 3];
    await prisma.employeeRecord.upsert({
      where: { empCode: drv.code },
      create: {
        empCode: drv.code,
        fullName: drv.fullName,
        complex: targetComp.code,
        enterprise: targetComp.enterprises[i % targetComp.enterprises.length],
        farm: targetComp.farms[i % targetComp.farms.length],
        team: targetComp.teams[i % targetComp.teams.length],
        position: 'Tài xế / Lái máy cơ giới',
        businessUnit: `${targetComp.enterprises[0]} - ${targetComp.name}`,
        status: 'Đang làm việc',
        joinedDate: '2023-01-15',
      },
      update: {
        complex: targetComp.code,
        enterprise: targetComp.enterprises[i % targetComp.enterprises.length],
        farm: targetComp.farms[i % targetComp.farms.length],
        team: targetComp.teams[i % targetComp.teams.length],
      },
    });
  }

  console.log('\n=== KẾT QUẢ ĐỒNG BỘ DỮ LIỆU ĐA KHU LIÊN HỢP ===');
  console.log(`- Tổng hồ sơ Lái xe / Thợ máy đã tạo/cập nhật: ${totalDriversCreated + existingDrivers.length} nhân sự`);
  console.log(`- Tổng Lệnh điều xe thực tế: ${totalDispatchCreated} lệnh`);
  console.log(`- Tổng Phiếu cấp phát nhiên liệu: ${totalFuelCreated} phiếu`);
  console.log(`- Tổng Phiếu sửa chữa / bảo dưỡng: ${totalMaintCreated} phiếu`);
  console.log('=== HOÀN TẤT THÀNH CÔNG ===');
}

main()
  .catch((e) => {
    console.error('Lỗi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
