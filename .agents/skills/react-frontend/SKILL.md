---
name: react-frontend
description: Implement and review the existing Fleet React 18/Vite frontend, including routes, pages, shared components, Zustand filters, Axios mappings, mock fallbacks, Tailwind styling, tables, charts, maps, and modals. Use for any frontend/src TypeScript or TSX change.
---

# React Frontend

# Purpose

Giữ conventions React hiện tại và tránh duplicate UI/API mapping.

# When to use

Route/page/component/layout/store/filter/table/chart/map/modal hoặc API integration trong `frontend/src`.

# Relevant project areas

`App.tsx`, `pages/*`, `components/*`, `layouts/*`, `store/*`, `api/client.ts`, `api/mockData.ts`, `types/index.ts`, `index.css`.

# Current architecture

Router tập trung dưới MainLayout. Page theo domain. Zustand giữ app/filter state. Shared DataTable filter/sort/page/export client-side. Axios client unwrap envelope và map backend entity sang UI type.

# Project conventions

Dùng functional components + named exports; Tailwind tokens hiện có; Lucide icons; reusable Button/Badge/Modal/FilterBar/DataTable; alias `@/*` có sẵn nhưng source thường dùng relative imports.

# Business rules

Không đặt rule mới trong UI. Lấy label/status mapping từ enum/API và domain skill. Dữ liệu mock chỉ là fallback/demo.

# Implementation workflow

1. Search component/page/type tương tự.
2. Xác định API-backed hay mock-only.
3. Tái dùng shared component/store.
4. Cập nhật type + mapper trước page nếu shape đổi.
5. Xử lý loading/error/empty/fallback rõ ràng.
6. Build frontend và kiểm tra route/filter/table.

# Do not

Không thêm state library/pattern mới; không duplicate table/modal; không nhét backend enum label vào nhiều page; không giữ auto-admin login trong production feature; không tuyên bố button đã hoạt động nếu handler chỉ đóng modal.

# Validation

Chạy `npm run build:frontend`; kiểm tra responsive layout, route, filters, empty/loading, console errors và mojibake tiếng Việt.

# Related skills

Domain skill tương ứng; `nestjs-backend` khi đổi API; `dashboard-reporting` cho metrics.
