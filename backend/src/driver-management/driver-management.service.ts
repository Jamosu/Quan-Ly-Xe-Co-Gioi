import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverManagementLevel, DriverManagementUnitStatus, ManagementUnitManagerType, OperationalEntityType, Role, Unit } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { OperationalActor } from '../common/utils/operational-access';
import { assertManagementUnitAccess, scopedManagementUnitIds } from '../common/utils/management-scope';
import { AssignDriverManagementDto, CreateDriverManagementScopeDto, CreateDriverManagementUnitDto, CreateManagerAssignmentDto, DriverManagementUnitFilterDto, EndManagerAssignmentDto, ManagerAssignmentFilterDto, UpdateDriverManagementUnitDto } from './dto/driver-management.dto';

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
    const scopes = await this.prisma.driverManagementAccessScope.findMany({ where: { userId: actor.id } });
    const projectedIds = scopes
      .filter((scope) => scope.isManagerProjection && scope.managementUnitId)
      .map((scope) => scope.managementUnitId!);
    if (!projectedIds.length) return scopes;
    const now = new Date();
    const activeAssignments = await this.prisma.managementUnitManagerAssignment.findMany({
      where: {
        managerUserId: actor.id,
        managementUnitId: { in: projectedIds },
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      select: { managementUnitId: true },
    });
    const activeIds = new Set(activeAssignments.map((item) => item.managementUnitId));
    return scopes.filter((scope) => !scope.isManagerProjection || (scope.managementUnitId && activeIds.has(scope.managementUnitId)));
  }

  private scopeMatches(scope: { complexCode: string; managementUnitId: number | null }, complexCode: string, managementUnitId?: number) {
    return scope.complexCode === complexCode && (!scope.managementUnitId || scope.managementUnitId === managementUnitId);
  }

  private async assertRead(actor: OperationalActor, complexCode: string, managementUnitId?: number, teamUnitId?: number | null) {
    if (actor.role !== Role.FARM_MANAGER) return;
    const scopes = (await this.scopes(actor))?.filter((scope) => scope.complexCode === complexCode) ?? [];
    if (!scopes.some((scope) => this.scopeMatches(scope, complexCode, managementUnitId) || (teamUnitId && this.scopeMatches(scope, complexCode, teamUnitId)))) {
      throw new ForbiddenException('Đơn vị nằm ngoài phạm vi quản lý được cấp.');
    }
  }

  private async assertManage(actor: OperationalActor, complexCode: string, managementUnitId?: number, permission: 'catalog' | 'assign' = 'catalog', teamUnitId?: number | null) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role !== Role.FARM_MANAGER) throw new ForbiddenException('Bạn không có quyền quản trị danh mục hồ sơ tài xế.');
    const scopes = (await this.scopes(actor))?.filter((scope) => scope.complexCode === complexCode) ?? [];
    const allowed = scopes.some((scope) =>
      (permission === 'catalog' ? scope.canManageCatalog : scope.canAssignDrivers) &&
      (this.scopeMatches(scope, complexCode, managementUnitId) || (teamUnitId && this.scopeMatches(scope, complexCode, teamUnitId))),
    );
    if (!allowed) throw new ForbiddenException('Đơn vị nằm ngoài phạm vi quản lý được cấp.');
  }

  async findUnits(filter: DriverManagementUnitFilterDto, actor: OperationalActor) {
    const now = new Date();
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
    const units = await this.prisma.driverManagementUnit.findMany({
      where: {
        ...(scopedVisibility ? { OR: scopedVisibility } : {}),
        complexCode: filter.complexCode || (allowedComplexes?.length === 1 ? allowedComplexes[0] : undefined),
        level: filter.level,
        unitType: filter.unitType,
        status: filter.status,
        ...(search ? { AND: [{ OR: [{ code: { contains: search } }, { name: { contains: search } }] }] } : {}),
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        mainDepot: { select: { id: true, code: true, name: true, complexCode: true, regionName: true, address: true } },
        managerAssignments: {
          where: {
            managerType: ManagementUnitManagerType.PRIMARY,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          },
          select: {
            id: true, managerUserId: true, managerType: true, effectiveFrom: true, effectiveTo: true,
            manager: { select: { id: true, code: true, username: true, fullName: true, phone: true } },
          },
          orderBy: { effectiveFrom: 'desc' as const },
          take: 1,
        },
        children: {
          select: {
            _count: {
              select: {
                // Xe cơ giới có thể điều lệnh (không tính THIET_BI_PHU_TRO)
                vehicles: { where: { vehicleType: { isAssignable: true } } },
                implements: true,
                workOrders: true,
                teamAssignments: {
                  where: { effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
                },
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
            // Xe cơ giới có thể điều lệnh (isAssignable=true)
            vehicles: { where: { vehicleType: { isAssignable: true } } },
            implements: true,
            workOrders: true,
            ownerAssignments: {
              where: { effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            },
            teamAssignments: {
              where: { effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            },
          },
        },
      },
      orderBy: [{ complexCode: 'asc' }, { level: 'asc' }, { name: 'asc' }],
    });
    // Count xe THIET_BI_PHU_TRO (isAssignable=false) per management unit để hiển đúng cột TB phụ trợ
    const supportVehicleGroups = await this.prisma.vehicle.groupBy({
      by: ['managementUnitId'],
      where: { vehicleType: { isAssignable: false } },
      _count: { id: true },
    });
    const supportCountByUnit = new Map(supportVehicleGroups.map((g) => [g.managementUnitId, g._count.id]));
    return units.map((unit) => {
      const { managerAssignments, children, _count, ...rest } = unit as any;
      // Xe cơ giới có thể điều lệnh (isAssignable=true)
      const ownVehicles = _count.vehicles as number;
      const childVehicles: number = (children as any[]).reduce((sum: number, child: any) => sum + child._count.vehicles, 0);
      // Thiết bị phụ trợ lưu trong bảng vehicles (isAssignable=false): tính từ groupBy query riêng
      const ownSupport = supportCountByUnit.get(unit.id) ?? 0;
      const childSupport: number = (children as any[]).reduce((sum: number, child: any) => sum + (supportCountByUnit.get(child.id) ?? 0), 0);
      // AgriculturalImplements
      const ownImpls = _count.implements as number;
      const childImpls: number = (children as any[]).reduce((sum: number, child: any) => sum + child._count.implements, 0);
      const primaryMgr = (managerAssignments as any[])[0] ?? null;
      const managerFullName = unit.managerName || primaryMgr?.manager?.fullName || null;
      const managerPhone = unit.managerPhone || primaryMgr?.manager?.phone || null;
      const currentManager = managerFullName
        ? {
            id: primaryMgr?.id ?? 0,
            managementUnitId: unit.id,
            managerUserId: primaryMgr?.managerUserId ?? 0,
            managerType: primaryMgr?.managerType ?? 'PRIMARY',
            effectiveFrom: primaryMgr?.effectiveFrom ?? unit.createdAt,
            effectiveTo: primaryMgr?.effectiveTo ?? null,
            manager: {
              id: primaryMgr?.manager?.id ?? 0,
              code: primaryMgr?.manager?.code ?? '',
              username: primaryMgr?.manager?.username ?? '',
              fullName: managerFullName,
              phone: managerPhone,
            },
          }
        : null;

      return {
        ...rest,
        parent: unit.parent,
        mainDepot: unit.mainDepot,
        currentManager,
        teamCount: _count.children as number,
        // Chỉ xe/máy thực sự điều lệnh được
        vehicleCount: ownVehicles + childVehicles,
        // Thiết bị phụ trợ = vehicle THIET_BI_PHU_TRO + AgriculturalImplement
        implementCount: ownSupport + childSupport + ownImpls + childImpls,
        totalEquipmentCount: ownVehicles + childVehicles + ownSupport + childSupport + ownImpls + childImpls,
        driverCount: unit.level === DriverManagementLevel.OWNER
          ? _count.ownerAssignments + (children as any[]).reduce((sum: number, child: any) => sum + child._count.teamAssignments, 0)
          : _count.teamAssignments,
        workOrderCount: _count.workOrders + (children as any[]).reduce((sum: number, child: any) => sum + child._count.workOrders, 0),
      };
    });
  }

  private async syncManagerPersonnel(
    managerName: string,
    managerPhone?: string | null,
    complexCode?: string,
    unitName?: string,
    enterpriseName?: string,
    unitId?: number,
  ) {
    try {
      const name = managerName.trim();
      const phone = managerPhone?.trim() || null;
      if (!name) return;

      // 1. Find or create user
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            { fullName: name },
          ],
        },
      });

      if (!user) {
        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
        const username = cleanPhone ? `cgm.${cleanPhone}` : `cgm.${Date.now().toString().slice(-6)}`;
        const existingUsername = await this.prisma.user.findUnique({ where: { username } });
        const finalUsername = existingUsername ? `${username}.${Math.floor(Math.random() * 1000)}` : username;
        const passwordHash = await bcrypt.hash('Thaco@123', 10);
        const userCode = `CB-${Date.now().toString().slice(-6)}`;

        let mappedUnit: Unit = Unit.KOUN_MOM;
        if (complexCode === 'SNOUL') mappedUnit = Unit.SNOUL;
        else if (complexCode === 'NAM_LAO') mappedUnit = Unit.NAM_LAO;

        user = await this.prisma.user.create({
          data: {
            code: userCode,
            username: finalUsername,
            passwordHash,
            fullName: name,
            phone,
            role: Role.FARM_MANAGER,
            unit: mappedUnit,
            isActive: true,
          },
        });
      }

      // 2. Find or create employeeRecord
      const existingEmp = await this.prisma.employeeRecord.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            { fullName: name },
            { empCode: user.code },
          ],
        },
      });

      if (!existingEmp) {
        await this.prisma.employeeRecord.create({
          data: {
            empCode: user.code,
            fullName: name,
            phone,
            complex: complexCode || 'Koun Mom',
            enterprise: enterpriseName || null,
            team: unitName || null,
            position: 'Đội trưởng / Người phụ trách cơ giới',
            status: 'Hoạt động',
            username: user.username,
          },
        });
      } else {
        await this.prisma.employeeRecord.update({
          where: { id: existingEmp.id },
          data: {
            enterprise: enterpriseName || existingEmp.enterprise,
            team: unitName || existingEmp.team,
            phone: phone || existingEmp.phone,
          },
        });
      }

      // 3. Link managementUnitManagerAssignment if unitId given
      if (unitId && user) {
        const activeAssign = await this.prisma.managementUnitManagerAssignment.findFirst({
          where: { managementUnitId: unitId, effectiveTo: null },
        });
        if (!activeAssign) {
          await this.prisma.managementUnitManagerAssignment.create({
            data: {
              managementUnitId: unitId,
              managerUserId: user.id,
              managerType: ManagementUnitManagerType.PRIMARY,
              effectiveFrom: new Date(),
              assignedById: 1,
              reason: 'Bổ nhiệm người phụ trách Đội cơ giới',
            },
          });
        } else if (activeAssign.managerUserId !== user.id) {
          await this.prisma.managementUnitManagerAssignment.update({
            where: { id: activeAssign.id },
            data: { effectiveTo: new Date(), reason: 'Thay đổi người phụ trách Đội cơ giới' },
          });
          await this.prisma.managementUnitManagerAssignment.create({
            data: {
              managementUnitId: unitId,
              managerUserId: user.id,
              managerType: ManagementUnitManagerType.PRIMARY,
              effectiveFrom: new Date(),
              assignedById: 1,
              reason: 'Thay đổi người phụ trách Đội cơ giới',
            },
          });
        }
      }
    } catch (syncErr) {
      console.error('[DriverManagementService] syncManagerPersonnel error:', syncErr);
    }
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
    if (dto.mainDepotId) {
      const depot = await this.prisma.operationalLocation.findUnique({ where: { id: dto.mainDepotId } });
      if (!depot || depot.complexCode !== complexCode) {
        throw new BadRequestException('Bãi xe chính không tồn tại hoặc không thuộc cùng KLH.');
      }
    }
    await this.assertManage(actor, complexCode, parent?.id);
    const exists = await this.prisma.driverManagementUnit.findFirst({ where: { complexCode, code } });
    if (exists) throw new ConflictException('Mã đơn vị đã tồn tại trong KLH.');
    const created = await this.prisma.driverManagementUnit.create({
      data: {
        ...dto,
        complexCode,
        code,
        name: dto.name.trim(),
        parentId: dto.parentId || null,
        mainDepotId: dto.mainDepotId || null,
        managerName: dto.managerName?.trim() || null,
        managerPhone: dto.managerPhone?.trim() || null,
      },
      include: { parent: true, mainDepot: true },
    });
    if (dto.managerName?.trim()) {
      await this.syncManagerPersonnel(
        dto.managerName.trim(),
        dto.managerPhone?.trim(),
        complexCode,
        created.name,
        parent?.name,
        created.id,
      );
    }
    return created;
  }

  async updateUnit(id: number, dto: UpdateDriverManagementUnitDto, actor: OperationalActor) {
    const unit = await this.prisma.driverManagementUnit.findUnique({ where: { id }, include: { parent: true } });
    if (!unit) throw new NotFoundException('Không tìm thấy đơn vị quản lý tài xế.');
    await this.assertManage(actor, unit.complexCode, unit.level === DriverManagementLevel.OWNER ? unit.id : unit.parentId || undefined);
    if (dto.mainDepotId) {
      const depot = await this.prisma.operationalLocation.findUnique({ where: { id: dto.mainDepotId } });
      if (!depot || depot.complexCode !== unit.complexCode) {
        throw new BadRequestException('Bãi xe chính không tồn tại hoặc không thuộc cùng KLH.');
      }
    }
    const updated = await this.prisma.driverManagementUnit.update({
      where: { id },
      data: {
        ...dto,
        name: dto.name?.trim(),
        mainDepotId: dto.mainDepotId !== undefined ? (dto.mainDepotId || null) : undefined,
        managerName: dto.managerName !== undefined ? (dto.managerName?.trim() || null) : undefined,
        managerPhone: dto.managerPhone !== undefined ? (dto.managerPhone?.trim() || null) : undefined,
      },
      include: { parent: true, mainDepot: true },
    });
    if (dto.managerName?.trim()) {
      await this.syncManagerPersonnel(
        dto.managerName.trim(),
        dto.managerPhone?.trim(),
        updated.complexCode,
        updated.name,
        updated.parent?.name,
        updated.id,
      );
    }
    return updated;
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
    await this.prisma.managementUnitManagerAssignment.deleteMany({ where: { managementUnitId: id } });
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
    await this.assertManage(actor, owner.complexCode, owner.id, 'assign', dto.teamUnitId);
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
    if (current) await this.assertRead(actor, current.managementUnit.complexCode, current.managementUnitId, current.teamUnitId);
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

  async managerAssignments(filter: ManagerAssignmentFilterDto, actor: OperationalActor) {
    const allowedIds = await scopedManagementUnitIds(this.prisma, actor);
    if (filter.managementUnitId) await assertManagementUnitAccess(this.prisma, actor, filter.managementUnitId);
    const now = new Date();
    const assignments = await this.prisma.managementUnitManagerAssignment.findMany({
      where: {
        managementUnitId: filter.managementUnitId ?? (allowedIds ? { in: allowedIds } : undefined),
        managerUserId: filter.managerUserId,
        ...(filter.includeHistory ? {} : { effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }),
      },
      include: {
        managementUnit: true,
        manager: { select: { id: true, code: true, username: true, fullName: true, phone: true, role: true, isActive: true } },
        assignedBy: { select: { id: true, code: true, fullName: true } },
      },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
    const legacyIds = assignments.flatMap((item) => item.legacyCatalogId ? [item.legacyCatalogId] : []);
    if (!legacyIds.length) return assignments;

    const legacyCatalogs = await this.prisma.catalogItem.findMany({
      where: { id: { in: legacyIds } },
      select: { id: true, address: true },
    });
    const legacyById = new Map(legacyCatalogs.map((item) => [item.id, item]));
    return assignments.map((item) => ({
      ...item,
      legacyCatalog: item.legacyCatalogId ? legacyById.get(item.legacyCatalogId) ?? null : null,
    }));
  }

  async unresolvedManagers(actor: OperationalActor) {
    const allowedIds = await scopedManagementUnitIds(this.prisma, actor);
    const [legacy, linked, units] = await Promise.all([
      this.prisma.catalogItem.findMany({ where: { type: 'CG_MANAGER' }, orderBy: { code: 'asc' } }),
      this.prisma.managementUnitManagerAssignment.findMany({ where: { legacyCatalogId: { not: null } }, select: { legacyCatalogId: true } }),
      this.prisma.driverManagementUnit.findMany({ where: { level: DriverManagementLevel.OWNER, ...(allowedIds ? { id: { in: allowedIds } } : {}) } }),
    ]);
    const linkedIds = new Set(linked.flatMap((item) => item.legacyCatalogId ? [item.legacyCatalogId] : []));
    const normalize = (value?: string | null) => (value || '').normalize('NFC').trim().toLocaleLowerCase('vi-VN');
    return legacy.filter((item) => !linkedIds.has(item.id)).map((item) => {
      const matches = units.filter((unit) => normalize(unit.name) === normalize(item.parentName) || normalize(unit.code) === normalize(item.parentName));
      return { ...item, status: 'PENDING_LINK', suggestedManagementUnit: matches.length === 1 ? matches[0] : null };
    }).filter((item) => allowedIds === null || item.suggestedManagementUnit !== null);
  }

  async createManagerAssignment(dto: CreateManagerAssignmentDto, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ Quản trị hệ thống được phân công Đội trưởng cơ giới.');
    const start = new Date(dto.effectiveFrom);
    const end = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (end && end <= start) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    const type = dto.managerType ?? ManagementUnitManagerType.PRIMARY;
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM driver_management_units WHERE id = ${dto.managementUnitId} FOR UPDATE`;
      const unit = await tx.driverManagementUnit.findUnique({ where: { id: dto.managementUnitId } });
      if (!unit || unit.status !== DriverManagementUnitStatus.ACTIVE) {
        throw new NotFoundException('Không tìm thấy Đội cơ giới đang hoạt động.');
      }
      const manager = await tx.user.findUnique({ where: { id: dto.managerUserId } });
      if (!manager || manager.role !== Role.FARM_MANAGER || !manager.isActive) {
        throw new BadRequestException('Đội trưởng phải là User FARM_MANAGER đang hoạt động.');
      }
      if (dto.legacyCatalogId) {
        const legacy = await tx.catalogItem.findUnique({ where: { id: dto.legacyCatalogId } });
        if (!legacy || legacy.type !== 'CG_MANAGER') throw new BadRequestException('Bản ghi quản lý cơ giới cũ không hợp lệ.');
        const used = await tx.managementUnitManagerAssignment.findFirst({ where: { legacyCatalogId: dto.legacyCatalogId } });
        if (used) throw new ConflictException('Bản ghi quản lý cơ giới cũ đã được liên kết.');
      }
      if (type === ManagementUnitManagerType.PRIMARY) {
        const conflict = await tx.managementUnitManagerAssignment.findFirst({
          where: {
            managementUnitId: dto.managementUnitId,
            managerType: ManagementUnitManagerType.PRIMARY,
            effectiveFrom: { lt: end ?? new Date('9999-12-31T23:59:59.999Z') },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: start } }],
          },
        });
        if (conflict) throw new ConflictException('Đơn vị đã có Đội trưởng chính trong khoảng hiệu lực này.');
      }
      const assignment = await tx.managementUnitManagerAssignment.create({
        data: { managementUnitId: dto.managementUnitId, managerUserId: dto.managerUserId, managerType: type, effectiveFrom: start, effectiveTo: end, assignedById: actor.id, legacyCatalogId: dto.legacyCatalogId, reason: dto.reason?.trim() || null },
        include: { managementUnit: true, manager: { select: { id: true, code: true, username: true, fullName: true, phone: true, role: true, isActive: true } } },
      });
      const existingScope = await tx.driverManagementAccessScope.findFirst({ where: { userId: dto.managerUserId, complexCode: unit.complexCode, managementUnitId: unit.id } });
      if (existingScope) {
        await tx.driverManagementAccessScope.update({ where: { id: existingScope.id }, data: { canManageCatalog: true, canAssignDrivers: true } });
      } else {
        await tx.driverManagementAccessScope.create({ data: { userId: dto.managerUserId, complexCode: unit.complexCode, managementUnitId: unit.id, canManageCatalog: true, canAssignDrivers: true, isManagerProjection: true, grantedById: actor.id } });
      }
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.MANAGEMENT_UNIT_MANAGER_ASSIGNMENT, entityId: assignment.id, actorId: actor.id, action: 'CREATE', newValue: { managementUnitId: unit.id, managerUserId: dto.managerUserId, managerType: type, effectiveFrom: start.toISOString(), effectiveTo: end?.toISOString() }, reason: dto.reason } });
      return assignment;
    });
  }

  async endManagerAssignment(id: number, dto: EndManagerAssignmentDto, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ Quản trị hệ thống được kết thúc nhiệm kỳ Đội trưởng.');
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.managementUnitManagerAssignment.findUnique({ where: { id }, include: { managementUnit: true } });
      if (!assignment) throw new NotFoundException('Không tìm thấy phân công Đội trưởng.');
      const end = dto.effectiveTo ? new Date(dto.effectiveTo) : new Date();
      if (end <= assignment.effectiveFrom) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
      const updated = await tx.managementUnitManagerAssignment.update({ where: { id }, data: { effectiveTo: end, reason: dto.reason?.trim() || assignment.reason } });
      const now = new Date();
      const remaining = await tx.managementUnitManagerAssignment.count({
        where: {
          managerUserId: assignment.managerUserId,
          managementUnitId: assignment.managementUnitId,
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
      });
      if (!remaining) await tx.driverManagementAccessScope.deleteMany({ where: { userId: assignment.managerUserId, managementUnitId: assignment.managementUnitId, isManagerProjection: true } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.MANAGEMENT_UNIT_MANAGER_ASSIGNMENT, entityId: id, actorId: actor.id, action: 'END', oldValue: { effectiveTo: assignment.effectiveTo?.toISOString() }, newValue: { effectiveTo: end.toISOString() }, reason: dto.reason } });
      return updated;
    });
  }

  async replaceManagerAssignment(id: number, dto: CreateManagerAssignmentDto, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ Quản trị hệ thống được thay đổi Đội trưởng.');
    const start = new Date(dto.effectiveFrom);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM management_unit_manager_assignments WHERE id = ${id} FOR UPDATE`;
      const previous = await tx.managementUnitManagerAssignment.findUnique({ where: { id }, include: { managementUnit: true } });
      if (!previous) throw new NotFoundException('Không tìm thấy nhiệm kỳ cần thay đổi.');
      if (previous.managementUnitId !== dto.managementUnitId) throw new BadRequestException('Thay người phụ trách không được đổi khu vực của nhiệm kỳ.');
      if (start <= previous.effectiveFrom) throw new BadRequestException('Nhiệm kỳ mới phải bắt đầu sau nhiệm kỳ cũ.');
      const manager = await tx.user.findUnique({ where: { id: dto.managerUserId } });
      if (!manager || manager.role !== Role.FARM_MANAGER || !manager.isActive) throw new BadRequestException('Đội trưởng phải là User FARM_MANAGER đang hoạt động.');
      if (dto.legacyCatalogId) {
        const used = await tx.managementUnitManagerAssignment.findFirst({ where: { legacyCatalogId: dto.legacyCatalogId, id: { not: id } } });
        if (used) throw new ConflictException('Bản ghi quản lý cơ giới cũ đã được liên kết.');
      }
      const replacementEnd = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
      if (replacementEnd && replacementEnd <= start) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
      const replacementType = dto.managerType ?? previous.managerType;
      if (replacementType === ManagementUnitManagerType.PRIMARY) {
        const conflict = await tx.managementUnitManagerAssignment.findFirst({
          where: { id: { not: id }, managementUnitId: previous.managementUnitId, managerType: ManagementUnitManagerType.PRIMARY, effectiveFrom: { lt: replacementEnd ?? new Date('9999-12-31T23:59:59.999Z') }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: start } }] },
        });
        if (conflict) throw new ConflictException('Đơn vị đã có Đội trưởng chính trong khoảng hiệu lực mới.');
      }
      await tx.managementUnitManagerAssignment.update({ where: { id }, data: { effectiveTo: start, reason: dto.reason?.trim() || previous.reason } });
      const replacement = await tx.managementUnitManagerAssignment.create({
        data: { managementUnitId: previous.managementUnitId, managerUserId: dto.managerUserId, managerType: replacementType, effectiveFrom: start, effectiveTo: replacementEnd, assignedById: actor.id, legacyCatalogId: dto.legacyCatalogId, reason: dto.reason?.trim() || null },
        include: { managementUnit: true, manager: { select: { id: true, code: true, username: true, fullName: true, phone: true, role: true, isActive: true } } },
      });
      const now = new Date();
      const oldRemaining = await tx.managementUnitManagerAssignment.count({
        where: {
          managerUserId: previous.managerUserId,
          managementUnitId: previous.managementUnitId,
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
      });
      if (!oldRemaining) await tx.driverManagementAccessScope.deleteMany({ where: { userId: previous.managerUserId, managementUnitId: previous.managementUnitId, isManagerProjection: true } });
      const existingScope = await tx.driverManagementAccessScope.findFirst({ where: { userId: dto.managerUserId, complexCode: previous.managementUnit.complexCode, managementUnitId: previous.managementUnitId } });
      if (existingScope) await tx.driverManagementAccessScope.update({ where: { id: existingScope.id }, data: { canManageCatalog: true, canAssignDrivers: true } });
      else await tx.driverManagementAccessScope.create({ data: { userId: dto.managerUserId, complexCode: previous.managementUnit.complexCode, managementUnitId: previous.managementUnitId, canManageCatalog: true, canAssignDrivers: true, isManagerProjection: true, grantedById: actor.id } });
      await tx.operationalAuditLog.create({ data: { entityType: OperationalEntityType.MANAGEMENT_UNIT_MANAGER_ASSIGNMENT, entityId: replacement.id, actorId: actor.id, action: 'REPLACE', oldValue: { assignmentId: previous.id, managerUserId: previous.managerUserId }, newValue: { assignmentId: replacement.id, managerUserId: replacement.managerUserId, effectiveFrom: start.toISOString() }, reason: dto.reason } });
      return replacement;
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
    const units = await this.findUnits({ status: DriverManagementUnitStatus.ACTIVE, level: DriverManagementLevel.OWNER }, actor);
    const actorScopes = await this.scopes(actor);
    const drivers = await this.prisma.user.findMany({
      where: { role: Role.DRIVER },
      select: { id: true, code: true, fullName: true, driverProfile: { select: { managementAssignments: { where: { effectiveTo: null }, include: { managementUnit: true, teamUnit: true }, take: 1 } } } },
      orderBy: { fullName: 'asc' },
    });
    const employees = await this.prisma.employeeRecord.findMany({ where: { empCode: { in: drivers.map((item) => item.code) } }, select: { empCode: true, complex: true, businessUnit: true, enterprise: true, farm: true, team: true } });
    const byCode = new Map(employees.map((item) => [item.empCode, item]));
    const driverRows = drivers.map((driver) => {
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
      return Boolean(legacyComplex && actorScopes.some((scope) => !scope.managementUnitId && scope.complexCode === legacyComplex));
    }).map((row) => ({ entityType: 'DRIVER', ...row }));

    if (actor.role !== Role.SUPER_ADMIN) return driverRows;
    const [vehicles, workOrders, legacyManagers] = await Promise.all([
      this.prisma.vehicle.findMany({ where: { managementUnitId: null }, select: { id: true, code: true, name: true, assignedUnitCode: true, complexCode: true }, orderBy: { code: 'asc' } }),
      this.prisma.operationalWorkOrder.findMany({
        where: { managementUnitId: null },
        select: {
          id: true, jobName: true, enterpriseCode: true, enterpriseName: true,
          vehicleAssignments: { where: { status: { in: ['ASSIGNED', 'ACCEPTED'] } }, select: { vehicle: { select: { id: true, code: true, managementUnitId: true } } } },
          driverAssignments: {
            where: { status: { in: ['ASSIGNED', 'ACCEPTED'] } },
            select: {
              driver: {
                select: {
                  userId: true,
                  user: { select: { code: true } },
                  managementAssignments: {
                    where: { effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
                    select: { managementUnitId: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.unresolvedManagers(actor),
    ]);
    return [
      ...driverRows,
      ...vehicles.map((vehicle) => ({ entityType: 'VEHICLE', vehicleId: vehicle.id, code: vehicle.code, name: vehicle.name, legacyUnit: vehicle.assignedUnitCode, complexCode: vehicle.complexCode, status: 'UNREVIEWED' })),
      ...workOrders.map((order) => {
        const vehicleUnitIds = [...new Set(order.vehicleAssignments.flatMap((item) => item.vehicle.managementUnitId ? [item.vehicle.managementUnitId] : []))];
        const driverUnitIds = [...new Set(order.driverAssignments.flatMap((item) => item.driver.managementAssignments.map((assignment) => assignment.managementUnitId)))];
        return { entityType: 'WORK_ORDER', workOrderId: order.id, jobName: order.jobName, enterpriseCode: order.enterpriseCode, enterpriseName: order.enterpriseName, vehicleUnitIds, driverUnitIds, status: vehicleUnitIds.length === 1 && driverUnitIds.length === 1 && vehicleUnitIds[0] !== driverUnitIds[0] ? 'CONFLICT' : 'UNREVIEWED' };
      }),
      ...legacyManagers.map((manager) => ({ entityType: 'CG_MANAGER', legacyCatalogId: manager.id, code: manager.code, name: manager.name, parentName: manager.parentName, suggestedManagementUnit: manager.suggestedManagementUnit, status: 'PENDING_LINK' })),
    ];
  }
}
