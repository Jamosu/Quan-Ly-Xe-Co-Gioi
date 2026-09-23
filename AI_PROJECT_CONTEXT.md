# AI project context

## Project overview

THACO AGRI Fleet Management manages mechanical vehicles, agricultural implements, drivers, teams, work/dispatch orders, acceptance, maintenance, fuel, alerts, catalogs, reports, and access control across agricultural complexes.

Primary users are system administrators, dispatchers, farm managers, workshop and fuel staff, and drivers. The active web stack is React/Vite; the API is NestJS; MySQL is accessed through Prisma; authentication is JWT with role guards.

## Core domains

- Fleet and implements: `Vehicle`, `AgriculturalImplement`, attachments, availability, and management-unit assignment.
- People and teams: `User`, `DriverProfile`, `DriverManagementUnit`, manager and driver assignments.
- Operational work: `OperationalWorkOrder`, dispatch/transport/feed projections, execution, evidence, daily reports, acceptance, and closure.
- Supporting domains: catalog, fuel, maintenance, repair, alerts, GPS, KPI, reporting, and RBAC.

## Critical rules

- A mechanical manager is a real `FARM_MANAGER` user assigned to a `DriverManagementUnit`; do not create a separate manager role without a confirmed decision.
- Team/manager data is shared reference data for people, fleet assets, and work orders. Keep historical assignments rather than deleting them.
- Use canonical enum values and identifiers at API/database boundaries. Vietnamese display text is not a database key.
- Do not infer a business rule from mock data. Classify unverified material as `UNKNOWN`.
- For Koun Mom source data, the workbook `docs/00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx` is reference data, not a substitute for schema or current operational history.

## Required reading by task

| Task | Read first |
| --- | --- |
| Dispatch/work/acceptance | `docs/business/DISPATCH_ORDER_FLOW.md`, `ROLE_PERMISSION.md`, `ACCEPTANCE_FLOW.md` |
| Driver | `docs/business/DRIVER_FLOW.md`, `ROLE_PERMISSION.md` |
| Fleet/implements | `docs/business/VEHICLE_FLOW.md`, `VEHICLE_CLASSIFICATION.md` |
| Database | `docs/architecture/DATABASE_ARCHITECTURE.md`, `docs/development/DATABASE_CONVENTIONS.md` |
| API/UI | `docs/development/API_CONVENTIONS.md` or `UI_CONVENTIONS.md` |

## Non-negotiable boundaries

Do not create roles, entities, statuses, migrations, or bulk data changes merely because they look convenient. Assess history, authorization, API compatibility, frontend mapping, and documentation impact first.
