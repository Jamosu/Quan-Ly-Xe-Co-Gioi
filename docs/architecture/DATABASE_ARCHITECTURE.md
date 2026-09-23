# Database architecture

Prisma schema: `backend/prisma/schema.prisma`. MySQL is the persistent store.

## Core relationship map

```text
User ──1:1── DriverProfile
User ──<── ManagementUnitManagerAssignment ──> DriverManagementUnit
DriverProfile ──<── DriverManagementAssignment ──> DriverManagementUnit
DriverManagementUnit ──<── Vehicle / AgriculturalImplement / OperationalWorkOrder
OperationalWorkOrder ──<── WorkDriverAssignment / WorkVehicleAssignment / WorkAcceptance / WorkOrderEvent
DispatchOrder ──0..1── OperationalWorkOrder
```

Important constraints include unique user code/username, vehicle code, vehicle-type code, and `(complexCode, code)` for management units. `WorkOrderEvent` and `OperationalAuditLog` are the current audit models; do not invent a generic audit model.

Use migrations for schema changes. Assess existing rows, backfill, rollback, API, and frontend compatibility before applying them. See `.agents/context/database-overview.md`.
