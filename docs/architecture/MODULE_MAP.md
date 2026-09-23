# Module map

| Domain | Backend | Frontend | Data | Business memory |
| --- | --- | --- | --- | --- |
| Fleet & implements | `vehicles`, `implements`, `vehicle-driver-assignments` | `pages/fleet` | `Vehicle`, `AgriculturalImplement` | `VEHICLE_FLOW.md` |
| Drivers & teams | `users`, `driver-management`, `driver-kpi`, `mobile-driver` | `pages/drivers`, `pages/master-data` | `User`, `DriverProfile`, management assignments | `DRIVER_FLOW.md` |
| Dispatch & work | `dispatch-orders`, `work-orders`, `transport`, `internal-feed` | `pages/dispatch` | `DispatchOrder`, `OperationalWorkOrder` | `DISPATCH_ORDER_FLOW.md` |
| Acceptance | `work-orders`, `operation-confirmations` | dispatch/driver views | `WorkAcceptance`, evidence and reports | `ACCEPTANCE_FLOW.md` |
| Catalog | `catalogs`, `operational-locations` | `pages/master-data` | `CatalogItem`, locations, org units | `BUSINESS_RULES.md` |
| RBAC | `auth`, `users`, common guards | `pages/permissions` | `User`, `Role`, scopes | `ROLE_PERMISSION.md` |
| Fuel/workshop/alerts | `fuel`, `maintenance`, `repairs`, `alerts` | fuel/workshop/alerts pages | respective domain models | `.agents/context/module-map.md` |

Confirm each route is API-backed before changing behavior; the frontend is hybrid mock/API.
