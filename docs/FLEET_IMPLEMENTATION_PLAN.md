# Kế hoạch triển khai Fleet Management - KLH Koun Mom

Trạng thái: Proposed backlog  
Ngày lập: 2026-08-31  
Phạm vi: React frontend, NestJS backend, Prisma/MySQL, dữ liệu MMTB và UAT nghiệp vụ.

## 1. Mục tiêu và nguyên tắc

Mục tiêu là chuyển repository từ mockup/full-stack hybrid thành hệ thống có các vertical slice chạy xuyên suốt UI -> API -> database, giữ nguyên kiến trúc hiện tại và chỉ triển khai business rule đã có bằng chứng hoặc được nghiệp vụ xác nhận.

Nguyên tắc:

- Ưu tiên source code -> Prisma -> BRD/workbook -> project conventions.
- Không biến dữ liệu mock hoặc giá trị hard-code thành business rule.
- Không đổi schema trước khi có migration, backfill, rollback và đánh giá consumer.
- Hoàn thành từng vertical slice có build, test và tiêu chí nghiệm thu trước khi mở rộng domain khác.
- Mọi task phụ thuộc rule chưa chốt phải dừng tại decision gate tương ứng.

## 2. Quy ước backlog

- Priority: `P0` blocker/security/data integrity; `P1` core operation; `P2` reporting/optimization.
- Estimate: `S` 1-2 ngày kỹ thuật; `M` 3-5 ngày; `L` 6-10 ngày. Chưa bao gồm thời gian chờ nghiệp vụ, làm sạch dữ liệu hoặc hạ tầng ngoài repo.
- Status ban đầu của tất cả task: `TODO`.
- Skill ghi trong bảng là skill tối thiểu nên invoke; thêm `react-frontend`, `nestjs-backend`, `prisma-database` theo layer thực tế.

## 3. Decision gates - phải chốt trước khi code rule

| ID | P | Quyết định cần chốt | Deliverable / Acceptance criteria | Block |
|---|---|---|---|---|
| DG-01 | P0 | Chu kỳ và mốc cảnh báo bảo dưỡng: BRD có nhiều chu kỳ và 50/30/20, code hiện 250h và 50/20 | Biên bản rule gồm chu kỳ theo loại MMTB, màu, vượt hạn và ví dụ | E-01, E-02, C-04 |
| DG-02 | P0 | GPS refresh, offline và dừng bất thường | Chốt refresh interval, stale/offline threshold, timezone và retry | B-01, B-02, K-01 |
| DG-03 | P0 | Ngưỡng tốc độ và sai lệch tuyến | Bảng threshold theo loại xe/tuyến/đơn vị và cách acknowledge | D-05, B-03, K-01 |
| DG-04 | P0 | Định nghĩa năng suất xe | Công thức theo giờ, km, diện tích hoặc khối lượng; kỳ tổng hợp | A-01, F-01 |
| DG-05 | P0 | Ưu tiên xe khi nhiều đơn vị cùng nhu cầu | Quy tắc conflict, override, người duyệt và audit | D-03 |
| DG-06 | P0 | Phê duyệt thay đổi kế hoạch sản xuất | Actor, bằng chứng, trạng thái trước/sau và quyền từ chối | D-02 |
| DG-07 | P0 | Công thức KPI và thưởng | Raw metrics, normalization, grade, bonus, kỳ chốt và quyền điều chỉnh | I-04, F-03 |
| DG-08 | P0 | Phân quyền dữ liệu theo đơn vị | Ma trận role x action x unit; phạm vi lãnh đạo/toàn KLH | SEC-04, toàn bộ API |
| DG-09 | P0 | Retention, audit và soft delete | Loại dữ liệu không được hard delete, retention, restore, audit fields | DATA-04, SEC-06 |
| DG-10 | P0 | Workbook MMTB canonical mapping | Chọn sheet nguồn, unique key, mapping cột, dedupe và ownership | DATA-01, H-02, C-01 |

Nguồn: `.agents/context/business-rules.md`, `docs/BRD_extracted.txt`, workbook MMTB và source hiện tại.

## 4. Phase 0 - Baseline và kiểm soát chất lượng

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| FND-01 | P0 | Lập baseline build và runtime config | Root/frontend/backend package scripts | Ghi lại Node/npm/MySQL/env cần thiết; frontend và backend build sạch hoặc có danh sách lỗi tái lập | fleet-project-orientation | S |
| FND-02 | P0 | Chuẩn hóa `.env.example` và validation cấu hình | `backend/src/main.ts`, auth module, frontend API base URL | Thiếu secret/DB URL quan trọng làm startup fail rõ ràng; không còn URL production hard-code | nestjs-backend | M |
| FND-03 | P0 | Thiết lập test stack tối thiểu | Backend unit/integration; frontend component; E2E critical flow | Có lệnh test ở package scripts, một test mẫu mỗi layer và CI-friendly exit code | react-frontend, nestjs-backend | L |
| FND-04 | P0 | Thiết lập pipeline quality gate | Build, test, Prisma validate/generate, lint/format check | Một command/pipeline chạy đủ checks; không tự format toàn repo ngoài scope | fleet-project-orientation | M |
| FND-05 | P1 | Chuẩn hóa error/loading/empty state frontend | `api/client.ts`, shared components | API error không silently fallback ngoài demo mode; loading/empty/error dùng pattern chung | react-frontend | M |
| FND-06 | P1 | Lập API integration inventory theo từng page | `frontend/src/pages`, backend controllers | Bảng page -> endpoint -> trạng thái mock/partial/live -> owner; được dùng làm checklist migration | fleet-project-orientation | S |

## 5. Phase 1 - Vertical slice G: Security, RBAC và audit foundation

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| SEC-01 | P0 | Bỏ frontend auto-login admin | `frontend/src/api/client.ts`; cần login/session UI | Không gửi credential mặc định; 401 đưa về flow đăng nhập; token lifecycle rõ ràng | rbac-administration, react-frontend | M |
| SEC-02 | P0 | Loại fallback JWT secret khỏi runtime ngoài test/dev | `auth.module.ts`, `jwt.strategy.ts`, FND-02 | Production startup fail khi thiếu secret; secret không nằm trong source | rbac-administration, nestjs-backend | S |
| SEC-03 | P0 | Bảo vệ CatalogsController | `backend/src/catalogs`; DG-08 | Read/write endpoints có guard/role policy được duyệt; 401/403 tests pass | rbac-administration, master-data-catalogs | M |
| SEC-04 | P0 | Enforce unit-level row scope tập trung | Tất cả list/detail/mutation services; DG-08 | User thường không đọc/sửa cross-unit; lãnh đạo/SUPER_ADMIN theo policy; tests bao phủ | rbac-administration, nestjs-backend | L |
| SEC-05 | P0 | Rà soát object-level authorization mobile | `mobile-driver` và order ownership | Driver chỉ thao tác task/vehicle được gán; spoofed ID trả 403/404 đúng policy | driver-operations-kpi, rbac-administration | M |
| SEC-06 | P0 | Thiết kế và triển khai audit/soft-delete foundation | DG-09; schema + services | Audit ghi actor/time/action/before-after cho thao tác trọng yếu; delete policy có restore hoặc archive theo quyết định | rbac-administration, prisma-database | L |
| SEC-07 | P1 | Đồng bộ màn hình người dùng/vai trò/đơn vị với API | `pages/permissions`, `/users`, auth profile | Không còn mock cho use case đã có API; UI ẩn/disable không thay thế backend authorization | rbac-administration, react-frontend | L |

## 6. Phase 2 - Data foundation và master data

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| DATA-01 | P0 | Lập data dictionary và mapping workbook | DG-10; 20 sheet workbook -> canonical entities | Có mapping field/type/unit/required/key, danh sách conflict và rejected rows; chưa import dữ liệu | master-data-catalogs | L |
| DATA-02 | P0 | Reconcile Prisma, SQL dump và seed | `schema.prisma`, `schema_dump.sql`, `seed.ts` | Báo cáo model/column/enum lệch; chọn source canonical và remediation plan | prisma-database | M |
| DATA-03 | P0 | Đánh giá các capability chưa có model | History, shift, violation, geofence, alert, inspection, quota, weight ticket | Mỗi capability có quyết định: reuse model, thêm model, external source hoặc out of scope | prisma-database, fleet-project-orientation | M |
| DATA-04 | P0 | Thiết kế migration/backfill/rollback cho schema được duyệt | DG-09, DATA-02, DATA-03 | Migration SQL review được; backfill idempotent; rollback/recovery được mô tả và diễn tập ở DB test | prisma-database | L |
| DATA-05 | P1 | Chuẩn hóa seed deterministic | `backend/prisma/seed.ts` | Seed chạy lại có kiểm soát, không tạo duplicate, credential demo chỉ dùng dev và được ghi rõ | prisma-database | M |
| H-01 | P1 | Nối UI danh mục với Catalogs API | `pages/master-data`, `catalogs` | Units/types/jobs/plots/routes/parts/quota chỉ bật CRUD khi backend model/mapping đã được duyệt | master-data-catalogs, react-frontend | L |
| H-02 | P1 | Xây import MMTB dry-run + validation report | DATA-01, DATA-04 | Import có preview, row errors, dedupe, transaction, reconciliation counts; không import silent | master-data-catalogs, prisma-database | L |

## 7. Phase 3 - Vertical slice C: xe và thiết bị

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| C-01 | P1 | Đồng bộ hồ sơ xe với danh mục MMTB canonical | DATA-01; Vehicle DTO/service/client | Code/plate/model/unit/status/ODO/giờ máy hiển thị từ DB; không còn field giả trong mapper | vehicle-equipment-management | L |
| C-02 | P1 | Hoàn thiện create/update/detail vehicle UI | `VehiclesPage`, `/vehicles` | Form validation khớp DTO; conflict 409 hiển thị rõ; detail dùng API; role/unit enforced | vehicle-equipment-management, react-frontend | L |
| C-03 | P1 | Nối EquipmentPage với Implements API | `implements` attach/detach/statistics | List/detail/filter live; attach/detach ghi log và ngăn gắn trùng; UI refresh đúng | vehicle-equipment-management | L |
| C-04 | P1 | Hoàn thiện maintenance counter trên hồ sơ xe | DG-01; vehicle telemetry | Counter/tier đúng rule được duyệt; boundary tests; không hard-code mốc ở nhiều nơi | vehicle-equipment-management, maintenance-repair | M |
| C-05 | P1 | Thiết kế phân xe đơn vị và lịch sử điều chuyển | DG-08, DATA-03 | Có state/actor/effective date/history; không chỉ thay field unit không audit | vehicle-equipment-management, prisma-database | L |
| C-06 | P2 | Hoàn thiện GPS sensor và fleet history screens | DATA-03 | Data source được xác định; mock được bỏ hoặc màn hình gắn nhãn out-of-scope | vehicle-equipment-management, gps-monitoring-alerts | M |

## 8. Phase 4 - Vertical slice D: kế hoạch, điều xe và logistics

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| D-01 | P1 | Nối ProductionPlanPage với API | production plans/plots/settlement | CRUD/filter/progress live; stage enum map đúng; unit scope enforced | planning-dispatch-logistics | L |
| D-02 | P1 | Hoàn thiện audit-change approval flow | DG-06 | Mọi thay đổi cần lý do/minh chứng/actor/approval đúng decision; timeline xem được | planning-dispatch-logistics | L |
| D-03 | P1 | Nối DispatchOrdersPage và state transitions | DG-05; dispatch API/mobile | Create/approve/run/complete/cancel theo transition hợp lệ; ngăn vehicle/driver conflict | planning-dispatch-logistics | L |
| D-04 | P1 | Chuyển delayed-order scan thành job/command an toàn | Existing `GET check-delayed` | Không dùng GET gây mutation; job idempotent, observable và có test mốc thời gian | planning-dispatch-logistics, nestjs-backend | M |
| D-05 | P1 | Hoàn thiện transport order/return cargo/telemetry | DG-03; `transport-orders` | Route, return cargo, cost saved và deviation cập nhật live; threshold không hard-code trái quyết định | planning-dispatch-logistics, gps-monitoring-alerts | L |
| D-06 | P1 | Nối InternalTransportPage với internal-feed API | materials/trips/statistics/settlement | SLA 3 Đúng, actual weight, signature và settlement có validation/role | planning-dispatch-logistics | L |
| D-07 | P2 | Chốt và triển khai WeightTickets capability | DATA-03 | Có quyết định reuse/external/new model; UI không tiếp tục giả lập dữ liệu cân như dữ liệu thật | planning-dispatch-logistics, prisma-database | M |

## 9. Phase 5 - Vertical slice E/J: BTSC và nhiên liệu

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| E-01 | P1 | Nối lịch bảo dưỡng với API và rule chính thức | DG-01; maintenance records/upcoming | Danh sách, filter, tier, due hours live; boundary cases pass | maintenance-repair | L |
| E-02 | P1 | Hoàn thiện checklist complete và liên thông repair | maintenance complete transaction | Complete có checklist hợp lệ; defect tạo RepairTicket một lần; vehicle state/counter atomic | maintenance-repair | M |
| E-03 | P1 | Hoàn thiện nợ phụ tùng | owed-parts endpoints/UI | Create/list/resolve có actor/date/note; không mất lịch sử khi resolved | maintenance-repair, master-data-catalogs | M |
| E-04 | P1 | Nối Issue/WorkOrder/Kanban với Repairs API | repair lifecycle/cost | Status transition, technician, parts, cost, completion và vehicle state đồng bộ | maintenance-repair | L |
| E-05 | P2 | Chốt inspection/insurance persistence | DATA-03; workbook `08. ĐKĐK` | Có model/source và expiry alerts được duyệt; dữ liệu mock bị loại bỏ | maintenance-repair, prisma-database | M |
| J-01 | P1 | Nối kho bồn và phiếu cấp phát với Fuel API | warehouses/tickets | Tồn kho và ticket live; pagination/filter; đơn vị đo rõ | fuel-management | M |
| J-02 | P1 | Hoàn thiện cấp phát nhiên liệu atomic | dispense transaction | Ngăn tồn âm; variance đúng; duplicate/idempotency được xử lý; role/unit enforced | fuel-management, prisma-database | M |
| J-03 | P1 | Chốt và triển khai nguồn định mức | DATA-03, workbook mapping | Quota source/unit/version/effective date rõ; không trộn L/h, L/km, L/ha | fuel-management, master-data-catalogs | L |
| J-04 | P1 | Nối reconciliation/report với API | variance report | Tổng actual/quota/variance reconcile được tới ticket; filter kỳ/xe/đơn vị | fuel-management, dashboard-reporting | M |
| J-05 | P2 | Chốt fuel-drop/theft alert source | DATA-03 | Sensor/source/threshold/workflow acknowledge được duyệt; nếu chưa có source thì ghi out-of-scope | fuel-management, gps-monitoring-alerts | M |

## 10. Phase 6 - Vertical slice B/I/K: GPS, lái xe và cảnh báo

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| B-01 | P1 | Nối GPSRealtimePage với live-fleet API | DG-02; dashboard/vehicles | Marker, vehicle, driver, status, last update từ API; stale/offline đúng rule; không giá trị giả | gps-monitoring-alerts | L |
| B-02 | P1 | Thiết kế hành trình/playback persistence | DG-02, DATA-03 | Có schema/source, retention, sampling, query theo ngày/ca và pagination | gps-monitoring-alerts, prisma-database | L |
| B-03 | P1 | Thiết kế geofence và route deviation | DG-03, DATA-03 | Boundary/version/assignment/event được lưu; false-positive/acknowledge flow có test | gps-monitoring-alerts | L |
| I-01 | P1 | Nối DriversListPage với Users API | users/drivers | Hồ sơ live, unit scope, status/license fields chỉ hiển thị nếu có source | driver-operations-kpi | M |
| I-02 | P1 | Chốt shift/license/violation persistence | DATA-03 | Mỗi capability có model/source/workflow/owner; bỏ mock theo quyết định | driver-operations-kpi, prisma-database | L |
| I-03 | P1 | Hoàn thiện mobile trip evidence | start/finish DTO/service | Ownership check, ODO validation, ảnh/evidence storage decision, atomic state transition | driver-operations-kpi | L |
| I-04 | P1 | Triển khai KPI chính thức | DG-07 | Calculation versioned/auditable; raw inputs trace được; leaderboard month/quarter/year đúng | driver-operations-kpi | L |
| I-05 | P1 | Hoàn thiện SOS end-to-end | mobile SOS -> alert/repair/vehicle | Transaction/idempotency, notification owner và resolve workflow được test | driver-operations-kpi, gps-monitoring-alerts | M |
| K-01 | P1 | Xây alert-center contract và persistence | DG-02/DG-03/DATA-03 | Alert có type/severity/source/status/owner/ack/resolve; không duplicate domain event | gps-monitoring-alerts, prisma-database | L |
| K-02 | P1 | Nối `/canh-bao/*` với alert source | K-01 | Unresolved/history/config/stats dùng API; role/unit filter; mock được loại bỏ | gps-monitoring-alerts, react-frontend | L |

## 11. Phase 7 - Vertical slice A/F: Dashboard và báo cáo

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| A-01 | P1 | Lập metric catalog cho dashboard | DG-04; domain APIs | Mỗi KPI có định nghĩa, query, unit, period, freshness, owner và reconciliation example | dashboard-reporting | M |
| A-02 | P1 | Nối DashboardPage với overview/live APIs | A-01, B-01 | Cards/charts/map/orders/alerts live; loading/error; filter KLH/date nhất quán | dashboard-reporting, react-frontend | L |
| F-01 | P1 | Xây report endpoints theo metric catalog | A-01; productivity/fuel/maintenance/KPI/violations | Query có pagination/filter; totals reconcile với domain; không aggregate mock ở UI | dashboard-reporting, nestjs-backend | L |
| F-02 | P1 | Nối sáu report pages với API | F-01 | Tất cả report rows/charts lấy API; filter/export dùng cùng dataset | dashboard-reporting, react-frontend | L |
| F-03 | P1 | Chuẩn hóa export CSV/XLSX | Report/DataTable | UI ghi đúng định dạng; UTF-8/locale; export toàn bộ filtered data hoặc ghi rõ current page | dashboard-reporting | M |
| F-04 | P2 | Chốt cross-KLH comparison | Metric compatibility/data availability | So sánh chỉ dùng metric cùng định nghĩa/kỳ; KLH thiếu dữ liệu được biểu thị rõ | dashboard-reporting | M |
| F-05 | P2 | Thiết kế retention/archival báo cáo | DG-09 | Đáp ứng tối thiểu 2 năm theo BRD hoặc quyết định cập nhật; restore/query được kiểm thử | dashboard-reporting, prisma-database | M |

## 12. Phase 8 - Hardening, UAT và go-live readiness

| ID | P | Task cụ thể | Scope / phụ thuộc | Acceptance criteria | Skill | Est. |
|---|---|---|---|---|---|---|
| QA-01 | P0 | Unit test business-critical services | vehicles, dispatch, fuel, maintenance, mobile, KPI | Bao phủ boundary, conflict, transaction rollback và authorized path | domain + nestjs-backend | L |
| QA-02 | P0 | API integration test với MySQL test database | Critical endpoints | Seed isolated; test response envelope, validation, FK/unique, unit scope | nestjs-backend, prisma-database | L |
| QA-03 | P0 | E2E các hành trình trọng yếu | Login; vehicle; dispatch; fuel; maintenance; SOS | Mỗi journey chạy tự động, có artifact lỗi và không dùng credential production | react-frontend + domain | L |
| QA-04 | P0 | UAT theo RACI | Ban CG, nông trường, XN Bò, TT BTSC, driver | Kịch bản/expected result/sign-off/defect severity và retest được ghi nhận | fleet-project-orientation | L |
| QA-05 | P1 | Performance và volume test | Workbook-scale fleet, history, reports | P95 mục tiêu được chốt; pagination/index/query plan không suy giảm ở volume đại diện | prisma-database, nestjs-backend | M |
| QA-06 | P1 | Security regression | Auth/RBAC/unit/object scope | Không credential/secret source; matrix 401/403 pass; audit events có đủ actor/time | rbac-administration | M |
| QA-07 | P1 | Migration rehearsal và backup/restore | DATA-04 | Chạy migration trên snapshot test; reconcile counts; rollback/restore đạt RTO/RPO được duyệt | prisma-database | L |
| QA-08 | P1 | Observability và runbook | Logs, health, jobs, DB, alerts | Có health checks, structured logs/correlation ID, job failure visibility và support runbook | nestjs-backend | M |
| QA-09 | P1 | Go-live checklist | Tất cả P0/P1 được sign-off | Env/secrets/domain config/data migration/UAT/backup/rollback/owners hoàn tất | fleet-project-orientation | S |

## 13. Thứ tự milestone đề xuất

1. **M0 - Decisions & Baseline:** DG-01..10, FND-01, FND-06.
2. **M1 - Engineering & Security Foundation:** FND-02..05, SEC-01..06, DATA-01..04.
3. **M2 - Fleet Master Vertical Slice:** H-01/H-02, C-01..06.
4. **M3 - Planning & Dispatch Vertical Slice:** D-01..07.
5. **M4 - Workshop & Fuel Vertical Slice:** E-01..05, J-01..05.
6. **M5 - GPS, Driver & Alerts:** B-01..03, I-01..05, K-01..02.
7. **M6 - Dashboard & Reports:** A-01/A-02, F-01..05.
8. **M7 - Hardening & Go-live:** QA-01..09.

Không triển khai theo thứ tự “hoàn thành tất cả backend rồi tất cả frontend”. Mỗi milestone phải giao một vertical slice có UI, API, data, authorization và validation chạy xuyên suốt.

## 14. Critical path

`Decision gates` -> `Security/unit policy` -> `Data mapping/migration` -> `Vehicle master` -> `Dispatch/maintenance/fuel operations` -> `GPS/driver/alerts` -> `Metrics/reports` -> `UAT/migration rehearsal`.

Các task có thể chạy song song sau khi foundation ổn định:

- C-03 (implements) song song C-02 (vehicle UI).
- E domain song song J domain.
- B-02/B-03 song song I-01/I-02 sau DATA-03.
- Report UI chỉ bắt đầu sau khi metric catalog và report endpoint tương ứng được chốt.

## 15. Definition of Done cho mọi task code

- Rule và source được ghi rõ; không còn UNKNOWN chưa được quyết định trong implementation.
- Không duplicate endpoint/component/DTO/model hiện có.
- Role và unit scope được kiểm tra.
- DTO/schema/client mapping đồng bộ; response/error theo convention.
- Có test phù hợp và build layer liên quan pass.
- Không còn dữ liệu mock trong use case được đánh dấu live.
- Có migration/backfill/rollback nếu đổi schema.
- Tài liệu context/Swagger/runbook được cập nhật khi behavior thay đổi.

## 16. Điểm chưa ước lượng được

- Thời gian làm sạch và đối soát 20 sheet workbook.
- GPS provider, map provider, image/file storage, notification channel và hạ tầng deployment chưa có thông tin trong repo.
- Khối lượng dữ liệu production, RTO/RPO, SLA hiệu năng và quy trình release chưa được cung cấp.
- Nguồn dữ liệu chấm công/lương, cân điện tử, đăng kiểm/bảo hiểm và sensor nhiên liệu chưa được xác nhận.

Các nội dung này cần discovery riêng; không tự mặc định là đã tích hợp.
