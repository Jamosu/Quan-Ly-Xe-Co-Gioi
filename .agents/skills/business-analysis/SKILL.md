---
name: business-analysis
description: Analyze Fleet business rules, actors, permissions, workflows, and implementation gaps without inventing policy.
---

# Business analysis

Start with `AGENTS.md`, `docs/business/BUSINESS_RULES.md`, and the domain flow document. For each rule, identify actor, action, prerequisite, state transition, audit consequence, notification/KPI effect, and the supporting source or code.

Verify roles in `backend/prisma/schema.prisma`, guards, and services. The current manager concept is `FARM_MANAGER` plus management-unit assignment; do not introduce a new role merely because a document uses a different title. Mark document-versus-code gaps for product review rather than changing workflow semantics implicitly.

