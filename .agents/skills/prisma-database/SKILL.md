---
name: prisma-database
description: Inspect and change the Fleet Prisma/MySQL data layer, including models, enums, relations, constraints, indexes, queries, transactions, migrations, seed data, SQL dumps, and workbook imports. Use for schema.prisma, Prisma service queries, database scripts, or migration impact analysis.
---

# Prisma Database

# Purpose

Làm việc an toàn với schema/query/data mà không invent model hoặc phá dữ liệu hiện hữu.

# When to use

Schema model/enum/relation/index, Prisma query/transaction, migration/seed/dump/import.

# Relevant project areas

`backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, `backend/src/prisma/`, services, `database/schema_dump.sql`, data scripts, workbook MMTB.

# Current architecture

MySQL + Prisma 5. Models nhóm identity/fleet/planning/logistics/fuel/workshop/driver/catalog. Services dùng include/select, pagination và transactions.

# Project conventions

Dùng enums/status hiện có; business code unique; FK onDelete explicit; indexes cho filters; map table names snake_case; transaction cho aggregate consistency.

# Business rules

Schema là evidence cho constraints, không phải đủ cho workflow. Đọc `.agents/context/database-overview.md` và domain skill.
GAP: nhiều model nêu trong docs/pages không tồn tại; không tự tạo chúng.

# Implementation workflow

1. Trace all consumers của model/field/enum.
2. So sánh Prisma với SQL dump/seed khi liên quan.
3. Đánh giá migration, backfill, nullability, unique/FK/index và rollback.
4. Cập nhật DTO/service/client/seed cùng change.
5. Chọn migration có kiểm soát; không dùng db push mù.
6. Build/generate và kiểm tra representative queries.

# Do not

Không đổi schema nếu task không cho phép; không rename/drop destructive mà chưa có plan; không import workbook chưa mapping; không hard delete khi BRD yêu cầu history mà chưa quyết định policy.

# Validation

Chạy Prisma validate/generate phù hợp và `npm run build:backend`; kiểm tra migration SQL, seed, unique/FK và transaction.

# Related skills

Mọi domain skill, `nestjs-backend`, `master-data-catalogs`.
