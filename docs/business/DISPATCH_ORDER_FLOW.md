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
- The 15-minute delay threshold applies to driver acceptance only. Once the driver accepts the order, the acceptance warning is cleared; the system does not require a separate departure confirmation to clear that warning. Confirmed by the product owner on 2026-09-28.
- The operational display sequence is: create order -> driver accepts -> arrive at worksite -> work -> daily report -> return to depot. A daily report contains quantity, work description, and at least one evidence photo. Final acceptance happens only after accepted cumulative quantity reaches the target and the driver marks the work complete. Confirmed by the product owner on 2026-09-28.
- A driver may return to the depot before submitting a daily report or before the manager reviews it. The report deadline remains the scheduled shift end plus 15 minutes; submitting exactly at the deadline is on time. Final work closure waits for both final report approval and depot arrival. Confirmed by the product owner on 2026-09-28.
- Each next-day dispatch displays the quantity already approved on the shared work order. For example, day two starts at 5/10 ha after day one is approved; if day two reports 3 ha, the display remains 5/10 ha while review is pending and becomes 8/10 ha after approval. Confirmed by the product owner on 2026-09-28.
- The driver may enter daily progress as the work unit or as cumulative completion percent. Percent input is converted to that day's physical quantity before storage (for example, 2.8/4 ha followed by 100% stores 1.2 ha for the day). Construction work defaults to percent; its physical target may still use m, m³, km, points, or machine hours and is never assumed to be hectares. Confirmed by the product owner on 2026-09-28.
- An unresolved order from an earlier day may be reassigned by a manager to the same or another driver/vehicle and a new schedule. The previous daily dispatch and report history remain unchanged; the system creates a linked daily dispatch for the new attempt and records the reason in the work-order event trail. Confirmed by the product owner on 2026-09-28.
- The management overdue queue is an escalation view separate from the 15-minute driver acceptance warning. It includes an assigned order two hours after its scheduled start when the driver has not accepted, and an active or delivered order two hours after its scheduled end while it still awaits a report or quantity acceptance. This view ignores the selected week and day so older unresolved orders remain visible. Confirmed by the product owner on 2026-09-28.
- When a driver cannot use the phone, `SUPER_ADMIN`, `DISPATCHER`, or `FARM_MANAGER` may record each operational milestone on the driver's behalf. The actor and contact reason are mandatory audit data; acceptance also requires the actual quantity and saves it to the daily report. Confirmed by the product owner on 2026-09-28.
- Acceptance review is performed by the service's acceptance-role logic. Rejection requires a reason and returns the work to rework.
- Transitions are evented with actor, old/new state, time, reason, and payload through `WorkOrderEvent`.
- The order management area is an active mechanical TEAM from `/danh-muc/quan-ly-co-gioi`; it identifies the responsible team leader and filters the order's drivers, vehicles, and equipment. Admin/dispatcher can select any visible team, while a farm manager only sees assigned management scope. This field is independent from the work enterprise, which must be selected from the shared project catalog within the same complex. Confirmed by the product owner on 2026-09-21.
- `GET /work-orders/preparation-context` returns drivers plus only the vehicles and attachable equipment that match the order's operational domain in the selected team's resource scope. Remaining resources carry `selection.selectable` and `selection.reasons`; the UI keeps temporarily unavailable records visible but disabled, shows selectable/total counts, and clears a previous selection when team, category, time, or vehicle compatibility makes it invalid. Assignment follows driver → vehicle → one or more compatible attachments. Resource validity is decided by backend availability and issue-time validation, not by numeric ranges embedded in driver codes. Vehicle-domain filtering and multi-attachment assignment confirmed by the product owner on 2026-09-22.
- A delayed assignment that is reopened releases the active driver, vehicle, and attachments together. An approved order with no assigned driver/vehicle is waiting for dispatch and is not marked as a delayed departure. The create screen may show eligible vehicle suggestions after the work item/location step, but selecting a suggestion still requires the driver-first sequence.

Any additional on-behalf-of-driver action must preserve the actor, target driver, reason, timestamp, and affected operational data in the audit trail.
