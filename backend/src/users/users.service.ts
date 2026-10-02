import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  DriverEmploymentStatus,
  DriverManagementLevel,
  DriverManagementUnitStatus,
  DriverShiftStatus,
  Prisma,
  Role,
  Unit,
  VehicleDriverAssignmentStatus,
  VehicleDriverAssignmentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserPresenceService } from './user-presence.service';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DriverProfileFilterDto } from './dto/driver-profile-filter.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hasGlobalOperationalAccess, OperationalActor } from '../common/utils/operational-access';
import { scopedManagementUnitIds } from '../common/utils/management-scope';
import { getDriverComplianceStatus, resolveDriverComplianceFields } from './driver-compliance';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private userPresenceService: UserPresenceService,
    @Optional() private readonly alertsService?: AlertsService,
  ) {}

  private async resolveDriverManagementSelection(
    managementUnitId: number | undefined,
    teamUnitId: number | undefined,
    actor: OperationalActor,
    requireForFarmManager = false,
  ) {
    if (!managementUnitId) {
      if (teamUnitId) throw new BadRequestException('Phải chọn đơn vị chủ quản trước khi chọn Đội/Tổ.');
      if (requireForFarmManager && actor.role === Role.FARM_MANAGER) {
        throw new BadRequestException('Quản lý đơn vị phải chọn đơn vị chủ quản trong phạm vi được cấp.');
      }
      return null;
    }

    const owner = await this.prisma.driverManagementUnit.findUnique({ where: { id: managementUnitId } });
    if (!owner || owner.level !== DriverManagementLevel.OWNER || owner.status !== DriverManagementUnitStatus.ACTIVE) {
      throw new BadRequestException('Đơn vị chủ quản không hợp lệ hoặc đã ngừng hoạt động.');
    }
    if (teamUnitId) {
      const team = await this.prisma.driverManagementUnit.findUnique({ where: { id: teamUnitId } });
      if (!team || team.level !== DriverManagementLevel.TEAM || team.parentId !== owner.id || team.status !== DriverManagementUnitStatus.ACTIVE) {
        throw new BadRequestException('Đội/Tổ không hợp lệ hoặc không trực thuộc đơn vị đã chọn.');
      }
    }
    if (actor.role === Role.FARM_MANAGER) {
      const scopes = await this.prisma.driverManagementAccessScope.findMany({ where: { userId: actor.id, complexCode: owner.complexCode, canAssignDrivers: true } });
      if (!scopes.some((scope) => !scope.managementUnitId || scope.managementUnitId === owner.id || (teamUnitId && scope.managementUnitId === teamUnitId))) {
        throw new ForbiddenException('Đơn vị nằm ngoài phạm vi phân công tài xế được cấp.');
      }
    }
    return { owner, teamUnitId: teamUnitId || null };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    return this.prisma.user.create({
      data: {
        code: dto.code || `NV-${Date.now().toString().slice(-6)}`,
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        unit: dto.unit,
        avatarUrl: dto.avatarUrl,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        code: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        unit: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  private async scopedDriverWhere(actor: OperationalActor, allowedIds?: number[]): Promise<Prisma.UserWhereInput> {
    const ids = allowedIds ?? await scopedManagementUnitIds(this.prisma, actor) ?? [];
    const now = new Date();
    return {
      role: Role.DRIVER,
      driverProfile: { is: { OR: [
        { managementAssignments: { some: {
          effectiveFrom: { lte: now },
          AND: [
            { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            { OR: [{ managementUnitId: { in: ids } }, { teamUnitId: { in: ids } }] },
          ],
        } } },
        { vehicleAssignments: { some: { status: VehicleDriverAssignmentStatus.ACTIVE, vehicle: { managementUnitId: { in: ids } } } } },
      ] } },
    };
  }

  async findAll(role?: Role, unit?: Unit, search?: string, actor?: OperationalActor) {
    if (actor?.role === Role.FARM_MANAGER && role && role !== Role.DRIVER) return [];
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (unit) {
      where.unit = unit;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { username: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (actor?.role === Role.FARM_MANAGER) Object.assign(where, await this.scopedDriverWhere(actor));

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        code: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        unit: true,
        employmentStatus: true,
        joinedDate: true,
        resignedDate: true,
        licenseClass: true,
        currentShiftStatus: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            drivenVehicles: true,
            dispatchOrdersDriven: true,
            transportOrders: true,
            kpis: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return users.map((u) => {
      const presence = this.userPresenceService.getPresence(u.id);
      return {
        ...u,
        isOnline: u.isActive ? presence.isOnline : false,
        lastSeenAt: presence.lastSeenAt || u.createdAt,
        onlinePlatform: presence.platform,
      };
    });
  }

  async findDrivers(unit?: Unit, actor?: OperationalActor) {
    return this.findAll(Role.DRIVER, unit, undefined, actor);
  }

  resolveDriverComplexCode(driver: any): 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO' {
    // 1. Theo đơn vị chủ quản quản lý trực tiếp
    const mgmtComp = (driver.managementUnit?.complexCode || driver.managementAssignment?.managementUnit?.complexCode || '').toUpperCase();
    if (mgmtComp) {
      if (mgmtComp.includes('KOUN') || mgmtComp === 'KM' || mgmtComp === 'KOUN_MOM') return 'KOUN_MOM';
      if (mgmtComp.includes('SNOUL') || mgmtComp === 'SN') return 'SNOUL';
      if (mgmtComp.includes('LAO') || mgmtComp === 'NL' || mgmtComp === 'NAM_LAO') return 'NAM_LAO';
    }

    // 2. Theo tiền tố mã tài xế
    const code = (driver.code || '').toUpperCase();
    if (code.startsWith('NL-') || code.startsWith('TX-NL') || code.includes('-NL-') || code.startsWith('NL_')) return 'NAM_LAO';
    if (code.startsWith('SN-') || code.startsWith('TX-SN') || code.includes('-SN-') || code.startsWith('SN_')) return 'SNOUL';
    if (code.startsWith('KM-') || code.startsWith('TX-KM') || code.includes('-KM-') || code.startsWith('KM_')) return 'KOUN_MOM';

    // 3. Theo username
    const username = (driver.username || '').toLowerCase();
    if (username.startsWith('nl_') || username.includes('namlao')) return 'NAM_LAO';
    if (username.startsWith('sn_') || username.includes('snoul')) return 'SNOUL';
    if (username.startsWith('km_') || username.includes('kounmom')) return 'KOUN_MOM';

    // 4. Theo businessUnit trong hồ sơ nhân sự
    const bu = (driver.employee?.businessUnit || '').toUpperCase();
    if (bu.includes('LAO') || bu.includes('ATTAPEU')) return 'NAM_LAO';
    if (bu.includes('SNOUL')) return 'SNOUL';
    if (bu.includes('KOUN') || bu.includes('LUMPHAT') || bu.includes('IA PUCH')) return 'KOUN_MOM';

    // 5. Theo employee.complex
    const empComp = (driver.employee?.complex || '').toUpperCase();
    if (empComp.includes('LAO') || empComp === 'NL' || empComp === 'NAM_LAO') return 'NAM_LAO';
    if (empComp.includes('SNOUL') || empComp === 'SN') return 'SNOUL';
    if (empComp.includes('KOUN') || empComp === 'KM' || empComp === 'KOUN_MOM') return 'KOUN_MOM';

    return 'KOUN_MOM';
  }

  async findDriverProfiles(filter: DriverProfileFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20 } = filter;
    const allowedManagementUnitIds = actor.role === Role.FARM_MANAGER
      ? await scopedManagementUnitIds(this.prisma, actor)
      : null;
    const allowedManagementUnitIdSet = new Set(allowedManagementUnitIds ?? []);
    if (actor.role === Role.FARM_MANAGER && filter.managementUnitId && !allowedManagementUnitIdSet.has(filter.managementUnitId)) {
      throw new ForbiddenException('Không được xem hồ sơ tài xế ngoài khu vực được giao.');
    }
    if (filter.unit && !hasGlobalOperationalAccess(actor) && filter.unit !== actor.unit) {
      throw new ForbiddenException('Không được xem hồ sơ tài xế ngoài đơn vị được phân quyền.');
    }
    const driverWhere: Prisma.UserWhereInput = actor.role === Role.DRIVER
      ? { role: Role.DRIVER, id: actor.id }
      : actor.role === Role.FARM_MANAGER
        ? await this.scopedDriverWhere(actor, allowedManagementUnitIds ?? [])
      : { role: Role.DRIVER, ...(!hasGlobalOperationalAccess(actor) ? { unit: actor.unit } : {}) };
    const [drivers, employeeRecords] = await Promise.all([
      this.prisma.user.findMany({
        where: driverWhere,
        select: {
          id: true,
          code: true,
          username: true,
          fullName: true,
          phone: true,
          unit: true,
          employmentStatus: true,
          joinedDate: true,
          resignedDate: true,
          licenseClass: true,
          licenseNumber: true,
          licenseExpiryDate: true,
          healthCheckExpiryDate: true,
          currentShiftStatus: true,
          currentLocation: true,
          avatarUrl: true,
          isActive: true,
          driverProfile: {
            select: {
              employmentStatus: true, joinedDate: true, resignedDate: true, resignedReason: true,
              licenseClass: true, licenseNumber: true, licenseExpiryDate: true, healthCheckExpiryDate: true,
              currentShiftStatus: true, currentLocation: true,
              licensesJson: true,
              vehicleAssignments: {
                where: { status: 'ACTIVE', ...(actor.role === Role.FARM_MANAGER ? { vehicle: { managementUnitId: { in: allowedManagementUnitIds ?? [] } } } : {}) },
                include: { vehicle: true },
                orderBy: { effectiveFrom: 'desc' },
              },
              managementAssignments: {
                where: { effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
                include: { managementUnit: true, teamUnit: true },
                orderBy: { effectiveFrom: 'desc' }, take: 1,
              },
            },
          },
          assignedVehicle: {
            select: { id: true, code: true, plate: true, name: true, category: true, status: true, managementUnitId: true },
          },
          drivenVehicles: {
            select: { id: true, code: true, plate: true, name: true, category: true, status: true, managementUnitId: true },
          },
          secondaryVehicles: {
            select: { id: true, code: true, plate: true, name: true, category: true, status: true, managementUnitId: true },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.employeeRecord.findMany({
        select: {
          id: true,
          empCode: true,
          businessUnit: true,
          complex: true,
          enterprise: true,
          farm: true,
          team: true,
          position: true,
          email: true,
          status: true,
        },
      }),
    ]);

    const employeeByCode = new Map(employeeRecords.map((item) => [item.empCode, item]));
    const allManagementUnitIds = [...new Set(drivers.flatMap((driver) => {
      const assignment = driver.driverProfile?.managementAssignments[0];
      return [assignment?.teamUnitId, assignment?.managementUnitId].filter((id): id is number => typeof id === 'number');
    }))];
    const now = new Date();
    const currentManagers = allManagementUnitIds.length
      ? await this.prisma.managementUnitManagerAssignment.findMany({
          where: { managementUnitId: { in: allManagementUnitIds }, managerType: 'PRIMARY', effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
          include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } },
          orderBy: { effectiveFrom: 'desc' },
        })
      : [];
    const managerByUnit = new Map(currentManagers.map((item) => [item.managementUnitId, item]));
    const search = filter.search?.trim().toLocaleLowerCase('vi-VN');

    const merged = drivers
      .map((driver) => {
        const employee = employeeByCode.get(driver.code) || null;
        const profile = driver.driverProfile;
        const activeAssignments = profile?.vehicleAssignments || [];
        const primaryAssignments = activeAssignments.filter((a) => a.type === 'PRIMARY');
        const secondaryAssignments = activeAssignments.filter((a) => a.type === 'SECONDARY');
        const scopedVehicles = (vehicles: typeof driver.drivenVehicles) => actor.role === Role.FARM_MANAGER
          ? vehicles.filter((vehicle) => allowedManagementUnitIdSet.has(vehicle.managementUnitId ?? -1))
          : vehicles;
        const drivenVehicles = scopedVehicles(driver.drivenVehicles);
        const secondaryVehicles = scopedVehicles(driver.secondaryVehicles);
        const assignedVehicle = driver.assignedVehicle && (actor.role !== Role.FARM_MANAGER || allowedManagementUnitIdSet.has(driver.assignedVehicle.managementUnitId ?? -1)) ? driver.assignedVehicle : null;
        const defaultVehicle = primaryAssignments[0]?.vehicle || assignedVehicle || drivenVehicles[0] || secondaryVehicles[0] || null;
        const managementAssignment = profile?.managementAssignments[0] || null;
        const teamManagerAssignment = managementAssignment?.teamUnitId ? managerByUnit.get(managementAssignment.teamUnitId) || null : null;
        const ownerManagerAssignment = managementAssignment ? managerByUnit.get(managementAssignment.managementUnitId) || null : null;
        const managerAssignment = teamManagerAssignment || ownerManagerAssignment || null;
        const compliance = resolveDriverComplianceFields(driver, profile);

        let licenses: any[] = [];
        if (Array.isArray(profile?.licensesJson) && profile.licensesJson.length > 0) {
          licenses = profile.licensesJson as any[];
        } else if (compliance.licenseClass || compliance.licenseNumber) {
          licenses = [{
            category: compliance.licenseClass || 'GPLX',
            number: compliance.licenseNumber || '',
            issueDate: null,
            expiryDate: compliance.licenseExpiryDate || null,
            issuedBy: '',
            isPrimary: true,
          }];
        }

        return {
          ...driver,
          drivenVehicles,
          ...(profile ? {
            employmentStatus: profile.employmentStatus,
            joinedDate: profile.joinedDate,
            resignedDate: profile.resignedDate,
            currentShiftStatus: profile.currentShiftStatus,
            currentLocation: profile.currentLocation,
          } : {}),
          ...compliance,
          employee,
          managementAssignment,
          managementUnit: managementAssignment?.managementUnit || null,
          teamUnit: managementAssignment?.teamUnit || null,
          management: managementAssignment ? {
            assignment: managementAssignment,
            unit: managementAssignment.managementUnit,
            team: managementAssignment.teamUnit,
            managerAssignment,
            manager: managerAssignment?.manager || null,
            teamManager: teamManagerAssignment?.manager || null,
            ownerManager: ownerManagerAssignment?.manager || null,
          } : null,
          enterprise: managementAssignment?.managementUnit.name || null,
          team: managementAssignment?.teamUnit?.name || null,
          position: employee?.position || null,
          assignedVehicle: defaultVehicle,
          assignedVehicles: activeAssignments.map((a) => ({
            id: a.id,
            vehicleId: a.vehicleId,
            type: a.type,
            vehicle: a.vehicle,
          })),
          primaryVehicles: primaryAssignments.map((a) => a.vehicle),
          secondaryVehicles: secondaryAssignments.map((a) => a.vehicle),
          licenses,
          complianceStatus: getDriverComplianceStatus(compliance),
          complex: managementAssignment?.managementUnit.complexCode || activeAssignments[0]?.vehicle.complexCode || this.resolveDriverComplexCode({
            ...driver,
            managementUnit: managementAssignment?.managementUnit,
            employee,
          }),
        };
      })
      .filter((item) => {
        if (actor.role === Role.FARM_MANAGER) {
          const assignment = item.managementAssignment;
          const hasManagementAssignment = assignment && (allowedManagementUnitIdSet.has(assignment.managementUnitId) || (assignment.teamUnitId && allowedManagementUnitIdSet.has(assignment.teamUnitId)));
          const hasAssignedVehicle = item.assignedVehicles.some((vehicle) => allowedManagementUnitIdSet.has(vehicle.vehicle.managementUnitId));
          if (!hasManagementAssignment && !hasAssignedVehicle) return false;
        }
        if (filter.complex || filter.complexCode) {
          const reqComp = (filter.complex || filter.complexCode || '').trim().toUpperCase();
          if (reqComp !== 'ALL') {
            const itemComp = item.complex || this.resolveDriverComplexCode(item);
            const isMatch =
              itemComp === reqComp ||
              (reqComp === 'KOUN_MOM' && itemComp === 'KOUN_MOM') ||
              (reqComp === 'SNOUL' && itemComp === 'SNOUL') ||
              (reqComp === 'NAM_LAO' && itemComp === 'NAM_LAO');
            if (!isMatch) return false;
          }
        }
        if (filter.unit && item.unit !== filter.unit) return false;
        if (filter.managementUnitId && item.managementAssignment?.managementUnitId !== filter.managementUnitId) return false;
        if (filter.teamUnitId && item.managementAssignment?.teamUnitId !== filter.teamUnitId) return false;
        if (filter.managerUserId && item.management?.manager?.id !== filter.managerUserId) return false;
        if (filter.enterprise && item.enterprise !== filter.enterprise) return false;
        if (filter.team && item.team !== filter.team) return false;
        if (filter.position && item.position !== filter.position) return false;
        if (filter.employmentStatus && item.employmentStatus !== filter.employmentStatus) return false;
        if (filter.shiftStatus && item.currentShiftStatus !== filter.shiftStatus) return false;
        if (filter.complianceStatus && item.complianceStatus !== filter.complianceStatus) return false;
        if (!search) return true;
        return [
          item.code,
          item.fullName,
          item.phone,
          item.enterprise,
          item.team,
          item.position,
          item.unit,
          item.licenseNumber,
          item.licenseClass,
        ].some((value) => String(value || '').toLocaleLowerCase('vi-VN').includes(search));
      });

    const start = (page - 1) * limit;
    return {
      items: merged.slice(start, start + limit),
      pagination: {
        total: merged.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(merged.length / limit)),
      },
      summary: {
        total: merged.length,
        operating: merged.filter(
          (item) =>
            item.employmentStatus === DriverEmploymentStatus.DANG_LAM_VIEC &&
            item.currentShiftStatus === DriverShiftStatus.DANG_VAN_HANH,
        ).length,
        ready: merged.filter(
          (item) =>
            item.employmentStatus === DriverEmploymentStatus.DANG_LAM_VIEC &&
            item.currentShiftStatus !== DriverShiftStatus.DANG_VAN_HANH,
        ).length,
        inactive: merged.filter(
          (item) => item.employmentStatus === DriverEmploymentStatus.DA_NGHI_VIEC,
        ).length,
        unassignedVehicle: merged.filter(
          (item) => item.employmentStatus !== DriverEmploymentStatus.DA_NGHI_VIEC && !item.assignedVehicle,
        ).length,
        complianceAlerts: merged.filter(
          (item) => item.complianceStatus !== 'VALID',
        ).length,
        valid: merged.filter((item) => item.complianceStatus === 'VALID').length,
        expiring30: merged.filter((item) => item.complianceStatus === 'EXPIRING_30').length,
        expiring60: merged.filter((item) => item.complianceStatus === 'EXPIRING_60').length,
        expired: merged.filter((item) => item.complianceStatus === 'EXPIRED').length,
        missing: merged.filter((item) => item.complianceStatus === 'MISSING').length,
      },
    };
  }

  async getDriverProfileOptions(actor: OperationalActor) {
    const allowedManagementUnitIds = await scopedManagementUnitIds(this.prisma, actor);
    const [managedDrivers, teamUnits] = actor.role === Role.FARM_MANAGER
      ? await Promise.all([
          this.prisma.user.findMany({ where: await this.scopedDriverWhere(actor, allowedManagementUnitIds ?? []), select: { code: true } }),
          this.prisma.driverManagementUnit.findMany({ where: { id: { in: allowedManagementUnitIds ?? [] }, level: DriverManagementLevel.TEAM }, select: { parentId: true } }),
        ])
      : [null, []];
    const parentUnitIds = teamUnits.flatMap((unit) => unit.parentId ? [unit.parentId] : []);
    const [employees, vehicles, managementUnits] = await Promise.all([
      this.prisma.employeeRecord.findMany({
        where: managedDrivers ? { empCode: { in: managedDrivers.map((driver) => driver.code) } } : {},
        select: {
          complex: true,
          businessUnit: true,
          enterprise: true,
          farm: true,
          team: true,
          position: true,
        },
      }),
      this.prisma.vehicle.findMany({
        where: allowedManagementUnitIds ? { managementUnitId: { in: allowedManagementUnitIds } } : {},
        select: { id: true, code: true, plate: true, name: true, category: true, status: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.driverManagementUnit?.findMany
        ? this.prisma.driverManagementUnit.findMany({
            where: {
              status: 'ACTIVE',
              ...(actor.role === Role.FARM_MANAGER
                ? { OR: [{ id: { in: [...(allowedManagementUnitIds ?? []), ...parentUnitIds] } }, { parentId: { in: allowedManagementUnitIds ?? [] } }] }
                : {}),
            },
            include: {
              parent: { select: { id: true, code: true, name: true } },
              managerAssignments: {
                where: {
                  managerType: 'PRIMARY',
                  effectiveFrom: { lte: new Date() },
                  OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
                },
                include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } },
                orderBy: { effectiveFrom: 'desc' },
                take: 1,
              },
            },
            orderBy: [{ complexCode: 'asc' }, { level: 'asc' }, { name: 'asc' }],
          })
        : Promise.resolve([]),
    ]);
    const unique = (values: Array<string | null | undefined>) =>
      [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort();

    return {
      complexes: actor.role === Role.FARM_MANAGER
        ? unique(managementUnits.filter((item) => item.level === DriverManagementLevel.OWNER).map((item) => item.complexCode))
        : unique(employees.map((item) => item.complex)),
      enterprises: unique(employees.flatMap((item) => [item.enterprise, item.businessUnit])),
      farms: unique(employees.map((item) => item.farm)),
      teams: unique(employees.map((item) => item.team)),
      positions: unique(employees.map((item) => item.position)),
      units: Object.values(Unit),
      vehicles,
      managementUnits,
    };
  }

  async findDriverProfile(id: number, actor?: OperationalActor) {
    const allowedVehicleUnitIds = actor?.role === Role.FARM_MANAGER ? await scopedManagementUnitIds(this.prisma, actor) ?? [] : null;
    if (actor?.role === Role.FARM_MANAGER) {
      const visible = await this.prisma.user.count({ where: { id, ...await this.scopedDriverWhere(actor, allowedVehicleUnitIds ?? []) } });
      if (!visible) throw new ForbiddenException('Không được xem hồ sơ tài xế ngoài phạm vi quản lý được cấp.');
    }
    const driver = await this.prisma.user.findFirst({
      where: { id, role: Role.DRIVER },
      select: {
        id: true,
        code: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        unit: true,
        employmentStatus: true,
        joinedDate: true,
        resignedDate: true,
        resignedReason: true,
        licenseClass: true,
        licenseNumber: true,
        licenseExpiryDate: true,
        healthCheckExpiryDate: true,
        currentShiftStatus: true,
        currentLocation: true,
        avatarUrl: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        driverProfile: {
          include: {
            vehicleAssignments: { where: allowedVehicleUnitIds ? { vehicle: { managementUnitId: { in: allowedVehicleUnitIds } } } : undefined, include: { vehicle: true, assignedBy: { select: { id: true, fullName: true } } }, orderBy: { effectiveFrom: 'desc' } },
            unavailability: { orderBy: { startAt: 'desc' }, take: 20 },
            managementAssignments: { include: { managementUnit: true, teamUnit: true, assignedBy: { select: { id: true, code: true, fullName: true } } }, orderBy: { effectiveFrom: 'desc' } },
          },
        },
        assignedVehicle: true,
        drivenVehicles: true,
        secondaryVehicles: true,
        kpis: { orderBy: { createdAt: 'desc' }, take: 6 },
        sosAlerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { vehicle: { select: { id: true, code: true, plate: true, name: true } } },
        },
        repairsReported: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { vehicle: { select: { id: true, code: true, plate: true, name: true } } },
        },
        dispatchOrdersDriven: {
          orderBy: { departureTime: 'desc' },
          take: 20,
          include: { vehicle: { select: { id: true, code: true, plate: true, name: true } } },
        },
        transportOrders: {
          orderBy: { departureTime: 'desc' },
          take: 20,
          include: { vehicle: { select: { id: true, code: true, plate: true, name: true } } },
        },
        feedTrips: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            vehicle: { select: { id: true, code: true, plate: true, name: true } },
            material: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException(`Không tìm thấy hồ sơ lái xe #${id}`);
    }

    if (actor?.role === Role.DRIVER && actor.id !== id) {
      throw new ForbiddenException('Tài xế chỉ được xem hồ sơ của chính mình.');
    }

    const profile = driver.driverProfile;
    const profileNow = new Date();
    const currentManagementAssignment = profile?.managementAssignments.find((item) => item.effectiveFrom <= profileNow && (!item.effectiveTo || item.effectiveTo > profileNow)) || null;
    const [employee, directTeamManager, directOwnerManager] = await Promise.all([
      this.prisma.employeeRecord.findUnique({ where: { empCode: driver.code } }),
      currentManagementAssignment?.teamUnitId
        ? this.prisma.managementUnitManagerAssignment.findFirst({
            where: {
              managementUnitId: currentManagementAssignment.teamUnitId,
              managerType: 'PRIMARY',
              effectiveFrom: { lte: profileNow },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: profileNow } }],
            },
            include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } },
            orderBy: { effectiveFrom: 'desc' },
          })
        : Promise.resolve(null),
      currentManagementAssignment?.managementUnitId
        ? this.prisma.managementUnitManagerAssignment.findFirst({
            where: {
              managementUnitId: currentManagementAssignment.managementUnitId,
              managerType: 'PRIMARY',
              effectiveFrom: { lte: profileNow },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: profileNow } }],
            },
            include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } },
            orderBy: { effectiveFrom: 'desc' },
          })
        : Promise.resolve(null),
    ]);
    const directManager = directTeamManager || directOwnerManager;
    const compliance = resolveDriverComplianceFields(driver, profile);
    const complianceStatus = getDriverComplianceStatus(compliance);
    const activeAssignments = (profile?.vehicleAssignments || []).filter((a) => a.status === 'ACTIVE');
    const primaryAssignments = activeAssignments.filter((a) => a.type === 'PRIMARY');
    const secondaryAssignments = activeAssignments.filter((a) => a.type === 'SECONDARY');

    let licenses: any[] = [];
    if (Array.isArray(profile?.licensesJson) && profile.licensesJson.length > 0) {
      licenses = profile.licensesJson as any[];
    } else if (compliance.licenseClass || compliance.licenseNumber) {
      licenses = [{
        category: compliance.licenseClass || 'GPLX',
        number: compliance.licenseNumber || '',
        issueDate: null,
        expiryDate: compliance.licenseExpiryDate || null,
        issuedBy: '',
        isPrimary: true,
      }];
    }

    return {
      ...driver,
      ...(allowedVehicleUnitIds ? {
        assignedVehicle: driver.assignedVehicle && allowedVehicleUnitIds.includes(driver.assignedVehicle.managementUnitId ?? -1) ? driver.assignedVehicle : null,
        drivenVehicles: driver.drivenVehicles.filter((vehicle) => allowedVehicleUnitIds.includes(vehicle.managementUnitId ?? -1)),
        secondaryVehicles: driver.secondaryVehicles.filter((vehicle) => allowedVehicleUnitIds.includes(vehicle.managementUnitId ?? -1)),
      } : {}),
      ...(profile ? {
        employmentStatus: profile.employmentStatus,
        joinedDate: profile.joinedDate,
        resignedDate: profile.resignedDate,
        resignedReason: profile.resignedReason,
        currentShiftStatus: profile.currentShiftStatus,
        currentLocation: profile.currentLocation,
        vehicleAssignmentHistory: profile.vehicleAssignments,
        unavailability: profile.unavailability,
        managementAssignment: currentManagementAssignment,
        managementAssignmentHistory: profile.managementAssignments,
        management: currentManagementAssignment ? {
          assignment: currentManagementAssignment,
          unit: currentManagementAssignment.managementUnit,
          team: currentManagementAssignment.teamUnit,
          managerAssignment: directManager,
          manager: directManager?.manager || null,
          teamManager: directTeamManager?.manager || null,
          ownerManager: directOwnerManager?.manager || null,
        } : null,
      } : {}),
      ...compliance,
      licenses,
      assignedVehicles: activeAssignments.map((a) => ({
        id: a.id,
        vehicleId: a.vehicleId,
        type: a.type,
        vehicle: a.vehicle,
      })),
      primaryVehicles: primaryAssignments.map((a) => a.vehicle),
      secondaryVehicles: secondaryAssignments.map((a) => a.vehicle),
      employee,
      complianceStatus,
      dataAvailability: {
        personalProfile: Boolean(employee),
        multipleCredentials: licenses.length > 1,
        safetyTraining: false,
        vehicleAssignmentHistory: Boolean(profile?.vehicleAssignments.length),
        documents: false,
        changeAudit: false,
      },
    };
  }

  async createDriverProfile(dto: CreateDriverProfileDto, actor?: OperationalActor) {
    const [existingUsername, existingCode] = await Promise.all([
      this.prisma.user.findUnique({ where: { username: dto.username } }),
      this.prisma.user.findUnique({ where: { code: dto.code } }),
    ]);
    if (existingUsername) throw new ConflictException('Tên đăng nhập đã tồn tại');
    if (existingCode) throw new ConflictException('Mã nhân sự đã tồn tại');

    const managementSelection = actor
      ? await this.resolveDriverManagementSelection(
          dto.managementUnitId,
          dto.teamUnitId,
          actor,
          actor.role === Role.FARM_MANAGER,
        )
      : null;

    if (dto.licenses && dto.licenses.length > 0) {
      const primaryLicense = dto.licenses.find((l: any) => l.isPrimary) || dto.licenses[0];
      if (primaryLicense) {
        dto.licenseClass = dto.licenseClass || primaryLicense.category;
        dto.licenseNumber = dto.licenseNumber || primaryLicense.number;
        if (!dto.licenseExpiryDate && primaryLicense.expiryDate) {
          dto.licenseExpiryDate = primaryLicense.expiryDate;
        }
      }
    }

    const rawPassword = dto.password?.trim() || 'Thaco@1234$';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const userData = this.pickDriverUserData(dto);
    const employeeData = this.pickEmployeeData(dto);

    const driverId = await this.prisma.$transaction(async (tx) => {
      const driver = await tx.user.create({
        data: {
          ...userData,
          code: dto.code.trim(),
          username: dto.username.trim(),
          passwordHash,
          role: Role.DRIVER,
          fullName: dto.fullName.trim(),
          unit: dto.unit,
          joinedDate: new Date(dto.joinedDate),
        },
      });

      await tx.employeeRecord.upsert({
        where: { empCode: driver.code },
        create: {
          empCode: driver.code,
          fullName: driver.fullName,
          ...employeeData,
          status: dto.employmentStatus === DriverEmploymentStatus.DA_NGHI_VIEC ? 'Đã nghỉ việc' : 'Đang làm việc',
        },
        update: { fullName: driver.fullName, ...employeeData },
      });

      await tx.driverProfile.create({ data: { userId: driver.id, ...this.pickDriverProfileData(dto) } });

      const assignmentsToSync = dto.assignedVehicles && dto.assignedVehicles.length > 0
        ? dto.assignedVehicles
        : (dto.assignedVehicleIds && dto.assignedVehicleIds.length > 0
            ? dto.assignedVehicleIds.map((vId) => ({ vehicleId: vId, type: VehicleDriverAssignmentType.PRIMARY }))
            : (dto.assignedVehicleId ? [{ vehicleId: dto.assignedVehicleId, type: VehicleDriverAssignmentType.PRIMARY }] : []));
      if (assignmentsToSync.length > 0) {
        await this.syncDriverVehicleAssignments(tx, driver.id, assignmentsToSync, actor?.id ?? driver.id, actor);
      }

      if (managementSelection && tx.driverManagementAssignment) {
        await tx.driverManagementAssignment.create({
          data: {
            driverId: driver.id,
            managementUnitId: managementSelection.owner.id,
            teamUnitId: managementSelection.teamUnitId,
            effectiveFrom: new Date(),
            reason: 'Tiếp nhận tài xế mới',
            assignedById: actor?.id ?? driver.id,
          },
        });
      }

      return driver.id;
    });
    return this.findDriverProfile(driverId, actor);
  }

  async updateDriverProfile(id: number, dto: UpdateDriverProfileDto, actor: OperationalActor) {
    const current = await this.prisma.user.findFirst({
      where: { id, role: Role.DRIVER },
      include: {
        driverProfile: {
          include: {
            managementAssignments: {
              where: { effectiveTo: null },
              take: 1,
            },
          },
        },
      },
    });
    if (!current) throw new NotFoundException(`Không tìm thấy hồ sơ lái xe #${id}`);
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.FARM_MANAGER) {
      throw new ForbiddenException('Chỉ Quản trị viên hoặc Quản lý nông trường được cập nhật hồ sơ GPLX.');
    }
    if (!hasGlobalOperationalAccess(actor) && current.unit !== actor.unit) {
      throw new ForbiddenException('Không được cập nhật hồ sơ tài xế ngoài đơn vị được phân quyền.');
    }
    if (actor.role === Role.FARM_MANAGER) {
      const visible = await this.prisma.user.count({ where: { id, ...await this.scopedDriverWhere(actor) } });
      if (!visible) throw new ForbiddenException('Tài xế nằm ngoài phạm vi quản lý được cấp.');
    }

    if (dto.username && dto.username !== current.username) {
      const duplicate = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (duplicate) throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    let managementSelection: { owner: any; teamUnitId: number | null } | null | undefined = undefined;
    if (dto.managementUnitId !== undefined) {
      managementSelection = await this.resolveDriverManagementSelection(
        dto.managementUnitId || undefined,
        dto.teamUnitId || undefined,
        actor,
      );
    }

    if (dto.licenses && dto.licenses.length > 0) {
      const primaryLicense = dto.licenses.find((l: any) => l.isPrimary) || dto.licenses[0];
      if (primaryLicense) {
        dto.licenseClass = dto.licenseClass || primaryLicense.category;
        dto.licenseNumber = dto.licenseNumber || primaryLicense.number;
        if (!dto.licenseExpiryDate && primaryLicense.expiryDate) {
          dto.licenseExpiryDate = primaryLicense.expiryDate;
        }
      }
    }

    const userData = this.pickDriverUserData(dto);
    const employeeData = this.pickEmployeeData(dto);
    if (dto.password) userData.passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...userData,
          ...(dto.username ? { username: dto.username.trim() } : {}),
          ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
        },
      });

      await tx.employeeRecord.upsert({
        where: { empCode: current.code },
        create: {
          empCode: current.code,
          fullName: updated.fullName,
          ...employeeData,
          status: updated.employmentStatus === DriverEmploymentStatus.DA_NGHI_VIEC ? 'Đã nghỉ việc' : 'Đang làm việc',
        },
        update: {
          fullName: updated.fullName,
          ...employeeData,
          status: updated.employmentStatus === DriverEmploymentStatus.DA_NGHI_VIEC ? 'Đã nghỉ việc' : 'Đang làm việc',
        },
      });
      await tx.driverProfile.upsert({ where: { userId: id }, create: { userId: id, ...this.pickDriverProfileData({ ...current, ...dto } as any) }, update: this.pickDriverProfileData(dto) });

      let assignmentsToSync: Array<{ vehicleId: number; type: VehicleDriverAssignmentType }> | null = null;
      if (dto.assignedVehicles !== undefined) {
        assignmentsToSync = dto.assignedVehicles;
      } else if (dto.assignedVehicleIds !== undefined) {
        assignmentsToSync = dto.assignedVehicleIds.map((vId) => ({ vehicleId: vId, type: VehicleDriverAssignmentType.PRIMARY }));
      } else if (dto.assignedVehicleId !== undefined) {
        assignmentsToSync = dto.assignedVehicleId ? [{ vehicleId: dto.assignedVehicleId, type: VehicleDriverAssignmentType.PRIMARY }] : [];
      }
      if (assignmentsToSync !== null) {
        await this.syncDriverVehicleAssignments(tx, id, assignmentsToSync, actor.id, actor);
      }

      if (managementSelection !== undefined && tx.driverManagementAssignment) {
        const currentActive = current.driverProfile?.managementAssignments?.[0];
        const isSame = currentActive &&
          currentActive.managementUnitId === (managementSelection?.owner.id ?? null) &&
          currentActive.teamUnitId === (managementSelection?.teamUnitId ?? null);

        if (!isSame) {
          await tx.driverManagementAssignment.updateMany({
            where: { driverId: id, effectiveTo: null },
            data: { effectiveTo: new Date() },
          });

          if (managementSelection) {
            await tx.driverManagementAssignment.create({
              data: {
                driverId: id,
                managementUnitId: managementSelection.owner.id,
                teamUnitId: managementSelection.teamUnitId,
                effectiveFrom: new Date(),
                reason: 'Cập nhật cơ cấu đơn vị quản lý hồ sơ',
                assignedById: actor.id,
              },
            });
          }
        }
      }
    });

    this.alertsService?.invalidateSourceCache();
    return this.findDriverProfile(id, actor);
  }

  private pickDriverUserData(dto: UpdateDriverProfileDto | CreateDriverProfileDto): any {
    const isActive =
      dto.isActive !== undefined
        ? dto.isActive
        : dto.employmentStatus !== undefined
        ? dto.employmentStatus === DriverEmploymentStatus.DANG_LAM_VIEC
        : undefined;

    return {
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(dto.employmentStatus !== undefined ? { employmentStatus: dto.employmentStatus } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(dto.joinedDate !== undefined ? { joinedDate: new Date(dto.joinedDate) } : {}),
      ...(dto.resignedDate !== undefined ? { resignedDate: dto.resignedDate ? new Date(dto.resignedDate) : null } : {}),
      ...(dto.resignedReason !== undefined ? { resignedReason: dto.resignedReason || null } : {}),
      ...(dto.licenseClass !== undefined ? { licenseClass: dto.licenseClass || null } : {}),
      ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber || null } : {}),
      ...(dto.licenseExpiryDate !== undefined ? { licenseExpiryDate: dto.licenseExpiryDate ? new Date(dto.licenseExpiryDate) : null } : {}),
      ...(dto.healthCheckExpiryDate !== undefined ? { healthCheckExpiryDate: dto.healthCheckExpiryDate ? new Date(dto.healthCheckExpiryDate) : null } : {}),
      ...(dto.currentShiftStatus !== undefined ? { currentShiftStatus: dto.currentShiftStatus || null } : {}),
      ...(dto.currentLocation !== undefined ? { currentLocation: dto.currentLocation || null } : {}),
      ...(dto.assignedVehicleId !== undefined ? { assignedVehicleId: dto.assignedVehicleId || null } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl || null } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
    };
  }

  private pickDriverProfileData(dto: UpdateDriverProfileDto | CreateDriverProfileDto): any {
    return {
      ...(dto.employmentStatus !== undefined ? { employmentStatus: dto.employmentStatus } : {}),
      ...(dto.joinedDate !== undefined ? { joinedDate: new Date(dto.joinedDate) } : {}),
      ...(dto.resignedDate !== undefined ? { resignedDate: dto.resignedDate ? new Date(dto.resignedDate) : null } : {}),
      ...(dto.resignedReason !== undefined ? { resignedReason: dto.resignedReason || null } : {}),
      ...(dto.licenseClass !== undefined ? { licenseClass: dto.licenseClass || null } : {}),
      ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber || null } : {}),
      ...(dto.licenseExpiryDate !== undefined ? { licenseExpiryDate: dto.licenseExpiryDate ? new Date(dto.licenseExpiryDate) : null } : {}),
      ...(dto.healthCheckExpiryDate !== undefined ? { healthCheckExpiryDate: dto.healthCheckExpiryDate ? new Date(dto.healthCheckExpiryDate) : null } : {}),
      ...(dto.currentShiftStatus !== undefined ? { currentShiftStatus: dto.currentShiftStatus || DriverShiftStatus.SAN_SANG } : {}),
      ...(dto.currentLocation !== undefined ? { currentLocation: dto.currentLocation || null } : {}),
      ...(dto.licenses !== undefined ? { licensesJson: dto.licenses } : {}),
    };
  }

  private pickEmployeeData(dto: UpdateDriverProfileDto | CreateDriverProfileDto): any {
    return {
      ...(dto.businessUnit !== undefined ? { businessUnit: dto.businessUnit || null } : {}),
      ...(dto.complex !== undefined ? { complex: dto.complex || null } : {}),
      ...(dto.enterprise !== undefined ? { enterprise: dto.enterprise || null } : {}),
      ...(dto.farm !== undefined ? { farm: dto.farm || null } : {}),
      ...(dto.team !== undefined ? { team: dto.team || null } : {}),
      ...(dto.position !== undefined ? { position: dto.position || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email || null } : {}),
      ...(dto.idCardNumber !== undefined ? { idCardNumber: dto.idCardNumber || null } : {}),
      ...(dto.idCardIssueDate !== undefined ? { idCardIssueDate: dto.idCardIssueDate || null } : {}),
      ...(dto.idCardIssuePlace !== undefined ? { idCardIssuePlace: dto.idCardIssuePlace || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(dto.joinedDate !== undefined ? { joinedDate: dto.joinedDate || null } : {}),
      ...(dto.licenseClass !== undefined ? { licenseClass: dto.licenseClass || null } : {}),
      ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber || null } : {}),
      ...(dto.licenseExpiryDate !== undefined ? { licenseExpiryDate: dto.licenseExpiryDate || null } : {}),
      ...(dto.healthCheckExpiryDate !== undefined ? { healthCheckExpiryDate: dto.healthCheckExpiryDate || null } : {}),
    };
  }

  private async syncDriverVehicleAssignments(
    tx: Prisma.TransactionClient,
    driverId: number,
    assignedVehicles: Array<{ vehicleId: number; type: VehicleDriverAssignmentType }>,
    actorId: number,
    actor?: OperationalActor,
  ) {
    const primaryCount = assignedVehicles.filter((v) => v.type === VehicleDriverAssignmentType.PRIMARY).length;
    const secondaryCount = assignedVehicles.filter((v) => v.type === VehicleDriverAssignmentType.SECONDARY).length;
    if (primaryCount > 2) {
      throw new BadRequestException('Mỗi tài xế chỉ được phụ trách chính tối đa 2 xe.');
    }
    if (secondaryCount > 2) {
      throw new BadRequestException('Mỗi tài xế chỉ được phụ trách phụ tối đa 2 xe.');
    }

    const currentAssignments = await tx.vehicleDriverAssignment.findMany({
      where: { driverId, status: VehicleDriverAssignmentStatus.ACTIVE },
    });

    if (actor?.role === Role.FARM_MANAGER) {
      const allowedIds = await scopedManagementUnitIds(this.prisma, actor) ?? [];
      const vehicleIds = [...new Set([...currentAssignments.map((item) => item.vehicleId), ...assignedVehicles.map((item) => item.vehicleId)])];
      const allowedVehicleCount = await tx.vehicle.count({ where: { id: { in: vehicleIds }, managementUnitId: { in: allowedIds } } });
      if (allowedVehicleCount !== vehicleIds.length) {
        throw new ForbiddenException('Chỉ được phân công xe thuộc phạm vi quản lý được cấp.');
      }
    }

    const targetMap = new Map<number, VehicleDriverAssignmentType>();
    for (const item of assignedVehicles) {
      targetMap.set(item.vehicleId, item.type);
    }

    const now = new Date();

    for (const cur of currentAssignments) {
      const targetType = targetMap.get(cur.vehicleId);
      if (!targetType || targetType !== cur.type) {
        await tx.vehicleDriverAssignment.update({
          where: { id: cur.id },
          data: { status: VehicleDriverAssignmentStatus.ENDED, effectiveTo: now, reason: 'Điều chỉnh phân công quản lý xe' },
        });
        if (cur.type === VehicleDriverAssignmentType.PRIMARY) {
          await tx.vehicle.updateMany({
            where: { id: cur.vehicleId, defaultDriverId: driverId },
            data: { defaultDriverId: null },
          });
        }
      }
    }

    for (const target of assignedVehicles) {
      const existing = currentAssignments.find((c) => c.vehicleId === target.vehicleId && c.type === target.type);
      if (!existing) {
        if (target.type === VehicleDriverAssignmentType.PRIMARY) {
          const conflicting = await tx.vehicleDriverAssignment.findFirst({
            where: {
              vehicleId: target.vehicleId,
              type: VehicleDriverAssignmentType.PRIMARY,
              status: VehicleDriverAssignmentStatus.ACTIVE,
              driverId: { not: driverId },
            },
          });
          if (conflicting) {
            throw new ConflictException(`Xe #${target.vehicleId} đã có tài xế khác phụ trách chính.`);
          }
        }

        await tx.vehicleDriverAssignment.create({
          data: {
            vehicleId: target.vehicleId,
            driverId,
            type: target.type,
            status: VehicleDriverAssignmentStatus.ACTIVE,
            effectiveFrom: now,
            assignedById: actorId,
            reason: 'Phân công quản lý xe',
          },
        });
        if (target.type === VehicleDriverAssignmentType.PRIMARY) {
          await tx.vehicle.update({
            where: { id: target.vehicleId },
            data: { defaultDriverId: driverId },
          });
        }
      }
    }

    const primaryVehicle = assignedVehicles.find((v) => v.type === VehicleDriverAssignmentType.PRIMARY);
    await tx.user.update({
      where: { id: driverId },
      data: { assignedVehicleId: primaryVehicle ? primaryVehicle.vehicleId : null },
    });
  }

  async findOne(id: number, actor?: OperationalActor) {
    if (actor?.role === Role.FARM_MANAGER && id !== actor.id) {
      const visible = await this.prisma.user.count({ where: { id, ...await this.scopedDriverWhere(actor) } });
      if (!visible) throw new ForbiddenException('Nhân sự nằm ngoài phạm vi quản lý được cấp.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        unit: true,
        employmentStatus: true,
        joinedDate: true,
        resignedDate: true,
        licenseClass: true,
        currentShiftStatus: true,
        avatarUrl: true,
        isActive: true,
        drivenVehicles: true,
        assignedVehicle: true,
        kpis: {
          orderBy: { monthYear: 'desc' },
          take: 3,
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng #${id}`);
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng #${id}`);
    }

    const data: any = {
      fullName: dto.fullName,
      phone: dto.phone,
      role: dto.role,
      unit: dto.unit,
      avatarUrl: dto.avatarUrl,
      isActive: dto.isActive,
    };

    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(dto.password, salt);
    }

    if (user.username === 'admin') {
      data.isActive = true;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        unit: true,
        avatarUrl: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (user.username === 'admin') {
      throw new BadRequestException('Không thể vô hiệu hóa hoặc xóa tài khoản Quản trị viên hệ thống (Admin).');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
