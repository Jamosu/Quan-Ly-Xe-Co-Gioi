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
