import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DispatchStatus,
  DriverKpiEventType,
  DriverShiftStatus,
  Prisma,
  Role,
  TransportStatus,
  VehicleStatus,
  WorkAcceptanceStatus,
  WorkAssignmentMode,
  WorkAssignmentStatus,
  WorkEvidenceType,
  WorkOrderStatus,
  WorkOrderType,
} from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import { OperationalActor, assertOperationalAccess } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignWorkOrderDto,
  FinishExecutionDto,
  HandoverExecutionDto,
  ReassignWorkOrderDto,
  StartExecutionDto,
  WorkReasonDto,
} from './dto/work-order-actions.dto';

const aggregateInclude = {
  dispatchOrder: { include: { productionOrder: { include: { plan: true, planItem: true } } } },
  transportOrder: { include: { items: true } },
  internalFeedTrip: { include: { material: true } },
  vehicleAssignments: { include: { vehicle: true, assignedBy: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
  driverAssignments: { include: { driver: { include: { user: { select: { id: true, code: true, fullName: true, phone: true, unit: true } } } }, assignedBy: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
  executionSegments: { include: { vehicle: true, driver: { include: { user: { select: { id: true, code: true, fullName: true } } } } }, orderBy: { startedAt: 'asc' } },
  evidence: { orderBy: { capturedAt: 'asc' } },
  acceptances: { include: { reviewedBy: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
  events: { include: { actor: { select: { id: true, fullName: true } } }, orderBy: { occurredAt: 'asc' } },
  kpiEvents: { orderBy: { occurredAt: 'asc' } },
} satisfies Prisma.OperationalWorkOrderInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService, private readonly availability: AvailabilityService) {}

  async findAll(status: string | undefined, type: string | undefined, actor: OperationalActor) {
    const where: Prisma.OperationalWorkOrderWhereInput = {};
    if (status && Object.values(WorkOrderStatus).includes(status as WorkOrderStatus)) where.status = status as WorkOrderStatus;
    if (type && Object.values(WorkOrderType).includes(type as WorkOrderType)) where.type = type as WorkOrderType;
    if (actor.role === Role.DRIVER) {
      where.unit = actor.unit;
      where.OR = [
        { assignmentMode: WorkAssignmentMode.OPEN_ASSIGNMENT, status: WorkOrderStatus.OPEN_FOR_CLAIM },
        { driverAssignments: { some: { driverId: actor.id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } } } },
      ];
    } else if (actor.role !== Role.SUPER_ADMIN && actor.unit !== 'TOAN_KLH' && !(actor.role === Role.DISPATCHER && actor.unit === 'BAN_CO_GIOI')) {
      where.unit = actor.unit;
    }
    const items = await this.prisma.operationalWorkOrder.findMany({ where, include: aggregateInclude, orderBy: [{ plannedStartAt: 'asc' }, { id: 'asc' }] });
    return { items, pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1 } };
  }

  async findOne(id: number, actor: OperationalActor) {
    const order = await this.prisma.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    if (!order) throw new NotFoundException(`Không tìm thấy công việc #${id}.`);
    const activeDriver = order.driverAssignments.find((item) => new Set<WorkAssignmentStatus>([WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED]).has(item.status));
    if (actor.role === Role.DRIVER) {
      const canSeeOpen = order.assignmentMode === WorkAssignmentMode.OPEN_ASSIGNMENT && order.status === WorkOrderStatus.OPEN_FOR_CLAIM && actor.unit === order.unit;
      if (activeDriver?.driverId !== actor.id && !canSeeOpen) throw new ForbiddenException('Tài xế không được truy cập công việc này.');
    } else {
      assertOperationalAccess(actor, order.unit);
    }
    return order;
  }

  async transitionApproval(id: number, to: WorkOrderStatus, reason: string | undefined, actor: OperationalActor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      this.assertManagementRole(actor, order.type);
      assertOperationalAccess(actor, order.unit);
      const allowed: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
        PENDING_APPROVAL: [WorkOrderStatus.DRAFT, WorkOrderStatus.REJECTED],
        APPROVED: [WorkOrderStatus.PENDING_APPROVAL],
        REJECTED: [WorkOrderStatus.PENDING_APPROVAL],
      };
      if (!allowed[to]?.includes(order.status)) throw new BadRequestException(`Không thể chuyển công việc từ ${order.status} sang ${to}.`);
      if (to === WorkOrderStatus.REJECTED && !reason) throw new BadRequestException('Từ chối công việc phải có lý do.');
      const now = new Date();
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: to, version: { increment: 1 }, submittedAt: to === WorkOrderStatus.PENDING_APPROVAL ? now : order.submittedAt, approvedAt: to === WorkOrderStatus.APPROVED ? now : order.approvedAt, approvedById: to === WorkOrderStatus.APPROVED ? actor.id : order.approvedById } });
      await this.syncLegacyApproval(tx, order, to, actor.id, reason);
      await this.event(tx, id, actor.id, `APPROVAL_${to}`, order.status, to, reason);
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async assign(id: number, dto: AssignWorkOrderDto, actor: OperationalActor) {
    if (dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT && !dto.driverId) {
      throw new BadRequestException('Giao cứng phải chọn tài xế.');
    }
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      this.assertManagementRole(actor, order.type);
      assertOperationalAccess(actor, order.unit);
      this.assertVersion(order.version, dto.expectedVersion);
      if (!new Set<WorkOrderStatus>([WorkOrderStatus.APPROVED, WorkOrderStatus.OPEN_FOR_CLAIM, WorkOrderStatus.ASSIGNED, WorkOrderStatus.REWORK_REQUIRED]).has(order.status)) {
        throw new BadRequestException(`Không thể phân công từ trạng thái ${order.status}.`);
      }
      const startAt = dto.plannedStartAt ?? order.plannedStartAt;
      const endAt = dto.plannedEndAt ?? order.plannedEndAt;
      await this.lockResourceRows(tx, dto.vehicleId, dto.driverId);
      if (dto.driverId) await this.ensureDriverProfile(tx, dto.driverId);
      await this.availability.assertResourcesAvailable({ startAt, endAt, unit: order.unit, vehicleId: dto.vehicleId, driverId: dto.driverId, excludeWorkOrderId: id }, actor);

      const previousDrivers = await tx.workDriverAssignment.findMany({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } } });
      await tx.workVehicleAssignment.updateMany({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.REASSIGNED, endAt: new Date(), reason: dto.reason } });
      await tx.workDriverAssignment.updateMany({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.REASSIGNED, endAt: new Date(), reason: dto.reason } });
      for (const previous of previousDrivers) await tx.driverKpiEvent.create({ data: { driverId: previous.driverId, workOrderId: id, type: DriverKpiEventType.REASSIGNED, payload: { reason: dto.reason, replacementDriverId: dto.driverId } } });
      await tx.workVehicleAssignment.create({ data: { workOrderId: id, vehicleId: dto.vehicleId, assignedById: actor.id, startAt, endAt } });
      if (dto.driverId) {
        await tx.workDriverAssignment.create({ data: { workOrderId: id, driverId: dto.driverId, assignedById: actor.id, startAt, endAt } });
        await tx.driverKpiEvent.create({ data: { driverId: dto.driverId, workOrderId: id, type: DriverKpiEventType.ASSIGNED } });
      }
      const nextStatus = dto.assignmentMode === WorkAssignmentMode.OPEN_ASSIGNMENT ? WorkOrderStatus.OPEN_FOR_CLAIM : WorkOrderStatus.ASSIGNED;
      await tx.operationalWorkOrder.update({ where: { id }, data: { assignmentMode: dto.assignmentMode, plannedStartAt: startAt, plannedEndAt: endAt, status: nextStatus, version: { increment: 1 } } });
      await this.syncLegacyAssignment(tx, order, dto.vehicleId, dto.driverId, nextStatus);
      await this.event(tx, id, actor.id, 'ASSIGN', order.status, nextStatus, dto.reason, { vehicleId: dto.vehicleId, driverId: dto.driverId, assignmentMode: dto.assignmentMode });
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async claim(id: number, actor: OperationalActor) {
    if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế được nhận lệnh mở.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      if (order.assignmentMode !== WorkAssignmentMode.OPEN_ASSIGNMENT || order.status !== WorkOrderStatus.OPEN_FOR_CLAIM) {
        throw new ConflictException({ code: 'ORDER_ALREADY_CLAIMED', message: 'Lệnh không còn mở để nhận.' });
      }
      if (order.unit !== actor.unit) throw new ForbiddenException('Lệnh mở không thuộc đơn vị của tài xế.');
      const vehicleAssignment = await tx.workVehicleAssignment.findFirst({ where: { workOrderId: id, status: WorkAssignmentStatus.ASSIGNED }, orderBy: { createdAt: 'desc' } });
      if (!vehicleAssignment) throw new ConflictException({ code: 'RESOURCE_NOT_AVAILABLE', message: 'Lệnh chưa có xe hợp lệ.' });
      await this.lockResourceRows(tx, vehicleAssignment.vehicleId, actor.id);
      await this.ensureDriverProfile(tx, actor.id);
      await this.availability.assertResourcesAvailable({ startAt: order.plannedStartAt, endAt: order.plannedEndAt, unit: order.unit, vehicleId: vehicleAssignment.vehicleId, driverId: actor.id, excludeWorkOrderId: id }, actor);
      const existing = await tx.workDriverAssignment.findFirst({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } } });
      if (existing) throw new ConflictException({ code: 'ORDER_ALREADY_CLAIMED', message: 'Một tài xế khác đã nhận lệnh.' });
      await tx.workDriverAssignment.create({ data: { workOrderId: id, driverId: actor.id, assignedById: actor.id, startAt: order.plannedStartAt, endAt: order.plannedEndAt } });
      await tx.driverKpiEvent.create({ data: { driverId: actor.id, workOrderId: id, type: DriverKpiEventType.ASSIGNED, payload: { source: 'OPEN_CLAIM' } } });
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: WorkOrderStatus.ASSIGNED, version: { increment: 1 } } });
      await this.syncLegacyAssignment(tx, order, vehicleAssignment.vehicleId, actor.id, WorkOrderStatus.ASSIGNED);
      await this.event(tx, id, actor.id, 'CLAIM', order.status, WorkOrderStatus.ASSIGNED);
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async driverAccept(id: number, actor: OperationalActor) {
    if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế được xác nhận nhận lệnh.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      const assignment = await this.activeDriverAssignment(tx, id);
      if (!assignment || assignment.driverId !== actor.id) throw new ForbiddenException('Lệnh không được giao cho tài xế hiện tại.');
      if (order.status !== WorkOrderStatus.ASSIGNED) throw new BadRequestException(`Không thể nhận lệnh từ trạng thái ${order.status}.`);
      await tx.workDriverAssignment.update({ where: { id: assignment.id }, data: { status: WorkAssignmentStatus.ACCEPTED, acceptedAt: new Date() } });
      await tx.driverKpiEvent.create({ data: { driverId: actor.id, workOrderId: id, type: DriverKpiEventType.ACCEPTED } });
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: WorkOrderStatus.DRIVER_ACCEPTED, version: { increment: 1 } } });
      await this.syncLegacyStatus(tx, order, WorkOrderStatus.DRIVER_ACCEPTED);
      await this.event(tx, id, actor.id, 'DRIVER_ACCEPT', order.status, WorkOrderStatus.DRIVER_ACCEPTED);
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async cannotAccept(id: number, dto: WorkReasonDto, actor: OperationalActor) {
    if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế được báo không thể thực hiện.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      const assignment = await this.activeDriverAssignment(tx, id);
      if (!assignment || assignment.driverId !== actor.id) throw new ForbiddenException('Lệnh không được giao cho tài xế hiện tại.');
      await tx.workDriverAssignment.update({ where: { id: assignment.id }, data: { status: WorkAssignmentStatus.CANNOT_ACCEPT, endAt: new Date(), reportedAt: new Date(), reasonCode: dto.reasonCode, reason: dto.reason, evidenceUrl: dto.evidenceUrl } });
      await tx.driverKpiEvent.create({ data: { driverId: actor.id, workOrderId: id, type: DriverKpiEventType.CANNOT_ACCEPT, reasonCode: dto.reasonCode, payload: { reason: dto.reason, evidenceUrl: dto.evidenceUrl } } });
      const next = order.assignmentMode === WorkAssignmentMode.OPEN_ASSIGNMENT ? WorkOrderStatus.OPEN_FOR_CLAIM : WorkOrderStatus.APPROVED;
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: next, version: { increment: 1 } } });
      await this.event(tx, id, actor.id, 'CANNOT_ACCEPT', order.status, next, dto.reason, { reasonCode: dto.reasonCode, evidenceUrl: dto.evidenceUrl });
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async reassign(id: number, dto: ReassignWorkOrderDto, actor: OperationalActor) {
    const current = await this.findOne(id, actor);
    const vehicleId = dto.vehicleId ?? current.vehicleAssignments.find((item) => new Set<WorkAssignmentStatus>([WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED]).has(item.status))?.vehicleId;
    if (!vehicleId) throw new BadRequestException('Không xác định được xe để tái phân công.');
    return this.assign(id, { vehicleId, driverId: dto.driverId, assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT, expectedVersion: dto.expectedVersion, reason: dto.reason }, actor);
  }

  async startExecution(id: number, dto: StartExecutionDto, actor: OperationalActor) {
    if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế được bắt đầu thực hiện.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      if (!new Set<WorkOrderStatus>([WorkOrderStatus.DRIVER_ACCEPTED, WorkOrderStatus.REWORK_REQUIRED]).has(order.status)) throw new BadRequestException(`Không thể bắt đầu từ trạng thái ${order.status}.`);
      const driverAssignment = await this.activeDriverAssignment(tx, id);
      const vehicleAssignment = await this.activeVehicleAssignment(tx, id);
      if (!driverAssignment || driverAssignment.driverId !== actor.id || !vehicleAssignment) throw new ForbiddenException('Phân công tài xế hoặc xe không hợp lệ.');
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleAssignment.vehicleId } });
      if (dto.startOdoKm !== undefined && vehicle && dto.startOdoKm < vehicle.odoKm) throw new BadRequestException('ODO bắt đầu không được nhỏ hơn ODO hiện tại của xe.');
      const segment = await tx.workExecutionSegment.create({ data: { workOrderId: id, vehicleAssignmentId: vehicleAssignment.id, driverAssignmentId: driverAssignment.id, vehicleId: vehicleAssignment.vehicleId, driverId: actor.id, startedAt: new Date(), startOdoKm: dto.startOdoKm, startMachineHours: dto.startMachineHours, startLat: dto.lat, startLng: dto.lng } });
      await this.createEvidence(tx, id, actor.id, dto.evidence ?? []);
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: WorkOrderStatus.IN_PROGRESS, version: { increment: 1 } } });
      await tx.vehicle.update({ where: { id: vehicleAssignment.vehicleId }, data: { status: VehicleStatus.HOAT_DONG } });
      await tx.user.update({ where: { id: actor.id }, data: { currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH } });
      await this.syncLegacyStatus(tx, order, WorkOrderStatus.IN_PROGRESS);
      await this.event(tx, id, actor.id, 'EXECUTION_START', order.status, WorkOrderStatus.IN_PROGRESS, undefined, { segmentId: segment.id, startOdoKm: dto.startOdoKm });
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async finishExecution(id: number, dto: FinishExecutionDto, actor: OperationalActor) {
    if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế đang thực hiện được kết thúc công việc.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      const segment = await tx.workExecutionSegment.findFirst({ where: { workOrderId: id, driverId: actor.id, endedAt: null }, orderBy: { startedAt: 'desc' } });
      if (!segment) throw new BadRequestException('Không có đoạn thực hiện đang mở của tài xế.');
      const metrics = this.validateSegmentMetrics(segment, dto);
      await tx.workExecutionSegment.update({ where: { id: segment.id }, data: { endedAt: new Date(), endOdoKm: dto.endOdoKm, endMachineHours: dto.endMachineHours, endLat: dto.lat, endLng: dto.lng, quantity: dto.quantity, notes: dto.notes } });
      await this.createEvidence(tx, id, actor.id, dto.evidence ?? []);
      await tx.driverKpiEvent.create({ data: { driverId: actor.id, workOrderId: id, executionSegmentId: segment.id, type: DriverKpiEventType.EXECUTION_COMPLETED, distanceKm: metrics.distanceKm, machineHours: metrics.machineHours, quantity: dto.quantity ?? 0 } });
      await this.updateVehicleMetrics(tx, segment.vehicleId, dto, metrics);
      await tx.user.update({ where: { id: actor.id }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
      await this.event(tx, id, actor.id, 'EXECUTION_FINISH', order.status, order.status, undefined, { segmentId: segment.id, ...metrics });
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async handoverExecution(id: number, dto: HandoverExecutionDto, actor: OperationalActor) {
    await this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      this.assertManagementRole(actor, order.type);
      assertOperationalAccess(actor, order.unit);
      const segment = await tx.workExecutionSegment.findFirst({ where: { workOrderId: id, endedAt: null }, orderBy: { startedAt: 'desc' } });
      if (!segment) throw new BadRequestException('Không có đoạn thực hiện đang mở để bàn giao.');
      const metrics = this.validateSegmentMetrics(segment, dto);
      await tx.workExecutionSegment.update({ where: { id: segment.id }, data: { endedAt: new Date(), endOdoKm: dto.endOdoKm, endMachineHours: dto.endMachineHours, endLat: dto.lat, endLng: dto.lng, quantity: dto.quantity, notes: dto.notes } });
      await this.createEvidence(tx, id, actor.id, dto.evidence ?? []);
      await tx.driverKpiEvent.create({ data: { driverId: segment.driverId, workOrderId: id, executionSegmentId: segment.id, type: DriverKpiEventType.EXECUTION_COMPLETED, distanceKm: metrics.distanceKm, machineHours: metrics.machineHours, quantity: dto.quantity ?? 0, payload: { handover: true, reason: dto.reason } } });
      await this.updateVehicleMetrics(tx, segment.vehicleId, dto, metrics);
      await tx.user.update({ where: { id: segment.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
      await this.event(tx, id, actor.id, 'EXECUTION_HANDOVER', order.status, order.status, dto.reason, { segmentId: segment.id, fromDriverId: segment.driverId, nextDriverId: dto.nextDriverId, nextVehicleId: dto.nextVehicleId });
    });
    const current = await this.findOne(id, actor);
    const activeVehicle = current.vehicleAssignments.find((item) => new Set<WorkAssignmentStatus>([WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED]).has(item.status));
    await this.reassign(id, { driverId: dto.nextDriverId, vehicleId: dto.nextVehicleId ?? activeVehicle?.vehicleId, reason: dto.reason, expectedVersion: current.version }, actor);
    return this.findOne(id, actor);
  }

  async submitAcceptance(id: number, actor: OperationalActor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      const assignment = await this.activeDriverAssignment(tx, id);
      if (actor.role === Role.DRIVER && assignment?.driverId !== actor.id) throw new ForbiddenException('Tài xế không phụ trách công việc này.');
      if (order.status !== WorkOrderStatus.IN_PROGRESS) throw new BadRequestException(`Không thể gửi nghiệm thu từ trạng thái ${order.status}.`);
      const openSegment = await tx.workExecutionSegment.findFirst({ where: { workOrderId: id, endedAt: null } });
      if (openSegment) throw new BadRequestException('Phải kết thúc mọi đoạn thực hiện trước khi gửi nghiệm thu.');
      const policy = await tx.schedulingPolicy.findUnique({ where: { unit: order.unit } });
      const requiredPhotos = policy?.completionPhotoCount ?? 1;
      const photoCount = await tx.workEvidence.count({ where: { workOrderId: id, type: WorkEvidenceType.COMPLETION_PHOTO } });
      if (photoCount < requiredPhotos) throw new BadRequestException({ code: 'COMPLETION_EVIDENCE_REQUIRED', requiredPhotos, currentPhotos: photoCount });
      await tx.workAcceptance.create({ data: { workOrderId: id } });
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE, version: { increment: 1 } } });
      await this.syncLegacyStatus(tx, order, WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE);
      await this.event(tx, id, actor.id, 'SUBMIT_ACCEPTANCE', order.status, WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE);
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async reviewAcceptance(id: number, approve: boolean, reason: string | undefined, actor: OperationalActor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      this.assertAcceptanceRole(actor, order.type);
      assertOperationalAccess(actor, order.unit);
      if (order.status !== WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE) throw new BadRequestException('Công việc không ở trạng thái chờ nghiệm thu.');
      if (!approve && !reason) throw new BadRequestException('Từ chối nghiệm thu phải có lý do.');
      const acceptance = await tx.workAcceptance.findFirst({ where: { workOrderId: id, status: WorkAcceptanceStatus.PENDING }, orderBy: { createdAt: 'desc' } });
      if (!acceptance) throw new NotFoundException('Không tìm thấy phiếu nghiệm thu đang chờ.');
      const next = approve ? WorkOrderStatus.ACCEPTED : WorkOrderStatus.REWORK_REQUIRED;
      await tx.workAcceptance.update({ where: { id: acceptance.id }, data: { status: approve ? WorkAcceptanceStatus.APPROVED : WorkAcceptanceStatus.REWORK_REQUIRED, reviewedById: actor.id, reviewedAt: new Date(), reason } });
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: next, version: { increment: 1 } } });
      if (approve) {
        const segments = await tx.workExecutionSegment.findMany({ where: { workOrderId: id }, select: { driverId: true }, distinct: ['driverId'] });
        await Promise.all(segments.map((segment) => tx.driverKpiEvent.create({ data: { driverId: segment.driverId, workOrderId: id, type: DriverKpiEventType.ACCEPTANCE_APPROVED } })));
        await this.releaseResourcesIfPossible(tx, id);
      }
      await this.syncLegacyStatus(tx, order, next);
      await this.event(tx, id, actor.id, approve ? 'ACCEPTANCE_APPROVE' : 'ACCEPTANCE_REJECT', order.status, next, reason);
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async cancel(id: number, reason: string | undefined, actor: OperationalActor) {
    if (!reason) throw new BadRequestException('Hủy công việc phải có lý do.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      this.assertManagementRole(actor, order.type);
      assertOperationalAccess(actor, order.unit);
      if (new Set<WorkOrderStatus>([WorkOrderStatus.ACCEPTED, WorkOrderStatus.CLOSED, WorkOrderStatus.CANCELLED]).has(order.status)) throw new BadRequestException(`Không thể hủy từ trạng thái ${order.status}.`);
      await tx.workVehicleAssignment.updateMany({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.CANCELLED, endAt: new Date(), reason } });
      await tx.workDriverAssignment.updateMany({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.CANCELLED, endAt: new Date(), reason } });
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: WorkOrderStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason, version: { increment: 1 } } });
      await this.syncLegacyStatus(tx, order, WorkOrderStatus.CANCELLED);
      await this.releaseResourcesIfPossible(tx, id);
      await this.event(tx, id, actor.id, 'CANCEL', order.status, WorkOrderStatus.CANCELLED, reason);
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async close(id: number, actor: OperationalActor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      this.assertAcceptanceRole(actor, order.type);
      assertOperationalAccess(actor, order.unit);
      if (order.status !== WorkOrderStatus.ACCEPTED) {
        throw new BadRequestException(`Chỉ có thể đóng công việc đã nghiệm thu, trạng thái hiện tại: ${order.status}.`);
      }
      await tx.operationalWorkOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.CLOSED, closedAt: new Date(), version: { increment: 1 } },
      });
      await this.event(tx, id, actor.id, 'CLOSE', order.status, WorkOrderStatus.CLOSED);
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  private async lockOrder(tx: Tx, id: number) {
    await tx.$queryRaw`SELECT id FROM operational_work_orders WHERE id = ${id} FOR UPDATE`;
    const order = await tx.operationalWorkOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Không tìm thấy công việc #${id}.`);
    return order;
  }

  private async lockResourceRows(tx: Tx, vehicleId: number, driverId?: number) {
    await tx.$queryRaw`SELECT id FROM vehicles WHERE id = ${vehicleId} FOR UPDATE`;
    if (driverId) await tx.$queryRaw`SELECT id FROM users WHERE id = ${driverId} FOR UPDATE`;
  }

  private assertVersion(actual: number, expected?: number) {
    if (expected !== undefined && actual !== expected) throw new ConflictException({ code: 'ORDER_VERSION_CONFLICT', expectedVersion: expected, actualVersion: actual });
  }

  private assertDispatcher(actor: OperationalActor) {
    if (!new Set<Role>([Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER]).has(actor.role)) throw new ForbiddenException('Không có quyền phân công công việc.');
  }

  private assertManagementRole(actor: OperationalActor, type: WorkOrderType) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (type === WorkOrderType.TRANSPORT && actor.role === Role.DISPATCHER) return;
    if (new Set<WorkOrderType>([WorkOrderType.DISPATCH, WorkOrderType.INTERNAL_FEED]).has(type) && actor.role === Role.FARM_MANAGER) return;
    throw new ForbiddenException('Vai trò hiện tại không có quyền duyệt hoặc phân công loại công việc này.');
  }

  private assertAcceptanceRole(actor: OperationalActor, type: WorkOrderType) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (type === WorkOrderType.TRANSPORT && actor.role === Role.DISPATCHER) return;
    if (new Set<WorkOrderType>([WorkOrderType.DISPATCH, WorkOrderType.INTERNAL_FEED]).has(type) && actor.role === Role.FARM_MANAGER) return;
    throw new ForbiddenException('Vai trò hiện tại không có quyền nghiệm thu loại công việc này.');
  }

  private async ensureDriverProfile(tx: Tx, driverId: number) {
    const existing = await tx.driverProfile.findUnique({ where: { userId: driverId } });
    if (existing) return existing;
    const user = await tx.user.findUnique({ where: { id: driverId } });
    if (!user || user.role !== Role.DRIVER) throw new BadRequestException(`Người dùng #${driverId} không phải tài xế.`);
    return tx.driverProfile.create({ data: { userId: user.id, employmentStatus: user.employmentStatus, joinedDate: user.joinedDate, resignedDate: user.resignedDate, resignedReason: user.resignedReason, licenseClass: user.licenseClass, licenseNumber: user.licenseNumber, licenseExpiryDate: user.licenseExpiryDate, healthCheckExpiryDate: user.healthCheckExpiryDate, currentShiftStatus: user.currentShiftStatus ?? DriverShiftStatus.SAN_SANG, currentLocation: user.currentLocation } });
  }

  private activeDriverAssignment(tx: Tx, workOrderId: number) {
    return tx.workDriverAssignment.findFirst({ where: { workOrderId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, orderBy: { createdAt: 'desc' } });
  }

  private activeVehicleAssignment(tx: Tx, workOrderId: number) {
    return tx.workVehicleAssignment.findFirst({ where: { workOrderId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, orderBy: { createdAt: 'desc' } });
  }

  private async createEvidence(tx: Tx, workOrderId: number, actorId: number, evidence: Array<{ type: WorkEvidenceType; url: string; capturedAt: Date; lat?: number; lng?: number; checksum?: string }>) {
    if (!evidence.length) return;
    await tx.workEvidence.createMany({ data: evidence.map((item) => ({ ...item, workOrderId, createdById: actorId })) });
  }

  private validateSegmentMetrics(segment: any, dto: FinishExecutionDto) {
    if (dto.endOdoKm !== undefined && segment.startOdoKm !== null && dto.endOdoKm < segment.startOdoKm) throw new BadRequestException('ODO kết thúc không được nhỏ hơn ODO bắt đầu.');
    if (dto.endMachineHours !== undefined && segment.startMachineHours !== null && dto.endMachineHours < segment.startMachineHours) throw new BadRequestException('Giờ máy kết thúc không được nhỏ hơn giờ máy bắt đầu.');
    return {
      distanceKm: dto.endOdoKm !== undefined && segment.startOdoKm !== null ? dto.endOdoKm - segment.startOdoKm : 0,
      machineHours: dto.endMachineHours !== undefined && segment.startMachineHours !== null ? dto.endMachineHours - segment.startMachineHours : 0,
    };
  }

  private async updateVehicleMetrics(tx: Tx, vehicleId: number, dto: FinishExecutionDto, metrics: { distanceKm: number; machineHours: number }) {
    const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return;
    if (dto.endOdoKm !== undefined && dto.endOdoKm < vehicle.odoKm) throw new BadRequestException('ODO kết thúc không được nhỏ hơn ODO hiện tại của xe.');
    const nextServiceHours = vehicle.hoursSinceLastService + metrics.machineHours;
    const remaining = 250 - nextServiceHours;
    await tx.vehicle.update({ where: { id: vehicleId }, data: { odoKm: dto.endOdoKm ?? vehicle.odoKm, totalMachineHours: Math.max(vehicle.totalMachineHours, dto.endMachineHours ?? vehicle.totalMachineHours), hoursSinceLastService: nextServiceHours, alertTier: remaining <= 20 ? 'RED' : remaining <= 50 ? 'AMBER' : 'GREEN' } });
  }

  private async releaseResourcesIfPossible(tx: Tx, workOrderId: number) {
    const vehicleAssignment = await this.activeVehicleAssignment(tx, workOrderId);
    const driverAssignment = await this.activeDriverAssignment(tx, workOrderId);
    if (vehicleAssignment) {
      const blocking = await tx.workExecutionSegment.findFirst({ where: { vehicleId: vehicleAssignment.vehicleId, endedAt: null, workOrderId: { not: workOrderId } } });
      const workshop = await tx.repairTicket.findFirst({ where: { vehicleId: vehicleAssignment.vehicleId, cancelledAt: null, endedAt: null, status: { not: 'COMPLETED' } } });
      const maintenance = await tx.maintenanceRecord.findFirst({ where: { vehicleId: vehicleAssignment.vehicleId, cancelledAt: null, endedAt: null, status: { not: 'COMPLETED' } } });
      if (!blocking && !workshop && !maintenance) await tx.vehicle.update({ where: { id: vehicleAssignment.vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG } });
    }
    if (driverAssignment) await tx.user.update({ where: { id: driverAssignment.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
  }

  private async event(tx: Tx, workOrderId: number, actorId: number, action: string, oldStatus?: WorkOrderStatus, newStatus?: WorkOrderStatus, reason?: string, payload?: Prisma.InputJsonValue) {
    await tx.workOrderEvent.create({ data: { workOrderId, actorId, action, oldStatus, newStatus, reason, payload } });
  }

  private async syncLegacyAssignment(tx: Tx, order: any, vehicleId: number, driverId: number | undefined, status: WorkOrderStatus) {
    if (order.type === WorkOrderType.DISPATCH && order.dispatchOrderId) await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { vehicleId, driverId: driverId ?? null, status: status === WorkOrderStatus.OPEN_FOR_CLAIM ? DispatchStatus.APPROVED : DispatchStatus.ASSIGNED, assignedAt: new Date() } });
    if (order.type === WorkOrderType.TRANSPORT && order.transportOrderId) await tx.transportOrder.update({ where: { id: order.transportOrderId }, data: { vehicleId, driverId: driverId ?? null, status: status === WorkOrderStatus.OPEN_FOR_CLAIM ? TransportStatus.APPROVED : TransportStatus.ASSIGNED, assignedAt: new Date() } });
    if (order.type === WorkOrderType.INTERNAL_FEED && order.internalFeedTripId) await tx.internalFeedTrip.update({ where: { id: order.internalFeedTripId }, data: { vehicleId, ...(driverId ? { driverId } : {}) } });
  }

  private async syncLegacyStatus(tx: Tx, order: any, status: WorkOrderStatus) {
    if (order.type === WorkOrderType.DISPATCH && order.dispatchOrderId) {
      const map: Partial<Record<WorkOrderStatus, DispatchStatus>> = { DRIVER_ACCEPTED: DispatchStatus.DRIVER_ACCEPTED, IN_PROGRESS: DispatchStatus.WORKING, SUBMITTED_FOR_ACCEPTANCE: DispatchStatus.COMPLETED, ACCEPTED: DispatchStatus.ACCEPTED, REWORK_REQUIRED: DispatchStatus.WORKING, CANCELLED: DispatchStatus.CANCELLED };
      if (map[status]) await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: map[status] } });
    }
    if (order.type === WorkOrderType.TRANSPORT && order.transportOrderId) {
      const map: Partial<Record<WorkOrderStatus, TransportStatus>> = { DRIVER_ACCEPTED: TransportStatus.DRIVER_ACCEPTED, IN_PROGRESS: TransportStatus.IN_TRANSIT, SUBMITTED_FOR_ACCEPTANCE: TransportStatus.DELIVERED, ACCEPTED: TransportStatus.ACCEPTED, REWORK_REQUIRED: TransportStatus.IN_TRANSIT, CANCELLED: TransportStatus.CANCELLED };
      if (map[status]) await tx.transportOrder.update({ where: { id: order.transportOrderId }, data: { status: map[status] } });
    }
    if (order.type === WorkOrderType.INTERNAL_FEED && order.internalFeedTripId && status === WorkOrderStatus.ACCEPTED) await tx.internalFeedTrip.update({ where: { id: order.internalFeedTripId }, data: { completedFeedTime: new Date() } });
  }

  private async syncLegacyApproval(tx: Tx, order: any, status: WorkOrderStatus, actorId: number, reason?: string) {
    if (order.type === WorkOrderType.DISPATCH && order.dispatchOrderId) {
      const map: Partial<Record<WorkOrderStatus, DispatchStatus>> = { PENDING_APPROVAL: DispatchStatus.PENDING_APPROVAL, APPROVED: DispatchStatus.APPROVED, REJECTED: DispatchStatus.REJECTED };
      if (map[status]) await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: map[status], submittedAt: status === WorkOrderStatus.PENDING_APPROVAL ? new Date() : undefined, approvedAt: status === WorkOrderStatus.APPROVED ? new Date() : undefined, approvedById: status === WorkOrderStatus.APPROVED ? actorId : undefined, rejectionReason: status === WorkOrderStatus.REJECTED ? reason : undefined } });
    }
    if (order.type === WorkOrderType.TRANSPORT && order.transportOrderId) {
      const map: Partial<Record<WorkOrderStatus, TransportStatus>> = { PENDING_APPROVAL: TransportStatus.PENDING_APPROVAL, APPROVED: TransportStatus.APPROVED };
      if (map[status]) await tx.transportOrder.update({ where: { id: order.transportOrderId }, data: { status: map[status], submittedAt: status === WorkOrderStatus.PENDING_APPROVAL ? new Date() : undefined, approvedAt: status === WorkOrderStatus.APPROVED ? new Date() : undefined, approvedById: status === WorkOrderStatus.APPROVED ? actorId : undefined } });
    }
  }

}
