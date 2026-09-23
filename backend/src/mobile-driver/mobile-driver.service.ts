import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DispatchStatus,
  RepairStatus,
  RepairTier,
  SosStatus,
  TransportStatus,
  VehicleStatus,
  OperationalEntityType,
  DriverShiftStatus,
  SosEmergencyType,
  AlertCategory,
  AlertSeverity,
  AlertStatus,
  ImplementStatus,
  TechnicalCondition,
  WorkshopRequestSource,
  WorkshopRequestStatus,
  WorkshopRequestType,
  Role,
} from '@prisma/client';
import { extname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSosAlertDto } from './dto/create-sos-alert.dto';
import { FinishTripDto } from './dto/finish-trip.dto';
import { StartTripDto } from './dto/start-trip.dto';
import { AcceptTaskDto } from './dto/accept-task.dto';
import { ScheduleChangeDto, SyncPushDto, TransferRequestDto, UpdateProgressDto } from './dto/sync.dto';
import { AlertsService } from '../alerts/alerts.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { IncidentAssetType, ReportIncidentDto } from './dto/report-incident.dto';
import { WorkshopService } from '../workshop/workshop.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { OperationalActor } from '../common/utils/operational-access';

@Injectable()
export class MobileDriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenance: MaintenanceService,
    private readonly alerts: AlertsService,
    private readonly workshop: WorkshopService,
    private readonly workOrders: WorkOrdersService,
  ) {}

  private async operationalTarget(orderType: string, orderId: number) {
    if (orderType === 'DISPATCH') {
      const target = await this.prisma.dispatchOrder.findUnique({ where: { id: orderId }, select: { operationalWorkOrder: { select: { id: true } }, workTask: { select: { id: true } } } });
      return target ? { operationalWorkOrder: target.workTask ?? target.operationalWorkOrder } : null;
    }
    if (orderType === 'TRANSPORT') return this.prisma.transportOrder.findUnique({ where: { id: orderId }, select: { operationalWorkOrder: { select: { id: true } } } });
    if (orderType === 'FEED') return this.prisma.internalFeedTrip.findUnique({ where: { id: orderId }, select: { operationalWorkOrder: { select: { id: true } } } });
    return null;
  }

  private async driverActor(driverId: number) {
    const actor = await this.prisma.user.findUnique({ where: { id: driverId }, select: { id: true, role: true, unit: true } }) as OperationalActor | null;
    if (!actor || actor.role !== Role.DRIVER) throw new NotFoundException('Không tìm thấy tài xế hợp lệ.');
    return actor;
  }

  async getAssignedTasks(driverId: number) {
    const [dispatchOrders, transportOrders, feedTrips] = await Promise.all([
      this.prisma.dispatchOrder.findMany({
        where: {
          driverId,
          status: { in: [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.AT_WORKSITE, DispatchStatus.WORKING, DispatchStatus.SHIFT_FINISHED, DispatchStatus.WAITING_REPORT, DispatchStatus.WAITING_REVIEW, DispatchStatus.RETURNING_TO_DEPOT] },
        },
        include: {
          vehicle: true,
          requester: { select: { id: true, fullName: true, phone: true } },
          operationalWorkOrder: {
            include: {
              executionSegments: { where: { driverId }, include: { breaks: true, pauses: true }, orderBy: { startedAt: 'desc' }, take: 10 },
              dailyProgress: { orderBy: { progressDate: 'desc' }, take: 30 },
            },
          },
          workTask: {
            include: {
              executionSegments: { where: { driverId }, include: { breaks: true, pauses: true }, orderBy: { startedAt: 'desc' }, take: 10 },
              dailyProgress: { orderBy: { progressDate: 'desc' }, take: 30 },
            },
          },
          dailyReport: { include: { submittedBy: { select: { id: true, fullName: true } } } },
        },
        orderBy: { departureTime: 'asc' },
      }),
      this.prisma.transportOrder.findMany({
        where: {
          driverId,
          status: { in: [TransportStatus.ASSIGNED, TransportStatus.DRIVER_ACCEPTED, TransportStatus.AT_PICKUP, TransportStatus.LOADING, TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT, TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING, TransportStatus.RETURNING_TO_DEPOT, TransportStatus.AT_DEPOT] },
        },
        include: {
          vehicle: true,
          operationalWorkOrder: {
            include: {
              executionSegments: { where: { driverId }, include: { breaks: true, pauses: true }, orderBy: { startedAt: 'desc' }, take: 10 },
              dailyProgress: { orderBy: { progressDate: 'desc' }, take: 30 },
            },
          },
        },
        orderBy: { departureTime: 'asc' },
      }),
      this.prisma.internalFeedTrip.findMany({
        where: {
          driverId,
          slaStatus: 'ON_TIME',
          completedFeedTime: null,
        },
        include: {
          material: true,
          vehicle: true,
        },
        orderBy: { slaWindowStart: 'asc' },
      }),
    ]);

    return {
      dispatchOrders: dispatchOrders.map((item) => ({ ...item, operationalWorkOrder: item.workTask ?? item.operationalWorkOrder })),
      transportOrders,
      feedTrips,
      totalPendingTasks: dispatchOrders.length + transportOrders.length + feedTrips.length,
    };
  }

  async acceptTask(driverId: number, dto: AcceptTaskDto) {
    const target = await this.operationalTarget(dto.orderType, dto.orderId);
    if (target?.operationalWorkOrder) return this.workOrders.driverAccept(target.operationalWorkOrder.id, await this.driverActor(driverId));
    throw new BadRequestException('Lệnh legacy chưa có OperationalWorkOrder. Cần chuyển đổi lệnh trước khi tài xế xác nhận.');
  }

  async startTrip(driverId: number, dto: StartTripDto) {
    const target = await this.operationalTarget(dto.orderType, dto.orderId);
    if (target?.operationalWorkOrder) return this.workOrders.startExecution(target.operationalWorkOrder.id, { startOdoKm: dto.startOdoKm }, await this.driverActor(driverId));
    throw new BadRequestException('Lệnh legacy chưa có OperationalWorkOrder. Cần chuyển đổi lệnh trước khi mở phiên làm việc.');
  }

  async finishTrip(driverId: number, dto: FinishTripDto) {
    const target = await this.operationalTarget(dto.orderType, dto.orderId);
    if (target?.operationalWorkOrder) return this.workOrders.endWorkSession(target.operationalWorkOrder.id, { endOdoKm: dto.finishOdoKm, notes: dto.completionNotes, confirmNoProgress: true }, await this.driverActor(driverId));
    throw new BadRequestException('Lệnh legacy chưa có OperationalWorkOrder. Cần chuyển đổi lệnh trước khi kết thúc phiên làm việc.');
  }

  async createSosAlert(driverId: number, dto: CreateSosAlertDto) {
    return this.workshop.createFromSos(driverId, dto);
    /* Legacy implementation below is intentionally unreachable during the adapter window.
    const randomCode = Math.floor(1000 + Math.random() * 9000);

    const [alert, repair] = await this.prisma.$transaction([
      this.prisma.driverSosAlert.create({
        data: {
          driverId,
          vehicleId: dto.vehicleId,
          lat: dto.lat,
          lng: dto.lng,
          lotLocation: dto.lotLocation,
          emergencyType: dto.emergencyType,
          photoUrl: dto.photoUrl,
          description: dto.description,
          status: SosStatus.PENDING,
        },
        include: {
          driver: { select: { id: true, fullName: true, phone: true } },
          vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true } },
        },
      }),
      this.prisma.repairTicket.create({
        data: {
          code: `SC-SOS-${randomCode}`,
          vehicleId: dto.vehicleId,
          reportedByDriverId: driverId,
          repairTier: RepairTier.SOS_CUU_HO,
          issueDescription: `[BÁO ĐỘNG SOS HIỆN TRƯỜNG - ${dto.lotLocation}]: ${dto.description}`,
          status: RepairStatus.RECEIVED,
          estimatedCostVnd: 1500000,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data: {
          status: VehicleStatus.SUA_CHUA,
          currentLat: dto.lat,
          currentLng: dto.lng,
          currentLocationName: dto.lotLocation,
        },
      }),
    ]);

    await this.alerts.emit({
      ruleCode: 'SOS_EMERGENCY',
      dedupeKey: `SOS:${alert.id}`,
      sourceType: 'DriverSosAlert',
      sourceId: String(alert.id),
      category: AlertCategory.SOS,
      alertType: dto.emergencyType,
      severity: AlertSeverity.CRITICAL,
      title: `SOS ${alert.vehicle.plate || alert.vehicle.code}: ${dto.emergencyType}`,
      message: dto.description,
      location: dto.lotLocation,
      targetUrl: `/gps/realtime?sosId=${alert.id}`,
      vehicleId: dto.vehicleId,
      driverId,
      unit: alert.vehicle.unit,
      complexCode: alert.vehicle.complexCode,
      metadataJson: dto.photoUrl
        ? { photoUrl: dto.photoUrl, lat: dto.lat, lng: dto.lng }
        : { lat: dto.lat, lng: dto.lng },
    });

    return {
      message: 'Đã phát tín hiệu SOS thành công! Đội cứu hộ cơ động TT BTSC đã tiếp nhận điều phối.',
      alert,
      repairTicketCode: repair.code,
    };
    */
  }

  async getMyKpi(driverId: number, monthYear?: string) {
    const now = new Date();
    const targetMonth = monthYear || `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const kpi = await this.prisma.driverKpi.findUnique({
      where: {
        driverId_monthYear: {
          driverId,
          monthYear: targetMonth,
        },
      },
      include: {
        driver: { select: { id: true, fullName: true, unit: true } },
      },
    });

    if (!kpi) {
      return null;
    }

    return kpi;
  }

  async syncPull(driverId: number, since?: string) {
    const changedAfter = since && !Number.isNaN(new Date(since).getTime()) ? new Date(since) : undefined;
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        code: true,
        username: true,
        fullName: true,
        phone: true,
        unit: true,
        role: true,
        currentShiftStatus: true,
        assignedVehicleId: true,
        avatarUrl: true,
      },
    });

    const [dispatchOrders, transportOrders, feedTrips, vehicles] = await Promise.all([
      this.prisma.dispatchOrder.findMany({
        where: {
          driverId,
          ...(changedAfter ? {
            OR: [
              { updatedAt: { gte: changedAfter } },
              { dailyReport: { is: { updatedAt: { gte: changedAfter } } } },
            ],
          } : {}),
        },
        include: {
          vehicle: true,
          requester: { select: { id: true, fullName: true, phone: true } },
          operationalWorkOrder: { include: { executionSegments: { where: { driverId }, include: { breaks: true, pauses: true }, orderBy: { startedAt: 'desc' } }, dailyProgress: { orderBy: { progressDate: 'desc' } } } },
          workTask: { include: { executionSegments: { where: { driverId }, include: { breaks: true, pauses: true }, orderBy: { startedAt: 'desc' } }, dailyProgress: { orderBy: { progressDate: 'desc' } } } },
          dailyReport: { include: { submittedBy: { select: { id: true, fullName: true } } } },
        },
        orderBy: { departureTime: 'asc' },
      }),
      this.prisma.transportOrder.findMany({
        where: {
          driverId,
          ...(since ? { updatedAt: { gte: new Date(since) } } : {}),
        },
        include: {
          vehicle: true,
        },
        orderBy: { departureTime: 'asc' },
      }),
      this.prisma.internalFeedTrip.findMany({
        where: {
          driverId,
        },
        include: {
          material: true,
          vehicle: true,
        },
        orderBy: { slaWindowStart: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        take: 30,
        select: {
          id: true,
          code: true,
          plate: true,
          name: true,
          status: true,
          category: true,
          odoKm: true,
          totalMachineHours: true,
          hoursSinceLastService: true,
          alertTier: true,
          currentLat: true,
          currentLng: true,
          currentLocationName: true,
          updatedAt: true,
        },
      }),
    ]);

    const kpi = await this.getMyKpi(driverId);
    const alerts = await this.getDriverAlerts(driverId);

    return {
      driver: driver
        ? {
            ...driver,
            klhName: 'KLH KOUN MOM',
          }
        : null,
      dispatchOrders: dispatchOrders.map((item) => ({ ...item, operationalWorkOrder: item.workTask ?? item.operationalWorkOrder })),
      transportOrders,
      feedTrips,
      vehicles,
      kpi,
      alerts,
      serverTime: new Date().toISOString(),
    };
  }

  async syncPush(driverId: number, dto: SyncPushDto) {
    const processed: Array<{ eventId: string; status: string; result?: any }> = [];
    const failed: Array<{ eventId: string; message: string }> = [];

    for (const event of dto.events || []) {
      try {
        let result: any = null;
        switch (event.eventType) {
          case 'ORDER_ACCEPTED':
            result = await this.acceptTask(driverId, {
              orderType: (event.orderType as any) || (event.payload?.orderType ?? 'DISPATCH'),
              orderId: Number(event.orderId || event.payload?.orderId),
            });
            break;
          case 'VEHICLE_RECEIVED':
            result = await this.recordVehicleReceived(driverId, event);
            break;
          case 'JOB_STARTED':
            result = await this.startTrip(driverId, {
              orderType: (event.orderType as any) || (event.payload?.orderType ?? 'DISPATCH'),
              orderId: Number(event.orderId || event.payload?.orderId),
              startOdoKm: Number(event.payload?.startOdoKm || 0),
            });
            break;
          case 'JOB_PAUSED':
            result = await this.pauseJob(driverId, event);
            break;
          case 'JOB_RESUMED':
            result = await this.resumeJob(driverId, event);
            break;
          case 'PROGRESS_UPDATED':
            result = await this.updateProgress(driverId, {
              orderId: Number(event.orderId || event.payload?.orderId),
              orderType: event.orderType || event.payload?.orderType,
              progress: Number(event.payload?.progress || 0),
              note: event.note || event.payload?.note,
            });
            break;
          case 'INCIDENT_REPORTED':
            result = await this.reportIncident(driverId, {
              assetType: event.payload?.assetType || (event.payload?.implementId ? IncidentAssetType.IMPLEMENT : IncidentAssetType.VEHICLE),
              assetId: Number(event.payload?.assetId || event.payload?.implementId || event.payload?.vehicleId),
              description: event.payload?.description || event.note || 'Báº£o cÃ¡o sá»± cá»‘ hiá»‡n trÆ°á»ng',
              photoUrl: event.payload?.photoUrl,
              location: event.payload?.location,
              orderType: event.orderType || event.payload?.orderType,
              orderId: Number(event.orderId || event.payload?.orderId) || undefined,
            });
            break;
          case 'SCHEDULE_CHANGE_REQUESTED':
            result = await this.requestScheduleChange(driverId, event.payload || { reason: event.note });
            break;
          case 'TRANSFER_REQUESTED':
            result = await this.requestTransfer(driverId, event.payload || { reason: event.note });
            break;
          case 'ACCEPTANCE_SUBMITTED':
            result = await this.submitAcceptance(driverId, event);
            break;
          case 'JOB_COMPLETED':
          case 'WORK_SESSION_ENDED':
          case 'BREAK_STARTED':
          case 'BREAK_ENDED':
          case 'WORK_PAUSED':
          case 'WORK_RESUMED':
          case 'ORDER_COMPLETION_REQUESTED':
            throw new BadRequestException('Lệnh legacy chưa có OperationalWorkOrder nên không thể ghi phiên làm việc an toàn. Vui lòng chuyển đổi lệnh trước khi thao tác.');
          case 'SOS_CREATED':
            result = await this.createSosAlert(driverId, {
              vehicleId: Number(event.payload?.vehicleId || 1),
              lat: Number(event.payload?.latitude || 13.5),
              lng: Number(event.payload?.longitude || 107.0),
              lotLocation: event.payload?.lotLocation || 'Vị trí hiện trường ứng dụng',
              emergencyType: (event.payload?.emergencyType as SosEmergencyType) || SosEmergencyType.HONG_MAY,
              description: event.payload?.description || event.note || 'Tài xế bấm nút SOS khẩn cấp',
              photoUrl: event.payload?.photoUrl,
            });
            break;
          case 'PHOTO_ADDED':
            result = { message: 'Đã lưu ảnh bằng chứng hiện trường', url: event.payload?.photoUrl };
            break;
          default:
            result = { message: 'Đã nhận sự kiện', eventType: event.eventType };
        }
        processed.push({ eventId: event.eventId, status: 'SYNCED', result });
      } catch (err: any) {
        failed.push({ eventId: event.eventId, message: err?.message || 'Lỗi xử lý sự kiện' });
      }
    }

    return { processed, failed, syncedAt: new Date().toISOString() };
  }

  async uploadAttachment(driverId: number, file: Express.Multer.File, body?: any) {
    if (!file) throw new BadRequestException('Không tìm thấy tệp ảnh tải lên.');
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file.originalname).toLowerCase())
      ? extname(file.originalname).toLowerCase()
      : '.jpg';
    const filename = `evidence-${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`;
    const directory = join(process.cwd(), 'uploads', 'mobile-evidence');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), file.buffer);

    return {
      url: `/uploads/mobile-evidence/${filename}`,
      fileKey: filename,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  }

  async recordVehicleReceived(driverId: number, event: any) {
    const orderId = Number(event.orderId || event.payload?.orderId);
    if (event.orderType === 'DISPATCH' && orderId) {
      await this.prisma.dispatchOrder.update({
        where: { id: orderId },
        data: { status: DispatchStatus.DRIVER_ACCEPTED },
      });
      await this.prisma.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.DISPATCH_ORDER,
          entityId: orderId,
          actorId: driverId,
          action: 'VEHICLE_RECEIVED',
        },
      });
    }
    return { message: 'Đã xác nhận nhận phương tiện thành công.' };
  }

  async pauseJob(driverId: number, event: any) {
    const orderId = Number(event.orderId || event.payload?.orderId);
    if (event.orderType === 'DISPATCH' && orderId) {
      await this.prisma.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.DISPATCH_ORDER,
          entityId: orderId,
          actorId: driverId,
          action: 'DRIVER_PAUSE',
          newValue: { note: event.note || 'Tạm dừng công việc' },
        },
      });
    }
    return { message: 'Đã tạm dừng công việc.' };
  }

  async resumeJob(driverId: number, event: any) {
    const orderId = Number(event.orderId || event.payload?.orderId);
    if (event.orderType === 'DISPATCH' && orderId) {
      await this.prisma.dispatchOrder.update({
        where: { id: orderId },
        data: { status: DispatchStatus.WORKING },
      });
    }
    return { message: 'Đã tiếp tục công việc.' };
  }

  async updateProgress(driverId: number, dto: UpdateProgressDto) {
    if (dto.orderId && dto.orderType === 'DISPATCH') {
      const order = await this.prisma.dispatchOrder.findUnique({ where: { id: dto.orderId } });
      if (order) {
        const updateText = `[Tiến độ: ${dto.progress}${dto.unit || ' ha'}]: ${dto.note || 'Cập nhật từ mobile'}`;
        await this.prisma.dispatchOrder.update({
          where: { id: dto.orderId },
          data: {
            notes: order.notes ? `${order.notes} | ${updateText}` : updateText,
          },
        });
      }
    }
    return { message: 'Đã cập nhật tiến độ công việc.', progress: dto.progress };
  }

  async reportIncident(driverId: number, dto: ReportIncidentDto) {
    if (!dto.assetId || !Number.isInteger(dto.assetId)) {
      throw new BadRequestException('Thiếu tài sản cần báo hỏng.');
    }
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: { assignedVehicleId: true, role: true, unit: true },
    });
    if (!driver) throw new NotFoundException(`Không tìm thấy tài xế #${driverId}.`);

    const activeDispatchStatuses = [
      DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED,
      DispatchStatus.AT_WORKSITE, DispatchStatus.WORKING, DispatchStatus.RETURNING_TO_DEPOT,
    ];
    const activeTransportStatuses = [
      TransportStatus.ASSIGNED, TransportStatus.DRIVER_ACCEPTED, TransportStatus.AT_PICKUP,
      TransportStatus.LOADING, TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT,
      TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING,
      TransportStatus.RETURNING_TO_DEPOT, TransportStatus.AT_DEPOT,
    ];

    let asset: { code: string; unit: any; complexCode?: string | null; currentVehicleId?: number | null };
    if (dto.assetType === IncidentAssetType.VEHICLE) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.assetId } });
      if (!vehicle) throw new NotFoundException(`Không tìm thấy xe #${dto.assetId}.`);
      asset = vehicle;
      const [dispatchOrder, transportOrder] = await this.prisma.$transaction([
        this.prisma.dispatchOrder.findFirst({ where: { driverId, vehicleId: dto.assetId, status: { in: activeDispatchStatuses } }, select: { id: true } }),
        this.prisma.transportOrder.findFirst({ where: { driverId, vehicleId: dto.assetId, status: { in: activeTransportStatuses } }, select: { id: true } }),
      ]);
      if (driver.assignedVehicleId !== dto.assetId && !dispatchOrder && !transportOrder) {
        throw new BadRequestException('Tài xế chỉ được báo hỏng xe đang được phân công.');
      }
    } else if (dto.assetType === IncidentAssetType.IMPLEMENT) {
      const implement = await this.prisma.agriculturalImplement.findUnique({ where: { id: dto.assetId } });
      if (!implement) throw new NotFoundException(`Không tìm thấy thiết bị phụ trợ #${dto.assetId}.`);
      asset = implement;
      const [dispatchOrder, transportOrder] = await this.prisma.$transaction([
        this.prisma.dispatchOrder.findFirst({ where: { driverId, implementId: dto.assetId, status: { in: activeDispatchStatuses } }, select: { id: true } }),
        this.prisma.transportOrder.findFirst({ where: { driverId, trailerId: dto.assetId, status: { in: activeTransportStatuses } }, select: { id: true } }),
      ]);
      const attachedToAssignedVehicle = Boolean(implement.currentVehicleId && implement.currentVehicleId === driver.assignedVehicleId);
      if (!dispatchOrder && !transportOrder && !attachedToAssignedVehicle) {
        throw new BadRequestException('Tài xế chỉ được báo hỏng thiết bị đang gắn với xe hoặc được phân công trong công việc của mình.');
      }
    } else {
      throw new BadRequestException('Loại tài sản báo hỏng không hợp lệ.');
    }

    const request = await this.workshop.create({
      type: WorkshopRequestType.REPAIR,
      source: WorkshopRequestSource.ASSET_PROFILE,
      vehicleId: dto.assetType === IncidentAssetType.VEHICLE ? dto.assetId : undefined,
      implementId: dto.assetType === IncidentAssetType.IMPLEMENT ? dto.assetId : undefined,
      reportedById: driverId,
      repairTier: RepairTier.TIEU_TU,
      issueDescription: `[Sự cố mobile]: ${dto.description}`,
      incidentLocation: dto.location,
      photoUrlsJson: dto.photoUrl ? [dto.photoUrl] : undefined,
    }, { id: driverId, role: driver.role, unit: driver.unit });
    return { message: 'Đã ghi nhận sự cố và gửi cảnh báo tới Xưởng BTSC.', code: request.code, repairId: request.id, workshopRequestId: request.id };
    /* Legacy write path retained during compatibility window.
    const code = `SC-MB-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const isImplement = dto.assetType === IncidentAssetType.IMPLEMENT;
    const repair = await this.prisma.$transaction(async (tx) => {
      const created = await tx.repairTicket.create({
        data: {
          code,
          vehicleId: isImplement ? undefined : dto.assetId,
          implementId: isImplement ? dto.assetId : undefined,
          reportedByDriverId: driverId,
          repairTier: RepairTier.TIEU_TU,
          issueDescription: `[Sự cố mobile]: ${dto.description}`,
          incidentPhotoUrl: dto.photoUrl,
          incidentLocation: dto.location,
          status: RepairStatus.RECEIVED,
          startedAt: new Date(),
        },
      });
      if (isImplement) {
        await tx.agriculturalImplement.update({
          where: { id: dto.assetId },
          data: { technicalCondition: TechnicalCondition.NEED_REPAIR, status: ImplementStatus.MAINTENANCE },
        });
      } else {
        await tx.vehicle.update({ where: { id: dto.assetId }, data: { status: VehicleStatus.SUA_CHUA } });
      }
      await this.alerts.emit({
        ruleCode: 'EQUIPMENT_BREAKDOWN',
        dedupeKey: `${isImplement ? 'EQUIPMENT' : 'VEHICLE'}:REPAIR:${created.id}`,
        sourceType: 'RepairTicket',
        sourceId: String(created.id),
        category: isImplement ? AlertCategory.EQUIPMENT : AlertCategory.MAINTENANCE,
        alertType: isImplement ? 'IMPLEMENT_BREAKDOWN' : 'VEHICLE_BREAKDOWN',
        severity: AlertSeverity.WARNING,
        title: `${isImplement ? 'Thiết bị' : 'Xe'} ${asset.code} báo hỏng`,
        message: dto.description,
        location: dto.location,
        targetUrl: `/xuong-btsc/phieu-sua-chua?repairId=${created.id}`,
        vehicleId: isImplement ? undefined : dto.assetId,
        implementId: isImplement ? dto.assetId : undefined,
        driverId,
        unit: asset.unit,
        complexCode: asset.complexCode || undefined,
        metadataJson: { photoUrl: dto.photoUrl || null, orderType: dto.orderType || null, orderId: dto.orderId || null },
      }, tx);
      return created;
    });
    return { message: 'Đã ghi nhận sự cố và gửi cảnh báo tới Xưởng bảo dưỡng.', code, repairId: repair.id };
  }

    */
  }

  private async reportIncidentLegacy(driverId: number, event: any) {
    const desc = event.payload?.description || event.note || 'Báo cáo sự cố hiện trường';
    const vehicleId = Number(event.payload?.vehicleId);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) throw new BadRequestException('Thiếu vehicleId hợp lệ.');
    const code = `SC-${Date.now().toString().slice(-4)}`;
    await this.prisma.repairTicket.create({
      data: {
        code,
        vehicleId,
        reportedByDriverId: driverId,
        repairTier: RepairTier.TIEU_TU,
        issueDescription: `[Sự cố mobile]: ${desc}`,
        status: RepairStatus.RECEIVED,
      },
    });
    return { message: 'Đã ghi nhận sự cố và gửi thông báo tới Xưởng bảo dưỡng.', code };
  }

  async requestScheduleChange(driverId: number, dto: ScheduleChangeDto) {
    if (dto.orderId) {
      await this.prisma.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.DISPATCH_ORDER,
          entityId: dto.orderId,
          actorId: driverId,
          action: 'SCHEDULE_CHANGE_REQUEST',
          newValue: { proposedStart: dto.proposedStart, proposedEnd: dto.proposedEnd, reason: dto.reason },
        },
      });
    }
    return { message: 'Đã gửi yêu cầu điều chỉnh lịch tới Điều độ viên.', ...dto };
  }

  async requestTransfer(driverId: number, dto: TransferRequestDto) {
    if (dto.orderId) {
      await this.prisma.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.DISPATCH_ORDER,
          entityId: dto.orderId,
          actorId: driverId,
          action: 'TRANSFER_REQUEST',
          newValue: { reason: dto.reason, targetDriverOrTeam: dto.targetDriverOrTeam },
        },
      });
    }
    return { message: 'Đã gửi yêu cầu chuyển giao nhiệm vụ.', ...dto };
  }

  async submitAcceptance(driverId: number, event: any) {
    const orderId = Number(event.orderId || event.payload?.orderId);
    if (orderId) {
      await this.prisma.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.DISPATCH_ORDER,
          entityId: orderId,
          actorId: driverId,
          action: 'ACCEPTANCE_SUBMISSION',
          newValue: { note: event.note || event.payload?.note },
        },
      });
    }
    return { message: 'Đã nộp hồ sơ nghiệm thu công việc thành công.' };
  }

  async getDriverAlerts(driverId: number) {
    const events = await this.prisma.alertEvent.findMany({
      where: {
        driverId,
        status: { not: AlertStatus.DISMISSED },
      },
      orderBy: { occurredAt: 'desc' },
      take: 20,
    });

    return events.map((e) => {
      let category: 'EMERGENCY' | 'OPERATION' | 'SYSTEM' = 'SYSTEM';
      if (e.category === AlertCategory.SOS) category = 'EMERGENCY';
      else if (
        e.category === AlertCategory.MAINTENANCE ||
        e.category === AlertCategory.DISPATCH ||
        e.category === AlertCategory.FUEL ||
        e.category === AlertCategory.EQUIPMENT
      ) {
        category = 'OPERATION';
      }

      let type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS' = 'INFO';
      if (e.severity === AlertSeverity.CRITICAL) type = 'CRITICAL';
      else if (e.severity === AlertSeverity.WARNING) type = 'WARNING';
      else if (e.severity === AlertSeverity.INFO) type = 'INFO';

      return {
        id: `evt-${e.id}`,
        type,
        title: e.title,
        message:
          e.message && e.message !== 'None'
            ? e.message
            : e.location
            ? `Vị trí: ${e.location}`
            : e.title,
        time: e.occurredAt.toISOString(),
        read: e.status === AlertStatus.RESOLVED,
        category,
      };
    });
  }
}
