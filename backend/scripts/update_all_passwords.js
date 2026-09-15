const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang kiểm tra danh sách tài khoản trong database...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  console.log(`Tìm thấy ${users.length} tài khoản người dùng.`);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('123456', salt);

  console.log('Băm mật khẩu 123456 thành công:', passwordHash);
  console.log('🔄 Đang cập nhật mật khẩu 123456 và kích hoạt isActive: true cho toàn bộ người dùng...');

  const result = await prisma.user.updateMany({
    data: {
      passwordHash,
      isActive: true,
    },
  });

  console.log(`✅ Đã cập nhật thành công mật khẩu "123456" cho ${result.count} tài khoản!`);

  // In danh sách các tài khoản để kiểm tra
  const updatedUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('\n📋 Danh sách tài khoản đã cập nhật mật khẩu 123456:');
  console.table(updatedUsers);
}

main()
  .catch((err) => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
