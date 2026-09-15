const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang kiểm tra số lượng bản ghi trước khi xóa ---');

  const countBefore = {
    workJourneyLeg: await prisma.workJourneyLeg.count(),
    driverKpiEvent: await prisma.driverKpiEvent.count(),
    workOrderEvent: await prisma.workOrderEvent.count(),
    workAcceptance: await prisma.workAcceptance.count(),
    workEvidence: await prisma.workEvidence.count(),
    workExecutionSegment: await prisma.workExecutionSegment.count(),
    workDriverAssignment: await prisma.workDriverAssignment.count(),
    workVehicleAssignment: await prisma.workVehicleAssignment.count(),
    operationalWorkOrder: await prisma.operationalWorkOrder.count(),
    operationConfirmation: await prisma.operationConfirmation.count(),
    transportItem: await prisma.transportItem.count(),
    dispatchOrder: await prisma.dispatchOrder.count(),
    transportOrder: await prisma.transportOrder.count(),
    productionOrder: await prisma.productionOrder.count(),
    productionAuditTrail: await prisma.productionAuditTrail.count(),
    productionPlotProgress: await prisma.productionPlotProgress.count(),
    productionPlanItem: await prisma.productionPlanItem.count(),
    productionPlan: await prisma.productionPlan.count(),
  };

  console.log('Số lượng trước khi xóa:', JSON.stringify(countBefore, null, 2));

  console.log('\n--- Đang thực hiện xóa sạch dữ liệu Kế hoạch và Lệnh sản xuất ---');

  // 1. Xóa các bảng con phụ thuộc WorkOrder
  await prisma.workJourneyLeg.deleteMany({});
  await prisma.driverKpiEvent.deleteMany({});
  await prisma.workOrderEvent.deleteMany({});
  await prisma.workAcceptance.deleteMany({});
  await prisma.workEvidence.deleteMany({});
  await prisma.workExecutionSegment.deleteMany({});
  await prisma.workDriverAssignment.deleteMany({});
  await prisma.workVehicleAssignment.deleteMany({});
  await prisma.operationalWorkOrder.deleteMany({});

  // 2. Xóa Xác nhận vận hành & Mặt hàng vận chuyển
  await prisma.operationConfirmation.deleteMany({});
  await prisma.transportItem.deleteMany({});

  // 3. Xóa Lệnh điều xe & Lệnh vận chuyển
  await prisma.dispatchOrder.deleteMany({});
  await prisma.transportOrder.deleteMany({});

  // 4. Xóa Lệnh sản xuất trung gian
  await prisma.productionOrder.deleteMany({});

  // 5. Xóa Nhật ký audit, Tiến độ lô, Hạng mục kế hoạch & Kế hoạch sản xuất
  await prisma.productionAuditTrail.deleteMany({});
  await prisma.productionPlotProgress.deleteMany({});
  await prisma.productionPlanItem.deleteMany({});
  await prisma.productionPlan.deleteMany({});

  const countAfter = {
    workJourneyLeg: await prisma.workJourneyLeg.count(),
    driverKpiEvent: await prisma.driverKpiEvent.count(),
    workOrderEvent: await prisma.workOrderEvent.count(),
    workAcceptance: await prisma.workAcceptance.count(),
    workEvidence: await prisma.workEvidence.count(),
    workExecutionSegment: await prisma.workExecutionSegment.count(),
    workDriverAssignment: await prisma.workDriverAssignment.count(),
    workVehicleAssignment: await prisma.workVehicleAssignment.count(),
    operationalWorkOrder: await prisma.operationalWorkOrder.count(),
    operationConfirmation: await prisma.operationConfirmation.count(),
    transportItem: await prisma.transportItem.count(),
    dispatchOrder: await prisma.dispatchOrder.count(),
    transportOrder: await prisma.transportOrder.count(),
    productionOrder: await prisma.productionOrder.count(),
    productionAuditTrail: await prisma.productionAuditTrail.count(),
    productionPlotProgress: await prisma.productionPlotProgress.count(),
    productionPlanItem: await prisma.productionPlanItem.count(),
    productionPlan: await prisma.productionPlan.count(),
  };

  console.log('Số lượng sau khi xóa:', JSON.stringify(countAfter, null, 2));
  console.log('\n--- ĐÃ XÓA SẠCH DỮ LIỆU KẾ HOẠCH VÀ LỆNH SẢN XUẤT THÀNH CÔNG ---');
}

main()
  .catch((e) => {
    console.error('Lỗi khi xóa dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
