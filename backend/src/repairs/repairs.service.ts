import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RepairStatus, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRepairDto } from './dto/create-repair.dto';
import { RepairFilterDto } from './dto/repair-filter.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';

@Injectable()
export class RepairsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRepairDto) {
    const existing = await this.prisma.repairTicket.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Phiếu sửa chữa ${dto.code} đã tồn tại.`);
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Không tìm thấy phương tiện #${dto.vehicleId}`);
    }

    if (dto.plannedEndAt && dto.plannedStartAt && dto.plannedEndAt <= dto.plannedStartAt) {
      throw new BadRequestException('Thời gian kết thúc sửa chữa phải sau thời gian bắt đầu.');
    }
    const startsNow = !dto.plannedStartAt || dto.plannedStartAt <= new Date();

    const [repair] = await this.prisma.$transaction([
      this.prisma.repairTicket.create({
        data: {
          code: dto.code,
          vehicleId: dto.vehicleId,
          reportedByDriverId: dto.reportedByDriverId,
          assignedTechnicianId: dto.assignedTechnicianId,
          repairTier: dto.repairTier,
          issueDescription: dto.issueDescription,
          estimatedCostVnd: dto.estimatedCostVnd || 0,
          replacedPartsJson: dto.replacedPartsJson,
          status: RepairStatus.RECEIVED,
          plannedStartAt: dto.plannedStartAt,
          plannedEndAt: dto.plannedEndAt,
          startedAt: startsNow ? new Date() : undefined,
        },
        include: {
          vehicle: true,
          reportedByDriver: { select: { id: true, fullName: true, phone: true } },
          assignedTechnician: { select: { id: true, fullName: true, phone: true } },
        },
      }),
      ...(startsNow
        ? [this.prisma.vehicle.update({
            where: { id: dto.vehicleId },
            data: { status: VehicleStatus.SUA_CHUA },
          })]
        : []),
    ]);

    return repair;
  }

  async findAll(filter: RepairFilterDto) {
    const { page = 1, limit = 20, search, vehicleId, repairTier, status, isGeneratedFromMaintenance } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (repairTier) where.repairTier = repairTier;
    if (status) where.status = status;
    if (isGeneratedFromMaintenance !== undefined) where.isGeneratedFromMaintenance = isGeneratedFromMaintenance;

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { issueDescription: { contains: search } },
        { vehicle: { plate: { contains: search } } },
        { vehicle: { code: { contains: search } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.repairTicket.count({ where }),
      this.prisma.repairTicket.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true } },
          reportedByDriver: { select: { id: true, fullName: true } },
          assignedTechnician: { select: { id: true, fullName: true } },
          maintenanceRecord: { select: { id: true, currentHours: true } },
        },
        orderBy: { receivedDate: 'desc' },
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

  async findOne(id: number) {
    const repair = await this.prisma.repairTicket.findUnique({
      where: { id },
      include: {
        vehicle: true,
        reportedByDriver: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
        assignedTechnician: { select: { id: true, fullName: true, phone: true } },
        maintenanceRecord: true,
      },
    });

    if (!repair) {
      throw new NotFoundException(`Không tìm thấy phiếu sửa chữa #${id}`);
    }

    return repair;
  }

  async update(id: number, dto: UpdateRepairDto) {
    const repair = await this.findOne(id);
    const isCompleted = dto.status === RepairStatus.COMPLETED;
    const now = new Date();
    const [activeExecution, maintenance, hold] = isCompleted ? await Promise.all([
      this.prisma.workExecutionSegment.findFirst({ where: { vehicleId: repair.vehicleId, endedAt: null } }),
      this.prisma.maintenanceRecord.findFirst({ where: { vehicleId: repair.vehicleId, cancelledAt: null, endedAt: null, status: { not: 'COMPLETED' } } }),
      this.prisma.vehicleUnavailability.findFirst({ where: { vehicleId: repair.vehicleId, cancelledAt: null, status: 'APPROVED', OR: [{ endAt: null }, { endAt: { gt: now } }] } }),
    ]) : [null, null, null];
    const releaseStatus = maintenance ? VehicleStatus.BAO_DUONG : activeExecution ? VehicleStatus.HOAT_DONG : hold ? VehicleStatus.TAM_DUNG : VehicleStatus.CHO_PHAN_CONG;

    const [updatedRepair] = await this.prisma.$transaction([
      this.prisma.repairTicket.update({
        where: { id },
        data: {
          ...dto,
          completedDate: isCompleted ? now : repair.completedDate,
          endedAt: isCompleted ? now : repair.endedAt,
          startedAt: dto.status === RepairStatus.IN_REPAIR && !repair.startedAt ? now : repair.startedAt,
        },
        include: {
          vehicle: true,
          assignedTechnician: { select: { id: true, fullName: true } },
        },
      }),
      ...(isCompleted
        ? [
            this.prisma.vehicle.update({
              where: { id: repair.vehicleId },
              data: { status: releaseStatus },
            }),
          ]
        : []),
    ]);

    return updatedRepair;
  }

  async getCostReport() {
    const [totalTickets, inRepair, waitingParts, completed, costStats] = await Promise.all([
      this.prisma.repairTicket.count(),
      this.prisma.repairTicket.count({ where: { status: RepairStatus.IN_REPAIR } }),
      this.prisma.repairTicket.count({ where: { status: RepairStatus.WAITING_PARTS } }),
      this.prisma.repairTicket.count({ where: { status: RepairStatus.COMPLETED } }),
      this.prisma.repairTicket.aggregate({
        _sum: {
          estimatedCostVnd: true,
          actualCostVnd: true,
        },
      }),
    ]);

    return {
      totalTickets,
      inRepair,
      waitingParts,
      completed,
      totalEstimatedCostVnd: costStats._sum.estimatedCostVnd || 0,
      totalActualCostVnd: costStats._sum.actualCostVnd || 0,
    };
  }

  async remove(id: number) {
    const repair = await this.findOne(id);
    if (repair.status === RepairStatus.COMPLETED) throw new ConflictException('Không thể hủy phiếu sửa chữa đã hoàn thành.');
    return this.prisma.repairTicket.update({ where: { id }, data: { cancelledAt: new Date(), cancellationReason: 'Hủy qua API tương thích DELETE' } });
  }
}
