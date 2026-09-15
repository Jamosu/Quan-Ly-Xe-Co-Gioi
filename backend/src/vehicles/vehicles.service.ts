import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceAlertTier,
  OperationalLocationType,
  Prisma,
  VehicleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateTelemetryDto } from './dto/update-telemetry.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';
import { FleetHistoryFilterDto } from './dto/fleet-history-filter.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService, private readonly maintenance: MaintenanceService) {}

  private async resolveHomeDepotId(dto: {
    homeDepotId?: number;
    currentLocationName?: string;
    complexCode?: string;
  }) {
    if (dto.homeDepotId) {
      const depot = await this.prisma.operationalLocation.findFirst({
        where: {
          id: dto.homeDepotId,
          type: OperationalLocationType.DEPOT,
          active: true,
        },
        select: { id: true },
      });
      if (!depot) {
        throw new NotFoundException(`Không tìm thấy bãi tập kết #${dto.homeDepotId}`);
      }
      return depot.id;
    }

    const locationName = dto.currentLocationName?.trim();
    if (!locationName) return undefined;

    const depot = await this.prisma.operationalLocation.findFirst({
      where: {
        name: locationName,
        type: OperationalLocationType.DEPOT,
        active: true,
        ...(dto.complexCode ? { complexCode: dto.complexCode } : {}),
      },
      select: { id: true },
    });
    return depot?.id;
  }

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
    const homeDepotId = await this.resolveHomeDepotId(dto);

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

    const created = await this.prisma.vehicle.create({
      data: {
        ...dto,
        manufacturerRefId,
        modelRefId,
        homeDepotId,
        alertTier,
      },
      include: {
        defaultDriver: {
          select: { id: true, fullName: true, phone: true },
        },
        vehicleType: true,
        homeDepot: true,
        manufacturerRef: true,
        modelRef: true,
        currentImplements: true,
      },
    });
    await this.maintenance.refreshVehicleOccurrences(created.id);
    return created;
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
      operationalDomain,
      isAssignable,
      hasGps,
    } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};

    if (complexCode && complexCode !== 'ALL') where.complexCode = complexCode;
    if (category) where.category = category;
    if (assetGroup) where.assetGroup = assetGroup;
    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;
    if (vehicleTypeCode || operationalDomain || isAssignable !== undefined) {
      where.vehicleType = {
        ...(vehicleTypeCode ? { code: vehicleTypeCode } : {}),
        ...(operationalDomain ? { operationalDomain } : {}),
        ...(isAssignable !== undefined ? { isAssignable } : {}),
      };
    }
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
    if (hasGps === true) where.gpsImei = { not: null };
    if (hasGps === false) where.gpsImei = null;

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
              operationalDomain: true,
              implementRequirement: true,
              isAssignable: true,
            },
          },
          defaultDriver: {
            select: { id: true, fullName: true, phone: true },
          },
          homeDepot: true,
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
              operationalDomain: true,
              implementRequirement: true,
              isAssignable: true,
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
          homeDepot: true,
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
            select: { id: true, code: true, name: true, assetGroup: true },
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
      if (filter.vehicleTypeCode || filter.operationalDomain || filter.isAssignable !== undefined) {
        baseWhere.vehicleType = {
          ...(filter.vehicleTypeCode ? { code: filter.vehicleTypeCode } : {}),
          ...(filter.operationalDomain ? { operationalDomain: filter.operationalDomain } : {}),
          ...(filter.isAssignable !== undefined ? { isAssignable: filter.isAssignable } : {}),
        };
      }
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
      if (filter.hasGps === true) baseWhere.gpsImei = { not: null };
      if (filter.hasGps === false) baseWhere.gpsImei = null;
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
        homeDepot: true,
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

    const homeDepotId = await this.resolveHomeDepotId(dto);

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

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dto,
        ...(manufacturerRefId ? { manufacturerRefId } : {}),
        ...(modelRefId ? { modelRefId } : {}),
        ...(homeDepotId ? { homeDepotId } : {}),
        ...(alertTier ? { alertTier } : {}),
      },
      include: {
        vehicleType: true,
        manufacturerRef: true,
        modelRef: true,
        homeDepot: true,
        defaultDriver: {
          select: { id: true, fullName: true, phone: true },
        },
        currentImplements: true,
      },
    });
    await this.maintenance.refreshVehicleOccurrences(id);
    return updated;
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

    const updated = await this.prisma.vehicle.update({
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
    await this.maintenance.refreshVehicleOccurrences(id);
    return updated;
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
    if ((filter?.vehicleTypeCode && filter.vehicleTypeCode !== 'ALL') || filter?.operationalDomain || filter?.isAssignable !== undefined) {
      where.vehicleType = {
        ...(filter?.vehicleTypeCode && filter.vehicleTypeCode !== 'ALL' ? { code: filter.vehicleTypeCode } : {}),
        ...(filter?.operationalDomain ? { operationalDomain: filter.operationalDomain } : {}),
        ...(filter?.isAssignable !== undefined ? { isAssignable: filter.isAssignable } : {}),
      };
    }
    if (filter?.hasGps === true) where.gpsImei = { not: null };
    if (filter?.hasGps === false) where.gpsImei = null;

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

  async getSosAlerts() {
    try {
      return await this.prisma.driverSosAlert.findMany({
        include: {
          driver: { select: { id: true, fullName: true, phone: true } },
          vehicle: { select: { id: true, code: true, plate: true, name: true, category: true, complexCode: true, assignedUnitCode: true } },
          workshopRequest: { select: { id: true, code: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      try {
        await this.prisma.$executeRawUnsafe(
          "UPDATE driver_sos_alerts SET status = 'PENDING' WHERE status NOT IN ('PENDING', 'DISPATCHED', 'RESOLVED') OR status IS NULL OR status = ''"
        );
        return await this.prisma.driverSosAlert.findMany({
          include: {
            driver: { select: { id: true, fullName: true, phone: true } },
            vehicle: { select: { id: true, code: true, plate: true, name: true, category: true, complexCode: true, assignedUnitCode: true } },
            workshopRequest: { select: { id: true, code: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch {
        return [];
      }
    }
  }

  private formatVNDate(d: Date | string | null | undefined): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }

  async getFleetHistoryEvents(filter: FleetHistoryFilterDto) {
    const {
      complexCode,
      unit,
      search,
      type = 'ALL',
      vehicleId,
      page = 1,
      limit = 30,
    } = filter;

    const vehicleWhere: Prisma.VehicleWhereInput = {};
    if (complexCode && complexCode !== 'ALL' && complexCode !== 'ALL_KLH') {
      vehicleWhere.complexCode = complexCode;
    }
    if (unit && unit !== 'ALL') {
      vehicleWhere.unit = unit as any;
    }
    if (vehicleId) {
      vehicleWhere.id = Number(vehicleId);
    }

    const events: any[] = [];

    // 1. WORKSHOP REQUESTS (Bảo dưỡng & Sửa chữa BTSC)
    if (type === 'ALL' || type === 'bts') {
      try {
        const wrWhere: Prisma.WorkshopRequestWhereInput = {};
        if (Object.keys(vehicleWhere).length > 0) {
          wrWhere.vehicle = vehicleWhere;
        }
        if (search) {
          wrWhere.OR = [
            { code: { contains: search } },
            { issueDescription: { contains: search } },
            { vehicle: { code: { contains: search } } },
            { vehicle: { plate: { contains: search } } },
            { vehicle: { name: { contains: search } } },
          ];
        }
        const workshopRequests = await this.prisma.workshopRequest.findMany({
          where: wrWhere,
          include: {
            vehicle: {
              select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true, assignedUnitCode: true },
            },
            reportedBy: {
              select: { id: true, fullName: true, phone: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });

        for (const wr of workshopRequests) {
          const v = wr.vehicle;
          const reporterName = wr.reportedBy?.fullName || 'Bộ phận Kỹ thuật';
          const unitName = v?.assignedUnitCode || v?.unit || 'Xưởng BTSC';
          const typeLabel = wr.type === 'MAINTENANCE' ? 'Bảo dưỡng định kỳ' : 'Sửa chữa phục hồi kỹ thuật';
          events.push({
            id: `WR-${wr.id}`,
            code: wr.code,
            title: `Phiếu xưởng ${wr.code}: ${v?.name || 'Phương tiện'} (${v?.plate || v?.code || 'Chưa gắn biển'})`,
            description: wr.issueDescription || `${typeLabel} tại xưởng BTSC`,
            meta: `${this.formatVNDate(wr.createdAt)} • ${unitName} • KTV/Người lập: ${reporterName}`,
            actionText: 'Xem phiếu xưởng',
            badgeType: 'bts',
            createdAt: wr.createdAt,
            vehicleId: v?.id,
            vehicleCode: v?.code,
            vehicleName: v?.name,
            plate: v?.plate,
            unit: v?.unit,
            complexCode: v?.complexCode,
          });
        }
      } catch (err) {
        console.error('Lỗi truy vấn WorkshopRequest trong getFleetHistoryEvents:', err);
      }
    }

    // 2. VEHICLE DRIVER ASSIGNMENTS (Đổi/Phân công tài xế)
    if (type === 'ALL' || type === 'driver') {
      try {
        const vdaWhere: Prisma.VehicleDriverAssignmentWhereInput = {};
        if (Object.keys(vehicleWhere).length > 0) {
          vdaWhere.vehicle = vehicleWhere;
        }
        if (search) {
          vdaWhere.OR = [
            { reason: { contains: search } },
            { vehicle: { code: { contains: search } } },
            { vehicle: { plate: { contains: search } } },
            { vehicle: { name: { contains: search } } },
            { driver: { user: { fullName: { contains: search } } } },
          ];
        }
        const driverAssignments = await this.prisma.vehicleDriverAssignment.findMany({
          where: vdaWhere,
          include: {
            vehicle: {
              select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true, assignedUnitCode: true },
            },
            driver: {
              include: {
                user: { select: { id: true, fullName: true, phone: true } },
              },
            },
            assignedBy: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });

        for (const vda of driverAssignments) {
          const v = vda.vehicle;
          const driverName = vda.driver?.user?.fullName || 'Tài xế';
          const assignerName = vda.assignedBy?.fullName || 'Điều phối viên';
          const typeStr = vda.type === 'PRIMARY' ? 'Lái chính' : vda.type === 'SECONDARY' ? 'Lái phụ' : 'Tạm thời';
          events.push({
            id: `VDA-${vda.id}`,
            code: `PC-LX-${vda.id}`,
            title: `Phân công ${typeStr}: ${driverName} - Xe ${v?.name || ''} (${v?.plate || v?.code || ''})`,
            description: vda.reason || `Bàn giao quyền điều khiển phương tiện cho tài xế ${driverName} (${typeStr})`,
            meta: `${this.formatVNDate(vda.effectiveFrom || vda.createdAt)} • ${v?.assignedUnitCode || v?.unit || 'Đội xe'} • Người duyệt: ${assignerName}`,
            actionText: 'Xem hồ sơ lái xe',
            badgeType: 'driver',
            createdAt: vda.effectiveFrom || vda.createdAt,
            vehicleId: v?.id,
            vehicleCode: v?.code,
            vehicleName: v?.name,
            plate: v?.plate,
            unit: v?.unit,
            complexCode: v?.complexCode,
          });
        }
      } catch (err) {
        console.error('Lỗi truy vấn VehicleDriverAssignment trong getFleetHistoryEvents:', err);
      }
    }

    // 3. FUEL DISPENSE TICKETS (Cấp phát nhiên liệu)
    if (type === 'ALL' || type === 'fuel') {
      try {
        const fuelWhere: Prisma.FuelDispenseTicketWhereInput = {};
        if (Object.keys(vehicleWhere).length > 0) {
          fuelWhere.vehicle = vehicleWhere;
        }
        if (search) {
          fuelWhere.OR = [
            { ticketCode: { contains: search } },
            { vehicle: { code: { contains: search } } },
            { vehicle: { plate: { contains: search } } },
            { vehicle: { name: { contains: search } } },
            { driver: { fullName: { contains: search } } },
          ];
        }
        const fuelTickets = await this.prisma.fuelDispenseTicket.findMany({
          where: fuelWhere,
          include: {
            vehicle: {
              select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true, assignedUnitCode: true },
            },
            warehouse: {
              select: { id: true, name: true },
            },
            operator: {
              select: { id: true, fullName: true },
            },
            driver: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { dispensedAt: 'desc' },
          take: 200,
        });

        for (const ft of fuelTickets) {
          const v = ft.vehicle;
          const operatorName = ft.operator?.fullName || ft.driver?.fullName || 'Thủ kho xăng dầu';
          const whName = ft.warehouse?.name || 'Kho nhiên liệu';
          const excessText = ft.isExcess ? ` (Vượt định mức ${ft.varianceLiters.toFixed(1)}L)` : ' (Đúng định mức)';
          events.push({
            id: `FUEL-${ft.id}`,
            code: ft.ticketCode,
            title: `Cấp phát ${ft.dispensedLiters}L dầu DO - Phiếu ${ft.ticketCode}`,
            description: `Cấp nhiên liệu tại ${whName} cho xe ${v?.name || ''} (${v?.plate || v?.code || ''}). Chỉ số máy/ODO: ${ft.engineOdoHours}${excessText}.`,
            meta: `${this.formatVNDate(ft.dispensedAt)} • ${whName} • Thủ kho: ${operatorName}`,
            actionText: 'Xem phiếu cấp dầu',
            badgeType: 'fuel',
            createdAt: ft.dispensedAt,
            vehicleId: v?.id,
            vehicleCode: v?.code,
            vehicleName: v?.name,
            plate: v?.plate,
            unit: v?.unit,
            complexCode: v?.complexCode,
          });
        }
      } catch (err) {
        console.error('Lỗi truy vấn FuelDispenseTicket trong getFleetHistoryEvents:', err);
      }
    }

    // 4. MAINTENANCE RECORDS (Bảo dưỡng định kỳ mốc giờ)
    if (type === 'ALL' || type === 'bts') {
      try {
        const mrWhere: Prisma.MaintenanceRecordWhereInput = {};
        if (Object.keys(vehicleWhere).length > 0) {
          mrWhere.vehicle = vehicleWhere;
        }
        if (search) {
          mrWhere.OR = [
            { conclusion: { contains: search } },
            { vehicle: { code: { contains: search } } },
            { vehicle: { plate: { contains: search } } },
            { vehicle: { name: { contains: search } } },
          ];
        }
        const maintenanceRecords = await this.prisma.maintenanceRecord.findMany({
          where: mrWhere,
          include: {
            vehicle: {
              select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true, assignedUnitCode: true },
            },
            technician: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        for (const mr of maintenanceRecords) {
          const v = mr.vehicle;
          const techName = mr.technician?.fullName || 'KTV Cơ điện';
          events.push({
            id: `MR-${mr.id}`,
            code: `BD-${mr.id}`,
            title: `Bảo dưỡng định kỳ cấp ${mr.level} - Mốc ${mr.currentHours}h máy`,
            description: mr.conclusion || `Thực hiện bảo dưỡng định kỳ kỹ thuật theo tiêu chuẩn mốc ${mr.currentHours}h máy cho xe ${v?.name} (${v?.plate || v?.code}).`,
            meta: `${this.formatVNDate(mr.createdAt)} • Xưởng BTSC • KTV: ${techName}`,
            actionText: 'Xem biên bản bảo dưỡng',
            badgeType: 'bts',
            createdAt: mr.createdAt,
            vehicleId: v?.id,
            vehicleCode: v?.code,
            vehicleName: v?.name,
            plate: v?.plate,
            unit: v?.unit,
            complexCode: v?.complexCode,
          });
        }
      } catch (err) {
        console.error('Lỗi truy vấn MaintenanceRecord trong getFleetHistoryEvents:', err);
      }
    }

    // 5. VEHICLE ALLOCATIONS / DELIVERY (Bàn giao & phân bổ xe)
    if (type === 'ALL' || type === 'delivery') {
      try {
        const allocWhere: Prisma.VehicleWhereInput = {
          ...vehicleWhere,
        };
        if (search) {
          allocWhere.OR = [
            { code: { contains: search } },
            { plate: { contains: search } },
            { name: { contains: search } },
            { transferHistory: { contains: search } },
          ];
        }
        const allocVehicles = await this.prisma.vehicle.findMany({
          where: allocWhere,
          select: {
            id: true,
            code: true,
            plate: true,
            name: true,
            unit: true,
            complexCode: true,
            assignedUnitCode: true,
            allocationDate: true,
            transferHistory: true,
            managerName: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        for (const v of allocVehicles) {
          const date = v.allocationDate || v.createdAt;
          const unitLabel = v.assignedUnitCode || v.unit || 'Ban Cơ Giới KLH';
          events.push({
            id: `ALLOC-${v.id}`,
            code: `QĐ-PB-${v.code}`,
            title: `Bàn giao & phân bổ phương tiện: ${v.name} (${v.plate || v.code})`,
            description: v.transferHistory || `Phân bổ quyền quản lý sử dụng xe về đơn vị ${unitLabel} thuộc Khu liên hợp ${v.complexCode}.`,
            meta: `${this.formatVNDate(date)} • Ban Cơ Giới KLH • Quản lý: ${v.managerName || 'Bộ phận Quản lý Xe'}`,
            actionText: 'Xem quyết định phân bổ',
            badgeType: 'delivery',
            createdAt: date,
            vehicleId: v.id,
            vehicleCode: v.code,
            vehicleName: v.name,
            plate: v.plate,
            unit: v.unit,
            complexCode: v.complexCode,
          });
        }
      } catch (err) {
        console.error('Lỗi truy vấn Vehicle Allocations trong getFleetHistoryEvents:', err);
      }
    }

    // Sắp xếp thời gian giảm dần
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Thống kê KPIs thực tế
    const stats = {
      totalEvents: events.length,
      btsCount: events.filter(e => e.badgeType === 'bts').length,
      driverCount: events.filter(e => e.badgeType === 'driver').length,
      fuelCount: events.filter(e => e.badgeType === 'fuel').length,
      deliveryCount: events.filter(e => e.badgeType === 'delivery').length,
    };

    // Phân trang
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedEvents = events.slice(startIndex, startIndex + limitNum);

    return {
      data: paginatedEvents,
      total: events.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(events.length / limitNum) || 1,
      stats,
    };
  }
}
