# 📌 CẤU TRÚC DỰ ÁN HỆ THỐNG QUẢN LÝ XE CƠ GIỚI & PTVC (THACO AGRI)

> **Hệ thống Số hóa & Điều hành Quản lý Xe cơ giới & Phương tiện Vận chuyển - KLH Koun Mom & Toàn THACO AGRI**  
> *Kiến trúc: Monorepo Fullstack (React 18 SPA + Vite + Tailwind CSS | NestJS 10 Modular + Prisma ORM + MySQL 8.0 | Legacy Static Mockup | Data Scripts & Docs)*

---

## 🌟 1. TỔNG QUAN KIẾN TRÚC TOÀN HỆ THỐNG

Dự án được tổ chức theo cấu trúc monorepo phân tầng rõ ràng, bao gồm 4 phân vùng chính:
1. **`frontend/`**: Ứng dụng Web Single Page Application (React 18, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, Recharts, Lucide Icons) hỗ trợ 11 phân hệ nghiệp vụ hoàn chỉnh (A -> K).
2. **`backend/`**: Máy chủ API RESTful (NestJS 10, Prisma ORM, MySQL, Passport JWT, Class Validator, Swagger UI) với 14+ module nghiệp vụ, bảo mật RBAC và tích hợp Mobile Driver API.
3. **`legacy_mockup/`**: Bộ giao diện Mockup tĩnh HTML5/CSS3/JS gốc dùng để demo nhanh và kết xuất tài liệu PDF/Báo cáo kỹ thuật.
4. **`database/` & `docs/`**: Schema dump CSDL SQL, bộ script Python sinh dữ liệu mẫu giả lập thực tế, tài liệu phân tích nghiệp vụ BRD và Brand Assets.

---

## 📂 2. SƠ ĐỒ CÂY THƯ MỤC TỔNG THỂ (PROJECT TREE)

```plaintext
Mockup/
├── 📄 package.json                    # Script điều phối npm root (dev, dev:all, build, seed)
├── 📄 export_mockup_pdf.js            # Puppeteer script kết xuất Mockup ra file PDF hoàn chỉnh
├── 📄 generate_image_only_pdf.js      # Puppeteer script kết xuất Mockup dạng hình ảnh vào PDF
│
├── 📁 frontend/                       # [FRONTEND] React 18 + Vite + Tailwind SPA
│   ├── 📄 index.html                  # HTML entry point (Meta tags, fonts, root container)
│   ├── 📄 package.json                # Dependencies: React 18, Vite 5, Tailwind, Recharts, Zustand...
│   ├── 📄 tsconfig.json               # Cấu hình TypeScript cho React App
│   ├── 📄 vite.config.ts              # Cấu hình Vite bundler & alias
│   ├── 📄 tailwind.config.js          # Hệ thống màu thương hiệu THACO AGRI (Primary Green #005A34...)
│   ├── 📄 postcss.config.js           # PostCSS plugins
│   ├── 📁 public/                     # Static assets (Favicons, images, logos)
│   └── 📁 src/                        # Mã nguồn ứng dụng Frontend
│       ├── 📄 App.tsx                 # Khai báo React Router cho 11 Phân hệ (70+ Routes)
│       ├── 📄 main.tsx                # Điểm khởi chạy React DOM
│       ├── 📄 index.css               # CSS Custom, Tailwind directives, Scrollbars & Glassmorphism
│       ├── 📁 api/                    # Tầng giao tiếp API & Mock Data
│       │   ├── 📄 client.ts           # Axios Client instance (Base URL, Interceptors, Bearer Token)
│       │   └── 📄 mockData.ts         # Dữ liệu MockData phong phú cho 11 Phân hệ
│       ├── 📁 components/             # Reusable UI Components
│       │   ├── 📁 charts/             # Biểu đồ Recharts (FleetCharts.tsx)
│       │   ├── 📁 common/             # Badge, Button, Modal, Tabs
│       │   ├── 📁 data-display/       # DataTable, KPIGrid, StatCard
│       │   ├── 📁 filters/            # FilterBar (Bộ lọc Nông trường, Đội xe, Thời gian)
│       │   ├── 📁 kanban/             # KanbanBoard (Điều phối xe & Xưởng sửa chữa)
│       │   └── 📁 maps/               # GPSMapViewer (Bản đồ số định vị xe realtime)
│       ├── 📁 layouts/                # Cấu trúc khung giao diện
│       │   ├── 📄 MainLayout.tsx      # Layout chính bao bọc Topbar, Sidebar, Breadcrumb & Content
│       │   ├── 📄 Sidebar.tsx         # Menu điều hướng 11 Module phân cấp A -> K
│       │   ├── 📄 Topbar.tsx          # Thanh công cụ trên (Đơn vị KLH, Thông báo SOS, User Profile)
│       │   └── 📄 Breadcrumb.tsx      # Điều hướng đường dẫn trang hiện tại
│       ├── 📁 pages/                  # 11 Phân hệ Nghiệp vụ Chính (70+ Trang)
│       │   ├── 📁 dashboard/          # [Module A] Dashboard điều hành tổng quan
│       │   │   └── 📄 DashboardPage.tsx
│       │   ├── 📁 gps/                # [Module B] Giám sát GPS & Bản đồ số
│       │   │   ├── 📄 GPSRealtimePage.tsx        # Giám sát trực tuyến thời gian thực
│       │   │   ├── 📄 GPSPlaybackPage.tsx        # Xem lại hành trình lịch sử & tốc độ
│       │   │   ├── 📄 GeofencePage.tsx           # Quản lý hàng rào địa lý (Geofencing)
│       │   │   ├── 📄 SpeedAlertPage.tsx          # Cảnh báo vi phạm tốc độ & ra khỏi vùng
│       │   │   └── 📄 OfflineLogsPage.tsx        # Nhật ký mất sóng / Offline thiết bị GPS
│       │   ├── 📁 fleet/              # [Module C] Quản lý Đội xe & Nông cụ
│       │   │   ├── 📄 VehiclesPage.tsx           # Hồ sơ 9 chủng loại xe cơ giới
│       │   │   ├── 📄 EquipmentPage.tsx          # Quản lý dàn cày, bừa, xới, rơ-moóc
│       │   │   ├── 📄 UnitAssignmentPage.tsx     # Phân bổ xe về Nông trường / Xí nghiệp
│       │   │   ├── 📄 GPSSensorsPage.tsx         # Thiết bị GPS & cảm biến mức dầu
│       │   │   └── 📄 FleetHistoryPage.tsx       # Lịch sử điều chuyển, luân chuyển xe
│       │   ├── 📁 dispatch/           # [Module D] Lệnh Điều xe & Vận hành
│       │   │   ├── 📄 ProductionPlanPage.tsx     # Kế hoạch sản xuất nông nghiệp (Làm đất/Trồng mới)
│       │   │   ├── 📄 DispatchOrdersPage.tsx     # Điều lệnh xe cơ giới (Cày bừa, xới đất)
│       │   │   ├── 📄 InternalTransportPage.tsx  # Lệnh vận chuyển chuối / gia súc / cám
│       │   │   └── 📄 WeightTicketsPage.tsx      # Xác nhận phiếu cân & nghiệm thu khối lượng
│       │   ├── 📁 drivers/            # [Module I] Quản lý Đội ngũ Lái xe
│       │   │   ├── 📄 DriversListPage.tsx        # Hồ sơ lái xe, phân hạng bằng lái
│       │   │   ├── 📄 ShiftAssignmentPage.tsx    # Phân ca vận hành & gán lái xe theo máy
│       │   │   ├── 📄 LicenseExpiryPage.tsx      # Quản lý & cảnh báo hạn Giấy phép lái xe
│       │   │   ├── 📄 DriverViolationsPage.tsx   # Lịch sử vi phạm (Tốc độ, cung đường, thời gian)
│       │   │   └── 📄 DriverKPIRankingPage.tsx   # Bảng xếp hạng & chấm điểm KPI lái xe
│       │   ├── 📁 workshop/           # [Module E] Xưởng Bảo trì Sửa chữa (BTSC)
│       │   │   ├── 📄 MaintenancePlanPage.tsx    # Kế hoạch bảo dưỡng định kỳ (250h, 500h, 1000h)
│       │   │   ├── 📄 IssueReportsPage.tsx       # Yêu cầu báo hỏng & tiếp nhận sửa chữa
│       │   │   ├── 📄 WorkOrdersPage.tsx         # Lệnh sửa chữa & quyết toán vật tư phụ tùng
│       │   │   ├── 📄 WorkshopKanbanPage.tsx     # Kanban theo dõi tiến độ cầu nâng / vị trí sửa
│       │   │   └── 📄 InspectionInsurancePage.tsx# Quản lý hạn đăng kiểm & bảo hiểm cơ giới
│       │   ├── 📁 fuel/               # [Module J] Quản lý Cấp phát & Tiêu hao Nhiên liệu
│       │   │   ├── 📄 FuelVouchersPage.tsx       # Phiếu cấp phát dầu Diesel / Xăng
│       │   │   ├── 📄 FuelQuotasPage.tsx         # Định mức tiêu hao kỹ thuật (lít/ha, lít/h, lít/km)
│       │   │   ├── 📄 FuelReconciliationPage.tsx # Đối chiếu thực tế cấp vs Cảm biến GPS vs Định mức
│       │   │   ├── 📄 FuelTanksInventoryPage.tsx # Quản lý bồn chứa trung tâm & téc dầu lưu động
│       │   │   └── 📄 FuelDropAlertsPage.tsx     # Cảnh báo sụt dầu bất thường / Nghi vấn trộm dầu
│       │   ├── 📁 alerts/             # [Module K] Trung tâm Cảnh báo & Xử lý SOS
│       │   │   ├── 📄 UnresolvedAlertsPage.tsx   # Cảnh báo chưa xử lý (Khẩn cấp, Cảnh báo, Nhắc nhở)
│       │   │   ├── 📄 AlertHistoryPage.tsx       # Lịch sử & nhật ký đóng xử lý cảnh báo
│       │   │   ├── 📄 AlertThresholdsPage.tsx    # Cấu hình ngưỡng cảnh báo hệ thống
│       │   │   └── 📄 ViolationStatsPage.tsx     # Thống kê phân tích sự cố theo thời gian/đơn vị
│       │   ├── 📁 reports/            # [Module F] Báo cáo Quản trị & Thống kê
│       │   │   ├── 📄 VehicleProductivityReportPage.tsx # Báo cáo năng suất vận hành cơ giới
│       │   │   ├── 📄 TripViolationReportPage.tsx      # Báo cáo hành trình & vi phạm cung đường
│       │   │   ├── 📄 DriverKPIReportPage.tsx          # Báo cáo hiệu quả & năng suất lái xe
│       │   │   ├── 📄 FuelConsumptionReportPage.tsx    # Báo cáo tiêu hao & đối soát nhiên liệu
│       │   │   ├── 📄 MaintenanceCostReportPage.tsx    # Báo cáo chi phí BTSC & vật tư phụ tùng
│       │   │   └── 📄 CrossKLHReportPage.tsx           # Báo cáo so sánh chéo giữa các Nông trường/KLH
│       │   ├── 📁 master-data/        # [Module H] Quản lý Danh mục Dữ liệu gốc
│       │   │   ├── 📄 UnitsKLHPage.tsx           # Danh mục Đơn vị, Nông trường, Xí nghiệp, Đội xe
│       │   │   ├── 📄 VehicleTypesPage.tsx       # Danh mục 9 chủng loại xe & thông số kỹ thuật
│       │   │   ├── 📄 JobTypesPage.tsx           # Danh mục Loại công việc (Làm đất, Trồng, Vận chuyển)
│       │   │   ├── 📄 PlotsRoutesPage.tsx        # Danh mục Lô, Thửa, Cung đường nội bộ KLH
│       │   │   ├── 📄 SparePartsPage.tsx         # Danh mục Vật tư, Phụ tùng & Đơn giá xuất xưởng
│       │   │   └── 📄 TechnicalQuotasPage.tsx    # Bảng định mức kỹ thuật tiêu chuẩn
│       │   └── 📁 permissions/        # [Module G] Phân quyền & Quản trị Hệ thống
│       │       ├── 📄 UsersManagementPage.tsx    # Quản lý tài khoản cán bộ & lái xe
│       │       ├── 📄 RolesMatrixPage.tsx        # Ma trận phân quyền 6 Nhóm vai trò (RBAC)
│       │       ├── 📄 UnitPermissionsPage.tsx    # Phân quyền truy cập phạm vi Đơn vị/Nông trường
│       │       └── 📄 AuditLogsPage.tsx          # Nhật ký thao tác người dùng (Audit Trail)
│       ├── 📁 store/                  # Quản lý Global State (Zustand)
│       │   ├── 📄 useAppStore.ts      # State người dùng, vai trò, thông báo, đơn vị đang chọn
│       │   └── 📄 useFilterStore.ts   # State bộ lọc toàn cục (Khoảng ngày, KLH, Nông trường, Đội xe)
│       ├── 📁 types/                  # TypeScript Types / Interfaces
│       │   └── 📄 index.ts            # Định nghĩa kiểu dữ liệu toàn bộ thực thể hệ thống
│       └── 📁 utils/                  # Helper functions
│           └── 📄 filterUtils.ts      # Tiện ích lọc & định dạng dữ liệu
│
├── 📁 backend/                        # [BACKEND] NestJS 10 + Prisma ORM + MySQL Server
│   ├── 📄 package.json                # Dependencies: @nestjs/common, @prisma/client, passport, bcrypt...
│   ├── 📄 tsconfig.json               # Cấu hình TypeScript Backend
│   ├── 📄 nest-cli.json               # Cấu hình Nest CLI
│   ├── 📄 .env                        # File cấu hình biến môi trường (PORT, DATABASE_URL, JWT_SECRET)
│   ├── 📄 .env.example                # File mẫu biến môi trường
│   ├── 📄 README.md                   # Tài liệu hướng dẫn cài đặt & vận hành Backend
│   ├── 📁 prisma/                     # Tầng CSDL & Prisma ORM
│   │   ├── 📄 schema.prisma           # Định nghĩa 25+ Tables, 15+ Enums, Relations & Indexes
│   │   └── 📄 seed.ts                 # Script seed dữ liệu mẫu ban đầu qua Prisma Client
│   ├── 📁 scripts/                    # Scripts Python/Node hỗ trợ sinh dữ liệu & kiểm thử
│   │   ├── 📄 seed_qlxcg_mysql_data.py # Script nạp dữ liệu trực tiếp vào MySQL
│   │   ├── 📄 test_api_endpoints.py    # Test tự động các REST API Endpoints
│   │   ├── 📄 inspect_db.py            # Kiểm tra trạng thái và đếm bản ghi CSDL
│   │   ├── 📄 check_admin.py           # Kiểm tra tài khoản Quản trị viên
│   │   └── 📄 ... (các script hỗ trợ tạo dữ liệu phân hệ A -> K)
│   └── 📁 src/                        # Mã nguồn NestJS Server
│       ├── 📄 main.ts                 # Bootstrap server, cấu hình Swagger (/api/docs), CORS, ValidationPipe
│       ├── 📄 app.module.ts           # Root Module tổng hợp toàn bộ các Feature Modules
│       ├── 📁 prisma/                 # Prisma Service kết nối CSDL toàn cục
│       │   ├── 📄 prisma.module.ts
│       │   └── 📄 prisma.service.ts
│       ├── 📁 common/                 # Tầng dùng chung (Guards, Decorators, Interceptors, Filters)
│       │   ├── 📁 decorators/         # @Public(), @Roles()
│       │   ├── 📁 dto/                # ApiResponseDto, PaginationDto
│       │   ├── 📁 filters/            # HttpExceptionFilter chuẩn hóa lỗi trả về
│       │   ├── 📁 guards/             # JwtAuthGuard, RolesGuard
│       │   └── 📁 interceptors/       # LoggingInterceptor, TransformInterceptor
│       ├── 📁 auth/                   # [Module Auth] Đăng nhập, cấp phát JWT Token & Phân quyền
│       │   ├── 📄 auth.controller.ts
│       │   ├── 📄 auth.module.ts
│       │   ├── 📄 auth.service.ts
│       │   ├── 📁 dto/                # LoginDto, RegisterDto
│       │   └── 📁 strategies/         # JwtStrategy
│       ├── 📁 users/                  # [Module G] Quản lý Người dùng & Cán bộ
│       │   ├── 📄 users.controller.ts
│       │   ├── 📄 users.module.ts
│       │   ├── 📄 users.service.ts
│       │   └── 📁 dto/                # CreateUserDto, UpdateUserDto
│       ├── 📁 vehicles/               # [Module C] Quản lý Xe cơ giới & Cảm biến GPS
│       │   ├── 📄 vehicles.controller.ts
│       │   ├── 📄 vehicles.module.ts
│       │   ├── 📄 vehicles.service.ts
│       │   └── 📁 dto/                # CreateVehicleDto, UpdateVehicleDto, UpdateTelemetryDto...
│       ├── 📁 implements/             # [Module C] Quản lý Nông cụ (Dàn cày, bừa, xới...)
│       │   ├── 📄 implements.controller.ts
│       │   ├── 📄 implements.module.ts
│       │   ├── 📄 implements.service.ts
│       │   └── 📁 dto/                # CreateImplementDto, AttachImplementDto, DetachImplementDto...
│       ├── 📁 production-plans/       # [Module D] Kế hoạch Sản xuất Nông nghiệp & Lô thửa
│       │   ├── 📄 production-plans.controller.ts
│       │   ├── 📄 production-plans.module.ts
│       │   ├── 📄 production-plans.service.ts
│       │   └── 📁 dto/                # CreatePlanDto, CreatePlotDto, UpdatePlotProgressDto...
│       ├── 📁 dispatch-orders/        # [Module D] Lệnh Điều xe Cơ giới Nội bộ
│       │   ├── 📄 dispatch-orders.controller.ts
│       │   ├── 📄 dispatch-orders.module.ts
│       │   ├── 📄 dispatch-orders.service.ts
│       │   └── 📁 dto/                # CreateDispatchOrderDto, UpdateDispatchOrderDto...
│       ├── 📁 transport/              # [Module D] Lệnh Vận chuyển & Hàng Chiều về
│       │   ├── 📄 transport.controller.ts
│       │   ├── 📄 transport.module.ts
│       │   ├── 📄 transport.service.ts
│       │   └── 📁 dto/                # CreateTransportOrderDto, UpdateReturnCargoDto...
│       ├── 📁 internal-feed/          # [Module D] Vận chuyển Thức ăn Chăn nuôi / Xí nghiệp Bò
│       │   ├── 📄 internal-feed.controller.ts
│       │   ├── 📄 internal-feed.module.ts
│       │   ├── 📄 internal-feed.service.ts
│       │   └── 📁 dto/                # CreateFeedTripDto, CompleteFeedTripDto...
│       ├── 📁 fuel/                   # [Module J] Cấp phát Nhiên liệu, Bồn chứa & Tiêu hao
│       │   ├── 📄 fuel.controller.ts
│       │   ├── 📄 fuel.module.ts
│       │   ├── 📄 fuel.service.ts
│       │   └── 📁 dto/                # DispenseFuelDto, CreateWarehouseDto...
│       ├── 📁 maintenance/            # [Module E] Kế hoạch & Phiếu Bảo dưỡng Định kỳ
│       │   ├── 📄 maintenance.controller.ts
│       │   ├── 📄 maintenance.module.ts
│       │   ├── 📄 maintenance.service.ts
│       │   └── 📁 dto/                # CreateMaintenanceDto, CompleteMaintenanceDto...
│       ├── 📁 repairs/                # [Module E] Phiếu Sửa chữa Xưởng & Quyết toán Vật tư
│       │   ├── 📄 repairs.controller.ts
│       │   ├── 📄 repairs.module.ts
│       │   ├── 📄 repairs.service.ts
│       │   └── 📁 dto/                # CreateRepairDto, UpdateRepairDto...
│       ├── 📁 driver-kpi/             # [Module I] Chấm điểm & Xếp hạng KPI Lái xe
│       │   ├── 📄 driver-kpi.controller.ts
│       │   ├── 📄 driver-kpi.module.ts
│       │   ├── 📄 driver-kpi.service.ts
│       │   └── 📁 dto/                # CalculateKpiDto, KpiFilterDto...
│       ├── 📁 dashboard/              # [Module A] Tổng hợp Thống kê & Số liệu Điều hành
│       │   ├── 📄 dashboard.controller.ts
│       │   ├── 📄 dashboard.module.ts
│       │   └── 📄 dashboard.service.ts
│       ├── 📁 mobile-driver/          # [Mobile API] Endpoint dành riêng cho App Lái xe (Bắt đầu/Kết thúc chuyến, SOS)
│       │   ├── 📄 mobile-driver.controller.ts
│       │   ├── 📄 mobile-driver.module.ts
│       │   ├── 📄 mobile-driver.service.ts
│       │   └── 📁 dto/                # StartTripDto, FinishTripDto, CreateSosAlertDto...
│       └── 📁 catalogs/               # [Module H] Danh mục Dữ liệu gốc dùng chung
│           ├── 📄 catalogs.controller.ts
│           ├── 📄 catalogs.module.ts
│           └── 📄 catalogs.service.ts
│
├── 📁 database/                       # [DATABASE] SQL Dumps & Python Data Generators
│   ├── 📄 schema_dump.sql             # Bản trích xuất cấu trúc CSDL MySQL đầy đủ
│   ├── 📄 temp_seed.sql               # Dữ liệu SQL seed ban đầu
│   └── 📁 python_scripts/             # Bộ script Python xử lý dữ liệu tự động
│       ├── 📄 seed_qlxcg_mysql_data.py
│       ├── 📄 generate_data_ab.py     # Sinh dữ liệu Module A, B
│       ├── 📄 generate_data_cd.py     # Sinh dữ liệu Module C, D
│       ├── 📄 generate_data_efg.py    # Sinh dữ liệu Module E, F, G
│       ├── 📄 generate_data_hijk.py   # Sinh dữ liệu Module H, I, J, K
│       ├── 📄 module_structure.py     # Định nghĩa metadata cấu trúc 11 module
│       └── 📄 mockup_helpers.py       # Helper functions cho mockup
│
├── 📁 legacy_mockup/                  # [LEGACY MOCKUP] Giao diện HTML5/CSS tĩnh & PDF Exporter
│   ├── 📄 index.html                  # Giao diện Demo tĩnh tổng hợp
│   ├── 📄 app.js                      # Điều hướng và render trang tĩnh
│   ├── 📄 page_data.js                # Dữ liệu tĩnh JSON lớn cho mockup
│   ├── 📄 styles.css                  # CSS hệ thống mockup tĩnh
│   ├── 📄 modules.css                 # CSS mở rộng cho các module
│   ├── 📄 THACO_AGRI_Mockup_He_Thong_Quan_Ly_Xe_Co_Gioi.pdf # File PDF Mockup hoàn chỉnh
│   ├── 📄 THACO_AGRI_Mockup_Hinh_Anh.pdf                    # File PDF Mockup hình ảnh
│   ├── 📁 pdf_export/                 # Mẫu HTML phục vụ render PDF tự động
│   └── 📁 pages/                      # 11 Thư mục HTML tĩnh tương ứng 11 Phân hệ (A -> K)
│       ├── 📁 A-dashboard/
│       ├── 📁 B-giam-sat-gps/
│       ├── 📁 C-doi-xe/
│       ├── 📁 D-lenh-dieu-xe/
│       ├── 📁 E-xuong-btsc/
│       ├── 📁 F-bao-cao/
│       ├── 📁 G-phan-quyen/
│       ├── 📁 H-danh-muc/
│       ├── 📁 I-lai-xe/
│       ├── 📁 J-nhien-lieu/
│       └── 📁 K-canh-bao/
│
└── 📁 docs/                           # [DOCS] Tài liệu Nghiệp vụ, Kỹ thuật & Thiết kế
    ├── 📄 BRD_QuanLyXeCoGioi_KLH.docx # Tài liệu Phân tích Nghiệp vụ chi tiết (Word gốc)
    ├── 📄 BRD_extracted.txt           # Nội dung text trích xuất từ BRD
    ├── 📄 TECH_STACK_TEMPLATE.md      # Bộ quy chuẩn kiến trúc Fullstack chuẩn hóa
    ├── 📁 Logo Thaco Agri/            # Bộ vector SVG logo thương hiệu THACO AGRI
    └── 📁 superpowers/                # Specs & Kế hoạch triển khai Frontend Redesign
```

---

## 🧭 3. BẢNG DANH MỤC 11 PHÂN HỆ NGHIỆP VỤ (MODULES A -> K)

Hệ thống được thiết kế đồng bộ từ **Sidebar UI -> Router Frontend -> Service Backend -> Bảng Database**:

| Mã Module | Tên Phân hệ Nghiệp vụ | Route Frontend | Module Backend | Các chức năng / Trang chính |
| :---: | :--- | :--- | :--- | :--- |
| **A** | **Dashboard Vận hành** | `/dashboard` | `DashboardModule` | KPI tổng quát, Biểu đồ tình trạng xe, Nhiên liệu, Cảnh báo khẩn cấp |
| **B** | **Giám sát GPS & Vùng** | `/gps/*` | `VehiclesModule` | Giám sát Realtime, Xem lại hành trình, Geofence, Cảnh báo tốc độ, Offline log |
| **C** | **Quản lý Đội xe & Thiết bị** | `/doi-xe/*` | `VehiclesModule`, `ImplementsModule` | Hồ sơ 9 loại xe, Dàn cày/nông cụ, Phân xe đơn vị, Cảm biến GPS, Lịch sử xe |
| **D** | **Lệnh Điều xe & Vận hành** | `/lenh-dieu-xe/*` | `DispatchOrdersModule`, `ProductionPlansModule`, `TransportModule`, `InternalFeedModule` | Kế hoạch SX, Lệnh cày bừa, Lệnh vận chuyển cám/chuối/bò, Phiếu cân |
| **I** | **Quản lý Lái xe & KPI** | `/lai-xe/*` | `DriverKpiModule`, `MobileDriverModule` | Hồ sơ tài xế, Phân ca làm việc, Quản lý GPLX, Nhật ký vi phạm, BXH KPI |
| **E** | **Xưởng Bảo dưỡng Sửa chữa** | `/xuong-btsc/*` | `MaintenanceModule`, `RepairsModule` | Kế hoạch bảo dưỡng giờ máy, Tiếp nhận báo hỏng, Lệnh sửa chữa, Kanban xưởng, Đăng kiểm |
| **J** | **Quản lý Nhiên liệu** | `/nhien-lieu/*` | `FuelModule` | Phiếu cấp phát xăng/dầu, Định mức kỹ thuật, Đối chiếu sai lệch, Tồn kho bồn chứa, Cảnh báo rút trộm dầu |
| **K** | **Trung tâm Cảnh báo & SOS** | `/canh-bao/*` | `DashboardModule`, `MobileDriverModule` | Cảnh báo chưa xử lý, Lịch sử cảnh báo, Thiết lập ngưỡng vi phạm, Thống kê sự cố |
| **F** | **Báo cáo & Thống kê** | `/bao-cao/*` | `DashboardModule`, `DriverKpiModule` | Năng suất cơ giới, Vi phạm hành trình, Hiệu quả lái xe, Tiêu hao nhiên liệu, Chi phí BTSC, So sánh liên KLH |
| **H** | **Danh mục Dữ liệu gốc** | `/danh-muc/*` | `CatalogsModule` | Đơn vị/KLH, 9 Chủng loại xe, Loại công việc, Lô thửa & Cung đường, Vật tư phụ tùng, Bảng định mức |
| **G** | **Phân quyền & Quản trị** | `/phan-quyen/*` | `AuthModule`, `UsersModule` | Quản lý Người dùng, Ma trận vai trò (RBAC), Phân quyền theo Đơn vị, Nhật ký Audit Logs |

---

## 🗄️ 4. KIẾN TRÚC CƠ SỞ DỮ LIỆU (DATABASE SCHEMA HIGHLIGHTS)

Hệ thống sử dụng **MySQL 8.0** kết hợp **Prisma ORM** với hơn **25 bảng quan hệ chính**:
- **Tài khoản & Phân quyền**: `User`, `Role` (SUPER_ADMIN, DISPATCHER, FARM_MANAGER, WORKSHOP_MANAGER, FUEL_STOREKEEPER, DRIVER), `Unit` (NT1, NT2, XN_BO, TT_BTSC, BAN_CO_GIOI, TOAN_KLH).
- **Phương tiện & Thiết bị**: `Vehicle` (mã số, biển số, loại xe, giờ máy, ODO, trạng thái), `Implement` (dàn cày, dàn bừa, rơ-moóc gắn kèm), `VehicleHistory`.
- **Kế hoạch & Điều động**: `ProductionPlan`, `Plot`, `DispatchOrder` (trạng thái lệnh, diện tích khoán, giờ làm việc), `TransportOrder`, `InternalFeedTrip`.
- **Tài xế & Vận hành**: `DriverProfile`, `DriverShift`, `DriverViolation`, `DriverKPIRecord`.
- **Bảo dưỡng & Sửa chữa**: `MaintenancePlan`, `MaintenanceOrder`, `RepairOrder`, `OwedPart` (nợ phụ tùng), `PeriodicInspection`.
- **Nhiên liệu**: `FuelQuota`, `FuelDispenseRecord`, `FuelWarehouse` (bồn cố định, téc lưu động), `FuelTheftAlert`.
- **Danh mục & Cấu hình**: `MasterUnit`, `MasterVehicleType`, `MasterJobType`, `MasterPlotRoute`, `MasterSparePart`, `AlertThreshold`, `AuditLog`.

---

## ⚙️ 5. HƯỚNG DẪN LỆNH THAO TÁC (CLI SCRIPTS)

| Lệnh npm (tại thư mục gốc) | Chức năng thực thi |
| :--- | :--- |
| `npm run dev` | Khởi chạy máy chủ Frontend Vite (`http://localhost:5173`) |
| `npm run dev:backend` | Khởi chạy máy chủ NestJS API (`http://localhost:3000` & Swagger tại `/api/docs`) |
| `npm run dev:all` | Khởi chạy song song cả Backend và Frontend |
| `npm run build` | Build đóng gói cả Frontend (`dist/`) và Backend (`dist/`) |
| `npm run db:generate` | Tạo Prisma Client từ file `schema.prisma` |
| `npm run db:seed` | Nạp dữ liệu mẫu ban đầu vào CSDL MySQL |
| `node export_mockup_pdf.js` | Xuất toàn bộ Mockup hệ thống ra file PDF phục vụ nghiệm thu / báo cáo |
