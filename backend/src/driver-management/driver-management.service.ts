import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverManagementLevel, DriverManagementUnitStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OperationalActor } from '../common/utils/operational-access';
import { AssignDriverManagementDto, CreateDriverManagementScopeDto, CreateDriverManagementUnitDto, DriverManagementUnitFilterDto, UpdateDriverManagementUnitDto } from './dto/driver-management.dto';

@Injectable()
export class DriverManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(value?: string | null) {
    return (value || '').normalize('NFC').trim().toLocaleLowerCase('vi-VN');
  }

  private async scopes(actor: OperationalActor) {
    // Driver-management scopes are intentionally specific to FARM_MANAGER.
    // Other operational roles have read-only access through the controller.
    if (actor.role !== Role.FARM_MANAGER) return null;
    return this.prisma.driverManagementAccessScope.findMany({ where: { userId: actor.id } });
  }

  private scopeMatches(scope: { complexCode: string; managementUnitId: number | null }, complexCode: string, managementUnitId?: number) {
    return scope.complexCode === complexCode && (!scope.managementUnitId || scope.managementUnitId === managementUnitId);
  }

  private async assertRead(actor: OperationalActor, complexCode: string, managementUnitId?: number) {
    if (actor.role !== Role.FARM_MANAGER) return;
    const scopes = await this.prisma.driverManagementAccessScope.findMany({ where: { userId: actor.id, complexCode } });
    if (!scopes.some((scope) => this.scopeMatches(scope, complexCode, managementUnitId))) {
      throw new ForbiddenException('Đơn vị nằm ngoài phạm vi quản lý được cấp.');
    }
  }

  private async assertManage(actor: OperationalActor, complexCode: string, managementUnitId?: number, permission: 'catalog' | 'assign' = 'catalog') {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role !== Role.FARM_MANAGER) throw new ForbiddenException('Bạn không có quyền quản trị danh mục hồ sơ tài xế.');
    const scopes = await this.prisma.driverManagementAccessScope.findMany({ where: { userId: actor.id, complexCode } });
    const allowed = scopes.some((scope) =>
      (permission === 'catalog' ? scope.canManageCatalog : scope.canAssignDrivers) &&
      this.scopeMatches(scope, complexCode, managementUnitId),
    );
    if (!allowed) throw new ForbiddenException('Đơn vị nằm ngoài phạm vi quản lý được cấp.');
  }

  async findUnits(filter: DriverManagementUnitFilterDto, actor: OperationalActor) {
    const actorScopes = await this.scopes(actor);
    const allowedComplexes = actorScopes ? [...new Set(actorScopes.map((item) => item.complexCode))] : undefined;
    if (actorScopes && allowedComplexes!.length === 0) return [];
    if (filter.complexCode && allowedComplexes && !allowedComplexes.includes(filter.complexCode)) {
      throw new ForbiddenException('Không được xem danh mục ngoài phạm vi được cấp.');
    }
    const search = filter.search?.trim();
    const scopedVisibility = actorScopes
      ? actorScopes.map((scope) => scope.managementUnitId
        ? { complexCode: scope.complexCode, OR: [{ id: scope.managementUnitId }, { parentId: scope.managementUnitId }] }
        : { complexCode: scope.complexCode })
      : null;
    return this.prisma.driverManagementUnit.findMany({
      where: {
        ...(scopedVisibility ? { OR: scopedVisibility } : {}),
        complexCode: filter.complexCode || (allowedComplexes?.length === 1 ? allowedComplexes[0] : undefined),
        level: filter.level,
        status: filter.status,
        ...(search ? { OR: [{ code: { contains: search } }, { name: { contains: search } }] } : {}),
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        _count: { select: { children: true, ownerAssignments: true, teamAssignments: true } },
      },
      orderBy: [{ complexCode: 'asc' }, { level: 'asc' }, { name: 'asc' }],
    });
  }

  async createUnit(dto: CreateDriverManagementUnitDto, actor: OperationalActor) {
    const complexCode = dto.complexCode.trim().toUpperCase();
    const code = dto.code.trim().toUpperCase();
    let parent = null;
    if (dto.level === DriverManagementLevel.TEAM) {
      if (!dto.parentId) throw new BadRequestException('Đội/Tổ phải trực thuộc một đơn vị chủ quản.');
      parent = await this.prisma.driverManagementUnit.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.level !== DriverManagementLevel.OWNER || parent.complexCode !== complexCode) {
        throw new BadRequestException('Đơn vị chủ quản không hợp lệ hoặc không cùng KLH.');
      }
    } else if (dto.parentId) {
      throw new BadRequestException('Đơn vị chủ quản không được có đơn vị cha.');
    }
    await this.assertManage(actor, complexCode, parent?.id);
    const exists = await this.prisma.driverManagementUnit.findFirst({ where: { complexCode, code } });
    if (exists) throw new ConflictException('Mã đơn vị đã tồn tại trong KLH.');
    return this.prisma.driverManagementUnit.create({ data: { ...dto, complexCode, code, name: dto.name.trim(), parentId: dto.parentId || null } });
  }

  async updateUnit(id: number, dto: UpdateDriverManagementUnitDto, actor: OperationalActor) {
    const unit = await this.prisma.driverManagementUnit.findUnique({ where: { id }, include: { parent: true } });
    if (!unit) throw new NotFoundException('Không tìm thấy đơn vị quản lý tài xế.');
    await this.assertManage(actor, unit.complexCode, unit.level === DriverManagementLevel.OWNER ? unit.id : unit.parentId || undefined);
    return this.prisma.driverManagementUnit.update({ where: { id }, data: { ...dto, name: dto.name?.trim() } });
  }

  async deactivateUnit(id: number, actor: OperationalActor) {
    const unit = await this.prisma.driverManagementUnit.findUnique({ where: { id }, include: { children: { where: { status: DriverManagementUnitStatus.ACTIVE } } } });
    if (!unit) throw new NotFoundException('Không tìm thấy đơn vị quản lý tài xế.');
    await this.assertManage(actor, unit.complexCode, unit.level === DriverManagementLevel.OWNER ? unit.id : unit.parentId || undefined);
    if (unit.children.length) throw new ConflictException('Cần ngừng các Đội/Tổ trực thuộc trước.');
    return this.prisma.driverManagementUnit.update({ where: { id }, data: { status: DriverManagementUnitStatus.INACTIVE } });
  }

  async deleteUnit(id: number, actor: OperationalActor) {
    const unit = await this.prisma.driverManagementUnit.findUnique({
      where: { id },
      include: {
        children: true,
        ownerAssignments: true,
        teamAssignments: true,
      },
    });
    if (!unit) throw new NotFoundException('Không tìm thấy đơn vị quản lý tài xế.');
    await this.assertManage(actor, unit.complexCode, unit.level === DriverManagementLevel.OWNER ? unit.id : unit.parentId || undefined);
    if (unit.children.length > 0) {
      throw new ConflictException('Không thể xóa đơn vị còn chứa Đội/Tổ trực thuộc. Vui lòng xóa hoặc di chuyển các Đội/Tổ trước.');
    }
    if (unit.ownerAssignments.length > 0 || unit.teamAssignments.length > 0) {
      throw new ConflictException('Không thể xóa đơn vị đã có dữ liệu phân công tài xế. Vui lòng chuyển trạng thái sang "Không hoạt động".');
    }
    return this.prisma.driverManagementUnit.delete({ where: { id } });
  }

  async assignDriver(dto: AssignDriverManagementDto, actor: OperationalActor) {
    const owner = await this.prisma.driverManagementUnit.findUnique({ where: { id: dto.managementUnitId } });
    if (!owner || owner.level !== DriverManagementLevel.OWNER || owner.status !== DriverManagementUnitStatus.ACTIVE) {
      throw new BadRequestException('Đơn vị chủ quản không hợp lệ hoặc đã ngừng hoạt động.');
    }
    if (dto.teamUnitId) {
      const team = await this.prisma.driverManagementUnit.findUnique({ where: { id: dto.teamUnitId } });
      if (!team || team.level !== DriverManagementLevel.TEAM || team.parentId !== owner.id || team.status !== DriverManagementUnitStatus.ACTIVE) {
        throw new BadRequestException('Đội/Tổ không hợp lệ hoặc không trực thuộc đơn vị đã chọn.');
      }
    }
    await this.assertManage(actor, owner.complexCode, owner.id, 'assign');
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: dto.driverId } });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ tài xế.');
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.driverManagementAssignment.updateMany({ where: { driverId: dto.driverId, effectiveTo: null }, data: { effectiveTo: effectiveFrom } });
      return tx.driverManagementAssignment.create({
        data: { driverId: dto.driverId, managementUnitId: owner.id, teamUnitId: dto.teamUnitId || null, effectiveFrom, reason: dto.reason?.trim() || null, assignedById: actor.id },
        include: { managementUnit: true, teamUnit: true, assignedBy: { select: { id: true, code: true, fullName: true } } },
      });
    });
  }

  async assignmentHistory(driverId: number, actor: OperationalActor) {
    const current = await this.prisma.driverManagementAssignment.findFirst({ where: { driverId }, include: { managementUnit: true }, orderBy: { effectiveFrom: 'desc' } });
    if (current) await this.assertRead(actor, current.managementUnit.complexCode, current.managementUnitId);
    return this.prisma.driverManagementAssignment.findMany({ where: { driverId }, include: { managementUnit: true, teamUnit: true, assignedBy: { select: { id: true, code: true, fullName: true } } }, orderBy: { effectiveFrom: 'desc' } });
  }

  async listScopes(actor: OperationalActor) {
    const actorScopes = await this.scopes(actor);
    return this.prisma.driverManagementAccessScope.findMany({
      where: actorScopes ? { OR: actorScopes.map((scope) => ({ complexCode: scope.complexCode, managementUnitId: scope.managementUnitId })) } : {},
      include: { user: { select: { id: true, code: true, fullName: true, role: true } }, managementUnit: true, grantedBy: { select: { id: true, fullName: true } } },
      orderBy: [{ complexCode: 'asc' }, { userId: 'asc' }],
    });
  }

  async createScope(dto: CreateDriverManagementScopeDto, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ Quản trị hệ thống được cấp phạm vi quản lý ban đầu.');
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.role !== Role.FARM_MANAGER) throw new BadRequestException('Chỉ có thể cấp phạm vi này cho Quản lý đơn vị.');
    if (dto.managementUnitId) {
      const unit = await this.prisma.driverManagementUnit.findUnique({ where: { id: dto.managementUnitId } });
      if (!unit || unit.level !== DriverManagementLevel.OWNER || unit.complexCode !== dto.complexCode.trim().toUpperCase()) throw new BadRequestException('Đơn vị phạm vi không hợp lệ.');
    }
    const complexCode = dto.complexCode.trim().toUpperCase();
    const existing = await this.prisma.driverManagementAccessScope.findFirst({
      where: { userId: dto.userId, complexCode, managementUnitId: dto.managementUnitId || null },
    });
    if (existing) throw new ConflictException('Phạm vi quản lý này đã được cấp cho người dùng.');
    return this.prisma.driverManagementAccessScope.create({ data: { ...dto, complexCode, managementUnitId: dto.managementUnitId || null, canManageCatalog: dto.canManageCatalog ?? true, canAssignDrivers: dto.canAssignDrivers ?? true, grantedById: actor.id } });
  }

  async reconciliation(actor: OperationalActor) {
    const units = await this.findUnits({ status: DriverManagementUnitStatus.ACTIVE }, actor);
    const actorScopes = await this.scopes(actor);
    const drivers = await this.prisma.user.findMany({
      where: { role: Role.DRIVER },
      select: { id: true, code: true, fullName: true, driverProfile: { select: { managementAssignments: { where: { effectiveTo: null }, include: { managementUnit: true, teamUnit: true }, take: 1 } } } },
      orderBy: { fullName: 'asc' },
    });
    const employees = await this.prisma.employeeRecord.findMany({ where: { empCode: { in: drivers.map((item) => item.code) } }, select: { empCode: true, complex: true, businessUnit: true, enterprise: true, farm: true, team: true } });
    const byCode = new Map(employees.map((item) => [item.empCode, item]));
    return drivers.map((driver) => {
      const employee = byCode.get(driver.code) || null;
      const current = driver.driverProfile?.managementAssignments[0] || null;
      const candidates = [employee?.businessUnit, employee?.enterprise, employee?.farm].filter(Boolean).map((value) => this.normalize(value));
      const exact = units.filter((unit) => candidates.includes(this.normalize(unit.name)) || candidates.includes(this.normalize(unit.code)));
      const distinctLegacy = [...new Set(candidates)];
      return {
        driverId: driver.id, code: driver.code, fullName: driver.fullName, employee,
        currentAssignment: current,
        suggestedUnit: exact.length === 1 ? exact[0] : null,
        status: current ? 'APPROVED' : distinctLegacy.length > 1 || exact.length > 1 ? 'CONFLICT' : 'UNREVIEWED',
      };
    }).filter((row) => {
      if (!actorScopes) return true;
      if (row.currentAssignment) {
        return actorScopes.some((scope) => this.scopeMatches(scope, row.currentAssignment.managementUnit.complexCode, row.currentAssignment.managementUnitId));
      }
      const legacyComplex = row.employee?.complex?.trim().toUpperCase();
      return Boolean(legacyComplex && actorScopes.some((scope) => scope.complexCode === legacyComplex));
    });
  }
}
