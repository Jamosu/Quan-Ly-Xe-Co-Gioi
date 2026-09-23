import { Injectable } from '@nestjs/common';
import { Unit } from '@prisma/client';
import { EventEmitter } from 'events';
import { OperationalActor, hasGlobalOperationalAccess } from '../common/utils/operational-access';

export type OperationalRealtimeEvent = {
  type: 'operational.updated';
  entityType: string;
  entityId?: number;
  orderId?: number;
  unit?: Unit;
  changedAt: string;
};

@Injectable()
export class OperationalRealtimeService {
  private readonly events = new EventEmitter();

  publish(event: Omit<OperationalRealtimeEvent, 'type' | 'changedAt'>) {
    this.events.emit('operational.updated', {
      type: 'operational.updated',
      changedAt: new Date().toISOString(),
      ...event,
    } satisfies OperationalRealtimeEvent);
  }

  subscribe(actor: OperationalActor, send: (event: OperationalRealtimeEvent) => void) {
    const listener = (event: OperationalRealtimeEvent) => {
      if (!event.unit || hasGlobalOperationalAccess(actor) || event.unit === actor.unit) send(event);
    };
    this.events.on('operational.updated', listener);
    return () => this.events.off('operational.updated', listener);
  }
}
