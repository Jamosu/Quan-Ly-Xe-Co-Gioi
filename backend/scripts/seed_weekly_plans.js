const { PrismaClient, Unit, ProductionStage, PlanStatus } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dataFilePath = path.join(__dirname, 'seed_plans_data.json');
  const plans = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));

  console.log(`Bắt đầu nạp ${plans.length} kế hoạch sản xuất tuần vào Database...`);

  let planCount = 0;
  let taskCount = 0;

  for (const p of plans) {
    const totalArea = p.tasks.reduce((sum, t) => sum + (t.targetAreaHa || 0), 0);
    const totalVehicles = p.tasks.reduce((sum, t) => sum + (t.assignedVehiclesCount || 0), 0);
    const firstPlot = p.tasks[0]?.lotPlot || 'Toàn vùng';

    // Map stage
    let stage = ProductionStage.LAM_DAT;
    if (p.stageCode === 'TRONG_MOI') stage = ProductionStage.TRONG_MOI;
    else if (p.stageCode === 'THU_HOACH') stage = ProductionStage.THU_HOACH;
    else if (p.stageCode === 'VAN_CHUYEN') stage = ProductionStage.VAN_CHUYEN;
    else if (p.stageCode === 'HAU_CAN') stage = ProductionStage.HAU_CAN;

    // Map status
    let status = PlanStatus.DRAFT;
    if (p.status === 'APPROVED') status = PlanStatus.APPROVED;
    else if (p.status === 'IN_PROGRESS') status = PlanStatus.IN_PROGRESS;
    else if (p.status === 'COMPLETED') status = PlanStatus.COMPLETED;

    // Map unit
    let unit = Unit.NT1;
    if (p.farmCode?.includes('02') || p.enterpriseCode?.includes('02')) unit = Unit.NT2;

    const upsertedPlan = await prisma.productionPlan.upsert({
      where: { code: p.code },
      update: {
        title: p.title,
        stage: stage,
        unit: unit,
        lotPlot: firstPlot,
        targetAreaHa: totalArea,
        assignedVehiclesCount: totalVehicles,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        weekStart: new Date(p.startDate),
        weekNumber: p.weekNumber,
        complexCode: p.complexCode,
        complexName: p.complexName,
        enterpriseCode: p.enterpriseCode,
        enterpriseName: p.enterpriseName,
        farmCode: p.farmCode,
        farmName: p.farmName,
        notes: p.notes,
        status: status,
      },
      create: {
        code: p.code,
        title: p.title,
        stage: stage,
        unit: unit,
        lotPlot: firstPlot,
        targetAreaHa: totalArea,
        completedAreaHa: status === PlanStatus.COMPLETED ? totalArea : 0,
        assignedVehiclesCount: totalVehicles,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        weekStart: new Date(p.startDate),
        weekNumber: p.weekNumber,
        complexCode: p.complexCode,
        complexName: p.complexName,
        enterpriseCode: p.enterpriseCode,
        enterpriseName: p.enterpriseName,
        farmCode: p.farmCode,
        farmName: p.farmName,
        notes: p.notes,
        status: status,
      },
    });

    planCount++;

    // Xóa items cũ của plan này để nạp lại chuẩn
    await prisma.productionPlanItem.deleteMany({
      where: { planId: upsertedPlan.id },
    });

    // Nạp danh sách các công việc con (tasks)
    for (const t of p.tasks) {
      let taskStage = stage;
      if (t.stageCode === 'LAM_DAT') taskStage = ProductionStage.LAM_DAT;
      else if (t.stageCode === 'TRONG_MOI') taskStage = ProductionStage.TRONG_MOI;
      else if (t.stageCode === 'THU_HOACH') taskStage = ProductionStage.THU_HOACH;
      else if (t.stageCode === 'VAN_CHUYEN') taskStage = ProductionStage.VAN_CHUYEN;
      else if (t.stageCode === 'HAU_CAN') taskStage = ProductionStage.HAU_CAN;

      await prisma.productionPlanItem.create({
        data: {
          planId: upsertedPlan.id,
          workDate: new Date(p.startDate),
          shift: 'CA_NGAY',
          plotName: t.lotPlot,
          stage: taskStage,
          jobCode: t.jobCode,
          jobName: t.jobName,
          implementGroup: t.implementGroup,
          recommendedVehicle: t.recommendedVehicle,
          scheduledDays: t.scheduledDays,
          targetQuantity: t.targetAreaHa,
          targetUnit: 'ha',
          plannedVehicleCount: t.assignedVehiclesCount,
          notes: t.notes,
          taskStatus: t.status || 'PENDING',
        },
      });
      taskCount++;
    }
  }

  console.log(`✅ Nạp thành công: ${planCount} kế hoạch sản xuất và ${taskCount} công việc cơ giới vào Database!`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi nạp dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
