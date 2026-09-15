import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { AlertCategory, AlertSeverity, DispatchSourceType, DispatchStatus, DriverEmploymentStatus, DriverKpiEventType, DriverShiftStatus, EquipmentUsageMode, ImplementRequirement, ImplementStatus, OperationalEntityType, PlanType, Prisma, Role, TechnicalCondition, TransportStatus, VehicleOperationalDomain, VehicleStatus, WorkAssignmentMode, WorkAssignmentStatus, WorkOrderCategory, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { assertOperationalAccess, OperationalActor, scopedUnit } from '../common/utils/operational-access';
import { DISPATCH_DELAY_SCAN_INTERVAL_MS, DISPATCH_FIRST_DELAY_MINUTES, DISPATCH_REOPEN_TOTAL_MINUTES } from '../common/constants/dispatch-delay-policy';
import { PrismaService } from '../prisma/prisma.service';
import { AssignDispatchDto } from './dto/assign-dispatch.dto';
import { AvailableResourcesDto } from './dto/available-resources.dto';
import { CreateDispatchOrderDto } from './dto/create-dispatch-order.dto';
import { DispatchFilterDto } from './dto/dispatch-filter.dto';
import { UpdateDispatchOrderDto } from './dto/update-dispatch-order.dto';
import { BatchRescheduleDispatchDto, RescheduleDispatchDto } from './dto/reschedule-dispatch.dto';
import { RetroactiveCompleteDto } from './dto/retroactive-complete.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { AlertsService } from '../alerts/alerts.service';

const dispatchInclude = {
  requester: { select: { id: true, fullName: true, role: true } },
  vehicle: { include: { vehicleType: true, homeDepot: true } },
  originLocation: true,
  destinationLocation: true,
  driver: { select: { id: true, fullName: true, phone: true, licenseClass: true, licenseExpiryDate: true, healthCheckExpiryDate: true } },
  implement: true,
  productionOrder: {
    include: {
      plan: { select: { id: true, code: true, title: true, planType: true, notes: true, complexCode: true, complexName: true, unit: true } },
      planItem: { select: { id: true, jobCode: true, jobName: true, notes: true, vehicleTypeId: true, implementGroup: true } },
    },
  },
  approvedBy: { select: { id: true, fullName: true } },
  assignedBy: { select: { id: true, fullName: true } },
  acceptedBy: { select: { id: true, fullName: true } },
  confirmations: true,
  operationalWorkOrder: true,
} satisfies Prisma.DispatchOrderInclude;

const ACTIVE_DISPATCH = [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.AT_WORKSITE, DispatchStatus.WORKING, DispatchStatus.RETURNING_TO_DEPOT];
const ACTIVE_TRANSPORT = [TransportStatus.ASSIGNED, TransportStatus.DRIVER_ACCEPTED, TransportStatus.AT_PICKUP, TransportStatus.LOADING, TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT, TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING, TransportStatus.RETURNING_TO_DEPOT, TransportStatus.AT_DEPOT];
const DISPATCH_MANAGEMENT_ATTENTION_STATUSES: DispatchStatus[] = [DispatchStatus.DRAFT, DispatchStatus.PENDING_APPROVAL, DispatchStatus.APPROVED];
const DISPATCH_DEPARTURE_DELAY_STATUSES: DispatchStatus[] = [DispatchStatus.APPROVED, DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED];
const DISPATCH_AWAITING_APPROVAL_STATUSES: DispatchStatus[] = [DispatchStatus.DRAFT, DispatchStatus.PENDING_APPROVAL];
const DISPATCH_SUMMARY_STATUSES: DispatchStatus[] = Array.from(new Set([
  ...DISPATCH_MANAGEMENT_ATTENTION_STATUSES,
  ...DISPATCH_DEPARTURE_DELAY_STATUSES,
]));

@Injectable()
export class DispatchOrdersService implements OnModuleInit, OnModuleDestroy {
  private delayScanTimer?: ReturnType<typeof setInterval>;

  constructor(
    private prisma: PrismaService,
    @Optional() private workOrders?: WorkOrdersService,
    @Optional() private alerts?: AlertsService,
  ) {}

  onModuleInit() {
    void this.checkDelayedOrders().catch((error) => {
      console.error('[DispatchDelayWorker] Không thể quét lệnh trễ khi khởi động:', error);
    });
    this.delayScanTimer = setInterval(() => {
      void this.checkDelayedOrders().catch((error) => {
        console.error('[DispatchDelayWorker] Không thể quét lệnh trễ:', error);
      });
    }, DISPATCH_DELAY_SCAN_INTERVAL_MS);
    this.delayScanTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.delayScanTimer) clearInterval(this.delayScanTimer);
  }

  async create(dto: CreateDispatchOrderDto, actor: OperationalActor) {
    if (!actor?.id) throw new BadRequestException('Tạo lệnh điều xe yêu cầu người dùng đã đăng nhập.');
    const sourceType = dto.sourceType ?? DispatchSourceType.MANUAL_EXCEPTION;
    if (sourceType !== DispatchSourceType.MANUAL_EXCEPTION || !dto.exceptionReason?.trim()) {
      throw new BadRequestException('Lệnh tạo ngoài kế hoạch phải có nguồn MANUAL_EXCEPTION và lý do phát sinh.');
    }
    if (dto.operationDomain !== VehicleOperationalDomain.AGRICULTURE && dto.operationDomain !== VehicleOperationalDomain.CONSTRUCTION) {
      throw new BadRequestException('Lệnh điều xe thủ công phải chọn miền Nông nghiệp hoặc Công trình.');
    }
    const existing = await this.prisma.dispatchOrder.findUnique({
      where: { code: dto.code },
      include: dispatchInclude,
    });
    const unit = scopedUnit(actor, dto.unit) ?? dto.unit;
    const { planNotes, taskNotes, exceptionReason, ...restDto } = dto;
    let finalNotes = restDto.notes;
    if (planNotes || taskNotes) {
      const parts: string[] = [];
      if (planNotes) parts.push(`[Ghi chú kế hoạch]: ${planNotes}`);
      if (taskNotes) parts.push(`[Ghi chú công việc]: ${taskNotes}`);
      if (restDto.notes && !parts.some((p) => restDto.notes?.includes(p))) {
        parts.push(restDto.notes);
      }
      finalNotes = parts.join('\n');
    }

    if (existing) {
      throw new ConflictException(`Lệnh điều xe mã ${dto.code} đã tồn tại.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const matchedOrigin = restDto.originLocationId ? null : await tx.operationalLocation.findFirst({ where: { name: restDto.origin, active: true } });
      const matchedDestination = restDto.destinationLocationId ? null : await tx.operationalLocation.findFirst({ where: { name: restDto.destination, active: true } });
      const order = await tx.dispatchOrder.create({
        data: { ...restDto, originLocationId: restDto.originLocationId ?? matchedOrigin?.id, destinationLocationId: restDto.destinationLocationId ?? matchedDestination?.id, sourceType, notes: finalNotes, unit, requesterId: actor.id, status: DispatchStatus.DRAFT },
        include: dispatchInclude,
      });
      if (order.departureTime && order.plannedEndTime) {
        await tx.operationalWorkOrder.create({ data: { type: WorkOrderType.DISPATCH, unit, category: restDto.operationDomain === VehicleOperationalDomain.CONSTRUCTION ? WorkOrderCategory.CONSTRUCTION : WorkOrderCategory.AGRICULTURE, sourceType, jobName: order.purpose, workLocationText: order.destination, assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT, status: WorkOrderStatus.DRAFT, plannedStartAt: order.departureTime, plannedEndAt: order.plannedEndTime, dispatchOrderId: order.id, createdById: actor.id } });
      }
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.DISPATCH_ORDER, entityId: order.id, actorId: actor.id, action: 'CREATE_MANUAL_EXCEPTION', newValue: { status: order.status, sourceType }, reason: exceptionReason } });
      return order;
    });
  }

  async findAll(filter: DispatchFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20, search, unit, status, isDelayed, planId, planType, year, weekNumber } = filter;
    const where: Prisma.DispatchOrderWhereInput = {};
    if (actor?.role === Role.DRIVER) where.driverId = actor.id;
    else { const effectiveUnit = scopedUnit(actor, unit); if (effectiveUnit) where.unit = effectiveUnit; }
    if (status) where.status = status;
    else where.status = { not: DispatchStatus.CANCELLED };
    if (isDelayed !== undefined) where.isDelayed = isDelayed;
    if (planId || planType || year || weekNumber) {
      const plan: Prisma.ProductionPlanWhereInput = {};
      if (planId) plan.id = planId;
      if (planType) plan.planType = planType;
      if (weekNumber) plan.weekNumber = weekNumber;
      if (year) plan.startDate = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
      where.productionOrder = { is: { plan: { is: plan } } };
    }
    if (search) where.OR = [{ code: { contains: search } }, { purpose: { contains: search } }, { origin: { contains: search } }, { destination: { contains: search } }];
    const now = new Date();
    const departureDelayThreshold = new Date(now.getTime() - DISPATCH_FIRST_DELAY_MINUTES * 60 * 1000);
    const [total, items] = await Promise.all([
      this.prisma.dispatchOrder.count({ where }),
      this.prisma.dispatchOrder.findMany({ where, skip: (page - 1) * limit, take: limit, include: dispatchInclude, orderBy: [{ departureTime: 'desc' }, { createdAt: 'desc' }] }),
    ]);
    // Bổ sung flag isOverdue tính thực tế để frontend biết lệnh đã qua thời điểm xuất phát
    const enriched = items.map((o) => ({
      ...o,
      needsAttention: !!o.departureTime && o.departureTime < now && !o.actualDepartureTime && DISPATCH_MANAGEMENT_ATTENTION_STATUSES.includes(o.status),
      isOverdue: o.isDelayed || (!!o.departureTime && o.departureTime <= departureDelayThreshold && !o.actualDepartureTime && DISPATCH_DEPARTURE_DELAY_STATUSES.includes(o.status)),
    }));
    return { items: enriched, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, actor: OperationalActor) {
    const order = await this.prisma.dispatchOrder.findUnique({ where: { id }, include: dispatchInclude });
    if (!order) throw new NotFoundException(`Không tìm thấy lệnh điều xe #${id}`);
    assertOperationalAccess(actor, order.unit, order.driverId);
    return order;
  }

  async update(id: number, dto: UpdateDispatchOrderDto, actor: OperationalActor) {
    const order = await this.findOne(id, actor);
    if (!([DispatchStatus.DRAFT, DispatchStatus.REJECTED] as DispatchStatus[]).includes(order.status)) throw new BadRequestException('Chỉ sửa trực tiếp lệnh nháp hoặc bị từ chối.');
    if (dto.unit) scopedUnit(actor, dto.unit);
    const { planNotes, taskNotes, exceptionReason: _exceptionReason, ...restDto } = dto;
    let finalNotes = restDto.notes;
    if (planNotes !== undefined || taskNotes !== undefined) {
      const parts: string[] = [];
      if (planNotes) parts.push(`[Ghi chú kế hoạch]: ${planNotes}`);
      if (taskNotes) parts.push(`[Ghi chú công việc]: ${taskNotes}`);
      if (restDto.notes && !parts.some((p) => restDto.notes?.includes(p))) {
        parts.push(restDto.notes);
      }
      finalNotes = parts.join('\n');
    }
    return this.prisma.dispatchOrder.update({
      where: { id },
      data: { ...restDto, ...(finalNotes !== undefined ? { notes: finalNotes } : {}) },
      include: dispatchInclude,
    });
  }

  private conflict(reasons: Array<Record<string, unknown>>): never {
    const businessCodes = new Set([
      'VEHICLE_DOMAIN_MISMATCH',
      'VEHICLE_TYPE_UNCONFIGURED',
      'IMPLEMENT_REQUIRED',
      'IMPLEMENT_NOT_ALLOWED',
      'IMPLEMENT_INCOMPATIBLE',
    ]);
    const primaryCode = reasons
      .map((reason) => String(reason.rule || ''))
      .find((rule) => businessCodes.has(rule));
    throw new ConflictException({ code: primaryCode || 'RESOURCE_CONFLICT', reasons });
  }

  private async resourceContext(dispatchOrderId?: number, transportOrderId?: number) {
    if (transportOrderId) {
      const order = await this.prisma.transportOrder.findUnique({ where: { id: transportOrderId }, select: { id: true, unit: true } });
      return order ? { domain: VehicleOperationalDomain.TRANSPORT, vehicleTypeId: undefined, unit: order.unit } : null;
    }
    if (!dispatchOrderId) return null;
    const order = await this.prisma.dispatchOrder.findUnique({
      where: { id: dispatchOrderId },
      select: {
        operationDomain: true,
        unit: true,
        productionOrder: { select: { plan: { select: { planType: true } }, planItem: { select: { vehicleTypeId: true } } } },
      },
    });
    if (!order) return null;
    const planType = order.productionOrder?.plan.planType;
    const domain = order.operationDomain
      ?? (planType === PlanType.CONSTRUCTION ? VehicleOperationalDomain.CONSTRUCTION
        : planType === PlanType.INTERNAL_TRANSPORT ? VehicleOperationalDomain.TRANSPORT
          : planType === PlanType.AGRICULTURE ? VehicleOperationalDomain.AGRICULTURE : undefined);
    return { domain, vehicleTypeId: order.productionOrder?.planItem?.vehicleTypeId ?? undefined, unit: order.unit };
  }

  async validateResources(input: AssignDispatchDto, excludeDispatchId?: number, excludeTransportId?: number) {
    if (input.plannedEndTime <= input.departureTime) return [{ resourceType: 'SCHEDULE', rule: 'INVALID_WINDOW', message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' }];
    const context = await this.resourceContext(excludeDispatchId, excludeTransportId);
    const [vehicle, driver, dispatchVehicle, dispatchDriver, transportVehicle, transportDriver, implement, dispatchImplement, transportImplement] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { id: input.vehicleId }, include: { vehicleType: true } }),
      this.prisma.user.findUnique({ where: { id: input.driverId }, include: { driverProfile: true } }),
      this.prisma.dispatchOrder.findFirst({ where: { id: { not: excludeDispatchId }, vehicleId: input.vehicleId, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
      this.prisma.dispatchOrder.findFirst({ where: { id: { not: excludeDispatchId }, driverId: input.driverId, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
      this.prisma.transportOrder.findFirst({ where: { id: { not: excludeTransportId }, vehicleId: input.vehicleId, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
      this.prisma.transportOrder.findFirst({ where: { id: { not: excludeTransportId }, driverId: input.driverId, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
      input.implementId ? this.prisma.agriculturalImplement.findUnique({ where: { id: input.implementId }, include: { compatibleVehicleTypes: true } }) : null,
      input.implementId ? this.prisma.dispatchOrder.findFirst({ where: { id: { not: excludeDispatchId }, implementId: input.implementId, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }) : null,
      input.implementId ? this.prisma.transportOrder.findFirst({ where: { id: { not: excludeTransportId }, trailerId: input.implementId, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }) : null,
    ]);
    const reasons: Array<Record<string, unknown>> = [];
    if (!vehicle) reasons.push({ resourceType: 'VEHICLE', resourceId: input.vehicleId, rule: 'NOT_FOUND', message: 'Không tìm thấy xe.' });
    else {
      const validStatuses = new Set<VehicleStatus>([VehicleStatus.CHO_PHAN_CONG, VehicleStatus.HOAT_DONG]);
      if (!validStatuses.has(vehicle.status)) reasons.push({ resourceType: 'VEHICLE', resourceId: vehicle.id, rule: 'STATUS', message: `Xe đang ở trạng thái ${vehicle.status}.` });
      if (!vehicle.vehicleType || !vehicle.vehicleType.isAssignable || !vehicle.vehicleType.operationalDomain) {
        reasons.push({ resourceType: 'VEHICLE', resourceId: vehicle.id, rule: 'VEHICLE_TYPE_UNCONFIGURED', message: 'Xe chưa có chủng loại vận hành hợp lệ.' });
      } else {
        if (context?.domain && vehicle.vehicleType.operationalDomain !== context.domain) {
          reasons.push({ resourceType: 'VEHICLE', resourceId: vehicle.id, rule: 'VEHICLE_DOMAIN_MISMATCH', message: `Xe thuộc miền ${vehicle.vehicleType.operationalDomain}, không phù hợp lệnh ${context.domain}.` });
        }
        if (context?.vehicleTypeId && vehicle.vehicleTypeId !== context.vehicleTypeId) {
          reasons.push({ resourceType: 'VEHICLE', resourceId: vehicle.id, rule: 'VEHICLE_TYPE_MISMATCH', message: 'Xe không đúng chủng loại được chỉ định trong kế hoạch.' });
        }
        if (vehicle.vehicleType.implementRequirement === ImplementRequirement.REQUIRED && !input.implementId) {
          reasons.push({ resourceType: 'IMPLEMENT', rule: 'IMPLEMENT_REQUIRED', message: `${vehicle.vehicleType.name} bắt buộc có thiết bị gắn kèm.` });
        }
        if (vehicle.vehicleType.implementRequirement === ImplementRequirement.NONE && input.implementId) {
          reasons.push({ resourceType: 'IMPLEMENT', resourceId: input.implementId, rule: 'IMPLEMENT_NOT_ALLOWED', message: `${vehicle.vehicleType.name} không dùng thiết bị rời.` });
        }
      }
      const reqLic = vehicle.vehicleType?.requiredLicenseClass;
      const driverLic = (driver?.driverProfile?.licenseClass || driver?.licenseClass || '').toUpperCase();
      if (reqLic) {
        if (reqLic === 'HANG_B2' || vehicle.vehicleType?.operationalDomain === VehicleOperationalDomain.AGRICULTURE) {
          const notesLower = String(driver?.notes || '').toLowerCase();
          const hasB = driverLic.includes('B2') || driverLic.includes('B1') || driverLic === 'HANG_B' || driverLic.includes('HẠNG B') || driverLic.includes('A4') || driverLic.includes('NONG_NGHIEP');
          const hasAddB = notesLower.includes('b2') || notesLower.includes('b1') || notesLower.includes('hạng b') || notesLower.includes('máy cày') || notesLower.includes('máy kéo');
          if (!hasB && !hasAddB) {
            reasons.push({ resourceType: 'DRIVER', resourceId: input.driverId, rule: 'LICENSE_CLASS', message: `GPLX ${driverLic || 'chưa có'} không phù hợp yêu cầu lái máy nông nghiệp.` });
          }
        } else if (reqLic !== driverLic) {
          reasons.push({ resourceType: 'DRIVER', resourceId: input.driverId, rule: 'LICENSE_CLASS', message: `GPLX ${driverLic || 'chưa có'} không phù hợp yêu cầu ${reqLic}.` });
        }
      }
    }
    if (!driver) reasons.push({ resourceType: 'DRIVER', resourceId: input.driverId, rule: 'NOT_FOUND', message: 'Không tìm thấy tài xế.' });
    else {
      const shiftStatus = driver.driverProfile?.currentShiftStatus ?? driver.currentShiftStatus;
      if (driver.role !== Role.DRIVER || driver.employmentStatus !== DriverEmploymentStatus.DANG_LAM_VIEC || (shiftStatus && shiftStatus !== DriverShiftStatus.SAN_SANG)) {
        reasons.push({ resourceType: 'DRIVER', resourceId: driver.id, rule: 'STATUS', message: 'Tài xế không ở trạng thái sẵn sàng làm việc.' });
      }
      const licExp = driver.driverProfile?.licenseExpiryDate || driver.licenseExpiryDate;
      const healthExp = driver.driverProfile?.healthCheckExpiryDate || driver.healthCheckExpiryDate;
      if (!licExp || licExp < input.departureTime) reasons.push({ resourceType: 'DRIVER', resourceId: driver.id, rule: 'LICENSE_EXPIRED', message: 'GPLX thiếu thông tin hoặc hết hạn tại thời điểm thực hiện.' });
      if (!healthExp || healthExp < input.departureTime) reasons.push({ resourceType: 'DRIVER', resourceId: driver.id, rule: 'HEALTH_EXPIRED', message: 'Giấy khám sức khỏe thiếu thông tin hoặc hết hạn.' });
    }
    if (dispatchVehicle || transportVehicle) reasons.push({ resourceType: 'VEHICLE', resourceId: input.vehicleId, rule: 'SCHEDULE_OVERLAP', message: 'Xe bị trùng lịch điều xe hoặc vận chuyển.' });
    if (dispatchDriver || transportDriver) reasons.push({ resourceType: 'DRIVER', resourceId: input.driverId, rule: 'SCHEDULE_OVERLAP', message: 'Tài xế bị trùng lịch.' });
    if (input.implementId) {
      if (!implement) reasons.push({ resourceType: 'IMPLEMENT', resourceId: input.implementId, rule: 'NOT_FOUND', message: 'Không tìm thấy nông cụ hoặc thiết bị phụ trợ.' });
      else if (implement.status === ImplementStatus.MAINTENANCE || implement.technicalCondition !== TechnicalCondition.GOOD) {
        reasons.push({ resourceType: 'IMPLEMENT', resourceId: implement.id, rule: 'STATUS', message: 'Nông cụ đang bảo trì, hư hỏng hoặc không đủ điều kiện vận hành.' });
      } else if (implement.usageMode !== EquipmentUsageMode.ATTACHABLE) {
        reasons.push({ resourceType: 'IMPLEMENT', resourceId: implement.id, rule: 'IMPLEMENT_NOT_ATTACHABLE', message: 'Thiết bị không phải loại gắn kèm hoặc chưa được phân loại.' });
      } else if (vehicle?.vehicleTypeId && !implement.compatibleVehicleTypes.some((item) => item.vehicleTypeId === vehicle.vehicleTypeId)) {
        reasons.push({ resourceType: 'IMPLEMENT', resourceId: implement.id, rule: 'IMPLEMENT_INCOMPATIBLE', message: `Thiết bị không tương thích với chủng loại xe ${vehicle.vehicleType?.name ?? vehicle.code}.` });
      }
      if (dispatchImplement || transportImplement) reasons.push({ resourceType: 'IMPLEMENT', resourceId: input.implementId, rule: 'SCHEDULE_OVERLAP', message: 'Nông cụ đã được phân công cho công việc khác trong cùng khung giờ.' });
    }
    return reasons;
  }

  async availableResources(query: AvailableResourcesDto, actor: OperationalActor) {
    const context = await this.resourceContext(query.dispatchOrderId ?? query.excludeDispatchId, query.transportOrderId ?? query.excludeTransportId);
    const requiredVehicleTypeId = query.vehicleTypeId ?? context?.vehicleTypeId;
    const [vehicles, drivers] = await Promise.all([
      this.prisma.vehicle.findMany({ where: {
        ...(requiredVehicleTypeId ? { vehicleTypeId: requiredVehicleTypeId } : {}),
        vehicleType: { isAssignable: true, ...(context?.domain ? { operationalDomain: context.domain } : {}) },
        status: { in: [VehicleStatus.CHO_PHAN_CONG, VehicleStatus.HOAT_DONG] },
      }, include: { vehicleType: true } }),
      this.prisma.user.findMany({ where: { role: Role.DRIVER, isActive: true, employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC, currentShiftStatus: DriverShiftStatus.SAN_SANG }, select: { id: true, fullName: true, unit: true, licenseClass: true, licenseExpiryDate: true, healthCheckExpiryDate: true } }),
    ]);
    const availableVehicles = [];
    for (const vehicle of vehicles) {
      const busy = await this.prisma.dispatchOrder.findFirst({ where: { id: { not: query.excludeDispatchId }, vehicleId: vehicle.id, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: query.end }, plannedEndTime: { gt: query.start } } }) || await this.prisma.transportOrder.findFirst({ where: { id: { not: query.excludeTransportId }, vehicleId: vehicle.id, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: query.end }, plannedEndTime: { gt: query.start } } });
      if (!busy) availableVehicles.push(vehicle);
    }
    const availableDrivers = [];
    for (const driver of drivers) {
      const validDates = !!driver.licenseExpiryDate && driver.licenseExpiryDate >= query.start && !!driver.healthCheckExpiryDate && driver.healthCheckExpiryDate >= query.start;
      const busy = await this.prisma.dispatchOrder.findFirst({ where: { id: { not: query.excludeDispatchId }, driverId: driver.id, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: query.end }, plannedEndTime: { gt: query.start } } }) || await this.prisma.transportOrder.findFirst({ where: { id: { not: query.excludeTransportId }, driverId: driver.id, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: query.end }, plannedEndTime: { gt: query.start } } });
      if (validDates && !busy) availableDrivers.push(driver);
    }
    const vehicleTypeIds = [...new Set(availableVehicles.map((vehicle) => vehicle.vehicleTypeId).filter((id): id is number => !!id))];
    const implementsList = vehicleTypeIds.length
      ? await this.prisma.agriculturalImplement.findMany({
          where: {
            usageMode: EquipmentUsageMode.ATTACHABLE,
            status: { not: ImplementStatus.MAINTENANCE },
            technicalCondition: TechnicalCondition.GOOD,
            compatibleVehicleTypes: { some: { vehicleTypeId: { in: vehicleTypeIds } } },
          },
          include: { compatibleVehicleTypes: true },
          orderBy: { code: 'asc' },
        })
      : [];
    return { vehicles: availableVehicles, drivers: availableDrivers, implements: implementsList, context };
  }

  async assign(id: number, dto: AssignDispatchDto, actor: OperationalActor) {
    const order = await this.findOne(id, actor);
    const assignableStatuses: DispatchStatus[] = [DispatchStatus.DRAFT, DispatchStatus.REJECTED, DispatchStatus.PENDING_APPROVAL, DispatchStatus.APPROVED];
    if (!assignableStatuses.includes(order.status)) {
      throw new BadRequestException('Chỉ phân công lệnh ở trạng thái chờ duyệt hoặc đã duyệt.');
    }
    const reasons = await this.validateResources(dto, id);
    if (reasons.length) this.conflict(reasons);
    const workOrder = order.operationalWorkOrder ?? await this.prisma.operationalWorkOrder.create({
      data: { type: WorkOrderType.DISPATCH, unit: order.unit, category: order.operationDomain === VehicleOperationalDomain.CONSTRUCTION ? WorkOrderCategory.CONSTRUCTION : WorkOrderCategory.AGRICULTURE, sourceType: order.sourceType, jobName: order.purpose, workLocationId: order.destinationLocationId, workLocationText: order.destination, status: WorkOrderStatus.APPROVED, plannedStartAt: dto.departureTime, plannedEndAt: dto.plannedEndTime, dispatchOrderId: id, createdById: order.requesterId, approvedById: actor.id, approvedAt: new Date() },
    });
    if (!this.workOrders) throw new BadRequestException('Work order orchestration chưa sẵn sàng.');
    await this.workOrders.ensureApprovedForAssignment(workOrder.id, actor);
    await this.workOrders.assign(workOrder.id, { vehicleId: dto.vehicleId, driverId: dto.driverId, assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT, plannedStartAt: dto.departureTime, plannedEndAt: dto.plannedEndTime }, actor);
    await this.prisma.dispatchOrder.update({ where: { id }, data: { implementId: dto.implementId ?? null, ...(!order.approvedAt ? { approvedAt: new Date(), approvedById: actor.id } : {}) } });
    return this.findOne(id, actor);
  }

  private async transition(id: number, actor: OperationalActor, from: DispatchStatus[], to: DispatchStatus, reason?: string) {
    const order = await this.findOne(id, actor);
    if (!from.includes(order.status)) throw new BadRequestException(`Không thể chuyển lệnh từ ${order.status} sang ${to}.`);
    if (to === DispatchStatus.DRIVER_ACCEPTED && actor.id !== order.driverId) throw new BadRequestException('Chỉ tài xế được giao mới được xác nhận lệnh.');
    const now = new Date();
    const data: Prisma.DispatchOrderUpdateInput = { status: to };
    if (to === DispatchStatus.PENDING_APPROVAL) data.submittedAt = now;
    if (to === DispatchStatus.APPROVED) { data.approvedAt = now; data.approvedBy = { connect: { id: actor.id } }; }
    if (to === DispatchStatus.REJECTED) data.rejectionReason = reason;
    if (to === DispatchStatus.DRIVER_ACCEPTED) data.driverAcceptedAt = now;
    if (to === DispatchStatus.DEPARTED) data.actualDepartureTime = now;
    if (to === DispatchStatus.WORKING) data.actualStartTime = now;
    if (to === DispatchStatus.COMPLETED) { data.actualCompletedTime = now; data.returnTime = now; }
    if (to === DispatchStatus.ACCEPTED) { data.acceptedAt = now; data.acceptedBy = { connect: { id: actor.id } }; }
    if (to === DispatchStatus.CLOSED) data.closedAt = now;
    if (to === DispatchStatus.CANCELLED) data.cancelledAt = now;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dispatchOrder.update({ where: { id }, data });
      if (to === DispatchStatus.WORKING && order.vehicleId) await tx.vehicle.update({ where: { id: order.vehicleId }, data: { status: VehicleStatus.HOAT_DONG } });
      if (to === DispatchStatus.COMPLETED) {
        if (order.vehicleId) await tx.vehicle.update({ where: { id: order.vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG } });
        if (order.driverId) await tx.user.update({ where: { id: order.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
      }
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.DISPATCH_ORDER, entityId: id, actorId: actor.id, action: `${order.status}_TO_${to}`, oldValue: { status: order.status }, newValue: { status: to }, reason } });
      if (order.operationalWorkOrder) {
        const workStatus: Partial<Record<DispatchStatus, WorkOrderStatus>> = {
          PENDING_APPROVAL: WorkOrderStatus.PENDING_APPROVAL, APPROVED: WorkOrderStatus.APPROVED,
          DRIVER_ACCEPTED: WorkOrderStatus.DRIVER_ACCEPTED, DEPARTED: WorkOrderStatus.IN_PROGRESS,
          WORKING: WorkOrderStatus.IN_PROGRESS, COMPLETED: WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE,
          ACCEPTED: WorkOrderStatus.ACCEPTED, CLOSED: WorkOrderStatus.CLOSED,
          REJECTED: WorkOrderStatus.REJECTED, CANCELLED: WorkOrderStatus.CANCELLED,
        };
        if (workStatus[to]) await tx.operationalWorkOrder.update({ where: { id: order.operationalWorkOrder.id }, data: { status: workStatus[to], version: { increment: 1 } } });
      }
      return updated;
    });
  }

  submit(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.DRAFT, DispatchStatus.REJECTED], DispatchStatus.PENDING_APPROVAL); }
  approve(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.PENDING_APPROVAL], DispatchStatus.APPROVED); }
  reject(id: number, actor: OperationalActor, reason?: string) { if (!reason) throw new BadRequestException('Từ chối lệnh phải có lý do.'); return this.transition(id, actor, [DispatchStatus.PENDING_APPROVAL], DispatchStatus.REJECTED, reason); }
  driverAccept(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.ASSIGNED], DispatchStatus.DRIVER_ACCEPTED); }
  depart(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.DRIVER_ACCEPTED], DispatchStatus.DEPARTED); }
  start(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.DEPARTED], DispatchStatus.WORKING); }
  complete(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.WORKING], DispatchStatus.COMPLETED); }
  accept(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.COMPLETED], DispatchStatus.ACCEPTED); }
  close(id: number, actor: OperationalActor) { return this.transition(id, actor, [DispatchStatus.ACCEPTED], DispatchStatus.CLOSED); }
  cancel(id: number, actor: OperationalActor, reason?: string) { return this.transition(id, actor, [DispatchStatus.DRAFT, DispatchStatus.PENDING_APPROVAL, DispatchStatus.APPROVED, DispatchStatus.ASSIGNED], DispatchStatus.CANCELLED, reason); }

  async checkDelayedOrders(now = new Date()) {
    const warningThreshold = new Date(now.getTime() - DISPATCH_FIRST_DELAY_MINUTES * 60_000);
    const reopenThreshold = new Date(now.getTime() - DISPATCH_REOPEN_TOTAL_MINUTES * 60_000);
    const activeStatuses = [DispatchStatus.APPROVED, DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED];
    const reopenableStatuses = [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED];
    const reopenReason = `Hệ thống thu hồi phân công cũ và đưa lệnh vào danh sách mở: lệnh chưa xuất phát sau ${DISPATCH_REOPEN_TOTAL_MINUTES} phút (đã cảnh báo lúc ${DISPATCH_FIRST_DELAY_MINUTES} phút).`;

    const ordersToReopen = await this.prisma.dispatchOrder.findMany({
      where: {
        status: { in: reopenableStatuses },
        departureTime: { lte: reopenThreshold },
        actualDepartureTime: null,
        operationalWorkOrder: { is: { status: { not: WorkOrderStatus.OPEN_FOR_CLAIM } } },
      },
      select: {
        id: true,
        code: true,
        status: true,
        requesterId: true,
        assignedById: true,
        vehicleId: true,
        driverId: true,
        unit: true,
        destination: true,
        operationalWorkOrder: { select: { id: true, status: true } },
      },
    });

    let reopenedCount = 0;
    for (const order of ordersToReopen) {
      const reopened = await this.prisma.$transaction(async (tx) => {
        const result = await tx.dispatchOrder.updateMany({
          where: { id: order.id, status: { in: reopenableStatuses }, actualDepartureTime: null },
          data: {
            status: DispatchStatus.APPROVED,
            driverId: null,
            isDelayed: true,
            assignedAt: null,
          },
        });
        if (!result.count) return false;

        const auditActorId = order.assignedById ?? order.requesterId;
        if (order.operationalWorkOrder) {
          await tx.workDriverAssignment.updateMany({
            where: { workOrderId: order.operationalWorkOrder.id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } },
            data: { status: WorkAssignmentStatus.REASSIGNED, endAt: now, reason: reopenReason },
          });
          await tx.operationalWorkOrder.update({
            where: { id: order.operationalWorkOrder.id },
            data: { assignmentMode: WorkAssignmentMode.OPEN_ASSIGNMENT, status: WorkOrderStatus.OPEN_FOR_CLAIM, version: { increment: 1 } },
          });
          if (order.driverId) {
            await tx.driverKpiEvent.create({
              data: {
                driverId: order.driverId,
                workOrderId: order.operationalWorkOrder.id,
                type: DriverKpiEventType.REASSIGNED,
                payload: { triggeredBy: 'SYSTEM', reason: reopenReason },
              },
            });
          }
          await tx.workOrderEvent.create({
            data: {
              workOrderId: order.operationalWorkOrder.id,
              actorId: auditActorId,
              action: 'SYSTEM_REOPEN_DELAYED',
              oldStatus: order.operationalWorkOrder.status,
              newStatus: WorkOrderStatus.OPEN_FOR_CLAIM,
              reason: reopenReason,
              payload: { triggeredBy: 'SYSTEM', firstWarningMinutes: DISPATCH_FIRST_DELAY_MINUTES, reopenMinutes: DISPATCH_REOPEN_TOTAL_MINUTES },
            },
          });
        }
        await tx.operationalAuditLog.create({
          data: {
            entityType: OperationalEntityType.DISPATCH_ORDER,
            entityId: order.id,
            actorId: auditActorId,
            action: 'SYSTEM_REOPEN_DELAYED',
            oldValue: { status: order.status },
            newValue: { status: DispatchStatus.APPROVED, aggregateStatus: WorkOrderStatus.OPEN_FOR_CLAIM, driverId: null, triggeredBy: 'SYSTEM' },
            reason: reopenReason,
          },
        });
        await this.alerts?.emit({
          ruleCode: 'DISPATCH_REOPENED',
          dedupeKey: `DISPATCH:REOPEN:${order.id}`,
          sourceType: 'DispatchOrder',
          sourceId: String(order.id),
          category: AlertCategory.DISPATCH,
          alertType: 'DELAYED_DEPARTURE_REOPENED',
          severity: AlertSeverity.CRITICAL,
          title: `Lệnh ${order.code} đã chuyển sang danh sách mở`,
          message: reopenReason,
          location: order.destination,
          thresholdValue: DISPATCH_REOPEN_TOTAL_MINUTES,
          metricUnit: 'phút',
          targetUrl: `/lenh-dieu-xe/chi-tiet/${order.id}`,
          vehicleId: order.vehicleId ?? undefined,
          driverId: order.driverId ?? undefined,
          unit: order.unit,
          occurredAt: now,
        }, tx);
        return true;
      });
      if (reopened) reopenedCount += 1;
    }

    const warningOrders = await this.prisma.dispatchOrder.findMany({
      where: {
        status: { in: activeStatuses },
        departureTime: { lte: warningThreshold },
        actualDepartureTime: null,
        isDelayed: false,
      },
      select: {
        id: true,
        code: true,
        status: true,
        requesterId: true,
        assignedById: true,
        vehicleId: true,
        driverId: true,
        unit: true,
        destination: true,
      },
    });

    let warningCount = 0;
    for (const order of warningOrders) {
      const warned = await this.prisma.$transaction(async (tx) => {
        const result = await tx.dispatchOrder.updateMany({
          where: { id: order.id, status: { in: activeStatuses }, actualDepartureTime: null, isDelayed: false },
          data: { isDelayed: true },
        });
        if (!result.count) return false;
        const reason = `Lệnh chưa xuất phát sau ${DISPATCH_FIRST_DELAY_MINUTES} phút.`;
        await tx.operationalAuditLog.create({
          data: {
            entityType: OperationalEntityType.DISPATCH_ORDER,
            entityId: order.id,
            actorId: order.assignedById ?? order.requesterId,
            action: 'SYSTEM_DELAY_WARNING',
            oldValue: { status: order.status, isDelayed: false },
            newValue: { status: order.status, isDelayed: true, triggeredBy: 'SYSTEM' },
            reason,
          },
        });
        await this.alerts?.emit({
          ruleCode: 'DISPATCH_DELAYED',
          dedupeKey: `DISPATCH:DELAYED:${order.id}`,
          sourceType: 'DispatchOrder',
          sourceId: String(order.id),
          category: AlertCategory.DISPATCH,
          alertType: 'DELAYED_DEPARTURE',
          severity: AlertSeverity.WARNING,
          title: `Lệnh ${order.code} trễ giờ xuất phát`,
          message: reason,
          location: order.destination,
          thresholdValue: DISPATCH_FIRST_DELAY_MINUTES,
          metricUnit: 'phút',
          targetUrl: `/lenh-dieu-xe/chi-tiet/${order.id}`,
          vehicleId: order.vehicleId ?? undefined,
          driverId: order.driverId ?? undefined,
          unit: order.unit,
          occurredAt: now,
        }, tx);
        return true;
      });
      if (warned) warningCount += 1;
    }

    return { updatedCount: warningCount, warningCount, reopenedCount };
  }

  /** Dời lịch một lệnh điều xe quá hạn/tồn đọng.
   * Nếu Xe/Tài xế đã gán mà bị trùng lịch khung giờ mới → cảnh báo và reset về APPROVED (Chờ phân công lại).
   * Nếu không trùng → giữ nguyên Xe/Tài xế.
   */
  async reschedule(id: number, dto: RescheduleDispatchDto, actor: OperationalActor) {
    if (!actor?.id) throw new BadRequestException('Dời lịch yêu cầu người dùng đã đăng nhập.');
    if (dto.newPlannedEndTime <= dto.newDepartureTime) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    const order = await this.findOne(id, actor);
    const allowedStatuses: DispatchStatus[] = [DispatchStatus.APPROVED, DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED];
    if (!allowedStatuses.includes(order.status)) throw new BadRequestException(`Chỉ dời lịch lệnh ở trạng thái ${allowedStatuses.join(', ')}.`);
    const now = new Date();
    let resetAssignment = false;
    // Kiểm tra trùng lịch Xe/Tài xế với khung giờ mới (loại trừ chính lệnh này)
    if (order.vehicleId || order.driverId) {
      const conflictCheck: { resourceType: string; message: string }[] = [];
      if (order.vehicleId) {
        const vehicleConflict = await this.prisma.dispatchOrder.findFirst({
          where: { id: { not: id }, vehicleId: order.vehicleId, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: dto.newPlannedEndTime }, plannedEndTime: { gt: dto.newDepartureTime } },
        }) || await this.prisma.transportOrder.findFirst({
          where: { vehicleId: order.vehicleId, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: dto.newPlannedEndTime }, plannedEndTime: { gt: dto.newDepartureTime } },
        });
        if (vehicleConflict) conflictCheck.push({ resourceType: 'VEHICLE', message: 'Xe đã được phân công cho lịch khác trong khung giờ mới.' });
      }
      if (order.driverId) {
        const driverConflict = await this.prisma.dispatchOrder.findFirst({
          where: { id: { not: id }, driverId: order.driverId, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: dto.newPlannedEndTime }, plannedEndTime: { gt: dto.newDepartureTime } },
        }) || await this.prisma.transportOrder.findFirst({
          where: { driverId: order.driverId, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: dto.newPlannedEndTime }, plannedEndTime: { gt: dto.newDepartureTime } },
        });
        if (driverConflict) conflictCheck.push({ resourceType: 'DRIVER', message: 'Tài xế đã được phân công cho lịch khác trong khung giờ mới.' });
      }
      if (conflictCheck.length) resetAssignment = true;
    }
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.DispatchOrderUpdateInput = {
        departureTime: dto.newDepartureTime,
        plannedEndTime: dto.newPlannedEndTime,
        isDelayed: false,
      };
      if (resetAssignment) {
        updateData.status = DispatchStatus.APPROVED;
        updateData.vehicle = { disconnect: true };
        updateData.driver = { disconnect: true };
        updateData.implement = order.implementId ? { disconnect: true } : undefined;
      }
      const updated = await tx.dispatchOrder.update({ where: { id }, data: updateData, include: dispatchInclude });
      // Cập nhật WorkOrder tương ứng nếu tồn tại
      if (order.operationalWorkOrder) {
        await tx.operationalWorkOrder.update({
          where: { id: order.operationalWorkOrder.id },
          data: { plannedStartAt: dto.newDepartureTime, plannedEndAt: dto.newPlannedEndTime, version: { increment: 1 } },
        });
      }
      await tx.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.DISPATCH_ORDER, entityId: id, actorId: actor.id,
          action: 'RESCHEDULE',
          oldValue: { departureTime: order.departureTime, plannedEndTime: order.plannedEndTime, status: order.status },
          newValue: { departureTime: dto.newDepartureTime, plannedEndTime: dto.newPlannedEndTime, resetAssignment },
          reason: dto.reason,
        },
      });
      return { order: updated, resetAssignment, conflicts: resetAssignment ? ['Xe hoặc tài xế bị trùng lịch — đã reset về Chờ phân công.'] : [] };
    });
  }

  /** Dời lịch nhiều lệnh cùng lúc. Mỗi lệnh xử lý độc lập; lỗi không dừng cả batch. */
  async batchReschedule(dto: BatchRescheduleDispatchDto, actor: OperationalActor) {
    if (!actor?.id) throw new BadRequestException('Dời lịch yêu cầu người dùng đã đăng nhập.');
    const results: Array<{ id: number; success: boolean; resetAssignment?: boolean; error?: string }> = [];
    for (const id of dto.ids) {
      try {
        const result = await this.reschedule(id, { newDepartureTime: dto.newDepartureTime, newPlannedEndTime: dto.newPlannedEndTime, reason: dto.reason }, actor);
        results.push({ id, success: true, resetAssignment: result.resetAssignment });
      } catch (e: unknown) {
        results.push({ id, success: false, error: e instanceof Error ? e.message : 'Lỗi không xác định' });
      }
    }
    return { results, successCount: results.filter((r) => r.success).length, failCount: results.filter((r) => !r.success).length };
  }

  /** Nghiệm thu hồi tố: đánh dấu lệnh quá hạn là đã hoàn thành với thời gian thực tế được nhập tay.
   * Chỉ áp dụng cho lệnh ở trạng thái APPROVED, ASSIGNED, DRIVER_ACCEPTED (chưa bao giờ khởi động).
   * Thông tin bắt buộc: actualStartTime + actualCompletedTime. Khối lượng/giờ máy là tuỳ chọn (ghi vào notes).
   */
  async retroactiveComplete(id: number, dto: RetroactiveCompleteDto, actor: OperationalActor) {
    if (!actor?.id) throw new BadRequestException('Nghiệm thu hồi tố yêu cầu người dùng đã đăng nhập.');
    if (dto.actualCompletedTime <= dto.actualStartTime) throw new BadRequestException('Thời gian hoàn thành phải sau thời gian bắt đầu.');
    const order = await this.findOne(id, actor);
    const allowedStatuses: DispatchStatus[] = [DispatchStatus.APPROVED, DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED];
    if (!allowedStatuses.includes(order.status)) throw new BadRequestException(`Chỉ nghiệm thu hồi tố lệnh ở trạng thái ${allowedStatuses.join(', ')}.`);
    const additionalNotes: string[] = [];
    if (dto.actualMachineHours != null) additionalNotes.push(`[Giờ máy thực tế]: ${dto.actualMachineHours} giờ`);
    if (dto.actualQuantity != null) additionalNotes.push(`[Khối lượng thực tế]: ${dto.actualQuantity}`);
    if (dto.notes) additionalNotes.push(dto.notes);
    const appendedNotes = additionalNotes.length
      ? `${order.notes ? order.notes + '\n' : ''}[Nghiệm thu hồi tố bởi ${actor.id} lúc ${new Date().toISOString()}]\n${additionalNotes.join('\n')}`
      : order.notes;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dispatchOrder.update({
        where: { id },
        data: {
          status: DispatchStatus.CLOSED,
          isDelayed: false,
          actualStartTime: dto.actualStartTime,
          actualCompletedTime: dto.actualCompletedTime,
          actualDepartureTime: dto.actualStartTime,
          returnTime: dto.actualCompletedTime,
          acceptedAt: new Date(),
          acceptedById: actor.id,
          closedAt: new Date(),
          notes: appendedNotes,
        },
        include: dispatchInclude,
      });
      // Giải phóng xe và tài xế nếu đang gán
      if (order.vehicleId) await tx.vehicle.update({ where: { id: order.vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG } });
      if (order.driverId) await tx.user.update({ where: { id: order.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
      if (order.operationalWorkOrder) {
        await tx.operationalWorkOrder.update({
          where: { id: order.operationalWorkOrder.id },
          data: { status: WorkOrderStatus.CLOSED, version: { increment: 1 } },
        });
      }
      await tx.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.DISPATCH_ORDER, entityId: id, actorId: actor.id,
          action: 'RETROACTIVE_COMPLETE',
          oldValue: { status: order.status },
          newValue: { status: DispatchStatus.CLOSED, actualStartTime: dto.actualStartTime, actualCompletedTime: dto.actualCompletedTime },
          reason: dto.notes ?? 'Nghiệm thu hồi tố lệnh tồn đọng',
        },
      });
      return updated;
    });
  }

  /** Tóm tắt lệnh quá hạn theo trạng thái, dùng cho banner/badge trên giao diện. */
  async overdueSummary(actor: OperationalActor) {
    const unit = scopedUnit(actor, undefined);
    const now = new Date();
    const departureDelayThreshold = new Date(now.getTime() - DISPATCH_FIRST_DELAY_MINUTES * 60 * 1000);
    const whereBase: Prisma.DispatchOrderWhereInput = {
      ...(unit ? { unit } : {}),
      status: { in: DISPATCH_SUMMARY_STATUSES },
      departureTime: { lt: now },
      actualDepartureTime: null,
    };
    const attentionOrders = await this.prisma.dispatchOrder.findMany({
      where: whereBase,
      orderBy: { departureTime: 'asc' },
      select: { id: true, code: true, status: true, departureTime: true, vehicleId: true, driverId: true },
    });
    const managementAttentionOrders = attentionOrders.filter((order) => DISPATCH_MANAGEMENT_ATTENTION_STATUSES.includes(order.status));
    const delayedDepartureOrders = attentionOrders.filter((order) => DISPATCH_DEPARTURE_DELAY_STATUSES.includes(order.status) && !!order.departureTime && order.departureTime <= departureDelayThreshold);
    const statusCounts = new Map<DispatchStatus, number>();
    attentionOrders.forEach((order) => statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1));
    return {
      totalOverdue: delayedDepartureOrders.length,
      totalAttention: managementAttentionOrders.length,
      pendingAction: managementAttentionOrders.length,
      lateAwaitingAssignment: delayedDepartureOrders.filter((order) => order.status === DispatchStatus.APPROVED).length,
      lateAssigned: delayedDepartureOrders.filter((order) => order.status === DispatchStatus.ASSIGNED).length,
      lateAccepted: delayedDepartureOrders.filter((order) => order.status === DispatchStatus.DRIVER_ACCEPTED).length,
      missingVehicle: managementAttentionOrders.filter((order) => !order.vehicleId).length,
      missingDriver: managementAttentionOrders.filter((order) => !order.driverId).length,
      awaitingApproval: managementAttentionOrders.filter((order) => DISPATCH_AWAITING_APPROVAL_STATUSES.includes(order.status)).length,
      byStatus: Array.from(statusCounts, ([status, count]) => ({ status, count })),
      items: attentionOrders.slice(0, 10).map((order) => ({
        ...order,
        attentionType: delayedDepartureOrders.some((delayed) => delayed.id === order.id) ? 'DEPARTURE_DELAY' : 'MANAGEMENT_ACTION',
        missingVehicle: !order.vehicleId,
        missingDriver: !order.driverId,
      })),
    };
  }

  async remove(id: number, actor: OperationalActor) {
    const order = await this.findOne(id, actor);
    if (order.status !== DispatchStatus.DRAFT) throw new BadRequestException('Chỉ được hủy lệnh nháp qua API DELETE tương thích.');
    if (order.operationalWorkOrder && this.workOrders) {
      await this.workOrders.cancel(order.operationalWorkOrder.id, 'Hủy lệnh nháp qua API DELETE tương thích', actor);
      return this.findOne(id, actor);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dispatchOrder.update({ where: { id }, data: { status: DispatchStatus.CANCELLED, cancelledAt: new Date(), rejectionReason: 'Hủy lệnh nháp qua API DELETE tương thích' } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.DISPATCH_ORDER, entityId: id, actorId: actor.id, action: 'CANCEL', oldValue: { status: order.status }, newValue: { status: DispatchStatus.CANCELLED }, reason: 'Hủy lệnh nháp qua API DELETE tương thích' } });
      return updated;
    });
  }
}
