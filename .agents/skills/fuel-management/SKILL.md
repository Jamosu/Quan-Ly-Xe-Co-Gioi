---
name: fuel-management
description: Handle fuel warehouses, tank stock, dispense tickets, QR issuance, vehicle fuel standards, quota variance, reconciliation, and excess-consumption alerts. Use for /nhien-lieu UI, /fuel APIs, stock transactions, fuel reports, or workbook fuel-rate fields.
---

# Fuel Management

# Purpose

Giữ đúng tồn kho, phiếu cấp phát, định mức và đối chiếu nhiên liệu.

# When to use

Kho bồn, cấp dầu, variance/excess, định mức, đối soát, báo cáo/cảnh báo nhiên liệu.

# Relevant project areas

Frontend: `frontend/src/pages/fuel/`.
Backend: `backend/src/fuel/`.
Database: FuelWarehouse, FuelDispenseTicket, Vehicle.fuelRateStandard.
Docs: BRD II.7/Table 7; các cột định mức trong workbook MMTB.

# Current architecture

FuelService tạo kho, cấp phát và báo cáo. Phiếu liên kết warehouse/vehicle/driver/operator; API client map tickets/tanks sang UI.

# Project conventions

Dùng transaction cho ticket + stock; lưu actual/quota/variance typed number; list filter/paginate; map `isExcess` sang UI warning.

# Business rules

- VERIFIED: đối chiếu actual với quota và cảnh báo vượt định mức. Source: BRD Table 7, `fuel.service.ts`.
- VERIFIED: workbook chứa định mức L/h hoặc L/km theo MMTB. Source: workbook.
- UNKNOWN: cách chọn định mức theo km/giờ/ha; tolerance chính thức; FuelQuota model chưa tồn tại.

# Implementation workflow

1. Xác định source của quota và đơn vị đo.
2. Inspect DTO/service/schema/client.
3. Giữ phép tính variance auditable.
4. Dùng transaction và kiểm tra stock.
5. Đồng bộ report/UI.
6. Xin xác nhận khi đổi tolerance/quota source.

# Do not

Không trộn L/h, L/km, L/100km, L/ha; không coi demo tank capacity là universal; không tạo FuelQuota model nếu chưa có quyết định schema.

# Validation

Build; test insufficient stock, zero quota, variance sign, concurrent dispense và filtering.

# Related skills

`vehicle-equipment-management`, `planning-dispatch-logistics`, `dashboard-reporting`, `prisma-database`.
