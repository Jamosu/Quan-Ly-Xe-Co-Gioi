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

### Gap

Role authorization does not itself prove row-level unit isolation. Check `management-scope` utilities and the target service.
