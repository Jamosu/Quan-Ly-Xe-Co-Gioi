# Database Overview

## Core enums

`Role`, `Unit`, driver/license/shift enums, `VehicleCategory`, `VehicleStatus`, `MaintenanceAlertTier`, implement/status/condition enums, production/dispatch/transport/SLA enums, warehouse/maintenance/repair/KPI/SOS enums và `CatalogType` nằm ở đầu `schema.prisma`.

## Model groups

- Identity/driver: `User` (driver profile fields được gộp trong User).
- Fleet: `Vehicle`, `AgriculturalImplement`, `ImplementAttachmentLog`.
- Planning/dispatch: `ProductionPlan`, `ProductionPlotProgress`, `ProductionAuditTrail`, `DispatchOrder`.
- Logistics: `TransportOrder`, `FeedRawMaterial`, `InternalFeedTrip`.
- Fuel: `FuelWarehouse`, `FuelDispenseTicket`.
- Workshop: `MaintenanceRecord`, `WorkshopOwedPartNote`, `RepairTicket`.
- Driver operations: `DriverKpi`, `DriverSosAlert`.
- Catalog/admin data: `CatalogItem`, `CompanyEntity`, `EmployeeRecord`, `PersonnelRecord`.

## Query conventions

- Dùng `include`/`select` có chủ đích, tránh trả passwordHash.
- List endpoints dùng `page`, `limit`, `skip`, `take`, `count` và trả `{items, pagination}`.
- Dùng transaction khi một nghiệp vụ cập nhật order + vehicle, stock + ticket, alert + repair.
- Enforce unique business identifiers bằng schema và conflict check trong service.

## Schema gaps cần nhớ

- Không có các model độc lập tên `FuelQuota`, `VehicleHistory`, `DriverProfile`, `DriverShift`, `DriverViolation`, `AlertThreshold`, `AuditLog`, `PeriodicInspection` dù project docs/pages có nhắc.
- Không giả định `database/schema_dump.sql` và Prisma luôn đồng bộ; kiểm tra cả hai nếu task liên quan migration/import.
- Không dùng `prisma db push` cho thay đổi có rủi ro dữ liệu mà chưa đánh giá migration/backfill/rollback.
