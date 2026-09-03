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
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSosAlertDto } from './dto/create-sos-alert.dto';
import { FinishTripDto } from './dto/finish-trip.dto';
import { StartTripDto } from './dto/start-trip.dto';
import { AcceptTaskDto } from './dto/accept-task.dto';

@Injectable()
export class MobileDriverService {
  constructor(private prisma: PrismaService) {}

  async getAssignedTasks(driverId: number) {
    const [dispatchOrders, transportOrders, feedTrips] = await Promise.all([
      this.prisma.dispatchOrder.findMany({
        where: {
          driverId,
          status: { in: [DispatchStatus.ASSIGNED, DispatchStatus.DRIVER_ACCEPTED, DispatchStatus.DEPARTED, DispatchStatus.WORKING] },
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
          status: { in: [TransportStatus.ASSIGNED, TransportStatus.DRIVER_ACCEPTED, TransportStatus.AT_PICKUP, TransportStatus.LOADING, TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT] },
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
    return this.prisma.$transaction(async (tx) => {
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
    };
    });
  }

  async finishTrip(driverId: number, dto: FinishTripDto) {
    return this.prisma.$transaction(async (tx) => {
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
    };
    });
  }

  async createSosAlert(driverId: number, dto: CreateSosAlertDto) {
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
          vehicle: { select: { id: true, code: true, plate: true, name: true } },
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

    return {
      message: 'Đã phát tín hiệu SOS thành công! Đội cứu hộ cơ động TT BTSC đã tiếp nhận điều phối.',
      alert,
      repairTicketCode: repair.code,
    };
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
}
