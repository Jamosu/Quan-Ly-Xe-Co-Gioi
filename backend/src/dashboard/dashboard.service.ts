import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ImplementStatus,
  MaintenanceAlertTier,
  PlanStatus,
  RepairStatus,
  RouteType,
  SlaStatus,
  SosStatus,
  TransportStatus,
  Unit,
  VehicleStatus,
  AlertStatus,
  DailyReportStatus,
  WorkOrderStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OperationalActor } from '../common/utils/operational-access';
import { assertManagementUnitAccess } from '../common/utils/management-scope';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getManagerDashboard(managementUnitId: number, date: string | undefined, actor: OperationalActor) {
    const managementUnit = await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    const selectedDate = date ? new Date(`${date}T00:00:00`) : new Date();
    if (Number.isNaN(selectedDate.getTime())) throw new Error('Ngày dashboard không hợp lệ.');
    const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const activeAt = new Date();
    const workWhere = { managementUnitId, plannedStartAt: { lt: dayEnd }, plannedEndAt: { gte: dayStart } };
    const [drivers, vehicles, todayWork, pendingReports, alerts, manager] = await Promise.all([
      this.prisma.driverManagementAssignment.count({ where: { managementUnitId, effectiveFrom: { lte: activeAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: activeAt } }] } }),
      this.prisma.vehicle.count({ where: { managementUnitId } }),
      this.prisma.operationalWorkOrder.count({ where: { ...workWhere, status: { notIn: [WorkOrderStatus.CANCELLED, WorkOrderStatus.CLOSED] } } }),
      this.prisma.dailyReport.count({ where: { workOrder: { managementUnitId }, status: { in: [DailyReportStatus.DRAFT, DailyReportStatus.SUBMITTED_ON_TIME, DailyReportStatus.LATE] } } }),
      this.prisma.alertEvent.count({ where: { managementUnitId, status: { in: [AlertStatus.OPEN, AlertStatus.IN_PROGRESS] } } }),
      this.prisma.managementUnitManagerAssignment.findFirst({
        where: { managementUnitId, managerType: 'PRIMARY', effectiveFrom: { lte: activeAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: activeAt } }] },
        include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);
    return { managementUnit, date: dayStart, manager: manager?.manager ?? null, kpis: { drivers, vehicles, todayWork, pendingReports, alerts } };
  }

  async getExecutiveOverview(unit?: Unit, complexCode?: string, managementUnitId?: number, actor?: OperationalActor) {
    if (actor?.role === Role.FARM_MANAGER && !managementUnitId) throw new BadRequestException('Đội trưởng phải chọn một khu vực quản lý.');
    if (managementUnitId && actor) await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    const vehicleWhere: any = {};
    const planWhere: any = {};
    const transportWhere: any = {};
    if (unit && unit !== Unit.TOAN_KLH) {
      vehicleWhere.unit = unit;
      planWhere.unit = unit;
      transportWhere.unit = unit;
    }
    if (complexCode && complexCode !== 'ALL') {
      vehicleWhere.complexCode = complexCode;
    }
    if (managementUnitId) vehicleWhere.managementUnitId = managementUnitId;

    const [
      totalVehicles,
      runningVehicles,
      readyVehicles,
      standbyVehicles,
      maintenanceVehicles,
      repairVehicles,
      totalImplements,
      attachedImplements,
      totalPlans,
      activePlans,
      completedPlans,
      totalHaSum,
      fuelSum,
      redAlertsCount,
      activeRepairsCount,
      activeTransportTrips,
      activeSosAlerts,
      gpsEquippedCount,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: vehicleWhere }),
      this.prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.HOAT_DONG } }),
      this.prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.CHO_PHAN_CONG } }),
      this.prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.TAM_DUNG } }),
      this.prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.BAO_DUONG } }),
      this.prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.SUA_CHUA } }),
      this.prisma.agriculturalImplement.count(),
      this.prisma.agriculturalImplement.count({ where: { status: ImplementStatus.ATTACHED } }),
      this.prisma.productionPlan.count({ where: planWhere }),
      this.prisma.productionPlan.count({ where: { ...planWhere, status: PlanStatus.IN_PROGRESS } }),
      this.prisma.productionPlan.count({ where: { ...planWhere, status: PlanStatus.COMPLETED } }),
      this.prisma.productionPlan.aggregate({
        where: planWhere,
        _sum: { targetAreaHa: true, completedAreaHa: true },
      }),
      this.prisma.productionPlan.aggregate({
        where: planWhere,
        _sum: { fuelQuotaLiters: true, fuelUsedLiters: true },
      }),
      this.prisma.vehicle.count({
        where: { ...vehicleWhere, alertTier: MaintenanceAlertTier.RED },
      }),
      this.prisma.workshopRequest.count({
        where: { type: 'REPAIR', status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.transportOrder.count({
        where: { ...transportWhere, status: { in: [TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT, TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING] } },
      }),
      this.prisma.driverSosAlert.count({
        where: { status: SosStatus.PENDING },
      }),
      this.prisma.vehicle.count({
        where: {
          ...vehicleWhere,
          AND: [{ gpsImei: { not: null } }, { gpsImei: { not: '' } }],
        },
      }),
    ]);

    const gpsEquippedVehicles = gpsEquippedCount || 0;
    const noGpsVehicles = Math.max(0, totalVehicles - gpsEquippedVehicles);

    const availabilityRate = totalVehicles > 0
      ? (((runningVehicles + readyVehicles) / totalVehicles) * 100).toFixed(1)
      : '0';

    return {
      selectedUnit: unit || Unit.TOAN_KLH,
      kpiCards: {
        totalFleet: {
          total: totalVehicles,
          running: runningVehicles,
          ready: readyVehicles,
          standby: standbyVehicles,
          stopped: standbyVehicles,
          maintenance: maintenanceVehicles,
          repair: repairVehicles,
          availabilityRate: `${availabilityRate}%`,
          gpsEquipped: gpsEquippedVehicles,
          noGps: noGpsVehicles,
        },
        agriculturalProgress: {
          totalPlans,
          activePlans,
          completedPlans,
          targetAreaHa: totalHaSum._sum.targetAreaHa || 0,
          completedAreaHa: totalHaSum._sum.completedAreaHa || 0,
          progressPercent:
            totalHaSum._sum.targetAreaHa && totalHaSum._sum.targetAreaHa > 0
              ? (((totalHaSum._sum.completedAreaHa || 0) / totalHaSum._sum.targetAreaHa) * 100).toFixed(1) + '%'
              : '0%',
        },
        fuelEfficiency: {
          totalQuotaLiters: fuelSum._sum.fuelQuotaLiters || 0,
          totalUsedLiters: fuelSum._sum.fuelUsedLiters || 0,
          savedLiters: (fuelSum._sum.fuelQuotaLiters || 0) - (fuelSum._sum.fuelUsedLiters || 0),
        },
        implementsInOperation: {
          totalImplements,
          attachedImplements,
          utilizationRate:
            totalImplements > 0 ? (((attachedImplements) / totalImplements) * 100).toFixed(1) + '%' : '0%',
        },
        criticalAlerts: {
          maintenanceRed: redAlertsCount,
          activeRepairs: activeRepairsCount,
          activeSos: activeSosAlerts,
          inTransitOrders: activeTransportTrips,
        },
      },
    };
  }

  async getLiveFleetMap(unit?: Unit, complexCode?: string, managementUnitId?: number, actor?: OperationalActor) {
    if (actor?.role === Role.FARM_MANAGER && !managementUnitId) throw new BadRequestException('Đội trưởng phải chọn một khu vực quản lý.');
    if (managementUnitId && actor) await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    const where: any = {};
    if (unit && unit !== Unit.TOAN_KLH) {
      where.unit = unit;
    }
    if (complexCode && complexCode !== 'ALL') {
      where.complexCode = complexCode;
    }
    if (managementUnitId) where.managementUnitId = managementUnitId;

    return this.prisma.vehicle.findMany({
      where,
      select: {
        id: true,
        code: true,
        plate: true,
        name: true,
        category: true,
        unit: true,
        assignedUnitCode: true,
        regionCode: true,
        gpsImei: true,
        status: true,
        alertTier: true,
        totalMachineHours: true,
        hoursSinceLastService: true,
        odoKm: true,
        currentLat: true,
        currentLng: true,
        currentLocationName: true,
        lastGpsUpdate: true,
        defaultDriver: {
          select: { id: true, fullName: true, phone: true },
        },
        currentImplements: {
          select: { id: true, code: true, name: true, category: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }
}
