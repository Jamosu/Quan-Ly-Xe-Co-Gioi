import 'dotenv/config';
import {
  DispatchStatus,
  Prisma,
  PrismaClient,
  Unit,
  WorkAssignmentMode,
  WorkAssignmentStatus,
  WorkOrderStatus,
} from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { classifyWorkbookSources } from './vehicle-import/workbook-reader';

const prisma = new PrismaClient();
const TARGET_DISPATCH_ID = 493;
const TARGET_VEHICLE_CODE = 'HCA-RMC-001';
const REPAIR_REASON = 'Sửa dữ liệu: thu hồi tài nguyên bị phân loại nhầm giữa xe và thiết bị.';

function argumentValue(name: string): string | undefined {
  const direct = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sourceSheets(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function withoutImplementIds(value: Prisma.JsonValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value || Array.isArray(value) || typeof value !== 'object') return value === null ? Prisma.JsonNull : value;
  const { implementIds: _removed, ...rest } = value as Prisma.JsonObject;
  return rest as Prisma.InputJsonValue;
}

async function inspect() {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      complexCode: 'KOUN_MOM',
      code: { in: (await prisma.agriculturalImplement.findMany({ where: { unit: Unit.KOUN_MOM }, select: { code: true } })).map((item) => item.code) },
    },
    select: {
      id: true,
      code: true,
      name: true,
      sourceSheets: true,
      _count: {
        select: {
          currentImplements: true,
          implementLogs: true,
          plotProgresses: true,
          dispatchOrders: true,
          transportOrders: true,
          feedTrips: true,
          fuelTickets: true,
          maintenanceRecords: true,
          maintenanceOccurrences: true,
          bdc1Logs: true,
          owedPartNotes: true,
          repairTickets: true,
          workshopRequests: true,
          alertEvents: true,
          sosAlerts: true,
          driverAssignments: true,
          workAssignments: true,
          executionSegments: true,
          unavailability: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });
  const implementationRows = await prisma.agriculturalImplement.findMany({
    where: { code: { in: vehicles.map((item) => item.code) } },
    select: { id: true, code: true },
  });
  const implementByCode = new Map(implementationRows.map((item) => [item.code, item.id]));
  const conflicts = vehicles.filter((vehicle) => classifyWorkbookSources(sourceSheets(vehicle.sourceSheets)) === 'CONFLICT');
  const candidates = vehicles.filter((vehicle) => !conflicts.includes(vehicle));

  const workshopRequests = await prisma.workshopRequest.findMany({
    where: { vehicleId: { in: candidates.map((item) => item.id) } },
    select: { id: true, code: true, vehicleId: true, implementId: true, vehicle: { select: { code: true } } },
  });
  const unsafeWorkshopRequests = workshopRequests.filter((request) => {
    const targetId = implementByCode.get(request.vehicle.code);
    return !targetId || (request.implementId !== null && request.implementId !== targetId);
  });

  const allowedCountKeys = new Set(['workshopRequests']);
  const unsupportedLinks: Array<{ code: string; links: Record<string, number> }> = [];
  for (const vehicle of candidates) {
    const links = Object.fromEntries(
      Object.entries(vehicle._count).filter(([key, count]) => {
        if (!count || allowedCountKeys.has(key)) return false;
        return !(vehicle.code === TARGET_VEHICLE_CODE && ['dispatchOrders', 'workAssignments', 'alertEvents'].includes(key));
      }),
    );
    if (Object.keys(links).length) unsupportedLinks.push({ code: vehicle.code, links });
  }

  const targetDispatch = await prisma.dispatchOrder.findUnique({
    where: { id: TARGET_DISPATCH_ID },
    select: {
      id: true,
      code: true,
      vehicleId: true,
      workOrderId: true,
      operationalWorkOrder: {
        select: {
          id: true,
          createdById: true,
          status: true,
          categoryDetails: true,
          vehicleAssignments: {
            select: { id: true, vehicleId: true, status: true, startAt: true, endAt: true, assignedById: true, reason: true, createdAt: true },
          },
        },
      },
    },
  });
  const targetVehicle = candidates.find((item) => item.code === TARGET_VEHICLE_CODE);
  if (targetVehicle && (!targetDispatch || targetDispatch.vehicleId !== targetVehicle.id || !targetDispatch.operationalWorkOrder)) {
    unsupportedLinks.push({ code: TARGET_VEHICLE_CODE, links: { unexpectedDispatchState: 1 } });
  }

  return {
    candidates,
    conflicts,
    implementByCode,
    workshopRequests,
    unsafeWorkshopRequests,
    unsupportedLinks,
    targetDispatch,
    targetVehicle,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const reportPath = resolve(
    argumentValue('--report') || resolve(process.cwd(), 'import-reports', 'vehicle-implement-overlap-repair.json'),
  );
  const state = await inspect();
  const blockers = [
    ...state.conflicts.map((item) => `Xung đột nguồn xe/thiết bị: ${item.code}`),
    ...state.unsafeWorkshopRequests.map((item) => `Yêu cầu xưởng không thể chuyển an toàn: ${item.code}`),
    ...state.unsupportedLinks.map((item) => `Liên kết chưa hỗ trợ ${item.code}: ${JSON.stringify(item.links)}`),
  ];

  let applied = false;
  if (apply && blockers.length === 0 && state.candidates.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const request of state.workshopRequests) {
        await tx.workshopRequest.update({
          where: { id: request.id },
          data: { vehicleId: null, implementId: state.implementByCode.get(request.vehicle.code)! },
        });
      }

      if (state.targetVehicle && state.targetDispatch?.operationalWorkOrder) {
        const workOrder = state.targetDispatch.operationalWorkOrder;
        const now = new Date();
        await tx.workVehicleAssignment.updateMany({
          where: {
            workOrderId: workOrder.id,
            vehicleId: state.targetVehicle.id,
            status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] },
          },
          data: { status: WorkAssignmentStatus.CANCELLED, endAt: now, reason: REPAIR_REASON },
        });
        await tx.workDriverAssignment.updateMany({
          where: {
            workOrderId: workOrder.id,
            status: { in: [WorkAssignmentStatus.ASSIGNED, WorkAssignmentStatus.ACCEPTED] },
          },
          data: { status: WorkAssignmentStatus.CANCELLED, endAt: now, reason: REPAIR_REASON },
        });
        await tx.alertEvent.updateMany({
          where: { vehicleId: state.targetVehicle.id, sourceType: 'DispatchOrder', sourceId: String(TARGET_DISPATCH_ID) },
          data: { vehicleId: null, implementId: null },
        });
        await tx.dispatchOrder.update({
          where: { id: TARGET_DISPATCH_ID },
          data: {
            vehicleId: null,
            driverId: null,
            implementId: null,
            assignedById: null,
            assignedAt: null,
            status: DispatchStatus.APPROVED,
            isDelayed: false,
          },
        });
        await tx.operationalWorkOrder.update({
          where: { id: workOrder.id },
          data: {
            status: WorkOrderStatus.APPROVED,
            assignmentMode: WorkAssignmentMode.FIXED_ASSIGNMENT,
            requestedVehicleTypeId: null,
            categoryDetails: withoutImplementIds(workOrder.categoryDetails),
          },
        });
        await tx.workOrderEvent.create({
          data: {
            workOrderId: workOrder.id,
            actorId: workOrder.createdById,
            action: 'DATA_REPAIR_RESOURCE_RESET',
            oldStatus: workOrder.status,
            newStatus: WorkOrderStatus.APPROVED,
            reason: REPAIR_REASON,
            payload: {
              dispatchOrderId: TARGET_DISPATCH_ID,
              removedVehicleCode: TARGET_VEHICLE_CODE,
              clearedDriver: true,
              clearedImplements: true,
              cancelledVehicleAssignments: workOrder.vehicleAssignments,
            },
          },
        });
        // vehicleId is mandatory and RESTRICT in this historical table. The full
        // cancelled snapshot is retained in the audit event above before removal.
        await tx.workVehicleAssignment.deleteMany({
          where: { workOrderId: workOrder.id, vehicleId: state.targetVehicle.id },
        });
      }
      await tx.vehicle.deleteMany({ where: { id: { in: state.candidates.map((item) => item.id) } } });
    }, { timeout: 120_000, maxWait: 20_000 });
    applied = true;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: !apply,
    applied,
    candidateVehicleCount: state.candidates.length,
    candidateCodes: state.candidates.map((item) => item.code),
    workshopRequestsToMigrate: state.workshopRequests.length,
    targetDispatchReset: Boolean(state.targetVehicle && state.targetDispatch?.operationalWorkOrder),
    classificationConflicts: state.conflicts.map((item) => item.code),
    blockers,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ...report, candidateCodes: undefined, reportPath }, null, 2));
  if (apply && blockers.length) throw new Error(`Không áp dụng sửa dữ liệu vì có ${blockers.length} chặn an toàn.`);
}

if (require.main === module) {
  main()
    .catch((error: Error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
