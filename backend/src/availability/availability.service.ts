import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DispatchStatus,
  DriverEmploymentStatus,
  DriverShiftStatus,
  OperationalEntityType,
  Role,
  TransportStatus,
  Unit,
  UnavailabilityStatus,
  VehicleStatus,
  WorkAssignmentStatus,
  WorkOrderStatus,
  DriverUnavailabilityType,
  VehicleUnavailabilityType,
} from '@prisma/client';
import { OperationalActor, scopedUnit } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilitySearchDto } from './dto/availability-search.dto';
import { BusyInterval, calculateFreeSlots, mergeBusyIntervals, overlaps, withBuffer } from './availability-engine';
import { CreateDriverUnavailabilityDto, CreateVehicleUnavailabilityDto } from './dto/unavailability.dto';

const ACTIVE_ASSIGNMENTS = [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED];
const INACTIVE_WORK_ORDERS = [WorkOrderStatus.CANCELLED, WorkOrderStatus.REJECTED, WorkOrderStatus.CLOSED];
const ACTIVE_DISPATCH = [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.WORKING];
const ACTIVE_TRANSPORT = [
  TransportStatus.ASSIGNED,
  TransportStatus.DRIVER_ACCEPTED,
  TransportStatus.AT_PICKUP,
  TransportStatus.LOADING,
  TransportStatus.DEPARTED,
  TransportStatus.IN_TRANSIT,
  TransportStatus.AT_DELIVERY,
  TransportStatus.UNLOADING,
];

export interface AvailabilityReason {
  code: string;
  severity: 'WARNING' | 'BLOCK';
  message: string;
  relatedId?: number;
  relatedCode?: string;
}

export interface ResourceAvailability {
  id: number;
  code: string;
  name: string;
  available: boolean;
  availabilityStatus: 'AVAILABLE' | 'WARNING' | 'UNAVAILABLE';
  reasons: AvailabilityReason[];
  intervals: BusyInterval[];
  availableSlots: ReturnType<typeof calculateFreeSlots>;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private validateWindow(startAt: Date, endAt: Date) {
    if (endAt <= startAt) {
      throw new BadRequestException({ code: 'INVALID_TIME_WINDOW', message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
    }
  }

  private interval(
    type: string,
    startTime: Date,
    endTime: Date | null | undefined,
    rangeEnd: Date,
    extra: Partial<BusyInterval> = {},
  ): BusyInterval {
    return { type, startTime, endTime: endTime ?? rangeEnd, ...extra };
  }

  private status(reasons: AvailabilityReason[]) {
    if (reasons.some((item) => item.severity === 'BLOCK')) return 'UNAVAILABLE' as const;
    if (reasons.length) return 'WARNING' as const;
    return 'AVAILABLE' as const;
  }

  async search(dto: AvailabilitySearchDto, actor: OperationalActor) {
    this.validateWindow(dto.startAt, dto.endAt);
    const unit = scopedUnit(actor, dto.unit);
    const policyUnit = unit ?? (actor.unit === Unit.TOAN_KLH ? Unit.BAN_CO_GIOI : actor.unit);
    const policy = await this.prisma.schedulingPolicy.findUnique({ where: { unit: policyUnit } });
    const vehicleBuffer = policy?.vehicleBufferMinutes ?? 0;
    const driverBuffer = policy?.driverBufferMinutes ?? 0;

    const vehicleWhere: Record<string, unknown> = {};
    if (dto.vehicleIds?.length) vehicleWhere.id = { in: dto.vehicleIds };
    if (unit) vehicleWhere.unit = unit;
    const driverWhere: Record<string, unknown> = { role: Role.DRIVER };
    if (dto.driverIds?.length) driverWhere.id = { in: dto.driverIds };
    if (unit) driverWhere.unit = unit;

    const [vehicles, drivers] = await Promise.all([
      this.prisma.vehicle.findMany({ where: vehicleWhere, include: { vehicleType: true }, orderBy: { code: 'asc' } }),
      this.prisma.user.findMany({
        where: driverWhere,
        include: { driverProfile: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    const [vehicleResults, driverResults] = await Promise.all([
      Promise.all(vehicles.map((vehicle) => this.vehicleAvailability(vehicle, dto, vehicleBuffer))),
      Promise.all(drivers.map((driver) => this.driverAvailability(driver, dto, driverBuffer, vehicles))),
    ]);

    return {
      requestedInterval: { startAt: dto.startAt, endAt: dto.endAt },
      policy: {
        unit: policyUnit,
        timezone: policy?.timezone ?? 'Asia/Phnom_Penh',
        vehicleBufferMinutes: vehicleBuffer,
        driverBufferMinutes: driverBuffer,
      },
      vehicles: vehicleResults,
      drivers: driverResults,
    };
  }

  async vehicleTimeline(vehicleId: number, from: Date, to: Date, actor: OperationalActor, excludeWorkOrderId?: number, requiredDurationMinutes = 0) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException(`Không tìm thấy xe #${vehicleId}.`);
    scopedUnit(actor, vehicle.unit);
    const result = await this.search({ startAt: from, endAt: to, vehicleIds: [vehicleId], excludeWorkOrderId, requiredDurationMinutes }, actor);
    return result.vehicles[0];
  }

  async driverTimeline(driverId: number, from: Date, to: Date, actor: OperationalActor, excludeWorkOrderId?: number, requiredDurationMinutes = 0) {
    const driver = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!driver || driver.role !== Role.DRIVER) throw new NotFoundException(`Không tìm thấy tài xế #${driverId}.`);
    if (actor.role !== Role.DRIVER || actor.id !== driverId) scopedUnit(actor, driver.unit);
    const result = await this.search({ startAt: from, endAt: to, driverIds: [driverId], excludeWorkOrderId, requiredDurationMinutes }, actor);
    return result.drivers[0];
  }

  async assertResourcesAvailable(input: {
    startAt: Date;
    endAt: Date;
    unit: Unit;
    vehicleId: number;
    driverId?: number;
    excludeWorkOrderId?: number;
  }, actor: OperationalActor) {
    const result = await this.search({
      startAt: input.startAt,
      endAt: input.endAt,
      unit: input.unit,
      vehicleIds: [input.vehicleId],
      driverIds: input.driverId ? [input.driverId] : [],
      excludeWorkOrderId: input.excludeWorkOrderId,
    }, actor);
    const vehicle = result.vehicles[0];
    if (!vehicle?.available) {
      throw new ConflictException({ code: 'VEHICLE_TIME_CONFLICT', resourceId: input.vehicleId, reasons: vehicle?.reasons ?? [], suggestedSlots: vehicle?.availableSlots ?? [] });
    }
    if (input.driverId) {
      const driver = result.drivers[0];
      if (!driver?.available) {
        const license = driver?.reasons.some((reason) => reason.code.startsWith('LICENSE'));
        throw new ConflictException({ code: license ? 'LICENSE_NOT_ELIGIBLE' : 'DRIVER_TIME_CONFLICT', resourceId: input.driverId, reasons: driver?.reasons ?? [], suggestedSlots: driver?.availableSlots ?? [] });
      }
    }
    return result;
  }

  async createDriverUnavailability(dto: CreateDriverUnavailabilityDto, actor: OperationalActor) {
    this.validateOptionalWindow(dto.startAt, dto.endAt);
    const driver = await this.prisma.user.findUnique({ where: { id: dto.driverId }, include: { driverProfile: true } });
    if (!driver || driver.role !== Role.DRIVER) throw new NotFoundException(`Không tìm thấy tài xế #${dto.driverId}.`);
    if (actor.role === Role.DRIVER && actor.id !== dto.driverId) throw new BadRequestException('Tài xế chỉ được tạo yêu cầu nghỉ cho chính mình.');
    if (actor.role !== Role.DRIVER) scopedUnit(actor, driver.unit);
    if (!driver.driverProfile) {
      await this.prisma.driverProfile.create({ data: { userId: driver.id, employmentStatus: driver.employmentStatus, joinedDate: driver.joinedDate, resignedDate: driver.resignedDate, resignedReason: driver.resignedReason, licenseClass: driver.licenseClass, licenseNumber: driver.licenseNumber, licenseExpiryDate: driver.licenseExpiryDate, healthCheckExpiryDate: driver.healthCheckExpiryDate, currentShiftStatus: driver.currentShiftStatus ?? DriverShiftStatus.SAN_SANG, currentLocation: driver.currentLocation } });
    }
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.driverUnavailability.create({ data: { driverId: dto.driverId, type: dto.type, startAt: dto.startAt, endAt: dto.endAt, reason: dto.reason, evidenceUrl: dto.evidenceUrl } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.DRIVER_UNAVAILABILITY, entityId: created.id, actorId: actor.id, action: 'CREATE', newValue: { driverId: dto.driverId, type: dto.type, status: created.status, startAt: dto.startAt.toISOString(), endAt: dto.endAt?.toISOString() }, reason: dto.reason } });
      return created;
    });
    return { record, affectedWorkOrders: [] };
  }

  async approveDriverUnavailability(id: number, actor: OperationalActor) {
    const record = await this.prisma.driverUnavailability.findUnique({ where: { id }, include: { driver: { include: { user: true } } } });
    if (!record) throw new NotFoundException(`Không tìm thấy yêu cầu nghỉ #${id}.`);
    scopedUnit(actor, record.driver.user.unit);
    const updated = await this.prisma.$transaction(async (tx) => {
      const approved = await tx.driverUnavailability.update({ where: { id }, data: { status: UnavailabilityStatus.APPROVED, approvedById: actor.id, approvedAt: new Date() } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.DRIVER_UNAVAILABILITY, entityId: id, actorId: actor.id, action: 'APPROVE', oldValue: { status: record.status }, newValue: { status: UnavailabilityStatus.APPROVED }, reason: record.reason } });
      return approved;
    });
    const affectedWorkOrders = await this.prisma.workDriverAssignment.findMany({ where: { driverId: record.driverId, status: { in: ACTIVE_ASSIGNMENTS }, startAt: { lt: record.endAt ?? new Date('9999-12-31T23:59:59.999Z') }, OR: [{ endAt: null }, { endAt: { gt: record.startAt } }] }, include: { workOrder: true } });
    return { record: updated, affectedWorkOrders: affectedWorkOrders.map((item) => ({ workOrderId: item.workOrderId, plannedStartAt: item.workOrder.plannedStartAt, plannedEndAt: item.workOrder.plannedEndAt })) };
  }

  async createVehicleUnavailability(dto: CreateVehicleUnavailabilityDto, actor: OperationalActor) {
    this.validateOptionalWindow(dto.startAt, dto.endAt);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException(`Không tìm thấy xe #${dto.vehicleId}.`);
    scopedUnit(actor, vehicle.unit);
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicleUnavailability.create({ data: { vehicleId: dto.vehicleId, type: dto.type, startAt: dto.startAt, endAt: dto.endAt, reason: dto.reason, createdById: actor.id } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.VEHICLE_UNAVAILABILITY, entityId: created.id, actorId: actor.id, action: 'CREATE', newValue: { vehicleId: dto.vehicleId, type: dto.type, status: created.status, startAt: dto.startAt.toISOString(), endAt: dto.endAt?.toISOString() }, reason: dto.reason } });
      return created;
    });
    const affectedWorkOrders = await this.prisma.workVehicleAssignment.findMany({ where: { vehicleId: dto.vehicleId, status: { in: ACTIVE_ASSIGNMENTS }, startAt: { lt: dto.endAt ?? new Date('9999-12-31T23:59:59.999Z') }, OR: [{ endAt: null }, { endAt: { gt: dto.startAt } }] }, include: { workOrder: true } });
    return { record, affectedWorkOrders: affectedWorkOrders.map((item) => ({ workOrderId: item.workOrderId, plannedStartAt: item.workOrder.plannedStartAt, plannedEndAt: item.workOrder.plannedEndAt })) };
  }

  private validateOptionalWindow(startAt: Date, endAt?: Date) {
    if (endAt && endAt <= startAt) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
  }

  private async vehicleAvailability(vehicle: any, dto: AvailabilitySearchDto, bufferMinutes: number): Promise<ResourceAvailability> {
    const [assignments, executions, maintenance, repairs, holds, legacyDispatch, legacyTransport, feedTrips] = await Promise.all([
      this.prisma.workVehicleAssignment.findMany({
        where: {
          vehicleId: vehicle.id,
          status: { in: ACTIVE_ASSIGNMENTS },
          workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined,
          workOrder: { status: { notIn: INACTIVE_WORK_ORDERS }, plannedStartAt: { lt: dto.endAt }, plannedEndAt: { gt: dto.startAt } },
        },
        include: { workOrder: { include: { dispatchOrder: true, transportOrder: true, internalFeedTrip: true } } },
      }),
      this.prisma.workExecutionSegment.findMany({
        where: { vehicleId: vehicle.id, workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined, startedAt: { lt: dto.endAt }, OR: [{ endedAt: null }, { endedAt: { gt: dto.startAt } }] },
      }),
      this.prisma.maintenanceRecord.findMany({ where: { vehicleId: vehicle.id, cancelledAt: null } }),
      this.prisma.repairTicket.findMany({ where: { vehicleId: vehicle.id, cancelledAt: null } }),
      this.prisma.vehicleUnavailability.findMany({ where: { vehicleId: vehicle.id, status: UnavailabilityStatus.APPROVED, startAt: { lt: dto.endAt }, OR: [{ endAt: null }, { endAt: { gt: dto.startAt } }] } }),
      this.prisma.dispatchOrder.findMany({ where: { vehicleId: vehicle.id, status: { in: ACTIVE_DISPATCH }, operationalWorkOrder: null, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.transportOrder.findMany({ where: { vehicleId: vehicle.id, status: { in: ACTIVE_TRANSPORT }, operationalWorkOrder: null, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.internalFeedTrip.findMany({ where: { vehicleId: vehicle.id, operationalWorkOrder: null, completedFeedTime: null, slaWindowStart: { lt: dto.endAt }, slaWindowEnd: { gt: dto.startAt } } }),
    ]);

    const intervals: BusyInterval[] = [];
    for (const item of assignments) intervals.push(this.interval('WORK_ORDER', item.startAt, item.endAt ?? item.workOrder.plannedEndAt, dto.endAt, { relatedId: item.workOrderId, relatedCode: this.workOrderCode(item.workOrder) }));
    for (const item of executions) intervals.push(this.interval('ACTIVE_EXECUTION', item.startedAt, item.endedAt, dto.endAt, { relatedId: item.workOrderId, reasonCode: 'ACTIVE_TRIP' }));
    for (const item of maintenance) {
      const start = item.startedAt ?? item.plannedStartAt ?? item.createdAt;
      const end = item.endedAt ?? item.completedAt ?? item.plannedEndAt;
      if (overlaps(dto.startAt, dto.endAt, start, end ?? dto.endAt)) intervals.push(this.interval('MAINTENANCE', start, end, dto.endAt, { relatedId: item.id, reasonCode: 'VEHICLE_MAINTENANCE' }));
    }
    for (const item of repairs) {
      const start = item.startedAt ?? item.plannedStartAt ?? item.receivedDate;
      const end = item.endedAt ?? item.completedDate ?? item.plannedEndAt;
      if (overlaps(dto.startAt, dto.endAt, start, end ?? dto.endAt)) intervals.push(this.interval('REPAIR', start, end, dto.endAt, { relatedId: item.id, relatedCode: item.code, reasonCode: 'VEHICLE_REPAIR' }));
    }
    for (const item of holds) intervals.push(this.interval(item.type, item.startAt, item.endAt, dto.endAt, { relatedId: item.id, reasonCode: `VEHICLE_${item.type}` }));
    for (const item of legacyDispatch) intervals.push(this.interval('LEGACY_DISPATCH', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of legacyTransport) intervals.push(this.interval('LEGACY_TRANSPORT', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of feedTrips) intervals.push(this.interval('LEGACY_INTERNAL_FEED', item.slaWindowStart, item.slaWindowEnd, dto.endAt, { relatedId: item.id, relatedCode: item.code }));

    const buffered = mergeBusyIntervals(intervals.map((item) => withBuffer(item, bufferMinutes)));
    const reasons: AvailabilityReason[] = buffered
      .filter((item) => overlaps(dto.startAt, dto.endAt, item.startTime, item.endTime))
      .map((item) => ({ code: item.reasonCode ?? 'VEHICLE_TIME_CONFLICT', severity: 'BLOCK', message: this.vehicleIntervalMessage(item), relatedId: item.relatedId, relatedCode: item.relatedCode }));
    if ([VehicleStatus.TAM_DUNG, VehicleStatus.BAO_DUONG, VehicleStatus.SUA_CHUA].includes(vehicle.status)) {
      reasons.unshift({ code: `VEHICLE_STATUS_${vehicle.status}`, severity: 'BLOCK', message: `Trạng thái xe ${vehicle.status} không cho phép phân công.` });
    }
    const availabilityStatus = this.status(reasons);
    return {
      id: vehicle.id,
      code: vehicle.code,
      name: vehicle.name,
      available: availabilityStatus !== 'UNAVAILABLE',
      availabilityStatus,
      reasons,
      intervals: buffered,
      availableSlots: calculateFreeSlots(dto.startAt, dto.endAt, buffered, dto.requiredDurationMinutes),
    };
  }

  private async driverAvailability(driver: any, dto: AvailabilitySearchDto, bufferMinutes: number, selectedVehicles: any[]): Promise<ResourceAvailability> {
    const [assignments, executions, leave, legacyDispatch, legacyTransport, feedTrips] = await Promise.all([
      this.prisma.workDriverAssignment.findMany({
        where: {
          driverId: driver.id,
          status: { in: ACTIVE_ASSIGNMENTS },
          workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined,
          workOrder: { status: { notIn: INACTIVE_WORK_ORDERS }, plannedStartAt: { lt: dto.endAt }, plannedEndAt: { gt: dto.startAt } },
        }, include: { workOrder: { include: { dispatchOrder: true, transportOrder: true, internalFeedTrip: true } } },
      }),
      this.prisma.workExecutionSegment.findMany({ where: { driverId: driver.id, workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined, startedAt: { lt: dto.endAt }, OR: [{ endedAt: null }, { endedAt: { gt: dto.startAt } }] } }),
      this.prisma.driverUnavailability.findMany({ where: { driverId: driver.id, status: UnavailabilityStatus.APPROVED, startAt: { lt: dto.endAt }, OR: [{ endAt: null }, { endAt: { gt: dto.startAt } }] } }),
      this.prisma.dispatchOrder.findMany({ where: { driverId: driver.id, status: { in: ACTIVE_DISPATCH }, operationalWorkOrder: null, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.transportOrder.findMany({ where: { driverId: driver.id, status: { in: ACTIVE_TRANSPORT }, operationalWorkOrder: null, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.internalFeedTrip.findMany({ where: { driverId: driver.id, operationalWorkOrder: null, completedFeedTime: null, slaWindowStart: { lt: dto.endAt }, slaWindowEnd: { gt: dto.startAt } } }),
    ]);
    const intervals: BusyInterval[] = [];
    for (const item of assignments) intervals.push(this.interval('WORK_ORDER', item.startAt, item.endAt ?? item.workOrder.plannedEndAt, dto.endAt, { relatedId: item.workOrderId, relatedCode: this.workOrderCode(item.workOrder) }));
    for (const item of executions) intervals.push(this.interval('ACTIVE_EXECUTION', item.startedAt, item.endedAt, dto.endAt, { relatedId: item.workOrderId, reasonCode: 'ACTIVE_TRIP' }));
    for (const item of leave) intervals.push(this.interval(item.type, item.startAt, item.endAt, dto.endAt, { relatedId: item.id, reasonCode: `DRIVER_${item.type}` }));
    for (const item of legacyDispatch) intervals.push(this.interval('LEGACY_DISPATCH', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of legacyTransport) intervals.push(this.interval('LEGACY_TRANSPORT', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of feedTrips) intervals.push(this.interval('LEGACY_INTERNAL_FEED', item.slaWindowStart, item.slaWindowEnd, dto.endAt, { relatedId: item.id, relatedCode: item.code }));

    const buffered = mergeBusyIntervals(intervals.map((item) => withBuffer(item, bufferMinutes)));
    const reasons: AvailabilityReason[] = buffered
      .filter((item) => overlaps(dto.startAt, dto.endAt, item.startTime, item.endTime))
      .map((item) => ({ code: item.reasonCode ?? 'DRIVER_TIME_CONFLICT', severity: 'BLOCK', message: this.driverIntervalMessage(item), relatedId: item.relatedId, relatedCode: item.relatedCode }));
    const profile = driver.driverProfile;
    const employmentStatus = profile?.employmentStatus ?? driver.employmentStatus;
    const shiftStatus = profile?.currentShiftStatus ?? driver.currentShiftStatus;
    const licenseExpiry = profile?.licenseExpiryDate ?? driver.licenseExpiryDate;
    const healthExpiry = profile?.healthCheckExpiryDate ?? driver.healthCheckExpiryDate;
    const licenseClass = profile?.licenseClass ?? driver.licenseClass;
    const resignedDate = profile?.resignedDate ?? driver.resignedDate;
    if (!driver.isActive || employmentStatus === DriverEmploymentStatus.DA_NGHI_VIEC || (resignedDate && resignedDate <= dto.startAt)) {
      reasons.unshift({ code: 'DRIVER_RESIGNED', severity: 'BLOCK', message: 'Tài xế đã nghỉ việc hoặc tài khoản không còn hoạt động.' });
    }
    if (shiftStatus === DriverShiftStatus.NGHI_PHEP_CA) reasons.unshift({ code: 'DRIVER_SHIFT_LEAVE', severity: 'BLOCK', message: 'Tài xế đang nghỉ phép ca.' });
    if (licenseExpiry && licenseExpiry < dto.endAt) reasons.unshift({ code: 'LICENSE_EXPIRED', severity: 'BLOCK', message: 'GPLX hết hạn trước khi công việc kết thúc.' });
    if (healthExpiry && healthExpiry < dto.endAt) reasons.unshift({ code: 'HEALTH_CHECK_EXPIRED', severity: 'BLOCK', message: 'Khám sức khỏe hết hạn trước khi công việc kết thúc.' });
    if (selectedVehicles.length === 1 && selectedVehicles[0].vehicleType?.requiredLicenseClass && selectedVehicles[0].vehicleType.requiredLicenseClass !== licenseClass) {
      reasons.unshift({ code: 'LICENSE_CLASS_MISMATCH', severity: 'BLOCK', message: `GPLX ${licenseClass ?? 'chưa có'} không phù hợp loại xe.` });
    }
    const availabilityStatus = this.status(reasons);
    return {
      id: driver.id,
      code: driver.code,
      name: driver.fullName,
      available: availabilityStatus !== 'UNAVAILABLE',
      availabilityStatus,
      reasons,
      intervals: buffered,
      availableSlots: calculateFreeSlots(dto.startAt, dto.endAt, buffered, dto.requiredDurationMinutes),
    };
  }

  private workOrderCode(order: any) {
    return order.dispatchOrder?.code ?? order.transportOrder?.code ?? order.internalFeedTrip?.code;
  }

  private vehicleIntervalMessage(interval: BusyInterval) {
    if (interval.type === 'MAINTENANCE') return 'Xe có lịch bảo dưỡng trong khoảng yêu cầu.';
    if (interval.type === 'REPAIR') return 'Xe đang sửa chữa trong khoảng yêu cầu.';
    if (interval.type === 'ACTIVE_EXECUTION') return 'Xe đang thực hiện một chuyến chưa kết thúc.';
    return 'Xe đã bận trong khoảng thời gian yêu cầu.';
  }

  private driverIntervalMessage(interval: BusyInterval) {
    if (['LEAVE', 'SHIFT_REST', 'MEDICAL', 'EMERGENCY'].includes(interval.type)) return 'Tài xế có lịch nghỉ hoặc không sẵn sàng.';
    if (interval.type === 'ACTIVE_EXECUTION') return 'Tài xế đang thực hiện một chuyến chưa kết thúc.';
    return 'Tài xế đã bận trong khoảng thời gian yêu cầu.';
  }
}
