# Project Overview

## Mục tiêu

Repository là mockup/full-stack cho Hệ thống số hóa Quản lý Xe Cơ giới & PTVC tại KLH Koun Mom. Phạm vi BRD gồm dữ liệu xe, kế hoạch/điều xe/vận chuyển, GPS, nhiên liệu, BTSC, lái xe/KPI, báo cáo/dashboard và app tài xế.

## Tech stack đã xác minh

- Frontend: React 18, TypeScript, Vite, React Router 6, Zustand, Axios, TanStack Query (dependency nhưng chưa thấy dùng trong pages), Tailwind CSS, Recharts, Lucide.
- Backend: NestJS 10, TypeScript, Swagger, Passport JWT, class-validator/class-transformer, cookie-parser.
- Data: Prisma 5, MySQL; schema tại `backend/prisma/schema.prisma`.
- Legacy/mockup: HTML/CSS tĩnh trong `legacy_mockup/` và `pages/`; không phải implementation React chính.

## Entry points

- Root commands: `package.json`.
- Frontend bootstrap/router: `frontend/src/main.tsx`, `frontend/src/App.tsx`.
- Backend bootstrap/module graph: `backend/src/main.ts`, `backend/src/app.module.ts`.
- Database: `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, `database/schema_dump.sql`.

## Source of truth

1. Actual source dưới `frontend/src/`, `backend/src/`.
2. Prisma schema và constraints.
3. `docs/BRD_QuanLyXeCoGioi_KLH.docx` / `docs/BRD_extracted.txt`.
4. `docs/00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx` cho dữ liệu MMTB thực tế.
5. `PROJECT_STRUCTURE.md` và tài liệu thiết kế.

Không dùng số liệu mock/README làm rule nếu mâu thuẫn với code hoặc BRD.

## Trạng thái triển khai

- Backend có REST modules và Prisma queries thực tế.
- Frontend có đầy đủ route A-K nhưng phần lớn page dùng dữ liệu mock/hard-code.
- `frontend/src/api/client.ts` chứa mapping API; `VehiclesPage` tải API và fallback mock. Kiểm tra từng page trước khi giả định integration.
- Repo không có test framework/test suite thực tế; build TypeScript là validation baseline.
