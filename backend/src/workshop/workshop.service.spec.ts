import { BadRequestException } from '@nestjs/common';
import { Role, SosStatus, Unit, WorkshopRepairRoute, WorkshopRequestStatus, WorkshopRequestType } from '@prisma/client';
import { WorkshopService } from './workshop.service';

describe('WorkshopService', () => {
  const actor = { id: 1, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH };
  const service = new WorkshopService({} as any, {} as any);

  it('requires exactly one asset when creating a request', async () => {
    await expect(service.create({ type: WorkshopRequestType.REPAIR, issueDescription: 'Hỏng động cơ' }, actor))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ type: WorkshopRequestType.REPAIR, vehicleId: 1, implementId: 2, issueDescription: 'Hỏng động cơ' }, actor))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires vendor, sent date and expected return date for external repair', async () => {
    await expect(service.create({
      type: WorkshopRequestType.REPAIR,
      vehicleId: 1,
      issueDescription: 'Gửi sửa ngoài',
      repairRoute: WorkshopRepairRoute.OUTSOURCED_VENDOR,
    }, actor)).rejects.toThrow('nhà cung cấp');
  });

  it('does not complete a request before handover', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: WorkshopRequestStatus.READY_FOR_ACCEPTANCE,
      repairRoute: WorkshopRepairRoute.INTERNAL,
      plannedStartAt: null,
      plannedEndAt: null,
    } as any);
    await expect(service.update(1, { status: WorkshopRequestStatus.COMPLETED }, actor))
      .rejects.toThrow('bàn giao');
  });

  it('paginates repair candidates across vehicles then implements and returns facets', async () => {
    const prisma = {
      vehicle: {
        count: jest.fn().mockResolvedValue(439),
        findMany: jest.fn().mockResolvedValue(Array.from({ length: 19 }, (_, index) => ({ id: index + 1, code: `V-${index + 1}`, name: 'Xe', conditionStatus: 'Hư hỏng' }))),
      },
      agriculturalImplement: {
        count: jest.fn().mockResolvedValue(20),
        findMany: jest.fn().mockResolvedValue([{ id: 1, code: 'TB-01', name: 'Thiết bị' }]),
      },
    };
    const pagedService = new WorkshopService(prisma as any, {} as any);
    const result = await pagedService.findCandidates({ type: WorkshopRequestType.REPAIR, page: 22, limit: 20 }, actor);

    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 420, take: 19 }));
    expect(prisma.agriculturalImplement.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 1 }));
    expect(result.items).toHaveLength(20);
    expect(result.facets).toEqual({ total: 459, vehicles: 439, implements: 20 });
    expect(result.pagination).toEqual({ total: 459, page: 22, limit: 20, totalPages: 23 });
  });

  it('moves a vehicle to repair in the same transaction that creates its request', async () => {
    const tx = {
      workshopRequest: { create: jest.fn().mockResolvedValue({ id: 7, code: 'SC-TEST', type: WorkshopRequestType.REPAIR }) },
      vehicle: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      vehicle: { findUnique: jest.fn().mockResolvedValue({ id: 7, code: 'XE-07', totalMachineHours: 0, odoKm: 0 }) },
      workshopRequest: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const createService = new WorkshopService(prisma as any, {} as any);

    await createService.create({ type: WorkshopRequestType.REPAIR, vehicleId: 7, issueDescription: 'Hư hỏng cần sửa chữa' }, actor);

    expect(tx.workshopRequest.create).toHaveBeenCalled();
    expect(tx.vehicle.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { status: 'SUA_CHUA', conditionStatus: 'Hư hỏng / Đang sửa chữa' } });
  });

  it('rejects duplicate rescue dispatches for the same SOS', async () => {
    const tx = {
      driverSosAlert: {
        findUnique: jest.fn().mockResolvedValue({
          id: 15,
          driverId: 8,
          status: SosStatus.DISPATCHED,
          vehicle: { unit: Unit.KOUN_MOM },
          rescueDispatchOrder: { id: 99, code: 'CH-SOS-000015' },
        }),
      },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const rescueService = new WorkshopService(prisma as any, {} as any);

    await expect(rescueService.dispatchSosRescue(15, {
      rescueVehicleId: 20,
      driverId: 21,
      plannedEndTime: new Date(Date.now() + 60_000),
    }, actor)).rejects.toThrow('đã có lệnh cứu hộ');
  });

  it('rejects a rescue window that already ended before opening a transaction', async () => {
    const prisma = { $transaction: jest.fn() };
    const rescueService = new WorkshopService(prisma as any, {} as any);
    await expect(rescueService.dispatchSosRescue(15, {
      rescueVehicleId: 20,
      driverId: 21,
      plannedEndTime: new Date(Date.now() - 60_000),
    }, actor)).rejects.toThrow('phải sau thời điểm hiện tại');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
