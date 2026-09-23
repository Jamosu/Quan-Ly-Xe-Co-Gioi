---
name: dispatch-order
description: Safely change or analyze dispatch orders, work orders, driver execution, and acceptance in the Fleet system.
---

# Dispatch order workflow

Read `docs/business/DISPATCH_ORDER_FLOW.md`, `DRIVER_FLOW.md`, and `ACCEPTANCE_FLOW.md`, then inspect `backend/src/work-orders`, `backend/src/dispatch-orders`, and the related Prisma models.

`OperationalWorkOrder` is the canonical operational lifecycle. Preserve its `WorkOrderEvent` history, acceptance records, and the synchronization boundary with legacy `DispatchOrder`. Verify every proposed transition against the current enums and service authorization checks; never infer an approver or acceptance actor from UI labels alone.

