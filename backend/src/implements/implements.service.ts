import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentUsageMode, ImplementCategory, ImplementRequirement, ImplementStatus, Prisma, TechnicalCondition, Unit, VehicleStatus } from '@prisma/client';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { AttachImplementDto } from './dto/attach-implement.dto';
import { CreateImplementDto } from './dto/create-implement.dto';
import { DetachImplementDto } from './dto/detach-implement.dto';
import { ImplementFilterDto } from './dto/implement-filter.dto';
import { UpdateImplementDto } from './dto/update-implement.dto';

@Injectable()
export class ImplementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateImplementDto) {
    const existing = await this.prisma.agriculturalImplement.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Nông cụ mã ${dto.code} đã tồn tại trong hệ thống.`);
    }

    const { compatibleVehicleTypeIds = [], ...data } = dto;
    return this.prisma.agriculturalImplement.create({
      data: {
        ...data,
        unit: dto.unit || Unit.BAN_CO_GIOI,
        compatibleVehicleTypes: compatibleVehicleTypeIds.length
          ? { create: compatibleVehicleTypeIds.map((vehicleTypeId) => ({ vehicleTypeId, source: 'MANUAL' })) }
          : undefined,
      },
      include: { compatibleVehicleTypes: { include: { vehicleType: true } } },
    });
  }

  async findAll(filter: ImplementFilterDto) {
    const { page = 1, limit = 20, search, category, unit, status, technicalCondition, vehicleId, usageMode } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = category;
    if (unit) where.unit = unit;
    if (status) where.status = status;
    if (technicalCondition) where.technicalCondition = technicalCondition;
    if (vehicleId) where.currentVehicleId = vehicleId;
    if (usageMode) where.usageMode = usageMode;

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { standardPurpose: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.agriculturalImplement.count({ where }),
      this.prisma.agriculturalImplement.findMany({
        where,
        skip,
        take: limit,
        include: {
          currentVehicle: {
            select: {
              id: true,
              code: true,
              plate: true,
              name: true,
              status: true,
              assignedUnitCode: true,
              manufacturer: true,
              modelName: true,
              vehicleSubtype: true,
            },
          },
          compatibleVehicleTypes: { include: { vehicleType: true } },
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

  async findOne(id: number) {
    const implement = await this.prisma.agriculturalImplement.findUnique({
      where: { id },
      include: {
        currentVehicle: true,
        attachmentLogs: {
          take: 10,
          orderBy: { attachedAt: 'desc' },
          include: {
            vehicle: { select: { id: true, code: true, plate: true, name: true } },
            actor: { select: { id: true, fullName: true } },
          },
        },
        compatibleVehicleTypes: { include: { vehicleType: true } },
      },
    });

    if (!implement) {
      throw new NotFoundException(`Không tìm thấy nông cụ #${id}`);
    }

    return implement;
  }

  async update(id: number, dto: UpdateImplementDto) {
    await this.findOne(id);
    const { compatibleVehicleTypeIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (compatibleVehicleTypeIds) {
        await tx.implementVehicleTypeCompatibility.deleteMany({ where: { implementId: id } });
        if (compatibleVehicleTypeIds.length) {
          await tx.implementVehicleTypeCompatibility.createMany({
            data: compatibleVehicleTypeIds.map((vehicleTypeId) => ({ implementId: id, vehicleTypeId, source: 'MANUAL' })),
            skipDuplicates: true,
          });
        }
      }
      return tx.agriculturalImplement.update({
        where: { id },
        data,
        include: { compatibleVehicleTypes: { include: { vehicleType: true } } },
      });
    });
  }

  async compatibleVehicles(id: number, unit?: Unit) {
    const implement = await this.prisma.agriculturalImplement.findUnique({
      where: { id },
      include: { compatibleVehicleTypes: true },
    });
    if (!implement) throw new NotFoundException(`Không tìm thấy nông cụ #${id}`);
    if (implement.usageMode !== EquipmentUsageMode.ATTACHABLE) return [];

    const vehicleTypeIds = implement.compatibleVehicleTypes.map((item) => item.vehicleTypeId);
    if (!vehicleTypeIds.length) return [];
    const targetUnit = unit ?? implement.unit;
    const where: Prisma.VehicleWhereInput = {
      vehicleTypeId: { in: vehicleTypeIds },
      vehicleType: { isAssignable: true, implementRequirement: { not: ImplementRequirement.NONE } },
      status: { in: [VehicleStatus.CHO_PHAN_CONG, VehicleStatus.TAM_DUNG] },
      ...(targetUnit !== Unit.BAN_CO_GIOI && targetUnit !== Unit.TOAN_KLH ? { unit: targetUnit } : {}),
    };
    return this.prisma.vehicle.findMany({ where, include: { vehicleType: true }, orderBy: { code: 'asc' } });
  }

  async attachToVehicle(id: number, dto: AttachImplementDto, actorId: number) {
    const implement = await this.findOne(id);

    if (implement.status === ImplementStatus.ATTACHED) {
      throw new BadRequestException(
        `Nông cụ ${implement.code} hiện đang được gắn vào xe #${implement.currentVehicleId}. Hãy tháo ra trước.`,
      );
    }

    if (implement.usageMode !== EquipmentUsageMode.ATTACHABLE) {
      throw new ConflictException({ code: 'IMPLEMENT_NOT_ATTACHABLE', message: `Thiết bị ${implement.code} không phải thiết bị gắn kèm hoặc chưa được phân loại.` });
    }
    if (implement.status === ImplementStatus.MAINTENANCE || implement.technicalCondition !== TechnicalCondition.GOOD) {
      throw new ConflictException({ code: 'IMPLEMENT_STATUS', message: `Thiết bị ${implement.code} không đủ điều kiện kỹ thuật để gắn.` });
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
      include: { vehicleType: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`Không tìm thấy xe #${dto.vehicleId}`);
    }
    if (!vehicle.vehicleType || !vehicle.vehicleType.isAssignable) {
      throw new ConflictException({ code: 'VEHICLE_TYPE_UNCONFIGURED', message: `Xe ${vehicle.code} chưa có chủng loại hợp lệ để nhận thiết bị.` });
    }
    if (vehicle.vehicleType.implementRequirement === ImplementRequirement.NONE) {
      throw new ConflictException({ code: 'IMPLEMENT_NOT_ALLOWED', message: `Chủng loại ${vehicle.vehicleType.name} không dùng thiết bị rời.` });
    }
    const compatibility = implement.compatibleVehicleTypes.find((item) => item.vehicleTypeId === vehicle.vehicleTypeId);
    if (!compatibility) {
      throw new ConflictException({ code: 'IMPLEMENT_INCOMPATIBLE', message: `${implement.name} không tương thích với ${vehicle.vehicleType.name}.` });
    }

    const now = new Date();

    const [updatedImplement, log] = await this.prisma.$transaction([
      this.prisma.agriculturalImplement.update({
        where: { id },
        data: {
          status: ImplementStatus.ATTACHED,
          currentVehicleId: vehicle.id,
          attachedAt: now,
        },
      }),
      this.prisma.implementAttachmentLog.create({
        data: {
          implementId: id,
          vehicleId: vehicle.id,
          actorId,
          attachedAt: now,
          startWearMm: dto.startWearMm || 0,
          notes: dto.notes,
        },
      }),
    ]);

    return {
      message: `Đã gắn thành công ${implement.name} vào xe ${vehicle.code} (${vehicle.plate})`,
      implement: updatedImplement,
      log,
    };
  }

  async detachFromVehicle(id: number, dto: DetachImplementDto, actorId: number) {
    const implement = await this.findOne(id);

    if (implement.status !== ImplementStatus.ATTACHED || !implement.currentVehicleId) {
      throw new BadRequestException(`Nông cụ ${implement.code} hiện không ở trạng thái đang gắn.`);
    }

    const vehicleId = implement.currentVehicleId;
    const now = new Date();

    // Tìm log gắn mới nhất chưa tháo
    const activeLog = await this.prisma.implementAttachmentLog.findFirst({
      where: {
        implementId: id,
        vehicleId,
        detachedAt: null,
      },
      orderBy: { attachedAt: 'desc' },
    });

    let newTechnicalCondition = implement.technicalCondition;
    if (dto.endWearMm && dto.endWearMm >= 15) {
      newTechnicalCondition = TechnicalCondition.NEED_REPAIR;
    } else if (dto.endWearMm && dto.endWearMm >= 8) {
      newTechnicalCondition = TechnicalCondition.WORN_OUT;
    }

    const [updatedImplement] = await this.prisma.$transaction([
      this.prisma.agriculturalImplement.update({
        where: { id },
        data: {
          status: ImplementStatus.IN_DEPOT,
          currentVehicleId: null,
          technicalCondition: newTechnicalCondition,
        },
      }),
      ...(activeLog
        ? [
            this.prisma.implementAttachmentLog.update({
              where: { id: activeLog.id },
              data: {
                detachedAt: now,
                endWearMm: dto.endWearMm,
                notes: dto.notes ? `${activeLog.notes || ''} | Tháo: ${dto.notes}` : activeLog.notes,
              },
            }),
          ]
        : []),
    ]);

    return {
      message: `Đã tháo ${implement.name} về kho nông cụ an toàn.`,
      implement: updatedImplement,
    };
  }

  async getStatistics() {
    const [total, attached, inDepot, maintenance, good, wornOut, needRepair] =
      await Promise.all([
        this.prisma.agriculturalImplement.count(),
        this.prisma.agriculturalImplement.count({
          where: { status: ImplementStatus.ATTACHED },
        }),
        this.prisma.agriculturalImplement.count({
          where: { status: ImplementStatus.IN_DEPOT },
        }),
        this.prisma.agriculturalImplement.count({
          where: { status: ImplementStatus.MAINTENANCE },
        }),
        this.prisma.agriculturalImplement.count({
          where: { technicalCondition: TechnicalCondition.GOOD },
        }),
        this.prisma.agriculturalImplement.count({
          where: { technicalCondition: TechnicalCondition.WORN_OUT },
        }),
        this.prisma.agriculturalImplement.count({
          where: { technicalCondition: TechnicalCondition.NEED_REPAIR },
        }),
      ]);

    return {
      totalImplements: total,
      attached,
      inDepot,
      maintenance,
      condition: {
        good,
        wornOut,
        needRepair,
      },
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.agriculturalImplement.delete({ where: { id } });
  }

  /**
   * Import thiết bi tu file Excel (template "Thiet Bi Nong Cu THACO AGRI").
   *
   * Cot can thiet trong sheet:
   *   A  - MA_THIET_BI   (ma tai san / code, bat buoc)
   *   B  - TEN_THIET_BI  (ten thiet bi)
   *   C  - NHOM_TB       (ten nhom workbook: dung de xac dinh usageMode va sourceGroup)
   *   D  - DON_VI        (Unit enum: NT1, NT2...)
   *   E  - CHUNG_LOAI    (ImplementCategory enum string, optional)
   *   F  - MUC_DICH      (standardPurpose, optional)
   *
   * Quy tac phan loai usageMode theo NHOM_TB:
   *   - Nhom nong cu gan xe (dan cay, dan bua, ro-mooc, bom)   -> ATTACHABLE
   *   - May hoat dong doc lap (may phat, may bom doc lap)       -> STANDALONE
   *   - Phu kien cong trinh (gau, bua, dam taluy)              -> ATTACHABLE
   *   - Chua xac dinh hoac trong                               -> UNCLASSIFIED
   */
  async importFromWorkbook(buffer: Buffer, unit?: Unit): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const wb = xlsxRead(buffer, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new BadRequestException('File Excel khong co sheet nao.');
    const sheet = wb.Sheets[sheetName];
    const rows: any[] = xlsxUtils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Bo qua hang tieu de (dong dau)
    const dataRows = rows.slice(1).filter((r: any[]) => r[0]?.toString().trim());
    if (!dataRows.length) throw new BadRequestException('File Excel khong co du lieu (kiem tra tu dong 2).');

    // Map ten nhom (NHOM_TB) -> usageMode
    const resolveUsageMode = (nhomTb: string): EquipmentUsageMode => {
      const g = nhomTb.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Phu kien gan co khi / nong cu keo theo -> ATTACHABLE
      if (
        g.includes('dan cay') || g.includes('bua') || g.includes('ro mooc') || g.includes('remooc') ||
        g.includes('xoi') || g.includes('rai phan') || g.includes('phun') ||
        g.includes('gau') || g.includes('bua pha da') || g.includes('dam taluy') ||
        g.includes('mo vit') || g.includes('khoan') || g.includes('cat beton') ||
        g.includes('phu kien') || g.includes('loi cuon') || g.includes('ban go') ||
        g.includes('attachable') || g.includes('gan xe') || g.includes('gan may')
      ) return EquipmentUsageMode.ATTACHABLE;
      // May hoat dong doc lap -> STANDALONE
      if (
        g.includes('may phat') || g.includes('may bom') && !g.includes('gan') ||
        g.includes('standalone') || g.includes('doc lap') || g.includes('tu hanh')
      ) return EquipmentUsageMode.STANDALONE;
      return EquipmentUsageMode.UNCLASSIFIED;
    };

    // Map ten enum category (truong hop khong khop -> null)
    const validCategories = new Set<string>(Object.values(ImplementCategory));
    const resolveCategory = (raw: string): ImplementCategory | undefined => {
      const v = raw?.toString().trim().toUpperCase();
      return validCategories.has(v) ? (v as ImplementCategory) : undefined;
    };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const code = row[0]?.toString().trim();
      const name = row[1]?.toString().trim() || code;
      const nhomTb = row[2]?.toString().trim() || '';
      const rowUnit = (row[3]?.toString().trim() as Unit) || unit || Unit.BAN_CO_GIOI;
      const categoryRaw = row[4]?.toString().trim() || '';
      const purpose = row[5]?.toString().trim() || undefined;

      if (!code) { skipped++; continue; }

      const usageMode = resolveUsageMode(nhomTb);
      const category = resolveCategory(categoryRaw);

      try {
        const existing = await this.prisma.agriculturalImplement.findUnique({ where: { code } });
        if (existing) {
          await this.prisma.agriculturalImplement.update({
            where: { code },
            data: {
              name,
              usageMode,
              sourceGroup: nhomTb || null,
              ...(category ? { category } : {}),
              ...(purpose ? { standardPurpose: purpose } : {}),
              ...(rowUnit ? { unit: rowUnit } : {}),
            },
          });
          updated++;
        } else {
          const resolvedCategory: ImplementCategory = category ?? (
            usageMode === EquipmentUsageMode.ATTACHABLE ? ImplementCategory.DAN_CAY : ImplementCategory.RO_MOOC
          );
          await this.prisma.agriculturalImplement.create({
            data: {
              code,
              name,
              unit: rowUnit,
              usageMode,
              category: resolvedCategory,
              sourceGroup: nhomTb || null,
              standardPurpose: purpose,
              status: ImplementStatus.IN_DEPOT,
              technicalCondition: TechnicalCondition.GOOD,
            },
          });
          created++;
        }
      } catch (e: any) {
        errors.push(`Dong ${i + 2} (${code}): ${e?.message ?? 'Loi khong xac dinh'}`);
        skipped++;
      }
    }

    return { created, updated, skipped, errors };
  }
}
