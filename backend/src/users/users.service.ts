import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DriverEmploymentStatus,
  DriverShiftStatus,
  Role,
  Unit,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DriverProfileFilterDto } from './dto/driver-profile-filter.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private getComplianceStatus(
    licenseNumber?: string | null,
    licenseExpiryDate?: Date | null,
    healthCheckExpiryDate?: Date | null,
  ) {
    if (!licenseNumber || !licenseExpiryDate || !healthCheckExpiryDate) {
      return 'MISSING';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expiryDates = [licenseExpiryDate, healthCheckExpiryDate];
    const remainingDays = Math.min(
      ...expiryDates.map((date) =>
        Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000),
      ),
    );

    if (remainingDays < 0) return 'EXPIRED';
    if (remainingDays <= 30) return 'EXPIRING_30';
    if (remainingDays <= 60) return 'EXPIRING_60';
    return 'VALID';
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

    return this.prisma.user.findMany({
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
  }

  async findDrivers(unit?: Unit) {
    return this.findAll(Role.DRIVER, unit);
  }

  async findDriverProfiles(filter: DriverProfileFilterDto) {
    const { page = 1, limit = 20 } = filter;
    const [drivers, employeeRecords] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.DRIVER },
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
        return {
          ...driver,
          ...(profile ? {
            employmentStatus: profile.employmentStatus,
            joinedDate: profile.joinedDate,
            resignedDate: profile.resignedDate,
            licenseClass: profile.licenseClass,
            licenseNumber: profile.licenseNumber,
            licenseExpiryDate: profile.licenseExpiryDate,
            healthCheckExpiryDate: profile.healthCheckExpiryDate,
            currentShiftStatus: profile.currentShiftStatus,
            currentLocation: profile.currentLocation,
          } : {}),
          employee,
          enterprise: employee?.enterprise || employee?.businessUnit || null,
          team: employee?.team || employee?.farm || null,
          position: employee?.position || null,
          assignedVehicle: defaultVehicle,
          complianceStatus: this.getComplianceStatus(
            driver.licenseNumber,
            driver.licenseExpiryDate,
            driver.healthCheckExpiryDate,
          ),
        };
      })
      .filter((item) => {
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
        if (filter.enterprise && item.enterprise !== filter.enterprise) return false;
        if (filter.team && item.team !== filter.team) return false;
        if (filter.position && item.position !== filter.position) return false;
        if (filter.employmentStatus && item.employmentStatus !== filter.employmentStatus) return false;
        if (!search) return true;
        return [
          item.code,
          item.fullName,
          item.phone,
          item.enterprise,
          item.team,
          item.position,
          item.unit,
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
        complianceAlerts: merged.filter(
          (item) => item.complianceStatus !== 'VALID',
        ).length,
      },
    };
  }

  async getDriverProfileOptions() {
    const [employees, vehicles] = await Promise.all([
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
    };
  }

  async findDriverProfile(id: number) {
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

    const employee = await this.prisma.employeeRecord.findUnique({
      where: { empCode: driver.code },
    });

    const profile = driver.driverProfile;
    const complianceStatus = this.getComplianceStatus(
      profile?.licenseNumber ?? driver.licenseNumber,
      profile?.licenseExpiryDate ?? driver.licenseExpiryDate,
      profile?.healthCheckExpiryDate ?? driver.healthCheckExpiryDate,
    );

    return {
      ...driver,
      ...(profile ? {
        employmentStatus: profile.employmentStatus,
        joinedDate: profile.joinedDate,
        resignedDate: profile.resignedDate,
        resignedReason: profile.resignedReason,
        licenseClass: profile.licenseClass,
        licenseNumber: profile.licenseNumber,
        licenseExpiryDate: profile.licenseExpiryDate,
        healthCheckExpiryDate: profile.healthCheckExpiryDate,
        currentShiftStatus: profile.currentShiftStatus,
        currentLocation: profile.currentLocation,
        vehicleAssignmentHistory: profile.vehicleAssignments,
        unavailability: profile.unavailability,
      } : {}),
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

  async createDriverProfile(dto: CreateDriverProfileDto) {
    const [existingUsername, existingCode] = await Promise.all([
      this.prisma.user.findUnique({ where: { username: dto.username } }),
      this.prisma.user.findUnique({ where: { code: dto.code } }),
    ]);
    if (existingUsername) throw new ConflictException('Tên đăng nhập đã tồn tại');
    if (existingCode) throw new ConflictException('Mã nhân sự đã tồn tại');

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

      return driver.id;
    });
    return this.findDriverProfile(driverId);
  }

  async updateDriverProfile(id: number, dto: UpdateDriverProfileDto) {
    const current = await this.prisma.user.findFirst({ where: { id, role: Role.DRIVER } });
    if (!current) throw new NotFoundException(`Không tìm thấy hồ sơ lái xe #${id}`);

    if (dto.username && dto.username !== current.username) {
      const duplicate = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (duplicate) throw new ConflictException('Tên đăng nhập đã tồn tại');
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
    });

    return this.findDriverProfile(id);
  }

  private pickDriverUserData(dto: UpdateDriverProfileDto | CreateDriverProfileDto): any {
    return {
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(dto.employmentStatus !== undefined ? { employmentStatus: dto.employmentStatus } : {}),
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
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
