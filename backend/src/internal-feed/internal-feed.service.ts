import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SlaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteFeedTripDto } from './dto/complete-feed-trip.dto';
import { CreateFeedMaterialDto } from './dto/create-feed-material.dto';
import { CreateFeedTripDto } from './dto/create-feed-trip.dto';
import { FeedFilterDto } from './dto/feed-filter.dto';

@Injectable()
export class InternalFeedService {
  constructor(private prisma: PrismaService) {}

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
  async createTrip(dto: CreateFeedTripDto) {
    const existing = await this.prisma.internalFeedTrip.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Chuyến thức ăn mã ${dto.code} đã tồn tại.`);
    }

    return this.prisma.internalFeedTrip.create({
      data: {
        ...dto,
        departureTime: new Date(),
      },
      include: {
        material: true,
        vehicle: { select: { id: true, code: true, plate: true, name: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
      },
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
