import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationalEntityType, OperationConfirmationStatus, OperationConfirmationType, Prisma, Role } from '@prisma/client';
import { OperationalActor, assertOperationalAccess, hasGlobalOperationalAccess } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmationFilterDto } from './dto/confirmation-filter.dto';
import { CreateConfirmationDto } from './dto/create-confirmation.dto';

const include = { dispatchOrder: { include: { vehicle: true, driver: { select: { id: true, fullName: true } } } }, transportOrder: { include: { vehicle: true, driver: { select: { id: true, fullName: true } }, items: true } }, createdBy: { select: { id: true, fullName: true } }, confirmedBy: { select: { id: true, fullName: true } } } satisfies Prisma.OperationConfirmationInclude;

@Injectable()
export class OperationConfirmationsService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateConfirmationDto, actor: OperationalActor) {
    if (!!dto.dispatchOrderId === !!dto.transportOrderId) throw new BadRequestException('Phiếu phải liên kết chính xác một lệnh điều xe hoặc vận chuyển.');
    if (dto.type === OperationConfirmationType.WEIGHT && (dto.grossWeightTons === undefined || dto.tareWeightTons === undefined)) throw new BadRequestException('Phiếu cân phải có tổng tải và trọng bì.');
    if (dto.type === OperationConfirmationType.GPS && dto.measuredAreaHa === undefined) throw new BadRequestException('Nghiệm thu GPS phải có diện tích đo.');
    if (dto.dispatchOrderId) { const order = await this.prisma.dispatchOrder.findUnique({ where: { id: dto.dispatchOrderId } }); if (!order) throw new NotFoundException('Không tìm thấy lệnh điều xe.'); assertOperationalAccess(actor, order.unit, order.driverId); }
    if (dto.transportOrderId) { const order = await this.prisma.transportOrder.findUnique({ where: { id: dto.transportOrderId } }); if (!order) throw new NotFoundException('Không tìm thấy vận đơn.'); assertOperationalAccess(actor, order.unit, order.driverId); }
    const netWeightTons = dto.type === OperationConfirmationType.WEIGHT ? (dto.netWeightTons ?? Number(((dto.grossWeightTons ?? 0) - (dto.tareWeightTons ?? 0)).toFixed(3))) : dto.netWeightTons;
    try { return await this.prisma.operationConfirmation.create({ data: { ...dto, netWeightTons, createdById: actor.id }, include }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException(`Phiếu ${dto.code} đã tồn tại.`); throw error; }
  }
  async findAll(filter: ConfirmationFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20, search, type, status } = filter; const where: Prisma.OperationConfirmationWhereInput = {};
    if (type) where.type = type; if (status) where.status = status; if (search) where.OR = [{ code: { contains: search } }, { routeLocation: { contains: search } }];
    if (!hasGlobalOperationalAccess(actor)) where.AND = actor.role === Role.DRIVER ? [{ OR: [{ dispatchOrder: { driverId: actor.id } }, { transportOrder: { driverId: actor.id } }] }] : [{ OR: [{ dispatchOrder: { unit: actor.unit } }, { transportOrder: { unit: actor.unit } }] }];
    const [total, items] = await Promise.all([this.prisma.operationConfirmation.count({ where }), this.prisma.operationConfirmation.findMany({ where, skip: (page - 1) * limit, take: limit, include, orderBy: { createdAt: 'desc' } })]);
    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
  async confirm(id: number, actor: OperationalActor) {
    const item = await this.prisma.operationConfirmation.findUnique({ where: { id }, include }); if (!item) throw new NotFoundException('Không tìm thấy phiếu xác nhận.');
    const parent = item.dispatchOrder ?? item.transportOrder; if (!parent) throw new BadRequestException('Phiếu không còn liên kết lệnh nghiệp vụ.'); assertOperationalAccess(actor, parent.unit, parent.driverId);
    if (item.status !== OperationConfirmationStatus.PENDING) throw new BadRequestException('Phiếu đã được xử lý.');
    return this.prisma.$transaction(async (tx) => { const updated = await tx.operationConfirmation.update({ where: { id }, data: { status: OperationConfirmationStatus.CONFIRMED, confirmedById: actor.id, confirmedAt: new Date() }, include }); await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.OPERATION_CONFIRMATION, entityId: id, actorId: actor.id, action: 'CONFIRM', oldValue: { status: item.status }, newValue: { status: OperationConfirmationStatus.CONFIRMED } } }); return updated; });
  }
}
