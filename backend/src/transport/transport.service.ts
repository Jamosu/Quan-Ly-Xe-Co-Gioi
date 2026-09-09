import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { DriverShiftStatus, OperationalEntityType, Prisma, Role, RouteType, TransportStatus, Unit, VehicleStatus, WorkAssignmentMode, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { utils as xlsxUtils } from 'xlsx';
import { OperationalActor, assertOperationalAccess, scopedUnit } from '../common/utils/operational-access';
import { DispatchOrdersService } from '../dispatch-orders/dispatch-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignTransportDto } from './dto/assign-transport.dto';
import { AvailableResourcesDto } from '../dispatch-orders/dto/available-resources.dto';
import { CreateTransportItemDto, CreateTransportOrderDto } from './dto/create-transport-order.dto';
import { ImportWorkbookDto } from './dto/import-workbook.dto';
import { SchedulerFilterDto } from './dto/scheduler-filter.dto';
import { TransportFilterDto } from './dto/transport-filter.dto';
import { UpdateReturnCargoDto } from './dto/update-return-cargo.dto';
import { UpdateTransportOrderDto } from './dto/update-transport-order.dto';
import { UpdateTransportTelemetryDto } from './dto/update-transport-telemetry.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';

const transportInclude = {
  vehicle: { include: { vehicleType: true } },
  driver: { select: { id: true, fullName: true, phone: true, licenseClass: true, licenseExpiryDate: true, healthCheckExpiryDate: true } },
  trailer: true,
  approvedBy: { select: { id: true, fullName: true } },
  items: { orderBy: { sourceRowNumber: 'asc' as const } },
  confirmations: true,
  operationalWorkOrder: true,
} satisfies Prisma.TransportOrderInclude;

type PreviewTrip = {
  sourceRowNumber: number; code: string; requestDate?: Date; executionDate?: Date; departureTime?: Date;
  vehicleRaw?: string; containerRaw?: string; driverRaw?: string; routeType: RouteType; transportMode?: string;
  palletCount?: number; trailerNote?: string; notes?: string; vehicleId?: number; driverId?: number; trailerId?: number;
  items: CreateTransportItemDto[];
};

@Injectable()
export class TransportService {
  constructor(private prisma: PrismaService, private dispatchService: DispatchOrdersService, @Optional() private workOrders?: WorkOrdersService) {}

  async create(dto: CreateTransportOrderDto, actor: OperationalActor) {
    if (await this.prisma.transportOrder.findUnique({ where: { code: dto.code } })) throw new ConflictException(`Vận đơn mã ${dto.code} đã tồn tại.`);
    const unit = scopedUnit(actor, dto.unit) ?? dto.unit;
    const { items, ...order } = dto;
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.transportOrder.create({ data: { ...order, unit, status: TransportStatus.DRAFT, items: items?.length ? { create: items } : undefined }, include: transportInclude });
      if (created.departureTime && created.plannedEndTime) {
        await tx.operationalWorkOrder.create({ data: { type: WorkOrderType.TRANSPORT, unit, assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT, status: WorkOrderStatus.DRAFT, plannedStartAt: created.departureTime, plannedEndAt: created.plannedEndTime, transportOrderId: created.id, createdById: actor.id } });
      }
      return created;
    });
  }

  async findAll(filter: TransportFilterDto, actor?: OperationalActor) {
    const { page = 1, limit = 20, search, routeType, status, returnDriverStatus, isRouteDeviated } = filter;
    const where: Prisma.TransportOrderWhereInput = {};
    if (actor?.role === Role.DRIVER) where.driverId = actor.id;
    else { const unit = scopedUnit(actor, (filter as TransportFilterDto & { unit?: Unit }).unit); if (unit) where.unit = unit; }
    if (routeType) where.routeType = routeType;
    if (status) where.status = status;
    if (returnDriverStatus) where.returnDriverStatus = returnDriverStatus;
    if (isRouteDeviated !== undefined) where.isRouteDeviated = isRouteDeviated;
    if (search) where.OR = [{ code: { contains: search } }, { cargoType: { contains: search } }, { origin: { contains: search } }, { destination: { contains: search } }, { items: { some: { OR: [{ materialCode: { contains: search } }, { cargoName: { contains: search } }] } } }];
    const [total, items] = await Promise.all([
      this.prisma.transportOrder.count({ where }),
      this.prisma.transportOrder.findMany({ where, skip: (page - 1) * limit, take: limit, include: transportInclude, orderBy: [{ departureTime: 'desc' }, { createdAt: 'desc' }] }),
    ]);
    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, actor: OperationalActor) {
    const order = await this.prisma.transportOrder.findUnique({ where: { id }, include: transportInclude });
    if (!order) throw new NotFoundException(`Không tìm thấy vận đơn #${id}`);
    assertOperationalAccess(actor, order.unit, order.driverId);
    return order;
  }

  async update(id: number, dto: UpdateTransportOrderDto, actor: OperationalActor) {
    const order = await this.findOne(id, actor);
    if (order.status !== TransportStatus.DRAFT) throw new BadRequestException('Chỉ sửa trực tiếp vận đơn nháp.');
    const { items, ...data } = dto as UpdateTransportOrderDto & { items?: CreateTransportItemDto[] };
    return this.prisma.$transaction(async (tx) => {
      if (items) { await tx.transportItem.deleteMany({ where: { transportOrderId: id } }); await tx.transportItem.createMany({ data: items.map((item) => ({ ...item, transportOrderId: id })) }); }
      return tx.transportOrder.update({ where: { id }, data, include: transportInclude });
    });
  }

  async createItem(id: number, dto: CreateTransportItemDto, actor: OperationalActor) { const order = await this.findOne(id, actor); if (order.status !== TransportStatus.DRAFT) throw new BadRequestException('Chỉ thêm hàng hóa vào vận đơn nháp.'); return this.prisma.transportItem.create({ data: { ...dto, transportOrderId: id } }); }
  async updateItem(id: number, itemId: number, dto: Partial<CreateTransportItemDto>, actor: OperationalActor) { await this.findOne(id, actor); const item = await this.prisma.transportItem.findFirst({ where: { id: itemId, transportOrderId: id } }); if (!item) throw new NotFoundException('Không tìm thấy dòng hàng.'); return this.prisma.transportItem.update({ where: { id: itemId }, data: dto }); }
  async removeItem(id: number, itemId: number, actor: OperationalActor) { const order = await this.findOne(id, actor); if (order.status !== TransportStatus.DRAFT) throw new BadRequestException('Chỉ xóa hàng hóa của vận đơn nháp.'); return this.prisma.transportItem.delete({ where: { id: itemId } }); }

  async assign(id: number, dto: AssignTransportDto, actor: OperationalActor) {
    const order = await this.findOne(id, actor);
    if (order.status !== TransportStatus.APPROVED) throw new BadRequestException('Chỉ phân công vận đơn đã duyệt.');
    const workOrder = order.operationalWorkOrder ?? await this.prisma.operationalWorkOrder.create({
      data: { type: WorkOrderType.TRANSPORT, unit: order.unit, status: WorkOrderStatus.APPROVED, plannedStartAt: dto.departureTime, plannedEndAt: dto.plannedEndTime, transportOrderId: id, createdById: actor.id, approvedById: actor.id, approvedAt: new Date() },
    });
    if (!this.workOrders) throw new BadRequestException('Work order orchestration chưa sẵn sàng.');
    await this.workOrders.assign(workOrder.id, { vehicleId: dto.vehicleId, driverId: dto.driverId, assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT, plannedStartAt: dto.departureTime, plannedEndAt: dto.plannedEndTime }, actor);
    if (dto.implementId) await this.prisma.transportOrder.update({ where: { id }, data: { trailerId: dto.implementId } });
    return this.findOne(id, actor);
  }

  private async transition(id: number, actor: OperationalActor, from: TransportStatus[], to: TransportStatus, reason?: string) {
    const order = await this.findOne(id, actor);
    if (!from.includes(order.status)) throw new BadRequestException(`Không thể chuyển vận đơn từ ${order.status} sang ${to}.`);
    if (to === TransportStatus.DRIVER_ACCEPTED && actor.id !== order.driverId) throw new BadRequestException('Chỉ tài xế được giao mới được xác nhận vận đơn.');
    if (to === TransportStatus.PENDING_APPROVAL && !order.items.length) throw new BadRequestException('Vận đơn phải có ít nhất một dòng hàng trước khi trình duyệt.');
    const now = new Date();
    const data: Prisma.TransportOrderUpdateInput = { status: to };
    const stamp: Partial<Record<TransportStatus, keyof Prisma.TransportOrderUpdateInput>> = {
      PENDING_APPROVAL: 'submittedAt', APPROVED: 'approvedAt', ASSIGNED: 'assignedAt', DRIVER_ACCEPTED: 'driverAcceptedAt', AT_PICKUP: 'pickupAt', LOADING: 'loadingAt', DEPARTED: 'departedAt', AT_DELIVERY: 'deliveryAt', UNLOADING: 'unloadingAt', DELIVERED: 'deliveredAt', ACCEPTED: 'acceptedAt', COMPLETED: 'completedAt',
    };
    const stampField = stamp[to]; if (stampField) (data as Record<string, unknown>)[stampField] = now;
    if (to === TransportStatus.APPROVED) data.approvedBy = { connect: { id: actor.id } };
    if (to === TransportStatus.DELIVERED) data.arrivalTime = now;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.transportOrder.update({ where: { id }, data });
      if (to === TransportStatus.IN_TRANSIT && order.vehicleId) await tx.vehicle.update({ where: { id: order.vehicleId }, data: { status: VehicleStatus.HOAT_DONG } });
      if (to === TransportStatus.COMPLETED) { if (order.vehicleId) await tx.vehicle.update({ where: { id: order.vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG } }); if (order.driverId) await tx.user.update({ where: { id: order.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } }); }
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.TRANSPORT_ORDER, entityId: id, actorId: actor.id, action: `${order.status}_TO_${to}`, oldValue: { status: order.status }, newValue: { status: to }, reason } });
      if (order.operationalWorkOrder) {
        const workStatus: Partial<Record<TransportStatus, WorkOrderStatus>> = {
          PENDING_APPROVAL: WorkOrderStatus.PENDING_APPROVAL, APPROVED: WorkOrderStatus.APPROVED,
          DRIVER_ACCEPTED: WorkOrderStatus.DRIVER_ACCEPTED, AT_PICKUP: WorkOrderStatus.IN_PROGRESS,
          LOADING: WorkOrderStatus.IN_PROGRESS, DEPARTED: WorkOrderStatus.IN_PROGRESS,
          IN_TRANSIT: WorkOrderStatus.IN_PROGRESS, AT_DELIVERY: WorkOrderStatus.IN_PROGRESS,
          UNLOADING: WorkOrderStatus.IN_PROGRESS, DELIVERED: WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE,
          ACCEPTED: WorkOrderStatus.ACCEPTED, COMPLETED: WorkOrderStatus.CLOSED,
          CANCELLED: WorkOrderStatus.CANCELLED,
        };
        if (workStatus[to]) await tx.operationalWorkOrder.update({ where: { id: order.operationalWorkOrder.id }, data: { status: workStatus[to], version: { increment: 1 } } });
      }
      return updated;
    });
  }

  submit(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.DRAFT], TransportStatus.PENDING_APPROVAL); }
  approve(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.PENDING_APPROVAL], TransportStatus.APPROVED); }
  driverAccept(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.ASSIGNED], TransportStatus.DRIVER_ACCEPTED); }
  atPickup(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.DRIVER_ACCEPTED], TransportStatus.AT_PICKUP); }
  loading(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.AT_PICKUP], TransportStatus.LOADING); }
  depart(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.LOADING], TransportStatus.DEPARTED); }
  inTransit(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.DEPARTED], TransportStatus.IN_TRANSIT); }
  atDelivery(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.IN_TRANSIT], TransportStatus.AT_DELIVERY); }
  unloading(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.AT_DELIVERY], TransportStatus.UNLOADING); }
  deliver(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.UNLOADING], TransportStatus.DELIVERED); }
  accept(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.DELIVERED], TransportStatus.ACCEPTED); }
  complete(id: number, actor: OperationalActor) { return this.transition(id, actor, [TransportStatus.ACCEPTED], TransportStatus.COMPLETED); }

  availableResources(query: AvailableResourcesDto, actor: OperationalActor) { return this.dispatchService.availableResources(query, actor); }
  async scheduler(query: SchedulerFilterDto, actor: OperationalActor) { const unit = scopedUnit(actor); return this.prisma.transportOrder.findMany({ where: { ...(unit ? { unit } : {}), departureTime: { lt: query.end }, plannedEndTime: { gt: query.start } }, include: transportInclude, orderBy: { departureTime: 'asc' } }); }

  async updateReturnCargo(id: number, dto: UpdateReturnCargoDto, actor: OperationalActor) { await this.findOne(id, actor); return this.prisma.transportOrder.update({ where: { id }, data: dto }); }
  async updateTelemetry(id: number, dto: UpdateTransportTelemetryDto, actor: OperationalActor) { const order = await this.findOne(id, actor); const deviated = dto.isRouteDeviated ?? (order.isRouteDeviated || (!!dto.speedKmH && dto.speedKmH > order.maxSpeedLimit)); return this.prisma.transportOrder.update({ where: { id }, data: { speedKmH: dto.speedKmH ?? order.speedKmH, isRouteDeviated: deviated, deviationReason: dto.deviationReason ?? order.deviationReason } }); }

  async getStatistics(actor: OperationalActor) {
    const unit = scopedUnit(actor); const where = unit ? { unit } : {};
    const [total, inTransit, delivered, deviated, twoWay, quantities] = await Promise.all([
      this.prisma.transportOrder.count({ where }), this.prisma.transportOrder.count({ where: { ...where, status: TransportStatus.IN_TRANSIT } }), this.prisma.transportOrder.count({ where: { ...where, status: TransportStatus.DELIVERED } }), this.prisma.transportOrder.count({ where: { ...where, isRouteDeviated: true } }), this.prisma.transportOrder.count({ where: { ...where, routeType: RouteType.TWO_WAY } }),
      this.prisma.transportItem.groupBy({ by: ['unitOfMeasure'], where: unit ? { transportOrder: { unit } } : undefined, _sum: { plannedQuantity: true, actualQuantity: true }, _count: true }),
    ]);
    return { totalOrders: total, inTransit, delivered, deviatedAlerts: deviated, twoWayCount: twoWay, quantitiesByUnit: quantities };
  }

  private text(value: unknown) { return value === null || value === undefined ? '' : String(value).trim(); }
  private parseDate(value: unknown) { const text = this.text(value); const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text); return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : undefined; }
  private parseDateTime(dateValue: unknown, timeValue: unknown) { const date = this.parseDate(dateValue); if (!date) return undefined; const match = /^(\d{1,2}):(\d{2})$/.exec(this.text(timeValue)); if (match) date.setHours(Number(match[1]), Number(match[2]), 0, 0); return date; }
  private routeType(value: unknown) { const normalized = this.text(value).toLocaleLowerCase('vi-VN'); return normalized.includes('đối lưu') || normalized.includes('2 chiều') ? RouteType.TWO_WAY : RouteType.ONE_WAY; }

  private groupAnchors(dto: ImportWorkbookDto) {
    const anchors = new Map<number, number>();
    for (const merge of dto.merges) {
      try { const range = xlsxUtils.decode_range(merge); if (range.s.c > 6 || range.e.c < 3) continue; for (let row = range.s.r + 1; row <= range.e.r + 1; row++) anchors.set(row, range.s.r + 1); } catch { /* validation reports malformed merge elsewhere */ }
    }
    return anchors;
  }

  async previewImport(dto: ImportWorkbookDto, actor: OperationalActor) {
    if (!/^[a-f0-9]{64}$/i.test(dto.checksum)) throw new BadRequestException('Checksum SHA-256 không hợp lệ.');
    const rows = dto.rows.filter((row) => this.text(row.values[0]).toLocaleUpperCase('vi-VN') !== 'STT' && row.values.some((value) => this.text(value)));
    const anchors = this.groupAnchors(dto); const grouped = new Map<number, typeof rows>();
    for (const row of rows) { const anchor = anchors.get(row.rowNumber) ?? row.rowNumber; const group = grouped.get(anchor) ?? []; group.push(row); grouped.set(anchor, group); }
    const trips: PreviewTrip[] = []; const errors: Array<Record<string, unknown>> = []; const warnings: Array<Record<string, unknown>> = [];
    for (const [anchor, group] of grouped) {
      const top = group[0].values; const executionDate = this.parseDate(top[2]); const departureTime = this.parseDateTime(top[2], top[3]);
      const vehicleRaw = this.text(top[4]); const containerRaw = this.text(top[5]); const driverRaw = this.text(top[6]);
      const items = group.map((row) => ({ materialCode: this.text(row.values[10]) || undefined, cargoName: this.text(row.values[11]), unitOfMeasure: this.text(row.values[12]), plannedQuantity: Number(row.values[13]) || 0, pickupLocation: this.text(row.values[14]) || undefined, deliveryLocation: this.text(row.values[15]) || undefined, sourceRowNumber: row.rowNumber })).filter((item) => item.cargoName);
      if (!executionDate || !departureTime) errors.push({ rowNumber: anchor, field: 'NGÀY/THỜI GIAN', message: 'Ngày thực hiện hoặc giờ xuất phát không hợp lệ.' });
      if (!items.length) errors.push({ rowNumber: anchor, field: 'HÀNG HÓA', message: 'Chuyến không có dòng hàng hợp lệ.' });
      const [vehicle, driver, trailer] = await Promise.all([
        vehicleRaw ? this.prisma.vehicle.findFirst({ where: { OR: [{ code: vehicleRaw }, { plate: vehicleRaw }] } }) : null,
        driverRaw ? this.prisma.user.findFirst({ where: { fullName: driverRaw, role: Role.DRIVER } }) : null,
        containerRaw ? this.prisma.agriculturalImplement.findFirst({ where: { code: containerRaw } }) : null,
      ]);
      if (vehicleRaw && !vehicle) warnings.push({ rowNumber: anchor, field: 'SỐ XE', value: vehicleRaw, message: 'Chưa đối soát được xe; chuyến sẽ ở DRAFT.' });
      if (driverRaw && !driver) warnings.push({ rowNumber: anchor, field: 'TÀI XẾ', value: driverRaw, message: 'Chưa đối soát được tài xế; chuyến sẽ ở DRAFT.' });
      if (containerRaw && !trailer) warnings.push({ rowNumber: anchor, field: 'SỐ CONT', value: containerRaw, message: 'Chưa đối soát được moóc/CONT; giữ dữ liệu legacy.' });
      const statusText = this.text(top[8]); const noteText = this.text(top[9]); const palletMatch = /(\d+)\s*pa(?:l|l)e/i.exec(statusText);
      const datePart = executionDate ? `${executionDate.getFullYear()}${String(executionDate.getMonth() + 1).padStart(2, '0')}${String(executionDate.getDate()).padStart(2, '0')}` : 'UNKNOWN';
      trips.push({ sourceRowNumber: anchor, code: `LVC-${datePart}-${String(anchor).padStart(3, '0')}`, requestDate: this.parseDate(top[1]), executionDate, departureTime, vehicleRaw: vehicleRaw || undefined, containerRaw: containerRaw || undefined, driverRaw: driverRaw || undefined, routeType: this.routeType(top[7]), transportMode: this.text(top[7]) || undefined, palletCount: palletMatch ? Number(palletMatch[1]) : undefined, trailerNote: /cắt\s*mo[oó]c|thanh chắn/i.test(`${statusText} ${noteText}`) ? `${statusText} ${noteText}`.trim() : undefined, notes: noteText || undefined, vehicleId: vehicle?.id, driverId: driver?.id, trailerId: trailer?.id, items });
    }
    return { checksum: dto.checksum, fileName: dto.fileName, sheetName: dto.sheetName, tripCount: trips.length, itemCount: trips.reduce((sum, trip) => sum + trip.items.length, 0), trips, errors, warnings, canCommit: errors.length === 0 };
  }

  async commitImport(dto: ImportWorkbookDto, actor: OperationalActor) {
    if (await this.prisma.transportImportBatch.findUnique({ where: { checksum: dto.checksum } })) throw new ConflictException('File này đã được nhập trước đó.');
    const preview = await this.previewImport(dto, actor); if (!preview.canCommit) throw new BadRequestException({ code: 'IMPORT_VALIDATION_FAILED', errors: preview.errors, warnings: preview.warnings });
    return this.prisma.$transaction(async (tx) => {
      for (const trip of preview.trips) {
        await tx.transportOrder.create({ data: { code: trip.code, requestDate: trip.requestDate, executionDate: trip.executionDate, departureTime: trip.departureTime, routeType: trip.routeType, unit: scopedUnit(actor) ?? actor.unit, transportMode: trip.transportMode, containerNumber: trip.containerRaw, vehicleId: trip.vehicleId, driverId: trip.driverId, trailerId: trip.trailerId, legacyVehicle: trip.vehicleId ? undefined : trip.vehicleRaw, legacyDriver: trip.driverId ? undefined : trip.driverRaw, legacyTrailer: trip.trailerId ? undefined : trip.containerRaw, palletCount: trip.palletCount, trailerNote: trip.trailerNote, notes: trip.notes, origin: trip.items[0]?.pickupLocation, destination: trip.items[0]?.deliveryLocation, cargoType: trip.items[0]?.cargoName, status: TransportStatus.DRAFT, items: { create: trip.items } } });
      }
      const batch = await tx.transportImportBatch.create({ data: { checksum: dto.checksum, fileName: dto.fileName, sheetName: dto.sheetName, importedById: actor.id, tripCount: preview.tripCount, itemCount: preview.itemCount, warningCount: preview.warnings.length } });
      return { batch, tripCount: preview.tripCount, itemCount: preview.itemCount, warnings: preview.warnings };
    });
  }

  async remove(id: number, actor: OperationalActor) {
    const order = await this.findOne(id, actor);
    if (order.status !== TransportStatus.DRAFT) throw new BadRequestException('Chỉ được hủy vận đơn nháp qua API DELETE tương thích.');
    if (order.operationalWorkOrder && this.workOrders) {
      await this.workOrders.cancel(order.operationalWorkOrder.id, 'Hủy vận đơn nháp qua API DELETE tương thích', actor);
      return this.findOne(id, actor);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.transportOrder.update({ where: { id }, data: { status: TransportStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: 'Hủy vận đơn nháp qua API DELETE tương thích' } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.TRANSPORT_ORDER, entityId: id, actorId: actor.id, action: 'CANCEL', oldValue: { status: order.status }, newValue: { status: TransportStatus.CANCELLED }, reason: 'Hủy vận đơn nháp qua API DELETE tương thích' } });
      return updated;
    });
  }
}
