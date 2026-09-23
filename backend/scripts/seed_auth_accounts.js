const { PrismaClient, Role, Unit, DriverEmploymentStatus, DriverShiftStatus, DriverLicenseClass } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Bắt đầu khởi tạo & cập nhật 5 tài khoản mẫu theo 3 vai trò chính...');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('123456', salt);

  // 1. TÀI KHOẢN ADMIN: Quản trị viên hệ thống (Toàn bộ các KLH)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      fullName: 'Quản Trị Viên Hệ Thống',
      passwordHash,
      role: Role.SUPER_ADMIN,
      unit: Unit.TOAN_KLH,
      isActive: true,
    },
    create: {
      code: 'CB-KLH-001',
      username: 'admin',
      passwordHash,
      fullName: 'Quản Trị Viên Hệ Thống',
      phone: '0901234567',
      role: Role.SUPER_ADMIN,
      unit: Unit.TOAN_KLH,
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-01-01'),
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });
  console.log('✅ Đã tạo/cập nhật tài khoản Admin:', admin.username);

  // 2. TÀI KHOẢN NHÂN SỰ QUẢN LÝ: Lê Văn Hùng (Quản lý KLH Koun Mom)
  const managerKounMom = await prisma.user.upsert({
    where: { username: 'quanly.kounmom' },
    update: {
      fullName: 'Lê Văn Hùng',
      passwordHash,
      role: Role.FARM_MANAGER,
      unit: Unit.KOUN_MOM,
      isActive: true,
    },
    create: {
      code: 'CB-QL-KM01',
      username: 'quanly.kounmom',
      passwordHash,
      fullName: 'Lê Văn Hùng',
      phone: '0912334455',
      role: Role.FARM_MANAGER,
      unit: Unit.KOUN_MOM,
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-03-10'),
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });
  console.log('✅ Đã tạo/cập nhật tài khoản Quản lý KLH Koun Mom:', managerKounMom.username);

  // 3. TÀI XẾ 1: Trần Đình Trọng (KLH Koun Mom - TX-NT1-001)
  const txKounMom = await prisma.user.upsert({
    where: { username: 'tx.kounmom' },
    update: {
      fullName: 'Trần Đình Trọng',
      passwordHash,
      role: Role.DRIVER,
      unit: Unit.KOUN_MOM,
      isActive: true,
      licenseClass: DriverLicenseClass.HANG_B2,
      licenseNumber: 'B2-2023-88991',
    },
    create: {
      code: 'ACC-TX-KM01',
      username: 'tx.kounmom',
      passwordHash,
      fullName: 'Trần Đình Trọng',
      phone: '0988123456',
      role: Role.DRIVER,
      unit: Unit.KOUN_MOM,
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2021-03-10'),
      licenseClass: DriverLicenseClass.HANG_B2,
      licenseNumber: 'B2-2023-88991',
      licenseExpiryDate: new Date('2028-12-20'),
      healthCheckExpiryDate: new Date('2026-11-15'),
      currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH,
      currentLocation: 'Lô A03 - Nông Trường 1 (KLH Koun Mom)',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    },
  });
  console.log('✅ Đã tạo/cập nhật tài khoản Tài xế KLH Koun Mom:', txKounMom.username);

  // 4. TÀI XẾ 2: Phan Văn Đức (KLH Snoul - TX-SN-001)
  const txSnoul = await prisma.user.upsert({
    where: { username: 'tx.snoul' },
    update: {
      fullName: 'Phan Văn Đức',
      passwordHash,
      role: Role.DRIVER,
      unit: Unit.KOUN_MOM,
      isActive: true,
      licenseClass: DriverLicenseClass.HANG_CE,
      licenseNumber: 'CE-SN-2024-01',
    },
    create: {
      code: 'ACC-TX-SN01',
      username: 'tx.snoul',
      passwordHash,
      fullName: 'Phan Văn Đức',
      phone: '0912334999',
      role: Role.DRIVER,
      unit: Unit.KOUN_MOM,
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2020-02-01'),
      licenseClass: DriverLicenseClass.HANG_CE,
      licenseNumber: 'CE-SN-2024-01',
      licenseExpiryDate: new Date('2027-09-05'),
      healthCheckExpiryDate: new Date('2026-12-01'),
      currentShiftStatus: DriverShiftStatus.SAN_SANG,
      currentLocation: 'Đội Xe Container (KLH Snoul)',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    },
  });
  console.log('✅ Đã tạo/cập nhật tài khoản Tài xế KLH Snoul:', txSnoul.username);

  // 5. TÀI XẾ 3: Khamphou Somlith (KLH Nam Lào - TX-NL-001)
  const txNamLao = await prisma.user.upsert({
    where: { username: 'tx.namlao' },
    update: {
      fullName: 'Khamphou Somlith',
      passwordHash,
      role: Role.DRIVER,
      unit: Unit.KOUN_MOM,
      isActive: true,
      licenseClass: DriverLicenseClass.HANG_CE,
      licenseNumber: 'CE-NL-2023-88',
    },
    create: {
      code: 'ACC-TX-NL01',
      username: 'tx.namlao',
      passwordHash,
      fullName: 'Khamphou Somlith',
      phone: '0977889922',
      role: Role.DRIVER,
      unit: Unit.KOUN_MOM,
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      joinedDate: new Date('2021-06-15'),
      licenseClass: DriverLicenseClass.HANG_CE,
      licenseNumber: 'CE-NL-2023-88',
      licenseExpiryDate: new Date('2028-10-10'),
      healthCheckExpiryDate: new Date('2026-08-30'),
      currentShiftStatus: DriverShiftStatus.SAN_SANG,
      currentLocation: 'Đội Vận Tải Nông Sản (KLH Nam Lào)',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });
  console.log('✅ Đã tạo/cập nhật tài khoản Tài xế KLH Nam Lào:', txNamLao.username);

  // Đồng thời cập nhật mật khẩu cho các tài khoản tài xế có sẵn nếu đăng nhập bằng mã cũ
  await prisma.user.updateMany({
    where: {
      username: {
        in: ['driver.trong', 'km_tx_001', 'sn_tx_001', 'nl_tx_001'],
      },
    },
    data: {
      passwordHash,
      isActive: true,
    },
  });
  console.log('✅ Đã đồng bộ mật khẩu 123456 cho các tài khoản tài xế có sẵn trong DB.');

  console.log('🎉 Hoàn tất khởi tạo 5 tài khoản mẫu thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed tài khoản:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
