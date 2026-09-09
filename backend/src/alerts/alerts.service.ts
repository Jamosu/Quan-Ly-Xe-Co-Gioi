import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceAlertTier } from '@prisma/client';

export interface AlertItemDto {
  id: string | number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  location?: string;
  vehicle?: {
    id: number;
    code: string;
    plate: string;
    name?: string;
    category?: string;
  };
  driver?: {
    id: number;
    fullName: string;
    phone?: string;
  };
  createdAt: Date;
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { limit?: number; page?: number; complexCode?: string }) {
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const sosWhere: any = {};
    const vehicleWhere: any = {
      alertTier: { in: [MaintenanceAlertTier.RED, MaintenanceAlertTier.AMBER] },
    };

    if (query.complexCode && query.complexCode !== 'ALL') {
      sosWhere.vehicle = { complexCode: query.complexCode };
      vehicleWhere.complexCode = query.complexCode;
    }

    let sosList: any[] = [];
    try {
      sosList = await this.prisma.driverSosAlert.findMany({
        where: sosWhere,
        include: {
          driver: { select: { id: true, fullName: true, phone: true } },
          vehicle: { select: { id: true, code: true, plate: true, name: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (e) {
      try {
        const rawSos = (await this.prisma.$queryRawUnsafe(`
          SELECT s.id, s.driverId, s.vehicleId, s.lat, s.lng, s.lotLocation, s.emergencyType, s.description, s.status, s.createdAt,
                 u.fullName as driverName, u.phone as driverPhone,
                 v.code as vehicleCode, v.plate as vehiclePlate, v.name as vehicleName
          FROM driver_sos_alerts s
          LEFT JOIN users u ON s.driverId = u.id
          LEFT JOIN vehicles v ON s.vehicleId = v.id
          ORDER BY s.createdAt DESC
          LIMIT ${limit}
        `)) as any[];

        sosList = (rawSos || []).map((r) => ({
          id: r.id,
          lat: Number(r.lat) || 0,
          lng: Number(r.lng) || 0,
          lotLocation: r.lotLocation || '',
          emergencyType: r.emergencyType || 'HONG_MAY',
          description: r.description || '',
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          driver: r.driverId ? { id: r.driverId, fullName: r.driverName, phone: r.driverPhone } : undefined,
          vehicle: r.vehicleId ? { id: r.vehicleId, code: r.vehicleCode, plate: r.vehiclePlate, name: r.vehicleName } : undefined,
        }));
      } catch {
        sosList = [];
      }
    }

    let vehicleAlerts: any[] = [];
    try {
      vehicleAlerts = await this.prisma.vehicle.findMany({
        where: vehicleWhere,
        select: {
          id: true,
          code: true,
          plate: true,
          name: true,
          category: true,
          alertTier: true,
          hoursSinceLastService: true,
          assignedUnitCode: true,
          complexCode: true,
          updatedAt: true,
        },
        orderBy: { hoursSinceLastService: 'desc' },
        take: limit,
      });
    } catch {
      vehicleAlerts = [];
    }

    const formattedSos: AlertItemDto[] = sosList.map((s) => ({
      id: `SOS-${s.id}`,
      severity: 'CRITICAL',
      title: `Cứu hộ SOS: ${s.emergencyType || 'Yêu cầu hỗ trợ khẩn cấp'}`,
      message: s.description || 'Yêu cầu cứu hộ khẩn cấp tại hiện trường',
      location: s.lotLocation || `Tọa độ: ${(s.lat || 0).toFixed(4)}, ${(s.lng || 0).toFixed(4)}`,
      vehicle: s.vehicle,
      driver: s.driver,
      createdAt: s.createdAt || new Date(),
    }));

    const formattedMaintenance: AlertItemDto[] = vehicleAlerts.map((v) => {
      const isRed = v.alertTier === MaintenanceAlertTier.RED;
      return {
        id: `MT-${v.id}`,
        severity: isRed ? 'CRITICAL' : 'WARNING',
        title: isRed
          ? `MMTB quá hạn bảo dưỡng (${Math.round(v.hoursSinceLastService)}h/250h)`
          : `MMTB sắp đến hạn bảo dưỡng (${Math.round(v.hoursSinceLastService)}h/250h)`,
        message: `Xe/máy ${v.plate || v.code} đạt ${Math.round(v.hoursSinceLastService)}h vận hành. Cần xếp lịch bảo dưỡng định kỳ.`,
        location: v.assignedUnitCode || v.complexCode || 'Khu liên hợp',
        vehicle: {
          id: v.id,
          code: v.code,
          plate: v.plate,
          name: v.name,
          category: v.category,
        },
        createdAt: v.updatedAt || new Date(),
      };
    });

    const merged = [...formattedSos, ...formattedMaintenance].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const items = merged.slice(skip, skip + limit);
    const total = merged.length;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
