# Current system analysis

## Scope and source priority

This repository is the source of truth for THACO AGRI Fleet Management. Evidence is prioritized as: latest user-confirmed decision, accepted ADR, business documentation, Prisma schema, backend implementation, frontend implementation, then generated indexes and chat history.

## Stack and entry points

- Web: React 18, TypeScript, Vite, React Router, Zustand, Tailwind; entry point `frontend/src/App.tsx`.
- API: NestJS 10, DTO validation, Swagger, JWT and role guards; entry point `backend/src/app.module.ts`.
- Data: MySQL through Prisma; schema `backend/prisma/schema.prisma`.
- Driver mobile capability is represented by `Frontend_Driver/` and backend `mobile-driver`, `mobile-sync`, and `work-orders` modules.

## Implemented domains

Fleet and implements, driver profiles and KPI, driver-management units, dispatch orders, operational work orders, transport/internal feed, fuel, maintenance/repairs, GPS/alerts, master data, dashboard/reporting, and RBAC are present. See `docs/architecture/MODULE_MAP.md` for the current code map.

## Roles found in the schema

`SUPER_ADMIN`, `DISPATCHER`, `FARM_MANAGER`, `WORKSHOP_MANAGER`, `FUEL_STOREKEEPER`, and `DRIVER`. `SUPER_ADMIN` bypasses role lists. Unit-scoped access exists but must be checked per service.

## Important implementation facts

- `OperationalWorkOrder` is the canonical lifecycle aggregate for current operational work. `DispatchOrder` is synchronized for dispatch work.
- A manager assignment is a relationship between `DriverManagementUnit` and a real `User`; it is not a separate role.
- The frontend is hybrid: each page must be checked before claiming that it is API-backed.

## Known gaps or inconsistencies

- Unit-level data isolation is not uniformly enforced across services.
- Some older documentation and mock UI use names/entities that do not exist in current Prisma.
- The current schema has `OperationalAuditLog` and `WorkOrderEvent`; do not assume a generic `AuditLog` model.
- Hard-delete behavior still exists in some services despite documentation that favors traceability.

## Next reading

Read `AI_PROJECT_CONTEXT.md`, then the relevant document in `docs/business/`, then the mapped code and schema.
