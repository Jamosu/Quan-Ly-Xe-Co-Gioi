# Fleet Management Agent Instructions

Áp dụng các chỉ dẫn này cho mọi thay đổi trong repository.

## Quy tắc bắt buộc

1. Inspect file liên quan trước khi edit; không suy luận chỉ từ tên thư mục.
2. Search implementation hiện có trước khi tạo component, service, DTO, API hoặc model mới.
3. Load skill phù hợp trong `.agents/skills/` và context liên quan trong `.agents/context/`.
4. Ưu tiên bằng chứng theo thứ tự: source code -> Prisma/schema -> BRD/tài liệu dự án -> convention hiện tại -> best practice framework.
5. Giữ kiến trúc module, naming, response envelope, DTO validation và UI conventions hiện có.
6. Không duplicate component/service/DTO/API; mở rộng implementation hiện có nếu cùng trách nhiệm.
7. Không invent business rule. Gắn nhãn `VERIFIED`, `INFERRED` hoặc `UNKNOWN` và dẫn source nội bộ.
8. Không đổi schema khi chưa đánh giá migration, seed, API, frontend mapping và dữ liệu hiện hữu.
9. Không coi dữ liệu mock, số liệu demo hoặc giá trị hard-code là yêu cầu nghiệp vụ đã xác nhận.
10. Chạy validation/build phù hợp sau khi sửa; repo hiện chưa có test suite tự động.

## Workflow

User request -> Identify domain -> Discover skills -> Read context -> Inspect implementation -> Identify rules and gaps -> Identify dependencies -> Plan -> Implement -> Validate -> Review.

## Context bắt buộc

- Đọc `context/project-overview.md` và `context/architecture.md` cho thay đổi xuyên tầng.
- Đọc `context/module-map.md` để xác định frontend/backend/database/docs liên quan.
- Đọc `context/business-rules.md` trước khi đổi workflow, trạng thái, ngưỡng hoặc phép tính.
- Đọc `context/database-overview.md` trước khi đổi Prisma/query/seed.
- Đọc `context/api-conventions.md` trước khi đổi controller, DTO, response hoặc client mapping.
- Đọc `context/glossary.md` khi thuật ngữ/đơn vị chưa rõ.

## Chọn skill

- Định tuyến/audit tổng thể: `fleet-project-orientation`
- Xe, nông cụ, telemetry: `vehicle-equipment-management`
- Kế hoạch, điều xe, vận chuyển: `planning-dispatch-logistics`
- GPS, geofence, cảnh báo, SOS: `gps-monitoring-alerts`
- Nhiên liệu: `fuel-management`
- Bảo dưỡng/sửa chữa: `maintenance-repair`
- Lái xe/mobile/KPI: `driver-operations-kpi`
- Xác thực/RBAC/người dùng/đơn vị: `rbac-administration`
- Danh mục dữ liệu gốc: `master-data-catalogs`
- Dashboard/báo cáo: `dashboard-reporting`
- UI React: `react-frontend`
- API NestJS: `nestjs-backend`
- Prisma/database: `prisma-database`

## Giới hạn hiện tại

- Frontend là hybrid mock/API; không tuyên bố màn hình đã tích hợp backend nếu chưa kiểm tra từng page.
- Unit-level data isolation là yêu cầu BRD nhưng chưa được enforce nhất quán trong services.
- Các gap đã biết nằm trong `context/business-rules.md`; không tự chốt thay nghiệp vụ.
- Không sửa production code, refactor kiến trúc lớn hoặc đổi database khi task chỉ yêu cầu audit/documentation.
