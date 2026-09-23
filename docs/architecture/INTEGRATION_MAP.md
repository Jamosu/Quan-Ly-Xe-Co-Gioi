# Integration map

```text
React page → API mapper/client → /api controller → DTO/guards → service → Prisma → MySQL
```

The backend has Swagger at `/api/docs`. The frontend unwraps the response envelope in `frontend/src/api/client.ts`. Mobile-related behavior shares backend work-order and mobile-driver services; changing an operational lifecycle therefore requires checking both web and mobile consumers.

Generated Graphify output, when configured, is a search layer only and must exclude `.env`, `node_modules`, build outputs, caches, and binaries.
