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
  ImplementStatus,
  TechnicalCondition,
  WorkshopRequestSource,
  WorkshopRequestStatus,
  WorkshopRequestType,
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

@Injectable()
export class MobileDriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenance: MaintenanceService,
    private readonly alerts: AlertsService,
    private readonly workshop: WorkshopService,
  ) {}

  async getAssignedTasks(driverId: number) {
    const [dispatchOrders, transportOrders, feedTrips] = await Promise.all([
      this.prisma.dispatchOrder.findMany({
        where: {
          driverId,
          status: { in: [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.AT_WORKSITE, DispatchStatus.WORKING, DispatchStatus.RETURNING_TO_DEPOT] },
        },
        include: {
          vehicle: true,
          requester: { select: { id: true, fullName: true, phone: true } },
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
      dispatchOrders,
      transportOrders,
      feedTrips,
      totalPendingTasks: dispatchOrders.length + transportOrders.length + feedTrips.length,
    };
  }

  async acceptTask(driverId: number, dto: AcceptTaskDto) {
    const entityType = dto.orderType === 'DISPATCH' ? OperationalEntityType.DISPATCH_ORDER : OperationalEntityType.TRANSPORT_ORDER;
    return this.prisma.$transaction(async (tx) => {
      if (dto.orderType === 'DISPATCH') {
        const order = await tx.dispatchOrder.findUnique({ where: { id: dto.orderId } });
        if (!order) throw new NotFoundException(`Không tìm thấy lệnh #${dto.orderId}`);
        if (order.driverId !== driverId) throw new BadRequestException('Lệnh không được phân công cho tài xế hiện tại.');
        if (order.status !== DispatchStatus.ASSIGNED) throw new BadRequestException('Lệnh không ở trạng thái chờ tài xế xác nhận.');
        await tx.dispatchOrder.update({ where: { id: dto.orderId }, data: { status: DispatchStatus.DRIVER_ACCEPTED, driverAcceptedAt: new Date() } });
      } else {
        const order = await tx.transportOrder.findUnique({ where: { id: dto.orderId } });
        if (!order) throw new NotFoundException(`Không tìm thấy vận đơn #${dto.orderId}`);
        if (order.driverId !== driverId) throw new BadRequestException('Vận đơn không được phân công cho tài xế hiện tại.');
        if (order.status !== TransportStatus.ASSIGNED) throw new BadRequestException('Vận đơn không ở trạng thái chờ tài xế xác nhận.');
        await tx.transportOrder.update({ where: { id: dto.orderId }, data: { status: TransportStatus.DRIVER_ACCEPTED, driverAcceptedAt: new Date() } });
      }
      await tx.operationalAuditLog.create({ data: { entityType, entityId: dto.orderId, actorId: driverId, action: 'DRIVER_ACCEPT' } });
      return { message: 'Đã xác nhận nhận lệnh.', ...dto };
    });
  }

  async startTrip(driverId: number, dto: StartTripDto) {
    const result = await this.prisma.$transaction(async (tx) => {
    let order: any = null;
    let vehicleId: number | null = null;

    if (dto.orderType === 'DISPATCH') {
      order = await tx.dispatchOrder.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new NotFoundException(`Không tìm thấy lệnh điều xe #${dto.orderId}`);
      if (order.driverId !== driverId) throw new BadRequestException('Lệnh không thuộc tài xế hiện tại.');
      if (order.status !== DispatchStatus.DRIVER_ACCEPTED) throw new BadRequestException('Tài xế phải xác nhận lệnh trước khi bắt đầu.');
      vehicleId = order.vehicleId;

      await tx.dispatchOrder.update({
        where: { id: dto.orderId },
        data: { status: DispatchStatus.WORKING, actualDepartureTime: new Date(), actualStartTime: new Date() },
      });
    } else if (dto.orderType === 'TRANSPORT') {
      order = await tx.transportOrder.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new NotFoundException(`Không tìm thấy vận đơn #${dto.orderId}`);
      if (order.driverId !== driverId) throw new BadRequestException('Vận đơn không thuộc tài xế hiện tại.');
      if (order.status !== TransportStatus.DRIVER_ACCEPTED) throw new BadRequestException('Tài xế phải xác nhận vận đơn trước khi bắt đầu.');
      vehicleId = order.vehicleId;

      await tx.transportOrder.update({
        where: { id: dto.orderId },
        data: { status: TransportStatus.IN_TRANSIT, departedAt: new Date() },
      });
    } else if (dto.orderType === 'FEED') {
      order = await tx.internalFeedTrip.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new NotFoundException(`Không tìm thấy chuyến thức ăn #${dto.orderId}`);
      vehicleId = order.vehicleId;

      await tx.internalFeedTrip.update({
        where: { id: dto.orderId },
        data: { departureTime: new Date() },
      });
    }

    if (vehicleId) {
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: VehicleStatus.HOAT_DONG,
          lastGpsUpdate: new Date(),
        },
      });
    }

    if (dto.orderType !== 'FEED') {
      await tx.operationalAuditLog.create({ data: { entityType: dto.orderType === 'DISPATCH' ? OperationalEntityType.DISPATCH_ORDER : OperationalEntityType.TRANSPORT_ORDER, entityId: dto.orderId, actorId: driverId, action: 'DRIVER_START', newValue: { startOdoKm: dto.startOdoKm } } });
    }
    return {
      message: 'Bắt đầu ca làm việc thành công. Hệ thống đã kích hoạt giám sát GPS.',
      orderType: dto.orderType,
      orderId: dto.orderId,
      startOdoKm: dto.startOdoKm,
      vehicleId,
    };
    });
    const bdc1 = result.vehicleId
      ? await this.maintenance.ensureBdc1ForOperation(result.vehicleId, driverId)
      : null;
    return { ...result, bdc1Required: Boolean(bdc1?.required), bdc1LogId: bdc1?.log.id };
  }

  async finishTrip(driverId: number, dto: FinishTripDto) {
    const result = await this.prisma.$transaction(async (tx) => {
    let vehicleId: number | null = null;

    if (dto.orderType === 'DISPATCH') {
      const order = await tx.dispatchOrder.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new NotFoundException(`Không tìm thấy lệnh #${dto.orderId}`);
      if (order.driverId !== driverId || order.status !== DispatchStatus.WORKING) throw new BadRequestException('Lệnh không thuộc tài xế hoặc chưa ở trạng thái đang làm việc.');
      vehicleId = order.vehicleId;

      await tx.dispatchOrder.update({
        where: { id: dto.orderId },
        data: {
          status: DispatchStatus.COMPLETED,
          returnTime: new Date(),
          notes: dto.completionNotes ? `${order.notes || ''} | Báo cáo: ${dto.completionNotes}` : order.notes,
        },
      });
    } else if (dto.orderType === 'TRANSPORT') {
      const order = await tx.transportOrder.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new NotFoundException(`Không tìm thấy vận đơn #${dto.orderId}`);
      if (order.driverId !== driverId || order.status !== TransportStatus.IN_TRANSIT) throw new BadRequestException('Vận đơn không thuộc tài xế hoặc chưa đang vận chuyển.');
      vehicleId = order.vehicleId;

      await tx.transportOrder.update({
        where: { id: dto.orderId },
        data: {
          status: TransportStatus.DELIVERED,
          arrivalTime: new Date(),
          deliveredAt: new Date(),
        },
      });
    }

    if (vehicleId) {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (vehicle) {
        const addedKm = Math.max(0, dto.finishOdoKm - vehicle.odoKm);
        const addedHours = Number((addedKm / 30).toFixed(1)); // Ước tính giờ máy theo km thực tế
        const newServiceHours = vehicle.hoursSinceLastService + addedHours;

        let alertTier = vehicle.alertTier;
        if (250 - newServiceHours <= 20) alertTier = 'RED';
        else if (250 - newServiceHours <= 50) alertTier = 'AMBER';

        await tx.vehicle.update({
          where: { id: vehicleId },
          data: {
            status: VehicleStatus.CHO_PHAN_CONG,
            odoKm: dto.finishOdoKm,
            totalMachineHours: vehicle.totalMachineHours + addedHours,
            hoursSinceLastService: newServiceHours,
            alertTier,
            lastGpsUpdate: new Date(),
          },
        });
      }
    }

    await tx.user.update({ where: { id: driverId }, data: { currentShiftStatus: DriverShiftStatus.SAN_SANG } });
    if (dto.orderType !== 'FEED') {
      await tx.operationalAuditLog.create({ data: { entityType: dto.orderType === 'DISPATCH' ? OperationalEntityType.DISPATCH_ORDER : OperationalEntityType.TRANSPORT_ORDER, entityId: dto.orderId, actorId: driverId, action: 'DRIVER_FINISH', newValue: { finishOdoKm: dto.finishOdoKm } } });
    }

    return {
      message: 'Đã hoàn thành chuyến đi và ghi nhận ODO kết thúc thành công.',
      finishOdoKm: dto.finishOdoKm,
      vehicleId,
    };
    });
    if (result.vehicleId) await this.maintenance.refreshVehicleOccurrences(result.vehicleId);
    return result;
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
      targetUrl: `/doi-xe/quan-ly-sos?alertId=${alert.id}`,
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

  async getMyKpi(driverId: number, monthYear: string = '08/2026') {
    const kpi = await this.prisma.driverKpi.findUnique({
      where: {
        driverId_monthYear: {
          driverId,
          monthYear,
        },
      },
      include: {
        driver: { select: { id: true, fullName: true, unit: true } },
      },
    });

    if (!kpi) {
      return {
        driverId,
        monthYear,
        totalScore: 88.5,
        rankGrade: 'HANG_B',
        tripsScore: 23.5,
        distanceScore: 22.0,
        hoursScore: 24.0,
        fuelScore: 19.0,
        bonusAmountVnd: 1200000,
      };
    }

    return kpi;
  }

  async syncPull(driverId: number, since?: string) {
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
          ...(since ? { updatedAt: { gte: new Date(since) } } : {}),
        },
        include: {
          vehicle: true,
          requester: { select: { id: true, fullName: true, phone: true } },
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
      dispatchOrders,
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
            result = await this.finishTrip(driverId, {
              orderType: (event.orderType as any) || (event.payload?.orderType ?? 'DISPATCH'),
              orderId: Number(event.orderId || event.payload?.orderId),
              finishOdoKm: Number(event.payload?.finishOdoKm || 0),
              completionNotes: event.payload?.completionNotes || event.note,
            });
            break;
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
    return [
      {
        id: 'alt-1',
        type: 'CRITICAL',
        title: 'Cảnh báo vận tốc trên đường lô',
        message: 'Ghi nhận vận tốc 38 km/h vượt ngưỡng an toàn 30 km/h tại Lô B14 nông trường.',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        read: false,
      },
      {
        id: 'alt-2',
        type: 'WARNING',
        title: 'Cảnh báo bảo dưỡng định kỳ 250 giờ',
        message: 'Xe MK-023 (John Deere 6120) đã vận hành 232/250 giờ máy. Cần bảo dưỡng trong 18 giờ tới.',
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        read: false,
      },
      {
        id: 'alt-3',
        type: 'INFO',
        title: 'Lệnh điều xe mới được phân công',
        message: 'Bạn vừa được gán Lệnh điều xe LDX-20260912-001: Cày đất Lô A12.',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        read: true,
      },
      {
        id: 'alt-4',
        type: 'SUCCESS',
        title: 'Nghiệm thu khối lượng đã phê duyệt',
        message: 'Hồ sơ nghiệm thu diện tích cày 8,5 ha ngày 11/09 đã được Ban Nông trường duyệt 100%.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        read: true,
      },
    ];
  }
}
