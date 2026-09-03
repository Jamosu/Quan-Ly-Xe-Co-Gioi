---
name: dashboard-reporting
description: Handle operational dashboard KPIs, live-fleet summaries, report pages, filters, charts, cross-KLH comparisons, CSV/Excel exports, and domain aggregates. Use for /dashboard, /bao-cao, management metrics, productivity, fuel, maintenance cost, driver KPI, or alert statistics.
---

# Dashboard Reporting

# Purpose

Xây dashboard/report từ metric có định nghĩa và source rõ, không từ số mock.

# When to use

KPI cards, charts/maps, report pages, filters, exports, aggregates theo ngày/tuần/tháng/đơn vị.

# Relevant project areas

Frontend: `pages/dashboard`, `pages/reports`, charts, DataTable/FilterBar.
Backend: `dashboard` và report endpoints trong fuel/repairs/driver-kpi/transport.
Database: aggregates từ domain models.
Docs: BRD II.11-12, Tables 11-12.

# Current architecture

Dashboard service aggregate Prisma; nhiều report page dùng mock/hard-code. DataTable export hiện là CSV client-side dù UI có nhãn “Excel” ở nơi khác.

# Project conventions

Tái dùng FilterBar/DataTable/KPIGrid/StatCard; format backend envelope; giữ filters theo KLH/status/date; define metric numerator/denominator/timezone.

# Business rules

- VERIFIED: báo cáo real-time ngày/tuần/tháng và filter đơn vị thuộc BRD. Source: BRD [82]/Table 12.
- VERIFIED: export và retention tối thiểu 2 năm là yêu cầu BRD. Source: BRD Table 11.
- UNKNOWN: định nghĩa “năng suất”; refresh SLA; cross-KLH comparability.
- GAP: nhiều displayed counts/percentages là mock, không reconciliation với API.

# Implementation workflow

1. Viết metric definition và source model/query.
2. Xác minh unit/time filter và empty denominator.
3. Tái dùng endpoint/component hiện có.
4. Giữ calculation server-side nếu cần consistency; mapper chỉ presentation.
5. Phân biệt CSV với XLSX.
6. Reconcile sample totals.

# Do not

Không hard-code KPI; không gọi mock là realtime; không đổi metric definition âm thầm; không export file giả XLSX từ CSV.

# Validation

Build; đối chiếu totals với query nguồn; test filters, zero-data, timezone, labels và export encoding.

# Related skills

Mọi domain skill cung cấp metric; `react-frontend`, `nestjs-backend`, `prisma-database`.
