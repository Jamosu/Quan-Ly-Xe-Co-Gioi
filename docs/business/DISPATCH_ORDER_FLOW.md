# Dispatch and operational work flow

`OperationalWorkOrder` is the canonical lifecycle. `DispatchOrder` is synchronized for dispatch work.

```text
DRAFT → PENDING_APPROVAL → APPROVED → ASSIGNED
                                  └→ OPEN_FOR_CLAIM → ASSIGNED
ASSIGNED → DRIVER_ACCEPTED → IN_PROGRESS → SUBMITTED_FOR_ACCEPTANCE
SUBMITTED_FOR_ACCEPTANCE → ACCEPTED → CLOSED
                         └→ REWORK_REQUIRED → IN_PROGRESS
PENDING_APPROVAL → REJECTED
active states → CANCELLED
```

- Admin, dispatcher, and farm manager create, prepare, approve, assign, reschedule, or cancel according to controller/service checks.
- Drivers accept or decline assigned work, execute it, submit evidence/progress, and submit acceptance.
- Acceptance review is performed by the service's acceptance-role logic. Rejection requires a reason and returns the work to rework.
- Transitions are evented with actor, old/new state, time, reason, and payload through `WorkOrderEvent`.
- The order management area is an active mechanical TEAM from `/danh-muc/quan-ly-co-gioi`; it identifies the responsible team leader and filters the order's drivers, vehicles, and equipment. Admin/dispatcher can select any visible team, while a farm manager only sees assigned management scope. This field is independent from the work enterprise, which must be selected from the shared project catalog within the same complex. Confirmed by the product owner on 2026-09-21.
- `GET /work-orders/preparation-context` returns drivers plus only the vehicles and attachable equipment that match the order's operational domain in the selected team's resource scope. Remaining resources carry `selection.selectable` and `selection.reasons`; the UI keeps temporarily unavailable records visible but disabled, shows selectable/total counts, and clears a previous selection when team, category, time, or vehicle compatibility makes it invalid. Assignment follows driver → vehicle → one or more compatible attachments. Resource validity is decided by backend availability and issue-time validation, not by numeric ranges embedded in driver codes. Vehicle-domain filtering and multi-attachment assignment confirmed by the product owner on 2026-09-22.
- A delayed assignment that is reopened releases the active driver, vehicle, and attachments together. An approved order with no assigned driver/vehicle is waiting for dispatch and is not marked as a delayed departure. The create screen may show eligible vehicle suggestions after the work item/location step, but selecting a suggestion still requires the driver-first sequence.

Do not add an “operate on behalf of driver” path without a confirmed business decision and an auditable actor/target/reason model.
