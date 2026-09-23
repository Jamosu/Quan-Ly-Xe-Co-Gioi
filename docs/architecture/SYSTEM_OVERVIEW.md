# System overview

The system is a React/Vite web application backed by a NestJS REST API and MySQL/Prisma. JWT authenticates users; `JwtAuthGuard` and `RolesGuard` protect domain controllers. Responses are wrapped by the backend interceptor under `/api`.

`OperationalWorkOrder` owns the current operational lifecycle. Dispatch, transport, and internal-feed records are source/projection records synchronized by services where applicable. Fleet and people are assigned through `DriverManagementUnit` so the same structure can govern managers, drivers, vehicles, implements, and work orders.

For current details, read `.agents/context/architecture.md` and `MODULE_MAP.md`.
