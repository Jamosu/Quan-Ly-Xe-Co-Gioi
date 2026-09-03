# THACO AGRI Fleet Management Frontend SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild and redesign the entire THACO AGRI Fleet Management mockup system into a modern, enterprise-ready React 18 + Vite + TypeScript + Tailwind CSS Single Page Application (SPA) covering all 11 core modules.

**Architecture:** A clean modular component-driven frontend in `frontend/` matching [TECH_STACK_TEMPLATE.md](file:///d:/ThacoAgri_Code/Mockup/TECH_STACK_TEMPLATE.md). Includes a rich UI component system, dynamic data tables, real-time-styled GPS map viewers, interactive charts (Recharts), workshop Kanban boards, and a multi-level sidebar with SOS badge counters.

**Tech Stack:** React 18, Vite 5, TypeScript 5, Tailwind CSS 3.3, Lucide React, Recharts, Zustand, clsx, tailwind-merge.

**Spec:** [Design Spec](file:///d:/ThacoAgri_Code/Mockup/docs/superpowers/specs/2026-08-26-thaco-agri-frontend-redesign.md)

---

## Global Constraints
- Primary Brand Color: `#0F5F2A` (THACO AGRI Green), Dark: `#0A431E`, Light: `#E7F1EA`
- Border Radius: `12px` (`rounded-xl`)
- Fonts: `Inter` and `Manrope`
- Monorepo structure with `frontend/` directory
- Non-interactive script execution (`npm`, `npx`)

---

## Tasks

### Task 1: Scaffold Frontend Project & Dependencies
**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`

- [ ] **Step 1: Create package.json and configuration files for `frontend/`**
- [ ] **Step 2: Run `npm install` inside `frontend/` directory**
- [ ] **Step 3: Verify build tooling with `npx vite build` check**

---

### Task 2: Design Tokens, Global CSS & TypeScript Types
**Files:**
- Create: `frontend/src/index.css`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/store/useAppStore.ts`
- Create: `frontend/src/store/useFilterStore.ts`

- [ ] **Step 1: Implement `src/index.css` with Google Fonts (Inter, Manrope), scrollbar styling, animations, and Tailwind directives**
- [ ] **Step 2: Define exhaustive TypeScript interfaces in `src/types/index.ts` (Vehicle, Driver, Order, Maintenance, Fuel, Alert, Report, MasterData, User)**
- [ ] **Step 3: Implement Zustand state stores (`useAppStore.ts`, `useFilterStore.ts`) for KLH selection, sidebar toggle, and active filters**

---

### Task 3: Comprehensive Mock Data Layer
**Files:**
- Create: `frontend/src/api/mockData.ts`

- [ ] **Step 1: Convert and structure all rich data from existing `page_data.js` and Python generators into `mockData.ts`**
- [ ] **Step 2: Include comprehensive realistic data for all 11 modules (50+ vehicles, drivers, dispatch orders, maintenance logs, fuel records, alerts, reports, and master data)**

---

### Task 4: Core Reusable UI Component Library
**Files:**
- Create: `frontend/src/components/common/Button.tsx`
- Create: `frontend/src/components/common/Badge.tsx`
- Create: `frontend/src/components/common/Modal.tsx`
- Create: `frontend/src/components/common/Tabs.tsx`
- Create: `frontend/src/components/data-display/StatCard.tsx`
- Create: `frontend/src/components/data-display/KPIGrid.tsx`
- Create: `frontend/src/components/data-display/DataTable.tsx`
- Create: `frontend/src/components/filters/FilterBar.tsx`
- Create: `frontend/src/components/maps/GPSMapViewer.tsx`
- Create: `frontend/src/components/charts/FleetCharts.tsx`
- Create: `frontend/src/components/kanban/KanbanBoard.tsx`

- [ ] **Step 1: Build `Button.tsx`, `Badge.tsx`, `Modal.tsx`, `Tabs.tsx`**
- [ ] **Step 2: Build `StatCard.tsx`, `KPIGrid.tsx`, and `DataTable.tsx` with search, sorting, tag rendering, pagination, and action slots**
- [ ] **Step 3: Build `FilterBar.tsx` with KLH selector, date range picker, and quick preset filters**
- [ ] **Step 4: Build `GPSMapViewer.tsx`, `FleetCharts.tsx` (Recharts integration), and `KanbanBoard.tsx`**

---

### Task 5: App Shell Layouts & Centralized Router
**Files:**
- Create: `frontend/src/layouts/Sidebar.tsx`
- Create: `frontend/src/layouts/Topbar.tsx`
- Create: `frontend/src/layouts/Breadcrumb.tsx`
- Create: `frontend/src/layouts/MainLayout.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Implement `Sidebar.tsx` with 11 collapsible modules, active link indicators, and SOS warning badge counters**
- [ ] **Step 2: Implement `Topbar.tsx` with KLH switcher dropdown, global search input, quick alert drawer, and user profile avatar**
- [ ] **Step 3: Implement `Breadcrumb.tsx` and `MainLayout.tsx`**
- [ ] **Step 4: Set up `App.tsx` with react-router-dom nested routes**

---

### Task 6: Implement All 11 Modules & Sub-pages
**Files:**
- Create: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Create: `frontend/src/pages/gps/GPSRealtimePage.tsx`
- Create: `frontend/src/pages/gps/GPSPlaybackPage.tsx`
- Create: `frontend/src/pages/gps/GeofencePage.tsx`
- Create: `frontend/src/pages/gps/SpeedAlertPage.tsx`
- Create: `frontend/src/pages/gps/OfflineLogsPage.tsx`
- Create: `frontend/src/pages/fleet/VehiclesPage.tsx`
- Create: `frontend/src/pages/fleet/EquipmentPage.tsx`
- Create: `frontend/src/pages/fleet/UnitAssignmentPage.tsx`
- Create: `frontend/src/pages/fleet/GPSSensorsPage.tsx`
- Create: `frontend/src/pages/fleet/FleetHistoryPage.tsx`
- Create: `frontend/src/pages/dispatch/ProductionPlanPage.tsx`
- Create: `frontend/src/pages/dispatch/DispatchOrdersPage.tsx`
- Create: `frontend/src/pages/dispatch/InternalTransportPage.tsx`
- Create: `frontend/src/pages/dispatch/WeightTicketsPage.tsx`
- Create: `frontend/src/pages/drivers/DriversListPage.tsx`
- Create: `frontend/src/pages/drivers/ShiftAssignmentPage.tsx`
- Create: `frontend/src/pages/drivers/LicenseExpiryPage.tsx`
- Create: `frontend/src/pages/drivers/DriverViolationsPage.tsx`
- Create: `frontend/src/pages/drivers/DriverKPIRankingPage.tsx`
- Create: `frontend/src/pages/workshop/MaintenancePlanPage.tsx`
- Create: `frontend/src/pages/workshop/IssueReportsPage.tsx`
- Create: `frontend/src/pages/workshop/WorkOrdersPage.tsx`
- Create: `frontend/src/pages/workshop/WorkshopKanbanPage.tsx`
- Create: `frontend/src/pages/workshop/InspectionInsurancePage.tsx`
- Create: `frontend/src/pages/fuel/FuelVouchersPage.tsx`
- Create: `frontend/src/pages/fuel/FuelQuotasPage.tsx`
- Create: `frontend/src/pages/fuel/FuelReconciliationPage.tsx`
- Create: `frontend/src/pages/fuel/FuelTanksInventoryPage.tsx`
- Create: `frontend/src/pages/fuel/FuelDropAlertsPage.tsx`
- Create: `frontend/src/pages/alerts/UnresolvedAlertsPage.tsx`
- Create: `frontend/src/pages/alerts/AlertHistoryPage.tsx`
- Create: `frontend/src/pages/alerts/AlertThresholdsPage.tsx`
- Create: `frontend/src/pages/alerts/ViolationStatsPage.tsx`
- Create: `frontend/src/pages/reports/VehicleProductivityReportPage.tsx`
- Create: `frontend/src/pages/reports/TripViolationReportPage.tsx`
- Create: `frontend/src/pages/reports/DriverKPIReportPage.tsx`
- Create: `frontend/src/pages/reports/FuelConsumptionReportPage.tsx`
- Create: `frontend/src/pages/reports/MaintenanceCostReportPage.tsx`
- Create: `frontend/src/pages/reports/CrossKLHReportPage.tsx`
- Create: `frontend/src/pages/master-data/UnitsKLHPage.tsx`
- Create: `frontend/src/pages/master-data/VehicleTypesPage.tsx`
- Create: `frontend/src/pages/master-data/JobTypesPage.tsx`
- Create: `frontend/src/pages/master-data/PlotsRoutesPage.tsx`
- Create: `frontend/src/pages/master-data/SparePartsPage.tsx`
- Create: `frontend/src/pages/master-data/TechnicalQuotasPage.tsx`
- Create: `frontend/src/pages/permissions/UsersManagementPage.tsx`
- Create: `frontend/src/pages/permissions/RolesMatrixPage.tsx`
- Create: `frontend/src/pages/permissions/UnitPermissionsPage.tsx`
- Create: `frontend/src/pages/permissions/AuditLogsPage.tsx`

- [ ] **Step 1: Implement Module A (Dashboard) & Module B (GPS 5 pages)**
- [ ] **Step 2: Implement Module C (Fleet 5 pages) & Module D (Dispatch 4 pages)**
- [ ] **Step 3: Implement Module I (Drivers 5 pages) & Module E (Workshop 5 pages)**
- [ ] **Step 4: Implement Module J (Fuel 5 pages) & Module K (Alerts 4 pages)**
- [ ] **Step 5: Implement Module F (Reports 6 pages), Module H (Master Data 6 pages) & Module G (Permissions 4 pages)**

---

### Task 7: Root Package Configuration & Build Verification
**Files:**
- Modify: `package.json` (Root)

- [ ] **Step 1: Update root `package.json` scripts to run `dev` and `build` pointing to `frontend/`**
- [ ] **Step 2: Run `npm run build --prefix frontend` to ensure 100% TypeScript compilation without errors**
- [ ] **Step 3: Start Vite server on port 5173**

---

### Task 8: Verification & Visual Testing
- [ ] **Step 1: Test route navigation across all 11 modules via browser subagent**
- [ ] **Step 2: Test interactivity (KLH filter, search, tabs, modal dialogs, status badges)**
- [ ] **Step 3: Generate visual walkthrough report**
