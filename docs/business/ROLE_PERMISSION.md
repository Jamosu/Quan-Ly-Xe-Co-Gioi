# Roles and permissions

| Capability | SUPER_ADMIN | DISPATCHER | FARM_MANAGER | DRIVER |
| --- | --- | --- | --- | --- |
| Manage users/catalog assignments | Yes | Limited/read by controller | Team-scoped where implemented | No |
| Create/approve/assign dispatch | Yes | Yes | Yes | No |
| Receive/start/complete dispatch | May act through privileged flows | No | May act through privileged flows | Yes |
| Manage fleet/team data | Yes | Read where controller allows | Scoped where implemented | No |
| Review work acceptance | Yes | Depends on work type/service | Depends on work type/service | No |

`WORKSHOP_MANAGER` and `FUEL_STOREKEEPER` have module-specific access. Confirm the exact controller and service before changing their behavior.

### Implemented behavior

`RolesGuard` grants `SUPER_ADMIN` universal role-list access. `FARM_MANAGER` is the manager account type used by `ManagementUnitManagerAssignment`; there is no separate `MANAGER` enum role.

The web login presents three operational personas. `admin` is the system administrator. The all-KLH management persona uses `SUPER_ADMIN` because it has the same read and write rights as the administrator; its `QLTH-` account code distinguishes the label shown in the UI. The mechanical/area manager persona uses `FARM_MANAGER` with explicit KLH and management-unit assignments and scopes. Drivers retain `DRIVER` and use the driver app, without a web quick-login button. These are four business personas backed by three existing RBAC roles; this change does not add a new database role.

Production has one public demonstration account for each of the three web personas. The quick-login buttons authenticate through the normal API and receive real JWTs. Individual area managers have separate accounts and random initial passwords; their credentials must be distributed privately. Production management units, depots, manager assignments, and user scopes were synchronized from the local source on 2026-09-23. Legacy production units with no references were deactivated to avoid duplicate active rows.

### Gap

Role authorization does not itself prove row-level unit isolation. Check `management-scope` utilities and the target service.

### Role 3: mechanical and area manager (2026-09-23)

**DOCUMENTED BEHAVIOR:** `FARM_MANAGER` has an explicit management-unit scope and manages drivers and vehicles only inside that scope. The vehicle-to-unit assignment page is reserved for system and all-KLH managers.

**IMPLEMENTED BEHAVIOR:** The public `quanly.kounmom` sample account is scoped to the active `CG-KM-CGTC-DP` team, which has vehicles and assigned drivers in both local and production databases. Fleet, driver list/profile, and manager dashboard queries use that management-unit scope. Active vehicle-to-driver assignments are included in driver visibility because production currently has no `DriverManagementAssignment` rows. The vehicle-to-unit assignment navigation and API are blocked for `FARM_MANAGER`.

**GAP:** Production driver management assignments have not yet been backfilled. The number of visible drivers can therefore differ between local and production even with the same team scope.

**RECOMMENDED CHANGE:** Backfill driver management assignments only after validating each driver's owning team against the actual active vehicle assignments; keep the scoped vehicle-assignment fallback until then.
