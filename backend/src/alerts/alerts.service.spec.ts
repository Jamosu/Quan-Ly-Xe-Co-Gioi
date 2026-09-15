import { AlertStatus, DriverEmploymentStatus, Role, Unit } from '@prisma/client';
import { AlertsService } from './alerts.service';

describe('AlertsService read receipts', () => {
  const alert = { id: 9, status: AlertStatus.OPEN, unit: Unit.NT1, complexCode: 'KOUN_MOM', dedupeKey: 'A:9' };
  const prisma = {
    alertEvent: {
      findUnique: jest.fn().mockResolvedValue(alert),
      update: jest.fn().mockResolvedValue({ ...alert, status: AlertStatus.IN_PROGRESS }),
    },
    alertReadReceipt: {
      upsert: jest.fn(({ create }) => Promise.resolve({ ...create, readAt: new Date('2026-09-13T00:00:00Z') })),
    },
  } as any;
  const service = new AlertsService(prisma);
  const actor = (id: number) => ({ id, role: Role.SUPER_ADMIN, unit: Unit.TOAN_KLH, complexCode: null });

  beforeEach(() => jest.clearAllMocks());

  it('persists independent read receipts for two users', async () => {
    await service.markRead(9, actor(1));
    await service.markRead(9, actor(2));
    expect(prisma.alertReadReceipt.upsert.mock.calls[0][0].where.alertId_userId).toEqual({ alertId: 9, userId: 1 });
    expect(prisma.alertReadReceipt.upsert.mock.calls[1][0].where.alertId_userId).toEqual({ alertId: 9, userId: 2 });
  });

  it('marks read without changing the shared processing status', async () => {
    await service.markRead(9, actor(1));
    expect(prisma.alertEvent.update).not.toHaveBeenCalled();
  });

  it('changes shared status without creating a read receipt', async () => {
    await service.updateStatus(9, { status: AlertStatus.IN_PROGRESS }, actor(1));
    expect(prisma.alertEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: AlertStatus.IN_PROGRESS }) }));
    expect(prisma.alertReadReceipt.upsert).not.toHaveBeenCalled();
  });
});

describe('AlertsService driver compliance reconciliation', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-14T02:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('uses DriverProfile dates, stores expiry metadata and skips resigned drivers', async () => {
    const emptySource = { findMany: jest.fn().mockResolvedValue([]) };
    const prisma = {
      driverSosAlert: emptySource,
      vehicle: { findMany: jest.fn().mockResolvedValue([]) },
      dispatchOrder: { findMany: jest.fn().mockResolvedValue([]) },
      fuelDispenseTicket: { findMany: jest.fn().mockResolvedValue([]) },
      internalFeedTrip: { findMany: jest.fn().mockResolvedValue([]) },
      transportOrder: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([
        {
          id: 10, code: 'TX-010', fullName: 'Tài xế đang làm', unit: Unit.NT1,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          licenseClass: null, licenseNumber: 'USER', licenseExpiryDate: new Date('2030-01-01T00:00:00.000Z'),
          healthCheckExpiryDate: new Date('2030-01-01T00:00:00.000Z'),
          driverProfile: {
            employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
            licenseClass: null, licenseNumber: 'PROFILE', licenseExpiryDate: new Date('2026-09-20T00:00:00.000Z'),
            healthCheckExpiryDate: new Date('2030-01-01T00:00:00.000Z'),
          },
        },
        {
          id: 11, code: 'TX-011', fullName: 'Tài xế đã nghỉ', unit: Unit.NT1,
          employmentStatus: DriverEmploymentStatus.DANG_LAM_VIEC,
          licenseClass: null, licenseNumber: 'USER', licenseExpiryDate: new Date('2026-09-10T00:00:00.000Z'),
          healthCheckExpiryDate: new Date('2026-09-10T00:00:00.000Z'),
          driverProfile: { employmentStatus: DriverEmploymentStatus.DA_NGHI_VIEC },
        },
      ]) },
      employeeRecord: { findMany: jest.fn().mockResolvedValue([{ empCode: 'TX-010', complex: 'Koun Mom' }]) },
      alertRule: { findUnique: jest.fn() },
      alertEvent: {
        upsert: jest.fn(({ create }) => Promise.resolve(create)),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any;
    const service = new AlertsService(prisma);

    await (service as any).reconcileCurrentSources();

    expect(prisma.alertEvent.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.alertEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        sourceType: 'DriverProfile',
        driverId: 10,
        complexCode: 'KOUN_MOM',
        targetUrl: '/lai-xe/quan-ly-gplx?driverId=10',
        metadataJson: { expiryDate: '2026-09-20', remainingDays: 6, complianceType: 'DRIVER_LICENSE' },
      }),
    }));
  });
});
