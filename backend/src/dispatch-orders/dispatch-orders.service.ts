import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DispatchStatus, DriverEmploymentStatus, DriverShiftStatus, OperationalEntityType, Prisma, Role, TransportStatus, VehicleStatus } from '@prisma/client';
import { assertOperationalAccess, OperationalActor, scopedUnit } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { AssignDispatchDto } from './dto/assign-dispatch.dto';
import { AvailableResourcesDto } from './dto/available-resources.dto';
import { CreateDispatchOrderDto } from './dto/create-dispatch-order.dto';
import { DispatchFilterDto } from './dto/dispatch-filter.dto';
import { UpdateDispatchOrderDto } from './dto/update-dispatch-order.dto';

const dispatchInclude = {
  requester: { select: { id: true, fullName: true, role: true } },
  vehicle: { include: { vehicleType: true } },
  driver: { select: { id: true, fullName: true, phone: true, licenseClass: true, licenseExpiryDate: true, healthCheckExpiryDate: true } },
  implement: true,
  productionOrder: true,
  approvedBy: { select: { id: true, fullName: true } },
  assignedBy: { select: { id: true, fullName: true } },
  acceptedBy: { select: { id: true, fullName: true } },
  confirmations: true,
} satisfies Prisma.DispatchOrderInclude;

const ACTIVE_DISPATCH = [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.WORKING];
const ACTIVE_TRANSPORT = [TransportStatus.ASSIGNED, TransportStatus.DRIVER_ACCEPTED, TransportStatus.AT_PICKUP, TransportStatus.LOADING, TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT, TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING];

@Injectable()
export class DispatchOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDispatchOrderDto, actor: OperationalActor) {
    if (await this.prisma.dispatchOrder.findUnique({ where: { code: dto.code } })) throw new ConflictException(`Lệnh điều xe mã ${dto.code} đã tồn tại.`);
    const unit = scopedUnit(actor, dto.unit) ?? dto.unit;
    return this.prisma.dispatchOrder.create({ data: { ...dto, unit, requesterId: actor.id, status: DispatchStatus.DRAFT }, include: dispatchInclude });
  }

  async findAll(filter: DispatchFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20, search, unit, status, isDelayed } = filter;
    const where: Prisma.DispatchOrderWhereInput = {};
    if (actor.role === Role.DRIVER) where.driverId = actor.id;
    else { const effectiveUnit = scopedUnit(actor, unit); if (effectiveUnit) where.unit = effectiveUnit; }
    if (status) where.status = status;
    if (isDelayed !== undefined) where.isDelayed = isDelayed;
    if (search) where.OR = [{ code: { contains: search } }, { purpose: { contains: search } }, { origin: { contains: search } }, { destination: { contains: search } }];
    const [total, items] = await Promise.all([
      this.prisma.dispatchOrder.count({ where }),
      this.prisma.dispatchOrder.findMany({ where, skip: (page - 1) * limit, take: limit, include: dispatchInclude, orderBy: [{ departureTime: 'desc' }, { createdAt: 'desc' }] }),
    ]);
    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
    return this.prisma.dispatchOrder.update({ where: { id }, data: dto, include: dispatchInclude });
  }

  private conflict(reasons: Array<Record<string, unknown>>): never {
    throw new ConflictException({ code: 'RESOURCE_CONFLICT', reasons });
  }

  async validateResources(input: AssignDispatchDto, excludeDispatchId?: number, excludeTransportId?: number) {
    if (input.plannedEndTime <= input.departureTime) return [{ resourceType: 'SCHEDULE', rule: 'INVALID_WINDOW', message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' }];
    const [vehicle, driver, dispatchVehicle, dispatchDriver, transportVehicle, transportDriver] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { id: input.vehicleId }, include: { vehicleType: true } }),
      this.prisma.user.findUnique({ where: { id: input.driverId } }),
      this.prisma.dispatchOrder.findFirst({ where: { id: { not: excludeDispatchId }, vehicleId: input.vehicleId, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
      this.prisma.dispatchOrder.findFirst({ where: { id: { not: excludeDispatchId }, driverId: input.driverId, status: { in: ACTIVE_DISPATCH }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
      this.prisma.transportOrder.findFirst({ where: { id: { not: excludeTransportId }, vehicleId: input.vehicleId, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
      this.prisma.transportOrder.findFirst({ where: { id: { not: excludeTransportId }, driverId: input.driverId, status: { in: ACTIVE_TRANSPORT }, departureTime: { lt: input.plannedEndTime }, plannedEndTime: { gt: input.departureTime } } }),
    ]);
    const reasons: Array<Record<string, unknown>> = [];
    if (!vehicle) reasons.push({ resourceType: 'VEHICLE', resourceId: input.vehicleId, rule: 'NOT_FOUND', message: 'Không tìm thấy xe.' });
    else {
      if (vehicle.status !== VehicleStatus.CHO_PHAN_CONG) reasons.push({ resourceType: 'VEHICLE', resourceId: vehicle.id, rule: 'STATUS', message: `Xe đang ở trạng thái ${vehicle.status}.` });
      if (vehicle.vehicleType?.requiredLicenseClass && vehicle.vehicleType.requiredLicenseClass !== driver?.licenseClass) reasons.push({ resourceType: 'DRIVER', resourceId: input.driverId, rule: 'LICENSE_CLASS', message: `GPLX không phù hợp yêu cầu ${vehicle.vehicleType.requiredLicenseClass}.` });
    }
    if (!driver) reasons.push({ resourceType: 'DRIVER', resourceId: input.driverId, rule: 'NOT_FOUND', message: 'Không tìm thấy tài xế.' });
    else {
      if (driver.role !== Role.DRIVER || driver.employmentStatus !== DriverEmploymentStatus.DANG_LAM_VIEC || driver.currentShiftStatus !== DriverShiftStatus.SAN_SANG) reasons.push({ resourceType: 'DRIVER', resourceId: driver.id, rule: 'STATUS', message: 'Tài xế không ở trạng thái sẵn sàng làm việc.' });
      if (!driver.licenseExpiryDate || driver.licenseExpiryDate < input.departureTime) reasons.push({ resourceType: 'DRIVER', resourceId: driver.id, rule: 'LICENSE_EXPIRED', message: 'GPLX thiếu thông tin hoặc hết hạn tại thời điểm thực hiện.' });
      if (!driver.healthCheckExpiryDate || driver.healthCheckExpiryDate < input.departureTime) reasons.push({ resourceType: 'DRIVER', resourceId: driver.id, rule: 'HEALTH_EXPIRED', message: 'Giấy khám sức khỏe thiếu thông tin hoặc hết hạn.' });
    }
    if (dispatchVehicle || transportVehicle) reasons.push({ resourceType: 'VEHICLE', resourceId: input.vehicleId, rule: 'SCHEDULE_OVERLAP', message: 'Xe bị trùng lịch điều xe hoặc vận chuyển.' });
    if (dispatchDriver || transportDriver) reasons.push({ resourceType: 'DRIVER', resourceId: input.driverId, rule: 'SCHEDULE_OVERLAP', message: 'Tài xế bị trùng lịch.' });
    return reasons;
  }

  async availableResources(query: AvailableResourcesDto, actor: OperationalActor) {
    const unit = scopedUnit(actor, query.unit);
    const [vehicles, drivers] = await Promise.all([
      this.prisma.vehicle.findMany({ where: { ...(unit ? { unit } : {}), ...(query.vehicleTypeId ? { vehicleTypeId: query.vehicleTypeId } : {}), status: VehicleStatus.CHO_PHAN_CONG }, include: { vehicleType: true } }),
      this.prisma.user.findMany({ where: { ...(unit ? { unit } : {}), role: Role.DRIVER, isActive: true, employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC, currentShiftStatus: DriverShiftStatus.SAN_SANG }, select: { id: true, fullName: true, unit: true, licenseClass: true, licenseExpiryDate: true, healthCheckExpiryDate: true } }),
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
    return { vehicles: availableVehicles, drivers: availableDrivers };
  }

  async assign(id: number, dto: AssignDispatchDto, actor: OperationalActor) {
    const order = await this.findOne(id, actor);
    if (order.status !== DispatchStatus.APPROVED) throw new BadRequestException('Chỉ phân công lệnh đã được duyệt.');
    const reasons = await this.validateResources(dto, id);
    if (reasons.length) this.conflict(reasons);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dispatchOrder.update({ where: { id }, data: { ...dto, status: DispatchStatus.ASSIGNED, assignedById: actor.id, assignedAt: new Date() } });
      await tx.user.update({ where: { id: dto.driverId }, data: { currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.DISPATCH_ORDER, entityId: id, actorId: actor.id, action: 'ASSIGN', newValue: { vehicleId: dto.vehicleId, driverId: dto.driverId } } });
      return updated;
    });
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

  async checkDelayedOrders() {
    const threshold = new Date(Date.now() - 30 * 60 * 1000);
    const delayed = await this.prisma.dispatchOrder.updateMany({ where: { status: { in: [DispatchStatus.APPROVED, DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED] }, departureTime: { lte: threshold }, actualDepartureTime: null, isDelayed: false }, data: { isDelayed: true } });
    return { updatedCount: delayed.count };
  }

  async remove(id: number, actor: OperationalActor) { const order = await this.findOne(id, actor); if (order.status !== DispatchStatus.DRAFT) throw new BadRequestException('Chỉ xóa vật lý lệnh nháp.'); return this.prisma.dispatchOrder.delete({ where: { id } }); }
}
