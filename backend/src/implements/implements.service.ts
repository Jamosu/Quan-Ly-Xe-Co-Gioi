import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ImplementStatus, TechnicalCondition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttachImplementDto } from './dto/attach-implement.dto';
import { CreateImplementDto } from './dto/create-implement.dto';
import { DetachImplementDto } from './dto/detach-implement.dto';
import { ImplementFilterDto } from './dto/implement-filter.dto';
import { UpdateImplementDto } from './dto/update-implement.dto';

@Injectable()
export class ImplementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateImplementDto) {
    const existing = await this.prisma.agriculturalImplement.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Nông cụ mã ${dto.code} đã tồn tại trong hệ thống.`);
    }

    return this.prisma.agriculturalImplement.create({
      data: {
        ...dto,
        unit: dto.unit || 'BAN_CO_GIOI',
      },
    });
  }

  async findAll(filter: ImplementFilterDto) {
    const { page = 1, limit = 20, search, category, unit, status, technicalCondition } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = category;
    if (unit) where.unit = unit;
    if (status) where.status = status;
    if (technicalCondition) where.technicalCondition = technicalCondition;

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { standardPurpose: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.agriculturalImplement.count({ where }),
      this.prisma.agriculturalImplement.findMany({
        where,
        skip,
        take: limit,
        include: {
          currentVehicle: {
            select: {
              id: true,
              code: true,
              plate: true,
              name: true,
              status: true,
              assignedUnitCode: true,
              manufacturer: true,
              modelName: true,
              vehicleSubtype: true,
            },
          },
        },
        orderBy: { id: 'asc' },
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
    const implement = await this.prisma.agriculturalImplement.findUnique({
      where: { id },
      include: {
        currentVehicle: true,
        attachmentLogs: {
          take: 10,
          orderBy: { attachedAt: 'desc' },
          include: {
            vehicle: { select: { id: true, code: true, plate: true, name: true } },
            actor: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!implement) {
      throw new NotFoundException(`Không tìm thấy nông cụ #${id}`);
    }

    return implement;
  }

  async update(id: number, dto: UpdateImplementDto) {
    await this.findOne(id);
    return this.prisma.agriculturalImplement.update({
      where: { id },
      data: dto,
    });
  }

  async attachToVehicle(id: number, dto: AttachImplementDto, actorId: number) {
    const implement = await this.findOne(id);

    if (implement.status === ImplementStatus.ATTACHED) {
      throw new BadRequestException(
        `Nông cụ ${implement.code} hiện đang được gắn vào xe #${implement.currentVehicleId}. Hãy tháo ra trước.`,
      );
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Không tìm thấy xe #${dto.vehicleId}`);
    }

    const now = new Date();

    const [updatedImplement, log] = await this.prisma.$transaction([
      this.prisma.agriculturalImplement.update({
        where: { id },
        data: {
          status: ImplementStatus.ATTACHED,
          currentVehicleId: vehicle.id,
          attachedAt: now,
        },
      }),
      this.prisma.implementAttachmentLog.create({
        data: {
          implementId: id,
          vehicleId: vehicle.id,
          actorId,
          attachedAt: now,
          startWearMm: dto.startWearMm || 0,
          notes: dto.notes,
        },
      }),
    ]);

    return {
      message: `Đã gắn thành công ${implement.name} vào xe ${vehicle.code} (${vehicle.plate})`,
      implement: updatedImplement,
      log,
    };
  }

  async detachFromVehicle(id: number, dto: DetachImplementDto, actorId: number) {
    const implement = await this.findOne(id);

    if (implement.status !== ImplementStatus.ATTACHED || !implement.currentVehicleId) {
      throw new BadRequestException(`Nông cụ ${implement.code} hiện không ở trạng thái đang gắn.`);
    }

    const vehicleId = implement.currentVehicleId;
    const now = new Date();

    // Tìm log gắn mới nhất chưa tháo
    const activeLog = await this.prisma.implementAttachmentLog.findFirst({
      where: {
        implementId: id,
        vehicleId,
        detachedAt: null,
      },
      orderBy: { attachedAt: 'desc' },
    });

    let newTechnicalCondition = implement.technicalCondition;
    if (dto.endWearMm && dto.endWearMm >= 15) {
      newTechnicalCondition = TechnicalCondition.NEED_REPAIR;
    } else if (dto.endWearMm && dto.endWearMm >= 8) {
      newTechnicalCondition = TechnicalCondition.WORN_OUT;
    }

    const [updatedImplement] = await this.prisma.$transaction([
      this.prisma.agriculturalImplement.update({
        where: { id },
        data: {
          status: ImplementStatus.IN_DEPOT,
          currentVehicleId: null,
          technicalCondition: newTechnicalCondition,
        },
      }),
      ...(activeLog
        ? [
            this.prisma.implementAttachmentLog.update({
              where: { id: activeLog.id },
              data: {
                detachedAt: now,
                endWearMm: dto.endWearMm,
                notes: dto.notes ? `${activeLog.notes || ''} | Tháo: ${dto.notes}` : activeLog.notes,
              },
            }),
          ]
        : []),
    ]);

    return {
      message: `Đã tháo ${implement.name} về kho nông cụ an toàn.`,
      implement: updatedImplement,
    };
  }

  async getStatistics() {
    const [total, attached, inDepot, maintenance, good, wornOut, needRepair] =
      await Promise.all([
        this.prisma.agriculturalImplement.count(),
        this.prisma.agriculturalImplement.count({
          where: { status: ImplementStatus.ATTACHED },
        }),
        this.prisma.agriculturalImplement.count({
          where: { status: ImplementStatus.IN_DEPOT },
        }),
        this.prisma.agriculturalImplement.count({
          where: { status: ImplementStatus.MAINTENANCE },
        }),
        this.prisma.agriculturalImplement.count({
          where: { technicalCondition: TechnicalCondition.GOOD },
        }),
        this.prisma.agriculturalImplement.count({
          where: { technicalCondition: TechnicalCondition.WORN_OUT },
        }),
        this.prisma.agriculturalImplement.count({
          where: { technicalCondition: TechnicalCondition.NEED_REPAIR },
        }),
      ]);

    return {
      totalImplements: total,
      attached,
      inDepot,
      maintenance,
      condition: {
        good,
        wornOut,
        needRepair,
      },
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.agriculturalImplement.delete({ where: { id } });
  }
}
