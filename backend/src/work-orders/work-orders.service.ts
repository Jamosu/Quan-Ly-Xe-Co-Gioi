import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import * as exifr from 'exifr';
import {
  DispatchStatus,
  DispatchSourceType,
  DriverKpiEventType,
  DriverShiftStatus,
  EvidenceLocationStatus,
  JourneyLegStatus,
  JourneyLegType,
  Prisma,
  OperationalEntityType,
  Role,
  RouteType,
  TransportStatus,
  VehicleStatus,
  WorkAcceptanceStatus,
  WorkAssignmentMode,
  WorkAssignmentStatus,
  WorkEvidenceType,
  WorkOrderCategory,
  WorkOrderStatus,
  WorkOrderType,
  WorkPriority,
  Unit,
  VehicleOperationalDomain,
} from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import { OperationalActor, assertOperationalAccess, scopedUnit } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignWorkOrderDto,
  ClaimWorkOrderDto,
  FinishExecutionDto,
  HandoverExecutionDto,
  ReassignWorkOrderDto,
  JourneyAction,
  JourneyActionDto,
  StartExecutionDto,
  WorkReasonDto,
} from './dto/work-order-actions.dto';
import {
  PrepareWorkOrderDto,
  WorkOrderPreparationAction,
} from './dto/prepare-work-order.dto';
import { PreparationContextDto } from './dto/preparation-context.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { DISPATCH_FIRST_DELAY_MINUTES } from '../common/constants/dispatch-delay-policy';

const aggregateInclude = {
  dispatchOrder: { include: { originLocation: true, destinationLocation: true, implement: true, productionOrder: { include: { plan: true, planItem: true } } } },
  transportOrder: { include: { originLocation: true, destinationLocation: true, returnOriginLocation: true, returnDestinationLocation: true, trailer: true, items: true } },
  internalFeedTrip: { include: { material: true } },
  vehicleAssignments: { include: { vehicle: { include: { homeDepot: true } }, assignedBy: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
  driverAssignments: { include: { driver: { include: { user: { select: { id: true, code: true, fullName: true, phone: true, unit: true } } } }, assignedBy: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
  executionSegments: { include: { vehicle: true, driver: { include: { user: { select: { id: true, code: true, fullName: true } } } } }, orderBy: { startedAt: 'asc' } },
  evidence: { orderBy: { capturedAt: 'asc' } },
  acceptances: { include: { reviewedBy: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
  events: { include: { actor: { select: { id: true, fullName: true } } }, orderBy: { occurredAt: 'asc' } },
  kpiEvents: { orderBy: { occurredAt: 'asc' } },
  journeyLegs: { include: { originLocation: true, destinationLocation: true }, orderBy: { sequence: 'asc' } },
  workLocation: true,
  requestedVehicleType: true,
} satisfies Prisma.OperationalWorkOrderInclude;

type Tx = Prisma.TransactionClient;
export interface DriverDelayAlert {
  isLate: true;
  delayMinutes: number;
  thresholdMinutes: number;
  phase: 'WAITING_ACCEPTANCE' | 'WAITING_DEPARTURE';
}

export const buildDriverDelayAlert = (
  order: { status: WorkOrderStatus; plannedStartAt: Date },
  now = new Date(),
): DriverDelayAlert | null => {
  if (order.status !== WorkOrderStatus.ASSIGNED && order.status !== WorkOrderStatus.DRIVER_ACCEPTED) return null;
  const delayMinutes = Math.floor((now.getTime() - order.plannedStartAt.getTime()) / 60_000);
  if (delayMinutes < DISPATCH_FIRST_DELAY_MINUTES) return null;
  return {
    isLate: true,
    delayMinutes,
    thresholdMinutes: DISPATCH_FIRST_DELAY_MINUTES,
    phase: order.status === WorkOrderStatus.ASSIGNED ? 'WAITING_ACCEPTANCE' : 'WAITING_DEPARTURE',
  };
};

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly maintenance?: MaintenanceService,
  ) {}

  async preparationContext(dto: PreparationContextDto, actor: OperationalActor) {
    this.assertDispatcher(actor);
    const unit = scopedUnit(actor, dto.unit) ?? dto.unit;
    const complexCode = dto.complexCode || ((unit === Unit.NT1 || unit === Unit.NT2 || unit === Unit.BAN_CO_GIOI) ? 'KOUN_MOM' : undefined);
    const availability = await this.availability.search({
      startAt: dto.startAt,
      endAt: dto.endAt,
      unit,
      category: dto.category,
      complexCode,
      excludeWorkOrderId: dto.excludeWorkOrderId,
    }, actor);
    const domain: Record<WorkOrderCategory, VehicleOperationalDomain> = {
      [WorkOrderCategory.AGRICULTURE]: VehicleOperationalDomain.AGRICULTURE,
      [WorkOrderCategory.CONSTRUCTION]: VehicleOperationalDomain.CONSTRUCTION,
      [WorkOrderCategory.TRANSPORT]: VehicleOperationalDomain.TRANSPORT,
    };
    const availableVehicleIds = availability.vehicles.map((item) => item.id);
    const driverIds = availability.drivers.map((item) => item.id);
    const implementWhere: Record<string, unknown> = { usageMode: 'ATTACHABLE' };
    const [vehicles, drivers, implementsList, excludedWorkOrder] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: {
          id: { in: availableVehicleIds },
          vehicleType: { is: { active: true, isAssignable: true, operationalDomain: domain[dto.category] } },
        },
        include: { vehicleType: true, homeDepot: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { id: { in: driverIds }, role: Role.DRIVER, isActive: true },
        include: { driverProfile: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.agriculturalImplement.findMany({
        where: implementWhere,
        include: { compatibleVehicleTypes: true, currentVehicle: { select: { id: true, code: true, name: true } } },
        orderBy: { code: 'asc' },
      }),
      dto.excludeWorkOrderId
        ? this.prisma.operationalWorkOrder.findUnique({
            where: { id: dto.excludeWorkOrderId },
            select: { dispatchOrderId: true, transportOrderId: true },
          })
        : null,
    ]);
    const [busyDispatchImplements, busyTransportImplements] = await Promise.all([
      this.prisma.dispatchOrder.findMany({
        where: {
          id: excludedWorkOrder?.dispatchOrderId ? { not: excludedWorkOrder.dispatchOrderId } : undefined,
          implementId: { not: null },
          status: { in: [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.AT_WORKSITE, DispatchStatus.WORKING, DispatchStatus.RETURNING_TO_DEPOT] },
          departureTime: { lt: dto.endAt },
          plannedEndTime: { gt: dto.startAt },
        },
        select: { implementId: true },
      }),
      this.prisma.transportOrder.findMany({
        where: {
          id: excludedWorkOrder?.transportOrderId ? { not: excludedWorkOrder.transportOrderId } : undefined,
          trailerId: { not: null },
          status: { in: [TransportStatus.ASSIGNED, TransportStatus.DRIVER_ACCEPTED, TransportStatus.AT_PICKUP, TransportStatus.LOADING, TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT, TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING, TransportStatus.RETURNING_TO_DEPOT, TransportStatus.AT_DEPOT] },
          departureTime: { lt: dto.endAt },
          plannedEndTime: { gt: dto.startAt },
        },
        select: { trailerId: true },
      }),
    ]);
    const busyImplementIds = new Set([
      ...busyDispatchImplements.map((item) => item.implementId).filter((id): id is number => id !== null),
      ...busyTransportImplements.map((item) => item.trailerId).filter((id): id is number => id !== null),
    ]);
    const vehicleAvailability = new Map(availability.vehicles.map((item) => [item.id, item]));
    const driverAvailability = new Map(availability.drivers.map((item) => [item.id, item]));

    const getVehicleRank = (vehicle: any) => {
      const avail = vehicleAvailability.get(vehicle.id);
      if (avail?.available) return 0;
      const reasons = (avail?.reasons ?? []).map((r: any) => (r.code || '') + ' ' + (r.message || '')).join(' ');
      const isRepair =
        vehicle.status === VehicleStatus.SUA_CHUA ||
        vehicle.status === VehicleStatus.BAO_DUONG ||
        /REPAIR|MAINTENANCE|BẢO DƯỠNG|SỬA CHỮA/i.test(reasons);
      if (!isRepair) return 1; // bận do đang lái / bận lệnh / đang thi công
      return 2; // sửa chữa / bảo dưỡng
    };

    const sortedVehicles = vehicles
      .map((vehicle) => ({ ...vehicle, availability: vehicleAvailability.get(vehicle.id) }))
      .sort((a, b) => {
        const rankA = getVehicleRank(a);
        const rankB = getVehicleRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.code.localeCompare(b.code);
      });

    const isEligibleDriver = (driver: any) => {
      if (dto.category !== WorkOrderCategory.AGRICULTURE) return true;
      const lic = String(driver.driverProfile?.licenseClass || driver.licenseClass || '').toUpperCase();
      const notes = String(driver.notes || '').toLowerCase();
      const hasB = lic.includes('B2') || lic.includes('B1') || lic === 'HANG_B' || lic.includes('NONG_NGHIEP');
      const isC = lic.includes('HANG_C') || lic.includes('HANG_CE');
      const hasAddB = notes.includes('b2') || notes.includes('hạng b') || notes.includes('máy cày') || notes.includes('máy kéo');
      return hasB || (isC && hasAddB);
    };

    const sortedDrivers = drivers
      .filter(isEligibleDriver)
      .map((driver) => ({ ...driver, availability: driverAvailability.get(driver.id) }))
      .sort((a, b) => {
        const availA = a.availability?.available ? 0 : 1;
        const availB = b.availability?.available ? 0 : 1;
        if (availA !== availB) return availA - availB;
        return a.code.localeCompare(b.code);
      });

    return {
      requestedInterval: availability.requestedInterval,
      policy: availability.policy,
      vehicles: sortedVehicles,
      drivers: sortedDrivers,
      implements: implementsList.filter((item) => !busyImplementIds.has(item.id)),
    };
  }

  async findAll(status: string | undefined, type: string | undefined, actor: OperationalActor) {
    const where: Prisma.OperationalWorkOrderWhereInput = {};
    if (status && Object.values(WorkOrderStatus).includes(status as WorkOrderStatus)) where.status = status as WorkOrderStatus;
    if (type && Object.values(WorkOrderType).includes(type as WorkOrderType)) where.type = type as WorkOrderType;
    if (actor.role === Role.DRIVER) {
      where.unit = actor.unit;
      where.status = { in: [WorkOrderStatus.OPEN_FOR_CLAIM, WorkOrderStatus.ASSIGNED, WorkOrderStatus.DRIVER_ACCEPTED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.REWORK_REQUIRED] };
      where.OR = [
        { assignmentMode: WorkAssignmentMode.OPEN_ASSIGNMENT, status: WorkOrderStatus.OPEN_FOR_CLAIM },
        { driverAssignments: { some: { driverId: actor.id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } } } },
      ];
    } else if (actor.role !== Role.SUPER_ADMIN && actor.unit !== 'TOAN_KLH' && !(actor.role === Role.DISPATCHER && actor.unit === 'BAN_CO_GIOI')) {
      where.unit = actor.unit;
    }
    const items = await this.prisma.operationalWorkOrder.findMany({ where, include: aggregateInclude, orderBy: [{ plannedStartAt: 'asc' }, { id: 'asc' }] });
    const now = new Date();
    const enrichedItems = items.map((item) => ({ ...item, driverDelay: buildDriverDelayAlert(item, now) }));
    return { items: enrichedItems, pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1 } };
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

  async createManual(dto: PrepareWorkOrderDto, actor: OperationalActor) {
    this.assertDispatcher(actor);
    await this.validatePreparation(dto, actor);

    const issue = dto.action === WorkOrderPreparationAction.ISSUE;
    if (issue && !dto.vehicleId) throw new BadRequestException('Phát hành lệnh phải chọn xe thực hiện.');
    if (issue && dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT && !dto.driverId) {
      throw new BadRequestException('Giao cứng phải chọn tài xế.');
    }
    const type = dto.category === WorkOrderCategory.TRANSPORT ? WorkOrderType.TRANSPORT : WorkOrderType.DISPATCH;
    const prefix = dto.category === WorkOrderCategory.AGRICULTURE ? 'LDX-NN' : dto.category === WorkOrderCategory.CONSTRUCTION ? 'LDX-CT' : 'LVC-NB';
    const code = `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const workStatus = !issue
      ? WorkOrderStatus.DRAFT
      : dto.assignmentMode === WorkAssignmentMode.OPEN_ASSIGNMENT
        ? WorkOrderStatus.OPEN_FOR_CLAIM
        : WorkOrderStatus.ASSIGNED;

    return this.prisma.$transaction(async (tx) => {
      if (dto.vehicleId) await this.lockResourceRows(tx, dto.vehicleId, dto.driverId);
      if (dto.driverId) await this.ensureDriverProfile(tx, dto.driverId);
      if (issue && dto.vehicleId) {
        await this.availability.assertResourcesAvailable({
          startAt: dto.plannedStartAt,
          endAt: dto.plannedEndAt,
          unit: dto.unit,
          vehicleId: dto.vehicleId,
          driverId: dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT ? dto.driverId : undefined,
        }, actor);
      }

      const legacyStatus = !issue ? 'DRAFT' : dto.assignmentMode === WorkAssignmentMode.OPEN_ASSIGNMENT ? 'APPROVED' : 'ASSIGNED';
      let dispatchOrderId: number | undefined;
      let transportOrderId: number | undefined;
      if (type === WorkOrderType.DISPATCH) {
        const dispatch = await tx.dispatchOrder.create({
          data: {
            code,
            requesterId: actor.id,
            unit: dto.unit,
            purpose: dto.jobName,
            origin: dto.origin,
            destination: dto.destination,
            originLocationId: dto.originLocationId,
            destinationLocationId: dto.destinationLocationId ?? dto.workLocationId,
            sourceType: DispatchSourceType.MANUAL,
            operationDomain: dto.category === WorkOrderCategory.CONSTRUCTION ? 'CONSTRUCTION' : 'AGRICULTURE',
            implementId: dto.implementId,
            vehicleId: issue ? dto.vehicleId : undefined,
            driverId: issue && dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT ? dto.driverId : undefined,
            departureTime: dto.plannedStartAt,
            plannedEndTime: dto.plannedEndAt,
            status: legacyStatus as DispatchStatus,
            assignedById: issue ? actor.id : undefined,
            assignedAt: issue ? new Date() : undefined,
            notes: dto.notes,
          },
        });
        dispatchOrderId = dispatch.id;
      } else {
        const details = dto.categoryDetails ?? {};
        const transport = await tx.transportOrder.create({
          data: {
            code,
            sourceType: DispatchSourceType.MANUAL,
            routeType: 'ONE_WAY',
            unit: dto.unit,
            requestDate: new Date(),
            executionDate: dto.plannedStartAt,
            cargoType: dto.jobName,
            tonnage: dto.targetQuantity ?? 0,
            origin: dto.origin,
            destination: dto.destination,
            originLocationId: dto.originLocationId,
            destinationLocationId: dto.destinationLocationId ?? dto.workLocationId,
            vehicleId: issue ? dto.vehicleId : undefined,
            driverId: issue && dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT ? dto.driverId : undefined,
            trailerId: dto.implementId,
            departureTime: dto.plannedStartAt,
            plannedEndTime: dto.plannedEndAt,
            distanceKm: typeof details.distanceKm === 'number' ? details.distanceKm : 0,
            status: legacyStatus as TransportStatus,
            assignedAt: issue ? new Date() : undefined,
            notes: dto.notes,
            items: {
              create: {
                cargoName: typeof details.cargoType === 'string' ? details.cargoType : dto.jobName,
                unitOfMeasure: dto.targetUnit || 'Tấn',
                plannedQuantity: dto.targetQuantity ?? 0,
                pickupLocation: dto.origin,
                deliveryLocation: dto.destination,
              },
            },
          },
        });
        transportOrderId = transport.id;
      }

      const workOrder = await tx.operationalWorkOrder.create({
        data: {
          type,
          unit: dto.unit,
          category: dto.category,
          sourceType: DispatchSourceType.MANUAL,
          assignmentMode: dto.assignmentMode,
          status: workStatus,
          plannedStartAt: dto.plannedStartAt,
          plannedEndAt: dto.plannedEndAt,
          complexCode: dto.complexCode,
          complexName: dto.complexName,
          enterpriseCode: dto.enterpriseCode,
          enterpriseName: dto.enterpriseName,
          farmCode: dto.farmCode,
          farmName: dto.farmName,
          workLocationId: dto.workLocationId,
          workLocationText: dto.workLocationText,
          workLocationNotes: dto.workLocationNotes,
          workLat: dto.workLat,
          workLng: dto.workLng,
          jobCode: dto.jobCode,
          jobName: dto.jobName,
          jobDescription: dto.jobDescription,
          shift: dto.shift,
          priority: dto.priority ?? WorkPriority.NORMAL,
          targetQuantity: dto.targetQuantity ?? 0,
          targetUnit: dto.targetUnit,
          requestedVehicleTypeId: dto.requestedVehicleTypeId,
          requestedVehicleCount: dto.requestedVehicleCount ?? 1,
          categoryDetails: dto.categoryDetails as Prisma.InputJsonValue | undefined,
          notes: dto.notes,
          dispatchOrderId,
          transportOrderId,
          createdById: actor.id,
          approvedById: issue ? actor.id : undefined,
          approvedAt: issue ? new Date() : undefined,
          ...(issue && dto.vehicleId ? {
            vehicleAssignments: { create: { vehicleId: dto.vehicleId, assignedById: actor.id, startAt: dto.plannedStartAt, endAt: dto.plannedEndAt } },
          } : {}),
          ...(issue && dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT && dto.driverId ? {
            driverAssignments: { create: { driverId: dto.driverId, assignedById: actor.id, startAt: dto.plannedStartAt, endAt: dto.plannedEndAt } },
          } : {}),
        },
      });
      if (issue && dto.driverId && dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT) {
        await tx.driverKpiEvent.create({ data: { driverId: dto.driverId, workOrderId: workOrder.id, type: DriverKpiEventType.ASSIGNED } });
      }
      await this.event(tx, workOrder.id, actor.id, issue ? 'CREATE_AND_ISSUE_MANUAL' : 'CREATE_MANUAL_DRAFT', undefined, workStatus, undefined, { code, category: dto.category, assignmentMode: dto.assignmentMode });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.WORK_ORDER, entityId: workOrder.id, actorId: actor.id, action: issue ? 'CREATE_AND_ISSUE_MANUAL' : 'CREATE_MANUAL_DRAFT', newValue: { code, category: dto.category, status: workStatus, sourceType: DispatchSourceType.MANUAL } } });
      return tx.operationalWorkOrder.findUniqueOrThrow({ where: { id: workOrder.id }, include: aggregateInclude });
    });
  }

  async prepare(id: number, dto: PrepareWorkOrderDto, actor: OperationalActor) {
    this.assertDispatcher(actor);
    const current = await this.findOne(id, actor);
    if (!new Set<WorkOrderStatus>([WorkOrderStatus.DRAFT, WorkOrderStatus.PENDING_APPROVAL, WorkOrderStatus.APPROVED, WorkOrderStatus.REJECTED, WorkOrderStatus.OPEN_FOR_CLAIM]).has(current.status)) {
      throw new BadRequestException(`Không thể thay đổi nội dung chuẩn bị từ trạng thái ${current.status}.`);
    }
    await this.validatePreparation(dto, actor);
    const issue = dto.action === WorkOrderPreparationAction.ISSUE;
    if (issue && !dto.vehicleId) throw new BadRequestException('Phát hành lệnh phải chọn xe thực hiện.');
    if (issue && dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT && !dto.driverId) throw new BadRequestException('Giao cứng phải chọn tài xế.');
    const nextStatus = !issue ? current.status : dto.assignmentMode === WorkAssignmentMode.OPEN_ASSIGNMENT ? WorkOrderStatus.OPEN_FOR_CLAIM : WorkOrderStatus.ASSIGNED;
    return this.prisma.$transaction(async (tx) => {
      if (dto.vehicleId) await this.lockResourceRows(tx, dto.vehicleId, dto.driverId);
      if (dto.driverId) await this.ensureDriverProfile(tx, dto.driverId);
      if (issue && dto.vehicleId) {
        await this.availability.assertResourcesAvailable({ startAt: dto.plannedStartAt, endAt: dto.plannedEndAt, unit: dto.unit, vehicleId: dto.vehicleId, driverId: dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT ? dto.driverId : undefined, excludeWorkOrderId: id }, actor);
      }
      const legacyStatus = dto.assignmentMode === WorkAssignmentMode.OPEN_ASSIGNMENT ? 'APPROVED' : 'ASSIGNED';
      if (current.dispatchOrderId) {
        await tx.dispatchOrder.update({ where: { id: current.dispatchOrderId }, data: { unit: dto.unit, purpose: dto.jobName, origin: dto.origin, destination: dto.destination, originLocationId: dto.originLocationId, destinationLocationId: dto.destinationLocationId ?? dto.workLocationId, operationDomain: dto.category === WorkOrderCategory.CONSTRUCTION ? 'CONSTRUCTION' : 'AGRICULTURE', implementId: dto.implementId, departureTime: dto.plannedStartAt, plannedEndTime: dto.plannedEndAt, notes: dto.notes, ...(issue ? { vehicleId: dto.vehicleId, driverId: dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT ? dto.driverId : null, status: legacyStatus as DispatchStatus, assignedById: actor.id, assignedAt: new Date() } : {}) } });
      }
      if (current.transportOrderId) {
        const details = dto.categoryDetails ?? {};
        await tx.transportOrder.update({ where: { id: current.transportOrderId }, data: { unit: dto.unit, cargoType: typeof details.cargoType === 'string' ? details.cargoType : dto.jobName, tonnage: dto.targetQuantity ?? 0, origin: dto.origin, destination: dto.destination, originLocationId: dto.originLocationId, destinationLocationId: dto.destinationLocationId ?? dto.workLocationId, trailerId: dto.implementId, departureTime: dto.plannedStartAt, plannedEndTime: dto.plannedEndAt, distanceKm: typeof details.distanceKm === 'number' ? details.distanceKm : 0, notes: dto.notes, ...(issue ? { vehicleId: dto.vehicleId, driverId: dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT ? dto.driverId : null, status: legacyStatus as TransportStatus, assignedAt: new Date() } : {}) } });
      }
      if (issue) {
        await tx.workVehicleAssignment.updateMany({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.REASSIGNED, endAt: new Date(), reason: 'Cập nhật tại bước chuẩn bị lệnh' } });
        await tx.workDriverAssignment.updateMany({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.REASSIGNED, endAt: new Date(), reason: 'Cập nhật tại bước chuẩn bị lệnh' } });
        await tx.workVehicleAssignment.create({ data: { workOrderId: id, vehicleId: dto.vehicleId!, assignedById: actor.id, startAt: dto.plannedStartAt, endAt: dto.plannedEndAt } });
        if (dto.assignmentMode === WorkAssignmentMode.FIXED_ASSIGNMENT && dto.driverId) {
          await tx.workDriverAssignment.create({ data: { workOrderId: id, driverId: dto.driverId, assignedById: actor.id, startAt: dto.plannedStartAt, endAt: dto.plannedEndAt } });
          await tx.driverKpiEvent.create({ data: { driverId: dto.driverId, workOrderId: id, type: DriverKpiEventType.ASSIGNED, payload: { source: current.sourceType } } });
        }
      }
      await tx.operationalWorkOrder.update({ where: { id }, data: { unit: dto.unit, category: dto.category, assignmentMode: dto.assignmentMode, status: nextStatus, plannedStartAt: dto.plannedStartAt, plannedEndAt: dto.plannedEndAt, complexCode: dto.complexCode, complexName: dto.complexName, enterpriseCode: dto.enterpriseCode, enterpriseName: dto.enterpriseName, farmCode: dto.farmCode, farmName: dto.farmName, workLocationId: dto.workLocationId, workLocationText: dto.workLocationText, workLocationNotes: dto.workLocationNotes, workLat: dto.workLat, workLng: dto.workLng, jobCode: dto.jobCode, jobName: dto.jobName, jobDescription: dto.jobDescription, shift: dto.shift, priority: dto.priority ?? WorkPriority.NORMAL, targetQuantity: dto.targetQuantity ?? 0, targetUnit: dto.targetUnit, requestedVehicleTypeId: dto.requestedVehicleTypeId, requestedVehicleCount: 1, categoryDetails: dto.categoryDetails as Prisma.InputJsonValue | undefined, notes: dto.notes, ...(issue ? { approvedById: actor.id, approvedAt: new Date() } : {}), version: { increment: 1 } } });
      await this.event(tx, id, actor.id, issue ? 'PREPARE_AND_ISSUE' : 'UPDATE_PREPARATION', current.status, nextStatus, undefined, { category: dto.category, assignmentMode: dto.assignmentMode, sourceType: current.sourceType });
      return tx.operationalWorkOrder.findUniqueOrThrow({ where: { id }, include: aggregateInclude });
    });
  }

  private async validatePreparation(dto: PrepareWorkOrderDto, actor: OperationalActor) {
    if (dto.plannedEndAt <= dto.plannedStartAt) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    scopedUnit(actor, dto.unit);
    const [complex, enterprise, farms, location, vehicleType] = await Promise.all([
      this.prisma.catalogItem.findFirst({ where: { type: 'COMPLEX', code: dto.complexCode } }),
      this.prisma.catalogItem.findFirst({ where: { type: 'ENTERPRISE', code: dto.enterpriseCode } }),
      this.prisma.catalogItem.findMany({ where: { type: 'FARM', parentCode: dto.enterpriseCode }, select: { code: true } }),
      dto.workLocationId ? this.prisma.operationalLocation.findUnique({ where: { id: dto.workLocationId } }) : null,
      dto.requestedVehicleTypeId ? this.prisma.vehicleType.findUnique({ where: { id: dto.requestedVehicleTypeId } }) : null,
    ]);
    if (!complex) throw new BadRequestException('Khu liên hợp không tồn tại trong danh mục.');
    if (!enterprise) throw new BadRequestException('Xí nghiệp không tồn tại trong danh mục.');
    if (enterprise.parentCode && enterprise.parentCode !== dto.complexCode) throw new BadRequestException('Xí nghiệp không thuộc Khu liên hợp đã chọn.');
    if (farms.length && !dto.farmCode) throw new BadRequestException('Xí nghiệp đã chọn yêu cầu chọn Nông trường.');
    if (dto.farmCode && !farms.some((farm) => farm.code === dto.farmCode)) throw new BadRequestException('Nông trường không thuộc Xí nghiệp đã chọn.');
    if (dto.workLocationId && (!location || !location.active)) throw new BadRequestException('Vị trí làm việc không tồn tại hoặc đã ngừng sử dụng.');
    if (dto.requestedVehicleTypeId && !vehicleType) throw new BadRequestException('Loại xe yêu cầu không tồn tại.');
    if (dto.requestedVehicleCount && dto.requestedVehicleCount !== 1) throw new BadRequestException('Mỗi lệnh điều xe chỉ được gắn với một xe.');
    const details = dto.categoryDetails ?? {};
    if (dto.category === WorkOrderCategory.AGRICULTURE && typeof details.agricultureJobType !== 'string') throw new BadRequestException('Công việc nông nghiệp phải chọn loại công việc nông nghiệp.');
    if (dto.category === WorkOrderCategory.CONSTRUCTION && typeof details.constructionType !== 'string') throw new BadRequestException('Công việc công trình phải chọn loại công trình.');
    if (dto.category === WorkOrderCategory.TRANSPORT && typeof details.cargoType !== 'string') throw new BadRequestException('Công việc vận chuyển phải nhập loại hàng.');
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

  async ensureApprovedForAssignment(id: number, actor: OperationalActor) {
    let order = await this.prisma.operationalWorkOrder.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw new NotFoundException(`Không tìm thấy công việc #${id}.`);
    if (order.status === WorkOrderStatus.DRAFT || order.status === WorkOrderStatus.REJECTED) {
      const submitted = await this.transitionApproval(id, WorkOrderStatus.PENDING_APPROVAL, undefined, actor);
      order = { status: submitted!.status };
    }
    if (order.status === WorkOrderStatus.PENDING_APPROVAL) {
      const approved = await this.transitionApproval(id, WorkOrderStatus.APPROVED, undefined, actor);
      order = { status: approved!.status };
    }
    if (order.status !== WorkOrderStatus.APPROVED) {
      throw new BadRequestException(`Không thể phê duyệt và phân công công việc từ trạng thái ${order.status}.`);
    }
    return order;
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
      await this.syncLegacyAssignment(tx, order, dto.vehicleId, dto.driverId, nextStatus, startAt, endAt);
      await this.event(tx, id, actor.id, 'ASSIGN', order.status, nextStatus, dto.reason, { vehicleId: dto.vehicleId, driverId: dto.driverId, assignmentMode: dto.assignmentMode });
      return tx.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    });
  }

  async claimOptions(id: number, actor: OperationalActor) {
    if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế được xem lựa chọn xe khi nhận lệnh mở.');
    const order = await this.findOne(id, actor);
    if (order.assignmentMode !== WorkAssignmentMode.OPEN_ASSIGNMENT || order.status !== WorkOrderStatus.OPEN_FOR_CLAIM) {
      throw new ConflictException({ code: 'ORDER_ALREADY_CLAIMED', message: 'Lệnh không còn mở để nhận.' });
    }
    const reserved = order.vehicleAssignments.find((item) => new Set<WorkAssignmentStatus>([WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED]).has(item.status));
    if (!reserved) throw new ConflictException({ code: 'RESOURCE_NOT_AVAILABLE', message: 'Lệnh chưa có xe hợp lệ.' });
    const now = new Date();
    const [primary, account] = await Promise.all([
      this.prisma.vehicleDriverAssignment.findFirst({
        where: {
          driverId: actor.id,
          type: 'PRIMARY',
          status: 'ACTIVE',
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
        include: { vehicle: true },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.user.findUnique({ where: { id: actor.id }, include: { assignedVehicle: true } }),
    ]);
    const currentVehicle = primary?.vehicle ?? account?.assignedVehicle;
    const candidates = [
      ...(currentVehicle && currentVehicle.unit === order.unit ? [{ vehicle: currentVehicle, source: 'DRIVER_CURRENT' as const }] : []),
      [{ vehicle: reserved.vehicle, source: 'ORDER_RESERVED' as const }],
    ].flat();
    const options = candidates.reduce<Array<{ id: number; code: string; name: string; plate?: string; source: 'DRIVER_CURRENT' | 'ORDER_RESERVED' | 'BOTH' }>>((items, item) => {
      const existing = items.find((option) => option.id === item.vehicle.id);
      if (existing) existing.source = 'BOTH';
      else items.push({ id: item.vehicle.id, code: item.vehicle.code, name: item.vehicle.name, plate: item.vehicle.plate ?? undefined, source: item.source });
      return items;
    }, []);
    return { defaultVehicleId: currentVehicle && currentVehicle.unit === order.unit ? currentVehicle.id : reserved.vehicleId, options };
  }

  async claim(id: number, dto: ClaimWorkOrderDto = {}, actor: OperationalActor) {
    if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế được nhận lệnh mở.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      if (order.assignmentMode !== WorkAssignmentMode.OPEN_ASSIGNMENT || order.status !== WorkOrderStatus.OPEN_FOR_CLAIM) {
        throw new ConflictException({ code: 'ORDER_ALREADY_CLAIMED', message: 'Lệnh không còn mở để nhận.' });
      }
      if (order.unit !== actor.unit) throw new ForbiddenException('Lệnh mở không thuộc đơn vị của tài xế.');
      const vehicleAssignment = await tx.workVehicleAssignment.findFirst({ where: { workOrderId: id, status: WorkAssignmentStatus.ASSIGNED }, orderBy: { createdAt: 'desc' } });
      if (!vehicleAssignment) throw new ConflictException({ code: 'RESOURCE_NOT_AVAILABLE', message: 'Lệnh chưa có xe hợp lệ.' });
      const now = new Date();
      const [primary, account] = await Promise.all([
        tx.vehicleDriverAssignment.findFirst({
          where: {
            driverId: actor.id,
            type: 'PRIMARY',
            status: 'ACTIVE',
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          },
          select: { vehicleId: true },
          orderBy: { effectiveFrom: 'desc' },
        }),
        tx.user.findUnique({ where: { id: actor.id }, select: { assignedVehicleId: true } }),
      ]);
      const currentVehicleId = primary?.vehicleId ?? account?.assignedVehicleId;
      const selectedVehicleId = dto.vehicleId ?? vehicleAssignment.vehicleId;
      if (selectedVehicleId !== vehicleAssignment.vehicleId && selectedVehicleId !== currentVehicleId) {
        throw new ConflictException({ code: 'VEHICLE_NOT_CLAIMABLE', message: 'Chỉ được chọn xe đang phụ trách hoặc xe đang giữ cho chuyến.' });
      }
      const selectedVehicle = await tx.vehicle.findUnique({ where: { id: selectedVehicleId }, include: { vehicleType: true } });
      if (!selectedVehicle || selectedVehicle.unit !== order.unit) {
        throw new ConflictException({ code: 'VEHICLE_NOT_CLAIMABLE', message: 'Xe đã chọn không tồn tại hoặc không thuộc đơn vị của lệnh.' });
      }
      const requiredDomain: Record<WorkOrderCategory, VehicleOperationalDomain> = {
        [WorkOrderCategory.AGRICULTURE]: VehicleOperationalDomain.AGRICULTURE,
        [WorkOrderCategory.CONSTRUCTION]: VehicleOperationalDomain.CONSTRUCTION,
        [WorkOrderCategory.TRANSPORT]: VehicleOperationalDomain.TRANSPORT,
      };
      if (!selectedVehicle.vehicleType?.isAssignable || selectedVehicle.vehicleType.operationalDomain !== requiredDomain[order.category]) {
        throw new ConflictException({ code: 'VEHICLE_DOMAIN_MISMATCH', message: 'Xe đã chọn không phù hợp loại công việc của chuyến.' });
      }
      if (order.requestedVehicleTypeId && selectedVehicle.vehicleTypeId !== order.requestedVehicleTypeId) {
        throw new ConflictException({ code: 'VEHICLE_TYPE_MISMATCH', message: 'Xe đã chọn không đúng chủng loại yêu cầu của chuyến.' });
      }
      let implementId: number | null | undefined;
      if (order.dispatchOrderId) {
        implementId = (await tx.dispatchOrder.findUnique({ where: { id: order.dispatchOrderId }, select: { implementId: true } }))?.implementId;
      } else if (order.transportOrderId) {
        implementId = (await tx.transportOrder.findUnique({ where: { id: order.transportOrderId }, select: { trailerId: true } }))?.trailerId;
      }
      if (implementId) {
        const implement = await tx.agriculturalImplement.findUnique({ where: { id: implementId }, include: { compatibleVehicleTypes: true } });
        if (!implement?.compatibleVehicleTypes.some((item) => item.vehicleTypeId === selectedVehicle.vehicleTypeId)) {
          throw new ConflictException({ code: 'IMPLEMENT_INCOMPATIBLE', message: 'Xe đã chọn không tương thích thiết bị gắn kèm của chuyến.' });
        }
      }
      await this.lockResourceRows(tx, selectedVehicleId, actor.id);
      await this.ensureDriverProfile(tx, actor.id);
      await this.availability.assertResourcesAvailable({ startAt: order.plannedStartAt, endAt: order.plannedEndAt, unit: order.unit, category: order.category, vehicleId: selectedVehicleId, driverId: actor.id, excludeWorkOrderId: id }, actor);
      const existing = await tx.workDriverAssignment.findFirst({ where: { workOrderId: id, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } } });
      if (existing) throw new ConflictException({ code: 'ORDER_ALREADY_CLAIMED', message: 'Một tài xế khác đã nhận lệnh.' });
      if (selectedVehicleId !== vehicleAssignment.vehicleId) {
        await tx.workVehicleAssignment.update({
          where: { id: vehicleAssignment.id },
          data: { status: WorkAssignmentStatus.REASSIGNED, endAt: now, reason: 'Tài xế nhận cuốc mở và chọn xe đang phụ trách.' },
        });
        await tx.workVehicleAssignment.create({ data: { workOrderId: id, vehicleId: selectedVehicleId, assignedById: actor.id, startAt: order.plannedStartAt, endAt: order.plannedEndAt } });
      }
      await tx.workDriverAssignment.create({ data: { workOrderId: id, driverId: actor.id, assignedById: actor.id, startAt: order.plannedStartAt, endAt: order.plannedEndAt } });
      await tx.driverKpiEvent.create({ data: { driverId: actor.id, workOrderId: id, type: DriverKpiEventType.ASSIGNED, payload: { source: 'OPEN_CLAIM', vehicleId: selectedVehicleId } } });
      await tx.operationalWorkOrder.update({ where: { id }, data: { status: WorkOrderStatus.ASSIGNED, version: { increment: 1 } } });
      await this.syncLegacyAssignment(tx, order, selectedVehicleId, actor.id, WorkOrderStatus.ASSIGNED, order.plannedStartAt, order.plannedEndAt);
      await this.event(tx, id, actor.id, 'CLAIM', order.status, WorkOrderStatus.ASSIGNED, undefined, { vehicleId: selectedVehicleId, vehicleSource: selectedVehicleId === vehicleAssignment.vehicleId ? 'ORDER_RESERVED' : 'DRIVER_CURRENT' });
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

  async uploadEvidence(id: number, file: Express.Multer.File | undefined, typeValue: string, capturedAtValue: string | undefined, actor: OperationalActor) {
    await this.findOne(id, actor);
    if (!file) throw new BadRequestException('Phải chọn ảnh bằng chứng.');
    if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('Bằng chứng phải là tệp hình ảnh.');
    if (!Object.values(WorkEvidenceType).includes(typeValue as WorkEvidenceType)) throw new BadRequestException('Loại bằng chứng không hợp lệ.');

    const safeExt = new Set(['.jpg', '.jpeg', '.png', '.webp']).has(extname(file.originalname).toLowerCase())
      ? extname(file.originalname).toLowerCase()
      : '.jpg';
    const filename = `${Date.now()}-${randomUUID()}${safeExt}`;
    const directory = join(process.cwd(), 'uploads', 'work-evidence');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), file.buffer);

    let lat: number | undefined;
    let lng: number | undefined;
    let exifCapturedAt: Date | undefined;
    try {
      const gps = await exifr.gps(file.buffer);
      lat = typeof gps?.latitude === 'number' ? gps.latitude : undefined;
      lng = typeof gps?.longitude === 'number' ? gps.longitude : undefined;
      const metadata = await exifr.parse(file.buffer, ['DateTimeOriginal']);
      exifCapturedAt = metadata?.DateTimeOriginal instanceof Date ? metadata.DateTimeOriginal : undefined;
    } catch {
      // Ảnh không có EXIF vẫn là bằng chứng hợp lệ theo nghiệp vụ đã chốt.
    }
    const parsedCapturedAt = capturedAtValue ? new Date(capturedAtValue) : undefined;
    const capturedAt = parsedCapturedAt && !Number.isNaN(parsedCapturedAt.getTime()) ? parsedCapturedAt : exifCapturedAt ?? new Date();
    return this.prisma.workEvidence.create({
      data: {
        workOrderId: id,
        createdById: actor.id,
        type: typeValue as WorkEvidenceType,
        url: `/api/work-orders/evidence/files/${filename}`,
        capturedAt,
        lat,
        lng,
        checksum: createHash('sha256').update(file.buffer).digest('hex'),
        locationStatus: lat !== undefined && lng !== undefined ? EvidenceLocationStatus.EXIF_RECORDED : EvidenceLocationStatus.LOCATION_UNKNOWN,
      },
    });
  }

  async readEvidenceFile(filenameValue: string) {
    const filename = basename(filenameValue);
    if (filename !== filenameValue) throw new BadRequestException('Tên tệp không hợp lệ.');
    try {
      const buffer = await readFile(join(process.cwd(), 'uploads', 'work-evidence', filename));
      const extension = extname(filename).toLowerCase();
      const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
      return { buffer, mimeType };
    } catch {
      throw new NotFoundException('Không tìm thấy ảnh bằng chứng.');
    }
  }

  async journeyAction(id: number, action: JourneyAction, dto: JourneyActionDto, actor: OperationalActor) {
    let operationVehicleId: number | undefined;
    await this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, id);
      if (actor.role !== Role.DRIVER) throw new ForbiddenException('Chỉ tài xế được thao tác hành trình.');
      const driverAssignment = await this.activeDriverAssignment(tx, id);
      const vehicleAssignment = await this.activeVehicleAssignment(tx, id);
      if (!driverAssignment || driverAssignment.driverId !== actor.id || !vehicleAssignment) throw new ForbiddenException('Phân công tài xế hoặc xe không hợp lệ.');
      operationVehicleId = vehicleAssignment.vehicleId;
      if (!new Set<WorkOrderStatus>([WorkOrderStatus.DRIVER_ACCEPTED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.REWORK_REQUIRED]).has(order.status)) {
        throw new BadRequestException(`Không thể cập nhật hành trình từ trạng thái ${order.status}.`);
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleAssignment.vehicleId }, include: { homeDepot: true } });
      if (!vehicle) throw new NotFoundException('Không tìm thấy xe được phân công.');
      await this.validateJourneyEvidence(tx, id, vehicle.gpsImei, action, dto.evidenceId);
      if (dto.evidenceId && dto.lat !== undefined && dto.lng !== undefined) {
        await tx.workEvidence.update({ where: { id: dto.evidenceId }, data: { lat: dto.lat, lng: dto.lng, locationStatus: EvidenceLocationStatus.GPS_RECORDED } });
      }

      await this.ensureJourneyLegs(tx, order, vehicle.homeDepot);
      const legs = await tx.workJourneyLeg.findMany({ where: { workOrderId: id }, orderBy: { sequence: 'asc' } });
      const now = new Date();
      const activeLeg = legs.find((leg) => leg.status !== JourneyLegStatus.COMPLETED && leg.status !== JourneyLegStatus.AT_DEPOT) ?? legs[legs.length - 1];
      if (!activeLeg) throw new BadRequestException('Công việc chưa có chặng hành trình.');

      await this.ensureExecutionStarted(tx, order, vehicleAssignment, driverAssignment, vehicle, dto, now);
      if (order.type === WorkOrderType.DISPATCH) {
        await this.applyDispatchJourneyAction(tx, order, activeLeg, action, dto, now, vehicleAssignment.vehicleId, actor.id);
      } else if (order.type === WorkOrderType.TRANSPORT) {
        await this.applyTransportJourneyAction(tx, order, activeLeg, action, dto, now, vehicleAssignment.vehicleId, actor.id, vehicle.homeDepot);
      } else {
        throw new BadRequestException('Luồng hành trình chi tiết chưa áp dụng cho chuyến tiếp liệu.');
      }
      const updatedWorkOrder = await tx.operationalWorkOrder.findUnique({ where: { id }, select: { status: true } });
      await this.event(tx, id, actor.id, `JOURNEY_${action}`, order.status, updatedWorkOrder?.status, undefined, { legId: activeLeg.id, evidenceId: dto.evidenceId, lat: dto.lat, lng: dto.lng });
    });
    const bdc1 = operationVehicleId && new Set<JourneyAction>([JourneyAction.DEPART_TO_WORK, JourneyAction.ARRIVE_PICKUP]).has(action)
      ? await this.maintenance?.ensureBdc1ForOperation(operationVehicleId, actor.id)
      : null;
    const updated = await this.prisma.operationalWorkOrder.findUnique({ where: { id }, include: aggregateInclude });
    return updated ? { ...updated, bdc1Required: Boolean(bdc1?.required), bdc1LogId: bdc1?.log.id } : null;
  }

  private async validateJourneyEvidence(tx: Tx, workOrderId: number, gpsImei: string | null, action: JourneyAction, evidenceId?: number) {
    const required = new Set<JourneyAction>([JourneyAction.ARRIVE_WORKSITE, JourneyAction.FINISH_WORK, JourneyAction.ARRIVE_PICKUP, JourneyAction.ARRIVE_DELIVERY, JourneyAction.COMPLETE_DELIVERY, JourneyAction.ARRIVE_DEPOT]);
    if (gpsImei || !required.has(action)) return;
    if (!evidenceId) throw new BadRequestException({ code: 'PHOTO_EVIDENCE_REQUIRED', message: 'Xe không có GPS phải chụp ảnh bằng chứng tại mốc này.' });
    const evidence = await tx.workEvidence.findFirst({ where: { id: evidenceId, workOrderId } });
    if (!evidence) throw new BadRequestException('Ảnh bằng chứng không thuộc công việc hiện tại.');
    const expected: Partial<Record<JourneyAction, WorkEvidenceType[]>> = {
      ARRIVE_WORKSITE: [WorkEvidenceType.ARRIVAL_PHOTO], ARRIVE_PICKUP: [WorkEvidenceType.ARRIVAL_PHOTO],
      FINISH_WORK: [WorkEvidenceType.WORK_COMPLETION_PHOTO], ARRIVE_DELIVERY: [WorkEvidenceType.DELIVERY_PHOTO],
      COMPLETE_DELIVERY: [WorkEvidenceType.DELIVERY_PHOTO], ARRIVE_DEPOT: [WorkEvidenceType.DEPOT_RETURN_PHOTO],
    };
    if (expected[action] && !expected[action]!.includes(evidence.type)) throw new BadRequestException('Loại ảnh bằng chứng không khớp mốc hành trình.');
  }

  private async ensureJourneyLegs(tx: Tx, order: { id: number; type: WorkOrderType; dispatchOrderId: number | null; transportOrderId: number | null; internalFeedTripId: number | null }, homeDepot: { id: number; name: string } | null) {
    if (await tx.workJourneyLeg.count({ where: { workOrderId: order.id } })) return;
    if (order.type === WorkOrderType.DISPATCH && order.dispatchOrderId) {
      const dispatch = await tx.dispatchOrder.findUnique({ where: { id: order.dispatchOrderId } });
      if (!dispatch) throw new NotFoundException('Không tìm thấy lệnh điều xe nguồn.');
      const initialStatus = dispatch.status === DispatchStatus.DEPARTED ? JourneyLegStatus.EN_ROUTE_TO_PICKUP
        : dispatch.status === DispatchStatus.AT_WORKSITE ? JourneyLegStatus.AT_DELIVERY
        : dispatch.status === DispatchStatus.WORKING ? JourneyLegStatus.WORKING
        : dispatch.status === DispatchStatus.RETURNING_TO_DEPOT ? JourneyLegStatus.COMPLETED
        : JourneyLegStatus.PLANNED;
      await tx.workJourneyLeg.create({ data: { workOrderId: order.id, sequence: 1, type: JourneyLegType.OUTBOUND, status: initialStatus, originLocationId: dispatch.originLocationId, destinationLocationId: dispatch.destinationLocationId, originName: dispatch.origin, destinationName: dispatch.destination } });
      if (dispatch.status === DispatchStatus.RETURNING_TO_DEPOT) await tx.workJourneyLeg.create({ data: { workOrderId: order.id, sequence: 2, type: JourneyLegType.REPOSITION, status: JourneyLegStatus.RETURNING_TO_DEPOT, originName: dispatch.destination, destinationLocationId: homeDepot?.id, destinationName: homeDepot?.name ?? dispatch.origin, isEmpty: true, startedAt: new Date() } });
      return;
    }
    if (order.type === WorkOrderType.TRANSPORT && order.transportOrderId) {
      const transport = await tx.transportOrder.findUnique({ where: { id: order.transportOrderId } });
      if (!transport) throw new NotFoundException('Không tìm thấy vận đơn nguồn.');
      const originName = transport.origin ?? homeDepot?.name ?? 'Bãi tập kết';
      const destinationName = transport.destination ?? 'Điểm giao hàng';
      const statusMap: Partial<Record<TransportStatus, JourneyLegStatus>> = {
        AT_PICKUP: JourneyLegStatus.AT_PICKUP, LOADING: JourneyLegStatus.LOADING, DEPARTED: JourneyLegStatus.IN_TRANSIT,
        IN_TRANSIT: JourneyLegStatus.IN_TRANSIT, AT_DELIVERY: JourneyLegStatus.AT_DELIVERY, UNLOADING: JourneyLegStatus.UNLOADING,
        DELIVERED: JourneyLegStatus.COMPLETED, RETURNING_TO_DEPOT: JourneyLegStatus.COMPLETED,
      };
      await tx.workJourneyLeg.create({ data: { workOrderId: order.id, sequence: 1, type: JourneyLegType.OUTBOUND, status: statusMap[transport.status] ?? JourneyLegStatus.PLANNED, originLocationId: transport.originLocationId, destinationLocationId: transport.destinationLocationId, originName, destinationName, cargoName: transport.cargoType, tonnage: transport.tonnage, isEmpty: false } });
      if (transport.routeType === RouteType.TWO_WAY) {
       await tx.workJourneyLeg.create({ data: { workOrderId: order.id, sequence: 2, type: JourneyLegType.RETURN, status: transport.status === TransportStatus.RETURNING_TO_DEPOT ? JourneyLegStatus.COMPLETED : JourneyLegStatus.PLANNED, originLocationId: transport.returnOriginLocationId ?? transport.destinationLocationId, destinationLocationId: transport.returnDestinationLocationId ?? (transport.returnDestination ? null : transport.originLocationId), originName: transport.returnOrigin ?? destinationName, destinationName: transport.returnDestination ?? originName, cargoName: transport.returnCargoName, tonnage: transport.returnTonnage, isEmpty: !transport.returnCargoName } });
      }
      if (transport.status === TransportStatus.RETURNING_TO_DEPOT) {
        const lastSequence = transport.routeType === RouteType.TWO_WAY ? 2 : 1;
        await tx.workJourneyLeg.create({ data: { workOrderId: order.id, sequence: lastSequence + 1, type: JourneyLegType.REPOSITION, status: JourneyLegStatus.RETURNING_TO_DEPOT, originName: transport.returnDestination ?? destinationName, destinationLocationId: homeDepot?.id, destinationName: homeDepot?.name ?? originName, isEmpty: true, startedAt: new Date() } });
      }
      return;
    }
    if (order.type === WorkOrderType.INTERNAL_FEED && order.internalFeedTripId) {
      const feed = await tx.internalFeedTrip.findUnique({ where: { id: order.internalFeedTripId } });
      if (feed) await tx.workJourneyLeg.create({ data: { workOrderId: order.id, sequence: 1, type: JourneyLegType.OUTBOUND, originName: feed.sourceLocation, destinationName: feed.destinationLocation } });
    }
  }

  private async ensureExecutionStarted(tx: Tx, order: { id: number; status: WorkOrderStatus }, vehicleAssignment: { id: number; vehicleId: number }, driverAssignment: { id: number; driverId: number }, vehicle: { odoKm: number; totalMachineHours: number }, dto: JourneyActionDto, now: Date) {
    const existing = await tx.workExecutionSegment.findFirst({ where: { workOrderId: order.id, endedAt: null } });
    if (!existing) {
      await tx.workExecutionSegment.create({ data: { workOrderId: order.id, vehicleAssignmentId: vehicleAssignment.id, driverAssignmentId: driverAssignment.id, vehicleId: vehicleAssignment.vehicleId, driverId: driverAssignment.driverId, startedAt: now, startOdoKm: dto.odoKm ?? vehicle.odoKm, startMachineHours: dto.machineHours ?? vehicle.totalMachineHours, startLat: dto.lat, startLng: dto.lng } });
    }
    if (order.status !== WorkOrderStatus.IN_PROGRESS) await tx.operationalWorkOrder.update({ where: { id: order.id }, data: { status: WorkOrderStatus.IN_PROGRESS, version: { increment: 1 } } });
    await tx.vehicle.update({ where: { id: vehicleAssignment.vehicleId }, data: { status: VehicleStatus.HOAT_DONG, ...(dto.lat !== undefined && dto.lng !== undefined ? { currentLat: dto.lat, currentLng: dto.lng, lastGpsUpdate: now } : {}) } });
    await tx.user.update({ where: { id: driverAssignment.driverId }, data: { currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH } });
  }

  private async applyDispatchJourneyAction(tx: Tx, order: { id: number; dispatchOrderId: number | null }, leg: { id: number; status: JourneyLegStatus }, action: JourneyAction, dto: JourneyActionDto, now: Date, vehicleId: number, driverId: number) {
    if (!order.dispatchOrderId) throw new BadRequestException('Công việc không liên kết lệnh điều xe.');
    if (action === JourneyAction.DEPART_TO_WORK && leg.status === JourneyLegStatus.PLANNED) {
      await tx.workJourneyLeg.update({ where: { id: leg.id }, data: { status: JourneyLegStatus.EN_ROUTE_TO_PICKUP, startedAt: now } });
      await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: DispatchStatus.DEPARTED, actualDepartureTime: now } });
    } else if (action === JourneyAction.ARRIVE_WORKSITE && leg.status === JourneyLegStatus.EN_ROUTE_TO_PICKUP) {
      await tx.workJourneyLeg.update({ where: { id: leg.id }, data: { status: JourneyLegStatus.AT_DELIVERY, deliveryAt: now } });
      await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: DispatchStatus.AT_WORKSITE } });
    } else if (action === JourneyAction.START_WORK && leg.status === JourneyLegStatus.AT_DELIVERY) {
      await tx.workJourneyLeg.update({ where: { id: leg.id }, data: { status: JourneyLegStatus.WORKING } });
      await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: DispatchStatus.WORKING, actualStartTime: now } });
    } else if (action === JourneyAction.FINISH_WORK && leg.status === JourneyLegStatus.WORKING) {
      await tx.workJourneyLeg.update({ where: { id: leg.id }, data: { status: JourneyLegStatus.COMPLETED, completedAt: now } });
      await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { actualCompletedTime: now } });
      if (await this.hasNextChainedWork(tx, order.id, vehicleId, driverId, now)) {
        await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: DispatchStatus.COMPLETED } });
        await this.completeJourneyForChain(tx, order.id, dto, now, vehicleId, driverId);
      }
    } else if (action === JourneyAction.RETURN_TO_DEPOT && leg.status === JourneyLegStatus.COMPLETED) {
      const reposition = await this.createRepositionLeg(tx, order.id, vehicleId);
      await tx.workJourneyLeg.update({ where: { id: reposition.id }, data: { status: JourneyLegStatus.RETURNING_TO_DEPOT, startedAt: now } });
      await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: DispatchStatus.RETURNING_TO_DEPOT } });
    } else if (action === JourneyAction.ARRIVE_DEPOT && leg.status === JourneyLegStatus.RETURNING_TO_DEPOT) {
      await tx.workJourneyLeg.update({ where: { id: leg.id }, data: { status: JourneyLegStatus.AT_DEPOT, completedAt: now } });
      await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { status: DispatchStatus.COMPLETED, returnTime: now } });
      await this.completeJourneyAtDepot(tx, order.id, dto, now, vehicleId);
    } else throw new BadRequestException(`Thao tác ${action} không hợp lệ tại trạng thái ${leg.status}.`);
  }

  private async applyTransportJourneyAction(tx: Tx, order: { id: number; transportOrderId: number | null }, leg: { id: number; sequence: number; status: JourneyLegStatus; isEmpty: boolean }, action: JourneyAction, dto: JourneyActionDto, now: Date, vehicleId: number, driverId: number, homeDepot: { id: number; name: string } | null) {
    if (!order.transportOrderId) throw new BadRequestException('Công việc không liên kết vận đơn.');
    let nextLegStatus: JourneyLegStatus | undefined;
    let transportStatus: TransportStatus | undefined;
    let hasRemainingCargoLeg = false;
    const stamps: Prisma.TransportOrderUpdateInput = {};
    if (action === JourneyAction.ARRIVE_PICKUP && leg.status === JourneyLegStatus.PLANNED) { nextLegStatus = JourneyLegStatus.AT_PICKUP; transportStatus = TransportStatus.AT_PICKUP; stamps.pickupAt = now; }
    else if (action === JourneyAction.START_LOADING && leg.status === JourneyLegStatus.AT_PICKUP && !leg.isEmpty) { nextLegStatus = JourneyLegStatus.LOADING; transportStatus = TransportStatus.LOADING; stamps.loadingAt = now; }
    else if (action === JourneyAction.DEPART_PICKUP && (leg.status === JourneyLegStatus.LOADING || (leg.isEmpty && leg.status === JourneyLegStatus.AT_PICKUP))) { nextLegStatus = JourneyLegStatus.IN_TRANSIT; transportStatus = TransportStatus.IN_TRANSIT; stamps.departedAt = now; }
    else if (action === JourneyAction.ARRIVE_DELIVERY && leg.status === JourneyLegStatus.IN_TRANSIT) { nextLegStatus = JourneyLegStatus.AT_DELIVERY; transportStatus = TransportStatus.AT_DELIVERY; stamps.deliveryAt = now; }
    else if (action === JourneyAction.START_UNLOADING && leg.status === JourneyLegStatus.AT_DELIVERY && !leg.isEmpty) { nextLegStatus = JourneyLegStatus.UNLOADING; transportStatus = TransportStatus.UNLOADING; stamps.unloadingAt = now; }
    else if (action === JourneyAction.COMPLETE_DELIVERY && (leg.status === JourneyLegStatus.UNLOADING || (leg.isEmpty && leg.status === JourneyLegStatus.AT_DELIVERY))) {
      hasRemainingCargoLeg = !!await tx.workJourneyLeg.findFirst({ where: { workOrderId: order.id, sequence: { gt: leg.sequence }, type: { in: [JourneyLegType.OUTBOUND, JourneyLegType.RETURN] }, status: JourneyLegStatus.PLANNED } });
      nextLegStatus = JourneyLegStatus.COMPLETED;
      transportStatus = hasRemainingCargoLeg ? TransportStatus.IN_TRANSIT : TransportStatus.DELIVERED;
      if (!hasRemainingCargoLeg) { stamps.deliveredAt = now; stamps.arrivalTime = now; }
    } else if (action === JourneyAction.RETURN_TO_DEPOT && leg.status === JourneyLegStatus.COMPLETED) {
      const remainingCargoLeg = await tx.workJourneyLeg.findFirst({ where: { workOrderId: order.id, sequence: { gt: leg.sequence }, type: { in: [JourneyLegType.OUTBOUND, JourneyLegType.RETURN] }, status: JourneyLegStatus.PLANNED } });
      if (remainingCargoLeg) throw new BadRequestException('Phải hoàn thành chặng chiều về trước khi trở về bãi.');
      const reposition = await this.createRepositionLeg(tx, order.id, vehicleId, homeDepot);
      await tx.workJourneyLeg.update({ where: { id: reposition.id }, data: { status: JourneyLegStatus.RETURNING_TO_DEPOT, startedAt: now } });
      await tx.transportOrder.update({ where: { id: order.transportOrderId }, data: { status: TransportStatus.RETURNING_TO_DEPOT } });
      return;
    } else if (action === JourneyAction.ARRIVE_DEPOT && leg.status === JourneyLegStatus.RETURNING_TO_DEPOT) {
      await tx.workJourneyLeg.update({ where: { id: leg.id }, data: { status: JourneyLegStatus.AT_DEPOT, completedAt: now } });
      await tx.transportOrder.update({ where: { id: order.transportOrderId }, data: { status: TransportStatus.AT_DEPOT, completedAt: now } });
      await this.completeJourneyAtDepot(tx, order.id, dto, now, vehicleId);
      return;
    } else throw new BadRequestException(`Thao tác ${action} không hợp lệ tại trạng thái ${leg.status}.`);
    await tx.workJourneyLeg.update({ where: { id: leg.id }, data: { status: nextLegStatus, ...(action === JourneyAction.ARRIVE_PICKUP ? { pickupAt: now } : {}), ...(action === JourneyAction.START_LOADING ? { loadingAt: now } : {}), ...(action === JourneyAction.DEPART_PICKUP ? { departedAt: now, startedAt: leg.sequence === 1 ? now : undefined } : {}), ...(action === JourneyAction.ARRIVE_DELIVERY ? { deliveryAt: now } : {}), ...(action === JourneyAction.START_UNLOADING ? { unloadingAt: now } : {}), ...(action === JourneyAction.COMPLETE_DELIVERY ? { completedAt: now } : {}) } });
    await tx.transportOrder.update({ where: { id: order.transportOrderId }, data: { status: transportStatus, ...stamps } });
    if (action === JourneyAction.COMPLETE_DELIVERY && !hasRemainingCargoLeg && await this.hasNextChainedWork(tx, order.id, vehicleId, driverId, now)) await this.completeJourneyForChain(tx, order.id, dto, now, vehicleId, driverId);
  }

  private async hasNextChainedWork(tx: Tx, workOrderId: number, vehicleId: number, driverId: number, now: Date) {
    const windowEnd = new Date(now.getTime() + 60 * 60_000);
    return !!await tx.workVehicleAssignment.findFirst({ where: { workOrderId: { not: workOrderId }, vehicleId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] }, startAt: { lte: windowEnd }, workOrder: { status: { in: [WorkOrderStatus.APPROVED, WorkOrderStatus.ASSIGNED, WorkOrderStatus.DRIVER_ACCEPTED] }, driverAssignments: { some: { driverId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } } } } } });
  }

  private async completeJourneyForChain(tx: Tx, workOrderId: number, dto: JourneyActionDto, now: Date, vehicleId: number, driverId: number) {
    const segment = await tx.workExecutionSegment.findFirst({ where: { workOrderId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (segment) {
      const finishDto: FinishExecutionDto = { endOdoKm: dto.odoKm, endMachineHours: dto.machineHours, lat: dto.lat, lng: dto.lng, notes: dto.notes };
      const metrics = this.validateSegmentMetrics(segment, finishDto);
      await tx.workExecutionSegment.update({ where: { id: segment.id }, data: { endedAt: now, endOdoKm: dto.odoKm, endMachineHours: dto.machineHours, endLat: dto.lat, endLng: dto.lng, notes: dto.notes } });
      await this.updateVehicleMetrics(tx, vehicleId, finishDto, metrics);
      await tx.driverKpiEvent.create({ data: { driverId, workOrderId, executionSegmentId: segment.id, type: DriverKpiEventType.EXECUTION_COMPLETED, distanceKm: metrics.distanceKm, machineHours: metrics.machineHours, payload: { chainedToNextWork: true } } });
    }
    await tx.workVehicleAssignment.updateMany({ where: { workOrderId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.COMPLETED, endAt: now, reason: 'Giao nối nhiệm vụ gần' } });
    await tx.workDriverAssignment.updateMany({ where: { workOrderId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.COMPLETED, endAt: now, reason: 'Giao nối nhiệm vụ gần' } });
    await tx.workAcceptance.create({ data: { workOrderId } });
    await tx.operationalWorkOrder.update({ where: { id: workOrderId }, data: { status: WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE, version: { increment: 1 } } });
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: VehicleStatus.HOAT_DONG } });
    await tx.user.update({ where: { id: driverId }, data: { currentShiftStatus: DriverShiftStatus.DANG_VAN_HANH } });
  }

  private async createRepositionLeg(tx: Tx, workOrderId: number, vehicleId: number, depot?: { id: number; name: string } | null) {
    const existing = await tx.workJourneyLeg.findFirst({ where: { workOrderId, type: JourneyLegType.REPOSITION }, orderBy: { sequence: 'desc' } });
    if (existing) return existing;
    const vehicle = depot ? null : await tx.vehicle.findUnique({ where: { id: vehicleId }, include: { homeDepot: true } });
    const homeDepot = depot ?? vehicle?.homeDepot ?? null;
    const last = await tx.workJourneyLeg.findFirst({ where: { workOrderId }, orderBy: { sequence: 'desc' } });
    return tx.workJourneyLeg.create({ data: { workOrderId, sequence: (last?.sequence ?? 0) + 1, type: JourneyLegType.REPOSITION, originName: last?.destinationName ?? 'Điểm công việc', destinationLocationId: homeDepot?.id, destinationName: homeDepot?.name ?? 'Bãi tập kết', isEmpty: true } });
  }

  private async completeJourneyAtDepot(tx: Tx, workOrderId: number, dto: JourneyActionDto, now: Date, vehicleId: number) {
    const segment = await tx.workExecutionSegment.findFirst({ where: { workOrderId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (segment) {
      const finishDto: FinishExecutionDto = { endOdoKm: dto.odoKm, endMachineHours: dto.machineHours, lat: dto.lat, lng: dto.lng, notes: dto.notes };
      const metrics = this.validateSegmentMetrics(segment, finishDto);
      await tx.workExecutionSegment.update({ where: { id: segment.id }, data: { endedAt: now, endOdoKm: dto.odoKm, endMachineHours: dto.machineHours, endLat: dto.lat, endLng: dto.lng, notes: dto.notes } });
      await this.updateVehicleMetrics(tx, vehicleId, finishDto, metrics);
      await tx.driverKpiEvent.create({ data: { driverId: segment.driverId, workOrderId, executionSegmentId: segment.id, type: DriverKpiEventType.EXECUTION_COMPLETED, distanceKm: metrics.distanceKm, machineHours: metrics.machineHours } });
      await tx.user.update({ where: { id: segment.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
    }
    await tx.workVehicleAssignment.updateMany({ where: { workOrderId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.COMPLETED, endAt: now } });
    await tx.workDriverAssignment.updateMany({ where: { workOrderId, status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] } }, data: { status: WorkAssignmentStatus.COMPLETED, endAt: now } });
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG, ...(dto.lat !== undefined && dto.lng !== undefined ? { currentLat: dto.lat, currentLng: dto.lng, lastGpsUpdate: now } : {}) } });
    await tx.workAcceptance.create({ data: { workOrderId } });
    await tx.operationalWorkOrder.update({ where: { id: workOrderId }, data: { status: WorkOrderStatus.SUBMITTED_FOR_ACCEPTANCE, version: { increment: 1 } } });
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
      const workshop = await tx.workshopRequest.findFirst({ where: { vehicleId: vehicleAssignment.vehicleId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } });
      if (!blocking && !workshop) await tx.vehicle.update({ where: { id: vehicleAssignment.vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG } });
    }
    if (driverAssignment) await tx.user.update({ where: { id: driverAssignment.driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
  }

  private async event(tx: Tx, workOrderId: number, actorId: number, action: string, oldStatus?: WorkOrderStatus, newStatus?: WorkOrderStatus, reason?: string, payload?: Prisma.InputJsonValue) {
    await tx.workOrderEvent.create({ data: { workOrderId, actorId, action, oldStatus, newStatus, reason, payload } });
  }

  private async syncLegacyAssignment(tx: Tx, order: any, vehicleId: number, driverId: number | undefined, status: WorkOrderStatus, startAt: Date, endAt: Date) {
    if (order.type === WorkOrderType.DISPATCH && order.dispatchOrderId) await tx.dispatchOrder.update({ where: { id: order.dispatchOrderId }, data: { vehicleId, driverId: driverId ?? null, departureTime: startAt, plannedEndTime: endAt, status: status === WorkOrderStatus.OPEN_FOR_CLAIM ? DispatchStatus.APPROVED : DispatchStatus.ASSIGNED, assignedAt: new Date() } });
    if (order.type === WorkOrderType.TRANSPORT && order.transportOrderId) await tx.transportOrder.update({ where: { id: order.transportOrderId }, data: { vehicleId, driverId: driverId ?? null, departureTime: startAt, plannedEndTime: endAt, status: status === WorkOrderStatus.OPEN_FOR_CLAIM ? TransportStatus.APPROVED : TransportStatus.ASSIGNED, assignedAt: new Date() } });
    if (order.type === WorkOrderType.INTERNAL_FEED && order.internalFeedTripId) await tx.internalFeedTrip.update({ where: { id: order.internalFeedTripId }, data: { vehicleId, ...(driverId ? { driverId } : {}), slaWindowStart: startAt, slaWindowEnd: endAt } });
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
