---
name: rbac-administration
description: Handle JWT authentication, users, roles, role guards, unit-scoped access, permission screens, and audit expectations. Use for /phan-quyen UI, /auth, /users, @Roles, JwtStrategy, data isolation, account status, cookies, tokens, or authorization review.
---

# Rbac Administration

# Purpose

Thay đổi auth/RBAC mà không nhầm role check với row-level unit isolation.

# When to use

Login/register/profile, JWT/cookie, users, roles, unit access, permission matrix, audit/security review.

# Relevant project areas

Frontend: `frontend/src/pages/permissions/`, `api/client.ts`.
Backend: `auth`, `users`, common guards/decorators.
Database: User, Role, Unit.
Docs: BRD I.3, III, IV.

# Current architecture

Controller domain thường gắn JwtAuthGuard/RolesGuard. JwtStrategy tải active user. SUPER_ADMIN bypass role list. CatalogsController hiện không gắn guard. Frontend client auto-login admin là demo behavior.

# Project conventions

Dùng `@UseGuards` ở controller và `@Roles` ở mutations; không trả passwordHash; throw 401/403 rõ ràng.

# Business rules

- VERIFIED: phân quyền theo đơn vị, không xem chéo; lãnh đạo xem hợp nhất. Source: BRD [56]/[114].
- VERIFIED implementation: Role guard chỉ kiểm tra role. Source: `roles.guard.ts`.
- GAP: services nhận query unit nhưng chưa enforce request.user.unit nhất quán.
- GAP: AuditLog model chưa tồn tại; CatalogsController không guard.
- RISK: fallback JWT secret và frontend auto-admin login chỉ phù hợp mock/dev.

# Implementation workflow

1. Xác định authentication, role authorization hay unit authorization.
2. Trace controller guard -> current user -> service where clause.
3. Preserve SUPER_ADMIN semantics nếu không có yêu cầu đổi.
4. Enforce least privilege theo pattern thống nhất, không patch một endpoint đơn lẻ nếu gây lệch.
5. Đánh giá frontend session handling.
6. Validate 401/403 và cross-unit cases.

# Do not

Không tuyên bố unit isolation đã đủ; không hard-code credentials/secret mới; không dựa chỉ vào hidden UI; không tạo AuditLog giả nếu chưa thiết kế schema.

# Validation

Build; test public/protected, expired/inactive user, role matrix, SUPER_ADMIN và cross-unit access.

# Related skills

`nestjs-backend`, `prisma-database`, `master-data-catalogs`, mọi domain skill có dữ liệu unit.
