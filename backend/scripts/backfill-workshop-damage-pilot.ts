import {
  ImplementStatus,
  Prisma,
  PrismaClient,
  RepairTier,
  TechnicalCondition,
  VehicleStatus,
  WorkshopDocumentType,
  WorkshopPriority,
  WorkshopRepairRoute,
  WorkshopRequestSource,
  WorkshopRequestStatus,
  WorkshopRequestType,
} from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const VEHICLE_MAX_ID = 3154;
const IMPLEMENT_MAX_ID = 1006;
const TERMINAL = [WorkshopRequestStatus.COMPLETED, WorkshopRequestStatus.CANCELLED];
const DOCUMENT_TYPES = [
  WorkshopDocumentType.BM09_REQUEST,
  WorkshopDocumentType.BM01_INCIDENT,
  WorkshopDocumentType.BM02_REPAIR,
  WorkshopDocumentType.BM10_REPAIR_HISTORY,
  WorkshopDocumentType.BM11_TECHNICAL_REPORT,
  WorkshopDocumentType.BM12_ACCEPTANCE,
];

const vehicleCode = (id: number) => `SC-PILOT-V-${String(id).padStart(5, '0')}`;
const implementCode = (id: number) => `SC-PILOT-I-${String(id).padStart(5, '0')}`;

async function loadSnapshot() {
  const [allVehicles, allImplements] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        id: { lte: VEHICLE_MAX_ID },
        OR: [{ conditionStatus: 'Hư hỏng / Đang sửa chữa' }, { status: VehicleStatus.SUA_CHUA }],
        workshopRequests: { none: { type: WorkshopRequestType.REPAIR, status: { notIn: TERMINAL } } },
      },
      select: { id: true, code: true, plate: true, conditionStatus: true, currentLocationName: true },
      orderBy: { id: 'asc' },
    }),
    prisma.agriculturalImplement.findMany({
      where: {
        id: { lte: IMPLEMENT_MAX_ID },
        technicalCondition: TechnicalCondition.NEED_REPAIR,
        workshopRequests: { none: { type: WorkshopRequestType.REPAIR, status: { notIn: TERMINAL } } },
      },
      select: { id: true, code: true, technicalCondition: true, gatheringLocation: true },
      orderBy: { id: 'asc' },
    }),
  ]);
  return {
    allVehicles,
    allImplements,
    vehicles: allVehicles.filter((asset) => asset.id % 2 === 0),
    implements: allImplements.filter((asset) => asset.id % 2 === 0),
  };
}

async function main() {
  const snapshot = await loadSnapshot();
  const report = {
    mode: APPLY ? 'apply' : 'dry-run',
    snapshotLimits: { vehicleId: VEHICLE_MAX_ID, implementId: IMPLEMENT_MAX_ID },
    candidatesBefore: { vehicles: snapshot.allVehicles.length, implements: snapshot.allImplements.length, total: snapshot.allVehicles.length + snapshot.allImplements.length },
    selectedForPilot: { vehicles: snapshot.vehicles.length, implements: snapshot.implements.length, total: snapshot.vehicles.length + snapshot.implements.length },
    expectedRemaining: {
      vehicles: snapshot.allVehicles.length - snapshot.vehicles.length,
      implements: snapshot.allImplements.length - snapshot.implements.length,
      total: snapshot.allVehicles.length + snapshot.allImplements.length - snapshot.vehicles.length - snapshot.implements.length,
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) return;

  const requestRows: Prisma.WorkshopRequestCreateManyInput[] = [
    ...snapshot.vehicles.map((asset) => ({
      code: vehicleCode(asset.id), type: WorkshopRequestType.REPAIR, source: WorkshopRequestSource.ASSET_CONDITION,
      status: WorkshopRequestStatus.RECEIVED, repairRoute: WorkshopRepairRoute.INTERNAL, priority: WorkshopPriority.EQUIPMENT,
      repairTier: RepairTier.TIEU_TU, vehicleId: asset.id,
      issueDescription: `Tình trạng tài sản: ${asset.conditionStatus || 'Đang sửa chữa'}.`,
      incidentLocation: asset.currentLocationName,
    })),
    ...snapshot.implements.map((asset) => ({
      code: implementCode(asset.id), type: WorkshopRequestType.REPAIR, source: WorkshopRequestSource.ASSET_CONDITION,
      status: WorkshopRequestStatus.RECEIVED, repairRoute: WorkshopRepairRoute.INTERNAL, priority: WorkshopPriority.EQUIPMENT,
      repairTier: RepairTier.TIEU_TU, implementId: asset.id,
      issueDescription: 'Tình trạng thiết bị: Cần sửa chữa.',
      incidentLocation: asset.gatheringLocation,
    })),
  ];
  const codes = requestRows.map((row) => row.code);
  if (!requestRows.length) {
    console.log(JSON.stringify({ applied: { inserted: 0, requests: 0, documents: 0 }, message: 'Không còn tài sản ID chẵn trong snapshot cần backfill.' }, null, 2));
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const inserted = await tx.workshopRequest.createMany({ data: requestRows, skipDuplicates: true });
    const requests = await tx.workshopRequest.findMany({ where: { code: { in: codes } }, select: { id: true } });
    await tx.workshopRequestDocument.createMany({
      data: requests.flatMap((request) => DOCUMENT_TYPES.map((type) => ({ requestId: request.id, type }))),
      skipDuplicates: true,
    });
    await tx.vehicle.updateMany({ where: { id: { in: snapshot.vehicles.map((asset) => asset.id) } }, data: { status: VehicleStatus.SUA_CHUA } });
    await tx.agriculturalImplement.updateMany({ where: { id: { in: snapshot.implements.map((asset) => asset.id) } }, data: { status: ImplementStatus.MAINTENANCE } });
    return { inserted: inserted.count, requests: requests.length, documents: requests.length * DOCUMENT_TYPES.length };
  }, { maxWait: 30_000, timeout: 120_000 });

  console.log(JSON.stringify({ applied: result }, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
