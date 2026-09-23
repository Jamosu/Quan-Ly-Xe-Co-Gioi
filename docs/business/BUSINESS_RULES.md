# Business rules

## Verified implementation rules

- `SUPER_ADMIN` bypasses role lists; other access is controller-role and, where implemented, management-unit scoped.
- A manager assignment requires an active `FARM_MANAGER` user and records effective dates.
- Vehicle/implement/work-order ownership can be represented by a management unit.
- Work-order lifecycle changes create `WorkOrderEvent`; acceptance creates/reviews `WorkAcceptance`.
- Maintenance and repair services synchronize vehicle operational state.

## Known gaps

Unit data isolation, hard-delete policy, and several BRD-only behaviors are not consistently enforced. Treat them as gaps until a confirmed ADR or implementation change is accepted.

Detailed evidence and VERIFIED/INFERRED/UNKNOWN classification are in `.agents/context/business-rules.md`.
