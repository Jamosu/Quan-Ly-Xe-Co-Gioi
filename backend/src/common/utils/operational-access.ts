import { ForbiddenException } from '@nestjs/common';
import { Role, Unit } from '@prisma/client';

export interface OperationalActor {
  id: number;
  role: Role;
  unit: Unit;
}

export const hasGlobalOperationalAccess = (actor?: OperationalActor | null) =>
  !actor ||
  actor.role === Role.SUPER_ADMIN ||
  actor.unit === Unit.TOAN_KLH ||
  (actor.role === Role.DISPATCHER && actor.unit === Unit.BAN_CO_GIOI);

export const scopedUnit = (actor?: OperationalActor | null, requested?: Unit): Unit | undefined => {
  if (!actor || hasGlobalOperationalAccess(actor)) return requested;
  if (actor.role === Role.DRIVER) return undefined;
  if (requested && requested !== actor.unit) {
    throw new ForbiddenException('Không được truy cập dữ liệu ngoài đơn vị được phân quyền.');
  }
  return actor.unit;
};

export const assertOperationalAccess = (
  actor?: OperationalActor | null,
  unit?: Unit,
  assignedDriverId?: number | null,
) => {
  if (!actor || hasGlobalOperationalAccess(actor)) return;
  if (actor.role === Role.DRIVER) {
    if (assignedDriverId === actor.id) return;
    throw new ForbiddenException('Tài xế chỉ được thao tác lệnh được phân công cho mình.');
  }
  if (unit && actor.unit !== unit) {
    throw new ForbiddenException('Không được thao tác dữ liệu ngoài đơn vị được phân quyền.');
  }
};
