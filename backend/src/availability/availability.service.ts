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
  MaintenanceStatus,
  RepairStatus,
  VehicleOperationalDomain,
  WorkOrderCategory,
} from '@prisma/client';
import { OperationalActor, scopedUnit } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { assertManagementUnitAccess, resourceManagementUnitIds } from '../common/utils/management-scope';
import { AvailabilitySearchDto } from './dto/availability-search.dto';
import { ProximityRecommendationDto } from './dto/proximity-recommendation.dto';
import { BusyInterval, calculateFreeSlots, mergeBusyIntervals, overlaps, withBuffer } from './availability-engine';
import { CreateDriverUnavailabilityDto, CreateVehicleUnavailabilityDto } from './dto/unavailability.dto';
import { isLiquidatedAssignedUnit, operationalVehicleWhere } from '../common/utils/vehicle-lifecycle';

const ACTIVE_ASSIGNMENTS = [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED];
const INACTIVE_WORK_ORDERS = [WorkOrderStatus.CANCELLED, WorkOrderStatus.REJECTED, WorkOrderStatus.CLOSED];
const ACTIVE_DISPATCH = [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.AT_WORKSITE, DispatchStatus.WORKING, DispatchStatus.RETURNING_TO_DEPOT];
const ACTIVE_TRANSPORT = [
  TransportStatus.ASSIGNED,
  TransportStatus.DRIVER_ACCEPTED,
  TransportStatus.AT_PICKUP,
  TransportStatus.LOADING,
  TransportStatus.DEPARTED,
  TransportStatus.IN_TRANSIT,
  TransportStatus.AT_DELIVERY,
  TransportStatus.UNLOADING,
  TransportStatus.RETURNING_TO_DEPOT,
  TransportStatus.AT_DEPOT,
];

export interface AvailabilityReason {
  code: string;
  severity: 'WARNING' | 'BLOCK';
  message: string;
  relatedId?: number;
  relatedCode?: string;
  conflictInterval?: {
    startAt: Date;
    endAt: Date;
    overlapMinutes: number;
  };
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

  async recommendVehicles(dto: ProximityRecommendationDto, actor: OperationalActor) {
    const targetOrder = await this.prisma.operationalWorkOrder.findUnique({
      where: { id: dto.workOrderId },
      include: {
        dispatchOrder: { include: { destinationLocation: true, productionOrder: { include: { planItem: true } } } },
        transportOrder: { include: { destinationLocation: true } },
      },
    });
    if (!targetOrder) throw new NotFoundException(`Không tìm thấy công việc #${dto.workOrderId}.`);
    const unit = scopedUnit(actor, targetOrder.unit) ?? targetOrder.unit;
    const explicitLocation = dto.destinationLocationId ? await this.prisma.operationalLocation.findUnique({ where: { id: dto.destinationLocationId } }) : null;
    const linkedLocation = targetOrder.dispatchOrder?.destinationLocation ?? targetOrder.transportOrder?.destinationLocation;
    const targetName = targetOrder.dispatchOrder?.destination ?? targetOrder.transportOrder?.destination;
    const inferredLocation = !explicitLocation && !linkedLocation && targetName ? await this.prisma.operationalLocation.findFirst({ where: { name: targetName, active: true } }) : null;
    const targetLocation = explicitLocation ?? linkedLocation ?? inferredLocation;
    const targetLat = dto.targetLat ?? targetLocation?.lat ?? undefined;
    const targetLng = dto.targetLng ?? targetLocation?.lng ?? undefined;
    const plannedStartAt = dto.plannedStartAt ?? targetOrder.plannedStartAt;
    const requiredVehicleTypeId = targetOrder.dispatchOrder?.productionOrder?.planItem?.vehicleTypeId ?? undefined;
    const now = new Date();
    const finishingWindowMinutes = dto.finishingWindowMinutes ?? 60;
    const finishingLimit = new Date(now.getTime() + finishingWindowMinutes * 60_000);
    const gpsFreshMinutes = Number(process.env.GPS_FRESH_MINUTES ?? 15);
    const complexCode = targetOrder.complexCode || 'KOUN_MOM';
    const vehicleWhere: Record<string, unknown> = { complexCode, ...operationalVehicleWhere };
    const recommendationDomain: Partial<Record<WorkOrderCategory, VehicleOperationalDomain>> = {
      [WorkOrderCategory.AGRICULTURE]: VehicleOperationalDomain.AGRICULTURE,
      [WorkOrderCategory.CONSTRUCTION]: VehicleOperationalDomain.CONSTRUCTION,
      [WorkOrderCategory.TRANSPORT]: VehicleOperationalDomain.TRANSPORT,
      [WorkOrderCategory.RESCUE]: VehicleOperationalDomain.SUPPORT,
    };
    if (recommendationDomain[targetOrder.category]) {
      vehicleWhere.vehicleType = { is: { operationalDomain: recommendationDomain[targetOrder.category] } };
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: vehicleWhere,
      include: { vehicleType: true, homeDepot: true },
      orderBy: { code: 'asc' },
    });

    const driverWhere: Record<string, unknown> = {
      role: Role.DRIVER,
      isActive: true,
      employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
      currentShiftStatus: DriverShiftStatus.SAN_SANG,
      licenseExpiryDate: { gte: plannedStartAt },
      healthCheckExpiryDate: { gte: plannedStartAt },
    };
    const [availableDriverCount, activeAssignments] = await Promise.all([
      this.prisma.user.count({ where: driverWhere }),
      this.prisma.workVehicleAssignment.findMany({
        where: {
          vehicleId: { in: vehicles.map((vehicle) => vehicle.id) },
          workOrderId: { not: dto.workOrderId },
          status: { in: ACTIVE_ASSIGNMENTS },
          workOrder: { status: { notIn: INACTIVE_WORK_ORDERS } },
        },
        include: { workOrder: { include: { journeyLegs: { orderBy: { sequence: 'desc' }, take: 1 }, evidence: { where: { lat: { not: null }, lng: { not: null } }, orderBy: { capturedAt: 'desc' }, take: 1 }, dispatchOrder: { include: { destinationLocation: true } }, transportOrder: { include: { destinationLocation: true } } } } },
        orderBy: { startAt: 'desc' },
      }),
    ]);
    const activeAssignmentByVehicle = new Map<number, (typeof activeAssignments)[number]>();
    for (const assignment of activeAssignments) {
      if (!activeAssignmentByVehicle.has(assignment.vehicleId)) activeAssignmentByVehicle.set(assignment.vehicleId, assignment);
    }
    const recommendations = [];
    const excluded: Array<{ vehicle: { id: number; code: string; name: string; plate: string | null }; reasons: Array<{ code: string; message: string }> }> = [];
    for (const vehicle of vehicles) {
      const exclusionReasons: Array<{ code: string; message: string }> = [];
      if (requiredVehicleTypeId && vehicle.vehicleTypeId !== requiredVehicleTypeId) exclusionReasons.push({ code: 'WRONG_VEHICLE_TYPE', message: 'Sai chủng loại xe yêu cầu.' });
      if (!vehicle.vehicleType?.isAssignable) exclusionReasons.push({ code: 'VEHICLE_TYPE_NOT_ASSIGNABLE', message: 'Chủng loại xe không cho phép phân công.' });
      if (!new Set<VehicleStatus>([VehicleStatus.CHO_PHAN_CONG, VehicleStatus.HOAT_DONG]).has(vehicle.status)) exclusionReasons.push({ code: vehicle.status === VehicleStatus.BAO_DUONG ? 'UNDER_MAINTENANCE' : 'VEHICLE_UNAVAILABLE', message: `Xe đang ở trạng thái ${vehicle.status}.` });
      if (exclusionReasons.length) {
        excluded.push({ vehicle: { id: vehicle.id, code: vehicle.code, name: vehicle.name, plate: vehicle.plate }, reasons: exclusionReasons });
        continue;
      }
      const activeAssignment = activeAssignmentByVehicle.get(vehicle.id);
      const finishingSoon = !!activeAssignment && activeAssignment.workOrder.plannedEndAt <= finishingLimit;
      if (activeAssignment && !finishingSoon) {
        excluded.push({ vehicle: { id: vehicle.id, code: vehicle.code, name: vehicle.name, plate: vehicle.plate }, reasons: [{ code: 'SCHEDULE_CONFLICT', message: `Xe còn bận sau cửa sổ ${finishingWindowMinutes} phút.` }] });
        continue;
      }
      const readyAt = activeAssignment ? activeAssignment.workOrder.plannedEndAt : now;
      const evidence = activeAssignment?.workOrder.evidence[0];
      const taskDestination = activeAssignment?.workOrder.dispatchOrder?.destinationLocation ?? activeAssignment?.workOrder.transportOrder?.destinationLocation;
      const gpsFresh = !!vehicle.gpsImei && !!vehicle.lastGpsUpdate && vehicle.lastGpsUpdate >= new Date(now.getTime() - gpsFreshMinutes * 60_000) && vehicle.currentLat !== null && vehicle.currentLng !== null;
      let source: 'VEHICLE_GPS' | 'PHOTO_EXIF' | 'TASK_DESTINATION' | 'HOME_DEPOT' | 'REGION' = 'REGION';
      let lat: number | undefined;
      let lng: number | undefined;
      if (gpsFresh) { source = 'VEHICLE_GPS'; lat = vehicle.currentLat!; lng = vehicle.currentLng!; }
      else if (evidence?.lat !== null && evidence?.lng !== null && evidence?.lat !== undefined && evidence?.lng !== undefined) { source = 'PHOTO_EXIF'; lat = evidence.lat; lng = evidence.lng; }
      else if (taskDestination?.lat !== null && taskDestination?.lng !== null && taskDestination?.lat !== undefined && taskDestination?.lng !== undefined) { source = 'TASK_DESTINATION'; lat = taskDestination.lat; lng = taskDestination.lng; }
      else if (vehicle.homeDepot?.lat !== null && vehicle.homeDepot?.lng !== null && vehicle.homeDepot?.lat !== undefined && vehicle.homeDepot?.lng !== undefined) { source = 'HOME_DEPOT'; lat = vehicle.homeDepot.lat; lng = vehicle.homeDepot.lng; }
      const route = lat !== undefined && lng !== undefined && targetLat !== undefined && targetLng !== undefined ? await this.routeEstimate(lat, lng, targetLat, targetLng) : null;
      const earliestArrivalAt = route ? new Date(readyAt.getTime() + route.etaMinutes * 60_000) : null;
      const warnings: string[] = [];
      if (!route) warnings.push('Chưa đủ tọa độ để tính ETA; xếp hạng theo khu vực.');
      if (activeAssignment) warnings.push(`Xe dự kiến xong công việc #${activeAssignment.workOrderId} trong cửa sổ ${finishingWindowMinutes} phút.`);
      if (!availableDriverCount) warnings.push('Chưa có tài xế đủ điều kiện đang sẵn sàng trong đơn vị.');
      if (earliestArrivalAt && earliestArrivalAt > plannedStartAt) warnings.push('Dự kiến không kịp giờ bắt đầu kế hoạch.');
      recommendations.push({
        vehicle: { id: vehicle.id, code: vehicle.code, name: vehicle.name, plate: vehicle.plate, vehicleType: vehicle.vehicleType },
        availability: activeAssignment ? 'FINISHING_SOON' : 'AVAILABLE_NOW',
        readyAt,
        earliestArrivalAt,
        etaMinutes: route?.etaMinutes ?? null,
        distanceKm: route?.distanceKm ?? null,
        etaSource: route?.source ?? 'REGION',
        positionSource: source,
        confidence: source === 'VEHICLE_GPS' && route?.source === 'ROUTING' ? 'HIGH' : route ? 'MEDIUM' : 'LOW',
        feasible: !earliestArrivalAt || earliestArrivalAt <= plannedStartAt,
        driverAvailable: availableDriverCount > 0,
        currentWorkOrderId: activeAssignment?.workOrderId ?? null,
        warnings,
      });
    }
    recommendations.sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      if (a.earliestArrivalAt && b.earliestArrivalAt) return a.earliestArrivalAt.getTime() - b.earliestArrivalAt.getTime();
      if (a.earliestArrivalAt) return -1;
      if (b.earliestArrivalAt) return 1;
      return a.vehicle.code.localeCompare(b.vehicle.code, 'vi');
    });
    return { workOrderId: dto.workOrderId, target: { locationId: targetLocation?.id ?? null, name: targetLocation?.name ?? targetOrder.dispatchOrder?.destination ?? targetOrder.transportOrder?.destination ?? null, lat: targetLat ?? null, lng: targetLng ?? null, plannedStartAt }, finishingWindowMinutes, recommendations, excluded };
  }

  private async routeEstimate(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const routingBaseUrl = process.env.ROUTING_BASE_URL?.replace(/\/$/, '');
    if (routingBaseUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${routingBaseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          const body = await response.json() as { routes?: Array<{ duration: number; distance: number }> };
          const route = body.routes?.[0];
          if (route) return { etaMinutes: Math.max(1, Math.ceil(route.duration / 60)), distanceKm: Number((route.distance / 1000).toFixed(1)), source: 'ROUTING' as const };
        }
      } catch {
        // Fallback below keeps dispatch usable when routing is offline.
      }
    }
    const distanceKm = this.haversineKm(fromLat, fromLng, toLat, toLng);
    const speedKmH = Math.max(1, Number(process.env.ROUTING_FALLBACK_SPEED_KMH ?? 25));
    return { etaMinutes: Math.max(1, Math.ceil((distanceKm / speedKmH) * 60)), distanceKm: Number(distanceKm.toFixed(1)), source: 'HAVERSINE' as const };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const radians = (value: number) => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const dLat = radians(lat2 - lat1);
    const dLng = radians(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

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

  private intervalReasons(
    intervals: BusyInterval[],
    dto: AvailabilitySearchDto,
    bufferMinutes: number,
    defaultCode: string,
    message: (interval: BusyInterval) => string,
  ): AvailabilityReason[] {
    return intervals.flatMap((interval) => {
      const actualOverlap = overlaps(dto.startAt, dto.endAt, interval.startTime, interval.endTime);
      const candidate = actualOverlap || bufferMinutes === 0 ? interval : withBuffer(interval, bufferMinutes);
      if (!overlaps(dto.startAt, dto.endAt, candidate.startTime, candidate.endTime)) return [];
      const overlapStart = new Date(Math.max(dto.startAt.getTime(), candidate.startTime.getTime()));
      const overlapEnd = new Date(Math.min(dto.endAt.getTime(), candidate.endTime.getTime()));
      return [{
        code: actualOverlap ? (interval.reasonCode ?? defaultCode) : 'BUFFER_TIME_WARNING',
        severity: actualOverlap ? 'BLOCK' as const : 'WARNING' as const,
        message: actualOverlap ? message(interval) : `Khoảng cách với lịch liền kề dưới ${bufferMinutes} phút khuyến nghị.`,
        relatedId: interval.relatedId,
        relatedCode: interval.relatedCode,
        conflictInterval: {
          startAt: overlapStart,
          endAt: overlapEnd,
          overlapMinutes: Math.max(0, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60_000)),
        },
      }];
    });
  }

  private groupByResource<T>(rows: T[], resourceId: (row: T) => number) {
    const grouped = new Map<number, T[]>();
    for (const row of rows) {
      const id = resourceId(row);
      const existing = grouped.get(id);
      if (existing) existing.push(row);
      else grouped.set(id, [row]);
    }
    return grouped;
  }

  async search(dto: AvailabilitySearchDto, actor: OperationalActor) {
    this.validateWindow(dto.startAt, dto.endAt);
    if (dto.managementUnitId) await assertManagementUnitAccess(this.prisma, actor, dto.managementUnitId);
    const managementUnitIds = dto.managementUnitId
      ? await resourceManagementUnitIds(this.prisma, dto.managementUnitId)
      : [];
    const unit = scopedUnit(actor, dto.unit);
    const policyUnit = unit ?? (actor.unit === Unit.TOAN_KLH ? Unit.KOUN_MOM : actor.unit);
    const policy = await this.prisma.schedulingPolicy.findUnique({ where: { unit: policyUnit } });
    const vehicleBuffer = policy?.vehicleBufferMinutes ?? 0;
    const driverBuffer = policy?.driverBufferMinutes ?? 0;

    const vehicleWhere: Record<string, unknown> = {};
    if (dto.managementUnitId) vehicleWhere.managementUnitId = { in: managementUnitIds };
    if (dto.vehicleIds?.length) {
      vehicleWhere.id = { in: dto.vehicleIds };
    } else {
      Object.assign(vehicleWhere, operationalVehicleWhere);
      if (dto.category) {
        const domain: Record<WorkOrderCategory, VehicleOperationalDomain> = {
          [WorkOrderCategory.AGRICULTURE]: VehicleOperationalDomain.AGRICULTURE,
          [WorkOrderCategory.CONSTRUCTION]: VehicleOperationalDomain.CONSTRUCTION,
          [WorkOrderCategory.TRANSPORT]: VehicleOperationalDomain.TRANSPORT,
          [WorkOrderCategory.RESCUE]: VehicleOperationalDomain.SUPPORT,
        };
        vehicleWhere.vehicleType = {
          is: {
            active: true,
            isAssignable: true,
            operationalDomain: domain[dto.category],
          },
        };
      }
      const targetUnit = unit || (dto.complexCode ? (dto.complexCode as Unit) : undefined);
      if (targetUnit && targetUnit !== Unit.TOAN_KLH) {
        vehicleWhere.unit = targetUnit;
        vehicleWhere.complexCode = targetUnit;
      } else {
        const complexCode = dto.complexCode || 'KOUN_MOM';
        vehicleWhere.complexCode = complexCode;
      }
    }

    const targetUnit = unit || (dto.complexCode ? (dto.complexCode as Unit) : undefined);
    const driverWhere: Record<string, unknown> = { role: Role.DRIVER, isActive: true };
    if (dto.managementUnitId) {
      driverWhere.driverProfile = { is: { managementAssignments: { some: {
        AND: [
          { OR: [
            { managementUnitId: { in: managementUnitIds } },
            { teamUnitId: { in: managementUnitIds } },
          ] },
          { effectiveFrom: { lte: new Date() } },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
        ],
      } } } };
    }
    if (dto.driverIds?.length) {
      driverWhere.id = { in: dto.driverIds };
    } else {
      if (targetUnit && targetUnit !== Unit.TOAN_KLH) {
        driverWhere.unit = targetUnit;
      } else if (dto.complexCode) {
        const complexPrefixMap: Record<string, string> = {
          KOUN_MOM: 'TX-KM-',
          SNOUL: 'TX-SN-',
          NAM_LAO: 'TX-NL-',
        };
        const prefix = complexPrefixMap[dto.complexCode];
        if (prefix) {
          driverWhere.code = { startsWith: prefix };
        }
      }
    }

    const [vehicles, drivers] = await Promise.all([
      this.prisma.vehicle.findMany({ where: vehicleWhere, include: { vehicleType: true }, orderBy: { code: 'asc' } }),
      this.prisma.user.findMany({
        where: driverWhere,
        include: { driverProfile: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const driverIds = drivers.map((driver) => driver.id);
    const [
      vehicleAssignments,
      vehicleExecutions,
      maintenanceRecords,
      repairTickets,
      vehicleHolds,
      vehicleLegacyDispatch,
      vehicleLegacyTransport,
      vehicleFeedTrips,
      driverAssignments,
      driverExecutions,
      driverLeave,
      driverLegacyDispatch,
      driverLegacyTransport,
      driverFeedTrips,
    ] = await Promise.all([
      this.prisma.workVehicleAssignment.findMany({
        where: {
          vehicleId: { in: vehicleIds },
          status: { in: ACTIVE_ASSIGNMENTS },
          workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined,
          workOrder: { status: { notIn: INACTIVE_WORK_ORDERS }, plannedStartAt: { lt: dto.endAt }, plannedEndAt: { gt: dto.startAt } },
        },
        include: { workOrder: { include: { dispatchOrder: true, transportOrder: true, internalFeedTrip: true } } },
      }),
      this.prisma.workExecutionSegment.findMany({ where: { vehicleId: { in: vehicleIds }, workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined, startedAt: { lt: dto.endAt }, OR: [{ endedAt: null }, { endedAt: { gt: dto.startAt } }] } }),
      this.prisma.workshopRequest.findMany({ where: { vehicleId: { in: vehicleIds }, type: 'MAINTENANCE', status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.workshopRequest.findMany({ where: { vehicleId: { in: vehicleIds }, type: 'REPAIR', status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.vehicleUnavailability.findMany({ where: { vehicleId: { in: vehicleIds }, status: UnavailabilityStatus.APPROVED, startAt: { lt: dto.endAt }, OR: [{ endAt: null }, { endAt: { gt: dto.startAt } }] } }),
      this.prisma.dispatchOrder.findMany({ where: { id: dto.excludeDispatchOrderId ? { not: dto.excludeDispatchOrderId } : undefined, vehicleId: { in: vehicleIds }, status: { in: ACTIVE_DISPATCH }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.transportOrder.findMany({ where: { vehicleId: { in: vehicleIds }, status: { in: ACTIVE_TRANSPORT }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.internalFeedTrip.findMany({ where: { vehicleId: { in: vehicleIds }, operationalWorkOrder: { is: null }, completedFeedTime: null, slaWindowStart: { lt: dto.endAt }, slaWindowEnd: { gt: dto.startAt } } }),
      this.prisma.workDriverAssignment.findMany({
        where: {
          driverId: { in: driverIds },
          status: { in: ACTIVE_ASSIGNMENTS },
          workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined,
          workOrder: { status: { notIn: INACTIVE_WORK_ORDERS }, plannedStartAt: { lt: dto.endAt }, plannedEndAt: { gt: dto.startAt } },
        },
        include: { workOrder: { include: { dispatchOrder: true, transportOrder: true, internalFeedTrip: true } } },
      }),
      this.prisma.workExecutionSegment.findMany({ where: { driverId: { in: driverIds }, workOrderId: dto.excludeWorkOrderId ? { not: dto.excludeWorkOrderId } : undefined, startedAt: { lt: dto.endAt }, OR: [{ endedAt: null }, { endedAt: { gt: dto.startAt } }] } }),
      this.prisma.driverUnavailability.findMany({ where: { driverId: { in: driverIds }, status: UnavailabilityStatus.APPROVED, startAt: { lt: dto.endAt }, OR: [{ endAt: null }, { endAt: { gt: dto.startAt } }] } }),
      this.prisma.dispatchOrder.findMany({ where: { id: dto.excludeDispatchOrderId ? { not: dto.excludeDispatchOrderId } : undefined, driverId: { in: driverIds }, status: { in: ACTIVE_DISPATCH }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.transportOrder.findMany({ where: { driverId: { in: driverIds }, status: { in: ACTIVE_TRANSPORT }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.internalFeedTrip.findMany({ where: { driverId: { in: driverIds }, operationalWorkOrder: { is: null }, completedFeedTime: null, slaWindowStart: { lt: dto.endAt }, slaWindowEnd: { gt: dto.startAt } } }),
    ]);

    const vehicleGroups = {
      assignments: this.groupByResource(vehicleAssignments, (item) => item.vehicleId),
      executions: this.groupByResource(vehicleExecutions, (item) => item.vehicleId),
      maintenance: this.groupByResource(maintenanceRecords, (item) => item.vehicleId),
      repairs: this.groupByResource(repairTickets, (item) => item.vehicleId),
      holds: this.groupByResource(vehicleHolds, (item) => item.vehicleId),
      legacyDispatch: this.groupByResource(vehicleLegacyDispatch, (item) => item.vehicleId!),
      legacyTransport: this.groupByResource(vehicleLegacyTransport, (item) => item.vehicleId!),
      feedTrips: this.groupByResource(vehicleFeedTrips, (item) => item.vehicleId!),
    };
    const driverGroups = {
      assignments: this.groupByResource(driverAssignments, (item) => item.driverId),
      executions: this.groupByResource(driverExecutions, (item) => item.driverId),
      leave: this.groupByResource(driverLeave, (item) => item.driverId),
      legacyDispatch: this.groupByResource(driverLegacyDispatch, (item) => item.driverId!),
      legacyTransport: this.groupByResource(driverLegacyTransport, (item) => item.driverId!),
      feedTrips: this.groupByResource(driverFeedTrips, (item) => item.driverId!),
    };

    const [vehicleResults, driverResults] = await Promise.all([
      Promise.all(vehicles.map((vehicle) => this.vehicleAvailability(vehicle, dto, vehicleBuffer, {
        assignments: vehicleGroups.assignments.get(vehicle.id) ?? [],
        executions: vehicleGroups.executions.get(vehicle.id) ?? [],
        maintenance: vehicleGroups.maintenance.get(vehicle.id) ?? [],
        repairs: vehicleGroups.repairs.get(vehicle.id) ?? [],
        holds: vehicleGroups.holds.get(vehicle.id) ?? [],
        legacyDispatch: vehicleGroups.legacyDispatch.get(vehicle.id) ?? [],
        legacyTransport: vehicleGroups.legacyTransport.get(vehicle.id) ?? [],
        feedTrips: vehicleGroups.feedTrips.get(vehicle.id) ?? [],
      }))),
      Promise.all(drivers.map((driver) => this.driverAvailability(driver, dto, driverBuffer, vehicles, {
        assignments: driverGroups.assignments.get(driver.id) ?? [],
        executions: driverGroups.executions.get(driver.id) ?? [],
        leave: driverGroups.leave.get(driver.id) ?? [],
        legacyDispatch: driverGroups.legacyDispatch.get(driver.id) ?? [],
        legacyTransport: driverGroups.legacyTransport.get(driver.id) ?? [],
        feedTrips: driverGroups.feedTrips.get(driver.id) ?? [],
      }))),
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
    category?: WorkOrderCategory;
    vehicleId: number;
    driverId?: number;
    excludeWorkOrderId?: number;
  }, actor: OperationalActor) {
    const result = await this.search({
      startAt: input.startAt,
      endAt: input.endAt,
      unit: input.unit,
      category: input.category,
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

  private async vehicleAvailability(vehicle: any, dto: AvailabilitySearchDto, bufferMinutes: number, preloaded?: Record<string, any[]>): Promise<ResourceAvailability> {
    const [assignments, executions, maintenance, repairs, holds, legacyDispatch, legacyTransport, feedTrips] = preloaded
      ? [preloaded.assignments, preloaded.executions, preloaded.maintenance, preloaded.repairs, preloaded.holds, preloaded.legacyDispatch, preloaded.legacyTransport, preloaded.feedTrips]
      : await Promise.all([
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
      this.prisma.workshopRequest.findMany({ where: { vehicleId: vehicle.id, type: 'MAINTENANCE', status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.workshopRequest.findMany({ where: { vehicleId: vehicle.id, type: 'REPAIR', status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.vehicleUnavailability.findMany({ where: { vehicleId: vehicle.id, status: UnavailabilityStatus.APPROVED, startAt: { lt: dto.endAt }, OR: [{ endAt: null }, { endAt: { gt: dto.startAt } }] } }),
      this.prisma.dispatchOrder.findMany({ where: { id: dto.excludeDispatchOrderId ? { not: dto.excludeDispatchOrderId } : undefined, vehicleId: vehicle.id, status: { in: ACTIVE_DISPATCH }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.transportOrder.findMany({ where: { vehicleId: vehicle.id, status: { in: ACTIVE_TRANSPORT }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.internalFeedTrip.findMany({ where: { vehicleId: vehicle.id, operationalWorkOrder: { is: null }, completedFeedTime: null, slaWindowStart: { lt: dto.endAt }, slaWindowEnd: { gt: dto.startAt } } }),
      ]);

    const intervals: BusyInterval[] = [];
    for (const item of assignments) intervals.push(this.interval('WORK_ORDER', item.startAt, item.endAt ?? item.workOrder.plannedEndAt, dto.endAt, { relatedId: item.workOrderId, relatedCode: this.workOrderCode(item.workOrder) }));
    for (const item of executions) intervals.push(this.interval('ACTIVE_EXECUTION', item.startedAt, item.endedAt, dto.endAt, { relatedId: item.workOrderId, reasonCode: 'ACTIVE_TRIP' }));
    for (const item of maintenance) {
      const start = item.startedAt ?? item.plannedStartAt ?? item.createdAt;
      const end = item.completedAt ?? item.plannedEndAt;
      intervals.push(this.interval('MAINTENANCE', start, end, dto.endAt, { relatedId: item.id, reasonCode: 'VEHICLE_MAINTENANCE' }));
    }
    for (const item of repairs) {
      const start = item.startedAt ?? item.plannedStartAt ?? item.createdAt;
      const end = item.completedAt ?? item.plannedEndAt;
      intervals.push(this.interval('REPAIR', start, end, dto.endAt, { relatedId: item.id, relatedCode: item.code, reasonCode: 'VEHICLE_REPAIR' }));
    }
    for (const item of holds) intervals.push(this.interval(item.type, item.startAt, item.endAt, dto.endAt, { relatedId: item.id, reasonCode: `VEHICLE_${item.type}` }));
    for (const item of legacyDispatch) intervals.push(this.interval('LEGACY_DISPATCH', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of legacyTransport) intervals.push(this.interval('LEGACY_TRANSPORT', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of feedTrips) intervals.push(this.interval('LEGACY_INTERNAL_FEED', item.slaWindowStart, item.slaWindowEnd, dto.endAt, { relatedId: item.id, relatedCode: item.code }));

    const buffered = mergeBusyIntervals(intervals.map((item) => withBuffer(item, bufferMinutes)));
    const reasons = this.intervalReasons(intervals, dto, bufferMinutes, 'VEHICLE_TIME_CONFLICT', (item) => this.vehicleIntervalMessage(item));
    if ([VehicleStatus.TAM_DUNG, VehicleStatus.BAO_DUONG, VehicleStatus.SUA_CHUA].includes(vehicle.status)) {
      reasons.unshift({ code: `VEHICLE_STATUS_${vehicle.status}`, severity: 'BLOCK', message: `Trạng thái xe ${vehicle.status} không cho phép phân công.` });
    }
    if (isLiquidatedAssignedUnit(vehicle.assignedUnitCode)) {
      reasons.unshift({ code: 'VEHICLE_LIQUIDATED', severity: 'BLOCK', message: 'Xe đã loại biên/thanh lý không cho phép phân công.' });
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

  private async driverAvailability(driver: any, dto: AvailabilitySearchDto, bufferMinutes: number, selectedVehicles: any[], preloaded?: Record<string, any[]>): Promise<ResourceAvailability> {
    const [assignments, executions, leave, legacyDispatch, legacyTransport, feedTrips] = preloaded
      ? [preloaded.assignments, preloaded.executions, preloaded.leave, preloaded.legacyDispatch, preloaded.legacyTransport, preloaded.feedTrips]
      : await Promise.all([
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
      this.prisma.dispatchOrder.findMany({ where: { id: dto.excludeDispatchOrderId ? { not: dto.excludeDispatchOrderId } : undefined, driverId: driver.id, status: { in: ACTIVE_DISPATCH }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.transportOrder.findMany({ where: { driverId: driver.id, status: { in: ACTIVE_TRANSPORT }, operationalWorkOrder: { is: null }, departureTime: { lt: dto.endAt }, plannedEndTime: { gt: dto.startAt } } }),
      this.prisma.internalFeedTrip.findMany({ where: { driverId: driver.id, operationalWorkOrder: { is: null }, completedFeedTime: null, slaWindowStart: { lt: dto.endAt }, slaWindowEnd: { gt: dto.startAt } } }),
      ]);
    const intervals: BusyInterval[] = [];
    for (const item of assignments) intervals.push(this.interval('WORK_ORDER', item.startAt, item.endAt ?? item.workOrder.plannedEndAt, dto.endAt, { relatedId: item.workOrderId, relatedCode: this.workOrderCode(item.workOrder) }));
    for (const item of executions) intervals.push(this.interval('ACTIVE_EXECUTION', item.startedAt, item.endedAt, dto.endAt, { relatedId: item.workOrderId, reasonCode: 'ACTIVE_TRIP' }));
    for (const item of leave) intervals.push(this.interval(item.type, item.startAt, item.endAt, dto.endAt, { relatedId: item.id, reasonCode: `DRIVER_${item.type}`, description: item.reason ?? undefined }));
    for (const item of legacyDispatch) intervals.push(this.interval('LEGACY_DISPATCH', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of legacyTransport) intervals.push(this.interval('LEGACY_TRANSPORT', item.departureTime!, item.plannedEndTime!, dto.endAt, { relatedId: item.id, relatedCode: item.code }));
    for (const item of feedTrips) intervals.push(this.interval('LEGACY_INTERNAL_FEED', item.slaWindowStart, item.slaWindowEnd, dto.endAt, { relatedId: item.id, relatedCode: item.code }));

    const buffered = mergeBusyIntervals(intervals.map((item) => withBuffer(item, bufferMinutes)));
    const reasons = this.intervalReasons(intervals, dto, bufferMinutes, 'DRIVER_TIME_CONFLICT', (item) => this.driverIntervalMessage(item));
    const profile = driver.driverProfile;
    const employmentStatus = profile?.employmentStatus ?? driver.employmentStatus;
    const shiftStatus = profile?.currentShiftStatus ?? driver.currentShiftStatus;
    const licenseExpiry = profile?.licenseExpiryDate ?? driver.licenseExpiryDate;
    const healthExpiry = profile?.healthCheckExpiryDate ?? driver.healthCheckExpiryDate;
    const licenseClass = profile?.licenseClass ?? driver.licenseClass;
    const resignedDate = profile?.resignedDate ?? driver.resignedDate;
    const normalizeLicense = (value: unknown) => String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '');
    const supplementalLicenses = Array.isArray(profile?.licensesJson)
      ? profile.licensesJson.filter((item: any) => !item?.expiryDate || new Date(item.expiryDate) >= dto.endAt)
      : [];
    const licenseLabels = [licenseClass, ...supplementalLicenses.map((item: any) => item?.category)].filter(Boolean);
    const licenseTokens = licenseLabels.map(normalizeLicense);
    const hasLicense = (required: string) => licenseTokens.some((token) => token.includes(normalizeLicense(required)));
    const licenseSummary = licenseLabels.join(', ') || 'chưa khai báo';
    if (!driver.isActive || employmentStatus !== DriverEmploymentStatus.DANG_LAM_VIEC || (resignedDate && resignedDate <= dto.startAt)) {
      reasons.unshift({ code: 'DRIVER_RESIGNED', severity: 'BLOCK', message: 'Tài xế đã nghỉ việc hoặc tài khoản không còn hoạt động.' });
    }
    if (shiftStatus && shiftStatus !== DriverShiftStatus.SAN_SANG) {
      reasons.unshift({
        code: 'DRIVER_SHIFT_UNAVAILABLE',
        severity: 'BLOCK',
        message: shiftStatus === DriverShiftStatus.NGHI_PHEP_CA
          ? 'Tài xế đang ở trạng thái nghỉ phép/nghỉ ca.'
          : 'Tài xế đang vận hành xe hoặc thực hiện công việc khác.',
      });
    }
    if (licenseExpiry && licenseExpiry < dto.endAt) reasons.unshift({ code: 'LICENSE_EXPIRED', severity: 'BLOCK', message: 'GPLX hết hạn trước khi công việc kết thúc.' });
    if (healthExpiry && healthExpiry < dto.endAt) reasons.unshift({ code: 'HEALTH_CHECK_EXPIRED', severity: 'BLOCK', message: 'Khám sức khỏe hết hạn trước khi công việc kết thúc.' });
    if (dto.category === WorkOrderCategory.AGRICULTURE) {
      const hasAgricultureLicense = hasLicense('HANG_B2') || hasLicense('HANG_B1') || hasLicense('NONG_NGHIEP');
      if (!hasAgricultureLicense) {
        reasons.unshift({ code: 'LICENSE_CLASS_MISMATCH', severity: 'BLOCK', message: `GPLX hiện có (${licenseSummary}) chưa có Hạng B1/B2 phù hợp máy nông nghiệp.` });
      }
    } else if (selectedVehicles.length === 1 && selectedVehicles[0].vehicleType?.requiredLicenseClass && !hasLicense(selectedVehicles[0].vehicleType.requiredLicenseClass)) {
      reasons.unshift({ code: 'LICENSE_CLASS_MISMATCH', severity: 'BLOCK', message: `GPLX hiện có (${licenseSummary}) không đáp ứng ${selectedVehicles[0].vehicleType.requiredLicenseClass} của xe đã chọn.` });
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
    const detail = interval.description ? ` Lý do: ${interval.description}` : '';
    if (interval.type === 'LEAVE') return `Tài xế đang nghỉ phép trong khung giờ này.${detail}`;
    if (interval.type === 'SHIFT_REST') return `Tài xế đang nghỉ ca trong khung giờ này.${detail}`;
    if (interval.type === 'MEDICAL') return `Tài xế có lịch nghỉ bệnh/khám sức khỏe trong khung giờ này.${detail}`;
    if (interval.type === 'EMERGENCY') return `Tài xế nghỉ đột xuất trong khung giờ này.${detail}`;
    if (interval.type === 'ACTIVE_EXECUTION') return 'Tài xế đang thực hiện một chuyến chưa kết thúc.';
    if (interval.type === 'WORK_ORDER') return `Tài xế đã được phân công cho lệnh ${interval.relatedCode ?? interval.relatedId ?? 'khác'} trong khung giờ này.`;
    if (interval.type === 'LEGACY_DISPATCH') return `Tài xế đang bận lệnh điều xe ${interval.relatedCode ?? interval.relatedId ?? ''}.`.trim();
    if (interval.type === 'LEGACY_TRANSPORT') return `Tài xế đang bận lệnh vận chuyển ${interval.relatedCode ?? interval.relatedId ?? ''}.`.trim();
    if (interval.type === 'LEGACY_INTERNAL_FEED') return `Tài xế đang bận chuyến nguyên liệu ${interval.relatedCode ?? interval.relatedId ?? ''}.`.trim();
    return 'Tài xế đang bận một công việc khác trong khoảng thời gian yêu cầu.';
  }
}
