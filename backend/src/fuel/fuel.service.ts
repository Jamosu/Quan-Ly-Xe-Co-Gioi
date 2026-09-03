import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { DispenseFuelDto } from './dto/dispense-fuel.dto';
import { FuelFilterDto } from './dto/fuel-filter.dto';

@Injectable()
export class FuelService {
  constructor(private prisma: PrismaService) {}

  async createWarehouse(dto: CreateWarehouseDto) {
    return this.prisma.fuelWarehouse.create({
      data: dto,
    });
  }

  async findAllWarehouses() {
    return this.prisma.fuelWarehouse.findMany({
      include: {
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async dispenseFuel(dto: DispenseFuelDto, operatorId: number) {
    const existing = await this.prisma.fuelDispenseTicket.findUnique({
      where: { ticketCode: dto.ticketCode },
    });

    if (existing) {
      throw new ConflictException(`Phiếu cấp dầu ${dto.ticketCode} đã tồn tại.`);
    }

    const warehouse = await this.prisma.fuelWarehouse.findUnique({
      where: { id: dto.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho dầu #${dto.warehouseId}`);
    }

    if (warehouse.currentStockLiters < dto.dispensedLiters) {
      throw new BadRequestException(
        `Lượng dầu tồn kho (${warehouse.currentStockLiters}L) không đủ để cấp ${dto.dispensedLiters}L.`,
      );
    }

    const varianceLiters = dto.dispensedLiters - dto.quotaLiters;
    const variancePercent = Number(((varianceLiters / dto.quotaLiters) * 100).toFixed(2));
    const isExcess = variancePercent > 5.0; // Vượt quá 5% so với định mức

    const [ticket] = await this.prisma.$transaction([
      this.prisma.fuelDispenseTicket.create({
        data: {
          ticketCode: dto.ticketCode,
          warehouseId: dto.warehouseId,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          operatorId,
          dispensedLiters: dto.dispensedLiters,
          engineOdoHours: dto.engineOdoHours,
          quotaLiters: dto.quotaLiters,
          varianceLiters,
          variancePercent,
          isExcess,
          qrCodePayload: dto.qrCodePayload,
        },
        include: {
          warehouse: true,
          vehicle: { select: { id: true, code: true, plate: true, name: true } },
          driver: { select: { id: true, fullName: true, phone: true } },
          operator: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.fuelWarehouse.update({
        where: { id: dto.warehouseId },
        data: {
          currentStockLiters: warehouse.currentStockLiters - dto.dispensedLiters,
        },
      }),
    ]);

    return ticket;
  }

  async findAllTickets(filter: FuelFilterDto) {
    const { page = 1, limit = 20, search, warehouseId, vehicleId, isExcess } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (isExcess !== undefined) where.isExcess = isExcess;

    if (search) {
      where.OR = [
        { ticketCode: { contains: search } },
        { vehicle: { plate: { contains: search } } },
        { vehicle: { code: { contains: search } } },
        { driver: { fullName: { contains: search } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.fuelDispenseTicket.count({ where }),
      this.prisma.fuelDispenseTicket.findMany({
        where,
        skip,
        take: limit,
        include: {
          warehouse: true,
          vehicle: { select: { id: true, code: true, plate: true, name: true } },
          driver: { select: { id: true, fullName: true, phone: true } },
          operator: { select: { id: true, fullName: true } },
        },
        orderBy: { dispensedAt: 'desc' },
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

  async getVarianceReport() {
    const [totalTickets, excessTickets, sumStats, warehouses] = await Promise.all([
      this.prisma.fuelDispenseTicket.count(),
      this.prisma.fuelDispenseTicket.count({ where: { isExcess: true } }),
      this.prisma.fuelDispenseTicket.aggregate({
        _sum: {
          dispensedLiters: true,
          quotaLiters: true,
          varianceLiters: true,
        },
      }),
      this.prisma.fuelWarehouse.findMany(),
    ]);

    const totalStock = warehouses.reduce((acc, w) => acc + w.currentStockLiters, 0);
    const totalCapacity = warehouses.reduce((acc, w) => acc + w.capacityLiters, 0);

    return {
      totalTickets,
      excessTicketsCount: excessTickets,
      totalDispensedLiters: sumStats._sum.dispensedLiters || 0,
      totalQuotaLiters: sumStats._sum.quotaLiters || 0,
      netVarianceLiters: sumStats._sum.varianceLiters || 0,
      totalCurrentStockLiters: totalStock,
      totalCapacityLiters: totalCapacity,
      stockFillPercentage: `${((totalStock / totalCapacity) * 100).toFixed(1)}%`,
    };
  }
}
