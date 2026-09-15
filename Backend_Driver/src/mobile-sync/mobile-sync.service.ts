import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DispatchStatus,
  MobileSyncEventStatus,
  OperationalEntityType,
  Prisma,
  RepairStatus,
  RepairTier,
  SosEmergencyType,
  SosStatus,
  TransportStatus,
  VehicleStatus,
} from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MobileSyncEventDto, MobileSyncPushDto } from './dto/mobile-sync.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class MobileSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async push(driverId: number, dto: MobileSyncPushDto) {
    const driver = await this.prisma.user.findUnique({ where: { id: driverId }, select: { id: true, role: true, isActive: true } });
    if (!driver || !driver.isActive || driver.role !== 'DRIVER') throw new NotFoundException('Không tìm thấy tài khoản tài xế đang hoạt động.');

    const ordered = [...dto.events].sort((left, right) => {
      const leftPriority = left.eventType === 'SOS_CREATED' ? 0 : left.eventType === 'INCIDENT_REPORTED' ? 1 : 2;
      const rightPriority = right.eventType === 'SOS_CREATED' ? 0 : right.eventType === 'INCIDENT_REPORTED' ? 1 : 2;
      return leftPriority - rightPriority || left.sequenceNumber - right.sequenceNumber;
    });
    const processed: unknown[] = [];
    const failed: unknown[] = [];

    for (const event of ordered) {
      try {
        processed.push(await this.processOne(driverId, dto.deviceId, event));
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const existing = await this.prisma.mobileSyncEvent.findUnique({ where: { eventId: event.eventId } });
          processed.push({ eventId: event.eventId, status: 'ALREADY_PROCESSED', result: existing?.result });
          continue;
        }
        failed.push({
          eventId: event.eventId,
          code: error instanceof BadRequestException ? 'BUSINESS_RULE' : 'RETRYABLE_ERROR',
          message: error instanceof Error ? error.message : 'Không thể xử lý sự kiện.',
        });
      }
    }

    return { processed, failed, serverTime: new Date().toISOString() };
  }

  async pull(driverId: number, sinceValue?: string) {
    const now = new Date();
    const preloadDays = Math.max(1, Number(process.env.MOBILE_PRELOAD_DAYS || 7));
    const historyDays = Math.max(1, Number(process.env.MOBILE_HISTORY_DAYS || 30));
    const from = new Date(now.getTime() - historyDays * 86400000);
    const to = new Date(now.getTime() + preloadDays * 86400000);
    const since = sinceValue ? new Date(sinceValue) : undefined;
    const changedSince = since && !Number.isNaN(since.getTime()) ? { updatedAt: { gt: since } } : undefined;
    const scheduleWindow = { departureTime: { gte: from, lte: to } };

    const [driver, dispatchOrders, transportOrders, recentEvents] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: driverId },
        select: {
          id: true, code: true, username: true, fullName: true, phone: true, role: true, unit: true,
          avatarUrl: true, currentShiftStatus: true, assignedVehicleId: true, updatedAt: true,
        },
      }),
      this.prisma.dispatchOrder.findMany({
        where: { driverId, OR: changedSince ? [scheduleWindow, changedSince] : [scheduleWindow] },
        include: {
          vehicle: { select: { id: true, code: true, plate: true, name: true, category: true, status: true, odoKm: true, currentLat: true, currentLng: true, currentLocationName: true, updatedAt: true } },
          operationalWorkOrder: { select: { id: true, version: true, status: true, priority: true, jobName: true, targetQuantity: true, targetUnit: true } },
        },
        orderBy: { departureTime: 'asc' },
      }),
      this.prisma.transportOrder.findMany({
        where: { driverId, OR: changedSince ? [scheduleWindow, changedSince] : [scheduleWindow] },
        include: {
          vehicle: { select: { id: true, code: true, plate: true, name: true, category: true, status: true, odoKm: true, currentLat: true, currentLng: true, currentLocationName: true, updatedAt: true } },
          operationalWorkOrder: { select: { id: true, version: true, status: true, priority: true, jobName: true, targetQuantity: true, targetUnit: true } },
        },
        orderBy: { departureTime: 'asc' },
      }),
      this.prisma.mobileSyncEvent.findMany({
        where: { driverId, ...(since ? { createdAt: { gt: since } } : {}) },
        select: { eventId: true, eventType: true, orderType: true, orderId: true, status: true, result: true, occurredAt: true },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
    ]);
    if (!driver || driver.role !== 'DRIVER') throw new NotFoundException('Không tìm thấy hồ sơ tài xế.');

    return {
      driver,
      dispatchOrders,
      transportOrders,
      notifications: recentEvents,
      scheduleChanges: recentEvents.filter((item) => item.eventType === 'SCHEDULE_CHANGE_REQUESTED'),
      sosUpdates: recentEvents.filter((item) => item.eventType === 'SOS_CREATED'),
      deleted: [],
      preloadDays,
      serverTime: now.toISOString(),
    };
  }

  async saveAttachment(driverId: number, file: { mimetype: string; originalname: string; buffer: Buffer }, request: FastifyRequest) {
    if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('Chỉ chấp nhận tệp hình ảnh.');
    const safeExtension = extname(file.originalname).toLowerCase() || '.jpg';
    const month = new Date().toISOString().slice(0, 7);
    const relativeDirectory = join('mobile', month);
    const directory = join(process.cwd(), 'uploads', relativeDirectory);
    await mkdir(directory, { recursive: true });
    const filename = `driver-${driverId}-${randomUUID()}${safeExtension}`;
    await writeFile(join(directory, filename), file.buffer);
    const relativeUrl = `/uploads/${relativeDirectory.replace(/\\/g, '/')}/${filename}`;
    const configuredOrigin = process.env.DRIVER_APP_URL?.replace(/\/$/, '');
    const requestOrigin = `${request.protocol}://${request.headers.host}`;
    return { imageId: filename, url: `${configuredOrigin || requestOrigin}${relativeUrl}`, relativeUrl };
  }

  private async processOne(driverId: number, deviceId: string, event: MobileSyncEventDto) {
    const existing = await this.prisma.mobileSyncEvent.findUnique({ where: { eventId: event.eventId } });
    if (existing) return { eventId: event.eventId, status: 'ALREADY_PROCESSED', result: existing.result };

    return this.prisma.$transaction(async (tx) => {
      const occurredAt = new Date(event.occurredAt);
      const order = await this.loadOwnedOrder(tx, driverId, event);
      const serverVersion = order?.operationalWorkOrder?.version ?? order?.version;
      const blockingConflict = order && (order.driverId !== driverId || order.status === 'CANCELLED');
      const versionConflict = Boolean(order && event.baseVersion && serverVersion && event.baseVersion !== serverVersion);

      if (blockingConflict) {
        const result = { reason: order.driverId !== driverId ? 'ORDER_REASSIGNED' : 'ORDER_CANCELLED', serverEntity: this.serverSnapshot(order), driverDataPreserved: true };
        await this.record(tx, driverId, deviceId, event, result, MobileSyncEventStatus.CONFLICT);
        return { eventId: event.eventId, status: 'CONFLICT', ...result };
      }

      const actionResult = await this.applyEvent(tx, driverId, event, order, occurredAt);
      const result = {
        ...actionResult,
        ...(versionConflict ? { conflict: { reason: 'VERSION_MISMATCH', baseVersion: event.baseVersion, serverVersion, serverEntity: this.serverSnapshot(order) }, driverDataPreserved: true } : {}),
      };
      const status = versionConflict ? MobileSyncEventStatus.CONFLICT : MobileSyncEventStatus.PROCESSED;
      await this.record(tx, driverId, deviceId, event, result, status);
      return { eventId: event.eventId, status: versionConflict ? 'CONFLICT' : 'PROCESSED', result };
    });
  }

  private async loadOwnedOrder(tx: Tx, driverId: number, event: MobileSyncEventDto) {
    if (!event.orderId || event.eventType === 'SOS_CREATED') return null;
    if (event.orderType === 'DISPATCH') {
      const order = await tx.dispatchOrder.findUnique({ where: { id: event.orderId }, include: { operationalWorkOrder: { select: { id: true, version: true } } } });
      if (!order) throw new NotFoundException(`Không tìm thấy lệnh điều xe #${event.orderId}.`);
      return order;
    }
    if (event.orderType === 'TRANSPORT') {
      const order = await tx.transportOrder.findUnique({ where: { id: event.orderId }, include: { operationalWorkOrder: { select: { id: true, version: true } } } });
      if (!order) throw new NotFoundException(`Không tìm thấy lệnh vận chuyển #${event.orderId}.`);
      return order;
    }
    return null;
  }

  private async applyEvent(tx: Tx, driverId: number, event: MobileSyncEventDto, order: any, occurredAt: Date) {
    if (event.eventType === 'SOS_CREATED') return this.createSos(tx, driverId, event, occurredAt);
    if (!order && event.orderType !== 'FEED') throw new BadRequestException('Sự kiện nghiệp vụ phải gắn với một lệnh hợp lệ.');

    let changed = false;
    if (event.orderType === 'DISPATCH') {
      const data: Prisma.DispatchOrderUpdateInput = {};
      if (event.eventType === 'ORDER_ACCEPTED' && order.status === DispatchStatus.ASSIGNED) {
        Object.assign(data, { status: DispatchStatus.DRIVER_ACCEPTED, driverAcceptedAt: occurredAt, version: { increment: 1 } });
      } else if (event.eventType === 'JOB_STARTED' && [DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.AT_WORKSITE].includes(order.status)) {
        Object.assign(data, { status: DispatchStatus.WORKING, actualDepartureTime: order.actualDepartureTime || occurredAt, actualStartTime: order.actualStartTime || occurredAt, version: { increment: 1 } });
      } else if (event.eventType === 'JOB_COMPLETED' && [DispatchStatus.WORKING, DispatchStatus.RETURNING_TO_DEPOT].includes(order.status)) {
        Object.assign(data, { status: DispatchStatus.COMPLETED, actualCompletedTime: occurredAt, returnTime: occurredAt, version: { increment: 1 } });
      }
      if (Object.keys(data).length) { await tx.dispatchOrder.update({ where: { id: event.orderId! }, data }); changed = true; }
    } else if (event.orderType === 'TRANSPORT') {
      const data: Prisma.TransportOrderUpdateInput = {};
      if (event.eventType === 'ORDER_ACCEPTED' && order.status === TransportStatus.ASSIGNED) {
        Object.assign(data, { status: TransportStatus.DRIVER_ACCEPTED, driverAcceptedAt: occurredAt, version: { increment: 1 } });
      } else if (event.eventType === 'JOB_STARTED' && [TransportStatus.DRIVER_ACCEPTED, TransportStatus.AT_PICKUP, TransportStatus.LOADING, TransportStatus.DEPARTED].includes(order.status)) {
        Object.assign(data, { status: TransportStatus.IN_TRANSIT, departedAt: order.departedAt || occurredAt, version: { increment: 1 } });
      } else if (event.eventType === 'JOB_COMPLETED' && [TransportStatus.IN_TRANSIT, TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING, TransportStatus.RETURNING_TO_DEPOT, TransportStatus.AT_DEPOT].includes(order.status)) {
        Object.assign(data, { status: TransportStatus.DELIVERED, arrivalTime: occurredAt, deliveredAt: occurredAt, version: { increment: 1 } });
      }
      if (Object.keys(data).length) { await tx.transportOrder.update({ where: { id: event.orderId! }, data }); changed = true; }
    }

    const vehicleId = Number(event.payload.vehicleId || order?.vehicleId || 0);
    if (vehicleId && event.eventType === 'JOB_PAUSED') await tx.vehicle.update({ where: { id: vehicleId }, data: { status: VehicleStatus.TAM_DUNG } });
    if (vehicleId && ['JOB_STARTED', 'JOB_RESUMED'].includes(event.eventType)) await tx.vehicle.update({ where: { id: vehicleId }, data: { status: VehicleStatus.HOAT_DONG, lastGpsUpdate: occurredAt } });
    if (vehicleId && event.eventType === 'JOB_COMPLETED') {
      const finishOdoKm = Number(event.payload.finishOdoKm);
      await tx.vehicle.update({ where: { id: vehicleId }, data: { status: VehicleStatus.CHO_PHAN_CONG, ...(Number.isFinite(finishOdoKm) ? { odoKm: finishOdoKm } : {}), lastGpsUpdate: occurredAt } });
    }

    if (event.orderType !== 'FEED' && event.orderId) {
      await tx.operationalAuditLog.create({
        data: {
          entityType: event.orderType === 'DISPATCH' ? OperationalEntityType.DISPATCH_ORDER : OperationalEntityType.TRANSPORT_ORDER,
          entityId: event.orderId,
          actorId: driverId,
          action: `MOBILE_${event.eventType}`,
          newValue: event.payload as Prisma.InputJsonValue,
          createdAt: occurredAt,
        },
      });
    }
    return { changed, eventTime: occurredAt.toISOString() };
  }

  private async createSos(tx: Tx, driverId: number, event: MobileSyncEventDto, occurredAt: Date) {
    const vehicleId = Number(event.payload.vehicleId);
    const lat = Number(event.payload.latitude ?? event.payload.lat);
    const lng = Number(event.payload.longitude ?? event.payload.lng);
    if (!vehicleId || !Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestException('SOS thiếu xe hoặc tọa độ GPS.');
    const emergencyType = Object.values(SosEmergencyType).includes(event.payload.emergencyType as SosEmergencyType)
      ? event.payload.emergencyType as SosEmergencyType
      : SosEmergencyType.HONG_MAY;
    const description = String(event.payload.description || 'Tài xế yêu cầu hỗ trợ khẩn cấp.');
    const lotLocation = String(event.payload.lotLocation || 'Vị trí GPS từ ứng dụng tài xế');
    const alert = await tx.driverSosAlert.create({
      data: { driverId, vehicleId, lat, lng, lotLocation, emergencyType, description, photoUrl: event.payload.photoUrl ? String(event.payload.photoUrl) : undefined, status: SosStatus.PENDING, createdAt: occurredAt },
    });
    const repair = await tx.repairTicket.create({
      data: { code: `SC-SOS-${event.eventId.slice(0, 8).toUpperCase()}`, vehicleId, reportedByDriverId: driverId, repairTier: RepairTier.SOS_CUU_HO, issueDescription: `[SOS ${lotLocation}]: ${description}`, status: RepairStatus.RECEIVED, estimatedCostVnd: 0, createdAt: occurredAt },
    });
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: VehicleStatus.SUA_CHUA, currentLat: lat, currentLng: lng, currentLocationName: lotLocation, lastGpsUpdate: occurredAt } });
    return { alertId: alert.id, repairTicketCode: repair.code, acknowledgedByServer: true, eventTime: occurredAt.toISOString() };
  }

  private async record(tx: Tx, driverId: number, deviceId: string, event: MobileSyncEventDto, result: Record<string, unknown>, status: MobileSyncEventStatus) {
    await tx.mobileSyncEvent.create({
      data: {
        eventId: event.eventId,
        deviceId,
        driverId,
        orderType: event.orderType,
        orderId: event.orderId,
        eventType: event.eventType,
        sequenceNumber: event.sequenceNumber,
        occurredAt: new Date(event.occurredAt),
        baseVersion: event.baseVersion,
        payload: event.payload as Prisma.InputJsonValue,
        result: result as Prisma.InputJsonValue,
        status,
      },
    });
  }

  private serverSnapshot(order: any) {
    if (!order) return null;
    return { id: order.id, driverId: order.driverId, vehicleId: order.vehicleId, status: order.status, departureTime: order.departureTime, plannedEndTime: order.plannedEndTime, version: order.operationalWorkOrder?.version ?? order.version, updatedAt: order.updatedAt };
  }
}
