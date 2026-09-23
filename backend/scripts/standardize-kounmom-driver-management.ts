import { PrismaClient, DriverManagementLevel, DriverManagementUnitStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Data from sheet 'NS QUẢN LÝ CG' of '00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx'
const TEAMS_SPEC = [
  { teamCode: 'CG-KM-XN-CHUOI-DP1', ownerCode: 'XN-KM-DP', name: 'XN Chuối DP1', managerName: 'Thái Cao Lưu', managerPhone: '0387783316', depotName: 'Lô 21 DP1' },
  { teamCode: 'CG-KM-XN-CHUOI-DP2', ownerCode: 'XN-KM-DP', name: 'XN Chuối DP2', managerName: 'Huỳnh Quang Viên', managerPhone: '0977623379', depotName: 'Lô 15.6 DP2' },
  { teamCode: 'CG-KM-XN-CHUOI-DP3', ownerCode: 'XN-KM-DP', name: 'XN Chuối DP3', managerName: 'Thạch Ngọc Vững', managerPhone: '0975905267', depotName: 'Lô 28 DP3' },
  { teamCode: 'CG-KM-XN-CHUOI-DP4', ownerCode: 'XN-KM-DP', name: 'XN Chuối DP4', managerName: null, managerPhone: null, depotName: null },
  { teamCode: 'CG-KM-XN-CHUOI-LP1', ownerCode: 'XN-KM-LP', name: 'XN Chuối LP1', managerName: 'Nguyễn Ngọc Nhân', managerPhone: '0979578112', depotName: 'Lô 7 LP1' },
  { teamCode: 'CG-KM-XN-CHUOI-LP2', ownerCode: 'XN-KM-LP', name: 'XN Chuối LP2', managerName: null, managerPhone: null, depotName: null },
  { teamCode: 'CG-KM-XN-CHUOI-LP3', ownerCode: 'XN-KM-LP', name: 'XN Chuối LP3', managerName: 'Lê Cao Nghị', managerPhone: '0977423100', depotName: 'Lô 2 LP3' },
  { teamCode: 'CG-KM-XN-BO-AD', ownerCode: 'XN-KM-AD', name: 'XN Bò AD', managerName: 'Trần Văn Nam', managerPhone: '0971993540', depotName: 'Lô 28 XN Bò' },
  { teamCode: 'CG-KM-CGLD-XN-BO', ownerCode: 'XN-KM-AD', name: 'CGLĐ XN Bò', managerName: 'T.Q.Đ Ngọc Hải', managerPhone: '0344302386', depotName: 'Lô 28, 65 XN Bò' },
  { teamCode: 'CG-KM-CGLD-DP', ownerCode: 'XN-KM-DP', name: 'CGLĐ DP', managerName: 'Nguyễn Tấn Triều', managerPhone: '05974160290', depotName: 'Lô 85 DP4' },
  { teamCode: 'CG-KM-CGLD-LP', ownerCode: 'XN-KM-LP', name: 'CGLĐ LP', managerName: 'Nguyễn Tấn Triều', managerPhone: '05974160290', depotName: 'LP3.5-LP3' },
  { teamCode: 'CG-KM-CGTC-DP', ownerCode: 'XN-KM-DP', name: 'CGTC DP', managerName: 'Phạm Ngọc Hải', managerPhone: '0825456565', depotName: 'Lô 85 DP4' },
  { teamCode: 'CG-KM-CGTC-LP', ownerCode: 'XN-KM-LP', name: 'CGTC LP', managerName: 'Đỗ Đức Nghĩa', managerPhone: '0971462780', depotName: 'NOCN L.4-LP3' },
  { teamCode: 'CG-KM-CGTC-AD', ownerCode: 'XN-KM-AD', name: 'CGTC AD', managerName: 'Vũ Trung Kiên', managerPhone: '0981761677', depotName: 'Lô 73 ADM' },
  { teamCode: 'CG-KM-TRAM-TRON-BE-TONG', ownerCode: 'XN-KM-DP', name: 'Trạm trộn bê tông', managerName: 'Phạm Nhật Thịnh', managerPhone: '0935178908', depotName: 'Trạm trộn DP' },
  { teamCode: 'CG-KM-HANH-CHINH-KLH', ownerCode: 'XN-KM-KLH', name: 'Hành chính KLH', managerName: 'Lê Trần Hoàng Minh', managerPhone: '0965509539', depotName: 'Văn Phòng 94' },
  { teamCode: 'CG-KM-XOAI-AD', ownerCode: 'XN-KM-AD', name: 'Xoài AD', managerName: 'Huỳnh Đông Giang', managerPhone: '0972283372', depotName: 'Lô 132 XN AD' },
  { teamCode: 'CG-KM-XOAI-DP', ownerCode: 'XN-KM-DP', name: 'Xoài DP', managerName: 'Hà Văn Nghĩa', managerPhone: '0813564564', depotName: 'Lô 136 XN Xoài' },
  { teamCode: 'CG-KM-BUOI-AD', ownerCode: 'XN-KM-AD', name: 'Bưởi AD', managerName: 'Huỳnh Đông Giang', managerPhone: '0972283372', depotName: 'Lô 132 XN AD' },
  { teamCode: 'CG-KM-BAN-DIEN-NUOC', ownerCode: 'XN-KM-KLH', name: 'Ban điện nước', managerName: 'Trần Đình Phúc', managerPhone: '0924518278', depotName: 'Kho điện nước' },
  { teamCode: 'CG-KM-XUONG-CO-KHI-DP', ownerCode: 'XN-KM-DP', name: 'Xưởng Cơ khí DP', managerName: null, managerPhone: null, depotName: null },
  { teamCode: 'CG-KM-PHONG-GNVC', ownerCode: 'XN-KM-KLH', name: 'Phòng GNVC', managerName: 'Lâm Quốc Cường', managerPhone: '0384653979', depotName: 'Tổng kho KLH' },
  { teamCode: 'CG-KM-THADICONS-A-I', ownerCode: 'XN-KM-KLH', name: 'Thadicons A&I', managerName: null, managerPhone: null, depotName: null },
  { teamCode: 'CG-KM-THAGRICONS', ownerCode: 'XN-KM-KLH', name: 'Thagricons', managerName: null, managerPhone: null, depotName: null },
  { teamCode: 'CG-KM-TONG-KHO', ownerCode: 'XN-KM-KLH', name: 'Tổng kho', managerName: 'Võ Thanh Hiếu', managerPhone: '0884281479', depotName: 'Tổng kho KLH' },
  { teamCode: 'CG-KM-NM-NHUA-XOP-DP', ownerCode: 'XN-KM-DP', name: 'NM NHỰA -XỐP DP', managerName: 'Nguyễn Xuân Liêm', managerPhone: '0762578457', depotName: 'NM Nhựa' },
  { teamCode: 'CG-KM-BAN-CG-CK-SXCN', ownerCode: 'XN-KM-KLH', name: 'BAN CG-CK & SXCN', managerName: null, managerPhone: null, depotName: null },
];

async function main() {
  console.log('=== 1. Chuẩn hóa Đơn vị quản lý cấp OWNER tại KOUN MOM ===');
  const ownerCodes = ['XN-KM-DP', 'XN-KM-LP', 'XN-KM-AD', 'XN-KM-KLH'];
  const owners = await prisma.driverManagementUnit.findMany({
    where: { complexCode: 'KOUN_MOM', code: { in: ownerCodes } },
  });

  const ownerMap = new Map(owners.map((o) => [o.code, o]));

  for (const code of ownerCodes) {
    const o = ownerMap.get(code);
    if (o) {
      // Clear any wrongly assigned manager or depot
      await prisma.driverManagementUnit.update({
        where: { id: o.id },
        data: {
          mainDepotId: null,
          managerName: null,
          managerPhone: null,
          status: DriverManagementUnitStatus.ACTIVE,
        },
      });
      // Delete any manager assignments on owner unit
      await prisma.managementUnitManagerAssignment.deleteMany({
        where: { managementUnitId: o.id },
      });
      console.log(`  Cleaned OWNER [${o.code}] ${o.name}: depot=null, manager=null, assignments cleared`);
    } else {
      console.warn(`  Warning: OWNER ${code} not found!`);
    }
  }

  console.log('\n=== 2. Xóa các Dummy Manager Assignments (Nguyễn Văn A..F) ===');
  const dummyAssigns = await prisma.managementUnitManagerAssignment.findMany({
    where: {
      manager: {
        fullName: { in: ['Nguyễn Văn A', 'Nguyễn Văn B', 'Nguyễn Văn C', 'Nguyễn Văn D', 'Nguyễn Văn E', 'Nguyễn Văn F'] },
      },
    },
    include: { managementUnit: true, manager: true },
  });
  console.log(`  Found ${dummyAssigns.length} dummy assignments to remove.`);
  for (const da of dummyAssigns) {
    await prisma.managementUnitManagerAssignment.delete({ where: { id: da.id } });
    console.log(`  Deleted dummy assignment #${da.id} for [${da.managementUnit.code}] (${da.manager.fullName})`);
  }

  console.log('\n=== 3. Đồng bộ 27 Đội cơ giới theo đúng sheet NS QUẢN LÝ CG ===');
  const locations = await prisma.operationalLocation.findMany({
    where: { complexCode: 'KOUN_MOM' },
  });

  const findDepot = (name: string | null) => {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    return locations.find((l) => l.name.trim().toLowerCase() === clean);
  };

  for (const item of TEAMS_SPEC) {
    const parent = ownerMap.get(item.ownerCode);
    if (!parent) {
      console.warn(`  Missing parent ${item.ownerCode} for team ${item.teamCode}`);
      continue;
    }

    const depot = findDepot(item.depotName);

    const team = await prisma.driverManagementUnit.findFirst({
      where: { complexCode: 'KOUN_MOM', code: item.teamCode },
    });

    if (team) {
      await prisma.driverManagementUnit.update({
        where: { id: team.id },
        data: {
          parentId: parent.id,
          managerName: item.managerName,
          managerPhone: item.managerPhone,
          mainDepotId: depot?.id || null,
          status: DriverManagementUnitStatus.ACTIVE,
        },
      });
      console.log(
        `  Updated Team [${item.teamCode}] ${item.name} -> Parent: ${parent.name} | Mgr: ${item.managerName || '—'} | SĐT: ${item.managerPhone || '—'} | Bãi: ${depot?.name || item.depotName || '—'}`
      );
    } else {
      const created = await prisma.driverManagementUnit.create({
        data: {
          complexCode: 'KOUN_MOM',
          code: item.teamCode,
          name: item.name,
          level: DriverManagementLevel.TEAM,
          unitType: 'DOI',
          parentId: parent.id,
          managerName: item.managerName,
          managerPhone: item.managerPhone,
          mainDepotId: depot?.id || null,
          status: DriverManagementUnitStatus.ACTIVE,
        },
      });
      console.log(`  Created Team [${item.teamCode}] ${item.name} (id: ${created.id})`);
    }
  }

  console.log('\n=== HOÀN TẤT CHUẨN HÓA DỮ LIỆU KOUN MOM ===');
}

main()
  .catch((err) => {
    console.error('Error standardizing driver management:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
