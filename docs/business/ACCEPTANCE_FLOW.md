# Acceptance flow

The driver submits evidence and requests acceptance from an in-progress `OperationalWorkOrder`. The service creates a pending `WorkAcceptance` and moves work to `SUBMITTED_FOR_ACCEPTANCE`. Approval moves work to `ACCEPTED`; rejection records a reason, marks the acceptance `REWORK_REQUIRED`, and returns work to `REWORK_REQUIRED` for execution.

Closing is allowed only after the accepted state. Preserve reviewer, timestamp, evidence, event history, and reason.
