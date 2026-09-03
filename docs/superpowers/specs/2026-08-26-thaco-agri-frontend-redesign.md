# Design Spec: THACO AGRI Fleet Management Frontend SPA

**Date:** 2026-08-26  
**Status:** Approved  
**Author:** AI Agent (Pair Programming with User)  
**Target:** Modern React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts Single Page Application (SPA) for THACO AGRI Fleet Management System.

---

## 1. Overview & Objectives

Convert and upgrade the existing static HTML mockup system into a modern, enterprise-grade React SPA based on [TECH_STACK_TEMPLATE.md](file:///d:/ThacoAgri_Code/Mockup/TECH_STACK_TEMPLATE.md).

### Key Goals:
- **Clean Enterprise Architecture**: Organized modular directory structure under `frontend/` supporting 11 core modules, ready for backend NestJS / Prisma API integration.
- **Design System & Aesthetics**: THACO AGRI brand identity (Primary: `#0F5F2A`, Dark: `#0A431E`, Light: `#E7F1EA`), rounded-12px (`rounded-xl`), modern typography (`Inter` / `Manrope`), sleek card elevations, refined data tables, and micro-interactions.
- **Rich Reusable Component Library**: Dynamic `DataTable` (search, multi-filter, status badges, pagination, export), `KPIGrid`, `StatCard`, `FilterBar`, `ChartCard` (Recharts), `GPSMapViewer` mockup, `ModalDialog`, `KanbanBoard`, and `ToastNotification`.
- **Full Coverage of 11 Modules**:
  1. Module A: Dashboard Vận hành
  2. Module B: Giám sát GPS trực tuyến (5 màn hình)
  3. Module C: Quản lý đội xe (5 màn hình)
  4. Module D: Lệnh điều xe & Vận hành (4 màn hình)
  5. Module I: Quản lý lái xe & KPI (5 màn hình)
  6. Module E: Xưởng Bảo trì Sửa chữa BTSC (5 màn hình)
  7. Module J: Quản lý nhiên liệu (5 màn hình)
  8. Module K: Cảnh báo & Thông báo SOS (4 màn hình)
  9. Module F: Báo cáo hợp nhất (6 màn hình)
  10. Module H: Danh mục hệ thống (6 màn hình)
  11. Module G: Phân quyền & Nhật ký hệ thống (4 màn hình)

---

## 2. Technology Stack & Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.14.2",
    "axios": "^1.6.2",
    "clsx": "^2.0.0",
    "lucide-react": "^0.294.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "recharts": "^2.10.3",
    "tailwind-merge": "^2.1.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

---

## 3. Directory Layout

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   ├── mockData.ts          # Tập trung toàn bộ mock data cho 11 phân hệ
│   │   └── client.ts            # Cấu hình Axios Base Client
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx       # Primary, Secondary, Outline, Danger, Icon-only
│   │   │   ├── Badge.tsx        # Trạng thái Hoạt động, Tạm dừng, Bảo trì, Cảnh báo
│   │   │   ├── Modal.tsx        # Hộp thoại chi tiết / form thêm mới
│   │   │   └── Tabs.tsx         # Tab điều hướng phụ
│   │   ├── data-display/
│   │   │   ├── DataTable.tsx    # Bảng dữ liệu đa năng: tìm kiếm, sắp xếp, phân trang
│   │   │   ├── StatCard.tsx     # Thẻ chỉ số KPI với trend % và icon
│   │   │   └── KPIGrid.tsx      # Lưới 4-5 cột hiển thị chỉ số
│   │   ├── filters/
│   │   │   ├── FilterBar.tsx    # Thanh lọc chọn KLH, Xí nghiệp, Trạng thái, Ngày
│   │   │   └── QuickSearch.tsx  # Ô tìm kiếm tức thì
│   │   ├── maps/
│   │   │   ├── GPSMapViewer.tsx # Bản đồ GPS vector/interactive với markers xe
│   │   │   └── GeofenceViewer.tsx # Bản đồ vùng địa lý & cảnh báo tốc độ
│   │   ├── charts/
│   │   │   ├── FleetBarChart.tsx # Biểu đồ cột năng suất vận hành
│   │   │   └── FuelLineChart.tsx # Biểu đồ đường tiêu hao nhiên liệu
│   │   └── kanban/
│   │       └── KanbanBoard.tsx  # Bảng tiến độ sửa chữa xưởng BTSC
│   ├── layouts/
│   │   ├── MainLayout.tsx       # Khung App chính (Sidebar + Topbar + Content)
│   │   ├── Sidebar.tsx          # Menu 11 phân hệ dạng accordion với Badge SOS
│   │   ├── Topbar.tsx           # Thanh header, Selector KLH, User info, Search
│   │   └── Breadcrumb.tsx       # Breadcrumb điều hướng
│   ├── store/
│   │   ├── useAppStore.ts       # Global state: KLH hiện tại, Sidebar thu gọn, Thông báo
│   │   └── useFilterStore.ts    # State bộ lọc ngày tháng và từ khóa
│   ├── types/
│   │   └── index.ts             # Định nghĩa types cho 11 phân hệ (Vehicle, Driver, Order, Maintenance, Fuel, Alert, Report, etc.)
│   ├── pages/
│   │   ├── dashboard/           # Dashboard tổng quan
│   │   ├── gps/                 # 5 trang Giám sát GPS
│   │   ├── fleet/               # 5 trang Quản lý đội xe
│   │   ├── dispatch/            # 4 trang Lệnh điều xe & Vận chuyển
│   │   ├── drivers/             # 5 trang Quản lý lái xe & KPI
│   │   ├── workshop/            # 5 trang Xưởng BTSC & Đăng kiểm
│   │   ├── fuel/                # 5 trang Quản lý nhiên liệu
│   │   ├── alerts/              # 4 trang Cảnh báo & SOS
│   │   ├── reports/             # 6 trang Báo cáo hợp nhất
│   │   ├── master-data/         # 6 trang Danh mục hệ thống
│   │   └── permissions/         # 4 trang Phân quyền & Audit log
│   ├── App.tsx                  # Khai báo React Router v6 tập trung
│   ├── index.css                # Tailwind imports & Custom styles
│   └── main.tsx                 # React DOM Root
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 4. UI/UX Design System Guidelines

- **Primary Color Palette:**
  - `primary-900`: `#0A431E`
  - `primary-800`: `#0F5F2A` (THACO AGRI Brand Green)
  - `primary-700`: `#137534`
  - `primary-100`: `#E7F1EA`
  - `primary-50`: `#F2F7F4`
- **Functional Accent Colors:**
  - Success / Running: `#10B981` (Emerald)
  - Warning / Idle: `#F59E0B` (Amber)
  - Danger / Maintenance / SOS: `#EF4444` (Rose / Red)
  - Info / GPS Telemetry: `#3B82F6` (Sky / Blue)
- **Geometry & Cards:**
  - Border Radius: `rounded-xl` (12px)
  - Borders: `border border-slate-200/80`
  - Backgrounds: `bg-slate-50/60` for canvas, `#FFFFFF` for cards
  - Shadows: `shadow-sm hover:shadow-md transition-shadow duration-200`
- **Typography:**
  - `font-sans`: Inter (`sans-serif`)
  - `font-heading`: Manrope (`sans-serif`) for headers, KPI numbers, and metric widgets

---

## 5. Implementation Strategy

1. **Step 1: Setup Frontend Workspace**
   - Create `frontend/` directory with `package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`, `index.html`.
   - Install all required dependencies (`lucide-react`, `recharts`, `zustand`, `react-router-dom`, `clsx`, `tailwind-merge`, etc.).
2. **Step 2: Core Design System & Types**
   - Implement `index.css`, Tailwind custom tokens, and `src/types/index.ts`.
   - Build `mockData.ts` with comprehensive sample data for all 11 modules.
3. **Step 3: Common UI Component Library**
   - Build `Button`, `Badge`, `Modal`, `DataTable`, `StatCard`, `KPIGrid`, `FilterBar`, `GPSMapViewer`, `FleetBarChart`, `KanbanBoard`.
4. **Step 4: Layout & Navigation Shell**
   - Build `Sidebar` (11 modules with badge counts), `Topbar` (KLH switcher, notification trigger, search), `Breadcrumb`, `MainLayout`.
   - Configure centralized routing in `App.tsx`.
5. **Step 5: Assemble & Implement 11 Modules**
   - Implement all 11 modules with rich interactive features, filter bars, statistics, data tables, map views, and charts.
6. **Step 6: Root Scripts & Verification**
   - Update root `package.json` to allow easy dev execution (`npm run dev` at root triggers `frontend/`).
   - Run Vite dev server, verify build with TypeScript compiler, inspect UI in browser.
