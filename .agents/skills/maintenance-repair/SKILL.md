---
name: maintenance-repair
description: Handle maintenance scheduling, 250-hour counters, alert tiers, checklists, owed parts, repair tickets, workshop status, costs, inspections, and vehicle service transitions. Use for /xuong-btsc, /maintenance, /repairs, service due dates, or workshop Kanban.
---

# Maintenance Repair

# Purpose

Giữ workflow bảo dưỡng/sửa chữa, vật tư và trạng thái xe nhất quán.

# When to use

Maintenance records/schedule/checklist, owed parts, repair tickets/costs/Kanban, inspection screens.

# Relevant project areas

Frontend: `pages/workshop`, `components/kanban`.
Backend: `maintenance`, `repairs`.
Database: MaintenanceRecord, WorkshopOwedPartNote, RepairTicket, Vehicle.
Docs: BRD II.8-9/Tables 8-9; workbook `08. ĐKĐK`.

# Current architecture

Maintenance/repair là hai modules; hoàn tất maintenance có thể tạo repair; services dùng transactions để đổi VehicleStatus.

# Project conventions

Dùng status/repair-tier enums; preserve checklistJson; dùng owed-part lifecycle; report cost qua repairs endpoint.

# Business rules

- VERIFIED implementation: 250h, AMBER <=50h, RED <=20h. Source: vehicles/maintenance services.
- VERIFIED: phát hiện lỗi khi complete maintenance có thể tạo RepairTicket. Source: `maintenance.service.ts`.
- VERIFIED: repair create -> SUA_CHUA; complete -> CHO_PHAN_CONG. Source: `repairs.service.ts`.
- BRD VERIFIED: BDC1/BDC2, nhiều chu kỳ và repair 8 bước. Source: BRD Tables 8-9.
- UNKNOWN/MISMATCH: mốc 30h và các chu kỳ rộng hơn chưa được code model hóa; retention/hard delete mâu thuẫn BRD.

# Implementation workflow

1. Xác định maintenance hay repair owner.
2. Trace vehicle status/counter transitions.
3. Đối chiếu BRD với code; ghi mismatch.
4. Dùng transaction cho record/ticket/vehicle.
5. Giữ checklist, part debt, cost history.
6. Đồng bộ workshop UI/API.

# Do not

Không thêm mốc 30h âm thầm; không rút gọn quy trình BRD thành rule code nếu chưa implemented; không hard delete hồ sơ lịch sử mà chưa duyệt.

# Validation

Build; test due tiers, complete with/without defect, owed part resolve, repair transitions và cost report.

# Related skills

`vehicle-equipment-management`, `master-data-catalogs`, `dashboard-reporting`, `prisma-database`.
