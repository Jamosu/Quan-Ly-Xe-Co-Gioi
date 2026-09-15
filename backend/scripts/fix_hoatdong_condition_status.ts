import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Chuẩn hóa trạng thái kỹ thuật (conditionStatus) cho các xe đang hoạt động (HOAT_DONG) ===');

  const beforeMismatched = await prisma.vehicle.findMany({
    where: {
      status: 'HOAT_DONG',
      conditionStatus: { in: ['Hư hỏng / Đang sửa chữa', 'Hư hỏng / Chờ sửa'] },
    },
    select: { id: true, code: true, name: true, status: true, conditionStatus: true },
  });

  console.log(`Tìm thấy ${beforeMismatched.length} xe có status: HOAT_DONG nhưng conditionStatus mang chuỗi hư hỏng:`);
  console.table(beforeMismatched);

  // Cập nhật các xe này về 'Bình thường' theo đúng chuẩn Excel gốc
  const updateResult = await prisma.vehicle.updateMany({
    where: {
      status: 'HOAT_DONG',
      OR: [
        { conditionStatus: 'Hư hỏng / Đang sửa chữa' },
        { conditionStatus: 'Hư hỏng / Chờ sửa' },
        { conditionStatus: null },
      ],
    },
    data: {
      conditionStatus: 'Bình thường',
    },
  });

  console.log(`Đã cập nhật thành công ${updateResult.count} xe về conditionStatus: "Bình thường"`);

  // Kiểm tra lại phân bố theo status và conditionStatus
  const groups = await prisma.vehicle.groupBy({
    by: ['status', 'conditionStatus'],
    _count: { id: true },
  });
  console.log('Kết quả sau cập nhật:');
  console.table(groups.map((g) => ({ status: g.status, conditionStatus: g.conditionStatus, count: g._count.id })));
}

main()
  .catch((e) => {
    console.error('Lỗi thực thi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
