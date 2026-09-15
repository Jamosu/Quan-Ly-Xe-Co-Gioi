import { BadRequestException } from '@nestjs/common';
import { JourneyLegStatus, JourneyLegType, TransportStatus } from '@prisma/client';
import { JourneyAction } from './dto/work-order-actions.dto';
import { WorkOrdersService } from './work-orders.service';

describe('WorkOrdersService transport journey state machine', () => {
  const service = new WorkOrdersService({} as never, {} as never);
  const order = { id: 10, transportOrderId: 20 };
  const now = new Date('2026-09-11T08:00:00.000Z');

  const transaction = () => ({
    workJourneyLeg: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    transportOrder: { update: jest.fn().mockResolvedValue({}) },
    workVehicleAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
  });

  const apply = (tx: ReturnType<typeof transaction>, leg: { id: number; sequence: number; status: JourneyLegStatus; isEmpty: boolean }, action: JourneyAction) =>
    (service as any).applyTransportJourneyAction(tx, order, leg, action, {}, now, 1, 2, null);

  it('skips loading for an empty leg but allows departure from its pickup', async () => {
    const tx = transaction();
    const leg = { id: 1, sequence: 2, status: JourneyLegStatus.AT_PICKUP, isEmpty: true };

    await expect(apply(tx, leg, JourneyAction.START_LOADING)).rejects.toBeInstanceOf(BadRequestException);
    await expect(apply(tx, leg, JourneyAction.DEPART_PICKUP)).resolves.toBeUndefined();
    expect(tx.workJourneyLeg.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: JourneyLegStatus.IN_TRANSIT }),
    }));
  });

  it('does not allow a loaded leg to depart before loading', async () => {
    const tx = transaction();
    await expect(apply(tx, { id: 1, sequence: 1, status: JourneyLegStatus.AT_PICKUP, isEmpty: false }, JourneyAction.DEPART_PICKUP))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.transportOrder.update).not.toHaveBeenCalled();
  });

  it('keeps a two-way trip active after the outbound delivery', async () => {
    const tx = transaction();
    tx.workJourneyLeg.findFirst.mockResolvedValue({ id: 2, type: JourneyLegType.RETURN });

    await apply(tx, { id: 1, sequence: 1, status: JourneyLegStatus.UNLOADING, isEmpty: false }, JourneyAction.COMPLETE_DELIVERY);

    expect(tx.transportOrder.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { status: TransportStatus.IN_TRANSIT },
    });
    expect(tx.workVehicleAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('blocks depot return while a cargo leg is still pending', async () => {
    const tx = transaction();
    tx.workJourneyLeg.findFirst.mockResolvedValue({ id: 2, type: JourneyLegType.RETURN });

    await expect(apply(tx, { id: 1, sequence: 1, status: JourneyLegStatus.COMPLETED, isEmpty: false }, JourneyAction.RETURN_TO_DEPOT))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.transportOrder.update).not.toHaveBeenCalled();
  });
});
