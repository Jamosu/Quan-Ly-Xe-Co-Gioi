# Code conventions

Reuse the existing feature module, DTO, API mapper, and UI component before creating a new abstraction. Keep domain enums canonical. Keep display terminology separate from stored keys. Inspect all callers before changing shared behavior.

For cross-layer work, map route → controller → service → Prisma → frontend mapper/page before editing.
