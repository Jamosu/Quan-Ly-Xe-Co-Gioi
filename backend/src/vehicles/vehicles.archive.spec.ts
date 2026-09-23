import { Role, Unit, VehicleStatus } from '@prisma/client';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService archive', () => {
  const actor = { id: 7, role: Role.SUPER_ADMIN, unit: Unit.KOUN_MOM };

  const current = {
    id: 12,
    status: VehicleStatus.CHO_PHAN_CONG,
    assignedUnitCode: 'XN Chuối DP1',
    managementUnitId: 9,
    defaultDriverId: 21,
    secondaryDriverId: null,
  };

  it('keeps the vehicle row and writes an audit record', async () => {
    const updated = { ...current, status: VehicleStatus.TAM_DUNG, assignedUnitCode: 'Loại biên', managementUnitId: null, defaultDriverId: null };
    const tx = {
      vehicle: { update: jest.fn().mockResolvedValue(updated) },
      operationalAuditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const service = new VehiclesService(prisma as any, {} as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(current as any);

    await expect(service.archive(12, 'Thanh lý theo biên bản', actor)).resolves.toEqual(updated);
    expect(tx.vehicle.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12 },
      data: expect.objectContaining({ status: VehicleStatus.TAM_DUNG, assignedUnitCode: 'Loại biên', managementUnitId: null }),
    }));
    expect(tx.operationalAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ARCHIVE_LIQUIDATED', actorId: actor.id, reason: 'Thanh lý theo biên bản' }),
    }));
  });

  it('is idempotent for an already archived vehicle', async () => {
    const archived = { ...current, status: VehicleStatus.TAM_DUNG, assignedUnitCode: 'Loại biên', managementUnitId: null, defaultDriverId: null, secondaryDriverId: null };
    const prisma = { $transaction: jest.fn() };
    const service = new VehiclesService(prisma as any, {} as any);
    jest.spyOn(service, 'findOne').mockResolvedValue(archived as any);

    await expect(service.archive(12, 'Chạy lại', actor)).resolves.toEqual(archived);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
