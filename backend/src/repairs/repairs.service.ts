import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RepairStatus,
  WorkshopRequestSource,
  WorkshopRequestStatus,
  WorkshopRequestType,
} from '@prisma/client';
import { OperationalActor } from '../common/utils/operational-access';
import { WorkshopService } from '../workshop/workshop.service';
import { CreateRepairDto } from './dto/create-repair.dto';
import { RepairFilterDto } from './dto/repair-filter.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';

const toWorkshopStatus = (status?: RepairStatus): WorkshopRequestStatus | undefined => {
  if (!status) return undefined;
  if (status === RepairStatus.RECEIVED) return WorkshopRequestStatus.RECEIVED;
  if (status === RepairStatus.IN_REPAIR) return WorkshopRequestStatus.IN_PROGRESS;
  if (status === RepairStatus.WAITING_PARTS) return WorkshopRequestStatus.WAITING_PARTS;
  return WorkshopRequestStatus.COMPLETED;
};

@Injectable()
export class RepairsService {
  constructor(private readonly workshop: WorkshopService) {}

  create(dto: CreateRepairDto, actor: OperationalActor) {
    return this.workshop.create({
      code: dto.code,
      type: WorkshopRequestType.REPAIR,
      source: WorkshopRequestSource.MANUAL,
      vehicleId: dto.vehicleId,
      implementId: dto.implementId,
      reportedById: dto.reportedByDriverId,
      assignedTechnicianId: dto.assignedTechnicianId,
      repairTier: dto.repairTier,
      issueDescription: dto.issueDescription,
      estimatedCostVnd: dto.estimatedCostVnd,
      partsJson: dto.replacedPartsJson,
      incidentLocation: dto.incidentLocation,
      plannedStartAt: dto.plannedStartAt,
      plannedEndAt: dto.plannedEndAt,
    }, actor);
  }

  findAll(filter: RepairFilterDto, actor: OperationalActor) {
    return this.workshop.findAll({
      page: filter.page,
      limit: filter.limit,
      search: filter.search,
      type: WorkshopRequestType.REPAIR,
      status: toWorkshopStatus(filter.status),
      vehicleId: filter.vehicleId,
      implementId: filter.implementId,
    }, actor);
  }

  findOne(id: number, actor: OperationalActor) { return this.workshop.findOne(id, actor); }

  async update(id: number, dto: UpdateRepairDto, actor: OperationalActor) {
    const mappedStatus = toWorkshopStatus(dto.status);
    if (mappedStatus === WorkshopRequestStatus.COMPLETED) {
      const current = await this.workshop.findOne(id, actor);
      if (current.status !== WorkshopRequestStatus.HANDED_OVER) {
        throw new BadRequestException('API tương thích yêu cầu nghiệm thu và bàn giao trước khi hoàn tất.');
      }
    }
    return this.workshop.update(id, {
      status: mappedStatus,
      repairTier: dto.repairTier,
      issueDescription: dto.issueDescription,
      assignedTechnicianId: dto.assignedTechnicianId,
      actualCostVnd: dto.actualCostVnd,
      partsJson: dto.replacedPartsJson,
      plannedStartAt: dto.plannedStartAt,
      plannedEndAt: dto.plannedEndAt,
    }, actor);
  }

  async getCostReport(actor: OperationalActor) {
    const result = await this.workshop.findAll({ type: WorkshopRequestType.REPAIR, page: 1, limit: 10000 }, actor);
    return {
      totalTickets: result.pagination.total,
      inRepair: result.items.filter((item) => item.status === WorkshopRequestStatus.IN_PROGRESS).length,
      waitingParts: result.items.filter((item) => item.status === WorkshopRequestStatus.WAITING_PARTS).length,
      completed: result.items.filter((item) => item.status === WorkshopRequestStatus.COMPLETED).length,
      totalEstimatedCostVnd: result.items.reduce((sum, item) => sum + item.estimatedCostVnd, 0),
      totalActualCostVnd: result.items.reduce((sum, item) => sum + item.actualCostVnd, 0),
    };
  }

  remove(id: number, actor: OperationalActor) {
    return this.workshop.update(id, { status: WorkshopRequestStatus.CANCELLED, cancellationReason: 'Hủy qua API tương thích DELETE' }, actor);
  }
}
