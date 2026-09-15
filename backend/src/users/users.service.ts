import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  DriverEmploymentStatus,
  DriverManagementLevel,
  DriverManagementUnitStatus,
  DriverShiftStatus,
  Role,
  Unit,
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
      if (!scopes.some((scope) => !scope.managementUnitId || scope.managementUnitId === owner.id)) {
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

  async findAll(role?: Role, unit?: Unit, search?: string) {
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

  async findDrivers(unit?: Unit) {
    return this.findAll(Role.DRIVER, unit);
  }

  async findDriverProfiles(filter: DriverProfileFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20 } = filter;
    const managementScopes = actor.role === Role.FARM_MANAGER
      ? await (this.prisma.driverManagementAccessScope?.findMany({ where: { userId: actor.id } }) ?? [])
      : [];
    if (filter.unit && !hasGlobalOperationalAccess(actor) && filter.unit !== actor.unit) {
      throw new ForbiddenException('Không được xem hồ sơ tài xế ngoài đơn vị được phân quyền.');
    }
    const driverWhere = actor.role === Role.DRIVER
      ? { role: Role.DRIVER, id: actor.id }
      : actor.role === Role.FARM_MANAGER
        ? { role: Role.DRIVER, ...(managementScopes.length === 0 && !hasGlobalOperationalAccess(actor) ? { unit: actor.unit } : {}) }
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
              vehicleAssignments: {
                where: { status: 'ACTIVE', type: 'PRIMARY' },
                include: { vehicle: true },
                orderBy: { effectiveFrom: 'desc' }, take: 1,
              },
              managementAssignments: {
                where: { effectiveTo: null },
                include: { managementUnit: true, teamUnit: true },
                orderBy: { effectiveFrom: 'desc' }, take: 1,
              },
            },
          },
          assignedVehicle: {
            select: { id: true, code: true, plate: true, name: true, category: true, status: true },
          },
          drivenVehicles: {
            select: { id: true, code: true, plate: true, name: true, category: true, status: true },
          },
          secondaryVehicles: {
            select: { id: true, code: true, plate: true, name: true, category: true, status: true },
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
    const search = filter.search?.trim().toLocaleLowerCase('vi-VN');

    const merged = drivers
      .map((driver) => {
        const employee = employeeByCode.get(driver.code) || null;
        const defaultVehicle = driver.driverProfile?.vehicleAssignments[0]?.vehicle || driver.assignedVehicle || driver.drivenVehicles[0] || driver.secondaryVehicles[0] || null;
        const profile = driver.driverProfile;
        const managementAssignment = profile?.managementAssignments[0] || null;
        const compliance = resolveDriverComplianceFields(driver, profile);
        return {
          ...driver,
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
          enterprise: managementAssignment?.managementUnit.name || null,
          team: managementAssignment?.teamUnit?.name || null,
          position: employee?.position || null,
          assignedVehicle: defaultVehicle,
          complianceStatus: getDriverComplianceStatus(compliance),
        };
      })
      .filter((item) => {
        if (actor.role === Role.FARM_MANAGER) {
          const assignment = item.managementAssignment;
          if (!assignment || !managementScopes.some((scope) => scope.complexCode === assignment.managementUnit.complexCode && (!scope.managementUnitId || scope.managementUnitId === assignment.managementUnitId))) return false;
        }
        if (filter.complex || filter.complexCode) {
          const reqComp = (filter.complex || filter.complexCode || '').trim().toUpperCase();
          if (reqComp !== 'ALL') {
            const empComp = (item.employee?.complex || '').toUpperCase();
            const isMatch =
              empComp === reqComp ||
              (reqComp === 'KOUN_MOM' && (empComp.includes('KOUN') || empComp.includes('KM'))) ||
              (reqComp === 'SNOUL' && (empComp.includes('SNOUL') || empComp.includes('SN'))) ||
              (reqComp === 'NAM_LAO' && (empComp.includes('LAO') || empComp.includes('NL')));
            if (!isMatch) return false;
          }
        }
        if (filter.unit && item.unit !== filter.unit) return false;
        if (filter.managementUnitId && item.managementAssignment?.managementUnitId !== filter.managementUnitId) return false;
        if (filter.teamUnitId && item.managementAssignment?.teamUnitId !== filter.teamUnitId) return false;
        if (filter.enterprise && item.enterprise !== filter.enterprise) return false;
        if (filter.team && item.team !== filter.team) return false;
        if (filter.position && item.position !== filter.position) return false;
        if (filter.employmentStatus && item.employmentStatus !== filter.employmentStatus) return false;
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
    const managementScopes = actor.role === Role.FARM_MANAGER
      ? await (this.prisma.driverManagementAccessScope?.findMany({ where: { userId: actor.id } }) ?? [])
      : [];
    const allowedComplexes = [...new Set(managementScopes.map((item) => item.complexCode))];
    const [employees, vehicles, managementUnits] = await Promise.all([
      this.prisma.employeeRecord.findMany({
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
        select: { id: true, code: true, plate: true, name: true, category: true, status: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.driverManagementUnit?.findMany
        ? this.prisma.driverManagementUnit.findMany({
            where: { status: 'ACTIVE', ...(actor.role === Role.FARM_MANAGER ? { complexCode: { in: allowedComplexes } } : {}) },
            include: { parent: { select: { id: true, code: true, name: true } } },
            orderBy: [{ complexCode: 'asc' }, { level: 'asc' }, { name: 'asc' }],
          })
        : Promise.resolve([]),
    ]);
    const unique = (values: Array<string | null | undefined>) =>
      [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort();

    return {
      complexes: unique(employees.map((item) => item.complex)),
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
            vehicleAssignments: { include: { vehicle: true, assignedBy: { select: { id: true, fullName: true } } }, orderBy: { effectiveFrom: 'desc' } },
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

    if (actor?.role === Role.FARM_MANAGER) {
      const currentAssignment = driver.driverProfile?.managementAssignments.find((item) => !item.effectiveTo);
      const scopes = await this.prisma.driverManagementAccessScope.findMany({ where: { userId: actor.id } });
      if (!currentAssignment || !scopes.some((scope) => scope.complexCode === currentAssignment.managementUnit.complexCode && (!scope.managementUnitId || scope.managementUnitId === currentAssignment.managementUnitId))) {
        throw new ForbiddenException('Không được xem hồ sơ tài xế ngoài phạm vi quản lý được cấp.');
      }
    }

    const employee = await this.prisma.employeeRecord.findUnique({
      where: { empCode: driver.code },
    });

    const profile = driver.driverProfile;
    const compliance = resolveDriverComplianceFields(driver, profile);
    const complianceStatus = getDriverComplianceStatus(compliance);

    return {
      ...driver,
      ...(profile ? {
        employmentStatus: profile.employmentStatus,
        joinedDate: profile.joinedDate,
        resignedDate: profile.resignedDate,
        resignedReason: profile.resignedReason,
        currentShiftStatus: profile.currentShiftStatus,
        currentLocation: profile.currentLocation,
        vehicleAssignmentHistory: profile.vehicleAssignments,
        unavailability: profile.unavailability,
        managementAssignment: profile.managementAssignments.find((item) => !item.effectiveTo) || null,
        managementAssignmentHistory: profile.managementAssignments,
      } : {}),
      ...compliance,
      employee,
      complianceStatus,
      dataAvailability: {
        personalProfile: Boolean(employee),
        multipleCredentials: false,
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
          false,
        )
      : null;

    const rawPassword = dto.password?.trim() || '123456';
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

  async findOne(id: number) {
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
