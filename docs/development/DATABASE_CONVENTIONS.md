# Database conventions

Inspect existing models, relations, enums, indexes, migration history, and operational data before schema changes. Do not use `prisma db push` as a shortcut for a risky change. Prefer an explicit migration and a reversible, reported backfill where required.

Do not add a schema field merely to satisfy a UI bug. Check API and frontend compatibility, historical rows, unique constraints, and audit implications first.
