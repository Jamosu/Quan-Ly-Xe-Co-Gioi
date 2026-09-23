const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const enterprises = [
  { id: 'XN_BE06', code: 'BE06', name: 'Xí nghiệp Chuối ERC', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE07', code: 'BE07', name: 'Xí nghiệp Chuối BP1', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE08', code: 'BE08', name: 'Xí nghiệp Chuối BP2', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE09', code: 'BE09', name: 'Xí nghiệp Chuối BP3', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE10', code: 'BE10', name: 'Xí nghiệp chuối BSA1', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE11', code: 'BE11', name: 'Xí nghiệp chuối BSA2', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE13', code: 'BE13', name: 'Xí nghiệp chuối NSA', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE14', code: 'BE14', name: 'Xí nghiệp chuối NK1', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE15', code: 'BE15', name: 'Xí nghiệp Chuối PV', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_G02_BE', code: 'G02.BE', name: 'Ban SX chuối', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_G06_21', code: 'G06.21', name: 'Ban KT trồng trọt chuối', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: '', parentName: '', createdAt: new Date() },
  { id: 'XN_BE01', code: 'BE01', name: 'Xí nghiệp Chuối DP1', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: 'KOUN_MOM', parentName: 'KLH KOUN MOM', createdAt: new Date() },
  { id: 'XN_BE02', code: 'BE02', name: 'Xí nghiệp Chuối DP2', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: 'KOUN_MOM', parentName: 'KLH KOUN MOM', createdAt: new Date() },
  { id: 'XN_BE03', code: 'BE03', name: 'Xí nghiệp Chuối DP3', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: 'KOUN_MOM', parentName: 'KLH KOUN MOM', createdAt: new Date() },
  { id: 'XN_BE04', code: 'BE04', name: 'Xí nghiệp chuối LP1', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: 'KOUN_MOM', parentName: 'KLH KOUN MOM', createdAt: new Date() },
  { id: 'XN_BE05', code: 'BE05', name: 'Xí nghiệp chuối LP3', type: 'ENTERPRISE', status: 'HOAT_DONG', address: '', parentCode: 'KOUN_MOM', parentName: 'KLH KOUN MOM', createdAt: new Date() },
];

async function main() {
  await prisma.catalogItem.deleteMany({ where: { type: 'ENTERPRISE' } });
  
  for (const item of enterprises) {
    await prisma.catalogItem.create({
      data: item
    });
  }
  console.log(`Successfully added ${enterprises.length} enterprises into database.`);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
