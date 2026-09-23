---
name: database-change
description: Plan and implement safe Prisma/MySQL schema, migration, backfill, and catalog-data changes for Fleet.
---

# Database change

Read `docs/architecture/DATABASE_ARCHITECTURE.md`, `docs/development/DATABASE_CONVENTIONS.md`, and the relevant models, migrations, services, and UI callers before editing the schema.

Assess existing data, foreign keys, historical records, API compatibility, and rollback/reporting needs. Use an explicit Prisma migration and transaction-safe backfill when data changes are required; do not use `db push` as a production substitute. Run Prisma validate/generate and focused tests after the change.

