import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceAlertTier,
  AlertCategory,
  AlertSeverity,
  CatalogType,
  OperationalEntityType,
  OperationalLocationType,
  Prisma,
  Role,
  Unit,
  WorkOrderStatus,
  VehicleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateTelemetryDto } from './dto/update-telemetry.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';
import { FleetHistoryFilterDto } from './dto/fleet-history-filter.dto';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { OperationalActor } from '../common/utils/operational-access';
import { assertManagementUnitAccess, scopedManagementUnitIds } from '../common/utils/management-scope';
import { canonicalizeMasterDataValues } from '../common/utils/master-data-normalization';
import { normalizeMasterDataKey } from '../common/utils/master-data-normalization';
import {
  isLiquidatedAssignedUnit,
  LIQUIDATED_ASSIGNED_UNIT,
  liquidatedVehicleWhere,
} from '../common/utils/vehicle-lifecycle';

export const isMovingLongEnough = (speedKmH: number | null | undefined, movingSince: Date | null | undefined, now: Date) =>
  speedKmH !== null && speedKmH !== undefined && speedKmH > 5 && !!movingSince && now.getTime() - movingSince.getTime() >= 60_000;

export const summarizeVehicleCounts = (counts: { vehicles: number; activeVehicles: number }) => ({
  total: counts.vehicles,
  active: counts.activeVehicles,
});

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService, private readonly maintenance: MaintenanceService) {}

  private async canonicalCatalogValue(type: CatalogType, value?: string | null): Promise<string | null | undefined> {
    if (value === undefined || value === null) return value;
    const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
    const normalizedKey = normalizeMasterDataKey(name);
    if (!normalizedKey) return null;
    const existing = await this.prisma.catalogItem.findUnique({
      where: { type_normalizedKey: { type, normalizedKey } },
      select: { name: true },
    });
    if (existing) return existing.name;
    const id = `${type}-${Buffer.from(normalizedKey).toString('base64url').slice(0, 48)}`;
    const item = await this.prisma.catalogItem.upsert({
      where: { id },
      update: {},
      create: { id, code: id, name, normalizedKey, type },
      select: { name: true },
    });
    return item.name;
  }

  private async canonicalVehicleReferences(dto: Pick<CreateVehicleDto, 'origin' | 'purchaseCondition' | 'supplier' | 'companyOwner' | 'assignedUnitCode' | 'currentLocationName'>) {
    const [origin, purchaseCondition, supplier, companyOwner, units, locations] = await Promise.all([
      this.canonicalCatalogValue(CatalogType.VEHICLE_ORIGIN, dto.origin),
      this.canonicalCatalogValue(CatalogType.PURCHASE_CONDITION, dto.purchaseCondition),
      this.canonicalCatalogValue(CatalogType.SUPPLIER, dto.supplier),
      this.canonicalCatalogValue(CatalogType.COMPANY_OWNER, dto.companyOwner),
      dto.assignedUnitCode ? this.prisma.driverManagementUnit.findMany({ where: { status: 'ACTIVE' }, select: { name: true, code: true } }) : [],
      dto.currentLocationName ? this.prisma.operationalLocation.findMany({ where: { active: true }, select: { name: true } }) : [],
    ]);
    const assignedUnitCode = dto.assignedUnitCode === undefined ? undefined : dto.assignedUnitCode === null ? null
      : canonicalizeMasterDataValues([dto.assignedUnitCode], units.flatMap((item) => [item.name, item.code]))[0] || null;
    const currentLocationName = dto.currentLocationName === undefined ? undefined : dto.currentLocationName === null ? null
      : canonicalizeMasterDataValues([dto.currentLocationName], locations.map((item) => item.name))[0] || null;
    return { origin, purchaseCondition, supplier, companyOwner, assignedUnitCode, currentLocationName };
  }

  private async vehicleScope(actor: OperationalActor): Promise<Prisma.VehicleWhereInput> {
    if (actor.role === Role.SUPER_ADMIN || actor.role === Role.DISPATCHER) return {};
    if (actor.role === Role.DRIVER) {
      return { OR: [{ defaultDriverId: actor.id }, { secondaryDriverId: actor.id }, { assignedUsers: { some: { id: actor.id } } }] };
    }
    const allowedIds = await scopedManagementUnitIds(this.prisma, actor);
    return { managementUnitId: { in: allowedIds ?? [] } };
  }

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

  async create(dto: CreateVehicleDto, actor: OperationalActor) {
    await assertManagementUnitAccess(this.prisma, actor, dto.managementUnitId);
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
    const canonicalReferences = await this.canonicalVehicleReferences(dto);

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
        ...canonicalReferences,
        manufacturerRefId,
        modelRefId,
        homeDepotId,
        alertTier,
        lastGpsUpdate: dto.lastGpsUpdate ? new Date(dto.lastGpsUpdate) : new Date(),
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

  async findAll(filter: VehicleFilterDto, actor: OperationalActor) {
    const {
      page = 1,
      limit = 20,
      search,
      complexCode,
      managementUnitId,
      managerUserId,
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
      hasDriver,
    } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};
    if (managementUnitId) await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    Object.assign(where, managementUnitId ? { managementUnitId } : await this.vehicleScope(actor));
    if (managerUserId) {
      if (managerUserId === -1) {
        const now = new Date();
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ managerName: null }, { managerName: '' }] },
          {
            OR: [
              { managementUnitId: null },
              { managementUnit: { managerAssignments: { none: { managerType: 'PRIMARY', effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] } } } },
            ],
          },
        ];
      } else {
        const now = new Date();
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            managementUnit: {
              managerAssignments: {
                some: {
                  managerUserId,
                  managerType: 'PRIMARY',
                  effectiveFrom: { lte: now },
                  OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
                },
              },
            },
          },
        ];
      }
    }

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
    if (regionCode) {
      if (regionCode === '__UNASSIGNED__' || regionCode === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ regionCode: null }, { regionCode: '' }] },
        ];
      } else {
        where.regionCode = regionCode;
      }
    }
    if (assignedUnitCode) {
      if (assignedUnitCode === '__UNASSIGNED__' || assignedUnitCode === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { managementUnitId: null },
        ];
      } else {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { managementUnit: { name: assignedUnitCode } },
        ];
      }
    }
    if (currentLocationName) {
      if (currentLocationName === '__UNASSIGNED__' || currentLocationName === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { homeDepotId: null },
        ];
      } else {
        where.homeDepot = { name: currentLocationName };
      }
    }
    if (bravoCode) where.bravoCode = { contains: bravoCode };
    if (manufacturerRefId) where.manufacturerRefId = manufacturerRefId;
    else if (manufacturer) {
      if (manufacturer === '__UNASSIGNED__' || manufacturer === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ manufacturer: null }, { manufacturer: '' }] },
        ];
      } else {
        where.manufacturer = { contains: manufacturer };
      }
    }
    if (modelRefId) where.modelRefId = modelRefId;
    else if (modelName) {
      if (modelName === '__UNASSIGNED__' || modelName === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ modelName: null }, { modelName: '' }] },
        ];
      } else {
        where.modelName = { contains: modelName };
      }
    }
    if (origin) {
      if (origin === '__UNASSIGNED__' || origin === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ origin: null }, { origin: '' }] },
        ];
      } else {
        where.origin = { contains: origin };
      }
    }
    if (manufactureYear) {
      if (manufactureYear === -1) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ manufactureYear: null }, { manufactureYear: 0 }] },
        ];
      } else {
        where.manufactureYear = manufactureYear;
      }
    }
    if (status === 'LIQUIDATED') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { status: VehicleStatus.TAM_DUNG },
        liquidatedVehicleWhere,
      ];
    } else if (status === VehicleStatus.TAM_DUNG) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { status: VehicleStatus.TAM_DUNG },
        { NOT: liquidatedVehicleWhere },
      ];
    } else if (status) {
      if (status === 'HOAT_DONG' || status === 'SAN_SANG' || status === 'READY') {
        where.status = { in: [VehicleStatus.HOAT_DONG, VehicleStatus.CHO_PHAN_CONG] };
      } else if (Object.values(VehicleStatus).includes(status as VehicleStatus)) {
        where.status = status as VehicleStatus;
      }
    }
    if (hasGps === true) where.gpsImei = { not: null };
    if (hasGps === false) where.gpsImei = null;
    if (hasDriver === true) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { defaultDriverId: { not: null } },
            { managerName: { not: null } },
          ],
        },
      ];
    } else if (hasDriver === false) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { defaultDriverId: null },
        { OR: [{ managerName: null }, { managerName: '' }] },
      ];
    }

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
          managementUnit: {
            select: {
              id: true,
              code: true,
              name: true,
              complexCode: true,
              mainDepot: true,
              managerAssignments: {
                where: { managerType: 'PRIMARY', effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
                select: { manager: { select: { id: true, fullName: true, phone: true } } },
                orderBy: { effectiveFrom: 'desc' },
                take: 1,
              },
            },
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
          managementUnit: {
            select: {
              id: true,
              code: true,
              name: true,
              complexCode: true,
              mainDepot: true,
              managerAssignments: {
                where: { managerType: 'PRIMARY', effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
                select: { manager: { select: { id: true, fullName: true, phone: true } } },
                orderBy: { effectiveFrom: 'desc' },
                take: 1,
              },
            },
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

  async findAssignments(filter: VehicleFilterDto, actor: OperationalActor) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 4000;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};
    if (filter.managementUnitId) await assertManagementUnitAccess(this.prisma, actor, filter.managementUnitId);
    Object.assign(where, filter.managementUnitId ? { managementUnitId: filter.managementUnitId } : await this.vehicleScope(actor));
    if (filter.complexCode && filter.complexCode !== 'ALL') {
      where.complexCode = filter.complexCode;
    }
    if (filter.isAssignable !== undefined) {
      where.vehicleType = { isAssignable: filter.isAssignable };
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
          managementUnitId: true,
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

  async getFilterOptions(filter: VehicleFilterDto | undefined, actor: OperationalActor) {
    const nonNull = { not: null };
    const VALID_COUNTRIES = new Set([
      'VIỆT NAM', 'NHẬT BẢN', 'HÀN QUỐC', 'TRUNG QUỐC', 'MỸ', 'ĐỨC', 'THỔ NHĨ KỲ', 'ẤN ĐỘ',
      'THÁI LAN', 'CAMPUCHIA', 'BELARUS', 'NGA', 'ITALIA', 'BRAZIL', 'ĐÀI LOAN', 'ANH',
      'PHÁP', 'TÂY BAN NHA', 'THỤY ĐIỂN', 'CANADA', 'BA LAN', 'INDONESIA', 'MALAYSIA',
    ]);

    const actorScope = await this.vehicleScope(actor);

    // Helper to build scoped where condition while omitting a specific dimension (for self-filtering)
    const buildFilterWhere = (omitField?: string): Prisma.VehicleWhereInput => {
      const where: Prisma.VehicleWhereInput = { ...actorScope };
      if (!filter) return where;
      if (omitField !== 'complexCode' && filter.complexCode && filter.complexCode !== 'ALL') where.complexCode = filter.complexCode;
      if (omitField !== 'category' && filter.category) where.category = filter.category;
      if (omitField !== 'assetGroup' && filter.assetGroup) where.assetGroup = filter.assetGroup;
      if (omitField !== 'vehicleTypeId' && filter.vehicleTypeId) where.vehicleTypeId = filter.vehicleTypeId;
      if (filter.vehicleTypeCode || filter.operationalDomain || filter.isAssignable !== undefined) {
        where.vehicleType = {
          ...(filter.vehicleTypeCode ? { code: filter.vehicleTypeCode } : {}),
          ...(filter.operationalDomain ? { operationalDomain: filter.operationalDomain } : {}),
          ...(filter.isAssignable !== undefined ? { isAssignable: filter.isAssignable } : {}),
        };
      }
      if (omitField !== 'unit' && filter.unit) where.unit = filter.unit;
      if (omitField !== 'regionCode' && filter.regionCode) {
        if (filter.regionCode === '__UNASSIGNED__' || filter.regionCode === 'UNASSIGNED') {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { OR: [{ regionCode: null }, { regionCode: '' }] },
          ];
        } else {
          where.regionCode = filter.regionCode;
        }
      }
      if (omitField !== 'assignedUnitCode' && filter.assignedUnitCode) {
        if (filter.assignedUnitCode === '__UNASSIGNED__' || filter.assignedUnitCode === 'UNASSIGNED') {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { managementUnitId: null },
          ];
        } else {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { managementUnit: { name: filter.assignedUnitCode } },
          ];
        }
      }
      if (omitField !== 'currentLocationName' && filter.currentLocationName) {
        if (filter.currentLocationName === '__UNASSIGNED__' || filter.currentLocationName === 'UNASSIGNED') {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { homeDepotId: null },
          ];
        } else {
          where.homeDepot = { name: filter.currentLocationName };
        }
      }
      if (omitField !== 'bravoCode' && filter.bravoCode) where.bravoCode = { contains: filter.bravoCode };
      if (omitField !== 'manufacturer' && filter.manufacturerRefId) where.manufacturerRefId = filter.manufacturerRefId;
      else if (omitField !== 'manufacturer' && filter.manufacturer) {
        if (filter.manufacturer === '__UNASSIGNED__' || filter.manufacturer === 'UNASSIGNED') {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { OR: [{ manufacturer: null }, { manufacturer: '' }] },
          ];
        } else {
          where.manufacturer = { contains: filter.manufacturer };
        }
      }
      if (omitField !== 'model' && filter.modelRefId) where.modelRefId = filter.modelRefId;
      else if (omitField !== 'model' && filter.modelName) {
        if (filter.modelName === '__UNASSIGNED__' || filter.modelName === 'UNASSIGNED') {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { OR: [{ modelName: null }, { modelName: '' }] },
          ];
        } else {
          where.modelName = { contains: filter.modelName };
        }
      }
      if (omitField !== 'origin' && filter.origin) {
        if (filter.origin === '__UNASSIGNED__' || filter.origin === 'UNASSIGNED') {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { OR: [{ origin: null }, { origin: '' }] },
          ];
        } else {
          where.origin = filter.origin;
        }
      }
      if (omitField !== 'manufactureYear' && filter.manufactureYear) {
        if (filter.manufactureYear === -1) {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { OR: [{ manufactureYear: null }, { manufactureYear: 0 }] },
          ];
        } else {
          where.manufactureYear = filter.manufactureYear;
        }
      }
      if (omitField !== 'status' && filter.status) {
        if (filter.status === 'HOAT_DONG' || filter.status === 'SAN_SANG' || filter.status === 'READY') {
          where.status = { in: [VehicleStatus.HOAT_DONG, VehicleStatus.CHO_PHAN_CONG] };
        } else if (Object.values(VehicleStatus).includes(filter.status as VehicleStatus)) {
          where.status = filter.status as VehicleStatus;
        }
      }
      if (omitField !== 'alertTier' && filter.alertTier) where.alertTier = filter.alertTier;
      if (omitField !== 'manager' && filter.managerUserId) {
        if (filter.managerUserId === -1) {
          const now = new Date();
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { OR: [{ managerName: null }, { managerName: '' }] },
            {
              OR: [
                { managementUnitId: null },
                { managementUnit: { managerAssignments: { none: { managerType: 'PRIMARY', effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] } } } },
              ],
            },
          ];
        } else {
          const now = new Date();
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            {
              managementUnit: {
                managerAssignments: {
                  some: {
                    managerUserId: filter.managerUserId,
                    managerType: 'PRIMARY',
                    effectiveFrom: { lte: now },
                    OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
                  },
                },
              },
            },
          ];
        }
      }
      if (filter.hasGps === true) where.gpsImei = { not: null };
      if (filter.hasGps === false) where.gpsImei = null;
      if (filter.hasDriver === true) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ defaultDriverId: { not: null } }, { managerName: { not: null } }] },
        ];
      } else if (filter.hasDriver === false) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { defaultDriverId: null },
          { OR: [{ managerName: null }, { managerName: '' }] },
        ];
      }
      return where;
    };

    const baseWhere = buildFilterWhere();
    const whereForYears = buildFilterWhere('manufactureYear');
    const whereForOrigins = buildFilterWhere('origin');
    const whereForUnits = buildFilterWhere('assignedUnitCode');
    const whereForLocations = buildFilterWhere('currentLocationName');
    const whereForManagers = buildFilterWhere('manager');
    const whereForManufacturers = buildFilterWhere('manufacturer');
    const whereForModels = buildFilterWhere('model');
    const whereForRegions = buildFilterWhere('regionCode');

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
      catalogUnits,
      catalogLocations,
      referenceCatalogs,
      managerAssignments,
      unassignedUnitCount,
      unassignedLocationCount,
      unassignedManagerCount,
      unassignedManufacturerCount,
      unassignedModelCount,
      unassignedOriginCount,
      unassignedYearCount,
      unassignedRegionCount,
    ] = await Promise.all([
      this.prisma.vehicle.groupBy({
        by: ['complexCode'],
        _count: { id: true },
        where: { ...baseWhere, complexCode: { not: '' } },
        orderBy: { complexCode: 'asc' },
      }),
      this.prisma.vehicle.groupBy({
        by: ['regionCode'],
        _count: { id: true },
        where: {
          ...baseWhere,
          regionCode: nonNull,
        },
        orderBy: { regionCode: 'asc' },
      }),
      this.prisma.driverManagementUnit.findMany({
        where: {
          status: 'ACTIVE',
          vehicles: { some: whereForUnits },
        },
        select: { name: true, _count: { select: { vehicles: { where: whereForUnits } } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.operationalLocation.findMany({
        where: {
          active: true,
          depotVehicles: { some: whereForLocations },
        },
        select: { name: true, _count: { select: { depotVehicles: { where: whereForLocations } } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.vehicle.groupBy({
        by: ['assetGroup'],
        _count: { id: true },
        where: {
          ...baseWhere,
          assetGroup: nonNull,
        },
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
        where: {
          active: true,
          ...(filter?.isAssignable !== undefined ? { isAssignable: filter.isAssignable } : {}),
          ...(filter?.operationalDomain ? { operationalDomain: filter.operationalDomain } : {}),
          ...(filter?.assetGroup ? { assetGroup: filter.assetGroup } : {}),
          vehicles: { some: baseWhere },
        },
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
      this.prisma.driverManagementUnit.findMany({
        where: {
          status: 'ACTIVE',
          ...(filter?.complexCode && filter.complexCode !== 'ALL' ? { complexCode: filter.complexCode } : {}),
        },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.operationalLocation.findMany({
        where: {
          active: true,
          ...(filter?.complexCode && filter.complexCode !== 'ALL' ? { complexCode: filter.complexCode } : {}),
        },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.catalogItem.findMany({
        where: {
          status: 'HOAT_DONG',
          type: { in: [CatalogType.VEHICLE_ORIGIN, CatalogType.PURCHASE_CONDITION, CatalogType.SUPPLIER, CatalogType.COMPANY_OWNER] },
        },
        select: { type: true, name: true },
      }),
      this.prisma.managementUnitManagerAssignment.findMany({
        where: {
          managerType: 'PRIMARY',
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
          managementUnit: { vehicles: { some: baseWhere } },
        },
        select: {
          manager: { select: { id: true, fullName: true, phone: true } },
          managementUnit: { select: { _count: { select: { vehicles: { where: baseWhere } } } } },
        },
      }),
      // Unassigned counts for various dimensions
      this.prisma.vehicle.count({
        where: {
          ...whereForUnits,
          managementUnitId: null,
          NOT: liquidatedVehicleWhere,
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...whereForLocations,
          homeDepotId: null,
          NOT: liquidatedVehicleWhere,
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...whereForManagers,
          NOT: liquidatedVehicleWhere,
          AND: [
            ...(Array.isArray(whereForManagers.AND) ? whereForManagers.AND : whereForManagers.AND ? [whereForManagers.AND] : []),
            { OR: [{ managerName: null }, { managerName: '' }] },
            {
              OR: [
                { managementUnitId: null },
                { managementUnit: { managerAssignments: { none: { managerType: 'PRIMARY', effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] } } } },
              ],
            },
          ],
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...whereForManufacturers,
          NOT: liquidatedVehicleWhere,
          OR: [{ manufacturer: null }, { manufacturer: '' }],
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...whereForModels,
          NOT: liquidatedVehicleWhere,
          OR: [{ modelName: null }, { modelName: '' }],
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...whereForOrigins,
          NOT: liquidatedVehicleWhere,
          OR: [{ origin: null }, { origin: '' }],
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...whereForYears,
          NOT: liquidatedVehicleWhere,
          OR: [{ manufactureYear: null }, { manufactureYear: 0 }],
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...whereForRegions,
          NOT: liquidatedVehicleWhere,
          OR: [{ regionCode: null }, { regionCode: '' }],
        },
      }),
    ]);

    const sanitizeStringList = (
      items: Array<{ [key: string]: string | null | undefined }>,
      key: string,
      catalogLabels: string[] = [],
    ) => canonicalizeMasterDataValues(items.map((item) => item[key]), catalogLabels);

    const standardConditions = ['Mua mới 100%', 'Đã qua sử dụng (ĐQSD)', 'Điều chuyển nội bộ', 'Thuê ngoài'];
    const dbConditions = sanitizeStringList(purchaseConditionList, 'purchaseCondition');
    const allConditions = canonicalizeMasterDataValues(
      [...standardConditions, ...dbConditions],
      referenceCatalogs.filter((item) => item.type === CatalogType.PURCHASE_CONDITION).map((item) => item.name),
    );

    const standardSuppliers = ['THACO AGRI', 'THACO INDUSTRIES', 'CATERPILLAR VN', 'KOBELCO VN', 'KOMATSU VN', 'TÂN PHÁT', 'LOVOL', 'PHƯỚC LỘC', 'CƯỜNG CƠ GIỚI'];
    const dbSuppliers = sanitizeStringList(supplierList, 'supplier');
    const allSuppliers = canonicalizeMasterDataValues(
      [...standardSuppliers, ...dbSuppliers],
      referenceCatalogs.filter((item) => item.type === CatalogType.SUPPLIER).map((item) => item.name),
    );

    const standardOwners = ['THACO AGRI', 'CÔNG TY CP NÔNG NGHIỆP DP', 'CÔNG TY TNHH BÒ AD', 'CÔNG TY CP NÔNG NGHIỆP LP', 'DP', 'ADM', 'LP'];
    const dbOwners = sanitizeStringList(ownerList, 'companyOwner');
    const allOwners = canonicalizeMasterDataValues(
      [...standardOwners, ...dbOwners],
      referenceCatalogs.filter((item) => item.type === CatalogType.COMPANY_OWNER).map((item) => item.name),
    );
    const managers = [...managerAssignments.reduce((map, assignment) => {
      const current = map.get(assignment.manager.id) || {
        id: assignment.manager.id,
        name: assignment.manager.fullName,
        phone: assignment.manager.phone,
        vehicleCount: 0,
      };
      current.vehicleCount += assignment.managementUnit._count.vehicles;
      map.set(current.id, current);
      return map;
    }, new Map<number, { id: number; name: string; phone: string | null; vehicleCount: number }>()).values()]
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    const unitCounts = Object.fromEntries(assignedUnits.map((unit) => [unit.name, unit._count.vehicles]));
    unitCounts['__UNASSIGNED__'] = unassignedUnitCount;

    const locationCounts = Object.fromEntries(locations.map((location) => [location.name, location._count.depotVehicles]));
    locationCounts['__UNASSIGNED__'] = unassignedLocationCount;

    const regionCounts = Object.fromEntries(regions.filter((r) => r.regionCode).map((r) => [r.regionCode!, r._count.id]));
    regionCounts['__UNASSIGNED__'] = unassignedRegionCount;

    return {
      complexes: complexes.filter((item) => item.complexCode).map((item) => item.complexCode),
      regions: regions.filter((item) => item.regionCode).map((item) => item.regionCode!),
      assignedUnits: assignedUnits.map((item) => item.name),
      locations: locations.map((item) => item.name),
      assetGroups: assetGroups.filter((item) => item.assetGroup).map((item) => item.assetGroup!),
      complexCounts: Object.fromEntries(complexes.filter((c) => c.complexCode).map((c) => [c.complexCode, c._count.id])),
      regionCounts,
      unitCounts,
      locationCounts,
      assetGroupCounts: Object.fromEntries(assetGroups.filter((g) => g.assetGroup).map((g) => [g.assetGroup!, g._count.id])),
      unassignedCounts: {
        assignedUnit: unassignedUnitCount,
        currentLocation: unassignedLocationCount,
        manager: unassignedManagerCount,
        manufacturer: unassignedManufacturerCount,
        model: unassignedModelCount,
        origin: unassignedOriginCount,
        manufactureYear: unassignedYearCount,
        region: unassignedRegionCount,
      },
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
      origins: canonicalizeMasterDataValues(
        originGroups.filter((item) => item.origin && VALID_COUNTRIES.has(item.origin.toUpperCase()) && item._count.id > 0).map((item) => item.origin),
        referenceCatalogs.filter((item) => item.type === CatalogType.VEHICLE_ORIGIN).map((item) => item.name),
      ).map((name) => ({
        name,
        vehicleCount: originGroups.filter((item) => normalizeMasterDataKey(item.origin) === normalizeMasterDataKey(name)).reduce((sum, item) => sum + item._count.id, 0),
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
      managers,
    };
  }

  async findOne(id: number, actor?: OperationalActor) {
    const scope = actor ? await this.vehicleScope(actor) : {};
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, ...scope },
      include: {
        vehicleType: true,
        manufacturerRef: true,
        modelRef: true,
        homeDepot: true,
        managementUnit: true,
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

  async update(id: number, dto: UpdateVehicleDto, actor: OperationalActor) {
    const current = await this.findOne(id, actor);
    const targetManagementUnitId = dto.managementUnitId ?? current.managementUnitId;
    if (targetManagementUnitId) await assertManagementUnitAccess(this.prisma, actor, targetManagementUnitId);
    if (isLiquidatedAssignedUnit(current.assignedUnitCode)) {
      const reactivates =
        (dto.status !== undefined && dto.status !== VehicleStatus.TAM_DUNG) ||
        dto.managementUnitId !== undefined ||
        dto.defaultDriverId !== undefined ||
        (dto.assignedUnitCode !== undefined && !isLiquidatedAssignedUnit(dto.assignedUnitCode));
      if (reactivates) {
        throw new BadRequestException('Xe đã loại biên/thanh lý chỉ được chỉnh sửa thông tin hồ sơ, không được đưa lại vào vận hành.');
      }
    }

    let alertTier: MaintenanceAlertTier | undefined = undefined;
    if (dto.hoursSinceLastService !== undefined) {
      alertTier = this.calculateAlertTier(dto.hoursSinceLastService);
    }

    const homeDepotId = await this.resolveHomeDepotId(dto);
    const canonicalReferences = await this.canonicalVehicleReferences(dto);

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
        ...canonicalReferences,
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
    if (isLiquidatedAssignedUnit(vehicle.assignedUnitCode)) {
      throw new BadRequestException('Xe đã loại biên/thanh lý không nhận dữ liệu vận hành mới.');
    }

    const addedHours = dto.addedMachineHours || 0;
    const addedKm = dto.addedOdoKm || 0;

    const newTotalHours = vehicle.totalMachineHours + addedHours;
    const newServiceHours = vehicle.hoursSinceLastService + addedHours;
    const newOdoKm = vehicle.odoKm + addedKm;
    const newAlertTier = this.calculateAlertTier(newServiceHours);
    const now = new Date();
    const speedProvided = dto.currentSpeedKmH !== undefined;
    const movingSince = speedProvided
      ? dto.currentSpeedKmH! > 5
        ? (vehicle.currentSpeedKmH !== null && vehicle.currentSpeedKmH > 5 ? vehicle.movingSince ?? now : now)
        : null
      : vehicle.movingSince;

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
        currentSpeedKmH: dto.currentSpeedKmH ?? vehicle.currentSpeedKmH,
        movingSince,
        status: dto.status ?? vehicle.status,
        lastGpsUpdate: now,
      },
    });
    if (speedProvided) await this.reconcileNoActiveOrderAlert(updated, now);
    await this.maintenance.refreshVehicleOccurrences(id);
    return updated;
  }

  private async reconcileNoActiveOrderAlert(vehicle: { id: number; code: string; plate: string | null; managementUnitId: number | null; currentSpeedKmH: number | null; movingSince: Date | null; currentLocationName: string | null; complexCode: string; unit: Unit }, now: Date) {
    const dedupeKey = `GPS:NO_ACTIVE_ORDER:${vehicle.id}`;
    const movingLongEnough = isMovingLongEnough(vehicle.currentSpeedKmH, vehicle.movingSince, now);
    if (!movingLongEnough || !vehicle.managementUnitId) {
      await this.prisma.alertEvent.updateMany({ where: { dedupeKey }, data: { status: 'RESOLVED', resolvedAt: now, dedupeKey: null } });
      return;
    }
    const activeWork = await this.prisma.workVehicleAssignment.findFirst({
      where: { vehicleId: vehicle.id, status: { in: ['ASSIGNED', 'ACCEPTED'] }, workOrder: { status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.DRIVER_ACCEPTED, WorkOrderStatus.IN_PROGRESS] } } },
      select: { id: true },
    });
    if (activeWork) {
      await this.prisma.alertEvent.updateMany({ where: { dedupeKey }, data: { status: 'RESOLVED', resolvedAt: now, dedupeKey: null } });
      return;
    }
    const manager = await this.prisma.managementUnitManagerAssignment.findFirst({
      where: { managementUnitId: vehicle.managementUnitId, managerType: 'PRIMARY', effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } },
      orderBy: { effectiveFrom: 'desc' },
    });
    await this.prisma.alertEvent.upsert({
      where: { dedupeKey },
      create: { dedupeKey, sourceType: 'VEHICLE_TELEMETRY', sourceId: String(vehicle.id), category: AlertCategory.GPS, alertType: 'NO_ACTIVE_ORDER', severity: AlertSeverity.WARNING, title: 'Xe di chuyển không có lệnh', message: 'Xe đang hoạt động nhưng không có lệnh điều xe hợp lệ.', location: vehicle.currentLocationName, metricValue: vehicle.currentSpeedKmH, metricUnit: 'km/h', complexCode: vehicle.complexCode, unit: vehicle.unit, managementUnitId: vehicle.managementUnitId, vehicleId: vehicle.id, targetUrl: `/doi-xe/ho-so-xe?vehicleId=${vehicle.id}`, metadataJson: { manager: manager?.manager ?? null } },
      update: { status: 'OPEN', resolvedAt: null, message: 'Xe đang hoạt động nhưng không có lệnh điều xe hợp lệ.', location: vehicle.currentLocationName, metricValue: vehicle.currentSpeedKmH, managementUnitId: vehicle.managementUnitId, metadataJson: { manager: manager?.manager ?? null }, occurredAt: now },
    });
  }

  async lookup(query: string, managementUnitId: number | undefined, actor: OperationalActor) {
    const q = query.trim();
    if (!q) throw new BadRequestException('Vui lòng nhập mã MMTB, biển số hoặc mã nội bộ.');
    if (managementUnitId) await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    const scope = managementUnitId ? { managementUnitId } : await this.vehicleScope(actor);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        ...scope,
        OR: [{ code: { contains: q } }, { plate: { contains: q } }, { oldCode: { contains: q } }, { bravoCode: { contains: q } }],
      },
      include: {
        managementUnit: { include: { managerAssignments: { where: { managerType: 'PRIMARY', effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }, include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } }, orderBy: { effectiveFrom: 'desc' }, take: 1 } } },
        defaultDriver: { select: { id: true, code: true, fullName: true, phone: true } },
        workAssignments: { where: { status: { in: ['ASSIGNED', 'ACCEPTED'] }, workOrder: { status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.DRIVER_ACCEPTED, WorkOrderStatus.IN_PROGRESS] } } }, include: { workOrder: { include: { driverAssignments: { where: { status: { in: ['ASSIGNED', 'ACCEPTED'] } }, include: { driver: { include: { user: { select: { id: true, code: true, fullName: true, phone: true } } } } }, take: 1 }, dispatchOrder: true } } }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe trong phạm vi được quản lý.');
    const active = vehicle.workAssignments[0]?.workOrder || null;
    return { ...vehicle, directManager: vehicle.managementUnit?.managerAssignments[0]?.manager || null, activeOrder: active, activeDriver: active?.driverAssignments[0]?.driver.user || vehicle.defaultDriver, gpsStatus: vehicle.lastGpsUpdate ? 'AVAILABLE' : 'NO_DATA' };
  }

  async getStatistics(filter: VehicleFilterDto | undefined, actor: OperationalActor) {
    const where: Prisma.VehicleWhereInput = await this.vehicleScope(actor);
    if (filter?.assetGroup && filter.assetGroup !== 'ALL') {
      where.assetGroup = filter.assetGroup;
    }
    if (filter?.assignedUnitCode && filter.assignedUnitCode !== 'ALL') {
      if (filter.assignedUnitCode === '__UNASSIGNED__' || filter.assignedUnitCode === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [
              { assignedUnitCode: null },
              { assignedUnitCode: '' },
              { assignedUnitCode: 'Chưa phân bổ' },
              { managementUnitId: null },
            ],
          },
        ];
      } else {
        where.assignedUnitCode = { contains: filter.assignedUnitCode };
      }
    }
    if (filter?.complexCode && filter.complexCode !== 'ALL') {
      where.complexCode = filter.complexCode;
    }
    if (filter?.regionCode && filter.regionCode !== 'ALL') {
      if (filter.regionCode === '__UNASSIGNED__' || filter.regionCode === 'UNASSIGNED') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ regionCode: null }, { regionCode: '' }] },
        ];
      } else {
        where.regionCode = filter.regionCode;
      }
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
    if (filter?.managerUserId) {
      if (filter.managerUserId === -1) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { defaultDriverId: null },
          { OR: [{ managerName: null }, { managerName: '' }] },
        ];
      } else {
        const now = new Date();
        where.managementUnit = {
          managerAssignments: {
            some: {
              managerUserId: filter.managerUserId,
              managerType: 'PRIMARY',
              effectiveFrom: { lte: now },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
            },
          },
        };
      }
    }
    if (filter?.hasDriver === true) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { defaultDriverId: { not: null } },
            { managerName: { not: null } },
          ],
        },
      ];
    } else if (filter?.hasDriver === false) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { defaultDriverId: null },
        { OR: [{ managerName: null }, { managerName: '' }] },
      ];
    }

    const [
      total,
      running,
      standby,
      liquidated,
      maintenance,
      repair,
      waitingDispatch,
      redAlertCount,
      amberAlertCount,
      greenAlertCount,
      gpsAttached,
      unassignedUnit,
      unassignedDriver,
      vehicleGroups,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.HOAT_DONG } }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.TAM_DUNG, NOT: liquidatedVehicleWhere } }),
      this.prisma.vehicle.count({ where: { ...where, status: VehicleStatus.TAM_DUNG, ...liquidatedVehicleWhere } }),
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
          managementUnitId: null,
          NOT: liquidatedVehicleWhere,
        },
      }),
      this.prisma.vehicle.count({
        where: {
          ...where,
          defaultDriverId: null,
          NOT: liquidatedVehicleWhere,
          OR: [{ managerName: null }, { managerName: '' }],
        },
      }),
      this.prisma.vehicle.groupBy({
        by: ['assetGroup'],
        where: { ...where, assetGroup: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const combined = summarizeVehicleCounts({
      vehicles: total,
      activeVehicles: running + waitingDispatch + standby,
    });
    const totalEquipment = combined.total;
    const activeEquipment = combined.active;
    const operationalTotal = totalEquipment - liquidated;
    const availabilityRate = operationalTotal > 0 ? ((activeEquipment / operationalTotal) * 100).toFixed(1) : '0';
    const assignedUnit = operationalTotal - unassignedUnit;
    const ALLOWED_FLEET_GROUPS = new Set(['MAY_CONG_TRINH', 'MAY_NONG_NGHIEP', 'XE_VAN_TAI_CONG_VU']);
    const assetGroupCounts = Object.fromEntries(
      vehicleGroups
        .filter((group) => filter?.isAssignable !== true || ALLOWED_FLEET_GROUPS.has(group.assetGroup!))
        .map((group) => [group.assetGroup!, group._count._all]),
    );

    return {
      totalVehicles: total,
      totalImplements: 0,
      totalEquipment,
      running,
      standby,
      liquidated,
      maintenance,
      repair,
      waitingDispatch,
      unassignedUnit,
      unassignedDriver,
      assignedUnit,
      unassignedImplement: 0,
      unassignedEquipment: unassignedUnit,
      activeEquipment,
      equipmentMaintenance: maintenance,
      equipmentRepair: repair,
      assetGroupCounts,
      gpsAttached,
      availabilityRate: `${availabilityRate}%`,
      maintenanceAlerts: {
        red: redAlertCount,
        amber: amberAlertCount,
        green: greenAlertCount,
      },
    };
  }

  async archive(id: number, reason: string, actor: OperationalActor) {
    const current = await this.findOne(id, actor);
    if (
      current.status === VehicleStatus.TAM_DUNG &&
      isLiquidatedAssignedUnit(current.assignedUnitCode) &&
      current.managementUnitId === null &&
      current.defaultDriverId === null &&
      current.secondaryDriverId === null
    ) {
      return current;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicle.update({
        where: { id },
        data: {
          status: VehicleStatus.TAM_DUNG,
          assignedUnitCode: LIQUIDATED_ASSIGNED_UNIT,
          managementUnitId: null,
          defaultDriverId: null,
          secondaryDriverId: null,
          currentSpeedKmH: 0,
          movingSince: null,
        },
        include: {
          vehicleType: true,
          manufacturerRef: true,
          modelRef: true,
          homeDepot: true,
          managementUnit: true,
          defaultDriver: { select: { id: true, fullName: true, phone: true } },
          currentImplements: true,
        },
      });
      await tx.operationalAuditLog.create({
        data: {
          entityType: OperationalEntityType.VEHICLE,
          entityId: id,
          actorId: actor.id,
          action: 'ARCHIVE_LIQUIDATED',
          oldValue: {
            status: current.status,
            assignedUnitCode: current.assignedUnitCode,
            managementUnitId: current.managementUnitId,
            defaultDriverId: current.defaultDriverId,
            secondaryDriverId: current.secondaryDriverId,
          },
          newValue: {
            status: VehicleStatus.TAM_DUNG,
            assignedUnitCode: LIQUIDATED_ASSIGNED_UNIT,
            managementUnitId: null,
            defaultDriverId: null,
            secondaryDriverId: null,
          },
          reason: reason.trim(),
        },
      });
      return updated;
    });
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
      const [vehicles, implementsResult] = await this.prisma.$transaction([
        this.prisma.vehicle.updateMany({ where: { assignedUnitCode: { in: cleanSources } }, data: { assignedUnitCode: cleanTarget } }),
        this.prisma.agriculturalImplement.updateMany({ where: { assignedUnitCode: { in: cleanSources } }, data: { assignedUnitCode: cleanTarget } }),
      ]);
      updatedVehicles = vehicles.count + implementsResult.count;
    } else if (catalogType === 'locations') {
      const [vehicles, implementsResult] = await this.prisma.$transaction([
        this.prisma.vehicle.updateMany({ where: { currentLocationName: { in: cleanSources } }, data: { currentLocationName: cleanTarget } }),
        this.prisma.agriculturalImplement.updateMany({ where: { gatheringLocation: { in: cleanSources } }, data: { gatheringLocation: cleanTarget } }),
      ]);
      updatedVehicles = vehicles.count + implementsResult.count;
    } else if (catalogType === 'origins') {
      const res = await this.prisma.vehicle.updateMany({
        where: { origin: { in: cleanSources } },
        data: { origin: cleanTarget },
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

    const referenceTypeByCatalog: Record<string, CatalogType | undefined> = {
      origins: CatalogType.VEHICLE_ORIGIN,
      purchaseConditions: CatalogType.PURCHASE_CONDITION,
      suppliers: CatalogType.SUPPLIER,
    };
    const referenceType = referenceTypeByCatalog[catalogType];
    if (referenceType) {
      const normalizedKey = normalizeMasterDataKey(cleanTarget);
      const id = `${referenceType}-${Buffer.from(normalizedKey).toString('base64url').slice(0, 48)}`;
      await this.prisma.$transaction([
        this.prisma.catalogItem.upsert({
          where: { id },
          update: { name: cleanTarget, normalizedKey, status: 'HOAT_DONG' },
          create: { id, code: id, name: cleanTarget, normalizedKey, type: referenceType },
        }),
        this.prisma.catalogItem.updateMany({
          where: { type: referenceType, name: { in: cleanSources } },
          data: { status: 'TAM_DUNG' },
        }),
      ]);
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
