import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KpiGrade } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateKpiDto } from './dto/calculate-kpi.dto';
import { KpiFilterDto } from './dto/kpi-filter.dto';

@Injectable()
export class DriverKpiService {
  constructor(private prisma: PrismaService) {}

  async calculateKpi(dto: CalculateKpiDto) {
    const driver = await this.prisma.user.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Không tìm thấy tài xế #${dto.driverId}`);
    }

    const tripsCount = dto.tripsCount ?? 42;
    const distanceKm = dto.distanceKm ?? 1180.0;
    const machineHours = dto.machineHours ?? 162.5;
    const fuelSavedLiters = dto.fuelSavedLiters ?? 65.0;

    // Công thức tính điểm 4 tiêu chí 25%
    const tripsScore = Number(Math.min(25.0, (tripsCount / 40.0) * 25.0).toFixed(1));
    const distanceScore = Number(Math.min(25.0, (distanceKm / 1000.0) * 25.0).toFixed(1));
    const hoursScore = Number(Math.min(25.0, (machineHours / 150.0) * 25.0).toFixed(1));
    const fuelScore = Number(
      Math.min(25.0, fuelSavedLiters >= 0 ? 18.0 + (fuelSavedLiters / 50.0) * 7.0 : 10.0).toFixed(1),
    );

    const totalScore = Number((tripsScore + distanceScore + hoursScore + fuelScore).toFixed(1));

    let rankGrade: KpiGrade = KpiGrade.HANG_D;
    let bonusAmountVnd = 0;

    if (totalScore >= 90.0) {
      rankGrade = KpiGrade.HANG_A;
      bonusAmountVnd = 2000000;
    } else if (totalScore >= 75.0) {
      rankGrade = KpiGrade.HANG_B;
      bonusAmountVnd = 1200000;
    } else if (totalScore >= 60.0) {
      rankGrade = KpiGrade.HANG_C;
      bonusAmountVnd = 500000;
    }

    return this.prisma.driverKpi.upsert({
      where: {
        driverId_monthYear: {
          driverId: dto.driverId,
          monthYear: dto.monthYear,
        },
      },
      create: {
        driverId: dto.driverId,
        monthYear: dto.monthYear,
        tripsCount,
        tripsScore,
        distanceKm,
        distanceScore,
        machineHours,
        hoursScore,
        fuelSavedLiters,
        fuelScore,
        totalScore,
        rankGrade,
        bonusAmountVnd,
      },
      update: {
        tripsCount,
        tripsScore,
        distanceKm,
        distanceScore,
        machineHours,
        hoursScore,
        fuelSavedLiters,
        fuelScore,
        totalScore,
        rankGrade,
        bonusAmountVnd,
      },
      include: {
        driver: { select: { id: true, fullName: true, phone: true, unit: true, avatarUrl: true } },
      },
    });
  }

  async findAll(filter: KpiFilterDto) {
    const { page = 1, limit = 20, search, monthYear = '08/2026', unit, rankGrade } = filter;
    const skip = (page - 1) * limit;

    const where: any = { monthYear };
    if (rankGrade) where.rankGrade = rankGrade;
    if (unit) where.driver = { unit };

    if (search) {
      where.driver = {
        ...where.driver,
        OR: [
          { fullName: { contains: search } },
          { username: { contains: search } },
          { phone: { contains: search } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.driverKpi.count({ where }),
      this.prisma.driverKpi.findMany({
        where,
        skip,
        take: limit,
        include: {
          driver: {
            select: { id: true, fullName: true, phone: true, unit: true, avatarUrl: true },
          },
        },
        orderBy: { totalScore: 'desc' },
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

  async findByDriverId(driverId: number) {
    const kpis = await this.prisma.driverKpi.findMany({
      where: { driverId },
      orderBy: { monthYear: 'desc' },
      include: {
        driver: { select: { id: true, fullName: true, phone: true, unit: true } },
      },
    });

    return kpis;
  }

  async getLeaderboardSummary(monthYear: string = '08/2026') {
    const [totalEvaluated, gradeACount, gradeBCount, gradeCCount, gradeDCount, bonusSum] =
      await Promise.all([
        this.prisma.driverKpi.count({ where: { monthYear } }),
        this.prisma.driverKpi.count({ where: { monthYear, rankGrade: KpiGrade.HANG_A } }),
        this.prisma.driverKpi.count({ where: { monthYear, rankGrade: KpiGrade.HANG_B } }),
        this.prisma.driverKpi.count({ where: { monthYear, rankGrade: KpiGrade.HANG_C } }),
        this.prisma.driverKpi.count({ where: { monthYear, rankGrade: KpiGrade.HANG_D } }),
        this.prisma.driverKpi.aggregate({
          where: { monthYear },
          _sum: { bonusAmountVnd: true, fuelSavedLiters: true },
        }),
      ]);

    const topDrivers = await this.prisma.driverKpi.findMany({
      where: { monthYear },
      take: 5,
      orderBy: { totalScore: 'desc' },
      include: {
        driver: { select: { id: true, fullName: true, phone: true, unit: true, avatarUrl: true } },
      },
    });

    return {
      monthYear,
      totalDriversEvaluated: totalEvaluated,
      gradeDistribution: {
        hangA: gradeACount,
        hangB: gradeBCount,
        hangC: gradeCCount,
        hangD: gradeDCount,
      },
      totalBonusPaidVnd: bonusSum._sum.bonusAmountVnd || 0,
      totalFuelSavedLiters: bonusSum._sum.fuelSavedLiters || 0,
      topDrivers,
    };
  }
}
