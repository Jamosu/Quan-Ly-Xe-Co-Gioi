import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DispatchSourceType, DispatchStatus, DriverShiftStatus, OperationalEntityType, PlanStatus, PlanType, PlotStatus, Prisma, TransportStatus, Unit, VehicleStatus, WorkAssignmentMode, WorkOrderCategory, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { assertOperationalAccess, OperationalActor, scopedUnit } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustPlanDto } from './dto/adjust-plan.dto';
import { AuditChangeDto } from './dto/audit-change.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreatePlotDto } from './dto/create-plot.dto';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { PlanFilterDto } from './dto/plan-filter.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { UpdatePlotProgressDto } from './dto/update-plot-progress.dto';

const planInclude = {
  supervisor: { select: { id: true, fullName: true, phone: true } },
  createdBy: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
  items: { include: { vehicleType: true }, orderBy: { workDate: 'asc' as const } },
  productionOrders: {
    include: {
      dispatchOrders: { select: { id: true, status: true, generationKey: true } },
      transportOrders: { select: { id: true, status: true, generationKey: true } },
    },
  },
  plotProgresses: {
    include: {
      driver: { select: { id: true, fullName: true } },
      vehicle: { select: { id: true, code: true, plate: true } },
    },
  },
} satisfies Prisma.ProductionPlanInclude;

@Injectable()
export class ProductionPlansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlanDto, actor?: OperationalActor) {
    const { items, tasks, ...planData } = dto;
    const taskList = items || tasks || [];
    const existing = await this.prisma.productionPlan.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Kế hoạch mã ${dto.code} đã tồn tại trong hệ thống.`);
    const unit = scopedUnit(actor, dto.unit) ?? dto.unit ?? Unit.NT1;
    const targetArea = planData.targetAreaHa || taskList.reduce((sum: number, t: any) => sum + Number(t.targetQuantity || t.targetAreaHa || 0), 0);
    const assignedVehicles = planData.assignedVehiclesCount || taskList.reduce((sum: number, t: any) => sum + Number(t.plannedVehicleCount || t.assignedVehiclesCount || 0), 0);
    const firstPlot = planData.lotPlot || taskList[0]?.plotName || taskList[0]?.lotPlot || 'Toàn vùng';

    return this.prisma.productionPlan.create({
      data: {
        ...planData,
        unit,
        lotPlot: firstPlot,
        targetAreaHa: targetArea,
        assignedVehiclesCount: assignedVehicles,
        status: PlanStatus.DRAFT,
        createdById: actor?.id,
        items: taskList.length > 0 ? {
          create: taskList.map((t: any) => ({
            workDate: t.workDate ? new Date(t.workDate) : new Date(planData.startDate),
            shift: typeof t.shift === 'string' && t.shift.trim() ? t.shift.trim() : 'CA_NGAY',
            plotName: t.plotName || t.lotPlot || firstPlot,
            stage: t.stage || t.stageCode || planData.stage,
            jobCode: typeof t.jobCode === 'string' ? t.jobCode : undefined,
            jobName: t.jobName || planData.title || 'Công việc',
            implementGroup: typeof t.implementGroup === 'string' ? t.implementGroup : undefined,
            recommendedVehicle: typeof t.recommendedVehicle === 'string' ? t.recommendedVehicle : undefined,
            scheduledDays: typeof t.scheduledDays === 'string' ? t.scheduledDays : (Array.isArray(t.scheduledDays) ? t.scheduledDays.join(',') : undefined),
            targetQuantity: Number(t.targetQuantity || t.targetAreaHa || 0),
            targetUnit: typeof t.targetUnit === 'string' ? t.targetUnit : 'ha',
            plannedVehicleCount: Number(t.plannedVehicleCount || t.assignedVehiclesCount || 0),
            location: typeof t.location === 'string' ? t.location : undefined,
            origin: typeof t.origin === 'string' ? t.origin : undefined,
            destination: typeof t.destination === 'string' ? t.destination : undefined,
            machineType: typeof t.machineType === 'string' ? t.machineType : undefined,
            durationHours: Number(t.durationHours || 0),
            notes: typeof t.notes === 'string' ? t.notes : '',
            taskStatus: typeof t.taskStatus === 'string' ? t.taskStatus : (typeof t.status === 'string' ? t.status : 'PENDING'),
          })),
        } : undefined,
      },
      include: planInclude,
    });
  }

  async findAll(filter: PlanFilterDto, actor?: OperationalActor) {
    const { page = 1, limit = 50, search, stage, unit, status, planType, weekNumber, complexCode, year } = filter;
    const where: Prisma.ProductionPlanWhereInput = {};
    const effectiveUnit = scopedUnit(actor, unit);
    if (effectiveUnit) where.unit = effectiveUnit;
    if (stage) where.stage = stage;
    if (status) where.status = status;
    if (planType) where.planType = planType;
    if (weekNumber) where.weekNumber = Number(weekNumber);
    if (complexCode && complexCode !== 'ALL') where.complexCode = complexCode;
    if (year) {
      const startYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endYear = new Date(`${year}-12-31T23:59:59.999Z`);
      where.startDate = { gte: startYear, lte: endYear };
    }
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { title: { contains: search } },
        { lotPlot: { contains: search } },
        { items: { some: { jobName: { contains: search } } } },
      ];
    }
    const [total, items] = await Promise.all([
      this.prisma.productionPlan.count({ where }),
      this.prisma.productionPlan.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: planInclude,
        orderBy: [{ weekNumber: 'desc' }, { startDate: 'desc' }],
      }),
    ]);
    return { items: items.map((item) => this.withOrderSummary(item)), pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  private withOrderSummary<T extends { productionOrders: Array<{ dispatchOrders: Array<{ status: DispatchStatus }>; transportOrders: Array<{ status: TransportStatus }> }> }>(plan: T) {
    const statuses = plan.productionOrders.flatMap((order) => [
      ...order.dispatchOrders.map((item) => item.status),
      ...order.transportOrders.map((item) => item.status),
    ]);
    return {
      ...plan,
      orderSummary: {
        productionOrders: plan.productionOrders.length,
        generatedOrders: statuses.length,
        pendingOrders: statuses.filter((status) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'DRIVER_ACCEPTED'].includes(status)).length,
        activeOrders: statuses.filter((status) => ['DEPARTED', 'WORKING', 'AT_PICKUP', 'LOADING', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING'].includes(status)).length,
        completedOrders: statuses.filter((status) => ['COMPLETED', 'ACCEPTED', 'CLOSED', 'DELIVERED'].includes(status)).length,
      },
    };
  }

  async findOne(id: number, actor?: OperationalActor) {
    const plan = await this.prisma.productionPlan.findUnique({ where: { id }, include: planInclude });
    if (!plan) throw new NotFoundException(`Không tìm thấy kế hoạch sản xuất #${id}`);
    assertOperationalAccess(actor, plan.unit);
    return plan;
  }

  async update(id: number, dto: UpdatePlanDto, actor?: OperationalActor) {
    const plan = await this.findOne(id, actor);
    if (!([PlanStatus.DRAFT, PlanStatus.REJECTED] as PlanStatus[]).includes(plan.status)) {
      throw new BadRequestException('Chỉ được sửa trực tiếp kế hoạch nháp hoặc bị từ chối.');
    }
    if (dto.unit) scopedUnit(actor, dto.unit);
    const { status: _status, items, tasks, ...data } = dto;
    const taskList = items || tasks;

    return this.prisma.$transaction(async (tx) => {
      if (taskList && Array.isArray(taskList)) {
        await tx.productionPlanItem.deleteMany({ where: { planId: id } });
        if (taskList.length > 0) {
          await tx.productionPlanItem.createMany({
            data: taskList.map((t: any) => ({
              planId: id,
              workDate: t.workDate ? new Date(t.workDate) : (data.startDate ? new Date(data.startDate) : plan.startDate),
              shift: typeof t.shift === 'string' && t.shift.trim() ? t.shift.trim() : 'CA_NGAY',
              plotName: t.plotName || t.lotPlot || data.lotPlot || plan.lotPlot,
              stage: t.stage || t.stageCode || data.stage || plan.stage,
              jobCode: typeof t.jobCode === 'string' ? t.jobCode : undefined,
              jobName: t.jobName || plan.title || 'Công việc',
              implementGroup: typeof t.implementGroup === 'string' ? t.implementGroup : undefined,
              recommendedVehicle: typeof t.recommendedVehicle === 'string' ? t.recommendedVehicle : undefined,
              scheduledDays: typeof t.scheduledDays === 'string' ? t.scheduledDays : (Array.isArray(t.scheduledDays) ? t.scheduledDays.join(',') : undefined),
              targetQuantity: Number(t.targetQuantity || t.targetAreaHa || 0),
              targetUnit: typeof t.targetUnit === 'string' ? t.targetUnit : 'ha',
              plannedVehicleCount: Number(t.plannedVehicleCount || t.assignedVehiclesCount || 0),
              location: typeof t.location === 'string' ? t.location : undefined,
              origin: typeof t.origin === 'string' ? t.origin : undefined,
              destination: typeof t.destination === 'string' ? t.destination : undefined,
              machineType: typeof t.machineType === 'string' ? t.machineType : undefined,
              durationHours: Number(t.durationHours || 0),
              notes: typeof t.notes === 'string' ? t.notes : '',
              taskStatus: typeof t.taskStatus === 'string' ? t.taskStatus : (typeof t.status === 'string' ? t.status : 'PENDING'),
            })),
          });
        }
      }

      return tx.productionPlan.update({ where: { id }, data, include: planInclude });
    });
  }

  private normalizedDay(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  }

  private scheduledDates(planStart: Date, itemDate: Date, scheduledDays?: string) {
    if (!scheduledDays?.trim()) return [new Date(itemDate)];
    const names = ['thu 2', 'thu 3', 'thu 4', 'thu 5', 'thu 6', 'thu 7', 'chu nhat'];
    const normalized = this.normalizedDay(scheduledDays);
    const found = names.map((name, index) => normalized.indexOf(name) >= 0 ? index : -1).filter((index) => index >= 0);
    if (!found.length) return [new Date(itemDate)];
    const startIndex = found[0];
    const endIndex = found[found.length - 1];
    const monday = new Date(planStart);
    const jsDay = monday.getDay();
    monday.setDate(monday.getDate() + ((jsDay === 0 ? -6 : 1) - jsDay));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + startIndex + offset);
      return date;
    });
  }

  private dateKey(date: Date) {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  }

  private async reconcileGeneratedOrders(tx: Prisma.TransactionClient, planId: number, actor: OperationalActor) {
    const plan = await tx.productionPlan.findUnique({
      where: { id: planId },
      include: { items: true, productionOrders: { include: { dispatchOrders: { include: { operationalWorkOrder: true } }, transportOrders: { include: { operationalWorkOrder: true } } } } },
    });
    if (!plan) throw new NotFoundException(`Không tìm thấy kế hoạch sản xuất #${planId}`);

    const desiredKeys = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;
    let cancelledCount = 0;
    const warnings: string[] = [];

    for (const item of plan.items) {
      const productionCode = `LSX-P${plan.id}-I${item.id}`;
      let productionOrder = await tx.productionOrder.findUnique({ where: { code: productionCode } });
      const productionData = {
        unit: plan.unit,
        title: item.jobName,
        location: item.location || item.plotName || plan.lotPlot,
        plannedStart: item.workDate,
        plannedEnd: plan.endDate,
        notes: item.notes,
      };
      productionOrder = productionOrder
        ? await tx.productionOrder.update({ where: { id: productionOrder.id }, data: { ...productionData, planItemId: item.id } })
        : await tx.productionOrder.create({ data: { code: productionCode, planId: plan.id, planItemId: item.id, createdById: actor.id, ...productionData } });

      const dates = this.scheduledDates(plan.startDate, item.workDate, item.scheduledDays || undefined);
      const vehicleCount = Math.max(1, item.plannedVehicleCount || 1);
      for (const date of dates) {
        for (let vehicleIndex = 1; vehicleIndex <= vehicleCount; vehicleIndex += 1) {
          const generationKey = `PLAN:${plan.id}:ITEM:${item.id}:DAY:${this.dateKey(date)}:VEHICLE:${vehicleIndex}`;
          desiredKeys.add(generationKey);
          const departureTime = new Date(date); departureTime.setHours(7, 0, 0, 0);
          const plannedEndTime = new Date(date); plannedEndTime.setHours(17, 0, 0, 0);
          const prefix = plan.planType === PlanType.AGRICULTURE ? 'LDX-NN' : plan.planType === PlanType.CONSTRUCTION ? 'LDX-CT' : 'LVC-NB';
          const code = `${prefix}-P${plan.id}-I${item.id}-${this.dateKey(date)}-V${vehicleIndex}`;
          if (plan.planType === PlanType.INTERNAL_TRANSPORT) {
            const existing = await tx.transportOrder.findUnique({ where: { generationKey } });
            const data = {
              code, generationKey, sourceType: DispatchSourceType.PRODUCTION_ORDER, productionOrderId: productionOrder.id,
              unit: plan.unit, requestDate: new Date(), executionDate: date, departureTime, plannedEndTime,
              cargoType: item.jobName, origin: item.origin || plan.enterpriseName || 'Điểm nhận',
              destination: item.destination || item.location || item.plotName, notes: item.notes,
            };
            let generatedOrder = existing;
            if (existing) {
              if (([TransportStatus.DRAFT, TransportStatus.PENDING_APPROVAL, TransportStatus.APPROVED] as TransportStatus[]).includes(existing.status)) {
                generatedOrder = await tx.transportOrder.update({ where: { id: existing.id }, data }); updatedCount += 1;
              }
            } else {
              generatedOrder = await tx.transportOrder.create({ data: { ...data, status: TransportStatus.PENDING_APPROVAL, items: { create: { cargoName: item.jobName, unitOfMeasure: item.targetUnit, plannedQuantity: item.targetQuantity, pickupLocation: item.origin, deliveryLocation: item.destination || item.location } } } });
              createdCount += 1;
            }
            if (generatedOrder) {
              await tx.operationalWorkOrder.upsert({
                where: { transportOrderId: generatedOrder.id },
                update: {
                  category: WorkOrderCategory.TRANSPORT, sourceType: DispatchSourceType.PRODUCTION_ORDER,
                  plannedStartAt: departureTime, plannedEndAt: plannedEndTime, complexCode: plan.complexCode,
                  complexName: plan.complexName, enterpriseCode: plan.enterpriseCode, enterpriseName: plan.enterpriseName,
                  farmCode: plan.farmCode, farmName: plan.farmName, workLocationText: item.destination || item.location || item.plotName,
                  jobCode: item.jobCode, jobName: item.jobName, jobDescription: item.notes, shift: item.shift,
                  targetQuantity: item.targetQuantity, targetUnit: item.targetUnit, requestedVehicleTypeId: item.vehicleTypeId,
                  requestedVehicleCount: 1, notes: item.notes,
                  categoryDetails: { cargoType: item.jobName, distanceKm: 0 },
                },
                create: {
                  type: WorkOrderType.TRANSPORT, unit: plan.unit, category: WorkOrderCategory.TRANSPORT,
                  sourceType: DispatchSourceType.PRODUCTION_ORDER, assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT,
                  status: WorkOrderStatus.PENDING_APPROVAL, plannedStartAt: departureTime, plannedEndAt: plannedEndTime,
                  complexCode: plan.complexCode, complexName: plan.complexName, enterpriseCode: plan.enterpriseCode,
                  enterpriseName: plan.enterpriseName, farmCode: plan.farmCode, farmName: plan.farmName,
                  workLocationText: item.destination || item.location || item.plotName, jobCode: item.jobCode,
                  jobName: item.jobName, jobDescription: item.notes, shift: item.shift, targetQuantity: item.targetQuantity,
                  targetUnit: item.targetUnit, requestedVehicleTypeId: item.vehicleTypeId, requestedVehicleCount: 1,
                  categoryDetails: { cargoType: item.jobName, distanceKm: 0 }, notes: item.notes,
                  transportOrderId: generatedOrder.id, createdById: actor.id,
                },
              });
            }
          } else {
            const existing = await tx.dispatchOrder.findUnique({ where: { generationKey } });
            const data = {
              code, generationKey, sourceType: DispatchSourceType.PRODUCTION_ORDER, productionOrderId: productionOrder.id,
              operationDomain: plan.planType === PlanType.CONSTRUCTION ? 'CONSTRUCTION' as const : 'AGRICULTURE' as const,
              unit: plan.unit, requesterId: actor.id, purpose: item.jobName,
              origin: plan.enterpriseName || plan.farmName || 'Bãi máy', destination: item.location || item.plotName,
              departureTime, plannedEndTime, notes: item.notes,
            };
            let generatedOrder = existing;
            if (existing) {
              if (([DispatchStatus.DRAFT, DispatchStatus.PENDING_APPROVAL, DispatchStatus.APPROVED] as DispatchStatus[]).includes(existing.status)) {
                generatedOrder = await tx.dispatchOrder.update({ where: { id: existing.id }, data }); updatedCount += 1;
              }
            } else {
              generatedOrder = await tx.dispatchOrder.create({ data: { ...data, status: DispatchStatus.PENDING_APPROVAL } });
              createdCount += 1;
            }
            if (generatedOrder) {
              const category = plan.planType === PlanType.CONSTRUCTION ? WorkOrderCategory.CONSTRUCTION : WorkOrderCategory.AGRICULTURE;
              await tx.operationalWorkOrder.upsert({
                where: { dispatchOrderId: generatedOrder.id },
                update: {
                  category, sourceType: DispatchSourceType.PRODUCTION_ORDER, plannedStartAt: departureTime,
                  plannedEndAt: plannedEndTime, complexCode: plan.complexCode, complexName: plan.complexName,
                  enterpriseCode: plan.enterpriseCode, enterpriseName: plan.enterpriseName, farmCode: plan.farmCode,
                  farmName: plan.farmName, workLocationText: item.location || item.plotName, jobCode: item.jobCode,
                  jobName: item.jobName, jobDescription: item.notes, shift: item.shift, targetQuantity: item.targetQuantity,
                  targetUnit: item.targetUnit, requestedVehicleTypeId: item.vehicleTypeId, requestedVehicleCount: 1,
                  notes: item.notes, categoryDetails: category === WorkOrderCategory.AGRICULTURE
                    ? { agricultureJobType: item.jobName, plot: item.plotName, implementRequirement: item.implementGroup }
                    : { constructionType: item.jobName, item: item.jobName, equipmentType: item.machineType },
                },
                create: {
                  type: WorkOrderType.DISPATCH, unit: plan.unit, category, sourceType: DispatchSourceType.PRODUCTION_ORDER,
                  assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT, status: WorkOrderStatus.PENDING_APPROVAL,
                  plannedStartAt: departureTime, plannedEndAt: plannedEndTime, complexCode: plan.complexCode,
                  complexName: plan.complexName, enterpriseCode: plan.enterpriseCode, enterpriseName: plan.enterpriseName,
                  farmCode: plan.farmCode, farmName: plan.farmName, workLocationText: item.location || item.plotName,
                  jobCode: item.jobCode, jobName: item.jobName, jobDescription: item.notes, shift: item.shift,
                  targetQuantity: item.targetQuantity, targetUnit: item.targetUnit, requestedVehicleTypeId: item.vehicleTypeId,
                  requestedVehicleCount: 1, notes: item.notes, categoryDetails: category === WorkOrderCategory.AGRICULTURE
                    ? { agricultureJobType: item.jobName, plot: item.plotName, implementRequirement: item.implementGroup }
                    : { constructionType: item.jobName, item: item.jobName, equipmentType: item.machineType },
                  dispatchOrderId: generatedOrder.id, createdById: actor.id,
                },
              });
            }
          }
        }
      }
      await tx.productionPlanItem.update({ where: { id: item.id }, data: { taskStatus: 'DISPATCHED' } });
    }

    const oldOrders = plan.productionOrders.flatMap((order) => [
      ...order.dispatchOrders.map((value) => ({ kind: 'dispatch' as const, value })),
      ...order.transportOrders.map((value) => ({ kind: 'transport' as const, value })),
    ]);
    for (const old of oldOrders) {
      if (!old.value.generationKey || desiredKeys.has(old.value.generationKey)) continue;
      const notStarted = old.kind === 'dispatch'
        ? ([DispatchStatus.DRAFT, DispatchStatus.PENDING_APPROVAL, DispatchStatus.APPROVED, DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED] as DispatchStatus[]).includes(old.value.status as DispatchStatus)
        : ([TransportStatus.DRAFT, TransportStatus.PENDING_APPROVAL, TransportStatus.APPROVED, TransportStatus.ASSIGNED, TransportStatus.DRIVER_ACCEPTED] as TransportStatus[]).includes(old.value.status as TransportStatus);
      if (!notStarted) { warnings.push(`Giữ lệnh ${old.value.code} vì đã bắt đầu thực hiện.`); continue; }
      if (old.value.operationalWorkOrder) await tx.operationalWorkOrder.update({ where: { id: old.value.operationalWorkOrder.id }, data: { status: WorkOrderStatus.CANCELLED } });
      if (old.value.vehicleId) await tx.vehicle.update({ where: { id: old.value.vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG } });
      if (old.value.driverId) await tx.user.update({ where: { id: old.value.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
      if (old.kind === 'dispatch') await tx.dispatchOrder.update({ where: { id: old.value.id }, data: { status: DispatchStatus.CANCELLED, cancelledAt: new Date(), rejectionReason: 'Kế hoạch nguồn đã được điều chỉnh' } });
      else await tx.transportOrder.update({ where: { id: old.value.id }, data: { status: TransportStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: 'Kế hoạch nguồn đã được điều chỉnh' } });
      await tx.operationalAuditLog.create({
        data: {
          entityType: old.kind === 'dispatch' ? OperationalEntityType.DISPATCH_ORDER : OperationalEntityType.TRANSPORT_ORDER,
          entityId: old.value.id,
          actorId: actor.id,
          action: 'CANCEL_AFTER_PLAN_ADJUSTMENT',
          oldValue: { status: old.value.status, generationKey: old.value.generationKey },
          newValue: { status: 'CANCELLED' },
          reason: 'Kế hoạch nguồn đã được điều chỉnh',
        },
      });
      cancelledCount += 1;
    }
    return { createdCount, updatedCount, cancelledCount, warnings };
  }

  private async transition(id: number, actor: OperationalActor | undefined, from: PlanStatus[], to: PlanStatus, reason?: string) {
    const plan = await this.findOne(id, actor);
    if (!from.includes(plan.status)) throw new BadRequestException(`Không thể chuyển kế hoạch từ ${plan.status} sang ${to}.`);
    const now = new Date();
    const timestamps: Prisma.ProductionPlanUpdateInput =
      to === PlanStatus.PENDING_APPROVAL ? { submittedAt: now } :
      to === PlanStatus.APPROVED ? { approvedAt: now, ...(actor?.id ? { approvedBy: { connect: { id: actor.id } } } : {}) } :
      to === PlanStatus.REJECTED ? { rejectedAt: now } :
      to === PlanStatus.COMPLETED ? { completedAt: now } :
      to === PlanStatus.CANCELLED ? { cancelledAt: now } : {};
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productionPlan.update({ where: { id }, data: { status: to, ...timestamps } });
      if (actor?.id) {
        await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.PRODUCTION_PLAN, entityId: id, actorId: actor.id, action: `${plan.status}_TO_${to}`, oldValue: { status: plan.status }, newValue: { status: to }, reason } });
      }
      return updated;
    });
  }

  submit(id: number, actor?: OperationalActor) { return this.transition(id, actor, [PlanStatus.DRAFT, PlanStatus.ADJUSTED, PlanStatus.REJECTED], PlanStatus.PENDING_APPROVAL); }
  async approve(id: number, actor?: OperationalActor) {
    if (!actor?.id) throw new BadRequestException('Phê duyệt kế hoạch yêu cầu người dùng đã đăng nhập.');
    const current = await this.findOne(id, actor);
    if (!([PlanStatus.PENDING_APPROVAL, PlanStatus.APPROVED] as PlanStatus[]).includes(current.status)) {
      throw new BadRequestException(`Không thể phê duyệt kế hoạch từ trạng thái ${current.status}.`);
    }
    return this.prisma.$transaction(async (tx) => {
      if (current.status === PlanStatus.PENDING_APPROVAL) {
        await tx.productionPlan.update({ where: { id }, data: { status: PlanStatus.APPROVED, approvedAt: new Date(), approvedById: actor.id } });
        await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.PRODUCTION_PLAN, entityId: id, actorId: actor.id, action: `${current.status}_TO_${PlanStatus.APPROVED}`, oldValue: { status: current.status }, newValue: { status: PlanStatus.APPROVED } } });
      }
      const generation = await this.reconcileGeneratedOrders(tx, id, actor);
      const updated = await tx.productionPlan.findUniqueOrThrow({ where: { id }, include: planInclude });
      return { ...this.withOrderSummary(updated), generation };
    });
  }
  reject(id: number, actor?: OperationalActor, reason?: string) { if (!reason) throw new BadRequestException('Từ chối kế hoạch phải có lý do.'); return this.transition(id, actor, [PlanStatus.PENDING_APPROVAL], PlanStatus.REJECTED, reason); }
  start(id: number, actor?: OperationalActor) { return this.transition(id, actor, [PlanStatus.APPROVED], PlanStatus.IN_PROGRESS); }
  complete(id: number, actor?: OperationalActor) { return this.transition(id, actor, [PlanStatus.IN_PROGRESS], PlanStatus.COMPLETED); }
  cancel(id: number, actor?: OperationalActor, reason?: string) { return this.transition(id, actor, [PlanStatus.DRAFT, PlanStatus.PENDING_APPROVAL, PlanStatus.APPROVED, PlanStatus.ADJUSTED, PlanStatus.REJECTED], PlanStatus.CANCELLED, reason); }

  async adjust(id: number, dto: AdjustPlanDto, actor?: OperationalActor) {
    const plan = await this.findOne(id, actor);
    if (!([PlanStatus.APPROVED, PlanStatus.IN_PROGRESS] as PlanStatus[]).includes(plan.status)) throw new BadRequestException('Chỉ điều chỉnh kế hoạch đã duyệt hoặc đang thực hiện.');
    const { reason, status: _status, items, tasks, ...changes } = dto;
    const taskList = items || tasks;
    return this.prisma.$transaction(async (tx) => {
      if (taskList && Array.isArray(taskList)) {
        // ProductionOrder.planItem uses ON DELETE SET NULL. Replacing the submitted
        // item set lets reconciliation cancel obsolete not-started orders while
        // retaining their complete audit/history chain.
        await tx.productionPlanItem.deleteMany({ where: { planId: id } });
        for (const task of taskList as any[]) {
          const itemData = {
            workDate: task.workDate ? new Date(task.workDate) : (changes.startDate ? new Date(changes.startDate) : plan.startDate),
            shift: task.shift || 'CA_NGAY', plotName: task.plotName || task.lotPlot || changes.lotPlot || plan.lotPlot,
            stage: task.stage || task.stageCode || changes.stage || plan.stage, jobCode: task.jobCode,
            jobName: task.jobName || plan.title, implementGroup: task.implementGroup,
            recommendedVehicle: task.recommendedVehicle, scheduledDays: task.scheduledDays,
            targetQuantity: Number(task.targetQuantity || task.targetAreaHa || 0), targetUnit: task.targetUnit || 'ha',
            plannedVehicleCount: Number(task.plannedVehicleCount || task.assignedVehiclesCount || 0),
            location: task.location, origin: task.origin, destination: task.destination, machineType: task.machineType,
            durationHours: Number(task.durationHours || 0), notes: task.notes || '', taskStatus: task.taskStatus || task.status || 'PENDING',
          };
          await tx.productionPlanItem.create({ data: { ...itemData, planId: id } });
        }
      }
      const updated = await tx.productionPlan.update({ where: { id }, data: { ...(changes as any), status: PlanStatus.PENDING_APPROVAL, submittedAt: new Date() } });
      if (actor?.id) {
        await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.PRODUCTION_PLAN, entityId: id, actorId: actor.id, action: 'ADJUST_AND_RESUBMIT', oldValue: plan, newValue: updated, reason } });
      }
      return updated;
    });
  }

  async createItem(planId: number, dto: CreatePlanItemDto, actor?: OperationalActor) {
    const plan = await this.findOne(planId, actor);
    if (!([PlanStatus.DRAFT, PlanStatus.REJECTED] as PlanStatus[]).includes(plan.status)) throw new BadRequestException('Chỉ thêm hạng mục khi kế hoạch còn nháp hoặc bị từ chối.');
    return this.prisma.productionPlanItem.create({
      data: {
        ...(dto as any),
        planId,
        workDate: dto.workDate ? new Date(dto.workDate) : new Date(plan.startDate),
        shift: typeof dto.shift === 'string' && dto.shift.trim() ? dto.shift.trim() : 'CA_NGAY',
      },
      include: { vehicleType: true },
    });
  }

  async generatedOrders(planId: number, itemId: number, actor?: OperationalActor) {
    await this.findOne(planId, actor);
    const item = await this.prisma.productionPlanItem.findFirst({ where: { id: itemId, planId } });
    if (!item) throw new NotFoundException(`Không tìm thấy hạng mục #${itemId} trong kế hoạch #${planId}.`);
    const productionOrders = await this.prisma.productionOrder.findMany({
      where: { planId, planItemId: itemId },
      include: {
        dispatchOrders: { include: { operationalWorkOrder: true }, orderBy: { departureTime: 'asc' } },
        transportOrders: { include: { operationalWorkOrder: true }, orderBy: { departureTime: 'asc' } },
      },
    });
    return productionOrders.flatMap((order) => [
      ...order.dispatchOrders.map((dispatch) => ({ kind: 'DISPATCH' as const, id: dispatch.id, code: dispatch.code, departureTime: dispatch.departureTime, plannedEndTime: dispatch.plannedEndTime, status: dispatch.status, workOrderId: dispatch.operationalWorkOrder?.id })),
      ...order.transportOrders.map((transport) => ({ kind: 'TRANSPORT' as const, id: transport.id, code: transport.code, departureTime: transport.departureTime, plannedEndTime: transport.plannedEndTime, status: transport.status, workOrderId: transport.operationalWorkOrder?.id })),
    ]).sort((left, right) => (left.departureTime?.getTime() ?? 0) - (right.departureTime?.getTime() ?? 0));
  }

  async updateItem(planId: number, itemId: number, dto: Partial<CreatePlanItemDto>, actor: OperationalActor) {
    const plan = await this.findOne(planId, actor);
    if (!([PlanStatus.DRAFT, PlanStatus.REJECTED] as PlanStatus[]).includes(plan.status)) throw new BadRequestException('Hạng mục sau duyệt chỉ được thay đổi qua quy trình điều chỉnh có lý do.');
    const item = await this.prisma.productionPlanItem.findFirst({ where: { id: itemId, planId } });
    if (!item) throw new NotFoundException(`Không tìm thấy hạng mục #${itemId}.`);
    return this.prisma.productionPlanItem.update({ where: { id: itemId }, data: dto as any });
  }

  async removeItem(planId: number, itemId: number, actor: OperationalActor) {
    const plan = await this.findOne(planId, actor);
    if (plan.status !== PlanStatus.DRAFT) throw new BadRequestException('Chỉ xóa hạng mục của kế hoạch nháp.');
    const item = await this.prisma.productionPlanItem.findFirst({ where: { id: itemId, planId } });
    if (!item) throw new NotFoundException(`Không tìm thấy hạng mục #${itemId}.`);
    return this.prisma.productionPlanItem.delete({ where: { id: itemId } });
  }

  async createProductionOrder(planId: number, dto: CreateProductionOrderDto, actor: OperationalActor) {
    await this.findOne(planId, actor);
    scopedUnit(actor, dto.unit);
    if (dto.planItemId) {
      const item = await this.prisma.productionPlanItem.findFirst({ where: { id: dto.planItemId, planId } });
      if (!item) throw new BadRequestException('Hạng mục không thuộc kế hoạch này.');
    }
    try { return await this.prisma.productionOrder.create({ data: { ...dto, planId, createdById: actor.id } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException(`Lệnh sản xuất ${dto.code} đã tồn tại.`); throw error; }
  }

  async listProductionOrders(planId: number, actor: OperationalActor) { await this.findOne(planId, actor); return this.prisma.productionOrder.findMany({ where: { planId }, include: { planItem: true, dispatchOrders: true }, orderBy: { createdAt: 'desc' } }); }
  async updateProductionOrder(planId: number, orderId: number, dto: UpdateProductionOrderDto, actor: OperationalActor) { await this.findOne(planId, actor); const order = await this.prisma.productionOrder.findFirst({ where: { id: orderId, planId } }); if (!order) throw new NotFoundException('Không tìm thấy lệnh sản xuất.'); if (dto.unit) scopedUnit(actor, dto.unit); return this.prisma.productionOrder.update({ where: { id: orderId }, data: dto }); }
  async removeProductionOrder(planId: number, orderId: number, actor: OperationalActor) { await this.findOne(planId, actor); const order = await this.prisma.productionOrder.findFirst({ where: { id: orderId, planId }, include: { _count: { select: { dispatchOrders: true } } } }); if (!order) throw new NotFoundException('Không tìm thấy lệnh sản xuất.'); if (order._count.dispatchOrders) throw new BadRequestException('Không thể xóa lệnh sản xuất đã phát sinh lệnh điều xe.'); return this.prisma.productionOrder.delete({ where: { id: orderId } }); }

  async addPlot(planId: number, dto: CreatePlotDto, actor: OperationalActor) { await this.findOne(planId, actor); return this.prisma.productionPlotProgress.create({ data: { ...dto, planId } }); }

  async updatePlotProgress(planId: number, plotId: number, dto: UpdatePlotProgressDto, actor: OperationalActor) {
    await this.findOne(planId, actor);
    const plot = await this.prisma.productionPlotProgress.findFirst({ where: { id: plotId, planId } });
    if (!plot) throw new NotFoundException(`Không tìm thấy lô thửa #${plotId}.`);
    const updated = await this.prisma.productionPlotProgress.update({ where: { id: plotId }, data: { ...dto, completedAt: dto.status === PlotStatus.HOAN_THANH ? new Date() : plot.completedAt, receivedAt: dto.status === PlotStatus.DANG_THUC_HIEN && !plot.receivedAt ? new Date() : plot.receivedAt } });
    const plots = await this.prisma.productionPlotProgress.findMany({ where: { planId } });
    await this.prisma.productionPlan.update({ where: { id: planId }, data: { completedAreaHa: plots.filter((p) => p.status === PlotStatus.HOAN_THANH).reduce((sum, p) => sum + p.areaHa, 0), fuelUsedLiters: plots.reduce((sum, p) => sum + p.actualFuelLiters, 0) } });
    return updated;
  }

  async logAuditChange(planId: number, dto: AuditChangeDto, actor: OperationalActor) {
    await this.findOne(planId, actor);
    return this.prisma.$transaction(async (tx) => {
      const legacy = await tx.productionAuditTrail.create({ data: { planId, actorId: actor.id, action: dto.action, reason: dto.reason, approvedBy: dto.approvedBy } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.PRODUCTION_PLAN, entityId: planId, actorId: actor.id, action: dto.action, reason: dto.reason, legacyProductionAuditTrailId: legacy.id } });
      return legacy;
    });
  }

  async settleFinance(planId: number, actor: OperationalActor) { await this.findOne(planId, actor); await this.prisma.productionPlotProgress.updateMany({ where: { planId }, data: { isSettledFinance: true } }); return { message: `Đã quyết toán kế hoạch #${planId}`, planId, settledAt: new Date() }; }
  async remove(id: number, actor?: OperationalActor) {
    const plan = await this.findOne(id, actor);
    if (!([PlanStatus.DRAFT, PlanStatus.REJECTED] as PlanStatus[]).includes(plan.status)) {
      throw new BadRequestException('Chỉ được xóa kế hoạch nháp hoặc bị từ chối; kế hoạch đã duyệt phải được hủy để giữ lịch sử.');
    }
    await this.prisma.productionPlanItem.deleteMany({ where: { planId: id } });
    return this.prisma.productionPlan.delete({ where: { id } });
  }
}
