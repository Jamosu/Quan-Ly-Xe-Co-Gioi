---
name: nestjs-backend
description: Implement and review the existing Fleet NestJS 10 backend, including feature modules, controllers, services, DTO validation, Swagger, guards, pagination, Prisma queries, transactions, response envelopes, and error handling. Use for any backend/src API change.
---

# Nestjs Backend

# Purpose

Giữ controller-service-DTO-Prisma conventions và response/auth behavior hiện tại.

# When to use

Endpoint, module, controller, service, DTO, guard/decorator, interceptor/filter hoặc Swagger trong `backend/src`.

# Relevant project areas

`main.ts`, `app.module.ts`, `common/*`, feature modules, `prisma/PrismaService`.

# Current architecture

Global /api prefix, ValidationPipe, HttpExceptionFilter, Logging/Transform interceptors, Swagger. Feature controller gọi service; service gọi Prisma. Guards gắn ở controller.

# Project conventions

DTO dùng Swagger + class-validator; filter extends PaginationDto; list trả items+pagination; use Nest exceptions; use include/select; use transaction cho multi-entity mutation; message tiếng Việt.

# Business rules

Lấy từ domain skill/BRD/schema, không từ framework best practice. Giữ response envelope và status transitions hiện tại trừ khi task yêu cầu migration.

# Implementation workflow

1. Search endpoint/service/DTO tương tự.
2. Xác định guard/role/unit scope.
3. Define DTO validation và Swagger.
4. Implement service với conflict/not-found/transaction.
5. Không double-wrap response.
6. Cập nhật client consumer và build.

# Do not

Không trả passwordHash; không bypass guards; không dùng `any` mới nếu type dễ xác định; không create module trùng; không đổi global pipeline/envelope âm thầm; không nhầm role với unit isolation.

# Validation

Chạy `npm run build:backend`; test validation, pagination, 401/403, 404/409, transaction rollback và response shape.

# Related skills

Domain skill tương ứng, `rbac-administration`, `prisma-database`, `react-frontend`.
