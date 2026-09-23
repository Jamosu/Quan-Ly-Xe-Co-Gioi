import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { MobileSyncEventStatus, Prisma, Role, Unit, WorkBreakType, WorkPauseReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OperationalActor } from '../common/utils/operational-access';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { SyncEventDto, SyncPushDto } from './dto/sync.dto';
import { MobileDriverService } from './mobile-driver.service';
import { OperationalRealtimeService } from '../operational-realtime/operational-realtime.service';

type OrderSnapshot = {
  id: number;
  driverId: number | null;
  status: string;
  version: number;
  workOrderId: number | null;
  unit: Unit;
  updatedAt: Date;
};

@Injectable()
export class MobileSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mobileDriver: MobileDriverService,
    private readonly workOrders: WorkOrdersService,
    private readonly realtime: OperationalRealtimeService,
  ) {}

  private readonly activePushes = new Set<string>();
  private readonly pushWindows = new Map<string, { startedAt: number; count: number }>();

  async push(driverId: number, dto: SyncPushDto) {
    const pushKey = `${driverId}:${dto.deviceId}`;
    this.assertPushAllowed(pushKey);
    if (this.activePushes.has(pushKey)) {
      throw new HttpException('Thiết bị đang đồng bộ. Vui lòng chờ phản hồi rồi thử lại.', 429);
    }
    this.activePushes.add(pushKey);
    try {
      return await this.pushUnsafe(driverId, dto);
    } finally {
      this.activePushes.delete(pushKey);
    }
  }

  private async pushUnsafe(driverId: number, dto: SyncPushDto) {
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: { id: true, role: true, isActive: true },
    });
    if (!driver || !driver.isActive || driver.role !== Role.DRIVER) {
      throw new NotFoundException('Khong tim thay tai khoan tai xe dang hoat dong.');
    }

    const events = [...(dto.events || [])].sort((left, right) =>
      this.priority(left) - this.priority(right) || left.sequenceNumber - right.sequenceNumber,
    );
    const processed: unknown[] = [];
    const failed: unknown[] = [];
    const batchVersions = new Map<string, number>();

    for (const event of events) {
      try {
        const key = event.orderId ? `${event.orderType}:${event.orderId}` : undefined;
        const result = await this.processOne(driverId, dto.deviceId, event, key ? batchVersions.get(key) : undefined);
        processed.push(result);
        if (key && ['PROCESSED', 'ALREADY_PROCESSED'].includes(result.status)) {
          const current = await this.loadOwnedOrder(event);
          if (current) batchVersions.set(key, current.version);
        }
      } catch (error) {
        failed.push({
          eventId: event.eventId,
          code: 'RETRYABLE_ERROR',
          message: error instanceof Error ? error.message : 'Khong the xu ly su kien dong bo.',
        });
      }
    }
    return { processed, failed, serverTime: new Date().toISOString() };
  }

  private assertPushAllowed(pushKey: string) {
    const now = Date.now();
    const current = this.pushWindows.get(pushKey);
    if (!current || now - current.startedAt >= 60_000) {
      this.pushWindows.set(pushKey, { startedAt: now, count: 1 });
      return;
    }
    if (current.count >= 60) {
      throw new HttpException('Thiết bị gửi đồng bộ quá nhanh. Hệ thống sẽ tự thử lại sau.', 429);
    }
    current.count += 1;
  }

  async pull(driverId: number, since?: string) {
    const payload = await this.mobileDriver.syncPull(driverId, since);
    const changedAfter = since && !Number.isNaN(new Date(since).getTime()) ? new Date(since) : undefined;
    const notifications = await this.prisma.mobileSyncEvent.findMany({
      where: { driverId, ...(changedAfter ? { createdAt: { gt: changedAfter } } : {}) },
      select: {
        eventId: true,
        eventType: true,
        orderType: true,
        orderId: true,
        status: true,
        result: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return { ...payload, notifications, serverTime: new Date().toISOString() };
  }

  async uploadAttachment(driverId: number, file: Express.Multer.File, body?: Record<string, unknown>) {
    return this.mobileDriver.uploadAttachment(driverId, file, body);
  }

  private async processOne(driverId: number, deviceId: string, event: SyncEventDto, batchExpectedVersion?: number) {
    const existing = await this.prisma.mobileSyncEvent.findUnique({ where: { eventId: event.eventId } });
    if (existing) {
      if (existing.status === MobileSyncEventStatus.PROCESSING && Date.now() - existing.createdAt.getTime() > 5 * 60_000) {
        const result = { reason: 'PROCESSING_EXPIRED', driverDataPreserved: true };
        await this.prisma.mobileSyncEvent.update({
          where: { eventId: event.eventId },
          data: { status: MobileSyncEventStatus.CONFLICT, result: result as Prisma.InputJsonValue },
        });
        return { eventId: event.eventId, status: 'CONFLICT', result };
      }
      return { eventId: event.eventId, status: existing.status === MobileSyncEventStatus.PROCESSING ? 'PROCESSING' : 'ALREADY_PROCESSED', result: existing.result };
    }

    try {
      await this.prisma.mobileSyncEvent.create({
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
          payload: (event.payload ?? {}) as Prisma.InputJsonValue,
          status: MobileSyncEventStatus.PROCESSING,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.mobileSyncEvent.findUnique({ where: { eventId: event.eventId } });
        return { eventId: event.eventId, status: duplicate?.status === MobileSyncEventStatus.PROCESSING ? 'PROCESSING' : 'ALREADY_PROCESSED', result: duplicate?.result };
      }
      throw error;
    }

    let order: OrderSnapshot | null;
    try {
      order = await this.loadOwnedOrder(event);
    } catch (error) {
      return this.recordConflict(
        driverId,
        deviceId,
        event,
        'ORDER_NOT_FOUND',
        null,
        error instanceof Error ? error.message : error,
      );
    }
    if (order && order.driverId !== driverId) {
      return this.recordConflict(driverId, deviceId, event, 'ORDER_REASSIGNED', order);
    }
    if (order && order.status === 'CANCELLED') {
      return this.recordConflict(driverId, deviceId, event, 'ORDER_CANCELLED', order);
    }
    const rebasedWithinBatch = batchExpectedVersion !== undefined && order?.version === batchExpectedVersion;
    if (order && event.baseVersion !== undefined && order.version > 0 && event.baseVersion !== order.version && !rebasedWithinBatch) {
      return this.recordConflict(driverId, deviceId, event, 'VERSION_MISMATCH', order);
    }

    let eventResult: unknown;
    try {
      eventResult = await this.runCommand(driverId, deviceId, event, order);
    } catch (error) {
      return this.recordConflict(
        driverId,
        deviceId,
        event,
        'BUSINESS_RULE',
        order,
        error instanceof Error ? error.message : error,
      );
    }
    await this.prisma.mobileSyncEvent.update({
      where: { eventId: event.eventId },
      data: { result: eventResult as Prisma.InputJsonValue, status: MobileSyncEventStatus.PROCESSED },
    });
    if (order) {
      this.realtime.publish({ entityType: event.orderType === 'TRANSPORT' ? 'TRANSPORT_ORDER' : 'DISPATCH_ORDER', entityId: order.id, orderId: order.workOrderId || undefined, unit: order.unit });
    }
    return { eventId: event.eventId, status: 'PROCESSED', result: eventResult };
  }

  private async loadOwnedOrder(event: SyncEventDto): Promise<OrderSnapshot | null> {
    if (!event.orderId || event.eventType === 'SOS_CREATED') return null;
    if (event.orderType === 'DISPATCH') {
      const order = await this.prisma.dispatchOrder.findUnique({
        where: { id: event.orderId },
        include: { operationalWorkOrder: { select: { id: true, version: true } }, workTask: { select: { id: true, version: true } } },
      });
      if (!order) throw new NotFoundException(`Khong tim thay lenh dieu xe #${event.orderId}.`);
      return {
        id: order.id,
        driverId: order.driverId,
        status: order.status,
        version: (order.workTask ?? order.operationalWorkOrder)?.version ?? 0,
        workOrderId: (order.workTask ?? order.operationalWorkOrder)?.id ?? null,
        unit: order.unit,
        updatedAt: order.updatedAt,
      };
    }
    if (event.orderType === 'TRANSPORT') {
      const order = await this.prisma.transportOrder.findUnique({
        where: { id: event.orderId },
        include: { operationalWorkOrder: { select: { id: true, version: true } } },
      });
      if (!order) throw new NotFoundException(`Khong tim thay van don #${event.orderId}.`);
      return {
        id: order.id,
        driverId: order.driverId,
        status: order.status,
        version: order.operationalWorkOrder?.version ?? 0,
        workOrderId: order.operationalWorkOrder?.id ?? null,
        unit: order.unit,
        updatedAt: order.updatedAt,
      };
    }
    return null;
  }

  private async runCommand(
    driverId: number,
    deviceId: string,
    event: SyncEventDto,
    order: OrderSnapshot | null,
  ) {
    if (order?.workOrderId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: driverId },
        select: { id: true, role: true, unit: true },
      }) as OperationalActor | null;
      if (!actor) throw new NotFoundException('Khong tim thay tai xe.');
      const payload = event.payload || {};

      switch (event.eventType) {
        case 'ORDER_ACCEPTED':
          return this.workOrders.driverAccept(order.workOrderId, actor);
        case 'JOB_STARTED':
          return this.workOrders.startExecution(order.workOrderId, {
            startOdoKm: this.numberValue(payload.startOdoKm),
            startMachineHours: this.numberValue(payload.startMachineHours),
            lat: this.numberValue(payload.latitude ?? payload.lat),
            lng: this.numberValue(payload.longitude ?? payload.lng),
          }, actor);
        case 'BREAK_STARTED':
          return this.workOrders.startBreak(order.workOrderId, {
            type: Object.values(WorkBreakType).includes(payload.type as WorkBreakType) ? payload.type as WorkBreakType : WorkBreakType.OTHER,
            note: typeof payload.note === 'string' ? payload.note : event.note,
          }, actor);
        case 'BREAK_ENDED':
          return this.workOrders.endBreak(order.workOrderId, actor);
        case 'JOB_PAUSED':
        case 'WORK_PAUSED':
          return this.workOrders.pauseWork(order.workOrderId, {
            reason: Object.values(WorkPauseReason).includes(payload.reason as WorkPauseReason) ? payload.reason as WorkPauseReason : WorkPauseReason.OTHER,
            note: typeof payload.note === 'string' ? payload.note : event.note,
          }, actor);
        case 'JOB_RESUMED':
        case 'WORK_RESUMED':
          return this.workOrders.resumeWork(order.workOrderId, actor);
        case 'PROGRESS_UPDATED':
          return this.workOrders.updateDailyProgress(order.workOrderId, {
            progressDate: typeof payload.progressDate === 'string' ? new Date(payload.progressDate) : undefined,
            quantityToday: this.numberValue(payload.quantityToday ?? payload.progress),
            overallProgressPercent: this.numberValue(payload.overallProgressPercent),
            description: typeof payload.description === 'string' ? payload.description : undefined,
            note: typeof payload.note === 'string' ? payload.note : event.note,
            evidenceUrls: Array.isArray(payload.evidenceUrls) ? payload.evidenceUrls.map(String) : undefined,
          }, actor);
        case 'DAILY_REPORT_DRAFT_SAVED':
        case 'DAILY_REPORT_SUBMITTED': {
          const reportDto = {
            dispatchOrderId: order.id,
            quantityToday: this.numberValue(payload.quantityToday),
            unit: typeof payload.unit === 'string' ? payload.unit : undefined,
            startMachineHours: this.numberValue(payload.startMachineHours),
            endMachineHours: this.numberValue(payload.endMachineHours),
            startOdoKm: this.numberValue(payload.startOdoKm),
            endOdoKm: this.numberValue(payload.endOdoKm),
            fuelLiters: this.numberValue(payload.fuelLiters),
            evidenceUrls: Array.isArray(payload.evidenceUrls) ? payload.evidenceUrls.map(String) : undefined,
            note: typeof payload.note === 'string' ? payload.note : event.note,
            workCompleted: payload.workCompleted === true,
          };
          return event.eventType === 'DAILY_REPORT_SUBMITTED'
            ? this.workOrders.submitDailyReport(order.workOrderId, reportDto, actor)
            : this.workOrders.saveDailyReport(order.workOrderId, reportDto, actor);
        }
        case 'JOB_COMPLETED':
        case 'WORK_SESSION_ENDED':
          return this.workOrders.endWorkSession(order.workOrderId, {
            endOdoKm: this.numberValue(payload.finishOdoKm ?? payload.endOdoKm),
            endMachineHours: this.numberValue(payload.finishMachineHours ?? payload.endMachineHours),
            quantity: this.numberValue(payload.quantity),
            lat: this.numberValue(payload.latitude ?? payload.lat),
            lng: this.numberValue(payload.longitude ?? payload.lng),
            notes: typeof payload.completionNotes === 'string' ? payload.completionNotes : event.note,
            confirmNoProgress: payload.confirmNoProgress === true || event.eventType === 'JOB_COMPLETED',
          }, actor);
        case 'ACCEPTANCE_SUBMITTED':
        case 'ORDER_COMPLETION_REQUESTED':
          return this.workOrders.submitAcceptance(order.workOrderId, actor);
        default:
          break;
      }
    }

    const result = await this.mobileDriver.syncPush(driverId, { deviceId, events: [event] });
    const failed = result.failed[0];
    if (failed) throw new Error(failed.message);
    return result.processed[0]?.result ?? { accepted: true };
  }

  private numberValue(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private async recordConflict(
    driverId: number,
    deviceId: string,
    event: SyncEventDto,
    reason: string,
    order: OrderSnapshot | null,
    detail?: unknown,
  ) {
    const result = {
      reason,
      detail,
      driverDataPreserved: true,
      serverEntity: order,
    };
    await this.prisma.mobileSyncEvent.update({
      where: { eventId: event.eventId },
      data: { result: result as Prisma.InputJsonValue, status: MobileSyncEventStatus.CONFLICT },
    });
    return { eventId: event.eventId, status: 'CONFLICT', result };
  }

  private priority(event: SyncEventDto) {
    if (event.eventType === 'SOS_CREATED') return 0;
    if (event.eventType === 'INCIDENT_REPORTED') return 1;
    return 2;
  }
}
