# Fleet project agent instructions

Read this file before changing the repository.

## Before coding

1. Read `AI_PROJECT_CONTEXT.md`.
2. Identify the domain and read the linked `docs/business/` document.
3. Inspect the implementation and `backend/prisma/schema.prisma`; do not rely on page names or mocks.
4. Read `.agents/context/` for detailed architecture, business-rule evidence, and API/database conventions.
5. Query Graphify only when it is available. It is an index, never an authority.

Do not invent business rules, roles, entities, or statuses. When evidence conflicts, record `DOCUMENTED BEHAVIOR`, `IMPLEMENTED BEHAVIOR`, `GAP`, and `RECOMMENDED CHANGE` instead of silently changing behavior.

## Impact check

For every non-trivial change, assess: database, backend, API, permissions, frontend, mobile, KPI/reporting, audit trail, and documentation.

## After changing code

Run the relevant typecheck/build/tests, validate migrations when data changes, verify permissions and affected UI, and update documentation when business behavior changes.

## Project conventions

Use existing modules, DTOs, response envelopes, Prisma relations, and components. Preserve the mandatory master-data table ending columns: Status, User, Actions. See `.agents/AGENTS.md` and `.agents/rules/master-data-table-convention.md` for detailed local conventions.
