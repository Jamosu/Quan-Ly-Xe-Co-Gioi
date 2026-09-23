import { PrismaClient, DriverManagementLevel, DriverManagementUnitStatus, DriverManagementUnitType } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeNFC(str: string): string {
  return (str || '').normalize('NFC').trim();
}

function canonicalKey(name: string): string {
  return normalizeNFC(name).toUpperCase();
}

const prefixMap: Record<string, string> = {
  KOUN_MOM: 'KM',
  NAM_LAO: 'NL',
  SNOUL: 'SN',
};

function generateUnitCode(complexCode: string, unitName: string): string {
  const prefix = prefixMap[complexCode] || complexCode;
  const slug = unitName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `DV-${prefix}-${slug}`.slice(0, 40);
}

function inferUnitType(name: string): DriverManagementUnitType {
  const upper = name.toUpperCase();
  if (upper.startsWith('BAN ') || upper.includes(' BAN ')) return DriverManagementUnitType.BAN;
  if (upper.startsWith('PHÒNG ') || upper.startsWith('PHONG ')) return DriverManagementUnitType.PHONG;
  if (upper.startsWith('TRUNG TÂM') || upper.startsWith('TRUNG TAM') || upper.startsWith('TTBT')) return DriverManagementUnitType.TRUNG_TAM;
  if (upper.startsWith('XÍ NGHIỆP') || upper.startsWith('XI NGHIEP') || upper.startsWith('XN ') || upper.startsWith('XN')) return DriverManagementUnitType.XI_NGHIEP;
  if (upper.startsWith('NÔNG TRƯỜNG') || upper.startsWith('NONG TRUONG') || upper.startsWith('NT ') || upper.startsWith('NT')) return DriverManagementUnitType.NONG_TRUONG;
  if (upper.startsWith('ĐỘI ') || upper.startsWith('DOI ') || upper.startsWith('CGTC') || upper.startsWith('CGLĐ') || upper.startsWith('CGSX')) return DriverManagementUnitType.DOI;
  if (upper.startsWith('TỔ ') || upper.startsWith('TO ')) return DriverManagementUnitType.TO;
  return DriverManagementUnitType.KHAC;
}

export async function syncUnitsFromVehicles(dryRun = false) {
  console.log(`[syncUnitsFromVehicles] Starting sync (dryRun=${dryRun})...`);

  if (!dryRun) {
    throw new Error(
      'Đã khóa thao tác: đơn vị sử dụng trên hồ sơ xe không phải danh mục đơn vị quản lý. '
      + 'Hãy dùng npm run import:cg-management để đồng bộ từ sheet NS QUẢN LÝ CG.',
    );
  }

  // 1. Fetch all vehicles with assignedUnitCode
  const vehicles = await prisma.vehicle.findMany({
    where: { assignedUnitCode: { not: null, notIn: [''] } },
    select: { id: true, complexCode: true, assignedUnitCode: true },
  });
  console.log(`Found ${vehicles.length} vehicles with assignedUnitCode`);

  // 2. Group by (complexCode, canonicalKey)
  interface UnitGroup {
    complexCode: string;
    canonicalName: string;
    rawVariants: Map<string, number>;
    vehicleIds: number[];
  }

  const groupMap = new Map<string, UnitGroup>();

  for (const v of vehicles) {
    const raw = v.assignedUnitCode!.trim();
    const cKey = `${v.complexCode}:::${canonicalKey(raw)}`;

    if (!groupMap.has(cKey)) {
      groupMap.set(cKey, {
        complexCode: v.complexCode,
        canonicalName: raw,
        rawVariants: new Map(),
        vehicleIds: [],
      });
    }

    const group = groupMap.get(cKey)!;
    group.rawVariants.set(raw, (group.rawVariants.get(raw) || 0) + 1);
    group.vehicleIds.push(v.id);
  }

  // Choose the best display name (most frequent variant)
  for (const group of groupMap.values()) {
    let bestName = group.canonicalName;
    let maxCount = -1;
    for (const [name, count] of group.rawVariants.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestName = normalizeNFC(name);
      }
    }
    group.canonicalName = bestName;
  }

  console.log(`Derived ${groupMap.size} unique operational units across all complexes`);

  // 3. Fetch implements to link
  const implementsList = await prisma.agriculturalImplement.findMany({
    where: { assignedUnitCode: { not: null, notIn: [''] } },
    select: { id: true, assignedUnitCode: true },
  });
  console.log(`Found ${implementsList.length} implements with assignedUnitCode`);

  if (dryRun) {
    console.log('DRY RUN complete. Exiting without DB changes.');
    return;
  }

  // 4. Upsert units into driver_management_units and update vehicles/implements
  let createdCount = 0;
  let updatedCount = 0;
  const unitIdByGroupKey = new Map<string, number>();

  // Ensure code uniqueness within complexCode
  const usedCodes = new Set<string>();

  for (const group of groupMap.values()) {
    let baseCode = generateUnitCode(group.complexCode, group.canonicalName);
    let code = baseCode;
    let suffix = 1;
    while (usedCodes.has(`${group.complexCode}:::${code}`)) {
      suffix++;
      code = `${baseCode}-${suffix}`.slice(0, 40);
    }
    usedCodes.add(`${group.complexCode}:::${code}`);

    const unitType = inferUnitType(group.canonicalName);

    // Check if unit with this name already exists in this complex
    let existing = await prisma.driverManagementUnit.findFirst({
      where: { complexCode: group.complexCode, name: group.canonicalName },
    });

    if (!existing) {
      // Check if code exists
      existing = await prisma.driverManagementUnit.findUnique({
        where: { complexCode_code: { complexCode: group.complexCode, code } },
      });
    }

    let unitId: number;

    if (existing) {
      const updated = await prisma.driverManagementUnit.update({
        where: { id: existing.id },
        data: {
          name: group.canonicalName,
          level: DriverManagementLevel.OWNER,
          unitType,
          status: DriverManagementUnitStatus.ACTIVE,
          parentId: null, // As an operating unit, top-level in units tab
        },
      });
      unitId = updated.id;
      updatedCount++;
    } else {
      const created = await prisma.driverManagementUnit.create({
        data: {
          complexCode: group.complexCode,
          code,
          name: group.canonicalName,
          level: DriverManagementLevel.OWNER,
          unitType,
          status: DriverManagementUnitStatus.ACTIVE,
          parentId: null,
        },
      });
      unitId = created.id;
      createdCount++;
    }

    unitIdByGroupKey.set(`${group.complexCode}:::${canonicalKey(group.canonicalName)}`, unitId);

    // Update vehicles
    await prisma.vehicle.updateMany({
      where: { id: { in: group.vehicleIds } },
      data: {
        managementUnitId: unitId,
        assignedUnitCode: group.canonicalName,
      },
    });
  }

  // Link implements
  let implementsUpdated = 0;
  for (const imp of implementsList) {
    const raw = imp.assignedUnitCode!.trim();
    const cNameKey = canonicalKey(raw);

    // Find any unit with this canonical name
    const matchingUnitIds = Array.from(unitIdByGroupKey.entries())
      .filter(([k]) => k.endsWith(`:::${cNameKey}`))
      .map(([, id]) => id);

    if (matchingUnitIds.length > 0) {
      await prisma.agriculturalImplement.update({
        where: { id: imp.id },
        data: {
          managementUnitId: matchingUnitIds[0],
          assignedUnitCode: normalizeNFC(raw),
        },
      });
      implementsUpdated++;
    }
  }

  // Deactivate old placeholder units that have 0 vehicles and 0 implements
  const unusedOldUnits = await prisma.driverManagementUnit.findMany({
    where: {
      status: DriverManagementUnitStatus.ACTIVE,
      vehicles: { none: {} },
      implements: { none: {} },
      children: { none: {} },
      id: { notIn: Array.from(unitIdByGroupKey.values()) },
    },
    select: { id: true, code: true, name: true },
  });

  if (unusedOldUnits.length > 0) {
    await prisma.driverManagementUnit.updateMany({
      where: { id: { in: unusedOldUnits.map((u) => u.id) } },
      data: { status: DriverManagementUnitStatus.INACTIVE },
    });
    console.log(`Deactivated ${unusedOldUnits.length} unused placeholder units without vehicles.`);
  }

  console.log(`[syncUnitsFromVehicles] Done. Created: ${createdCount}, Updated: ${updatedCount}, Implements linked: ${implementsUpdated}`);
}

async function run() {
  await syncUnitsFromVehicles(false);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
