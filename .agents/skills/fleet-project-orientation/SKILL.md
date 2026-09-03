---
name: fleet-project-orientation
description: Navigate the THACO AGRI Fleet repository, map requests to modules A-K, select authoritative evidence, and identify cross-layer dependencies. Use for discovery, impact analysis, architecture review, feature scoping, or requests spanning multiple Fleet domains, React, NestJS, Prisma, BRD, or MMTB data.
---

# Fleet Project Orientation

# Purpose

Định tuyến task đến đúng domain, context, source và skill trước khi sửa code.

# When to use

- Audit kiến trúc, giải thích codebase hoặc scope feature xuyên tầng.
- Yêu cầu chưa rõ thuộc vehicle, dispatch, GPS, fuel, workshop, driver, catalog hay reporting.

# Relevant project areas

Frontend: `frontend/src/App.tsx`, `frontend/src/pages/`, `frontend/src/api/client.ts`.
Backend: `backend/src/app.module.ts`, feature modules.
Database: `backend/prisma/schema.prisma`.
Docs: `PROJECT_STRUCTURE.md`, BRD và workbook MMTB.

# Current architecture

Đọc `.agents/context/project-overview.md`, `architecture.md` và `module-map.md`. Xác minh route -> controller/service -> Prisma -> BRD; phân biệt React, backend và legacy mockup.

# Project conventions

Ưu tiên source -> schema -> BRD -> docs -> best practice. Đánh dấu page mock/API hybrid trước khi đề xuất integration.

# Business rules

Không invent rule. Dùng `VERIFIED`, `INFERRED`, `UNKNOWN` theo `.agents/context/business-rules.md`.
Source: `.agents/context/business-rules.md`, `docs/BRD_extracted.txt`.

# Implementation workflow

1. Parse request thành domain, layer và behavior.
2. Search route/resource/model/enum hiện có.
3. Load domain và technical skill liên quan.
4. Lập impact map và xác minh rule.
5. Implement trong phạm vi bằng chứng.
6. Validate và review cross-layer mapping.

# Do not

Không tạo module/model chỉ vì tên hợp lý; không coi README/mock data cao hơn code/schema; không sửa code khi task chỉ yêu cầu audit.

# Validation

Kiểm tra source path tồn tại; chạy build layer bị đổi.

# Related skills

Chọn domain skill và thêm `react-frontend`, `nestjs-backend`, `prisma-database` theo layer.
