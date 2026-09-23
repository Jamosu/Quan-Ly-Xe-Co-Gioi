import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import {
  DriverEmploymentStatus,
  DriverLicenseClass,
  DriverShiftStatus,
  EquipmentUsageMode,
  ImplementCategory,
  ImplementStatus,
  PrismaClient,
  Role,
  TechnicalCondition,
  Unit,
  UnavailabilityStatus,
  VehicleCategory,
  VehicleOperationalDomain,
  VehicleStatus,
} from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const prisma = new PrismaClient();
const PASSWORD = 'Thaco@1234$';

const DEMO_LICENSE_CLASSES = [
  DriverLicenseClass.HANG_B2,
  DriverLicenseClass.HANG_C,
  DriverLicenseClass.HANG_CE,
];

function demoLicenses(teamId: number, index: number, primary: DriverLicenseClass = DriverLicenseClass.HANG_B2) {
  const label: Record<string, string> = {
    [DriverLicenseClass.HANG_B2]: 'Hạng B2 (Máy cày, máy kéo, ô tô con, tải ≤3.5T)',
    [DriverLicenseClass.HANG_C]: 'Hạng C (Xe tải ben >3.5T, xe chuyên dùng)',
    [DriverLicenseClass.HANG_CE]: 'Hạng CE (Xe đầu kéo rơ-moóc, Container)',
  };
  return [
    ...DEMO_LICENSE_CLASSES.map((licenseClass) => ({
      category: label[licenseClass],
      number: `GPLX-${teamId}-${String(index).padStart(2, '0')}-${licenseClass.replace('HANG_', '')}`,
      issueDate: '2025-01-01',
      expiryDate: '2035-12-31',
      issuedBy: 'Sở GTVT / Nghiệm thu điều lệnh',
      isPrimary: licenseClass === primary,
    })),
    {
      category: 'Chứng chỉ vận hành máy kéo & cơ giới nông nghiệp',
      number: `CC-NO-${teamId}-${String(index).padStart(2, '0')}`,
      issueDate: '2023-01-01',
      expiryDate: '2035-12-31',
      issuedBy: 'Trường Kỹ thuật & Cơ giới THACO AGRI',
      isPrimary: false,
    },
    {
      category: 'Chứng chỉ vận hành máy đào, ủi, xúc & máy thi công',
      number: `CC-CO-${teamId}-${String(index).padStart(2, '0')}`,
      issueDate: '2023-01-01',
      expiryDate: '2035-12-31',
      issuedBy: 'Trường Kỹ thuật & Cơ giới THACO AGRI',
      isPrimary: false,
    },
    {
      category: 'Chứng chỉ an toàn vận tải hàng hóa & bốc dỡ',
      number: `CC-VT-${teamId}-${String(index).padStart(2, '0')}`,
      issueDate: '2023-01-01',
      expiryDate: '2035-12-31',
      issuedBy: 'Trường Kỹ thuật & Cơ giới THACO AGRI',
      isPrimary: false,
    },
  ];
}

function accountKey(teamCode: string, index: number) {
  const slug = teamCode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    code: `DEMO-${teamCode}-${String(index).padStart(2, '0')}`,
    username: `demo.${slug}.${String(index).padStart(2, '0')}`,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply) {
    throw new Error(
      'Đã khóa chế độ --apply: script chuẩn hóa cũ có thể sửa dữ liệu xe/tài xế thật và tạo tương thích thiết bị sai. Hãy dùng import:vehicles, import:implements và seed:demo-drivers riêng biệt.',
    );
  }
  const reportPath = resolve(process.cwd(), 'import-reports', 'standardize-fleet-and-drivers-report.json');

  console.log(`\n================================================================`);
  console.log(`=== BẮT ĐẦU CHUẨN HÓA XE, NÔNG CỤ VÀ TÀI XẾ CHO CÁC ĐỘI TRƯỞNG ===`);
  console.log(`=== Chế độ: ${apply ? 'THỰC THI (APPLY)' : 'XEM TRƯỚC (DRY-RUN)'} ===`);
  console.log(`================================================================\n`);

  const admin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, isActive: true },
    select: { id: true },
  });
  if (!admin) throw new Error('Cần một SUPER_ADMIN đang hoạt động để ghi nhận dữ liệu.');

  // 1. Lấy tất cả các đội cấp TEAM active
  const teams = await prisma.driverManagementUnit.findMany({
    where: { level: 'TEAM', status: 'ACTIVE' },
    include: {
      parent: true,
      managerAssignments: { where: { effectiveTo: null }, include: { manager: true } },
      vehicles: {
        include: { vehicleType: true },
      },
      implements: {
        include: { compatibleVehicleTypes: true },
      },
      teamAssignments: {
        where: { effectiveTo: null },
        include: {
          driver: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: [{ complexCode: 'asc' }, { code: 'asc' }],
  });

  console.log(`Tổng số Đội/Tổ: ${teams.length}`);

  // 2. Lấy danh sách chủng loại xe chuẩn theo domain
  const vehicleTypes = await prisma.vehicleType.findMany({ where: { active: true } });
  const agriTypes = vehicleTypes.filter((t) => t.operationalDomain === VehicleOperationalDomain.AGRICULTURE && t.isAssignable);
  const constrTypes = vehicleTypes.filter((t) => t.operationalDomain === VehicleOperationalDomain.CONSTRUCTION && t.isAssignable);
  const transTypes = vehicleTypes.filter((t) => t.operationalDomain === VehicleOperationalDomain.TRANSPORT && t.isAssignable);

  const defaultAgriTypeId = agriTypes[0]?.id;
  const defaultConstrTypeId = constrTypes[0]?.id;
  const defaultTransTypeId = transTypes[0]?.id;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const futureExpiry = new Date('2035-12-31T00:00:00.000Z');
  const futureHealth = new Date('2035-12-31T00:00:00.000Z');

  const teamReports: any[] = [];
  let totalDriversNormalized = 0;
  let totalDriversCreated = 0;
  let totalVehiclesAllocated = 0;
  let totalVehiclesReadied = 0;
  let totalImplementsAllocated = 0;

  for (let tIdx = 0; tIdx < teams.length; tIdx++) {
    const team = teams[tIdx];
    const mgrNames = team.managerAssignments.map((m) => `${m.manager.fullName} (${m.manager.username})`).join(', ') || 'Chưa có';
    const parentUnitId = team.parentId || team.id;

    // --- A. Chuẩn hóa tài xế hiện có ---
    const existingDrivers = team.teamAssignments.map((a) => a.driver);
    let normalizedInTeam = 0;

    console.log(`[${tIdx + 1}/${teams.length}] [${team.complexCode}] Đội ${team.code} (${team.name}): ${team.vehicles.length} xe, ${existingDrivers.length} tài xế...`);

    if (apply) {
      for (let i = 0; i < existingDrivers.length; i++) {
        const dp = existingDrivers[i];
        const u = dp.user;

        // Bỏ qua nếu tài xế đã đủ GPLX demo và ở trạng thái SAN_SANG
        if (
          Array.isArray(dp.licensesJson) &&
          (dp.licensesJson as any[]).length >= 4 &&
          dp.currentShiftStatus === DriverShiftStatus.SAN_SANG &&
          dp.employmentStatus === DriverEmploymentStatus.DANG_LAM_VIEC
        ) {
          normalizedInTeam++;
          totalDriversNormalized++;
          continue;
        }

        const primary = dp.licenseClass || u.licenseClass || DriverLicenseClass.HANG_B2;
        const licensesJson = demoLicenses(team.id, i + 1, primary);

        await prisma.$transaction([
          prisma.user.update({
            where: { id: u.id },
            data: {
              employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
              currentShiftStatus: DriverShiftStatus.SAN_SANG,
              licenseExpiryDate: futureExpiry,
              healthCheckExpiryDate: futureHealth,
              isActive: true,
            },
          }),
          prisma.driverProfile.update({
            where: { userId: u.id },
            data: {
              employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
              currentShiftStatus: DriverShiftStatus.SAN_SANG,
              licenseExpiryDate: futureExpiry,
              healthCheckExpiryDate: futureHealth,
              licensesJson,
            },
          }),
          prisma.driverUnavailability.updateMany({
            where: { driverId: u.id, status: UnavailabilityStatus.APPROVED },
            data: { status: UnavailabilityStatus.REJECTED, reason: '[STANDARDIZED] Mở khóa tài xế để sẵn sàng nhận lệnh điều xe.' },
          }),
        ]);
        normalizedInTeam++;
        totalDriversNormalized++;
      }
    } else {
      normalizedInTeam = existingDrivers.length;
    }

    // --- B. Kiểm tra và cân đối xe cho đủ 3 phân hệ (Agri, Constr, Trans) ---
    const currentAgri = team.vehicles.filter((v) => v.vehicleType?.operationalDomain === VehicleOperationalDomain.AGRICULTURE);
    const currentConstr = team.vehicles.filter((v) => v.vehicleType?.operationalDomain === VehicleOperationalDomain.CONSTRUCTION);
    const currentTrans = team.vehicles.filter((v) => v.vehicleType?.operationalDomain === VehicleOperationalDomain.TRANSPORT);

    let agriDeficit = Math.max(0, 3 - currentAgri.length);
    let constrDeficit = Math.max(0, 3 - currentConstr.length);
    let transDeficit = Math.max(0, 4 - currentTrans.length);

    let vehiclesAllocatedInTeam = 0;

    if (apply && (agriDeficit > 0 || constrDeficit > 0 || transDeficit > 0)) {
      // 1. Xe nông nghiệp
      if (agriDeficit > 0) {
        const candidates = await prisma.vehicle.findMany({
          where: {
            managementUnitId: null,
            category: { in: [VehicleCategory.MAY_CAY, VehicleCategory.MAY_KEO] },
          },
          take: agriDeficit,
        });
        for (const v of candidates) {
          await prisma.vehicle.update({
            where: { id: v.id },
            data: {
              managementUnitId: team.id,
              unit: team.complexCode as Unit,
              complexCode: team.complexCode,
              assignedUnitCode: team.name,
              status: VehicleStatus.CHO_PHAN_CONG,
              conditionStatus: 'HOAT_DONG',
              vehicleTypeId: v.vehicleTypeId || defaultAgriTypeId,
            },
          });
          vehiclesAllocatedInTeam++;
          totalVehiclesAllocated++;
        }
        agriDeficit -= candidates.length;

        for (let k = 1; k <= agriDeficit; k++) {
          const vCode = `XE-AGRI-${team.code}-${String(k).padStart(2, '0')}`;
          const exists = await prisma.vehicle.findUnique({ where: { code: vCode } });
          if (!exists) {
            await prisma.vehicle.create({
              data: {
                code: vCode,
                name: `Máy cày đa năng Kubota M7040 (${team.name})`,
                category: VehicleCategory.MAY_CAY,
                unit: team.complexCode as Unit,
                complexCode: team.complexCode,
                managementUnitId: team.id,
                assignedUnitCode: team.name,
                status: VehicleStatus.CHO_PHAN_CONG,
                conditionStatus: 'HOAT_DONG',
                vehicleTypeId: defaultAgriTypeId,
                fuelQuotaRate: 8.5,
                lastGpsUpdate: new Date(),
                currentLat: 13.5678,
                currentLng: 106.8901,
                currentLocationName: team.name,
                plate: `72A-${Math.floor(10000 + Math.random() * 90000)}`,
              },
            });
            vehiclesAllocatedInTeam++;
            totalVehiclesAllocated++;
          }
        }
      }

      // 2. Xe công trình
      if (constrDeficit > 0) {
        const candidates = await prisma.vehicle.findMany({
          where: {
            managementUnitId: null,
            category: { in: [VehicleCategory.MAY_DAO, VehicleCategory.MAY_UI, VehicleCategory.MAY_SAN, VehicleCategory.MAY_LU, VehicleCategory.MAY_XUC_LAT] },
          },
          take: constrDeficit,
        });
        for (const v of candidates) {
          await prisma.vehicle.update({
            where: { id: v.id },
            data: {
              managementUnitId: team.id,
              unit: team.complexCode as Unit,
              complexCode: team.complexCode,
              assignedUnitCode: team.name,
              status: VehicleStatus.CHO_PHAN_CONG,
              conditionStatus: 'HOAT_DONG',
              vehicleTypeId: v.vehicleTypeId || defaultConstrTypeId,
            },
          });
          vehiclesAllocatedInTeam++;
          totalVehiclesAllocated++;
        }
        constrDeficit -= candidates.length;

        for (let k = 1; k <= constrDeficit; k++) {
          const vCode = `XE-CONSTR-${team.code}-${String(k).padStart(2, '0')}`;
          const exists = await prisma.vehicle.findUnique({ where: { code: vCode } });
          if (!exists) {
            await prisma.vehicle.create({
              data: {
                code: vCode,
                name: `Máy đào bánh xích Komatsu PC200 (${team.name})`,
                category: VehicleCategory.MAY_DAO,
                unit: team.complexCode as Unit,
                complexCode: team.complexCode,
                managementUnitId: team.id,
                assignedUnitCode: team.name,
                status: VehicleStatus.CHO_PHAN_CONG,
                conditionStatus: 'HOAT_DONG',
                vehicleTypeId: defaultConstrTypeId,
                fuelQuotaRate: 14.0,
                lastGpsUpdate: new Date(),
                currentLat: 13.5678,
                currentLng: 106.8901,
                currentLocationName: team.name,
                plate: `72A-${Math.floor(10000 + Math.random() * 90000)}`,
              },
            });
            vehiclesAllocatedInTeam++;
            totalVehiclesAllocated++;
          }
        }
      }

      // 3. Xe vận chuyển
      if (transDeficit > 0) {
        const candidates = await prisma.vehicle.findMany({
          where: {
            managementUnitId: null,
            category: { in: [VehicleCategory.XE_BEN, VehicleCategory.XE_TAI, VehicleCategory.XE_CONTAINER] },
          },
          take: transDeficit,
        });
        for (const v of candidates) {
          await prisma.vehicle.update({
            where: { id: v.id },
            data: {
              managementUnitId: team.id,
              unit: team.complexCode as Unit,
              complexCode: team.complexCode,
              assignedUnitCode: team.name,
              status: VehicleStatus.CHO_PHAN_CONG,
              conditionStatus: 'HOAT_DONG',
              vehicleTypeId: v.vehicleTypeId || defaultTransTypeId,
            },
          });
          vehiclesAllocatedInTeam++;
          totalVehiclesAllocated++;
        }
        transDeficit -= candidates.length;

        for (let k = 1; k <= transDeficit; k++) {
          const vCode = `XE-TRANS-${team.code}-${String(k).padStart(2, '0')}`;
          const exists = await prisma.vehicle.findUnique({ where: { code: vCode } });
          if (!exists) {
            await prisma.vehicle.create({
              data: {
                code: vCode,
                name: `Xe tải ben Howo 10T (${team.name})`,
                category: VehicleCategory.XE_BEN,
                unit: team.complexCode as Unit,
                complexCode: team.complexCode,
                managementUnitId: team.id,
                assignedUnitCode: team.name,
                status: VehicleStatus.CHO_PHAN_CONG,
                conditionStatus: 'HOAT_DONG',
                vehicleTypeId: defaultTransTypeId,
                fuelQuotaRate: 28.0,
                lastGpsUpdate: new Date(),
                currentLat: 13.5678,
                currentLng: 106.8901,
                currentLocationName: team.name,
                plate: `72A-${Math.floor(10000 + Math.random() * 90000)}`,
              },
            });
            vehiclesAllocatedInTeam++;
            totalVehiclesAllocated++;
          }
        }
      }
    }

    // Đảm bảo xe chính trong đội có trạng thái CHO_PHAN_CONG
    if (apply) {
      const readied = await prisma.vehicle.updateMany({
        where: {
          managementUnitId: team.id,
          status: { in: [VehicleStatus.SUA_CHUA, VehicleStatus.BAO_DUONG, VehicleStatus.TAM_DUNG] },
          vehicleType: { isAssignable: true },
        },
        data: {
          status: VehicleStatus.CHO_PHAN_CONG,
          conditionStatus: 'HOAT_DONG',
        },
      });
      totalVehiclesReadied += readied.count;

      // Xóa các unavailability blocking của xe trong đội
      const teamVehicleIds = (await prisma.vehicle.findMany({ where: { managementUnitId: team.id }, select: { id: true } })).map((v) => v.id);
      await prisma.vehicleUnavailability.updateMany({
        where: { vehicleId: { in: teamVehicleIds }, status: UnavailabilityStatus.APPROVED },
        data: { status: UnavailabilityStatus.REJECTED, reason: '[STANDARDIZED] Mở khóa xe để sẵn sàng phân công.' },
      });

      // Hoàn tất các yêu cầu sửa chữa/bảo dưỡng cũ đang treo
      await prisma.workshopRequest.updateMany({
        where: {
          vehicleId: { in: teamVehicleIds },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    // --- C. Đảm bảo Nông cụ (AgriculturalImplement) cho đội ---
    let implementsAllocatedInTeam = 0;
    const isGenuineAgri = (item: { code: string; name: string; model?: string | null; category: string }) => {
      if (!['DAN_CAY', 'DAN_BUA', 'DAN_XOI', 'DAN_RAI_PHAN', 'DAN_PHUN_THUOC', 'RO_MOOC'].includes(item.category)) {
        return false;
      }
      const textNfc = `${item.code} ${item.name} ${item.model ?? ''}`.toLowerCase().normalize('NFC');
      const textNfd = `${item.code} ${item.name} ${item.model ?? ''}`.toLowerCase().normalize('NFD');
      const isExcluded = /bê tông|be tong|taluy|gàu|gau|định hình|dinh hinh|smrm/.test(textNfc) ||
                         /bê tông|be tong|taluy|gàu|gau|định hình|dinh hinh|smrm/.test(textNfd);
      return !isExcluded;
    };

    const teamAllImpls = await prisma.agriculturalImplement.findMany({
      where: { managementUnitId: team.id },
      include: { compatibleVehicleTypes: true },
    });
    const currentAgriImplements = teamAllImpls.filter(isGenuineAgri);

    const targetImplements = 5;
    const implementDeficit = Math.max(0, targetImplements - currentAgriImplements.length);

    if (apply && implementDeficit > 0) {
      const unassignedAll = await prisma.agriculturalImplement.findMany({
        where: {
          managementUnitId: null,
          category: { in: [ImplementCategory.DAN_CAY, ImplementCategory.DAN_BUA, ImplementCategory.DAN_XOI, ImplementCategory.RO_MOOC, ImplementCategory.DAN_PHUN_THUOC] },
        },
      });
      const unassignedImpls = unassignedAll.filter(isGenuineAgri).slice(0, implementDeficit);

      for (const impl of unassignedImpls) {
        await prisma.agriculturalImplement.update({
          where: { id: impl.id },
          data: {
            managementUnitId: team.id,
            unit: team.complexCode as Unit,
            assignedUnitCode: team.name,
            status: ImplementStatus.IN_DEPOT,
            currentVehicleId: null,
            usageMode: EquipmentUsageMode.ATTACHABLE,
            technicalCondition: TechnicalCondition.GOOD,
          },
        });
        implementsAllocatedInTeam++;
        totalImplementsAllocated++;
      }

      const remainingImplDeficit = implementDeficit - unassignedImpls.length;
      const implTypes = [
        { name: 'Dàn cày 4 chảo Kubota DP', cat: ImplementCategory.DAN_CAY, codePref: 'TB-DC' },
        { name: 'Dàn bừa đĩa 24 chảo nông nghiệp', cat: ImplementCategory.DAN_BUA, codePref: 'TB-DB' },
        { name: 'Dàn xới đất làm tơi xốp', cat: ImplementCategory.DAN_XOI, codePref: 'TB-DX' },
        { name: 'Rơ-moóc kéo nông sản 5T', cat: ImplementCategory.RO_MOOC, codePref: 'TB-RM' },
        { name: 'Dàn phun thuốc tự hành', cat: ImplementCategory.DAN_PHUN_THUOC, codePref: 'TB-DP' },
      ];

      for (let m = 0; m < remainingImplDeficit; m++) {
        const item = implTypes[m % implTypes.length];
        const implCode = `${item.codePref}-${team.code}-${String(m + 1).padStart(2, '0')}`;
        let existingImpl = await prisma.agriculturalImplement.findUnique({ where: { code: implCode } });
        if (!existingImpl) {
          existingImpl = await prisma.agriculturalImplement.create({
            data: {
              code: implCode,
              name: `${item.name} (${team.name})`,
              category: item.cat,
              unit: team.complexCode as Unit,
              managementUnitId: team.id,
              assignedUnitCode: team.name,
              status: ImplementStatus.IN_DEPOT,
              usageMode: EquipmentUsageMode.ATTACHABLE,
              technicalCondition: TechnicalCondition.GOOD,
              standardPurpose: 'Phụ kiện gắn kèm cơ giới nông nghiệp',
            },
          });
          implementsAllocatedInTeam++;
          totalImplementsAllocated++;
        } else if (existingImpl.managementUnitId !== team.id) {
          await prisma.agriculturalImplement.update({
            where: { id: existingImpl.id },
            data: {
              managementUnitId: team.id,
              status: ImplementStatus.IN_DEPOT,
              usageMode: EquipmentUsageMode.ATTACHABLE,
              technicalCondition: TechnicalCondition.GOOD,
            },
          });
          implementsAllocatedInTeam++;
          totalImplementsAllocated++;
        }
      }
    }

    if (apply) {
      // Đảm bảo tất cả nông cụ của đội đều IN_DEPOT và ATTACHABLE
      await prisma.agriculturalImplement.updateMany({
        where: { managementUnitId: team.id },
        data: {
          status: ImplementStatus.IN_DEPOT,
          currentVehicleId: null,
          usageMode: EquipmentUsageMode.ATTACHABLE,
          technicalCondition: TechnicalCondition.GOOD,
        },
      });

      // Tương thích cho tất cả nông cụ với các loại xe nông nghiệp của đội
      const teamAgriVehicles = await prisma.vehicle.findMany({
        where: { managementUnitId: team.id, vehicleTypeId: { not: null } },
        select: { vehicleTypeId: true },
      });
      const teamVehicleTypeIds = [...new Set([
        ...teamAgriVehicles.map((v) => v.vehicleTypeId!).filter(Boolean),
        ...(defaultAgriTypeId ? [defaultAgriTypeId] : []),
      ])];
      const allTeamImpls = await prisma.agriculturalImplement.findMany({
        where: { managementUnitId: team.id },
        select: { id: true },
      });

      const compatData: Array<{ implementId: number; vehicleTypeId: number; source: string }> = [];
      for (const impl of allTeamImpls) {
        for (const vtId of teamVehicleTypeIds) {
          compatData.push({
            implementId: impl.id,
            vehicleTypeId: vtId,
            source: 'STANDARDIZED',
          });
        }
      }
      if (compatData.length > 0) {
        await prisma.implementVehicleTypeCompatibility.createMany({
          data: compatData,
          skipDuplicates: true,
        });
      }
    }

    // --- D. Tính toán và nâng số lượng tài xế đạt tỉ lệ 7/10 xe (70%) ---
    const finalOperationalVehicles = apply
      ? await prisma.vehicle.count({
          where: {
            managementUnitId: team.id,
            vehicleType: {
              operationalDomain: { in: [VehicleOperationalDomain.AGRICULTURE, VehicleOperationalDomain.CONSTRUCTION, VehicleOperationalDomain.TRANSPORT] },
            },
          },
        })
      : team.vehicles.filter((v) => [VehicleOperationalDomain.AGRICULTURE, VehicleOperationalDomain.CONSTRUCTION, VehicleOperationalDomain.TRANSPORT].includes(v.vehicleType?.operationalDomain as any)).length + (agriDeficit + constrDeficit + transDeficit);

    // Tỉ lệ 7/10:
    // target = Math.ceil(finalOperationalVehicles * 0.7)
    // Tối thiểu 7 tài xế cho bất kỳ đội nào có từ 7 xe trở lên.
    // Với các xí nghiệp lớn (>40 xe), giới hạn trần an toàn là 35 tài xế sẵn sàng.
    let targetDrivers = Math.ceil(finalOperationalVehicles * 0.7);
    if (finalOperationalVehicles >= 7) targetDrivers = Math.max(targetDrivers, 7);
    if (finalOperationalVehicles > 50) targetDrivers = Math.min(targetDrivers, 35);
    targetDrivers = Math.max(targetDrivers, 7);

    const currentDriverCount = existingDrivers.length;
    const driverDeficit = Math.max(0, targetDrivers - currentDriverCount);
    let driversCreatedInTeam = 0;

    if (apply && driverDeficit > 0) {
      for (let idx = 1; driversCreatedInTeam < driverDeficit && idx <= 50; idx++) {
        const account = accountKey(team.code, idx);
        const exists = await prisma.user.findUnique({ where: { code: account.code } });
        if (exists) continue;

        const licenseClass = DEMO_LICENSE_CLASSES[(idx - 1) % DEMO_LICENSE_CLASSES.length];
        const licensesJson = demoLicenses(team.id, idx, licenseClass);
        const fullName = `Tài xế demo ${team.name} ${String(idx).padStart(2, '0')}`;

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              code: account.code,
              username: account.username,
              passwordHash,
              fullName,
              role: Role.DRIVER,
              unit: team.complexCode as Unit,
              employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
              joinedDate: new Date('2026-01-01T00:00:00.000Z'),
              licenseClass,
              licenseNumber: `GPLX-${team.id}-${String(idx).padStart(2, '0')}`,
              licenseExpiryDate: futureExpiry,
              healthCheckExpiryDate: futureHealth,
              currentShiftStatus: DriverShiftStatus.SAN_SANG,
              currentLocation: team.name,
              isActive: true,
              notes: `[DEMO 7/10] Tài xế chuẩn hóa vận hành 3 loại lệnh cho ${team.name}.`,
            },
          });
          await tx.driverProfile.create({
            data: {
              userId: user.id,
              employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
              joinedDate: new Date('2026-01-01T00:00:00.000Z'),
              licenseClass,
              licenseNumber: `GPLX-${team.id}-${String(idx).padStart(2, '0')}`,
              licenseExpiryDate: futureExpiry,
              healthCheckExpiryDate: futureHealth,
              currentShiftStatus: DriverShiftStatus.SAN_SANG,
              currentLocation: team.name,
              licensesJson,
            },
          });
          await tx.employeeRecord.create({
            data: {
              empCode: account.code,
              fullName,
              businessUnit: 'THACO AGRI',
              complex: team.complexCode,
              enterprise: team.name,
              team: team.name,
              position: 'Tài xế/Thợ vận hành',
              licenseClass,
              licenseNumber: `GPLX-${team.id}-${String(idx).padStart(2, '0')}`,
              licenseExpiryDate: '31/12/2035',
              healthCheckExpiryDate: '31/12/2035',
              status: 'Hoạt động - Vận hành',
              username: account.username,
              joinedDate: '01/01/2026',
            },
          });
          await tx.driverManagementAssignment.create({
            data: {
              driverId: user.id,
              managementUnitId: parentUnitId,
              teamUnitId: team.id,
              effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
              assignedById: admin.id,
              reason: `[DEMO 7/10] Chuẩn hóa đủ tỉ lệ tài xế cho ${team.name}.`,
            },
          });
        }, { timeout: 30_000, maxWait: 10_000 });

        driversCreatedInTeam++;
        totalDriversCreated++;
      }
    }

    const finalDriverCount = currentDriverCount + (apply ? driversCreatedInTeam : driverDeficit);
    const finalRatio = finalOperationalVehicles > 0 ? (finalDriverCount / finalOperationalVehicles).toFixed(2) : 'N/A';

    teamReports.push({
      complex: team.complexCode,
      code: team.code,
      name: team.name,
      manager: mgrNames,
      operationalVehicles: finalOperationalVehicles,
      driversNormalized: normalizedInTeam,
      driversCreated: apply ? driversCreatedInTeam : driverDeficit,
      totalDrivers: finalDriverCount,
      ratio: finalRatio,
      vehiclesAllocated: vehiclesAllocatedInTeam,
      implementsAllocated: implementsAllocatedInTeam,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    dryRun: !apply,
    totalTeams: teams.length,
    totalDriversNormalized,
    totalDriversCreated,
    totalVehiclesAllocated,
    totalVehiclesReadied,
    totalImplementsAllocated,
    teams: teamReports,
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log('=== KẾT QUẢ CHUẨN HÓA TOÀN DIỆN ===');
  console.log(`- Tài xế được chuẩn hóa GPLX B2/C/CE: ${apply ? totalDriversNormalized : 'Dự kiến ' + teams.reduce((s, t) => s + t.teamAssignments.length, 0)}`);
  console.log(`- Tài xế được tạo mới đạt tỉ lệ 7/10: ${apply ? totalDriversCreated : 'Dự kiến ' + teamReports.reduce((s, t) => s + t.driversCreated, 0)}`);
  console.log(`- Xe được điều chuyển/bổ sung: ${totalVehiclesAllocated}`);
  console.log(`- Xe được chuyển trạng thái SẴN SÀNG: ${totalVehiclesReadied}`);
  console.log(`- Nông cụ được phân bổ/gán tương thích: ${totalImplementsAllocated}`);
  console.log(`- Báo cáo chi tiết đã lưu tại: ${reportPath}`);
  console.log('================================================================\n');

  console.log('| KLH | Mã Đội | Tên Đội | Đội trưởng | Xe Vận Hành | Nông Cụ | Tài Xế | Tỉ lệ TX/Xe |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const t of teamReports) {
    console.log(`| ${t.complex} | ${t.code} | ${t.name} | ${t.manager} | ${t.operationalVehicles} | +${t.implementsAllocated} | ${t.totalDrivers} | ${t.ratio} |`);
  }
}

main()
  .catch((err) => {
    console.error('Lỗi chuẩn hóa:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
