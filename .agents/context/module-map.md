# Module Map

| Domain | Frontend | Backend | Database | Business docs |
|---|---|---|---|---|
| A Dashboard | `pages/dashboard`, charts/maps | `dashboard` | Vehicle, fuel, repair, KPI aggregates | BRD mục II.12 |
| B GPS | `pages/gps`, `components/maps` | `dashboard`, `vehicles`, `transport`, `mobile-driver` | Vehicle telemetry, TransportOrder, DriverSosAlert | BRD II.6, II.11 |
| C Đội xe & thiết bị | `pages/fleet` | `vehicles`, `implements` | Vehicle, AgriculturalImplement, ImplementAttachmentLog | BRD II.1; workbook MMTB |
| D Kế hoạch/điều xe/vận chuyển | `pages/dispatch` | `production-plans`, `dispatch-orders`, `transport`, `internal-feed` | ProductionPlan/Progress/Audit, DispatchOrder, TransportOrder, FeedRawMaterial, InternalFeedTrip | BRD II.2-5 |
| E BTSC | `pages/workshop`, kanban | `maintenance`, `repairs` | MaintenanceRecord, WorkshopOwedPartNote, RepairTicket | BRD II.8-9; workbook `08. ĐKĐK` |
| F Báo cáo | `pages/reports` | chủ yếu `dashboard`, `driver-kpi`, `fuel`, `repairs` endpoints | aggregates từ domain models | BRD II.11-12 |
| G Phân quyền | `pages/permissions` | `auth`, `users`, common guards | User, Role, Unit; AuditLog chỉ xuất hiện trong project docs/mock surfaces, không có Prisma model tên AuditLog | BRD I.3, III, IV |
| H Danh mục | `pages/master-data` | `catalogs` | CatalogItem, CompanyEntity, EmployeeRecord, PersonnelRecord | workbook MMTB; BRD data foundation |
| I Lái xe & KPI | `pages/drivers` | `users`, `driver-kpi`, `mobile-driver` | User driver fields, DriverKpi, DriverSosAlert | BRD II.10, II.13 |
| J Nhiên liệu | `pages/fuel` | `fuel` | FuelWarehouse, FuelDispenseTicket; quota là field trên Vehicle/Plan, chưa có model FuelQuota | BRD II.7; workbook fuel-rate columns |
| K Cảnh báo | `pages/alerts` | phân tán trong dashboard/vehicles/transport/mobile-driver | alert fields/statuses trong domain models; chưa có alert center model riêng | BRD II.11 |

## Mapping caution

- `PROJECT_STRUCTURE.md` có một số tên model dự kiến không tồn tại trong Prisma hiện tại. Luôn xác minh bằng schema.
- Route/report page tồn tại không chứng minh API đã nối.
- Workbook có phạm vi MMTB rộng hơn `Vehicle`/`AgriculturalImplement`; không import mọi sheet vào schema mà không có mapping được duyệt.
