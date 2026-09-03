---
name: driver-operations-kpi
description: Handle driver records, assignments, license and violation screens, mobile assigned tasks, trip start/finish, SOS, monthly KPI calculation, ranking, and bonuses. Use for /lai-xe UI, /mobile/driver, /driver-kpi, ODO trip evidence, or driver performance.
---

# Driver Operations Kpi

# Purpose

Giữ driver operations/mobile/KPI đúng với order, vehicle và bằng chứng GPS.

# When to use

Hồ sơ/ca/GPLX/vi phạm; assigned tasks; trip start/finish; SOS; KPI/ranking/bonus.

# Relevant project areas

Frontend: `frontend/src/pages/drivers/`.
Backend: `users`, `driver-kpi`, `mobile-driver`.
Database: User driver fields, DriverKpi, DriverSosAlert và order relations.
Docs: BRD II.10, II.13, Tables 10/13.

# Current architecture

Driver profile nằm trong User; không có DriverProfile/Shift/Violation models riêng. Mobile service hợp nhất ba loại task và cập nhật vehicle/order.

# Project conventions

Lấy driver từ authenticated user; dùng order type explicit; KPI upsert theo unique driverId+monthYear; SOS transaction.

# Business rules

- VERIFIED: bốn nhóm KPI 25%. Source: BRD Table 10, DriverKpi.
- IMPLEMENTED: scoring/rank/bonus thresholds ở `driver-kpi.service.ts`.
- VERIFIED: mobile nhận lệnh, nhập ODO/ảnh, finish và SOS. Source: BRD Table 13, mobile service/DTO.
- INFERRED: km/30 -> machine hours. Source: `mobile-driver.service.ts`.
- UNKNOWN: công thức chuẩn raw metric -> score/bonus; shift/license/violation persistence.

# Implementation workflow

1. Xác định capability có model/backend hay chỉ UI mock.
2. Trace authenticated driver -> task -> order -> vehicle.
3. Không thay scoring nếu chưa xác nhận.
4. Dùng transaction cho lifecycle đa entity.
5. Không nhận dữ liệu GPS-derived từ input tay nếu BRD cấm.
6. Đồng bộ mobile/KPI response mapping.

# Do not

Không tạo model driver phụ trùng User; không coi bonus demo là policy; không giả định ảnh/OD0 đã được lưu nếu schema không có field.

# Validation

Build; test authorization, task ownership, trip transitions, ODO edge cases, KPI unique month và SOS rollback.

# Related skills

`planning-dispatch-logistics`, `gps-monitoring-alerts`, `rbac-administration`, `prisma-database`.
