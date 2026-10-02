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
import { assertManagementUnitAccess, resourceManagementUnitIds, scopedManagementUnitIds } from '../common/utils/management-scope';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getManagerDashboard(managementUnitId: number, date: string | undefined, actor: OperationalActor) {
    const managementUnit = await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    const unitIds = await resourceManagementUnitIds(this.prisma, managementUnitId);
    const selectedDate = date ? new Date(`${date}T00:00:00`) : new Date();
    if (Number.isNaN(selectedDate.getTime())) throw new Error('Ngày dashboard không hợp lệ.');
    const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const activeAt = new Date();
    const workWhere = { managementUnitId: { in: unitIds }, plannedStartAt: { lt: dayEnd }, plannedEndAt: { gte: dayStart } };
    const [drivers, vehicles, todayWork, pendingReports, alerts, manager] = await Promise.all([
      this.prisma.driverProfile.count({ where: { OR: [
        { managementAssignments: { some: { effectiveFrom: { lte: activeAt }, AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gt: activeAt } }] },
          { OR: [{ managementUnitId: { in: unitIds } }, { teamUnitId: { in: unitIds } }] },
        ] } } },
        { vehicleAssignments: { some: { status: 'ACTIVE', vehicle: { managementUnitId: { in: unitIds } } } } },
      ] } }),
      this.prisma.vehicle.count({ where: { managementUnitId: { in: unitIds } } }),
      this.prisma.operationalWorkOrder.count({ where: { ...workWhere, status: { notIn: [WorkOrderStatus.CANCELLED, WorkOrderStatus.CLOSED] } } }),
      this.prisma.dailyReport.count({ where: { workOrder: { managementUnitId: { in: unitIds } }, status: { in: [DailyReportStatus.DRAFT, DailyReportStatus.SUBMITTED_ON_TIME, DailyReportStatus.LATE] } } }),
      this.prisma.alertEvent.count({ where: { managementUnitId: { in: unitIds }, status: { in: [AlertStatus.OPEN, AlertStatus.IN_PROGRESS] } } }),
      this.prisma.managementUnitManagerAssignment.findFirst({
        where: { managementUnitId, managerType: 'PRIMARY', effectiveFrom: { lte: activeAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: activeAt } }] },
        include: { manager: { select: { id: true, code: true, fullName: true, phone: true } } },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);
    return { managementUnit, date: dayStart, manager: manager?.manager ?? null, kpis: { drivers, vehicles, todayWork, pendingReports, alerts } };
  }

  async getExecutiveOverview(
    unit?: Unit,
    complexCode?: string,
    managementUnitId?: number,
    actor?: OperationalActor,
    timeFilter?: {
      startDate?: string;
      endDate?: string;
      year?: number;
      weekNumber?: number;
      month?: number;
    },
  ) {
    if (managementUnitId && actor) await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    let managementUnitIds: number[] | undefined;
    if (managementUnitId) {
      managementUnitIds = await resourceManagementUnitIds(this.prisma, managementUnitId);
    } else if (actor?.role === Role.FARM_MANAGER) {
      // Auto-scope: load all units the FARM_MANAGER is authorised for
      const scoped = await scopedManagementUnitIds(this.prisma, actor);
      managementUnitIds = scoped ?? undefined;
    }
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
    if (managementUnitIds) vehicleWhere.managementUnitId = { in: managementUnitIds };
    const implementWhere = managementUnitIds ? { managementUnitId: { in: managementUnitIds } } : {};
    const alertWhere: any = managementUnitIds ? { managementUnitId: { in: managementUnitIds } } : {};

    // Xử lý bộ lọc thời gian: ngày / tuần / tháng / năm
    let timeRangeStart: Date | undefined;
    let timeRangeEnd: Date | undefined;

    if (timeFilter?.startDate && timeFilter?.endDate) {
      timeRangeStart = new Date(timeFilter.startDate);
      timeRangeEnd = new Date(timeFilter.endDate);
    } else if (timeFilter?.year && timeFilter?.weekNumber) {
      const jan4 = new Date(timeFilter.year, 0, 4);
      const dayNr = (jan4.getDay() + 6) % 7;
      const startMonday = new Date(jan4);
      startMonday.setDate(jan4.getDate() - dayNr);
      startMonday.setHours(0, 0, 0, 0);
      timeRangeStart = new Date(startMonday);
      timeRangeStart.setDate(startMonday.getDate() + (timeFilter.weekNumber - 1) * 7);
      timeRangeEnd = new Date(timeRangeStart);
      timeRangeEnd.setDate(timeRangeStart.getDate() + 6);
      timeRangeEnd.setHours(23, 59, 59, 999);
      planWhere.weekNumber = timeFilter.weekNumber;
    } else if (timeFilter?.year && timeFilter?.month) {
      timeRangeStart = new Date(timeFilter.year, timeFilter.month - 1, 1, 0, 0, 0, 0);
      timeRangeEnd = new Date(timeFilter.year, timeFilter.month, 0, 23, 59, 59, 999);
    } else if (timeFilter?.year) {
      timeRangeStart = new Date(timeFilter.year, 0, 1, 0, 0, 0, 0);
      timeRangeEnd = new Date(timeFilter.year, 11, 31, 23, 59, 59, 999);
    }

    if (timeRangeStart && timeRangeEnd && !isNaN(timeRangeStart.getTime()) && !isNaN(timeRangeEnd.getTime())) {
      planWhere.OR = [
        { startDate: { lte: timeRangeEnd }, endDate: { gte: timeRangeStart } },
      ];
      transportWhere.departureTime = { gte: timeRangeStart, lte: timeRangeEnd };
      alertWhere.createdAt = { gte: timeRangeStart, lte: timeRangeEnd };
    }

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
      this.prisma.agriculturalImplement.count({ where: implementWhere }),
      this.prisma.agriculturalImplement.count({ where: { ...implementWhere, status: ImplementStatus.ATTACHED } }),
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
    if (managementUnitId && actor) await assertManagementUnitAccess(this.prisma, actor, managementUnitId);
    let managementUnitIds: number[] | undefined;
    if (managementUnitId) {
      managementUnitIds = await resourceManagementUnitIds(this.prisma, managementUnitId);
    } else if (actor?.role === Role.FARM_MANAGER) {
      const scoped = await scopedManagementUnitIds(this.prisma, actor);
      managementUnitIds = scoped ?? undefined;
    }
    const where: any = {};
    if (unit && unit !== Unit.TOAN_KLH) {
      where.unit = unit;
    }
    if (complexCode && complexCode !== 'ALL') {
      where.complexCode = complexCode;
    }
    if (managementUnitIds) where.managementUnitId = { in: managementUnitIds };

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
