import { PrismaClient, Role, Unit, WorkOrderCategory } from '@prisma/client';
import { AvailabilityService } from '../src/availability/availability.service';
import { WorkOrdersService } from '../src/work-orders/work-orders.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BẮT ĐẦU KIỂM TRA KHẢ NĂNG VẬN HÀNH THỰC TẾ CỦA CÁC ĐỘI TRƯỞNG ===\n');

  const availabilityService = new AvailabilityService(prisma as any);
  const workOrdersService = new WorkOrdersService(prisma as any, availabilityService);

  // Lấy actor admin để kiểm tra context
  const admin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, isActive: true },
  });
  if (!admin) throw new Error('Không tìm thấy SUPER_ADMIN.');

  const actor = {
    id: admin.id,
    role: Role.SUPER_ADMIN,
    unit: Unit.TOAN_KLH,
    username: admin.username,
  };

  const sampleTeamCodes = [
    'CG-KM-BAN-CG-CK-SXCN',
    'CG-KM-XN-CHUOI-DP2',
    'CG-KM-CGLD-DP',
    'CG-KM-CGTC-DP',
    'CG-KM-XN-CHUOI-DP1',
    'CG-KM-XN-BO-AD',
    'CG-KM-BAN-DIEN-NUOC',
    'CG-KM-PHONG-GNVC',
    'TO-SN-01',
    'TO-NL-01',
  ];

  const now = new Date();
  const startAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const endAt = new Date(now.getTime() + 5 * 60 * 60 * 1000); // +5 hours

  const categories = [
    { cat: WorkOrderCategory.AGRICULTURE, name: 'Nông nghiệp' },
    { cat: WorkOrderCategory.CONSTRUCTION, name: 'Công trình' },
    { cat: WorkOrderCategory.TRANSPORT, name: 'Vận chuyển' },
  ];

  console.log('| KLH | Mã Đội | Tên Đội | Loại Lệnh | Xe khả dụng / Tổng | Nông cụ khả dụng / Tổng | Tài xế khả dụng / Tổng | Lỗi chặn? |');
  console.log('|---|---|---|---|---|---|---|---|');

  let allSuccess = true;

  for (const code of sampleTeamCodes) {
    const team = await prisma.driverManagementUnit.findFirst({
      where: { code },
      include: {
        parent: true,
        managerAssignments: { where: { effectiveTo: null }, include: { manager: true } },
      },
    });
    if (!team) {
      console.warn(`Không tìm thấy đội ${code}`);
      continue;
    }

    for (const { cat, name } of categories) {
      try {
        const ctx = await workOrdersService.preparationContext(
          {
            managementUnitId: team.id,
            category: cat,
            startAt,
            endAt,
            complexCode: team.complexCode,
            unit: team.complexCode as Unit,
          },
          actor,
        );

        const vSelectable = ctx.vehicles.filter((v: any) => v.selection.selectable).length;
        const vTotal = ctx.vehicles.length;

        const iSelectable = ctx.implements.filter((i: any) => i.selection.selectable).length;
        const iTotal = ctx.implements.length;

        const dSelectable = ctx.drivers.filter((d: any) => d.selection.selectable).length;
        const dTotal = ctx.drivers.length;

        // Check if there is any blocker for drivers
        const blockedDriverReasons = ctx.drivers
          .filter((d: any) => !d.selection.selectable)
          .map((d: any) => d.selection.reasons.map((r: any) => r.code).join(','))
          .filter(Boolean);

        const hasBlocker = vSelectable === 0 || dSelectable === 0 || (cat === WorkOrderCategory.AGRICULTURE && iSelectable === 0);
        const statusStr = hasBlocker ? '❌ THIẾU TÀI NGUYÊN' : '✅ VẬN HÀNH TỐT';

        if (hasBlocker) allSuccess = false;

        const iCol = cat === WorkOrderCategory.AGRICULTURE ? `${iSelectable}/${iTotal}` : 'N/A';

        console.log(
          `| ${team.complexCode} | ${team.code} | ${team.name} | ${name} | ${vSelectable}/${vTotal} | ${iCol} | ${dSelectable}/${dTotal} | ${statusStr} |`,
        );
      } catch (err: any) {
        allSuccess = false;
        console.error(`| ${team.complexCode} | ${team.code} | ${team.name} | ${name} | ERROR | ERROR | ERROR | ❌ ${err.message} |`);
      }
    }
  }

  console.log(`\n=== TỔNG KẾT KIỂM TRA: ${allSuccess ? 'TẤT CẢ ĐỘI VẬN HÀNH THỰC TẾ 100% THÀNH CÔNG' : 'CÒN LỖI CHẶN'} ===`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
