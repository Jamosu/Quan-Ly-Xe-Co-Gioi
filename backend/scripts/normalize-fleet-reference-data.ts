import { CatalogType, PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { canonicalizeMasterDataValues, normalizeMasterDataKey } from '../src/common/utils/master-data-normalization';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const catalogTypeByField = {
  origin: CatalogType.VEHICLE_ORIGIN,
  purchaseCondition: CatalogType.PURCHASE_CONDITION,
  supplier: CatalogType.SUPPLIER,
  companyOwner: CatalogType.COMPANY_OWNER,
} as const;

const closeNames = (values: string[]) => values.flatMap((left, index) => values.slice(index + 1)
  .filter((right) => {
    const a = normalizeMasterDataKey(left).replace(/[^\p{L}\p{N}]/gu, '');
    const b = normalizeMasterDataKey(right).replace(/[^\p{L}\p{N}]/gu, '');
    return a !== b && (a.includes(b) || b.includes(a));
  })
  .map((right) => [left, right]));

async function main() {
  const [vehicles, implementsData, units, locations, catalogs] = await Promise.all([
    prisma.vehicle.findMany({ select: { id: true, assignedUnitCode: true, currentLocationName: true, origin: true, purchaseCondition: true, supplier: true, companyOwner: true } }),
    prisma.agriculturalImplement.findMany({ select: { id: true, assignedUnitCode: true, gatheringLocation: true } }),
    prisma.driverManagementUnit.findMany({ where: { status: 'ACTIVE' }, select: { name: true, code: true } }),
    prisma.operationalLocation.findMany({ where: { active: true }, select: { name: true } }),
    prisma.catalogItem.findMany({ select: { type: true, name: true } }),
  ]);

  const unitValues = [...vehicles.map((v) => v.assignedUnitCode), ...implementsData.map((v) => v.assignedUnitCode)];
  const locationValues = [...vehicles.map((v) => v.currentLocationName), ...implementsData.map((v) => v.gatheringLocation)];
  const canonicalUnits = canonicalizeMasterDataValues(unitValues, units.flatMap((u) => [u.name, u.code]));
  const canonicalLocations = canonicalizeMasterDataValues(locationValues, locations.map((l) => l.name));
  const unitMap = new Map(canonicalUnits.map((value) => [normalizeMasterDataKey(value), value]));
  const locationMap = new Map(canonicalLocations.map((value) => [normalizeMasterDataKey(value), value]));

  const fieldMaps = new Map<string, Map<string, string>>();
  for (const [field, type] of Object.entries(catalogTypeByField)) {
    const values = vehicles.map((vehicle) => vehicle[field as keyof typeof vehicle] as string | null);
    const labels = catalogs.filter((item) => item.type === type).map((item) => item.name);
    const canonical = canonicalizeMasterDataValues(values, labels);
    fieldMaps.set(field, new Map(canonical.map((value) => [normalizeMasterDataKey(value), value])));
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    vehicles: vehicles.length,
    implements: implementsData.length,
    canonicalUnits,
    canonicalLocations,
    reviewCandidates: {
      units: closeNames(canonicalUnits),
      locations: closeNames(canonicalLocations),
    },
  };

  if (apply) {
    await prisma.$transaction(async (tx) => {
      for (const [field, type] of Object.entries(catalogTypeByField)) {
        for (const name of [...(fieldMaps.get(field)?.values() || [])]) {
          const normalizedKey = normalizeMasterDataKey(name);
          const id = `${type}-${Buffer.from(normalizedKey).toString('base64url').slice(0, 48)}`;
          await tx.catalogItem.upsert({
            where: { id },
            update: { name, normalizedKey },
            create: { id, code: id, name, normalizedKey, type },
          });
        }
      }
      for (const vehicle of vehicles) {
        const references = Object.fromEntries(Object.keys(catalogTypeByField).map((field) => {
          const value = vehicle[field as keyof typeof vehicle] as string | null;
          return [field, value ? fieldMaps.get(field)?.get(normalizeMasterDataKey(value)) || value : value];
        }));
        await tx.vehicle.update({ where: { id: vehicle.id }, data: {
          assignedUnitCode: vehicle.assignedUnitCode ? unitMap.get(normalizeMasterDataKey(vehicle.assignedUnitCode)) : null,
          currentLocationName: vehicle.currentLocationName ? locationMap.get(normalizeMasterDataKey(vehicle.currentLocationName)) : null,
          ...references,
        } });
      }
      for (const item of implementsData) {
        await tx.agriculturalImplement.update({ where: { id: item.id }, data: {
          assignedUnitCode: item.assignedUnitCode ? unitMap.get(normalizeMasterDataKey(item.assignedUnitCode)) : null,
          gatheringLocation: item.gatheringLocation ? locationMap.get(normalizeMasterDataKey(item.gatheringLocation)) : null,
        } });
      }
    }, { timeout: 120_000 });
  }

  const reportPath = resolve(process.cwd(), 'import-reports', `fleet-reference-normalization-${apply ? 'applied' : 'dry-run'}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

main().finally(() => prisma.$disconnect());
