import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceAlertTier,
  Prisma,
  VehicleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateTelemetryDto } from './dto/update-telemetry.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  private calculateAlertTier(hoursSinceLastService: number): MaintenanceAlertTier {
    const hoursRemaining = 250 - hoursSinceLastService;
    if (hoursRemaining <= 20 || hoursSinceLastService >= 230) {
      return MaintenanceAlertTier.RED;
    }
    if (hoursRemaining <= 50 || hoursSinceLastService >= 200) {
      return MaintenanceAlertTier.AMBER;
    }
    return MaintenanceAlertTier.GREEN;
  }

  async create(dto: CreateVehicleDto) {
    const orConditions: Prisma.VehicleWhereInput[] = [{ code: dto.code }];
    if (dto.plate) {
      orConditions.push({ plate: dto.plate });
    }

    const existing = await this.prisma.vehicle.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Thiết bị có mã ${dto.code}${dto.plate ? ` hoặc biển số ${dto.plate}` : ''} đã tồn tại trong hệ thống.`,
      );
    }

    const hoursSinceLastService = dto.hoursSinceLastService || 0;
    const alertTier = this.calculateAlertTier(hoursSinceLastService);

    // Auto-resolve manufacturerRefId if only manufacturer name is passed
    let manufacturerRefId = dto.manufacturerRefId;
    if (!manufacturerRefId && dto.manufacturer) {
      const mf = await this.prisma.vehicleManufacturer.findFirst({
        where: { name: { equals: dto.manufacturer } },
        select: { id: true },
      });
      if (mf) manufacturerRefId = mf.id;
    }

    // Auto-resolve modelRefId if modelName is passed
    let modelRefId = dto.modelRefId;
    if (!modelRefId && dto.modelName && manufacturerRefId) {
      const m = await this.prisma.vehicleModel.findFirst({
        where: { name: { equals: dto.modelName }, manufacturerId: manufacturerRefId },
        select: { id: true },
      });
      if (m) modelRefId = m.id;
    }

    return this.prisma.vehicle.create({
      data: {
        ...dto,
        manufacturerRefId,
        modelRefId,
        alertTier,
      },
      include: {
        defaultDriver: {
          select: { id: true, fullName: true, phone: true },
        },
        vehicleType: true,
        manufacturerRef: true,
        modelRef: true,
        currentImplements: true,
      },
    });
  }

  async findAll(filter: VehicleFilterDto) {
    const {
      page = 1,
      limit = 20,
      search,
      complexCode,
      regionCode,
      assignedUnitCode,
      currentLocationName,
      assetGroup,
      vehicleTypeId,
      vehicleTypeCode,
      category,
      manufacturer,
      manufacturerRefId,
      modelName,
      modelRefId,
      origin,
      manufactureYear,
      unit,
      bravoCode,
      status,
      alertTier,
    } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};

    if (complexCode && complexCode !== 'ALL') where.complexCode = complexCode;
    if (category) where.category = category;
    if (assetGroup) where.assetGroup = assetGroup;
    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;
    if (vehicleTypeCode) where.vehicleType = { code: vehicleTypeCode };
    if (unit) where.unit = unit;
    if (regionCode) where.regionCode = regionCode;
    if (assignedUnitCode) where.assignedUnitCode = { contains: assignedUnitCode };
    if (currentLocationName) where.currentLocationName = { contains: currentLocationName };
    if (bravoCode) where.bravoCode = { contains: bravoCode };
    if (manufacturerRefId) where.manufacturerRefId = manufacturerRefId;
    else if (manufacturer) where.manufacturer = { contains: manufacturer };
    if (modelRefId) where.modelRefId = modelRefId;
    else if (modelName) where.modelName = { contains: modelName };
    if (origin) where.origin = { contains: origin };
    if (manufactureYear) where.manufactureYear = manufactureYear;
    if (status) where.status = status;
    if (alertTier) where.alertTier = alertTier;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { code: { contains: q } },
        { oldCode: { contains: q } },
        { plate: { contains: q } },
        { name: { contains: q } },
        { bravoCode: { contains: q } },
        { assetCode: { contains: q } },
        { modelName: { contains: q } },
        { manufacturer: { contains: q } },
        { vehicleSubtype: { contains: q } },
        { vehicleType: { name: { contains: q } } },
        { vehicleType: { code: { contains: q } } },
        { frameNumber: { contains: q } },
        { engineNumber: { contains: q } },
        { assignedUnitCode: { contains: q } },
        { currentLocationName: { contains: q } },
        { managerName: { contains: q } },
        { notes: { contains: q } },
        { supplier: { contains: q } },
      ];
    }

    const isBulk = limit > 500;
    const includeQuery: Prisma.VehicleInclude = isBulk
      ? {
          vehicleType: {
            select: {
              id: true,
              code: true,
              name: true,
              assetGroup: true,
            },
          },
          defaultDriver: {
            select: { id: true, fullName: true, phone: true },
          },
        }
      : {
          vehicleType: {
            select: {
              id: true,
              code: true,
              name: true,
              assetGroup: true,
              defaultMaintenanceHours: true,
              defaultFuelQuotaRate: true,
              defaultFuelQuotaUnit: true,
            },
          },
          manufacturerRef: {
            select: {
              id: true,
              name: true,
              countryName: true,
            },
          },
          modelRef: {
            select: {
              id: true,
              name: true,
            },
          },
          defaultDriver: {
            select: { id: true, fullName: true, phone: true },
          },
          currentImplements: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
              technicalCondition: true,
            },
          },
          _count: {
            select: {
              maintenanceRecords: true,
              repairTickets: true,
            },
          },
        };

    const [total, items] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: includeQuery,
        orderBy: [{ id: 'asc' }],
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

  async findAssignments(filter: VehicleFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 4000;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};
    if (filter.complexCode && filter.complexCode !== 'ALL') {
      where.complexCode = filter.complexCode;
    }

    const [total, items] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          code: true,
          plate: true,
          name: true,
          assetGroup: true,
          unit: true,
          complexCode: true,
          regionCode: true,
          assignedUnitCode: true,
          allocationDate: true,
          transferHistory: true,
          notes: true,
          status: true,
          currentLocationName: true,
          managerName: true,
          managerPhone: true,
          vehicleType: {
            select: { assetGroup: true },
          },
          defaultDriver: {
            select: { id: true, fullName: true, phone: true },
          },
        },
        orderBy: { id: 'asc' },
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

  async getFilterOptions(filter?: VehicleFilterDto) {
    const nonNull = { not: null };
    const VALID_COUNTRIES = new Set([
      'VIỆT NAM', 'NHẬT BẢN', 'HÀN QUỐC', 'TRUNG QUỐC', 'MỸ', 'ĐỨC', 'THỔ NHĨ KỲ', 'ẤN ĐỘ',
      'THÁI LAN', 'CAMPUCHIA', 'BELARUS', 'NGA', 'ITALIA', 'BRAZIL', 'ĐÀI LOAN', 'ANH',
      'PHÁP', 'TÂY BAN NHA', 'THỤY ĐIỂN', 'CANADA', 'BA LAN', 'INDONESIA', 'MALAYSIA',
    ]);

    // Build base where condition from current active filters
    const baseWhere: Prisma.VehicleWhereInput = {};
    if (filter) {
      if (filter.complexCode && filter.complexCode !== 'ALL') baseWhere.complexCode = filter.complexCode;
      if (filter.category) baseWhere.category = filter.category;
      if (filter.assetGroup) baseWhere.assetGroup = filter.assetGroup;
      if (filter.vehicleTypeId) baseWhere.vehicleTypeId = filter.vehicleTypeId;
      if (filter.vehicleTypeCode) baseWhere.vehicleType = { code: filter.vehicleTypeCode };
      if (filter.unit) baseWhere.unit = filter.unit;
      if (filter.regionCode) baseWhere.regionCode = filter.regionCode;
      if (filter.assignedUnitCode) baseWhere.assignedUnitCode = { contains: filter.assignedUnitCode };
      if (filter.currentLocationName) baseWhere.currentLocationName = { contains: filter.currentLocationName };
      if (filter.bravoCode) baseWhere.bravoCode = { contains: filter.bravoCode };
      if (filter.manufacturerRefId) baseWhere.manufacturerRefId = filter.manufacturerRefId;
      else if (filter.manufacturer) baseWhere.manufacturer = { contains: filter.manufacturer };
      if (filter.modelRefId) baseWhere.modelRefId = filter.modelRefId;
      else if (filter.modelName) baseWhere.modelName = { contains: filter.modelName };
      if (filter.origin) baseWhere.origin = filter.origin;
      if (filter.status) baseWhere.status = filter.status;
      if (filter.alertTier) baseWhere.alertTier = filter.alertTier;
    }

    // Exclude self-filter so user can select another option in that dimension
    const { manufactureYear: _my, ...whereForYears } = baseWhere;
    const { origin: _orig, ...whereForOrigins } = baseWhere;

    const [
      complexes,
      regions,
      assignedUnits,
      locations,
      assetGroups,
      originGroups,
      yearGroups,
      vehicleTypes,
      masterManufacturers,
      masterModels,
      purchaseConditionList,
      supplierList,
      ownerList,
    ] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { complexCode: { not: '' } },
        select: { complexCode: true },
        distinct: ['complexCode'],
        orderBy: { complexCode: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: {
          ...(baseWhere.complexCode ? { complexCode: baseWhere.complexCode } : {}),
          regionCode: nonNull,
        },
        select: { regionCode: true },
        distinct: ['regionCode'],
        orderBy: { regionCode: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: {
          ...(baseWhere.complexCode ? { complexCode: baseWhere.complexCode } : {}),
          assignedUnitCode: nonNull,
        },
        select: { assignedUnitCode: true },
        distinct: ['assignedUnitCode'],
        orderBy: { assignedUnitCode: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: {
          ...(baseWhere.complexCode ? { complexCode: baseWhere.complexCode } : {}),
          currentLocationName: { not: null, notIn: [''] },
        },
        select: { currentLocationName: true },
        distinct: ['currentLocationName'],
        orderBy: { currentLocationName: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: {
          ...(baseWhere.complexCode ? { complexCode: baseWhere.complexCode } : {}),
          assetGroup: nonNull,
        },
        select: { assetGroup: true },
        distinct: ['assetGroup'],
        orderBy: { assetGroup: 'asc' },
      }),
      // Only origins that have vehicles matching the current query
      this.prisma.vehicle.groupBy({
        by: ['origin'],
        _count: { id: true },
        where: {
          ...whereForOrigins,
          origin: { not: null, notIn: [''] },
        },
        orderBy: { origin: 'asc' },
      }),
      // Only years that have vehicles matching the current query
      this.prisma.vehicle.groupBy({
        by: ['manufactureYear'],
        _count: { id: true },
        where: {
          ...whereForYears,
          manufactureYear: { not: null, gt: 0 },
        },
        orderBy: { manufactureYear: 'desc' },
      }),
      this.prisma.vehicleType.findMany({
        where: { active: true },
        select: {
          id: true,
          code: true,
          name: true,
          assetGroup: true,
          category: true,
          _count: { select: { vehicles: { where: baseWhere } } },
        },
        orderBy: [{ assetGroup: 'asc' }, { name: 'asc' }],
      }),
      // Master Data: Manufacturers with vehicle count matching active filters
      this.prisma.vehicleManufacturer.findMany({
        where: { active: true, vehicles: { some: baseWhere } },
        select: {
          id: true,
          name: true,
          countryName: true,
          _count: { select: { vehicles: { where: baseWhere } } },
        },
        orderBy: { name: 'asc' },
      }),
      // Master Data: Models with manufacturer info matching active filters
      this.prisma.vehicleModel.findMany({
        where: { active: true, vehicles: { some: baseWhere } },
        select: {
          id: true,
          name: true,
          manufacturerId: true,
          categoryHint: true,
          _count: { select: { vehicles: { where: baseWhere } } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: { purchaseCondition: { not: null, notIn: [''] } },
        select: { purchaseCondition: true },
        distinct: ['purchaseCondition'],
        orderBy: { purchaseCondition: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: { supplier: { not: null, notIn: [''] } },
        select: { supplier: true },
        distinct: ['supplier'],
        orderBy: { supplier: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: { companyOwner: { not: null, notIn: [''] } },
        select: { companyOwner: true },
        distinct: ['companyOwner'],
        orderBy: { companyOwner: 'asc' },
      }),
    ]);

    const sanitizeStringList = (items: Array<{ [key: string]: string | null | undefined }>, key: string) =>
      [...new Set(items.map((item) => item[key]?.trim()).filter((v): v is string => Boolean(v)))];

    const standardConditions = ['Mua mới 100%', 'Đã qua sử dụng (ĐQSD)', 'Điều chuyển nội bộ', 'Thuê ngoài'];
    const dbConditions = sanitizeStringList(purchaseConditionList, 'purchaseCondition');
    const allConditions = [...new Set([...standardConditions, ...dbConditions])];

    const standardSuppliers = ['THACO AGRI', 'THACO INDUSTRIES', 'CATERPILLAR VN', 'KOBELCO VN', 'KOMATSU VN', 'TÂN PHÁT', 'LOVOL', 'PHƯỚC LỘC', 'CƯỜNG CƠ GIỚI'];
    const dbSuppliers = sanitizeStringList(supplierList, 'supplier');
    const allSuppliers = [...new Set([...standardSuppliers, ...dbSuppliers])];

    const standardOwners = ['THACO AGRI', 'CÔNG TY CP NÔNG NGHIỆP DP', 'CÔNG TY TNHH BÒ AD', 'CÔNG TY CP NÔNG NGHIỆP LP', 'DP', 'ADM', 'LP'];
    const dbOwners = sanitizeStringList(ownerList, 'companyOwner');
    const allOwners = [...new Set([...standardOwners, ...dbOwners])];

    return {
      complexes: sanitizeStringList(complexes, 'complexCode'),
      regions: sanitizeStringList(regions, 'regionCode'),
      assignedUnits: sanitizeStringList(assignedUnits, 'assignedUnitCode'),
      locations: sanitizeStringList(locations, 'currentLocationName'),
      assetGroups: sanitizeStringList(assetGroups, 'assetGroup'),
      vehicleTypes: vehicleTypes.map(({ _count, ...item }) => ({
        ...item,
        vehicleCount: _count.vehicles,
      })),
      // Use master data tables for clean filter options
      manufacturers: masterManufacturers.map(({ _count, ...item }) => ({
        ...item,
        vehicleCount: _count.vehicles,
      })),
      models: masterModels.map(({ _count, ...item }) => ({
        ...item,
        vehicleCount: _count.vehicles,
      })),
      origins: originGroups
        .filter((item) => item.origin && VALID_COUNTRIES.has(item.origin.toUpperCase()) && item._count.id > 0)
        .map((item) => ({
          name: item.origin!.trim(),
          vehicleCount: item._count.id,
        })),
      manufactureYears: yearGroups
        .filter((item) => typeof item.manufactureYear === 'number' && item.manufactureYear > 0 && item._count.id > 0)
        .map((item) => ({
          year: item.manufactureYear!,
          vehicleCount: item._count.id,
        })),
      statuses: Object.values(VehicleStatus),
      alertTiers: Object.values(MaintenanceAlertTier),
      purchaseConditions: allConditions,
      suppliers: allSuppliers,
      companyOwners: allOwners,
    };
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicleType: true,
        manufacturerRef: true,
        modelRef: true,
        defaultDriver: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
        },
        currentImplements: true,
        implementLogs: {
          take: 5,
          orderBy: { attachedAt: 'desc' },
          include: {
            implement: true,
            actor: { select: { id: true, fullName: true } },
          },
        },
        maintenanceRecords: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            technician: { select: { id: true, fullName: true } },
            owedPartNotes: true,
          },
        },
        repairTickets: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTechnician: { select: { id: true, fullName: true } },
          },
        },
        fuelTickets: {
          take: 5,
          orderBy: { dispensedAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Không tìm thấy phương tiện #${id}`);
    }

    return vehicle;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    await this.findOne(id);

    let alertTier: MaintenanceAlertTier | undefined = undefined;
    if (dto.hoursSinceLastService !== undefined) {
      alertTier = this.calculateAlertTier(dto.hoursSinceLastService);
    }

    let manufacturerRefId = dto.manufacturerRefId;
    if (!manufacturerRefId && dto.manufacturer) {
      const mf = await this.prisma.vehicleManufacturer.findFirst({
        where: { name: { equals: dto.manufacturer } },
        select: { id: true },
      });
      if (mf) manufacturerRefId = mf.id;
    }

    let modelRefId = dto.modelRefId;
    if (!modelRefId && dto.modelName && manufacturerRefId) {
      const m = await this.prisma.vehicleModel.findFirst({
        where: { name: { equals: dto.modelName }, manufacturerId: manufacturerRefId },
        select: { id: true },
      });
      if (m) modelRefId = m.id;
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dto,
        ...(manufacturerRefId ? { manufacturerRefId } : {}),
        ...(modelRefId ? { modelRefId } : {}),
        ...(alertTier ? { alertTier } : {}),
      },
      include: {
        vehicleType: true,
        manufacturerRef: true,
        modelRef: true,
        defaultDriver: {
          select: { id: true, fullName: true, phone: true },
        },
        currentImplements: true,
      },
    });
  }

  async updateTelemetry(id: number, dto: UpdateTelemetryDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Không tìm thấy phương tiện #${id}`);
    }

    const addedHours = dto.addedMachineHours || 0;
    const addedKm = dto.addedOdoKm || 0;

    const newTotalHours = vehicle.totalMachineHours + addedHours;
    const newServiceHours = vehicle.hoursSinceLastService + addedHours;
    const newOdoKm = vehicle.odoKm + addedKm;
    const newAlertTier = this.calculateAlertTier(newServiceHours);

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        totalMachineHours: newTotalHours,
        hoursSinceLastService: newServiceHours,
        alertTier: newAlertTier,
        odoKm: newOdoKm,
        currentLat: dto.currentLat ?? vehicle.currentLat,
        currentLng: dto.currentLng ?? vehicle.currentLng,
        currentLocationName: dto.currentLocationName ?? vehicle.currentLocationName,
        status: dto.status ?? vehicle.status,
        lastGpsUpdate: new Date(),
      },
    });
  }

  async getStatistics(filter?: VehicleFilterDto) {
    const where: Prisma.VehicleWhereInput = {};
    if (filter?.assetGroup && filter.assetGroup !== 'ALL') {
      where.assetGroup = filter.assetGroup;
    }
    if (filter?.assignedUnitCode && filter.assignedUnitCode !== 'ALL') {
      where.assignedUnitCode = { contains: filter.assignedUnitCode };
    }
    if (filter?.complexCode && filter.complexCode !== 'ALL') {
      where.complexCode = filter.complexCode;
    }
    if (filter?.regionCode && filter.regionCode !== 'ALL') {
      where.regionCode = filter.regionCode;
    }
    if (filter?.category) {
      where.category = filter.category;
    }
    if (filter?.vehicleTypeCode && filter.vehicleTypeCode !== 'ALL') {
      where.vehicleType = { code: filter.vehicleTypeCode };
    }

    const [
      total,
      running,
      standby,
      maintenance,
      repair,
      waitingDispatch,
      redAlertCount,
      amberAlertCount,
      greenAlertCount,
      gpsAttached,
      unassignedUnit,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.HOAT_DONG } }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.TAM_DUNG } }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.BAO_DUONG } }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.SUA_CHUA } }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.CHO_PHAN_CONG } }),
      this.prisma.vehicle.count({ where: { ...where, alertTier: MaintenanceAlertTier.RED } }),
      this.prisma.vehicle.count({ where: { ...where, alertTier: MaintenanceAlertTier.AMBER } }),
      this.prisma.vehicle.count({ where: { ...where, alertTier: MaintenanceAlertTier.GREEN } }),
      this.prisma.vehicle.count({ where: { ...where, gpsImei: { not: null } } }),
      this.prisma.vehicle.count({
        where: {
          ...where,
          OR: [{ assignedUnitCode: null }, { assignedUnitCode: '' }],
        },
      }),
    ]);

    const availabilityRate = total > 0 ? (((running + waitingDispatch + standby) / total) * 100).toFixed(1) : '0';
    const assignedUnit = total - unassignedUnit;

    return {
      totalVehicles: total,
      running,
      standby,
      maintenance,
      repair,
      waitingDispatch,
      unassignedUnit,
      assignedUnit,
      gpsAttached,
      availabilityRate: `${availabilityRate}%`,
      maintenanceAlerts: {
        red: redAlertCount,
        amber: amberAlertCount,
        green: greenAlertCount,
      },
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }

  async generateNextCode(category?: string, vehicleTypeId?: number, unit?: string) {
    const CATEGORY_ABBREVIATIONS: Record<string, string> = {
      MAY_DAO: 'MĐA',
      MAY_UI: 'MUI',
      XE_BEN: 'XTA',
      MAY_LU: 'XLU',
      XE_BON: 'XBO',
      MAY_SAN: 'BAN',
      XE_TAI: 'XTA',
      MAY_CAY: 'MCA',
      XE_NANG: 'XNA',
      MAY_KEO: 'MKE',
      MAY_XUC_LAT: 'XXL',
      XE_CONTAINER: 'XĐK',
      XE_CONG_VU: 'XCV',
      XE_CHO_NGUOI: 'XCN',
      XE_MAY_2_BANH: 'XMA',
      MAY_PHAT_CO: 'MPC',
      MAY_CUA: 'MCG',
      MAY_BOM: 'MBT',
      MAY_PHAT_DIEN: 'MFĐ',
      THIET_BI_NONG_CU: 'XCA',
      XE_CHUYEN_DUNG: 'XCD',
    };

    const UNIT_PREFIXES: Record<string, string> = {
      DP: 'CHT',
      LP: 'CHT',
      AD: 'KAD',
      'CGLĐ DP': 'CHT',
      'CGTC DP': 'CHT',
      'CGLĐ LP': 'CHT',
      'CGTC LP': 'CHT',
      'Ban Cơ Giới': 'BCG',
      'TT BTSC': 'CHT',
      'XN Chuối DP1': 'XD1',
      'XN Chuối DP2': 'XD2',
      'XN Chuối DP3': 'XD3',
      'XN Chuối DP4': 'XD4',
      'XN Chuối LP1': 'XL1',
      'XN Chuối LP2': 'XL2',
      'XN Chuối LP3': 'XL3',
      'XN Bò AD': 'XB1',
    };

    let typeAbbr = 'MMT';
    let resolvedCategory = category;

    if (vehicleTypeId) {
      const vt = await this.prisma.vehicleType.findUnique({
        where: { id: vehicleTypeId },
        select: { code: true, name: true },
      });
      if (vt) {
        resolvedCategory = vt.code;
      }
    }

    if (resolvedCategory && CATEGORY_ABBREVIATIONS[resolvedCategory]) {
      typeAbbr = CATEGORY_ABBREVIATIONS[resolvedCategory];
    } else if (resolvedCategory) {
      // Create a 3-letter abbreviation from category name
      typeAbbr = resolvedCategory.replace(/[^A-Z]/g, '').slice(0, 3) || 'MMT';
    }

    // Query existing vehicles matching the type
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        OR: [
          { code: { contains: typeAbbr } },
          ...(resolvedCategory ? [{ category: resolvedCategory as any }] : []),
        ],
      },
      select: { code: true },
    });

    let maxNumber = 0;
    for (const v of vehicles) {
      const match = v.code.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber && num < 10000) {
          maxNumber = num;
        }
      }
    }

    const nextNumber = maxNumber + 1;
    const padded = String(nextNumber).padStart(3, '0');
    const unitPfx = (unit && UNIT_PREFIXES[unit]) || 'CHT';
    const code = `${unitPfx}-${typeAbbr}-${padded}`;

    return {
      code,
      nextNumber,
      prefix: `${unitPfx}-${typeAbbr}`,
      category: resolvedCategory || 'MAY_DAO',
    };
  }

  // --------------------------------------------------------------------------
  // MASTER DATA: MANUFACTURERS & MODELS
  // --------------------------------------------------------------------------
  async findAllManufacturers() {
    const list = await this.prisma.vehicleManufacturer.findMany({
      include: {
        _count: { select: { vehicles: true, models: true } },
      },
      orderBy: { name: 'asc' },
    });
    return list.map((item) => ({
      id: item.id,
      name: item.name,
      countryName: item.countryName,
      countryCode: item.countryCode,
      active: item.active,
      vehicleCount: item._count.vehicles,
      modelCount: item._count.models,
    }));
  }

  async createManufacturer(data: { name: string; countryName?: string; countryCode?: string }) {
    const name = data.name.trim().toUpperCase();
    return this.prisma.vehicleManufacturer.create({
      data: {
        name,
        countryName: data.countryName?.trim() || null,
        countryCode: data.countryCode?.trim() || null,
        active: true,
      },
    });
  }

  async updateManufacturer(id: number, data: { name?: string; countryName?: string; countryCode?: string; active?: boolean }) {
    return this.prisma.vehicleManufacturer.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim().toUpperCase() } : {}),
        ...(data.countryName !== undefined ? { countryName: data.countryName?.trim() || null } : {}),
        ...(data.countryCode !== undefined ? { countryCode: data.countryCode?.trim() || null } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  async deleteManufacturer(id: number) {
    return this.prisma.vehicleManufacturer.delete({ where: { id } });
  }

  async findAllModels(manufacturerId?: number) {
    const where: Prisma.VehicleModelWhereInput = {};
    if (manufacturerId) where.manufacturerId = manufacturerId;

    const list = await this.prisma.vehicleModel.findMany({
      where,
      include: {
        manufacturer: { select: { id: true, name: true, countryName: true } },
        _count: { select: { vehicles: true } },
      },
      orderBy: [{ manufacturer: { name: 'asc' } }, { name: 'asc' }],
    });
    return list.map((m) => ({
      id: m.id,
      name: m.name,
      manufacturerId: m.manufacturerId,
      manufacturerName: m.manufacturer?.name,
      countryName: m.manufacturer?.countryName,
      categoryHint: m.categoryHint,
      active: m.active,
      vehicleCount: m._count.vehicles,
    }));
  }

  async createModel(data: { name: string; manufacturerId: number; categoryHint?: any }) {
    return this.prisma.vehicleModel.create({
      data: {
        name: data.name.trim(),
        manufacturerId: data.manufacturerId,
        categoryHint: data.categoryHint || null,
        active: true,
      },
    });
  }

  async updateModel(id: number, data: { name?: string; manufacturerId?: number; categoryHint?: any; active?: boolean }) {
    return this.prisma.vehicleModel.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.manufacturerId ? { manufacturerId: data.manufacturerId } : {}),
        ...(data.categoryHint !== undefined ? { categoryHint: data.categoryHint || null } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  async deleteModel(id: number) {
    return this.prisma.vehicleModel.delete({ where: { id } });
  }

  async mergeCatalogItems(dto: { catalogType: string; sourceNames: string[]; targetName: string }) {
    const { catalogType, sourceNames, targetName } = dto;
    const cleanSources = sourceNames.map((s) => s.trim()).filter((s) => s && s !== targetName.trim());
    const cleanTarget = targetName.trim();
    if (!cleanTarget || cleanSources.length === 0) return { updatedVehicles: 0, removedItems: 0 };

    let updatedVehicles = 0;

    if (catalogType === 'units') {
      const res = await this.prisma.vehicle.updateMany({
        where: { assignedUnitCode: { in: cleanSources } },
        data: { assignedUnitCode: cleanTarget },
      });
      updatedVehicles = res.count;
    } else if (catalogType === 'locations') {
      const res = await this.prisma.vehicle.updateMany({
        where: { currentLocationName: { in: cleanSources } },
        data: { currentLocationName: cleanTarget },
      });
      updatedVehicles = res.count;
    } else if (catalogType === 'purchaseConditions') {
      const res = await this.prisma.vehicle.updateMany({
        where: { purchaseCondition: { in: cleanSources } },
        data: { purchaseCondition: cleanTarget },
      });
      updatedVehicles = res.count;
    } else if (catalogType === 'suppliers') {
      const res1 = await this.prisma.vehicle.updateMany({
        where: { supplier: { in: cleanSources } },
        data: { supplier: cleanTarget },
      });
      const res2 = await this.prisma.vehicle.updateMany({
        where: { companyOwner: { in: cleanSources } },
        data: { companyOwner: cleanTarget },
      });
      updatedVehicles = res1.count + res2.count;
    } else if (catalogType === 'manufacturers') {
      let targetMf = await this.prisma.vehicleManufacturer.findFirst({
        where: { name: cleanTarget.toUpperCase() },
      });
      if (!targetMf) {
        targetMf = await this.prisma.vehicleManufacturer.create({
          data: { name: cleanTarget.toUpperCase(), active: true },
        });
      }
      const sourceMfs = await this.prisma.vehicleManufacturer.findMany({
        where: { name: { in: cleanSources.map((s) => s.toUpperCase()) } },
      });
      const sourceIds = sourceMfs.map((m) => m.id).filter((id) => id !== targetMf.id);
      if (sourceIds.length > 0) {
        await this.prisma.vehicleModel.updateMany({
          where: { manufacturerId: { in: sourceIds } },
          data: { manufacturerId: targetMf.id },
        });
        const res = await this.prisma.vehicle.updateMany({
          where: { manufacturerRefId: { in: sourceIds } },
          data: { manufacturerRefId: targetMf.id, manufacturer: targetMf.name },
        });
        updatedVehicles = res.count;
        await this.prisma.vehicleManufacturer.deleteMany({
          where: { id: { in: sourceIds } },
        });
      }
    } else if (catalogType === 'models') {
      const sourceModels = await this.prisma.vehicleModel.findMany({
        where: { name: { in: cleanSources } },
      });
      const sourceIds = sourceModels.map((m) => m.id);
      const targetModel = await this.prisma.vehicleModel.findFirst({
        where: { name: cleanTarget },
      });
      if (targetModel && sourceIds.length > 0) {
        const sourceIdsFiltered = sourceIds.filter((id) => id !== targetModel.id);
        const res = await this.prisma.vehicle.updateMany({
          where: { modelRefId: { in: sourceIdsFiltered } },
          data: { modelRefId: targetModel.id },
        });
        updatedVehicles = res.count;
        await this.prisma.vehicleModel.deleteMany({
          where: { id: { in: sourceIdsFiltered } },
        });
      }
    }

    return { updatedVehicles, removedItems: cleanSources.length };
  }
}
