---
name: frontend-ui
description: Implement Fleet React/Vite screens while preserving shared API mappings, master-data conventions, and existing design patterns.
---

# Frontend UI

Read `docs/development/UI_CONVENTIONS.md` and `API_CONVENTIONS.md`, inspect the existing target page and its API client mapping, then reuse shared components and terminology already present in the application.

Do not replace a live API contract with a local mock to make a screen render. Keep master-data tables consistent (status, user, actions at the end), reset invalid selected values safely after catalog changes, and verify the affected route plus the frontend build.

