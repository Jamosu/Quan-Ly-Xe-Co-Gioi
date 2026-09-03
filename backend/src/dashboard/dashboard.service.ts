import { Injectable } from '@nestjs/common';
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
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getExecutiveOverview(unit?: Unit, complexCode?: string) {
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

    const [
      totalVehicles,
      runningVehicles,
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
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: vehicleWhere }),
      this.prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.HOAT_DONG } }),
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
      this.prisma.repairTicket.count({
        where: { status: { in: [RepairStatus.RECEIVED, RepairStatus.IN_REPAIR, RepairStatus.WAITING_PARTS] } },
      }),
      this.prisma.transportOrder.count({
        where: { ...transportWhere, status: { in: [TransportStatus.DEPARTED, TransportStatus.IN_TRANSIT, TransportStatus.AT_DELIVERY, TransportStatus.UNLOADING] } },
      }),
      this.prisma.driverSosAlert.count({
        where: { status: SosStatus.PENDING },
      }),
    ]);

    const availabilityRate = totalVehicles > 0
      ? (((runningVehicles + standbyVehicles) / totalVehicles) * 100).toFixed(1)
      : '0';

    return {
      selectedUnit: unit || Unit.TOAN_KLH,
      kpiCards: {
        totalFleet: {
          total: totalVehicles,
          running: runningVehicles,
          standby: standbyVehicles,
          maintenance: maintenanceVehicles,
          repair: repairVehicles,
          availabilityRate: `${availabilityRate}%`,
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

  async getLiveFleetMap(unit?: Unit) {
    const where: any = {};
    if (unit && unit !== Unit.TOAN_KLH) {
      where.unit = unit;
    }

    return this.prisma.vehicle.findMany({
      where,
      select: {
        id: true,
        code: true,
        plate: true,
        name: true,
        category: true,
        unit: true,
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
    });
  }
}
