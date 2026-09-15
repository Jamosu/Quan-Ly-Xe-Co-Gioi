import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ImplementStatus,
  MaintenanceAlertTier,
  MaintenanceOccurrenceStatus,
  Prisma,
  SosStatus,
  SosEmergencyType,
  AlertCategory,
  AlertSeverity,
  RepairTier,
  TechnicalCondition,
  VehicleStatus,
  WorkshopDocumentType,
  WorkshopRepairRoute,
  WorkshopRequestSource,
  WorkshopRequestStatus,
  WorkshopRequestType,
  WorkshopPriority,
} from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service';
import { OperationalActor, scopedUnit } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfirmWorkshopCandidatesDto,
  CreateWorkshopRequestDto,
  UpdateWorkshopDocumentDto,
  UpdateWorkshopRequestDto,
  WorkshopAssetType,
  WorkshopCandidateFilterDto,
  WorkshopRequestFilterDto,
} from './dto/workshop.dto';

const TERMINAL_STATUSES: WorkshopRequestStatus[] = [
  WorkshopRequestStatus.COMPLETED,
  WorkshopRequestStatus.CANCELLED,
];

const REQUEST_INCLUDE = {
  vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true, conditionStatus: true, status: true, supplier: true, totalMachineHours: true, odoKm: true } },
  implement: { select: { id: true, code: true, name: true, unit: true, status: true, technicalCondition: true, currentVehicleId: true } },
  maintenanceOccurrence: { include: { milestone: true, standard: true } },
  sosAlert: { select: { id: true, status: true, emergencyType: true, lotLocation: true, createdAt: true } },
  reportedBy: { select: { id: true, fullName: true, phone: true } },
  assignedTechnician: { select: { id: true, fullName: true, phone: true } },
  documents: { orderBy: { type: 'asc' as const } },
  owedPartNotes: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class WorkshopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  private assertSingleAsset(vehicleId?: number | null, implementId?: number | null) {
    if ((!vehicleId && !implementId) || (vehicleId && implementId)) {
      throw new BadRequestException('Yêu cầu xưởng phải tham chiếu chính xác một xe hoặc một thiết bị.');
    }
  }

  private code(type: WorkshopRequestType) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${type === WorkshopRequestType.MAINTENANCE ? 'BD' : 'SC'}-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private documentTypes(type: WorkshopRequestType, route: WorkshopRepairRoute) {
    if (type === WorkshopRequestType.MAINTENANCE) {
      return [
        WorkshopDocumentType.BM09_REQUEST,
        WorkshopDocumentType.BM10_REPAIR_HISTORY,
        WorkshopDocumentType.BM11_TECHNICAL_REPORT,
        WorkshopDocumentType.BM12_ACCEPTANCE,
      ];
    }
    const types: WorkshopDocumentType[] = [
      WorkshopDocumentType.BM09_REQUEST,
      WorkshopDocumentType.BM01_INCIDENT,
      WorkshopDocumentType.BM02_REPAIR,
      WorkshopDocumentType.BM10_REPAIR_HISTORY,
      WorkshopDocumentType.BM11_TECHNICAL_REPORT,
      WorkshopDocumentType.BM12_ACCEPTANCE,
    ];
    if (route !== WorkshopRepairRoute.INTERNAL) types.splice(3, 0, WorkshopDocumentType.BM03_VENDOR_FEEDBACK);
    return types;
  }

  private validateDates(start?: Date | null, end?: Date | null, message = 'Thời gian kết thúc phải sau thời gian bắt đầu.') {
    if (start && end && end <= start) throw new BadRequestException(message);
  }

  private validateVendor(route: WorkshopRepairRoute, values: { vendorName?: string | null; vendorSentAt?: Date | null; vendorExpectedReturnAt?: Date | null }) {
    if (route === WorkshopRepairRoute.INTERNAL) return;
    if (!values.vendorName?.trim() || !values.vendorSentAt || !values.vendorExpectedReturnAt) {
      throw new BadRequestException('Sửa chữa ngoài phải có nhà cung cấp, ngày gửi và ngày hẹn trả.');
    }
    this.validateDates(values.vendorSentAt, values.vendorExpectedReturnAt, 'Ngày hẹn trả phải sau ngày gửi nhà cung cấp.');
  }

  private unitWhere(actor: OperationalActor): Prisma.WorkshopRequestWhereInput {
    const unit = scopedUnit(actor);
    return unit ? { OR: [{ vehicle: { unit } }, { implement: { unit } }] } : {};
  }

  async create(dto: CreateWorkshopRequestDto, actor: OperationalActor) {
    this.assertSingleAsset(dto.vehicleId, dto.implementId);
    this.validateDates(dto.plannedStartAt, dto.plannedEndAt);
    const route = dto.repairRoute || WorkshopRepairRoute.INTERNAL;
    this.validateVendor(route, dto);

    const [vehicle, implement, occurrence, sos] = await Promise.all([
      dto.vehicleId ? this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }) : null,
      dto.implementId ? this.prisma.agriculturalImplement.findUnique({ where: { id: dto.implementId } }) : null,
      dto.maintenanceOccurrenceId ? this.prisma.maintenanceOccurrence.findUnique({ where: { id: dto.maintenanceOccurrenceId }, include: { standard: true, milestone: true } }) : null,
      dto.sosAlertId ? this.prisma.driverSosAlert.findUnique({ where: { id: dto.sosAlertId } }) : null,
    ]);
    if (dto.vehicleId && !vehicle) throw new NotFoundException(`Không tìm thấy xe #${dto.vehicleId}.`);
    if (dto.implementId && !implement) throw new NotFoundException(`Không tìm thấy thiết bị #${dto.implementId}.`);
    if (dto.maintenanceOccurrenceId && (!occurrence || occurrence.vehicleId !== dto.vehicleId)) {
      throw new BadRequestException('Kỳ bảo dưỡng không thuộc xe đã chọn.');
    }
    if (dto.sosAlertId && (!sos || sos.vehicleId !== dto.vehicleId)) {
      throw new BadRequestException('Cảnh báo SOS không thuộc xe đã chọn.');
    }
    const duplicate = await this.prisma.workshopRequest.findFirst({
      where: {
        type: dto.type,
        vehicleId: dto.vehicleId,
        implementId: dto.implementId,
        status: { notIn: TERMINAL_STATUSES },
      },
    });
    if (duplicate) throw new ConflictException(`Tài sản đã có yêu cầu ${duplicate.code} đang mở.`);

    const status = dto.plannedStartAt && dto.plannedStartAt > new Date()
      ? WorkshopRequestStatus.PLANNED
      : WorkshopRequestStatus.RECEIVED;
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workshopRequest.create({
        data: {
          code: dto.code?.trim() || this.code(dto.type),
          type: dto.type,
          source: dto.source || WorkshopRequestSource.MANUAL,
          status,
          repairRoute: route,
          priority: dto.priority,
          repairTier: dto.repairTier,
          vehicleId: dto.vehicleId,
          implementId: dto.implementId,
          maintenanceOccurrenceId: dto.maintenanceOccurrenceId,
          sosAlertId: dto.sosAlertId,
          reportedById: dto.reportedById || actor?.id,
          assignedTechnicianId: dto.assignedTechnicianId,
          issueDescription: dto.issueDescription.trim(),
          incidentLocation: dto.incidentLocation,
          checklistJson: dto.checklistJson as Prisma.InputJsonValue | undefined,
          photoUrlsJson: dto.photoUrlsJson as Prisma.InputJsonValue | undefined,
          partsJson: dto.partsJson as Prisma.InputJsonValue | undefined,
          currentHours: dto.currentHours ?? vehicle?.totalMachineHours,
          currentKm: dto.currentKm ?? vehicle?.odoKm,
          estimatedCostVnd: dto.estimatedCostVnd || 0,
          plannedStartAt: dto.plannedStartAt,
          plannedEndAt: dto.plannedEndAt,
          vendorName: dto.vendorName,
          vendorContact: dto.vendorContact,
          vendorSentAt: dto.vendorSentAt,
          vendorExpectedReturnAt: dto.vendorExpectedReturnAt,
          vendorNotes: dto.vendorNotes,
          documents: { create: this.documentTypes(dto.type, route).map((type) => ({ type })) },
        },
        include: REQUEST_INCLUDE,
      });
      if (occurrence) {
        await tx.maintenanceOccurrence.update({ where: { id: occurrence.id }, data: { status: MaintenanceOccurrenceStatus.SCHEDULED } });
      }
      if (dto.type === WorkshopRequestType.REPAIR) {
        if (dto.vehicleId) {
          await tx.vehicle.update({
            where: { id: dto.vehicleId },
            data: { status: VehicleStatus.SUA_CHUA, conditionStatus: 'Hư hỏng / Đang sửa chữa' },
          });
        }
        if (dto.implementId) {
          await tx.agriculturalImplement.update({
            where: { id: dto.implementId },
            data: { status: ImplementStatus.MAINTENANCE, technicalCondition: TechnicalCondition.NEED_REPAIR },
          });
        }
      } else if (dto.type === WorkshopRequestType.MAINTENANCE && dto.vehicleId) {
        await tx.vehicle.update({
          where: { id: dto.vehicleId },
          data: { status: VehicleStatus.BAO_DUONG, conditionStatus: 'Đang bảo dưỡng' },
        });
      }
      return created;
    });
    return request;
  }

  async createFromSos(driverId: number, dto: { vehicleId: number; lat: number; lng: number; lotLocation: string; emergencyType: SosEmergencyType; photoUrl?: string; description: string }) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException(`Không tìm thấy xe #${dto.vehicleId}.`);
    const existing = await this.prisma.workshopRequest.findFirst({ where: { vehicleId: dto.vehicleId, type: WorkshopRequestType.REPAIR, status: { notIn: TERMINAL_STATUSES } } });
    if (existing) throw new ConflictException(`Xe đang có yêu cầu sửa chữa ${existing.code}.`);
    const result = await this.prisma.$transaction(async (tx) => {
      const alert = await tx.driverSosAlert.create({
        data: { driverId, vehicleId: dto.vehicleId, lat: dto.lat, lng: dto.lng, lotLocation: dto.lotLocation, emergencyType: dto.emergencyType, photoUrl: dto.photoUrl, description: dto.description, status: SosStatus.PENDING },
        include: { driver: { select: { id: true, fullName: true, phone: true } }, vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true, complexCode: true } } },
      });
      const request = await tx.workshopRequest.create({
        data: {
          code: this.code(WorkshopRequestType.REPAIR), type: WorkshopRequestType.REPAIR, source: WorkshopRequestSource.SOS,
          status: WorkshopRequestStatus.RECEIVED, vehicleId: dto.vehicleId, sosAlertId: alert.id, reportedById: driverId,
          repairTier: RepairTier.SOS_CUU_HO, priority: WorkshopPriority.SAFETY, issueDescription: `[SOS ${dto.lotLocation}]: ${dto.description}`,
          incidentLocation: dto.lotLocation, photoUrlsJson: dto.photoUrl ? [dto.photoUrl] : undefined,
          documents: { create: this.documentTypes(WorkshopRequestType.REPAIR, WorkshopRepairRoute.INTERNAL).map((type) => ({ type })) },
        },
      });
      await tx.vehicle.update({ where: { id: dto.vehicleId }, data: { status: VehicleStatus.SUA_CHUA, currentLat: dto.lat, currentLng: dto.lng, currentLocationName: dto.lotLocation } });
      return { alert, request };
    });
    await this.alerts.emit({
      ruleCode: 'SOS_EMERGENCY', dedupeKey: `SOS:${result.alert.id}`, sourceType: 'DriverSosAlert', sourceId: String(result.alert.id),
      category: AlertCategory.SOS, alertType: dto.emergencyType, severity: AlertSeverity.CRITICAL, title: `SOS ${result.alert.vehicle.plate || result.alert.vehicle.code}: ${dto.emergencyType}`,
      message: dto.description, location: dto.lotLocation, targetUrl: `/doi-xe/quan-li-sos?alertId=${result.alert.id}`,
      vehicleId: dto.vehicleId, driverId, unit: result.alert.vehicle.unit, complexCode: result.alert.vehicle.complexCode,
      metadataJson: { photoUrl: dto.photoUrl || null, lat: dto.lat, lng: dto.lng, workshopRequestId: result.request.id },
    });
    return { message: 'Đã phát tín hiệu SOS và tạo yêu cầu sửa chữa cho Xưởng BTSC.', alert: result.alert, repairTicketCode: result.request.code, workshopRequestId: result.request.id };
  }

  async findAll(filter: WorkshopRequestFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20, search, type, status, assetType, vehicleId, implementId } = filter;
    const scope = this.unitWhere(actor);
    const where: Prisma.WorkshopRequestWhereInput = {
      type,
      status,
      vehicleId: vehicleId || (assetType === WorkshopAssetType.IMPLEMENT ? null : undefined),
      implementId: implementId || (assetType === WorkshopAssetType.VEHICLE ? null : undefined),
      AND: [
        scope,
        ...(search ? [{ OR: [
          { code: { contains: search } },
          { issueDescription: { contains: search } },
          { vehicle: { code: { contains: search } } },
          { vehicle: { plate: { contains: search } } },
          { implement: { code: { contains: search } } },
          { implement: { name: { contains: search } } },
        ] }] : []),
      ],
    };
    const [total, items] = await Promise.all([
      this.prisma.workshopRequest.count({ where }),
      this.prisma.workshopRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: REQUEST_INCLUDE,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);
    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, actor?: OperationalActor) {
    const request = await this.prisma.workshopRequest.findFirst({
      where: { id, ...(actor ? this.unitWhere(actor) : {}) },
      include: REQUEST_INCLUDE,
    });
    if (!request) throw new NotFoundException(`Không tìm thấy yêu cầu xưởng #${id}.`);
    return request;
  }

  async findCandidates(filter: WorkshopCandidateFilterDto, actor: OperationalActor) {
    const { page = 1, limit = 20, search, type = WorkshopRequestType.REPAIR, assetType } = filter;
    const unit = scopedUnit(actor) || filter.unit;
    const open = { status: { notIn: TERMINAL_STATUSES } };
    if (type === WorkshopRequestType.REPAIR) {
      const vehicleWhere: Prisma.VehicleWhereInput = {
        ...(unit ? { unit } : {}),
        status: { not: VehicleStatus.BAO_DUONG },
        OR: [{ conditionStatus: 'Hư hỏng / Đang sửa chữa' }, { status: VehicleStatus.SUA_CHUA }],
        workshopRequests: { none: { type, ...open } },
        ...(search ? { AND: [{ OR: [{ code: { contains: search } }, { plate: { contains: search } }, { name: { contains: search } }, { assignedUnitCode: { contains: search } }] }] } : {}),
      };
      const implementWhere: Prisma.AgriculturalImplementWhereInput = {
        ...(unit ? { unit } : {}),
        technicalCondition: TechnicalCondition.NEED_REPAIR,
        workshopRequests: { none: { type, ...open } },
        ...(search ? { AND: [{ OR: [{ code: { contains: search } }, { name: { contains: search } }, { gatheringLocation: { contains: search } }] }] } : {}),
      };
      const [facetVehicleCount, facetImplementCount] = await Promise.all([
        this.prisma.vehicle.count({ where: vehicleWhere }),
        this.prisma.agriculturalImplement.count({ where: implementWhere }),
      ]);
      const vehicleCount = assetType === WorkshopAssetType.IMPLEMENT ? 0 : facetVehicleCount;
      const implementCount = assetType === WorkshopAssetType.VEHICLE ? 0 : facetImplementCount;
      const offset = (page - 1) * limit;
      const vehicleTake = Math.max(0, Math.min(limit, vehicleCount - offset));
      const implementSkip = Math.max(0, offset - vehicleCount);
      const implementTake = Math.max(0, limit - vehicleTake);
      const [vehicles, implementsList] = await Promise.all([
        vehicleTake ? this.prisma.vehicle.findMany({
          where: vehicleWhere,
          skip: offset,
          take: vehicleTake,
          select: {
            id: true, code: true, plate: true, name: true, category: true, unit: true, assignedUnitCode: true,
            conditionStatus: true, status: true, currentLocationName: true, managerName: true, managerPhone: true,
            defaultDriver: { select: { id: true, fullName: true, phone: true } },
          },
          orderBy: { code: 'asc' },
        }) : [],
        implementTake ? this.prisma.agriculturalImplement.findMany({
          where: implementWhere,
          skip: implementSkip,
          take: implementTake,
          select: {
            id: true, code: true, name: true, category: true, unit: true, status: true, technicalCondition: true,
            gatheringLocation: true, managerName: true, managerPhone: true, standardPurpose: true, currentVehicleId: true,
          },
          orderBy: { code: 'asc' },
        }) : [],
      ]);
      const items = [
        ...vehicles.map((asset) => ({ assetType: WorkshopAssetType.VEHICLE, assetId: asset.id, type, asset, reason: asset.conditionStatus || 'Xe đang ở trạng thái sửa chữa' })),
        ...implementsList.map((asset) => ({ assetType: WorkshopAssetType.IMPLEMENT, assetId: asset.id, type, asset, reason: 'Thiết bị cần sửa chữa' })),
      ];
      const total = vehicleCount + implementCount;
      return {
        items,
        facets: { total: facetVehicleCount + facetImplementCount, vehicles: facetVehicleCount, implements: facetImplementCount },
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    const candidates: Array<Record<string, unknown>> = [];
    if (assetType !== WorkshopAssetType.IMPLEMENT) {
      const occurrences = await this.prisma.maintenanceOccurrence.findMany({
        where: {
          ...(unit ? { vehicle: { unit } } : {}),
          OR: [
            { alertTier: { in: [MaintenanceAlertTier.AMBER, MaintenanceAlertTier.RED] } },
            { status: { in: [MaintenanceOccurrenceStatus.DUE, MaintenanceOccurrenceStatus.OVERDUE] } },
          ],
          workshopRequests: { none: { type, ...open } },
          ...(search ? { AND: [{ OR: [{ vehicle: { code: { contains: search } } }, { vehicle: { plate: { contains: search } } }, { vehicle: { name: { contains: search } } }] }] } : {}),
        },
        include: { vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true, status: true, alertTier: true } }, milestone: true, standard: true },
        orderBy: [{ alertTier: 'desc' }, { dueMeter: 'asc' }],
      });
      candidates.push(...occurrences.map((occurrence) => ({ assetType: WorkshopAssetType.VEHICLE, assetId: occurrence.vehicleId, occurrenceId: occurrence.id, type, asset: occurrence.vehicle, reason: `${occurrence.milestone.label || 'Kỳ BDC2'} · ${occurrence.progressPercent.toFixed(1)}%` })));
    }
    if (assetType !== WorkshopAssetType.VEHICLE) {
      const implementsList = await this.prisma.agriculturalImplement.findMany({
        where: {
          ...(unit ? { unit } : {}), status: ImplementStatus.MAINTENANCE,
          technicalCondition: { not: TechnicalCondition.NEED_REPAIR },
          workshopRequests: { none: { type, ...open } },
          ...(search ? { AND: [{ OR: [{ code: { contains: search } }, { name: { contains: search } }] }] } : {}),
        },
        select: { id: true, code: true, name: true, unit: true, status: true, technicalCondition: true },
        orderBy: { code: 'asc' },
      });
      candidates.push(...implementsList.map((asset) => ({ assetType: WorkshopAssetType.IMPLEMENT, assetId: asset.id, type, asset, reason: 'Thiết bị đang chờ bảo dưỡng' })));
    }
    const total = candidates.length;
    return { items: candidates.slice((page - 1) * limit, page * limit), facets: { total, vehicles: candidates.filter((item) => item.assetType === WorkshopAssetType.VEHICLE).length, implements: candidates.filter((item) => item.assetType === WorkshopAssetType.IMPLEMENT).length }, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async confirmCandidates(dto: ConfirmWorkshopCandidatesDto, actor: OperationalActor) {
    const created = [];
    const skipped = [];
    for (const candidate of dto.candidates) {
      try {
        const asset = candidate.assetType === WorkshopAssetType.VEHICLE
          ? await this.prisma.vehicle.findUnique({ where: { id: candidate.assetId }, select: { code: true, plate: true, name: true, conditionStatus: true, currentLocationName: true } })
          : await this.prisma.agriculturalImplement.findUnique({ where: { id: candidate.assetId }, select: { code: true, name: true, technicalCondition: true, gatheringLocation: true } });
        if (!asset) throw new NotFoundException(`Không tìm thấy tài sản #${candidate.assetId}.`);
        created.push(await this.create({
          type: candidate.type,
          source: candidate.occurrenceId ? WorkshopRequestSource.MAINTENANCE_PLAN : WorkshopRequestSource.ASSET_CONDITION,
          vehicleId: candidate.assetType === WorkshopAssetType.VEHICLE ? candidate.assetId : undefined,
          implementId: candidate.assetType === WorkshopAssetType.IMPLEMENT ? candidate.assetId : undefined,
          maintenanceOccurrenceId: candidate.occurrenceId,
          incidentLocation: ('currentLocationName' in asset ? asset.currentLocationName : asset.gatheringLocation) || undefined,
          issueDescription: candidate.type === WorkshopRequestType.MAINTENANCE
            ? `Bảo dưỡng ${'plate' in asset && asset.plate ? asset.plate : asset.code} theo kế hoạch.`
            : String(('conditionStatus' in asset && asset.conditionStatus) || ('technicalCondition' in asset && asset.technicalCondition) || `Báo hỏng ${asset.code}`),
        }, actor));
      } catch (error) {
        if (error instanceof ConflictException) skipped.push({ ...candidate, reason: error.message });
        else throw error;
      }
    }
    return { created, skipped };
  }

  async update(id: number, dto: UpdateWorkshopRequestDto, actor: OperationalActor) {
    const request = await this.findOne(id, actor);
    const route = dto.repairRoute || request.repairRoute;
    const status = dto.status || request.status;
    this.validateDates(dto.plannedStartAt ?? request.plannedStartAt, dto.plannedEndAt ?? request.plannedEndAt);
    this.validateVendor(route, {
      vendorName: dto.vendorName ?? request.vendorName,
      vendorSentAt: dto.vendorSentAt ?? request.vendorSentAt,
      vendorExpectedReturnAt: dto.vendorExpectedReturnAt ?? request.vendorExpectedReturnAt,
    });
    if (status === WorkshopRequestStatus.COMPLETED && request.status !== WorkshopRequestStatus.HANDED_OVER) {
      throw new BadRequestException('Phải nghiệm thu đạt và bàn giao trước khi hoàn tất yêu cầu.');
    }
    const now = new Date();
    const activeStatuses: WorkshopRequestStatus[] = [
      WorkshopRequestStatus.IN_PROGRESS,
      WorkshopRequestStatus.WAITING_PARTS,
      WorkshopRequestStatus.WAITING_VENDOR,
      WorkshopRequestStatus.READY_FOR_ACCEPTANCE,
      WorkshopRequestStatus.REWORK_REQUIRED,
    ];
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.workshopRequest.update({
        where: { id },
        data: {
          ...dto,
          checklistJson: dto.checklistJson as Prisma.InputJsonValue | undefined,
          partsJson: dto.partsJson as Prisma.InputJsonValue | undefined,
          startedAt: activeStatuses.includes(status) && !request.startedAt ? now : request.startedAt,
          readyForAcceptanceAt: status === WorkshopRequestStatus.READY_FOR_ACCEPTANCE ? now : request.readyForAcceptanceAt,
          handedOverAt: status === WorkshopRequestStatus.HANDED_OVER ? now : request.handedOverAt,
          completedAt: status === WorkshopRequestStatus.COMPLETED ? now : request.completedAt,
          cancelledAt: status === WorkshopRequestStatus.CANCELLED ? now : request.cancelledAt,
          completionHours: status === WorkshopRequestStatus.COMPLETED ? request.vehicle?.totalMachineHours : request.completionHours,
          completionKm: status === WorkshopRequestStatus.COMPLETED ? request.vehicle?.odoKm : request.completionKm,
        },
      });
      if (route !== WorkshopRepairRoute.INTERNAL) {
        await tx.workshopRequestDocument.upsert({
          where: { requestId_type: { requestId: id, type: WorkshopDocumentType.BM03_VENDOR_FEEDBACK } },
          create: { requestId: id, type: WorkshopDocumentType.BM03_VENDOR_FEEDBACK },
          update: {},
        });
      }
      if (activeStatuses.includes(status)) {
        if (request.vehicleId) {
          await tx.vehicle.update({
            where: { id: request.vehicleId },
            data: {
              status: request.type === WorkshopRequestType.MAINTENANCE ? VehicleStatus.BAO_DUONG : VehicleStatus.SUA_CHUA,
              conditionStatus: request.type === WorkshopRequestType.MAINTENANCE ? 'Đang bảo dưỡng' : 'Hư hỏng / Đang sửa chữa',
            },
          });
        }
        if (request.implementId) await tx.agriculturalImplement.update({ where: { id: request.implementId }, data: { status: ImplementStatus.MAINTENANCE, ...(request.type === WorkshopRequestType.REPAIR ? { technicalCondition: TechnicalCondition.NEED_REPAIR } : {}) } });
        if (request.maintenanceOccurrenceId) await tx.maintenanceOccurrence.update({ where: { id: request.maintenanceOccurrenceId }, data: { status: MaintenanceOccurrenceStatus.IN_SERVICE } });
      }
      if (status === WorkshopRequestStatus.COMPLETED) await this.releaseAsset(tx, request, now);
      return result;
    });
    if (status === WorkshopRequestStatus.COMPLETED && request.maintenanceOccurrenceId) {
      await this.alerts.resolveByDedupeKey(`MAINTENANCE:OCCURRENCE:${request.maintenanceOccurrenceId}`);
    }
    return this.findOne(updated.id, actor);
  }

  private async releaseAsset(tx: Prisma.TransactionClient, request: Awaited<ReturnType<WorkshopService['findOne']>>, now: Date) {
    if (request.maintenanceOccurrenceId) {
      await tx.maintenanceOccurrence.update({ where: { id: request.maintenanceOccurrenceId }, data: { status: MaintenanceOccurrenceStatus.COMPLETED, completedAt: now, alertTier: MaintenanceAlertTier.GREEN, progressPercent: 100 } });
    }
    if (request.sosAlertId) await tx.driverSosAlert.update({ where: { id: request.sosAlertId }, data: { status: SosStatus.RESOLVED } });
    if (request.vehicleId) {
      const [other, execution, hold] = await Promise.all([
        tx.workshopRequest.findFirst({ where: { id: { not: request.id }, vehicleId: request.vehicleId, status: { notIn: TERMINAL_STATUSES } } }),
        tx.workExecutionSegment.findFirst({ where: { vehicleId: request.vehicleId, endedAt: null } }),
        tx.vehicleUnavailability.findFirst({ where: { vehicleId: request.vehicleId, cancelledAt: null, status: 'APPROVED', OR: [{ endAt: null }, { endAt: { gt: now } }] } }),
      ]);
      const status = other?.type === WorkshopRequestType.REPAIR ? VehicleStatus.SUA_CHUA
        : other?.type === WorkshopRequestType.MAINTENANCE ? VehicleStatus.BAO_DUONG
        : execution ? VehicleStatus.HOAT_DONG : hold ? VehicleStatus.TAM_DUNG : VehicleStatus.CHO_PHAN_CONG;
      await tx.vehicle.update({ where: { id: request.vehicleId }, data: {
        status,
        ...(request.type === WorkshopRequestType.REPAIR && !other ? { conditionStatus: 'Bình thường' } : {}),
        ...(request.type === WorkshopRequestType.MAINTENANCE ? { hoursSinceLastService: 0, alertTier: MaintenanceAlertTier.GREEN } : {}),
      } });
    }
    if (request.implementId) {
      await tx.agriculturalImplement.update({ where: { id: request.implementId }, data: {
        status: request.implement?.currentVehicleId ? ImplementStatus.ATTACHED : ImplementStatus.IN_DEPOT,
        ...(request.type === WorkshopRequestType.REPAIR ? { technicalCondition: TechnicalCondition.GOOD } : {}),
      } });
    }
  }

  async updateDocument(id: number, type: WorkshopDocumentType, dto: UpdateWorkshopDocumentDto, actor: OperationalActor) {
    await this.findOne(id, actor);
    return this.prisma.workshopRequestDocument.upsert({
      where: { requestId_type: { requestId: id, type } },
      create: { requestId: id, type, ...dto },
      update: dto,
    });
  }

  async summary(actor: OperationalActor) {
    const where = this.unitWhere(actor);
    const [groups, repairCandidates, maintenanceCandidates] = await Promise.all([
      this.prisma.workshopRequest.groupBy({ by: ['type', 'status'], where, _count: { _all: true } }),
      this.findCandidates({ type: WorkshopRequestType.REPAIR, page: 1, limit: 1 }, actor),
      this.findCandidates({ type: WorkshopRequestType.MAINTENANCE, page: 1, limit: 1 }, actor),
    ]);
    return {
      groups,
      candidates: { repair: repairCandidates.pagination.total, maintenance: maintenanceCandidates.pagination.total },
    };
  }
}
