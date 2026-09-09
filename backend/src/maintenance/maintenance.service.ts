import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceAlertTier,
  MaintenanceStatus,
  RepairStatus,
  RepairTier,
  VehicleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateOwedPartDto } from './dto/create-owed-part.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async createRecord(dto: CreateMaintenanceDto, technicianId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Không tìm thấy phương tiện #${dto.vehicleId}`);
    }

    const defaultChecklist = dto.checklistJson || {
      check1_engine_oil: false,
      check2_oil_filter: false,
      check3_fuel_filter: false,
      check4_air_cleaner: false,
      check5_hydraulic_oil: false,
      check6_transmission_oil: false,
      check7_cooling_system: false,
      check8_fan_belt_tension: false,
      check9_greasing_points: false,
      check10_battery_terminals: false,
      check11_brakes_steering: false,
      check12_tire_pressure_tighten: false,
    };

    if (dto.plannedEndAt && dto.plannedStartAt && dto.plannedEndAt <= dto.plannedStartAt) {
      throw new BadRequestException('Thời gian kết thúc bảo dưỡng phải sau thời gian bắt đầu.');
    }
    const startsNow = !dto.plannedStartAt || dto.plannedStartAt <= new Date();
    const [record] = await this.prisma.$transaction([
      this.prisma.maintenanceRecord.create({
        data: {
          vehicleId: dto.vehicleId,
          technicianId,
          currentHours: dto.currentHours,
          hoursToNextService: 250.0,
          alertTier: vehicle.alertTier,
          checklistJson: defaultChecklist,
          status: startsNow ? MaintenanceStatus.IN_SERVICE : MaintenanceStatus.SCHEDULED,
          plannedStartAt: dto.plannedStartAt,
          plannedEndAt: dto.plannedEndAt,
          startedAt: startsNow ? new Date() : undefined,
        },
        include: {
          vehicle: true,
          technician: { select: { id: true, fullName: true, phone: true } },
        },
      }),
      ...(startsNow ? [this.prisma.vehicle.update({ where: { id: dto.vehicleId }, data: { status: VehicleStatus.BAO_DUONG } })] : []),
    ]);

    return record;
  }

  async findAllRecords(filter: MaintenanceFilterDto) {
    const { page = 1, limit = 20, search, vehicleId, status, alertTier } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;
    if (alertTier) where.alertTier = alertTier;

    if (search) {
      where.OR = [
        { vehicle: { plate: { contains: search } } },
        { vehicle: { code: { contains: search } } },
        { technician: { fullName: { contains: search } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.maintenanceRecord.count({ where }),
      this.prisma.maintenanceRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true } },
          technician: { select: { id: true, fullName: true } },
          owedPartNotes: true,
          generatedRepairs: true,
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

  async findOneRecord(id: number) {
    const record = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        vehicle: true,
        technician: { select: { id: true, fullName: true, phone: true } },
        owedPartNotes: true,
        generatedRepairs: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Không tìm thấy phiếu bảo dưỡng #${id}`);
    }

    return record;
  }

  async completeMaintenance(id: number, dto: CompleteMaintenanceDto, technicianId: number) {
    const record = await this.findOneRecord(id);
    const now = new Date();

    let generatedRepair: any = null;

    // Tự động liên thông tạo Phiếu Sửa Chữa #SC nếu phát hiện hư hỏng lớn
    if (dto.hasMajorDefect && dto.defectDescription) {
      const randomCodeSuffix = Math.floor(1000 + Math.random() * 9000);
      const repairCode = `SC-2026-${randomCodeSuffix}`;

      generatedRepair = await this.prisma.repairTicket.create({
        data: {
          code: repairCode,
          vehicleId: record.vehicleId,
          assignedTechnicianId: technicianId,
          repairTier: RepairTier.TRUNG_TU,
          issueDescription: `[Phát sinh từ Bảo Dưỡng 250h #${record.id}]: ${dto.defectDescription}`,
          isGeneratedFromMaintenance: true,
          maintenanceRecordId: record.id,
          status: RepairStatus.RECEIVED,
          estimatedCostVnd: 3500000,
        },
      });
    }

    const [otherRepair, activeExecution, manualHold] = await Promise.all([
      this.prisma.repairTicket.findFirst({ where: { vehicleId: record.vehicleId, cancelledAt: null, endedAt: null, status: { not: RepairStatus.COMPLETED } } }),
      this.prisma.workExecutionSegment.findFirst({ where: { vehicleId: record.vehicleId, endedAt: null } }),
      this.prisma.vehicleUnavailability.findFirst({ where: { vehicleId: record.vehicleId, cancelledAt: null, status: 'APPROVED', OR: [{ endAt: null }, { endAt: { gt: now } }] } }),
    ]);
    const nextVehicleStatus = generatedRepair || otherRepair
      ? VehicleStatus.SUA_CHUA
      : activeExecution ? VehicleStatus.HOAT_DONG : manualHold ? VehicleStatus.TAM_DUNG : VehicleStatus.CHO_PHAN_CONG;

    const [updatedRecord] = await this.prisma.$transaction([
      this.prisma.maintenanceRecord.update({
        where: { id },
        data: {
          status: MaintenanceStatus.COMPLETED,
          checklistJson: dto.checklistJson,
          completedAt: now,
          endedAt: now,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: record.vehicleId },
        data: {
          hoursSinceLastService: 0, // Đặt lại 0 sau khi bảo dưỡng xong
          alertTier: MaintenanceAlertTier.GREEN,
          status: nextVehicleStatus,
        },
      }),
    ]);

    return {
      message: generatedRepair
        ? `Đã hoàn thành bảo dưỡng 250h và tự động liên thông tạo Phiếu Sửa Chữa #${generatedRepair.code}`
        : 'Đã hoàn tất bảo dưỡng 250h thành công. Xe đã sẵn sàng hoạt động.',
      maintenanceRecord: updatedRecord,
      generatedRepair,
    };
  }

  // Quản lý ghi chú nợ phụ tùng đợt sau
  async createOwedPartNote(dto: CreateOwedPartDto) {
    return this.prisma.workshopOwedPartNote.create({
      data: dto,
      include: {
        vehicle: { select: { id: true, code: true, plate: true } },
      },
    });
  }

  async findAllOwedParts(isResolved?: boolean) {
    const where: any = {};
    if (isResolved !== undefined) where.isResolved = isResolved;

    return this.prisma.workshopOwedPartNote.findMany({
      where,
      include: {
        vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true } },
        maintenanceRecord: { select: { id: true, currentHours: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveOwedPart(id: number) {
    const note = await this.prisma.workshopOwedPartNote.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Không tìm thấy ghi chú nợ vật tư #${id}`);
    }

    return this.prisma.workshopOwedPartNote.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  async getUpcomingSchedule() {
    return this.prisma.vehicle.findMany({
      where: {
        alertTier: { in: [MaintenanceAlertTier.RED, MaintenanceAlertTier.AMBER] },
      },
      select: {
        id: true,
        code: true,
        plate: true,
        name: true,
        unit: true,
        category: true,
        status: true,
        totalMachineHours: true,
        hoursSinceLastService: true,
        alertTier: true,
        defaultDriver: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: [{ alertTier: 'desc' }, { hoursSinceLastService: 'desc' }],
    });
  }
}
