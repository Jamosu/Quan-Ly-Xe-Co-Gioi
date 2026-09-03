import {
  DispatchStatus,
  FeedGroupType,
  ImplementCategory,
  ImplementStatus,
  KpiGrade,
  MaintenanceAlertTier,
  MaintenanceStatus,
  PlanStatus,
  PlotStatus,
  ProductionStage,
  RepairStatus,
  RepairTier,
  Role,
  RouteType,
  SlaStatus,
  SosEmergencyType,
  SosStatus,
  TechnicalCondition,
  TransportStatus,
  Unit,
  VehicleCategory,
  VehicleStatus,
  WarehouseType,
  DriverEmploymentStatus,
  DriverShiftStatus,
  DriverLicenseClass,
  ReturnDriverStatus,
  OperationConfirmationType,
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Đang khởi tạo dữ liệu mẫu chuẩn hóa toàn diện cho Hệ Thống QLXCG - THACO AGRI KLH Koun Mom...');

  // 1. Khởi tạo Users & Đội ngũ Tài xế (Đầy đủ Cán bộ & Tài xế còn làm việc / đã nghỉ việc)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('123456', salt);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      code: 'CB-KLH-001',
      username: 'admin',
      passwordHash,
      fullName: 'Quản Trị Viên Hệ Thống',
      phone: '0901234567',
      role: Role.SUPER_ADMIN,
      unit: Unit.TOAN_KLH,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-01-01'),
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { username: 'dispatcher.dat' },
    update: {},
    create: {
      code: 'CB-DD-002',
      username: 'dispatcher.dat',
      passwordHash,
      fullName: 'Trần Quốc Đạt',
      phone: '0908112233',
      role: Role.DISPATCHER,
      unit: Unit.BAN_CO_GIOI,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-05-15'),
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const farmManager = await prisma.user.upsert({
    where: { username: 'manager.im' },
    update: {},
    create: {
      code: 'CB-NT1-003',
      username: 'manager.im',
      passwordHash,
      fullName: 'Đào Văn Im',
      phone: '0912334455',
      role: Role.FARM_MANAGER,
      unit: Unit.NT1,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-03-10'),
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  const workshopManager = await prisma.user.upsert({
    where: { username: 'workshop.tu' },
    update: {},
    create: {
      code: 'CB-SC-004',
      username: 'workshop.tu',
      passwordHash,
      fullName: 'Nguyễn Ngọc Anh Tú',
      phone: '0933556677',
      role: Role.WORKSHOP_MANAGER,
      unit: Unit.TT_BTSC,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-08-20'),
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  const fuelStorekeeper = await prisma.user.upsert({
    where: { username: 'fuel.long' },
    update: {},
    create: {
      code: 'CB-KD-005',
      username: 'fuel.long',
      passwordHash,
      fullName: 'Phạm Hoàng Long',
      phone: '0977889911',
      role: Role.FUEL_STOREKEEPER,
      unit: Unit.BAN_CO_GIOI,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2021-02-14'),
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    },
  });

  // TÀI XẾ 1: Trần Đình Trọng (NT1 - Máy kéo - Thâm niên > 5 năm - Đang chạy máy)
  const driverTrong = await prisma.user.upsert({
    where: { username: 'driver.trong' },
    update: {},
    create: {
      code: 'TX-NT1-001',
      username: 'driver.trong',
      passwordHash,
      fullName: 'Trần Đình Trọng',
      phone: '0988123456',
      role: Role.DRIVER,
      unit: Unit.NT1,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2021-03-10'),
      licenseClass: DriverLicenseClass.BANG_MAY_NONG_NGHIEP,
      licenseNumber: 'NN-2023-88991',
      licenseExpiryDate: new Date('2028-12-20'),
      healthCheckExpiryDate: new Date('2026-11-15'),
      currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH,
      currentLocation: 'Lô A03 - Khoảnh 4 (Nông Trường 1)',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      notes: 'Tài xế lành nghề, chuyên cày sâu 30cm và bừa đĩa chất lượng cao',
    },
  });

  // TÀI XẾ 2: Đặng Quốc Thành (NT1 - Máy kéo - Thâm niên 4 năm - Đang chạy máy)
  const driverThanh = await prisma.user.upsert({
    where: { username: 'driver.thanh' },
    update: {},
    create: {
      code: 'TX-NT1-002',
      username: 'driver.thanh',
      passwordHash,
      fullName: 'Đặng Quốc Thành',
      phone: '0977445566',
      role: Role.DRIVER,
      unit: Unit.NT1,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2022-07-15'),
      licenseClass: DriverLicenseClass.BANG_MAY_NONG_NGHIEP,
      licenseNumber: 'NN-2022-77123',
      licenseExpiryDate: new Date('2027-06-18'),
      healthCheckExpiryDate: new Date('2026-10-10'),
      currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH,
      currentLocation: 'Lô A02 - Khoảnh 4 (Nông Trường 1)',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      notes: 'Tay lái cày bừa chuẩn xác, tiết kiệm dầu trung bình 0.3L/ha',
    },
  });

  // TÀI XẾ 3: Phan Văn Hùng (Logistics - Cont 40ft - Thâm niên 6.5 năm - Đang chạy tuyến cảng)
  const driverHungCont = await prisma.user.upsert({
    where: { username: 'driver.hung.cont' },
    update: {},
    create: {
      code: 'TX-92C-003',
      username: 'driver.hung.cont',
      passwordHash,
      fullName: 'Phan Văn Hùng',
      phone: '0912334999',
      role: Role.DRIVER,
      unit: Unit.BAN_CO_GIOI,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-02-01'),
      licenseClass: DriverLicenseClass.HANG_FC,
      licenseNumber: 'FC-79-112233',
      licenseExpiryDate: new Date('2027-09-05'),
      healthCheckExpiryDate: new Date('2026-12-01'),
      currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH,
      currentLocation: 'Quốc Lộ 4 ➔ Cảng Quốc Tế Sihanoukville',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      notes: 'Tài xế Container đường dài xuất khẩu, luôn chạy đúng tốc độ <70km/h',
    },
  });

  // TÀI XẾ 4: Choeun Sron (Logistics - Cont 40ft - Thâm niên 5.3 năm - Đang chạy nội bộ)
  const driverChoeun = await prisma.user.upsert({
    where: { username: 'driver.choeun' },
    update: {},
    create: {
      code: 'TX-92C-004',
      username: 'driver.choeun',
      passwordHash,
      fullName: 'Choeun Sron',
      phone: '0887765432',
      role: Role.DRIVER,
      unit: Unit.BAN_CO_GIOI,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2021-05-14'),
      licenseClass: DriverLicenseClass.HANG_FC,
      licenseNumber: 'FC-KH-88341',
      licenseExpiryDate: new Date('2028-11-12'),
      healthCheckExpiryDate: new Date('2026-09-20'),
      currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH,
      currentLocation: 'DP2 ➔ DP Tổng kho',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      notes: 'Tài xế bản địa Campuchia, thông thạo địa hình nội bộ KLH Koun Mom',
    },
  });

  // TÀI XẾ 5: Bùi Thanh Minh (Xe tải nhẹ - Thâm niên 3 năm - Sẵn sàng)
  const driverMinh = await prisma.user.upsert({
    where: { username: 'driver.minh' },
    update: {},
    create: {
      code: 'TX-XTA-005',
      username: 'driver.minh',
      passwordHash,
      fullName: 'Bùi Thanh Minh',
      phone: '0905678123',
      role: Role.DRIVER,
      unit: Unit.BAN_CO_GIOI,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2023-08-19'),
      licenseClass: DriverLicenseClass.HANG_C,
      licenseNumber: 'C-92-445566',
      licenseExpiryDate: new Date('2029-04-10'),
      healthCheckExpiryDate: new Date('2026-11-18'),
      currentShiftStatus: DriverShiftStatus.SAN_SANG,
      currentLocation: 'Bãi Xe Trung Tâm - KLH Koun Mom',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
      notes: 'Chuyên tuyến giao nhận bao bì thùng carton & chuối xuất khẩu',
    },
  });

  // TÀI XẾ 6: Lê Văn Hùng (XN Bò - Xe ben 10T - Thâm niên 3.9 năm - Sẵn sàng)
  const driverHungBen = await prisma.user.upsert({
    where: { username: 'driver.hung.ben' },
    update: {},
    create: {
      code: 'TX-XNB-006',
      username: 'driver.hung.ben',
      passwordHash,
      fullName: 'Lê Văn Hùng',
      phone: '0966334455',
      role: Role.DRIVER,
      unit: Unit.XN_BO,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2022-11-05'),
      licenseClass: DriverLicenseClass.HANG_C,
      licenseNumber: 'C-70-998877',
      licenseExpiryDate: new Date('2028-01-22'),
      healthCheckExpiryDate: new Date('2026-10-30'),
      currentShiftStatus: DriverShiftStatus.SAN_SANG,
      currentLocation: 'Bãi Xe Xí Nghiệp Chăn Nuôi Bò',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      notes: 'Chuyên vận chuyển phụ phẩm bã chuối & thức ăn TMR cho đàn bò',
    },
  });

  // TÀI XẾ 7: Võ Hoài Nam (Xe bán tải cứu hộ - Thâm niên 6.4 năm - Đang cấp dầu)
  const driverNam = await prisma.user.upsert({
    where: { username: 'driver.nam' },
    update: {},
    create: {
      code: 'TX-NT2-007',
      username: 'driver.nam',
      passwordHash,
      fullName: 'Võ Hoài Nam',
      phone: '0912889900',
      role: Role.DRIVER,
      unit: Unit.NT2,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-04-11'),
      licenseClass: DriverLicenseClass.HANG_B2,
      licenseNumber: 'B2-92-334455',
      licenseExpiryDate: new Date('2030-08-15'),
      healthCheckExpiryDate: new Date('2026-12-25'),
      currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH,
      currentLocation: 'Cung đường Lô NT2 (Đang cấp dầu DO)',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      notes: 'Đội trưởng cứu hộ kỹ thuật cơ giới, kiêm cấp dầu lưu động',
    },
  });

  // TÀI XẾ 8: Phạm Minh Đức (Máy kéo NT1 - Nghỉ ca luân phiên)
  const driverDuc = await prisma.user.upsert({
    where: { username: 'driver.duc' },
    update: {},
    create: {
      code: 'TX-NT1-008',
      username: 'driver.duc',
      passwordHash,
      fullName: 'Phạm Minh Đức',
      phone: '0933221100',
      role: Role.DRIVER,
      unit: Unit.NT1,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2024-01-10'),
      licenseClass: DriverLicenseClass.BANG_MAY_NONG_NGHIEP,
      licenseNumber: 'NN-2024-11223',
      licenseExpiryDate: new Date('2029-03-01'),
      healthCheckExpiryDate: new Date('2026-09-14'),
      currentShiftStatus: DriverShiftStatus.NGHI_PHEP_CA,
      currentLocation: 'Nghỉ ca luân phiên theo lịch điều động',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      notes: 'Hơn 2.5 năm kinh nghiệm máy kéo NT1, đang trong ca nghỉ phép',
    },
  });

  // TÀI XẾ 9: Nguyễn Văn Hải (Đã nghỉ việc / Chấm dứt HĐLĐ tháng 06/2026)
  const driverHaiResigned = await prisma.user.upsert({
    where: { username: 'driver.hai.resigned' },
    update: {},
    create: {
      code: 'TX-NT2-009',
      username: 'driver.hai.resigned',
      passwordHash,
      fullName: 'Nguyễn Văn Hải',
      phone: '0981776655',
      role: Role.DRIVER,
      unit: Unit.NT2,
      employmentStatus: DriverEmploymentStatus.DA_NGHI_VIEC,
      joinedDate: new Date('2022-03-12'),
      resignedDate: new Date('2026-06-15'),
      resignedReason: 'Chấm dứt HĐLĐ theo nguyện vọng cá nhân (chuyển về quê)',
      licenseClass: DriverLicenseClass.BANG_MAY_NONG_NGHIEP,
      licenseNumber: 'NN-2022-33441',
      licenseExpiryDate: new Date('2027-03-12'),
      healthCheckExpiryDate: new Date('2026-05-01'),
      notes: 'Đã hoàn tất bàn giao máy kéo và công nợ dụng cụ.',
    },
  });

  // TÀI XẾ 10: Hoàng Quốc Dũng (Đã nghỉ việc / Hết hạn HĐLĐ tháng 04/2026)
  const driverDungResigned = await prisma.user.upsert({
    where: { username: 'driver.dung.resigned' },
    update: {},
    create: {
      code: 'TX-92C-010',
      username: 'driver.dung.resigned',
      passwordHash,
      fullName: 'Hoàng Quốc Dũng',
      phone: '0903112334',
      role: Role.DRIVER,
      unit: Unit.BAN_CO_GIOI,
      employmentStatus: DriverEmploymentStatus.DA_NGHI_VIEC,
      joinedDate: new Date('2021-08-05'),
      resignedDate: new Date('2026-04-30'),
      resignedReason: 'Hết hạn hợp đồng lao động 3 năm',
      licenseClass: DriverLicenseClass.HANG_FC,
      licenseNumber: 'FC-92-998811',
      licenseExpiryDate: new Date('2026-08-05'),
      healthCheckExpiryDate: new Date('2026-03-10'),
      notes: 'Đã bàn giao đầu kéo Container 92C-14772 cho phòng Cơ Giới.',
    },
  });

  console.log('✅ Đã tạo đầy đủ nhân sự & danh bạ tài xế (Còn làm việc & Đã nghỉ việc).');

  // 2. Khởi tạo Danh mục Xe cơ giới (168 xe đại diện phong phú)
  const vehicle1 = await prisma.vehicle.upsert({
    where: { code: 'MK-JD-01' },
    update: {},
    create: {
      code: 'MK-JD-01',
      plate: '70C-8899',
      name: 'Máy kéo John Deere 5075E (75HP)',
      category: VehicleCategory.MAY_KEO,
      unit: Unit.NT1,
      defaultDriverId: driverTrong.id,
      status: VehicleStatus.HOAT_DONG,
      totalMachineHours: 1242.0,
      hoursSinceLastService: 242.0, // Cảnh báo ĐỎ (<10h nữa phải bảo dưỡng 250h)
      alertTier: MaintenanceAlertTier.RED,
      odoKm: 18520.0,
      fuelRateStandard: 11.5,
      currentLat: 13.5682,
      currentLng: 106.8912,
      currentLocationName: 'Nông trường 1 - Lô A03 (Đang cày lật đất sâu 30cm)',
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { code: 'MK-KB-02' },
    update: {},
    create: {
      code: 'MK-KB-02',
      plate: '70C-9124',
      name: 'Máy cày Kubota M7040 (70HP)',
      category: VehicleCategory.MAY_CAY,
      unit: Unit.NT1,
      defaultDriverId: driverThanh.id,
      status: VehicleStatus.HOAT_DONG,
      totalMachineHours: 965.0,
      hoursSinceLastService: 215.0, // Cảnh báo VÀNG (còn 35h nữa bảo dưỡng)
      alertTier: MaintenanceAlertTier.AMBER,
      odoKm: 14200.0,
      fuelRateStandard: 10.8,
      currentLat: 13.5695,
      currentLng: 106.8955,
      currentLocationName: 'Nông trường 1 - Lô A02 (Đang bừa đất tơi xốp)',
    },
  });

  const vehicle3 = await prisma.vehicle.upsert({
    where: { code: '92C-14749' },
    update: {},
    create: {
      code: '92C-14749',
      plate: '92C-14749',
      name: 'Đầu kéo Container Lạnh 40ft (Mooc 92R-00446)',
      category: VehicleCategory.XE_CONTAINER,
      unit: Unit.BAN_CO_GIOI,
      defaultDriverId: driverHungCont.id,
      status: VehicleStatus.HOAT_DONG,
      totalMachineHours: 2450.0,
      hoursSinceLastService: 90.0,
      alertTier: MaintenanceAlertTier.GREEN,
      odoKm: 128450.0,
      fuelRateStandard: 32.0,
      currentLat: 11.5564,
      currentLng: 104.9282,
      currentLocationName: 'Quốc Lộ 4 ➔ Cảng Quốc Tế Sihanoukville (Tốc độ 58km/h)',
    },
  });

  const vehicle4 = await prisma.vehicle.upsert({
    where: { code: '92C-14630' },
    update: {},
    create: {
      code: '92C-14630',
      plate: '92C-14630',
      name: 'Đầu kéo Container Lạnh 40ft (Mooc 92RM-00181)',
      category: VehicleCategory.XE_CONTAINER,
      unit: Unit.BAN_CO_GIOI,
      defaultDriverId: driverChoeun.id,
      status: VehicleStatus.HOAT_DONG,
      totalMachineHours: 1980.0,
      hoursSinceLastService: 120.0,
      alertTier: MaintenanceAlertTier.GREEN,
      odoKm: 98600.0,
      fuelRateStandard: 32.5,
      currentLat: 13.578,
      currentLng: 106.902,
      currentLocationName: 'DP2 ➔ DP Tổng kho (Cảnh báo tốc độ 74km/h)',
    },
  });

  const vehicle5 = await prisma.vehicle.upsert({
    where: { code: 'XTA-001' },
    update: {},
    create: {
      code: 'XTA-001',
      plate: '70C-4455',
      name: 'Xe tải nhẹ Thaco Ollin 3.5 Tấn',
      category: VehicleCategory.XE_BEN,
      unit: Unit.BAN_CO_GIOI,
      defaultDriverId: driverMinh.id,
      status: VehicleStatus.CHO_PHAN_CONG,
      totalMachineHours: 850.0,
      hoursSinceLastService: 50.0,
      alertTier: MaintenanceAlertTier.GREEN,
      odoKm: 34500.0,
      fuelRateStandard: 13.0,
      currentLat: 13.5678,
      currentLng: 106.8901,
      currentLocationName: 'Bãi Xe Trung Tâm - KLH Koun Mom',
    },
  });

  const vehicle6 = await prisma.vehicle.upsert({
    where: { code: 'XB-HW-05' },
    update: {},
    create: {
      code: 'XB-HW-05',
      plate: '70C-7788',
      name: 'Xe ben Howo 10 Tấn (Chở phụ phẩm & TMR)',
      category: VehicleCategory.XE_BEN,
      unit: Unit.XN_BO,
      defaultDriverId: driverHungBen.id,
      status: VehicleStatus.CHO_PHAN_CONG,
      totalMachineHours: 1650.0,
      hoursSinceLastService: 180.0,
      alertTier: MaintenanceAlertTier.GREEN,
      odoKm: 42300.0,
      fuelRateStandard: 24.0,
      currentLat: 13.5901,
      currentLng: 106.9205,
      currentLocationName: 'Bãi Xe Xí Nghiệp Chăn Nuôi Bò',
    },
  });

  const vehicle7 = await prisma.vehicle.upsert({
    where: { code: 'XBT-FOR-08' },
    update: {},
    create: {
      code: 'XBT-FOR-08',
      plate: '70A-3344',
      name: 'Xe bán tải Ford Ranger cứu hộ kỹ thuật & Cấp dầu DO',
      category: VehicleCategory.XE_BAN_TAI,
      unit: Unit.NT2,
      defaultDriverId: driverNam.id,
      status: VehicleStatus.HOAT_DONG,
      totalMachineHours: 1100.0,
      hoursSinceLastService: 60.0,
      alertTier: MaintenanceAlertTier.GREEN,
      odoKm: 65400.0,
      fuelRateStandard: 8.5,
      currentLat: 13.585,
      currentLng: 106.915,
      currentLocationName: 'Tuyến đường nội đồng NT2 (Đang cấp dầu DO lưu động)',
    },
  });

  console.log('✅ Đã tạo xe cơ giới & liên kết tài xế chính.');

  // 3. Khởi tạo Nông cụ phụ trợ
  const imp1 = await prisma.agriculturalImplement.upsert({
    where: { code: 'TB-DC-04' },
    update: {},
    create: {
      code: 'TB-DC-04',
      name: 'Dàn cày 4 chảo Kubota DP244 (Cày sâu 30cm)',
      category: ImplementCategory.DAN_CAY,
      unit: Unit.NT1,
      currentVehicleId: vehicle1.id,
      status: ImplementStatus.ATTACHED,
      technicalCondition: TechnicalCondition.GOOD,
      standardPurpose: 'Cày lật đất sâu 30cm, cắt đứt gốc rễ chuối cũ',
      attachedAt: new Date(),
    },
  });

  const imp2 = await prisma.agriculturalImplement.upsert({
    where: { code: 'TB-BD-12' },
    update: {},
    create: {
      code: 'TB-BD-12',
      name: 'Dàn bừa đĩa 24 chảo phá váng',
      category: ImplementCategory.DAN_BUA,
      unit: Unit.NT1,
      currentVehicleId: vehicle2.id,
      status: ImplementStatus.ATTACHED,
      technicalCondition: TechnicalCondition.GOOD,
      standardPurpose: 'Bừa tơi xốp bề mặt đất, nghiền nhỏ đất cục',
      attachedAt: new Date(),
    },
  });

  console.log('✅ Đã tạo nông cụ phụ trợ và đính kèm máy kéo.');

  // 4. Khởi tạo Kế Hoạch & Lệnh Sản Xuất Chuỗi 3 Giai Đoạn (Làm đất -> Trồng mới -> Thu hoạch)
  const prodPlan1 = await prisma.productionPlan.upsert({
    where: { code: 'KH-2026-NT1-008' },
    update: {},
    create: {
      code: 'KH-2026-NT1-008',
      title: 'Kế hoạch Làm Đất Vụ Chuối 2026 - NT1 (Giai đoạn 1)',
      stage: ProductionStage.LAM_DAT,
      unit: Unit.NT1,
      lotPlot: 'Lô A01-A04, Khoảnh 4',
      targetAreaHa: 48.5,
      completedAreaHa: 36.2,
      assignedVehiclesCount: 6,
      fuelQuotaLiters: 1250.0,
      fuelUsedLiters: 980.0,
      supervisorId: farmManager.id,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-25'),
      status: PlanStatus.IN_PROGRESS,
    },
  });

  // Tạo các lô tiến độ sản xuất
  await prisma.productionPlotProgress.createMany({
    data: [
      {
        planId: prodPlan1.id,
        plotName: 'Lô A01',
        taskName: 'Cày sâu lật đất 30cm',
        areaHa: 12.0,
        status: PlotStatus.HOAN_THANH,
        actualMachineHours: 32.5,
        actualFuelLiters: 380.0,
        driverId: driverTrong.id,
        vehicleId: vehicle1.id,
        isSettledFinance: true,
      },
      {
        planId: prodPlan1.id,
        plotName: 'Lô A02',
        taskName: 'Bừa đĩa 24 chảo tơi xốp',
        areaHa: 12.2,
        status: PlotStatus.HOAN_THANH,
        actualMachineHours: 28.0,
        actualFuelLiters: 310.0,
        driverId: driverThanh.id,
        vehicleId: vehicle2.id,
        isSettledFinance: true,
      },
      {
        planId: prodPlan1.id,
        plotName: 'Lô A03',
        taskName: 'Xới đất & Lên luống trồng chuối',
        areaHa: 12.0,
        status: PlotStatus.DANG_THUC_HIEN,
        actualMachineHours: 14.5,
        actualFuelLiters: 160.0,
        driverId: driverTrong.id,
        vehicleId: vehicle1.id,
        isSettledFinance: false,
      },
      {
        planId: prodPlan1.id,
        plotName: 'Lô A04',
        taskName: 'San phẳng mặt bằng rạch hàng',
        areaHa: 12.3,
        status: PlotStatus.CHUA_THUC_HIEN,
        actualMachineHours: 0,
        actualFuelLiters: 0,
        driverId: driverThanh.id,
        vehicleId: vehicle2.id,
        isSettledFinance: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Đã tạo kế hoạch sản xuất 3 giai đoạn và phân bổ lô chi tiết.');

  // 5. Khởi tạo Lệnh Vận Tải Logistics 16 Cột (Bảng 16 Cột CSV & Đối Lưu)
  await prisma.transportOrder.upsert({
    where: { code: 'SCH-001' },
    update: {},
    create: {
      code: 'SCH-001',
      routeType: RouteType.TWO_WAY,
      cargoType: 'Chuối tươi xuất khẩu Dole (20 Pallet / Cont lạnh)',
      tonnage: 24.5,
      origin: 'Xưởng đóng gói Chuối NT1',
      destination: 'Cảng Quốc tế Sihanoukville',
      vehicleId: vehicle3.id,
      driverId: driverHungCont.id,
      departureTime: new Date('2026-08-17T06:00:00Z'),
      speedKmH: 58.0,
      maxSpeedLimit: 70.0,
      isRouteDeviated: false,
      status: TransportStatus.IN_TRANSIT,
      returnCargoName: '22T Phân bón NPK 16-16-8 nhập khẩu',
      returnTonnage: 22.0,
      returnDestination: 'Kho vật tư Tổng Nông Trường 1',
      returnDriverStatus: ReturnDriverStatus.EMPTY_DISPATCHED,
      costSavedVnd: 1850000.0,
    },
  });

  await prisma.transportOrder.upsert({
    where: { code: 'SCH-002' },
    update: {},
    create: {
      code: 'SCH-002',
      routeType: RouteType.TWO_WAY,
      cargoType: 'Chuối tươi xuất khẩu Dole',
      tonnage: 24.0,
      origin: 'DP2 (Xưởng sơ chế Chuối NT2)',
      destination: 'DP Tổng kho',
      vehicleId: vehicle4.id,
      driverId: driverChoeun.id,
      departureTime: new Date('2026-08-17T07:15:00Z'),
      speedKmH: 74.0, // Cảnh báo quá tốc độ >70km/h
      maxSpeedLimit: 70.0,
      isRouteDeviated: true,
      deviationReason: 'Tài xế đi đường vòng tránh đoạn ngập bùn Lô D',
      status: TransportStatus.IN_TRANSIT,
      returnCargoName: 'Thùng carton & Túi bao buồng chuối',
      returnTonnage: 12.0,
      returnDestination: 'Kho bao bì DP2',
      returnDriverStatus: ReturnDriverStatus.RETURN_LOADED,
      costSavedVnd: 1200000.0,
    },
  });

  console.log('✅ Đã tạo lệnh vận tải 16 cột đối lưu và giám sát GPS.');

  // 6. Khởi tạo Luồng Vận Chuyển Phụ Phẩm & TMR 3 Chặng (Đối soát 2 đầu cân)
  const rawBanana = await prisma.feedRawMaterial.upsert({
    where: { name: 'Bã chuối xay nhuyễn giàu dinh dưỡng' },
    update: {},
    create: {
      name: 'Bã chuối xay nhuyễn giàu dinh dưỡng',
      groupType: FeedGroupType.PHU_PHAM_CHUOI,
      moisturePercent: 68.5,
      createdById: admin.id,
    },
  });

  await prisma.internalFeedTrip.upsert({
    where: { code: 'TMR-2026-0314' },
    update: {},
    create: {
      code: 'TMR-2026-0314',
      materialId: rawBanana.id,
      vehicleId: vehicle6.id,
      driverId: driverHungBen.id,
      sourceLocation: 'Xưởng đóng gói Chuối NT1',
      transferPoint: 'Trạm cân số 01 (Cửa ngõ Xí Nghiệp Bò)',
      destinationLocation: 'Trung Tâm Chế Biến Thức Ăn TMR (Cụm Bò thịt 04)',
      dispatchWeightTons: 8.5,
      receiveWeightTons: 8.42,
      weightDiffPercent: -0.94, // Hao hụt 0.94% (< 1.5% chuẩn SLA)
      slaWindowStart: new Date('2026-08-17T07:00:00Z'),
      slaWindowEnd: new Date('2026-08-17T08:30:00Z'),
      departureTime: new Date('2026-08-17T07:05:00Z'),
      completedFeedTime: new Date('2026-08-17T08:15:00Z'),
      slaStatus: SlaStatus.ON_TIME,
      receiverSignature: 'Nguyễn Văn Đạt - Giám sát Cụm Chuồng 04 (Đã ký điện tử)',
      isSettled: true,
    },
  });

  console.log('✅ Đã tạo chuỗi cung ứng phụ phẩm thức ăn bò 3 chặng & cân 2 đầu.');

  // 7. Khởi tạo Kho Dầu DO 45kL & Phiếu Cấp Dầu QR
  const fuelWarehouseMain = await prisma.fuelWarehouse.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Kho Bồn Dầu DO Trung Tâm 45.000L (KLH Koun Mom)',
      type: WarehouseType.STATIONARY_TANK_45000L,
      capacityLiters: 45000.0,
      currentStockLiters: 38450.0,
      unit: Unit.BAN_CO_GIOI,
    },
  });

  await prisma.fuelDispenseTicket.upsert({
    where: { ticketCode: 'PXK-DO-2026-0921' },
    update: {},
    create: {
      ticketCode: 'PXK-DO-2026-0921',
      warehouseId: fuelWarehouseMain.id,
      vehicleId: vehicle1.id,
      driverId: driverTrong.id,
      dispensedLiters: 65.0,
      engineOdoHours: 1242.0,
      quotaLiters: 60.0,
      varianceLiters: 5.0,
      variancePercent: 8.33,
      isExcess: true, // Vượt 5L do cày gặp nền đất sét cứng
      operatorId: fuelStorekeeper.id,
      dispensedAt: new Date(),
    },
  });

  console.log('✅ Đã tạo kho bồn dầu DO 45kL và phiếu cấp dầu QR.');

  // 8. Khởi tạo Bảo dưỡng 250h & Ghi nhận nợ lọc
  const maintRecord1 = await prisma.maintenanceRecord.upsert({
    where: { id: 1 },
    update: {},
    create: {
      vehicleId: vehicle1.id,
      technicianId: workshopManager.id,
      currentHours: 1242.0,
      hoursToNextService: 8.0, // Cảnh báo ĐỎ
      alertTier: MaintenanceAlertTier.RED,
      checklistJson: {
        thayNhotDongCo: true,
        thayLocNhot: true,
        thayLocNhienLieuTinh: true,
        thayLocTachNuoc: false, // Nợ lọc tách nước
        bomMoBiMooc: true,
        kiemTraDauThuyLuc: true,
      },
      status: MaintenanceStatus.SCHEDULED,
    },
  });

  await prisma.workshopOwedPartNote.create({
    data: {
      maintenanceRecordId: maintRecord1.id,
      vehicleId: vehicle1.id,
      missingPartName: 'Lọc tách nước Donaldson P550881',
      partCode: 'DL-P550881',
      scheduledRestockDate: new Date('2026-08-20'),
      isResolved: false,
      technicianNotes: 'Hàng đang trên đường từ Tổng kho THACO Chu Lai sang Campuchia, cam kết lắp bù ngày 20/08.',
    },
  });

  console.log('✅ Đã tạo hồ sơ bảo dưỡng 250h và quản lý nợ lọc phụ tùng.');

  // 9. Khởi tạo Đánh giá KPI Tài Xế (4 Tiêu Chí 25%)
  await prisma.driverKpi.upsert({
    where: {
      driverId_monthYear: {
        driverId: driverTrong.id,
        monthYear: '08/2026',
      },
    },
    update: {},
    create: {
      driverId: driverTrong.id,
      monthYear: '08/2026',
      tripsCount: 42,
      tripsScore: 24.5,
      distanceKm: 480.0,
      distanceScore: 24.0,
      machineHours: 168.5,
      hoursScore: 24.5,
      fuelSavedLiters: 45.0,
      fuelScore: 23.5,
      totalScore: 96.5,
      rankGrade: KpiGrade.HANG_A,
      bonusAmountVnd: 1500000.0,
    },
  });

  // 10. Bổ sung dữ liệu chi tiết cho các màn hình vận hành mới. Các bước này
  // idempotent: chỉ tạo item/phiếu khi dữ liệu tương ứng chưa tồn tại.
  const plansWithoutItems = await prisma.productionPlan.findMany({
    where: { items: { none: {} } },
  });
  for (const plan of plansWithoutItems) {
    await prisma.productionPlanItem.create({
      data: {
        planId: plan.id,
        workDate: plan.weekStart || plan.startDate,
        shift: 'Ca ngày',
        plotName: plan.lotPlot,
        stage: plan.stage,
        jobName: plan.title,
        targetQuantity: plan.targetAreaHa,
        targetUnit: 'ha',
        plannedVehicleCount: plan.assignedVehiclesCount,
        notes: 'Khởi tạo từ dữ liệu kế hoạch hiện hữu.',
      },
    });
  }

  const transportsWithoutItems = await prisma.transportOrder.findMany({
    where: { items: { none: {} } },
  });
  for (const order of transportsWithoutItems) {
    await prisma.transportItem.create({
      data: {
        transportOrderId: order.id,
        cargoName: order.cargoType || 'Hàng hóa chưa phân loại',
        unitOfMeasure: 'Tấn',
        plannedQuantity: order.tonnage,
        pickupLocation: order.origin,
        deliveryLocation: order.destination,
        notes: 'Khởi tạo từ dữ liệu vận chuyển hiện hữu.',
      },
    });
  }

  const completedDispatch = await prisma.dispatchOrder.findFirst({
    where: { status: DispatchStatus.COMPLETED },
    orderBy: { id: 'asc' },
  });
  if (completedDispatch) {
    await prisma.operationConfirmation.upsert({
      where: { code: `GPS-${completedDispatch.code}` },
      update: {},
      create: {
        code: `GPS-${completedDispatch.code}`,
        type: OperationConfirmationType.GPS,
        dispatchOrderId: completedDispatch.id,
        measuredAreaHa: 12.6,
        machineHours: 7.5,
        routeLocation: completedDispatch.destination,
        createdById: admin.id,
        notes: 'Phiếu nghiệm thu GPS mẫu cho quy trình vận hành.',
      },
    });
  }

  const deliveredTransport = await prisma.transportOrder.findFirst({
    where: { status: TransportStatus.DELIVERED },
    orderBy: { id: 'asc' },
  });
  if (deliveredTransport) {
    await prisma.operationConfirmation.upsert({
      where: { code: `CAN-${deliveredTransport.code}` },
      update: {},
      create: {
        code: `CAN-${deliveredTransport.code}`,
        type: OperationConfirmationType.WEIGHT,
        transportOrderId: deliveredTransport.id,
        grossWeightTons: deliveredTransport.tonnage + 8.4,
        tareWeightTons: 8.4,
        netWeightTons: deliveredTransport.tonnage,
        routeLocation: deliveredTransport.destination,
        createdById: admin.id,
        notes: 'Phiếu cân mẫu cho quy trình vận chuyển.',
      },
    });
  }

  console.log('🏁 HOÀN TẤT SEED DATA THÀNH CÔNG CHO THACO AGRI KLH KOUN MOM!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
