import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverShiftStatus, OperationalEntityType, Prisma, Role, VehicleDriverAssignmentStatus, VehicleDriverAssignmentType } from '@prisma/client';
import { OperationalActor, assertOperationalAccess } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDriverAssignmentDto, EndVehicleDriverAssignmentDto } from './dto/create-vehicle-driver-assignment.dto';

@Injectable()
export class VehicleDriverAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(vehicleId: number | undefined, driverId: number | undefined, actor: OperationalActor) {
    const unit = actor.role === Role.SUPER_ADMIN || actor.unit === 'TOAN_KLH' ? undefined : actor.unit;
    return this.prisma.vehicleDriverAssignment.findMany({
      where: { vehicleId, driverId, vehicle: unit ? { unit } : undefined },
      include: { vehicle: true, driver: { include: { user: { select: { id: true, code: true, fullName: true, phone: true, unit: true } } } }, assignedBy: { select: { id: true, fullName: true } } },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
  }

  async create(dto: CreateVehicleDriverAssignmentDto, actor: OperationalActor) {
    if (dto.effectiveTo && dto.effectiveTo <= dto.effectiveFrom) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM vehicles WHERE id = ${dto.vehicleId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${dto.driverId} FOR UPDATE`;
      const [vehicle, driver] = await Promise.all([tx.vehicle.findUnique({ where: { id: dto.vehicleId } }), tx.user.findUnique({ where: { id: dto.driverId } })]);
      if (!vehicle) throw new NotFoundException(`Không tìm thấy xe #${dto.vehicleId}.`);
      if (!driver || driver.role !== Role.DRIVER) throw new BadRequestException(`Người dùng #${dto.driverId} không phải tài xế.`);
      assertOperationalAccess(actor, vehicle.unit);
      if (driver.unit !== vehicle.unit && actor.role !== Role.SUPER_ADMIN) throw new BadRequestException('Tài xế và xe phải thuộc cùng đơn vị.');
      await this.ensureProfile(tx, driver);
      if (dto.type === VehicleDriverAssignmentType.PRIMARY) {
        const overlaps = await tx.vehicleDriverAssignment.findFirst({
          where: {
            type: VehicleDriverAssignmentType.PRIMARY,
            status: { in: [VehicleDriverAssignmentStatus.SCHEDULED, VehicleDriverAssignmentStatus.ACTIVE] },
            OR: [{ vehicleId: dto.vehicleId }, { driverId: dto.driverId }],
            effectiveFrom: { lt: dto.effectiveTo ?? new Date('9999-12-31T23:59:59.999Z') },
            AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: dto.effectiveFrom } }] }],
          },
        });
        if (overlaps) throw new ConflictException({ code: 'PRIMARY_ASSIGNMENT_CONFLICT', conflictingAssignmentId: overlaps.id });
      }
      const now = new Date();
      const status = dto.effectiveFrom > now ? VehicleDriverAssignmentStatus.SCHEDULED : VehicleDriverAssignmentStatus.ACTIVE;
      const assignment = await tx.vehicleDriverAssignment.create({ data: { ...dto, assignedById: actor.id, status }, include: { vehicle: true, driver: { include: { user: true } }, assignedBy: true } });
      if (dto.type === VehicleDriverAssignmentType.PRIMARY && status === VehicleDriverAssignmentStatus.ACTIVE) {
        await tx.vehicle.update({ where: { id: dto.vehicleId }, data: { defaultDriverId: dto.driverId } });
        await tx.user.update({ where: { id: dto.driverId }, data: { assignedVehicleId: dto.vehicleId } });
      }
      await tx.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.VEHICLE_DRIVER_ASSIGNMENT,
          entityId: assignment.id,
          actorId: actor.id,
          action: 'CREATE',
          newValue: {
            vehicleId: dto.vehicleId,
            driverId: dto.driverId,
            type: dto.type,
            status,
            effectiveFrom: dto.effectiveFrom.toISOString(),
            effectiveTo: dto.effectiveTo?.toISOString(),
          },
          reason: dto.reason,
        },
      });
      return assignment;
    });
  }

  async end(id: number, dto: EndVehicleDriverAssignmentDto, actor: OperationalActor) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.vehicleDriverAssignment.findUnique({ where: { id }, include: { vehicle: true } });
      if (!assignment) throw new NotFoundException(`Không tìm thấy phân công #${id}.`);
      assertOperationalAccess(actor, assignment.vehicle.unit);
      if (assignment.status === VehicleDriverAssignmentStatus.ENDED) throw new BadRequestException('Phân công đã kết thúc.');
      const effectiveTo = dto.effectiveTo ?? new Date();
      if (effectiveTo <= assignment.effectiveFrom) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
      const updated = await tx.vehicleDriverAssignment.update({ where: { id }, data: { effectiveTo, status: VehicleDriverAssignmentStatus.ENDED, reason: dto.reason } });
      if (assignment.type === VehicleDriverAssignmentType.PRIMARY) {
        await tx.vehicle.updateMany({ where: { id: assignment.vehicleId, defaultDriverId: assignment.driverId }, data: { defaultDriverId: null } });
        await tx.user.updateMany({ where: { id: assignment.driverId, assignedVehicleId: assignment.vehicleId }, data: { assignedVehicleId: null } });
      }
      await tx.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.VEHICLE_DRIVER_ASSIGNMENT,
          entityId: id,
          actorId: actor.id,
          action: 'END',
          oldValue: { status: assignment.status, effectiveTo: assignment.effectiveTo?.toISOString() },
          newValue: { status: VehicleDriverAssignmentStatus.ENDED, effectiveTo: effectiveTo.toISOString() },
          reason: dto.reason,
        },
      });
      return updated;
    });
  }

  private async ensureProfile(tx: Prisma.TransactionClient, driver: any) {
    await tx.driverProfile.upsert({
      where: { userId: driver.id },
      update: {},
      create: { userId: driver.id, employmentStatus: driver.employmentStatus, joinedDate: driver.joinedDate, resignedDate: driver.resignedDate, resignedReason: driver.resignedReason, licenseClass: driver.licenseClass, licenseNumber: driver.licenseNumber, licenseExpiryDate: driver.licenseExpiryDate, healthCheckExpiryDate: driver.healthCheckExpiryDate, currentShiftStatus: driver.currentShiftStatus ?? DriverShiftStatus.SAN_SANG, currentLocation: driver.currentLocation },
    });
  }
}
