import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DriverShiftStatus, Role, SlaStatus, WorkAssignmentMode, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import { OperationalActor, assertOperationalAccess } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteFeedTripDto } from './dto/complete-feed-trip.dto';
import { CreateFeedMaterialDto } from './dto/create-feed-material.dto';
import { CreateFeedTripDto } from './dto/create-feed-trip.dto';
import { FeedFilterDto } from './dto/feed-filter.dto';

@Injectable()
export class InternalFeedService {
  constructor(private prisma: PrismaService, private readonly availability: AvailabilityService) {}

  // Quản lý nguyên liệu thức ăn & phụ phẩm
  async createMaterial(dto: CreateFeedMaterialDto, creatorId?: number) {
    const existing = await this.prisma.feedRawMaterial.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Nguyên liệu '${dto.name}' đã có trong danh mục.`);
    }

    return this.prisma.feedRawMaterial.create({
      data: {
        ...dto,
        isCustomAdded: true,
        createdById: creatorId,
      },
    });
  }

  async findAllMaterials() {
    return this.prisma.feedRawMaterial.findMany({
      include: {
        _count: {
          select: { feedTrips: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  // Quản lý chuyến vận chuyển thức ăn & SLA 3 Đúng
  async createTrip(dto: CreateFeedTripDto, actor: OperationalActor) {
    const existing = await this.prisma.internalFeedTrip.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Chuyến thức ăn mã ${dto.code} đã tồn tại.`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM vehicles WHERE id = ${dto.vehicleId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${dto.driverId} FOR UPDATE`;
      const [vehicle, driver] = await Promise.all([tx.vehicle.findUnique({ where: { id: dto.vehicleId } }), tx.user.findUnique({ where: { id: dto.driverId } })]);
      if (!vehicle) throw new NotFoundException(`Không tìm thấy xe #${dto.vehicleId}.`);
      if (!driver || driver.role !== Role.DRIVER) throw new NotFoundException(`Không tìm thấy tài xế #${dto.driverId}.`);
      assertOperationalAccess(actor, vehicle.unit);
      await this.availability.assertResourcesAvailable({ startAt: dto.slaWindowStart, endAt: dto.slaWindowEnd, unit: vehicle.unit, vehicleId: dto.vehicleId, driverId: dto.driverId }, actor);
      await tx.driverProfile.upsert({ where: { userId: driver.id }, update: {}, create: { userId: driver.id, employmentStatus: driver.employmentStatus, joinedDate: driver.joinedDate, resignedDate: driver.resignedDate, resignedReason: driver.resignedReason, licenseClass: driver.licenseClass, licenseNumber: driver.licenseNumber, licenseExpiryDate: driver.licenseExpiryDate, healthCheckExpiryDate: driver.healthCheckExpiryDate, currentShiftStatus: driver.currentShiftStatus ?? DriverShiftStatus.SAN_SANG, currentLocation: driver.currentLocation } });
      const trip = await tx.internalFeedTrip.create({ data: { ...dto }, include: { material: true, vehicle: { select: { id: true, code: true, plate: true, name: true } }, driver: { select: { id: true, fullName: true, phone: true } } } });
      const workOrder = await tx.operationalWorkOrder.create({ data: { type: WorkOrderType.INTERNAL_FEED, unit: vehicle.unit, assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT, status: WorkOrderStatus.ASSIGNED, plannedStartAt: dto.slaWindowStart, plannedEndAt: dto.slaWindowEnd, internalFeedTripId: trip.id, createdById: actor.id } });
      await tx.workVehicleAssignment.create({ data: { workOrderId: workOrder.id, vehicleId: dto.vehicleId, startAt: dto.slaWindowStart, endAt: dto.slaWindowEnd, assignedById: actor.id } });
      await tx.workDriverAssignment.create({ data: { workOrderId: workOrder.id, driverId: dto.driverId, startAt: dto.slaWindowStart, endAt: dto.slaWindowEnd, assignedById: actor.id } });
      return trip;
    });
  }

  async findAllTrips(filter: FeedFilterDto) {
    const { page = 1, limit = 20, search, groupType, slaStatus, isSettled } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (groupType) where.material = { groupType };
    if (slaStatus) where.slaStatus = slaStatus;
    if (isSettled !== undefined) where.isSettled = isSettled;

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { sourceLocation: { contains: search } },
        { destinationLocation: { contains: search } },
        { material: { name: { contains: search } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.internalFeedTrip.count({ where }),
      this.prisma.internalFeedTrip.findMany({
        where,
        skip,
        take: limit,
        include: {
          material: true,
          vehicle: { select: { id: true, code: true, plate: true, name: true } },
          driver: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneTrip(id: number) {
    const trip = await this.prisma.internalFeedTrip.findUnique({
      where: { id },
      include: {
        material: true,
        vehicle: true,
        driver: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Không tìm thấy chuyến thức ăn #${id}`);
    }

    return trip;
  }

  async completeTrip(id: number, dto: CompleteFeedTripDto) {
    const trip = await this.findOneTrip(id);

    const completedAt = dto.completedFeedTime || new Date();
    const diff = dto.receiveWeightTons - trip.dispatchWeightTons;
    const weightDiffPercent = Number(((diff / trip.dispatchWeightTons) * 100).toFixed(2));

    // Kiểm tra SLA 3 Đúng: Đúng thời gian (completedAt <= slaWindowEnd)
    const isLate = completedAt.getTime() > new Date(trip.slaWindowEnd).getTime();
    const slaStatus = isLate ? SlaStatus.DELAYED : SlaStatus.ON_TIME;

    return this.prisma.internalFeedTrip.update({
      where: { id },
      data: {
        receiveWeightTons: dto.receiveWeightTons,
        weightDiffPercent,
        completedFeedTime: completedAt,
        slaStatus,
        delayReason: dto.delayReason,
        receiverSignature: dto.receiverSignature,
      },
      include: {
        material: true,
        vehicle: { select: { id: true, code: true, plate: true } },
        driver: { select: { id: true, fullName: true } },
      },
    });
  }

  async settleTrips(tripIds: number[]) {
    await this.prisma.internalFeedTrip.updateMany({
      where: { id: { in: tripIds } },
      data: { isSettled: true },
    });

    return { message: `Đã quyết toán thành công ${tripIds.length} chuyến thức ăn TMR.` };
  }

  async getStatistics() {
    const [total, onTime, delayed, sumStats] = await Promise.all([
      this.prisma.internalFeedTrip.count(),
      this.prisma.internalFeedTrip.count({ where: { slaStatus: SlaStatus.ON_TIME } }),
      this.prisma.internalFeedTrip.count({ where: { slaStatus: SlaStatus.DELAYED } }),
      this.prisma.internalFeedTrip.aggregate({
        _sum: {
          dispatchWeightTons: true,
          receiveWeightTons: true,
        },
      }),
    ]);

    const onTimeRate = total > 0 ? ((onTime / total) * 100).toFixed(1) : '100';

    return {
      totalTrips: total,
      onTimeTrips: onTime,
      delayedTrips: delayed,
      slaComplianceRate: `${onTimeRate}%`,
      totalDispatchTons: sumStats._sum.dispatchWeightTons || 0,
      totalReceiveTons: sumStats._sum.receiveWeightTons || 0,
    };
  }
}
