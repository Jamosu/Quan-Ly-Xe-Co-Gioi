import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AlertCategory,
  AlertSeverity,
  MaintenanceAlertTier,
  MaintenanceMetric,
  MaintenanceOccurrenceStatus,
  MaintenanceStandardStatus,
  MaintenanceStatus,
  Prisma,
  Role,
  VehicleStatus,
  WorkshopRequestSource,
  WorkshopRequestStatus,
  WorkshopRequestType,
} from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service';
import { OperationalActor } from '../common/utils/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { calculateOccurrenceState, currentCycleIndex, ENGINE_HOUR_MILESTONES, ODOMETER_KM_MILESTONES } from './maintenance-calculator';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateMaintenanceStandardDto, UpdateMaintenanceStandardDto } from './dto/maintenance-standard.dto';
import { CreateOwedPartDto } from './dto/create-owed-part.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { SubmitBdc1Dto } from './dto/submit-bdc1.dto';
import { WorkshopService } from '../workshop/workshop.service';

const DEFAULT_BDC1_CHECKLIST = {
  clean_vehicle: false,
  inspect_general_condition: false,
  lubricate_required_points: false,
  tighten_bolts: false,
};

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly workshop: WorkshopService,
  ) {}

  private assertRecordAccess(actor: OperationalActor, vehicleUnit: string) {
    const allowedRole = actor.role === Role.SUPER_ADMIN || actor.role === Role.WORKSHOP_MANAGER || actor.role === Role.FARM_MANAGER;
    if (!allowedRole) throw new ForbiddenException('Chỉ TT BTSC hoặc Quản đốc được lập và hoàn tất hồ sơ bảo dưỡng.');
    if (actor.role === Role.FARM_MANAGER && actor.unit !== vehicleUnit) {
      throw new ForbiddenException('Không được thao tác hồ sơ bảo dưỡng ngoài phạm vi đơn vị.');
    }
  }

  getStandardTemplates() {
    return {
      ENGINE_HOUR: [...ENGINE_HOUR_MILESTONES],
      ODOMETER_KM: [...ODOMETER_KM_MILESTONES],
      defaults: { warningPercent: 80, explanationPercent: 110, repeatAfterMax: true },
      bdc1Checklist: DEFAULT_BDC1_CHECKLIST,
    };
  }

  listStandards(vehicleTypeId?: number) {
    return this.prisma.maintenanceStandard.findMany({
      where: { vehicleTypeId },
      include: { vehicleType: true, milestones: { orderBy: { sequence: 'asc' } }, updatedBy: { select: { id: true, fullName: true } } },
      orderBy: [{ vehicleTypeId: 'asc' }, { version: 'desc' }],
    });
  }

  async createStandard(dto: CreateMaintenanceStandardDto, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ quản trị viên được cấu hình định mức bảo dưỡng.');
    const vehicleType = await this.prisma.vehicleType.findUnique({ where: { id: dto.vehicleTypeId } });
    if (!vehicleType) throw new NotFoundException(`Không tìm thấy loại xe #${dto.vehicleTypeId}.`);
    const meterValues = dto.milestones.map((item) => item.meterValue);
    if (new Set(meterValues).size !== meterValues.length) throw new BadRequestException('Các mốc bảo dưỡng không được trùng nhau.');
    const ordered = [...dto.milestones].sort((a, b) => a.meterValue - b.meterValue);
    const latest = await this.prisma.maintenanceStandard.aggregate({ where: { vehicleTypeId: dto.vehicleTypeId }, _max: { version: true } });
    return this.prisma.maintenanceStandard.create({
      data: {
        code: dto.code,
        name: dto.name,
        vehicleTypeId: dto.vehicleTypeId,
        metric: dto.metric,
        version: (latest._max.version || 0) + 1,
        warningPercent: dto.warningPercent ?? 80,
        explanationPercent: dto.explanationPercent ?? 110,
        repeatAfterMax: dto.repeatAfterMax ?? true,
        bdc1ChecklistJson: dto.bdc1ChecklistJson as Prisma.InputJsonValue | undefined,
        createdById: actor.id,
        updatedById: actor.id,
        milestones: {
          create: ordered.map((item, index) => ({
            sequence: index + 1,
            meterValue: item.meterValue,
            label: item.label,
            checklistTemplateJson: item.checklistTemplateJson as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: { milestones: { orderBy: { sequence: 'asc' } }, vehicleType: true },
    });
  }

  async updateStandard(id: number, dto: UpdateMaintenanceStandardDto, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ quản trị viên được cấu hình định mức bảo dưỡng.');
    const standard = await this.prisma.maintenanceStandard.findUnique({ where: { id }, include: { milestones: true } });
    if (!standard) throw new NotFoundException(`Không tìm thấy định mức #${id}.`);
    if (standard.status === MaintenanceStandardStatus.ACTIVE) {
      throw new BadRequestException('Không sửa trực tiếp phiên bản đang áp dụng. Hãy tạo phiên bản mới để giữ lịch sử.');
    }
    if (dto.vehicleTypeId && dto.vehicleTypeId !== standard.vehicleTypeId) throw new BadRequestException('Không được chuyển phiên bản định mức sang loại xe khác.');
    return this.prisma.$transaction(async (tx) => {
      if (dto.milestones) {
        const ordered = [...dto.milestones].sort((a, b) => a.meterValue - b.meterValue);
        if (new Set(ordered.map((item) => item.meterValue)).size !== ordered.length) throw new BadRequestException('Các mốc bảo dưỡng không được trùng nhau.');
        await tx.maintenanceMilestone.deleteMany({ where: { standardId: id } });
        await tx.maintenanceMilestone.createMany({ data: ordered.map((item, index) => ({
          standardId: id, sequence: index + 1, meterValue: item.meterValue, label: item.label,
          checklistTemplateJson: item.checklistTemplateJson as Prisma.InputJsonValue | undefined,
        })) });
      }
      return tx.maintenanceStandard.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          metric: dto.metric,
          warningPercent: dto.warningPercent,
          explanationPercent: dto.explanationPercent,
          repeatAfterMax: dto.repeatAfterMax,
          bdc1ChecklistJson: dto.bdc1ChecklistJson as Prisma.InputJsonValue | undefined,
          updatedById: actor.id,
        },
        include: { milestones: { orderBy: { sequence: 'asc' } }, vehicleType: true },
      });
    });
  }

  async activateStandard(id: number, actor: OperationalActor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Chỉ quản trị viên được kích hoạt định mức bảo dưỡng.');
    const standard = await this.prisma.maintenanceStandard.findUnique({ where: { id }, include: { milestones: true } });
    if (!standard) throw new NotFoundException(`Không tìm thấy định mức #${id}.`);
    if (!standard.milestones.length) throw new BadRequestException('Định mức phải có ít nhất một mốc bảo dưỡng.');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceStandard.updateMany({
        where: { vehicleTypeId: standard.vehicleTypeId, status: MaintenanceStandardStatus.ACTIVE, id: { not: id } },
        data: { status: MaintenanceStandardStatus.INACTIVE },
      });
      return tx.maintenanceStandard.update({
        where: { id },
        data: { status: MaintenanceStandardStatus.ACTIVE, activatedAt: new Date(), updatedById: actor.id },
        include: { milestones: { orderBy: { sequence: 'asc' } }, vehicleType: true },
      });
    });
    const vehicles = await this.prisma.vehicle.findMany({ where: { vehicleTypeId: standard.vehicleTypeId }, select: { id: true } });
    for (const vehicle of vehicles) await this.refreshVehicleOccurrences(vehicle.id);
    return updated;
  }

  async refreshVehicleOccurrences(vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { vehicleType: { include: { maintenanceStandards: { where: { status: MaintenanceStandardStatus.ACTIVE }, include: { milestones: { where: { active: true }, orderBy: { meterValue: 'asc' } } }, take: 1 } } } },
    });
    if (!vehicle) throw new NotFoundException(`Không tìm thấy phương tiện #${vehicleId}.`);
    const standard = vehicle.vehicleType?.maintenanceStandards[0];
    if (!standard?.milestones.length) return { mode: 'LEGACY_250H', occurrences: [] };

    const currentMeter = standard.metric === MaintenanceMetric.ENGINE_HOUR ? vehicle.totalMachineHours : vehicle.odoKm;
    const maximum = standard.milestones[standard.milestones.length - 1].meterValue;
    const cycleIndex = standard.repeatAfterMax ? currentCycleIndex(currentMeter, maximum) : 0;
    const occurrences = [];
    for (let cycle = 0; cycle <= cycleIndex; cycle += 1) {
    const cycleBase = cycle * maximum;
    for (let index = 0; index < standard.milestones.length; index += 1) {
      const milestone = standard.milestones[index];
      const previousDueMeter = cycleBase + (index === 0 ? 0 : standard.milestones[index - 1].meterValue);
      const dueMeter = cycleBase + milestone.meterValue;
      const state = calculateOccurrenceState(currentMeter, previousDueMeter, dueMeter, standard.warningPercent, standard.explanationPercent);
      const existing = await this.prisma.maintenanceOccurrence.findUnique({ where: { vehicleId_milestoneId_cycleIndex: { vehicleId, milestoneId: milestone.id, cycleIndex: cycle } } });
      const occurrence = existing?.status === MaintenanceOccurrenceStatus.COMPLETED
        ? existing
        : await this.prisma.maintenanceOccurrence.upsert({
            where: { vehicleId_milestoneId_cycleIndex: { vehicleId, milestoneId: milestone.id, cycleIndex: cycle } },
            create: { vehicleId, standardId: standard.id, milestoneId: milestone.id, cycleIndex: cycle, previousDueMeter, dueMeter, ...state },
            update: { previousDueMeter, dueMeter, ...state },
          });
      occurrences.push({ ...occurrence, milestone });
      const dedupeKey = `MAINTENANCE:OCCURRENCE:${occurrence.id}`;
      if (occurrence.status !== MaintenanceOccurrenceStatus.COMPLETED && state.alertTier !== MaintenanceAlertTier.GREEN) {
        const unitLabel = standard.metric === MaintenanceMetric.ENGINE_HOUR ? 'giờ' : 'km';
        await this.alerts.emit({
          ruleCode: 'MAINTENANCE_BDC2_DUE', dedupeKey, sourceType: 'MaintenanceOccurrence', sourceId: String(occurrence.id),
          category: AlertCategory.MAINTENANCE, alertType: state.explanationRequired ? 'BDC2_OVER_110_PERCENT' : 'BDC2_DUE',
          severity: state.alertTier === MaintenanceAlertTier.RED ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: state.alertTier === MaintenanceAlertTier.RED ? `Đến hạn BDC2 ${milestone.label || milestone.meterValue}` : `Sắp đến BDC2 ${milestone.label || milestone.meterValue}`,
          message: `${vehicle.plate || vehicle.code}: ${currentMeter.toLocaleString('vi-VN')} / ${dueMeter.toLocaleString('vi-VN')} ${unitLabel} (${state.progressPercent}%).${state.explanationRequired ? ' Bắt buộc lập biên bản giải trình.' : ''}`,
          metricValue: currentMeter, thresholdValue: dueMeter, metricUnit: unitLabel,
          targetUrl: `/xuong-btsc/ke-hoach?occurrenceId=${occurrence.id}`, vehicleId,
          unit: vehicle.unit, complexCode: vehicle.complexCode,
          metadataJson: { occurrenceId: occurrence.id, progressPercent: state.progressPercent, explanationRequired: state.explanationRequired },
        });
      } else if (state.alertTier === MaintenanceAlertTier.GREEN || occurrence.status === MaintenanceOccurrenceStatus.COMPLETED) {
        await this.alerts.resolveByDedupeKey(dedupeKey);
      }
    }
    }
    const pending = occurrences.filter((item) => item.status !== MaintenanceOccurrenceStatus.COMPLETED);
    const alertTier = pending.some((item) => item.alertTier === MaintenanceAlertTier.RED)
      ? MaintenanceAlertTier.RED
      : pending.some((item) => item.alertTier === MaintenanceAlertTier.AMBER) ? MaintenanceAlertTier.AMBER : MaintenanceAlertTier.GREEN;
    await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { alertTier } });
    return { mode: 'STANDARD', standard, currentMeter, occurrences };
  }

  async createRecord(dto: CreateMaintenanceDto, actor: OperationalActor) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException(`Không tìm thấy phương tiện #${dto.vehicleId}`);
    this.assertRecordAccess(actor, vehicle.unit);
    const technicianId = actor.id;
    const occurrence = dto.occurrenceId ? await this.prisma.maintenanceOccurrence.findUnique({ where: { id: dto.occurrenceId }, include: { standard: true, milestone: true } }) : null;
    if (dto.occurrenceId && (!occurrence || occurrence.vehicleId !== dto.vehicleId)) throw new BadRequestException('Kỳ bảo dưỡng không thuộc phương tiện đã chọn.');
    if (occurrence?.status === MaintenanceOccurrenceStatus.COMPLETED) throw new BadRequestException('Kỳ bảo dưỡng đã hoàn thành.');
    const metric = occurrence?.standard.metric || MaintenanceMetric.ENGINE_HOUR;
    if (metric === MaintenanceMetric.ENGINE_HOUR && dto.currentHours === undefined) throw new BadRequestException('Phải nhập chỉ số giờ máy hiện tại.');
    if (metric === MaintenanceMetric.ODOMETER_KM && dto.currentKm === undefined) throw new BadRequestException('Phải nhập chỉ số ODO hiện tại.');
    if (dto.plannedEndAt && dto.plannedStartAt && dto.plannedEndAt <= dto.plannedStartAt) throw new BadRequestException('Thời gian kết thúc bảo dưỡng phải sau thời gian bắt đầu.');
    const checklist = dto.checklistJson || occurrence?.milestone.checklistTemplateJson || DEFAULT_BDC1_CHECKLIST;
    return this.workshop.create({
      type: WorkshopRequestType.MAINTENANCE,
      source: occurrence ? WorkshopRequestSource.MAINTENANCE_PLAN : WorkshopRequestSource.MANUAL,
      vehicleId: dto.vehicleId,
      maintenanceOccurrenceId: occurrence?.id,
      assignedTechnicianId: technicianId,
      issueDescription: occurrence?.milestone.label
        ? `Bảo dưỡng ${occurrence.milestone.label} cho ${vehicle.plate || vehicle.code}.`
        : `Bảo dưỡng định kỳ cho ${vehicle.plate || vehicle.code}.`,
      currentHours: dto.currentHours ?? vehicle.totalMachineHours,
      currentKm: dto.currentKm ?? vehicle.odoKm,
      checklistJson: checklist as Record<string, unknown>,
      plannedStartAt: dto.plannedStartAt,
      plannedEndAt: dto.plannedEndAt,
    }, actor);
  }

  async findAllRecords(filter: MaintenanceFilterDto, actor?: OperationalActor) {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const status = filter.status === MaintenanceStatus.SCHEDULED ? WorkshopRequestStatus.PLANNED
      : filter.status === MaintenanceStatus.IN_SERVICE ? WorkshopRequestStatus.IN_PROGRESS
      : filter.status === MaintenanceStatus.COMPLETED ? WorkshopRequestStatus.COMPLETED : undefined;
    if (actor) return this.workshop.findAll({ page, limit, search: filter.search, vehicleId: filter.vehicleId, type: WorkshopRequestType.MAINTENANCE, status }, actor);
    const where: Prisma.WorkshopRequestWhereInput = { type: WorkshopRequestType.MAINTENANCE, status, vehicleId: filter.vehicleId };
    const [total, items] = await Promise.all([
      this.prisma.workshopRequest.count({ where }),
      this.prisma.workshopRequest.findMany({ where, skip: (page - 1) * limit, take: limit, include: { vehicle: true, implement: true, assignedTechnician: true, maintenanceOccurrence: { include: { milestone: true, standard: true } }, documents: true, owedPartNotes: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneRecord(id: number) {
    const record = await this.prisma.workshopRequest.findUnique({ where: { id }, include: {
      vehicle: true, implement: true, assignedTechnician: { select: { id: true, fullName: true, phone: true } }, maintenanceOccurrence: { include: { milestone: true, standard: true } },
      owedPartNotes: true, documents: true,
    } });
    if (!record) throw new NotFoundException(`Không tìm thấy phiếu bảo dưỡng #${id}`);
    if (record.type !== WorkshopRequestType.MAINTENANCE) throw new NotFoundException(`Không tìm thấy phiếu bảo dưỡng #${id}`);
    return record;
  }

  /* Legacy implementation retained in git history; operational writes now use WorkshopRequest.
  async completeMaintenanceLegacy(id: number, dto: CompleteMaintenanceDto, actor: OperationalActor) {
    const record = await this.findOneRecord(id);
    this.assertRecordAccess(actor, record.vehicle.unit);
    const technicianId = actor.id;
    if (record.status === MaintenanceStatus.COMPLETED) throw new BadRequestException('Phiếu bảo dưỡng đã hoàn thành.');
    const completionMeter = record.metric === MaintenanceMetric.ODOMETER_KM
      ? record.vehicle.odoKm
      : record.vehicle.totalMachineHours;
    const completionState = record.occurrence
      ? calculateOccurrenceState(completionMeter, record.occurrence.previousDueMeter, record.occurrence.dueMeter)
      : null;
    if ((record.occurrence?.explanationRequired || completionState?.explanationRequired) && !dto.explanationReason?.trim()) {
      throw new BadRequestException('Kỳ bảo dưỡng vượt 110% chu kỳ, bắt buộc nhập nội dung giải trình.');
    }
    const now = new Date();
    const [activeExecution, activeRepair, hold] = await Promise.all([
      this.prisma.workExecutionSegment.findFirst({ where: { vehicleId: record.vehicleId, endedAt: null } }),
      this.prisma.repairTicket.findFirst({ where: { vehicleId: record.vehicleId, cancelledAt: null, status: { not: RepairStatus.COMPLETED } } }),
      this.prisma.vehicleUnavailability.findFirst({ where: { vehicleId: record.vehicleId, cancelledAt: null, status: 'APPROVED', OR: [{ endAt: null }, { endAt: { gt: now } }] } }),
    ]);
    const result = await this.prisma.$transaction(async (tx) => {
      let generatedRepair = null;
      if (dto.hasMajorDefect && dto.defectDescription) {
        generatedRepair = await tx.repairTicket.create({ data: {
          code: `SC-${now.getTime()}`, vehicleId: record.vehicleId, assignedTechnicianId: technicianId,
          repairTier: RepairTier.TRUNG_TU, issueDescription: `[Phát sinh từ bảo dưỡng #${record.id}]: ${dto.defectDescription}`,
          isGeneratedFromMaintenance: true, maintenanceRecordId: record.id, status: RepairStatus.RECEIVED,
        } });
      }
      const updatedRecord = await tx.maintenanceRecord.update({ where: { id }, data: {
        status: MaintenanceStatus.COMPLETED, checklistJson: dto.checklistJson,
        completionHours: record.vehicle.totalMachineHours, completionKm: record.vehicle.odoKm,
        photoUrlsJson: dto.photoUrls as Prisma.InputJsonValue | undefined, conclusion: dto.conclusion,
        explanationReason: dto.explanationReason, explanationUrl: dto.explanationUrl, completedAt: now, endedAt: now,
      } });
      if (record.occurrenceId) await tx.maintenanceOccurrence.update({ where: { id: record.occurrenceId }, data: { status: MaintenanceOccurrenceStatus.COMPLETED, completedAt: now, alertTier: MaintenanceAlertTier.GREEN, progressPercent: 100 } });
      const releaseStatus = generatedRepair || activeRepair ? VehicleStatus.SUA_CHUA : activeExecution ? VehicleStatus.HOAT_DONG : hold ? VehicleStatus.TAM_DUNG : VehicleStatus.CHO_PHAN_CONG;
      await tx.vehicle.update({ where: { id: record.vehicleId }, data: { status: releaseStatus } });
      return { updatedRecord, generatedRepair };
    });
    if (record.occurrenceId) await this.alerts.resolveByDedupeKey(`MAINTENANCE:OCCURRENCE:${record.occurrenceId}`);
    await this.refreshVehicleOccurrences(record.vehicleId);
    return {
      message: result.generatedRepair ? `Đã hoàn thành bảo dưỡng và tạo phiếu sửa chữa ${result.generatedRepair.code}.` : 'Đã hoàn tất bảo dưỡng và lưu vào lý lịch xe.',
      maintenanceRecord: result.updatedRecord, generatedRepair: result.generatedRepair,
    };
  }

  */

  async completeMaintenance(id: number, dto: CompleteMaintenanceDto, actor: OperationalActor) {
    const record = await this.findOneRecord(id);
    if (!record.vehicle) throw new BadRequestException('Phiếu bảo dưỡng thiết bị không có bộ đếm giờ máy/km để hoàn tất qua API BDC2.');
    this.assertRecordAccess(actor, record.vehicle.unit);
    if (record.status === WorkshopRequestStatus.COMPLETED) throw new BadRequestException('Phiếu bảo dưỡng đã hoàn thành.');
    const metric = record.maintenanceOccurrence?.standard.metric || MaintenanceMetric.ENGINE_HOUR;
    const completionMeter = metric === MaintenanceMetric.ODOMETER_KM ? record.vehicle.odoKm : record.vehicle.totalMachineHours;
    const completionState = record.maintenanceOccurrence
      ? calculateOccurrenceState(completionMeter, record.maintenanceOccurrence.previousDueMeter, record.maintenanceOccurrence.dueMeter)
      : null;
    if ((record.maintenanceOccurrence?.explanationRequired || completionState?.explanationRequired) && !dto.explanationReason?.trim()) {
      throw new BadRequestException('Kỳ bảo dưỡng vượt 110% chu kỳ, bắt buộc nhập nội dung giải trình.');
    }
    await this.workshop.update(id, {
      checklistJson: dto.checklistJson,
      resolution: dto.conclusion,
      explanationReason: dto.explanationReason,
      status: WorkshopRequestStatus.READY_FOR_ACCEPTANCE,
    }, actor);
    await this.workshop.update(id, { status: WorkshopRequestStatus.HANDED_OVER }, actor);
    const updatedRecord = await this.workshop.update(id, { status: WorkshopRequestStatus.COMPLETED }, actor);
    let generatedRepair = null;
    if (dto.hasMajorDefect && dto.defectDescription) {
      generatedRepair = await this.workshop.create({
        type: WorkshopRequestType.REPAIR,
        source: WorkshopRequestSource.MAINTENANCE_PLAN,
        vehicleId: record.vehicleId || undefined,
        assignedTechnicianId: actor.id,
        issueDescription: `[Phát sinh từ bảo dưỡng ${record.code}]: ${dto.defectDescription}`,
      }, actor);
    }
    await this.refreshVehicleOccurrences(record.vehicleId as number);
    return {
      message: generatedRepair ? `Đã hoàn thành bảo dưỡng và tạo yêu cầu sửa chữa ${generatedRepair.code}.` : 'Đã hoàn tất bảo dưỡng và lưu vào lý lịch xe.',
      maintenanceRecord: updatedRecord,
      generatedRepair,
    };
  }

  private operatingDate(now = new Date(), timeZone = 'Asia/Phnom_Penh') {
    let value: string;
    try {
      value = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    } catch {
      value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    }
    return new Date(`${value}T00:00:00.000Z`);
  }

  async ensureBdc1ForOperation(vehicleId: number, driverId?: number, markSkipped = true) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { vehicleType: { include: { maintenanceStandards: { where: { status: MaintenanceStandardStatus.ACTIVE }, take: 1 } } } } });
    if (!vehicle) throw new NotFoundException(`Không tìm thấy phương tiện #${vehicleId}.`);
    const policy = await this.prisma.schedulingPolicy.findUnique({ where: { unit: vehicle.unit }, select: { timezone: true } });
    const operatingDate = this.operatingDate(new Date(), policy?.timezone);
    const checklist = vehicle.vehicleType?.maintenanceStandards[0]?.bdc1ChecklistJson || DEFAULT_BDC1_CHECKLIST;
    const log = await this.prisma.bdc1Log.upsert({
      where: { vehicleId_operatingDate: { vehicleId, operatingDate } },
      create: { vehicleId, performerId: driverId, operatingDate, openingMachineHours: vehicle.totalMachineHours, openingOdoKm: vehicle.odoKm, checklistJson: checklist, skippedAt: markSkipped ? new Date() : undefined, skipReason: markSkipped ? 'Bắt đầu công việc khi chưa hoàn tất BDC1' : undefined },
      update: {},
    });
    if (markSkipped && !log.submittedAt && !log.skippedAt) {
      await this.prisma.bdc1Log.update({ where: { id: log.id }, data: { skippedAt: new Date(), skipReason: 'Bắt đầu công việc khi chưa hoàn tất BDC1' } });
    }
    if (markSkipped && !log.submittedAt) await this.alerts.emit({
      ruleCode: 'MAINTENANCE_BDC1_MISSING', dedupeKey: `BDC1:${vehicleId}:${operatingDate.toISOString().slice(0, 10)}`,
      sourceType: 'Bdc1Log', sourceId: String(log.id), category: AlertCategory.MAINTENANCE, alertType: 'BDC1_MISSING', severity: AlertSeverity.WARNING,
      title: `Chưa thực hiện BDC1: ${vehicle.plate || vehicle.code}`, message: 'Xe đã bắt đầu ngày vận hành nhưng chưa nộp checklist BDC1.',
      targetUrl: `/mobile/driver?bdc1VehicleId=${vehicleId}`, vehicleId, driverId, unit: vehicle.unit, complexCode: vehicle.complexCode,
    });
    return { required: !log.submittedAt, log };
  }

  async submitBdc1(dto: SubmitBdc1Dto, driverId: number) {
    const { log } = await this.ensureBdc1ForOperation(dto.vehicleId, driverId, false);
    const updated = await this.prisma.bdc1Log.update({ where: { id: log.id }, data: {
      performerId: driverId, checklistJson: dto.checklistJson, notes: dto.notes,
      openingMachineHours: dto.openingMachineHours ?? log.openingMachineHours,
      openingOdoKm: dto.openingOdoKm ?? log.openingOdoKm,
      photoUrlsJson: dto.photoUrls as Prisma.InputJsonValue | undefined, submittedAt: new Date(),
    }, include: { vehicle: { select: { id: true, code: true, plate: true } }, performer: { select: { id: true, fullName: true } } } });
    await this.alerts.resolveByDedupeKey(`BDC1:${dto.vehicleId}:${log.operatingDate.toISOString().slice(0, 10)}`);
    return updated;
  }

  async getUpcomingSchedule() {
    // Occurrences are synchronized when a standard is activated and when vehicle
    // telemetry is updated. A read endpoint must not refresh every vehicle: the
    // catalog contains thousands of assets and the previous sequential loop made
    // this request exceed the frontend timeout.
    const [occurrences, legacy] = await Promise.all([
      this.prisma.maintenanceOccurrence.findMany({
        where: { status: { notIn: [MaintenanceOccurrenceStatus.COMPLETED, MaintenanceOccurrenceStatus.CANCELLED] } },
        include: { vehicle: { include: { defaultDriver: { select: { id: true, fullName: true, phone: true } }, vehicleType: true } }, standard: true, milestone: true, records: { where: { status: { not: MaintenanceStatus.COMPLETED } }, take: 1 } },
        orderBy: [{ alertTier: 'desc' }, { dueMeter: 'asc' }],
      }),
      this.prisma.vehicle.findMany({
        where: {
          hoursSinceLastService: { gt: 0 },
          OR: [
            { vehicleTypeId: null },
            { vehicleType: { maintenanceStandards: { none: { status: MaintenanceStandardStatus.ACTIVE } } } },
          ],
        },
        include: { vehicleType: true, defaultDriver: { select: { id: true, fullName: true, phone: true } } },
        orderBy: [{ alertTier: 'desc' }, { hoursSinceLastService: 'desc' }],
      }),
    ]);
    return { occurrences, legacy };
  }

  async getVehicleMaintenanceSummary(vehicleId: number) {
    await this.refreshVehicleOccurrences(vehicleId);
    const [standard, occurrences, bdc1Logs, records, alerts] = await Promise.all([
      this.prisma.maintenanceStandard.findFirst({ where: { vehicleType: { vehicles: { some: { id: vehicleId } } }, status: MaintenanceStandardStatus.ACTIVE }, include: { milestones: { orderBy: { sequence: 'asc' } } } }),
      this.prisma.maintenanceOccurrence.findMany({ where: { vehicleId }, include: { milestone: true, standard: true }, orderBy: { dueMeter: 'asc' } }),
      this.prisma.bdc1Log.findMany({ where: { vehicleId }, include: { performer: { select: { id: true, fullName: true } } }, orderBy: { operatingDate: 'desc' }, take: 30 }),
      this.prisma.workshopRequest.findMany({ where: { vehicleId, type: WorkshopRequestType.MAINTENANCE }, include: { assignedTechnician: { select: { id: true, fullName: true } }, maintenanceOccurrence: { include: { milestone: true } }, documents: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.alertEvent.findMany({ where: { vehicleId, status: { in: ['OPEN', 'IN_PROGRESS'] } }, orderBy: { occurredAt: 'desc' }, take: 50 }),
    ]);
    return { mode: standard ? 'STANDARD' : 'LEGACY_250H', standard, occurrences, bdc1Logs, records, alerts };
  }

  async createOwedPartNote(dto: CreateOwedPartDto) {
    if (!dto.workshopRequestId && !dto.maintenanceRecordId) throw new BadRequestException('Phải chọn yêu cầu xưởng.');
    return this.prisma.workshopOwedPartNote.create({ data: dto, include: { vehicle: { select: { id: true, code: true, plate: true } }, implement: { select: { id: true, code: true, name: true } }, workshopRequest: { select: { id: true, code: true, type: true } } } });
  }
  async findAllOwedParts(isResolved?: boolean) { return this.prisma.workshopOwedPartNote.findMany({ where: { isResolved }, include: { vehicle: { select: { id: true, code: true, plate: true, name: true, unit: true } }, implement: { select: { id: true, code: true, name: true, unit: true } }, workshopRequest: { select: { id: true, code: true, type: true } }, maintenanceRecord: { select: { id: true, currentHours: true, createdAt: true } } }, orderBy: { createdAt: 'desc' } }); }
  async resolveOwedPart(id: number) {
    const note = await this.prisma.workshopOwedPartNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException(`Không tìm thấy ghi chú nợ vật tư #${id}`);
    return this.prisma.workshopOwedPartNote.update({ where: { id }, data: { isResolved: true, resolvedAt: new Date() } });
  }
}
