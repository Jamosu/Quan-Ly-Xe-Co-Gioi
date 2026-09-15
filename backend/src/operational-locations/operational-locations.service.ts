import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationalLocationType, Prisma, Role, Unit } from '@prisma/client';
import { OperationalActor, scopedUnit } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperationalLocationDto, UpdateOperationalLocationDto } from './dto/operational-location.dto';

@Injectable()
export class OperationalLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: { type?: OperationalLocationType; unit?: Unit; complexCode?: string; enterpriseCode?: string; farmCode?: string; search?: string; active?: boolean }, actor: OperationalActor) {
    const unit = actor?.role === Role.SUPER_ADMIN ? query.unit : scopedUnit(actor, query.unit);
    const where: Prisma.OperationalLocationWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.complexCode ? { complexCode: query.complexCode } : {}),
      ...(query.enterpriseCode ? { enterpriseCode: query.enterpriseCode } : {}),
      ...(query.farmCode ? { farmCode: query.farmCode } : {}),
      ...((unit || query.search) ? { AND: [
        ...(unit ? [{ OR: [{ unit }, { unit: null }] }] : []),
        ...(query.search ? [{ OR: [{ code: { contains: query.search } }, { name: { contains: query.search } }, { address: { contains: query.search } }] }] : []),
      ] } : {}),
    };
    return this.prisma.operationalLocation.findMany({ where, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
  }

  async create(dto: CreateOperationalLocationDto, actor: OperationalActor) {
    const unit = scopedUnit(actor, dto.unit) ?? dto.unit;
    const existing = await this.prisma.operationalLocation.findUnique({ where: { code: dto.code.trim() } });
    if (existing) throw new ConflictException(`Mã vị trí ${dto.code} đã tồn tại.`);
    return this.prisma.operationalLocation.create({ data: { ...dto, code: dto.code.trim(), name: dto.name.trim(), unit } });
  }

  async update(id: number, dto: UpdateOperationalLocationDto, actor: OperationalActor) {
    const current = await this.prisma.operationalLocation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Không tìm thấy vị trí #${id}.`);
    const unit = dto.unit !== undefined ? (scopedUnit(actor, dto.unit) ?? dto.unit) : current.unit;
    return this.prisma.operationalLocation.update({ where: { id }, data: { ...dto, unit } });
  }

  async deactivate(id: number) {
    const current = await this.prisma.operationalLocation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Không tìm thấy vị trí #${id}.`);
    return this.prisma.operationalLocation.update({ where: { id }, data: { active: false } });
  }
}
