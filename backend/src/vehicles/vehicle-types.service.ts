import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVehicleTypeDto,
  UpdateVehicleTypeDto,
  VehicleTypeFilterDto,
} from './dto/vehicle-type.dto';

@Injectable()
export class VehicleTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  }

  async findAll(filter: VehicleTypeFilterDto = {}) {
    const where: Prisma.VehicleTypeWhereInput = {};
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search } },
        { name: { contains: filter.search } },
        { description: { contains: filter.search } },
      ];
    }
    if (filter.active !== undefined) where.active = filter.active;
    if (filter.parentId !== undefined) where.parentId = filter.parentId;

    const [types, vehicleDetails] = await Promise.all([
      this.prisma.vehicleType.findMany({
        where,
        include: {
          parent: { select: { id: true, code: true, name: true } },
          _count: { select: { vehicles: true, children: true } },
        },
        orderBy: [{ assetGroup: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.vehicle.findMany({
        where: { vehicleTypeId: { not: null } },
        select: {
          vehicleTypeId: true,
          manufacturer: true,
          modelName: true,
          origin: true,
          assignedUnitCode: true,
          powerHp: true,
        },
      }),
    ]);

    const details = new Map<number, {
      manufacturers: Set<string>;
      models: Set<string>;
      origins: Set<string>;
      assignedUnits: Set<string>;
      powerRatings: Set<string>;
    }>();
    for (const vehicle of vehicleDetails) {
      if (!vehicle.vehicleTypeId) continue;
      const aggregate = details.get(vehicle.vehicleTypeId) || {
        manufacturers: new Set<string>(),
        models: new Set<string>(),
        origins: new Set<string>(),
        assignedUnits: new Set<string>(),
        powerRatings: new Set<string>(),
      };
      if (vehicle.manufacturer) aggregate.manufacturers.add(vehicle.manufacturer);
      if (vehicle.modelName) aggregate.models.add(vehicle.modelName);
      if (vehicle.origin) aggregate.origins.add(vehicle.origin);
      if (vehicle.assignedUnitCode) aggregate.assignedUnits.add(vehicle.assignedUnitCode);
      if (vehicle.powerHp) aggregate.powerRatings.add(vehicle.powerHp);
      details.set(vehicle.vehicleTypeId, aggregate);
    }

    return types.map(({ _count, ...type }) => {
      const aggregate = details.get(type.id);
      return {
        ...type,
        vehicleCount: _count.vehicles,
        childCount: _count.children,
        manufacturers: [...(aggregate?.manufacturers || [])].sort((a, b) => a.localeCompare(b, 'vi')),
        models: [...(aggregate?.models || [])].sort((a, b) => a.localeCompare(b, 'vi')),
        origins: [...(aggregate?.origins || [])].sort((a, b) => a.localeCompare(b, 'vi')),
        assignedUnits: [...(aggregate?.assignedUnits || [])].sort((a, b) => a.localeCompare(b, 'vi')),
        powerRatings: [...(aggregate?.powerRatings || [])].sort((a, b) => a.localeCompare(b, 'vi')),
      };
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.vehicleType.findUnique({
      where: { id },
      include: { _count: { select: { vehicles: true, children: true } } },
    });
    if (!item) throw new NotFoundException(`Không tìm thấy chủng loại xe #${id}`);
    return item;
  }

  async create(dto: CreateVehicleTypeDto) {
    const code = this.normalizeCode(dto.code);
    const existing = await this.prisma.vehicleType.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Mã chủng loại ${code} đã tồn tại.`);
    return this.prisma.vehicleType.create({
      data: { ...dto, code, active: dto.active ?? true },
    });
  }

  async update(id: number, dto: UpdateVehicleTypeDto) {
    await this.findOne(id);
    const code = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (code) {
      const existing = await this.prisma.vehicleType.findFirst({
        where: { code, id: { not: id } },
      });
      if (existing) throw new ConflictException(`Mã chủng loại ${code} đã tồn tại.`);
    }
    return this.prisma.vehicleType.update({
      where: { id },
      data: { ...dto, ...(code ? { code } : {}) },
    });
  }
}
