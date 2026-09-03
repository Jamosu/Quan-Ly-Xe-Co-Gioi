---
name: vehicle-equipment-management
description: Handle vehicle master data, agricultural implements, attachment/detachment, unit assignment, GPS telemetry, maintenance counters, availability, and history. Use for fleet records, equipment catalogs, vehicle status, implement wear, telemetry, vehicle APIs, or /doi-xe UI.
---

# Vehicle Equipment Management

# Purpose

Thay đổi hồ sơ xe và nông cụ mà vẫn giữ quan hệ, enum và dữ liệu MMTB thực tế.

# When to use

CRUD/filter/statistics xe/nông cụ; gắn tháo implement; phân xe; ODO, giờ máy, GPS, alert; màn hình `/doi-xe/*`.

# Relevant project areas

Frontend: `frontend/src/pages/fleet/`, `api/client.ts`.
Backend: `backend/src/vehicles/`, `backend/src/implements/`.
Database: Vehicle, AgriculturalImplement, ImplementAttachmentLog.
Docs: BRD II.1; workbook các sheet tổng hợp xe/máy/thiết bị.

# Current architecture

Controller-service-DTO riêng; service trả relations và attachment log. `VehiclesPage` gọi API rồi fallback mock; kiểm tra từng page khác.

# Project conventions

Dùng Prisma enums; list dùng pagination/filter DTO; map enum sang UI label ở client boundary.

# Business rules

- VERIFIED: code/plate unique. Source: schema, `vehicles.service.ts`.
- VERIFIED: telemetry cộng ODO/giờ máy, cập nhật GPS và alert. Source: `vehicles.service.ts`.
- VERIFIED: RED <=20h, AMBER <=50h trên chu kỳ 250h trong code. Source: `vehicles.service.ts`.
- UNKNOWN: mapping đầy đủ workbook; mốc 30h; chuẩn 9 loại xe trên UI.

# Implementation workflow

1. Xác định Vehicle, Implement hay Catalog.
2. Inspect schema, DTO, service, mapper.
3. Giữ identifier/enum canonical.
4. Dùng transaction khi đổi quan hệ/trạng thái liên domain.
5. Đồng bộ API mapper/UI.
6. Build hai layer liên quan.

# Do not

Không import workbook trực tiếp vào một model; không tự đổi ngưỡng; không biến số demo thành rule; không xóa khi chưa đánh giá relations/lịch sử.

# Validation

Build backend/frontend; kiểm tra conflict, filter, telemetry và attachment lifecycle.

# Related skills

`maintenance-repair`, `gps-monitoring-alerts`, `fuel-management`, `prisma-database`.
