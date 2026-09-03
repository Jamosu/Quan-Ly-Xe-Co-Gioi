---
name: master-data-catalogs
description: Handle shared Fleet master data for units, vehicle types, job types, plots and routes, spare parts, technical quotas, companies, employees, personnel, and bulk catalog sync. Use for /danh-muc UI, /catalogs APIs, CatalogItem, workbook MMTB mapping, or reference-data imports.
---

# Master Data Catalogs

# Purpose

Quản lý dữ liệu gốc và import/sync mà không làm mất semantics hoặc nhầm workbook với schema canonical.

# When to use

Đơn vị, loại xe/công việc, lô tuyến, phụ tùng, định mức, company/employee/personnel, bulk sync.

# Relevant project areas

Frontend: `frontend/src/pages/master-data/`.
Backend: `backend/src/catalogs/`.
Database: CatalogItem, CompanyEntity, EmployeeRecord, PersonnelRecord.
Docs: workbook MMTB, BRD data foundation.

# Current architecture

CatalogsService CRUD/upsert/bulk sync cho nhiều record type. CatalogItem dùng string id/code/type; controller hiện không gắn guards.

# Project conventions

Giữ id/code/source identifiers; dùng upsert cho sync; validate arrays; preserve parent/unit hierarchy và status.

# Business rules

- VERIFIED: workbook có nhiều sheet/format, mã mới/cũ/Bravo/tài sản, đơn vị, tình trạng, định mức. Source: workbook.
- VERIFIED: CatalogType chỉ gồm COMPLEX/DEPARTMENT/ENTERPRISE/FARM/TEAM/PLOT/LAND_PARCEL. Source: schema.
- UNKNOWN: sheet nào canonical; mapping column -> model; dedupe precedence; import ownership.
- GAP: UI master-data rộng hơn CatalogItem types và backend schema.

# Implementation workflow

1. Chọn source sheet và record type rõ ràng.
2. Profile header, identifier, hierarchy, units và duplicates.
3. Tạo mapping được duyệt; không suy diễn.
4. Dùng dry-run/validation trước bulk sync.
5. Giữ upsert idempotent.
6. Đánh giá auth/unit scope.

# Do not

Không import tất cả sheet; không dùng row order làm ID; không đổi enum/type để vừa dữ liệu mà chưa đánh giá consumer; không bỏ qua privacy trong personnel sheet.

# Validation

Build; kiểm tra duplicate codes, parent references, rerun idempotency, counts và representative records.

# Related skills

`vehicle-equipment-management`, `fuel-management`, `maintenance-repair`, `rbac-administration`, `prisma-database`.
