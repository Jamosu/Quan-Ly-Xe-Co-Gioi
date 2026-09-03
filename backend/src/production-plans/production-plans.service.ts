import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationalEntityType, PlanStatus, PlotStatus, Prisma } from '@prisma/client';
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
  productionOrders: true,
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

  async create(dto: CreatePlanDto, actor: OperationalActor) {
    const existing = await this.prisma.productionPlan.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Kế hoạch mã ${dto.code} đã tồn tại trong hệ thống.`);
    const unit = scopedUnit(actor, dto.unit) ?? dto.unit;
    return this.prisma.productionPlan.create({
      data: { ...dto, unit, status: PlanStatus.DRAFT, createdById: actor.id },
      include: planInclude,
    });
  }

  async findAll(filter: PlanFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20, search, stage, unit, status } = filter;
    const where: Prisma.ProductionPlanWhereInput = {};
    const effectiveUnit = scopedUnit(actor, unit);
    if (effectiveUnit) where.unit = effectiveUnit;
    if (stage) where.stage = stage;
    if (status) where.status = status;
    if (search) where.OR = [{ code: { contains: search } }, { title: { contains: search } }, { lotPlot: { contains: search } }];
    const [total, items] = await Promise.all([
      this.prisma.productionPlan.count({ where }),
      this.prisma.productionPlan.findMany({ where, skip: (page - 1) * limit, take: limit, include: planInclude, orderBy: { startDate: 'desc' } }),
    ]);
    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, actor: OperationalActor) {
    const plan = await this.prisma.productionPlan.findUnique({ where: { id }, include: planInclude });
    if (!plan) throw new NotFoundException(`Không tìm thấy kế hoạch sản xuất #${id}`);
    assertOperationalAccess(actor, plan.unit);
    return plan;
  }

  async update(id: number, dto: UpdatePlanDto, actor: OperationalActor) {
    const plan = await this.findOne(id, actor);
    if (!([PlanStatus.DRAFT, PlanStatus.REJECTED] as PlanStatus[]).includes(plan.status)) {
      throw new BadRequestException('Chỉ được sửa trực tiếp kế hoạch nháp hoặc bị từ chối.');
    }
    if (dto.unit) scopedUnit(actor, dto.unit);
    const { status: _status, ...data } = dto;
    return this.prisma.productionPlan.update({ where: { id }, data, include: planInclude });
  }

  private async transition(id: number, actor: OperationalActor, from: PlanStatus[], to: PlanStatus, reason?: string) {
    const plan = await this.findOne(id, actor);
    if (!from.includes(plan.status)) throw new BadRequestException(`Không thể chuyển kế hoạch từ ${plan.status} sang ${to}.`);
    const now = new Date();
    const timestamps: Prisma.ProductionPlanUpdateInput =
      to === PlanStatus.PENDING_APPROVAL ? { submittedAt: now } :
      to === PlanStatus.APPROVED ? { approvedAt: now, approvedBy: { connect: { id: actor.id } } } :
      to === PlanStatus.REJECTED ? { rejectedAt: now } :
      to === PlanStatus.COMPLETED ? { completedAt: now } :
      to === PlanStatus.CANCELLED ? { cancelledAt: now } : {};
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productionPlan.update({ where: { id }, data: { status: to, ...timestamps } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.PRODUCTION_PLAN, entityId: id, actorId: actor.id, action: `${plan.status}_TO_${to}`, oldValue: { status: plan.status }, newValue: { status: to }, reason } });
      return updated;
    });
  }

  submit(id: number, actor: OperationalActor) { return this.transition(id, actor, [PlanStatus.DRAFT, PlanStatus.ADJUSTED, PlanStatus.REJECTED], PlanStatus.PENDING_APPROVAL); }
  approve(id: number, actor: OperationalActor) { return this.transition(id, actor, [PlanStatus.PENDING_APPROVAL], PlanStatus.APPROVED); }
  reject(id: number, actor: OperationalActor, reason?: string) { if (!reason) throw new BadRequestException('Từ chối kế hoạch phải có lý do.'); return this.transition(id, actor, [PlanStatus.PENDING_APPROVAL], PlanStatus.REJECTED, reason); }
  start(id: number, actor: OperationalActor) { return this.transition(id, actor, [PlanStatus.APPROVED], PlanStatus.IN_PROGRESS); }
  complete(id: number, actor: OperationalActor) { return this.transition(id, actor, [PlanStatus.IN_PROGRESS], PlanStatus.COMPLETED); }
  cancel(id: number, actor: OperationalActor, reason?: string) { return this.transition(id, actor, [PlanStatus.DRAFT, PlanStatus.PENDING_APPROVAL, PlanStatus.APPROVED, PlanStatus.ADJUSTED, PlanStatus.REJECTED], PlanStatus.CANCELLED, reason); }

  async adjust(id: number, dto: AdjustPlanDto, actor: OperationalActor) {
    const plan = await this.findOne(id, actor);
    if (!([PlanStatus.APPROVED, PlanStatus.IN_PROGRESS] as PlanStatus[]).includes(plan.status)) throw new BadRequestException('Chỉ điều chỉnh kế hoạch đã duyệt hoặc đang thực hiện.');
    const { reason, status: _status, ...changes } = dto;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productionPlan.update({ where: { id }, data: { ...changes, status: PlanStatus.PENDING_APPROVAL, submittedAt: new Date() } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.PRODUCTION_PLAN, entityId: id, actorId: actor.id, action: 'ADJUST_AND_RESUBMIT', oldValue: plan, newValue: updated, reason } });
      return updated;
    });
  }

  async createItem(planId: number, dto: CreatePlanItemDto, actor: OperationalActor) {
    const plan = await this.findOne(planId, actor);
    if (!([PlanStatus.DRAFT, PlanStatus.REJECTED] as PlanStatus[]).includes(plan.status)) throw new BadRequestException('Chỉ thêm hạng mục khi kế hoạch còn nháp hoặc bị từ chối.');
    return this.prisma.productionPlanItem.create({ data: { ...dto, planId }, include: { vehicleType: true } });
  }

  async updateItem(planId: number, itemId: number, dto: Partial<CreatePlanItemDto>, actor: OperationalActor) {
    const plan = await this.findOne(planId, actor);
    if (!([PlanStatus.DRAFT, PlanStatus.REJECTED] as PlanStatus[]).includes(plan.status)) throw new BadRequestException('Hạng mục sau duyệt chỉ được thay đổi qua quy trình điều chỉnh có lý do.');
    const item = await this.prisma.productionPlanItem.findFirst({ where: { id: itemId, planId } });
    if (!item) throw new NotFoundException(`Không tìm thấy hạng mục #${itemId}.`);
    return this.prisma.productionPlanItem.update({ where: { id: itemId }, data: dto });
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
  async remove(id: number, actor: OperationalActor) { const plan = await this.findOne(id, actor); if (plan.status !== PlanStatus.DRAFT) throw new BadRequestException('Chỉ xóa vật lý kế hoạch nháp.'); return this.prisma.productionPlan.delete({ where: { id } }); }
}
