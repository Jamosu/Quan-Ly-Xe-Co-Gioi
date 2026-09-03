---
name: planning-dispatch-logistics
description: Handle production plans, plot progress, audit changes, dispatch orders, vehicle assignment, transport, return cargo, internal-feed materials, SLA completion, and settlement. Use for /lenh-dieu-xe, planning, dispatch, delayed departures, logistics, or feed trips.
---

# Planning Dispatch Logistics

# Purpose

Giữ nhất quán workflow kế hoạch, điều xe và logistics từ lệnh đến trạng thái xe.

# When to use

Production plan/plot/audit; dispatch lifecycle; transport telemetry/return cargo; internal-feed/SLA.

# Relevant project areas

Frontend: `frontend/src/pages/dispatch/`.
Backend: `production-plans`, `dispatch-orders`, `transport`, `internal-feed`, `mobile-driver`.
Database: Production*, DispatchOrder, TransportOrder, FeedRawMaterial, InternalFeedTrip.
Docs: BRD II.2-5, Tables 2-5.

# Current architecture

Mỗi workflow có module riêng, dùng chung Vehicle/User; mobile API đổi trạng thái lệnh; transaction đồng bộ aggregate.

# Project conventions

Dùng business code unique, Prisma status enum, explicit transition và ProductionAuditTrail.

# Business rules

- VERIFIED: Làm đất -> Trồng mới -> Thu hoạch. Source: BRD [62]/[110], schema.
- VERIFIED: thay đổi kế hoạch cần audit/lý do/xác nhận. Source: BRD Table 2, ProductionAuditTrail.
- VERIFIED: Xí nghiệp trực tiếp điều xe; Ban CG phân bổ/kiểm soát. Source: BRD [70]/Table 14.
- IMPLEMENTED: APPROVED quá departure 30 phút được marked delayed. Source: `dispatch-orders.service.ts`.
- UNKNOWN: priority xe, approval detail, route/speed thresholds.

# Implementation workflow

1. Vẽ state transitions từ enum/service.
2. Xác định actor, role, unit.
3. Kiểm tra conflict/availability.
4. Dùng transaction cho order + vehicle + audit/settlement.
5. Đồng bộ frontend mapping.
6. Dừng và hỏi nếu phụ thuộc UNKNOWN.

# Do not

Không tự tạo priority/approval; không gộp order types; không coi UI mock là backend behavior.

# Validation

Build; kiểm tra create-approve-run-complete, delay scan, audit, return cargo và SLA.

# Related skills

`vehicle-equipment-management`, `gps-monitoring-alerts`, `driver-operations-kpi`, `fuel-management`.
