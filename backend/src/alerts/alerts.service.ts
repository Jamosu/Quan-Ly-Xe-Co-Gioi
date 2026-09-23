import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertCategory,
  AlertSeverity,
  AlertStatus,
  DriverEmploymentStatus,
  MaintenanceAlertTier,
  Prisma,
  Role,
  SosStatus,
  Unit,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hasGlobalOperationalAccess, OperationalActor } from '../common/utils/operational-access';
import { AlertFilterDto } from './dto/alert-filter.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { daysUntilExpiry, resolveDriverComplianceFields } from '../users/driver-compliance';
import { DISPATCH_FIRST_DELAY_MINUTES } from '../common/constants/dispatch-delay-policy';
import { assertManagementUnitAccess, scopedManagementUnitIds } from '../common/utils/management-scope';

type AlertDb = Prisma.TransactionClient | PrismaService;

export interface EmitAlertInput {
  ruleCode?: string;
  dedupeKey: string;
  sourceType: string;
  sourceId?: string;
  category: AlertCategory;
  alertType: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  location?: string;
  metricValue?: number;
  thresholdValue?: number;
  metricUnit?: string;
  targetUrl?: string;
  metadataJson?: Prisma.InputJsonValue;
  complexCode?: string;
  unit?: Unit;
  managementUnitId?: number;
  vehicleId?: number;
  implementId?: number;
  driverId?: number;
  occurredAt?: Date;
}

const activeStatuses: AlertStatus[] = [AlertStatus.OPEN, AlertStatus.IN_PROGRESS];
const terminalStatuses: AlertStatus[] = [AlertStatus.RESOLVED, AlertStatus.DISMISSED];

const normalizeComplexCode = (value?: string | null) => {
  const normalized = (value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (normalized.includes('KOUN') || normalized === 'KM' || normalized.includes('KOUN_MOM')) return 'KOUN_MOM';
  if (normalized.includes('SNOUL') || normalized === 'SN') return 'SNOUL';
  if (normalized.includes('NAM_LAO') || normalized === 'NL' || normalized.includes('LAO')) return 'NAM_LAO';
  return normalized || undefined;
};

@Injectable()
export class AlertsService {
  private lastReconciledAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  invalidateSourceCache() {
    this.lastReconciledAt = 0;
  }

  async emit(input: EmitAlertInput, transaction?: Prisma.TransactionClient) {
    const db: AlertDb = transaction ?? this.prisma;
    const rule = input.ruleCode
      ? await db.alertRule.findUnique({ where: { code: input.ruleCode }, select: { id: true, status: true } })
      : null;
    if (rule?.status === 'DISABLED' || rule?.status === 'DRAFT') return null;

    return db.alertEvent.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: {
        ruleId: rule?.id,
        dedupeKey: input.dedupeKey,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        category: input.category,
        alertType: input.alertType,
        severity: input.severity,
        title: input.title,
        message: input.message,
        location: input.location,
        metricValue: input.metricValue,
        thresholdValue: input.thresholdValue,
        metricUnit: input.metricUnit,
        targetUrl: input.targetUrl,
        metadataJson: input.metadataJson,
        complexCode: input.complexCode,
        unit: input.unit,
        managementUnitId: input.managementUnitId,
        vehicleId: input.vehicleId,
        implementId: input.implementId,
        driverId: input.driverId,
        occurredAt: input.occurredAt,
      },
      update: {
        ruleId: rule?.id,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        severity: input.severity,
        title: input.title,
        message: input.message,
        location: input.location,
        metricValue: input.metricValue,
        thresholdValue: input.thresholdValue,
        metricUnit: input.metricUnit,
        targetUrl: input.targetUrl,
        metadataJson: input.metadataJson,
        complexCode: input.complexCode,
        unit: input.unit,
        managementUnitId: input.managementUnitId,
        vehicleId: input.vehicleId,
        implementId: input.implementId,
        driverId: input.driverId,
      },
    });
  }

  async resolveByDedupeKey(dedupeKey: string, transaction?: Prisma.TransactionClient) {
    const db: AlertDb = transaction ?? this.prisma;
    return db.alertEvent.updateMany({
      where: { dedupeKey, status: { in: activeStatuses } },
      data: { status: AlertStatus.RESOLVED, resolvedAt: new Date(), dedupeKey: null },
    });
  }

  private async resolveStale(prefix: string, activeKeys: string[]) {
    const stale = await this.prisma.alertEvent.findMany({
      where: {
        dedupeKey: { startsWith: prefix, ...(activeKeys.length ? { notIn: activeKeys } : {}) },
        status: { in: activeStatuses },
      },
      select: { id: true },
    });
    if (!stale.length) return;
    await this.prisma.alertEvent.updateMany({
      where: { id: { in: stale.map((item) => item.id) } },
      data: { status: AlertStatus.RESOLVED, resolvedAt: new Date(), dedupeKey: null },
    });
  }

  private async scopeWhere(actor: OperationalActor, complexCode?: string): Promise<Prisma.AlertEventWhereInput> {
    const where: Prisma.AlertEventWhereInput = {};
    if (complexCode && complexCode !== 'ALL') where.complexCode = complexCode;
    if (hasGlobalOperationalAccess(actor)) return where;
    if (actor.role === Role.DRIVER) {
      where.driverId = actor.id;
      return where;
    }
    const managementUnitIds = await scopedManagementUnitIds(this.prisma, actor);
    if (managementUnitIds) where.managementUnitId = { in: managementUnitIds };
    return where;
  }

  private async ensureAccessible(id: number, actor: OperationalActor) {
    const alert = await this.prisma.alertEvent.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException(`Không tìm thấy cảnh báo #${id}.`);
    if (!hasGlobalOperationalAccess(actor)) {
      if (actor.role === Role.FARM_MANAGER && alert.managementUnitId) {
        await assertManagementUnitAccess(this.prisma, actor, alert.managementUnitId);
        return alert;
      }
      const allowed = actor.role === Role.DRIVER ? alert.driverId === actor.id : !alert.unit || alert.unit === actor.unit;
      if (!allowed) throw new ForbiddenException('Không được truy cập cảnh báo ngoài phạm vi được phân quyền.');
    }
    return alert;
  }

  private async reconcileCurrentSources() {
    if (Date.now() - this.lastReconciledAt < 30_000) return;
    this.lastReconciledAt = Date.now();

    const [sosAlerts, legacyMaintenance, delayedOrders, excessFuel, delayedFeed, transportIssues, drivers, employeeRecords] = await Promise.all([
      this.prisma.driverSosAlert.findMany({
        where: { status: { not: SosStatus.RESOLVED } },
        include: {
          vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true } },
          driver: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.vehicle.findMany({
        where: {
          alertTier: { in: [MaintenanceAlertTier.AMBER, MaintenanceAlertTier.RED] },
          OR: [
            { vehicleTypeId: null },
            { vehicleType: { maintenanceStandards: { none: { status: 'ACTIVE' } } } },
          ],
        },
        select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true, assignedUnitCode: true, hoursSinceLastService: true, alertTier: true },
      }),
      this.prisma.dispatchOrder.findMany({
        where: {
          actualDepartureTime: null,
          status: { in: ['APPROVED', 'ASSIGNED', 'DRIVER_ACCEPTED'] },
          OR: [
            { isDelayed: true },
            { departureTime: { lte: new Date(Date.now() - DISPATCH_FIRST_DELAY_MINUTES * 60_000) } },
          ],
        },
        include: { vehicle: { select: { id: true, code: true, plate: true, complexCode: true } }, driver: { select: { id: true, fullName: true } } },
      }),
      this.prisma.fuelDispenseTicket.findMany({
        where: { isExcess: true, dispensedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        include: { vehicle: { select: { id: true, code: true, plate: true, unit: true, complexCode: true } }, driver: { select: { id: true, fullName: true } } },
      }),
      this.prisma.internalFeedTrip.findMany({
        where: { slaStatus: 'DELAYED', updatedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        include: { vehicle: { select: { id: true, code: true, plate: true, unit: true, complexCode: true } }, driver: { select: { id: true, fullName: true } } },
      }),
      this.prisma.transportOrder.findMany({
        where: { OR: [{ isRouteDeviated: true }, { speedKmH: { gt: 0 } }], status: { in: ['DEPARTED', 'IN_TRANSIT', 'AT_DELIVERY'] } },
        include: { vehicle: { select: { id: true, code: true, plate: true, unit: true, complexCode: true } }, driver: { select: { id: true, fullName: true } } },
      }),
      this.prisma.user.findMany({
        where: { role: Role.DRIVER, isActive: true },
        select: {
          id: true,
          code: true,
          fullName: true,
          unit: true,
          employmentStatus: true,
          licenseClass: true,
          licenseNumber: true,
          licenseExpiryDate: true,
          healthCheckExpiryDate: true,
          driverProfile: {
            select: {
              employmentStatus: true,
              licenseClass: true,
              licenseNumber: true,
              licenseExpiryDate: true,
              healthCheckExpiryDate: true,
            },
          },
        },
      }),
      this.prisma.employeeRecord.findMany({ select: { empCode: true, complex: true } }),
    ]);

    const complexByEmployeeCode = new Map(employeeRecords.map((item) => [item.empCode, normalizeComplexCode(item.complex)]));
    const complianceDrivers = drivers
      .map((driver) => ({
        ...driver,
        ...resolveDriverComplianceFields(driver, driver.driverProfile),
        hasDriverProfile: Boolean(driver.driverProfile),
        complexCode: complexByEmployeeCode.get(driver.code),
      }))
      .filter((driver) => driver.employmentStatus === DriverEmploymentStatus.DANG_LAM_VIEC);

    await Promise.all([
      ...sosAlerts.map((sos) => this.emit({
        ruleCode: 'SOS_EMERGENCY', dedupeKey: `SOS:${sos.id}`, sourceType: 'DriverSosAlert', sourceId: String(sos.id),
        category: AlertCategory.SOS, alertType: sos.emergencyType, severity: AlertSeverity.CRITICAL,
        title: `Cứu hộ SOS: ${sos.emergencyType}`, message: sos.description,
        location: sos.lotLocation, targetUrl: `/gps/realtime?sosId=${sos.id}`, vehicleId: sos.vehicleId,
        driverId: sos.driverId, unit: sos.vehicle.unit, complexCode: sos.vehicle.complexCode, occurredAt: sos.createdAt,
      })),
      ...legacyMaintenance.map((vehicle) => this.emit({
        ruleCode: 'MAINTENANCE_BDC2_DUE', dedupeKey: `MAINTENANCE:LEGACY:${vehicle.id}`, sourceType: 'Vehicle', sourceId: String(vehicle.id),
        category: AlertCategory.MAINTENANCE, alertType: 'BDC2_LEGACY_250H',
        severity: vehicle.alertTier === MaintenanceAlertTier.RED ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: vehicle.alertTier === MaintenanceAlertTier.RED ? 'Xe đến hạn bảo dưỡng 250 giờ' : 'Xe sắp đến hạn bảo dưỡng 250 giờ',
        message: `${vehicle.plate || vehicle.code} đã vận hành ${Math.round(vehicle.hoursSinceLastService)} giờ kể từ lần bảo dưỡng gần nhất.`,
        location: vehicle.assignedUnitCode || vehicle.complexCode, metricValue: vehicle.hoursSinceLastService,
        thresholdValue: 250, metricUnit: 'h', targetUrl: `/doi-xe/ho-so-xe?vehicleId=${vehicle.id}`,
        vehicleId: vehicle.id, unit: vehicle.unit, complexCode: vehicle.complexCode,
      })),
      ...delayedOrders.map((order) => this.emit({
        ruleCode: 'DISPATCH_DELAYED', dedupeKey: `DISPATCH:DELAYED:${order.id}`, sourceType: 'DispatchOrder', sourceId: String(order.id),
        category: AlertCategory.DISPATCH, alertType: 'DELAYED_DEPARTURE', severity: AlertSeverity.WARNING,
        title: `Lệnh ${order.code} trễ giờ xuất phát`, message: `Lệnh đã quá ${DISPATCH_FIRST_DELAY_MINUTES} phút nhưng chưa ghi nhận xuất phát.`,
        location: order.destination || order.origin || undefined, targetUrl: `/lenh-dieu-xe/chi-tiet/${order.id}`,
        vehicleId: order.vehicleId || undefined, driverId: order.driverId || undefined, unit: order.unit,
        complexCode: order.vehicle?.complexCode,
      })),
      ...excessFuel.map((ticket) => this.emit({
        ruleCode: 'FUEL_OVER_QUOTA', dedupeKey: `FUEL:EXCESS:${ticket.id}`, sourceType: 'FuelDispenseTicket', sourceId: String(ticket.id),
        category: AlertCategory.FUEL, alertType: 'OVER_QUOTA', severity: AlertSeverity.WARNING,
        title: `Phiếu ${ticket.ticketCode} vượt định mức`,
        message: `Cấp ${ticket.dispensedLiters}L, vượt ${ticket.variancePercent.toFixed(1)}% so với định mức.`,
        metricValue: ticket.variancePercent, thresholdValue: 5, metricUnit: '%', targetUrl: '/nhien-lieu/doi-chieu',
        vehicleId: ticket.vehicleId, driverId: ticket.driverId, unit: ticket.vehicle.unit,
        complexCode: ticket.vehicle.complexCode, occurredAt: ticket.dispensedAt,
      })),
      ...delayedFeed.map((trip) => this.emit({
        dedupeKey: `SLA:FEED:${trip.id}`, sourceType: 'InternalFeedTrip', sourceId: String(trip.id),
        category: AlertCategory.DISPATCH, alertType: 'SLA_DELAYED', severity: AlertSeverity.WARNING,
        title: `Chuyến ${trip.code} vi phạm SLA`, message: trip.delayReason || 'Hoàn thành sau khung giờ SLA.',
        location: trip.destinationLocation, targetUrl: '/lenh-dieu-xe/lenh-noi-bo', vehicleId: trip.vehicleId,
        driverId: trip.driverId, unit: trip.vehicle.unit, complexCode: trip.vehicle.complexCode,
        occurredAt: trip.completedFeedTime || trip.updatedAt,
      })),
      ...transportIssues.flatMap((order) => {
        const alerts: Promise<unknown>[] = [];
        if (order.speedKmH > order.maxSpeedLimit) alerts.push(this.emit({
          ruleCode: 'GPS_OVERSPEED', dedupeKey: `GPS:SPEED:${order.id}`, sourceType: 'TransportOrder', sourceId: String(order.id),
          category: AlertCategory.GPS, alertType: 'OVERSPEED', severity: AlertSeverity.WARNING,
          title: `Xe ${order.vehicle?.plate || order.vehicle?.code || order.code} quá tốc độ`,
          message: `Ghi nhận ${order.speedKmH} km/h, giới hạn ${order.maxSpeedLimit} km/h.`,
          metricValue: order.speedKmH, thresholdValue: order.maxSpeedLimit, metricUnit: 'km/h', targetUrl: '/gps/speed-alert',
          vehicleId: order.vehicleId || undefined, driverId: order.driverId || undefined, unit: order.vehicle?.unit || order.unit,
          complexCode: order.vehicle?.complexCode,
        }));
        if (order.isRouteDeviated) alerts.push(this.emit({
          ruleCode: 'GPS_ROUTE_DEVIATION', dedupeKey: `GPS:ROUTE:${order.id}`, sourceType: 'TransportOrder', sourceId: String(order.id),
          category: AlertCategory.GPS, alertType: 'ROUTE_DEVIATION', severity: AlertSeverity.WARNING,
          title: `Vận đơn ${order.code} lệch tuyến`, message: order.deviationReason || 'Telemetry ghi nhận xe đi lệch lộ trình.',
          targetUrl: '/gps/speed-alert', vehicleId: order.vehicleId || undefined, driverId: order.driverId || undefined,
          unit: order.vehicle?.unit || order.unit, complexCode: order.vehicle?.complexCode,
        }));
        return alerts;
      }),
      ...complianceDrivers.flatMap((driver) => {
        const alerts: Promise<unknown>[] = [];
        const dates = [
          ['DRIVER_LICENSE', 'Giấy phép lái xe', driver.licenseExpiryDate],
          ['DRIVER_HEALTH', 'Khám sức khỏe định kỳ', driver.healthCheckExpiryDate],
        ] as const;
        for (const [type, label, date] of dates) {
          if (!date) continue;
          const remainingDays = daysUntilExpiry(date);
          if (remainingDays > 60) continue;
          alerts.push(this.emit({
            dedupeKey: `COMPLIANCE:${type}:${driver.id}`, sourceType: driver.hasDriverProfile ? 'DriverProfile' : 'User', sourceId: String(driver.id),
            category: AlertCategory.COMPLIANCE, alertType: type,
            severity: remainingDays < 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            title: remainingDays < 0 ? `${label} đã hết hạn` : `${label} sắp hết hạn`,
            message: `${driver.fullName}: ${remainingDays < 0 ? `quá hạn ${Math.abs(remainingDays)} ngày` : `còn ${remainingDays} ngày`}.`,
            metricValue: remainingDays, metricUnit: 'ngày', targetUrl: `/lai-xe/quan-ly-gplx?driverId=${driver.id}`,
            metadataJson: { expiryDate: date.toISOString().slice(0, 10), remainingDays, complianceType: type },
            driverId: driver.id, unit: driver.unit, complexCode: driver.complexCode,
          }));
        }
        return alerts;
      }),
    ]);
    await Promise.all([
      this.resolveStale('SOS:', sosAlerts.map((item) => `SOS:${item.id}`)),
      this.resolveStale('MAINTENANCE:LEGACY:', legacyMaintenance.map((item) => `MAINTENANCE:LEGACY:${item.id}`)),
      this.resolveStale('DISPATCH:DELAYED:', delayedOrders.map((item) => `DISPATCH:DELAYED:${item.id}`)),
      this.resolveStale('GPS:SPEED:', transportIssues.filter((item) => item.speedKmH > item.maxSpeedLimit).map((item) => `GPS:SPEED:${item.id}`)),
      this.resolveStale('GPS:ROUTE:', transportIssues.filter((item) => item.isRouteDeviated).map((item) => `GPS:ROUTE:${item.id}`)),
      this.resolveStale('COMPLIANCE:', complianceDrivers.flatMap((driver) => ([
        ['DRIVER_LICENSE', driver.licenseExpiryDate],
        ['DRIVER_HEALTH', driver.healthCheckExpiryDate],
      ] as const).filter(([, date]) => date && daysUntilExpiry(date) <= 60)
        .map(([type]) => `COMPLIANCE:${type}:${driver.id}`))),
    ]);
  }

  async findAll(filter: AlertFilterDto, actor: OperationalActor) {
    await this.reconcileCurrentSources();
    const scope = await this.scopeWhere(actor, filter.complexCode);
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;
    const baseWhere: Prisma.AlertEventWhereInput = {
      ...scope,
      category: filter.category,
      severity: filter.severity,
      status: filter.status || { in: activeStatuses },
      occurredAt: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
      OR: filter.search ? [
        { title: { contains: filter.search } },
        { message: { contains: filter.search } },
        { vehicle: { code: { contains: filter.search } } },
        { vehicle: { plate: { contains: filter.search } } },
        { implement: { code: { contains: filter.search } } },
      ] : undefined,
    };
    const unreadWhere: Prisma.AlertEventWhereInput = { ...baseWhere, readReceipts: { none: { userId: actor.id } } };
    const readWhere: Prisma.AlertEventWhereInput = { ...baseWhere, readReceipts: { some: { userId: actor.id } } };
    const include = {
      vehicle: { select: { id: true, code: true, plate: true, name: true, category: true } },
      implement: { select: { id: true, code: true, name: true, category: true, status: true, technicalCondition: true } },
      driver: { select: { id: true, fullName: true, phone: true } },
      handledBy: { select: { id: true, fullName: true } },
      readReceipts: { where: { userId: actor.id }, select: { readAt: true } },
    } satisfies Prisma.AlertEventInclude;
    const orderBy: Prisma.AlertEventOrderByWithRelationInput[] = [{ severity: 'asc' }, { occurredAt: 'desc' }];

    const [unreadCount, readCount] = await Promise.all([
      this.prisma.alertEvent.count({ where: unreadWhere }),
      this.prisma.alertEvent.count({ where: readWhere }),
    ]);
    let items: Prisma.AlertEventGetPayload<{ include: typeof include }>[] = [];
    if (filter.readState === 'UNREAD') {
      items = await this.prisma.alertEvent.findMany({ where: unreadWhere, include, orderBy, skip, take: limit });
    } else if (filter.readState === 'READ') {
      items = await this.prisma.alertEvent.findMany({ where: readWhere, include, orderBy, skip, take: limit });
    } else {
      const unreadTake = skip < unreadCount ? Math.min(limit, unreadCount - skip) : 0;
      const unreadItems = unreadTake
        ? await this.prisma.alertEvent.findMany({ where: unreadWhere, include, orderBy, skip, take: unreadTake })
        : [];
      const readSkip = Math.max(0, skip - unreadCount);
      const readTake = limit - unreadItems.length;
      const readItems = readTake
        ? await this.prisma.alertEvent.findMany({ where: readWhere, include, orderBy, skip: readSkip, take: readTake })
        : [];
      items = [...unreadItems, ...readItems];
    }
    const filteredTotal = filter.readState === 'UNREAD' ? unreadCount : filter.readState === 'READ' ? readCount : unreadCount + readCount;

    return {
      items: items.map((item) => ({
        ...item,
        isRead: item.readReceipts.length > 0,
        readAt: item.readReceipts[0]?.readAt || null,
        readReceipts: undefined,
      })),
      summary: { total: unreadCount + readCount, unread: unreadCount, read: readCount },
      pagination: { total: filteredTotal, page, limit, totalPages: Math.max(1, Math.ceil(filteredTotal / limit)) },
    };
  }

  async markRead(id: number, actor: OperationalActor) {
    await this.ensureAccessible(id, actor);
    const receipt = await this.prisma.alertReadReceipt.upsert({
      where: { alertId_userId: { alertId: id, userId: actor.id } },
      create: { alertId: id, userId: actor.id },
      update: {},
    });
    return { id, isRead: true, readAt: receipt.readAt };
  }

  async markAllRead(filter: AlertFilterDto, actor: OperationalActor) {
    const scope = await this.scopeWhere(actor, filter.complexCode);
    const where: Prisma.AlertEventWhereInput = {
      ...scope,
      category: filter.category,
      severity: filter.severity,
      status: filter.status || { in: activeStatuses },
      readReceipts: { none: { userId: actor.id } },
    };
    const ids = await this.prisma.alertEvent.findMany({ where, select: { id: true } });
    if (ids.length) {
      await this.prisma.alertReadReceipt.createMany({ data: ids.map(({ id }) => ({ alertId: id, userId: actor.id })), skipDuplicates: true });
    }
    return { updatedCount: ids.length };
  }

  async updateStatus(id: number, dto: UpdateAlertStatusDto, actor: OperationalActor) {
    const alert = await this.ensureAccessible(id, actor);
    if (terminalStatuses.includes(dto.status) && !dto.reason?.trim()) {
      throw new BadRequestException('Đóng hoặc bỏ qua cảnh báo phải có lý do.');
    }
    if (!activeStatuses.includes(alert.status)) {
      throw new BadRequestException('Cảnh báo đã kết thúc, không thể thay đổi trạng thái.');
    }
    const ended = terminalStatuses.includes(dto.status);
    return this.prisma.alertEvent.update({
      where: { id },
      data: {
        status: dto.status,
        handledById: actor.id,
        handlingReason: dto.reason,
        handledAt: new Date(),
        resolvedAt: ended ? new Date() : null,
        dedupeKey: ended ? null : alert.dedupeKey,
      },
    });
  }

  async getStatistics(filter: AlertFilterDto, actor: OperationalActor) {
    const scope = await this.scopeWhere(actor, filter.complexCode);
    const where = { ...scope, occurredAt: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined };
    const items = await this.prisma.alertEvent.findMany({ where, select: { category: true, severity: true, status: true, occurredAt: true, resolvedAt: true } });
    const byCategory = Object.values(AlertCategory).map((category) => {
      const group = items.filter((item) => item.category === category);
      const resolved = group.filter((item) => item.status === AlertStatus.RESOLVED);
      const responseMinutes = resolved.filter((item) => item.resolvedAt).map((item) => (item.resolvedAt!.getTime() - item.occurredAt.getTime()) / 60_000);
      return {
        category,
        total: group.length,
        open: group.filter((item) => activeStatuses.includes(item.status)).length,
        resolved: resolved.length,
        critical: group.filter((item) => item.severity === AlertSeverity.CRITICAL).length,
        averageResolutionMinutes: responseMinutes.length ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length) : 0,
      };
    });
    return { total: items.length, byCategory };
  }

  getRules() {
    return this.prisma.alertRule.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }], include: { updatedBy: { select: { id: true, fullName: true } } } });
  }

  async updateRule(id: number, dto: UpdateAlertRuleDto, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ quản trị viên được sửa quy tắc cảnh báo.');
    const exists = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Không tìm thấy quy tắc cảnh báo #${id}.`);
    return this.prisma.alertRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        severity: dto.severity,
        status: dto.status,
        configJson: dto.configJson as Prisma.InputJsonValue | undefined,
        updatedBy: { connect: { id: actor.id } },
      },
    });
  }
}
