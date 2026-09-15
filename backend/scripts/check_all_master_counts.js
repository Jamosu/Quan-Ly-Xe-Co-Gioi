const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- KIỂM TRA SỐ LƯỢNG BẢN GHI THEO TYPE TRONG BẢNG CATALOGS ---');
  const counts = await prisma.catalogItem.groupBy({
    by: ['type'],
    _count: true,
    orderBy: { type: 'asc' },
  });
  console.table(counts.map(c => ({ 'Loại danh mục (CatalogType)': c.type, 'Số lượng trong MySQL': c._count })));

  const companyCount = await prisma.companyEntity.count();
  console.log('Tổng số Công ty (companies table):', companyCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
