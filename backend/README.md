# 🚜 THACO AGRI - BACKEND QUẢN LÝ XE CƠ GIỚI & PTVC (KLH KOUN MOM)

Mã nguồn Backend Doanh nghiệp được xây dựng bằng **NestJS v10.x + Prisma ORM v5.x + MySQL 8.0**, phục vụ số hóa toàn diện công tác quản lý **168 Xe Cơ Giới & PTVC, 142 Nông Cụ**, Kế hoạch tác nghiệp làm đất, Logistics vận tải đối lưu Chuối/NPK, Vận chuyển thức ăn TMR & Kiểm soát SLA 3 Đúng tại Khu Liên Hợp Koun Mom (THACO AGRI).

---

## 🛠️ 1. TECH STACK & KIẾN TRÚC

- **Framework**: NestJS v10 (TypeScript, Modular MVC)
- **Database & ORM**: MySQL 8.0 + Prisma ORM v5
- **Authentication**: Passport-JWT (Bearer Token & Cookie Proxy) + Bcrypt
- **RBAC**: Role-based Access Control (`SUPER_ADMIN`, `DISPATCHER`, `FARM_MANAGER`, `WORKSHOP_MANAGER`, `FUEL_STOREKEEPER`, `DRIVER`)
- **Validation**: `class-validator`, `class-transformer`
- **Documentation**: Swagger OpenAPI 3.0 tại `/api/docs`

---

## 🚀 2. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY (QUICK START)

### Bước 1: Cài đặt Dependencies
```bash
cd backend
npm install
```

### Bước 2: Cấu hình Môi trường (.env)
Đảm bảo file `.env` chứa thông tin kết nối MySQL:
```env
PORT=3001
DATABASE_URL="mysql://root:password@localhost:3306/thaco_agri_qlxcg?schema=public"
JWT_SECRET="THACO_AGRI_KOUN_MOM_SECRET_KEY_2026_VERY_SECURE"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
```

### Bước 3: Đồng bộ Database & Seed Dữ Liệu
```bash
# Sinh Prisma Client
npx prisma generate

# Đẩy Schema vào Database MySQL
npx prisma db push

# Chạy Seeding toàn bộ dữ liệu mẫu thực tế
npx prisma db seed
```

### Bước 4: Khởi chạy Máy chủ API
```bash
# Chế độ phát triển (Hot Reload)
npm run dev

# Hoặc chế độ Production
npm run build
npm run start:prod
```

- **Swagger Docs:** `http://localhost:3001/api/docs`
- **API Base URL:** `http://localhost:3001/api`

---

## 🔑 3. TÀI KHOẢN MẪU DÙNG THỬ (SEED ACCOUNTS)

| Tên Đăng Nhập | Mật Khẩu | Họ Và Tên | Vai Trò (Role) | Đơn Vị (Unit) |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `123456` | Quản Trị Viên Hệ Thống | `SUPER_ADMIN` | `TOAN_KLH` |
| `dispatcher.dat` | `123456` | Trần Quốc Đạt | `DISPATCHER` | `BAN_CO_GIOI` |
| `manager.im` | `123456` | Đào Văn Im | `FARM_MANAGER` | `NT1` (Nông trường 1) |
| `workshop.tu` | `123456` | Nguyễn Ngọc Anh Tú | `WORKSHOP_MANAGER` | `TT_BTSC` |
| `fuel.long` | `123456` | Phạm Hoàng Long | `FUEL_STOREKEEPER` | `BAN_CO_GIOI` |
| `driver.trong` | `123456` | Trần Đình Trọng | `DRIVER` | `NT1` |
| `driver.vu` | `123456` | Nguyễn Thái Vũ | `DRIVER` | `NT2` |
| `driver.hung` | `123456` | Lê Văn Hùng | `DRIVER` | `XN_BO` |
| `driver.nam` | `123456` | Võ Hoài Nam | `DRIVER` | `BAN_CO_GIOI` |

---

## 📌 4. DANH MỤC CÁC ENDPOINT REST API CHÍNH

### A. Xác Thực & Người Dùng (`/api/auth`, `/api/users`)
- `POST /api/auth/login`: Đăng nhập, cấp JWT token & cookie.
- `GET /api/auth/profile`: Lấy thông tin tài khoản hiện tại.
- `GET /api/users`: Danh sách nhân sự nội bộ (lọc theo role/unit).
- `GET /api/users/drivers`: Danh sách tài xế cơ giới.

### B. Quản Lý 168 Xe Cơ Giới (`/api/vehicles`)
- `GET /api/vehicles`: Danh sách 168 xe (lọc theo chủng loại, đơn vị, trạng thái, cảnh báo 250h).
- `GET /api/vehicles/statistics`: Thống kê tỷ lệ sẵn sàng kỹ thuật %, số xe đang chạy/dừng/bảo dưỡng.
- `GET /api/vehicles/:id`: Chi tiết lý lịch hồ sơ xe, lịch sử gắn nông cụ, bảo dưỡng, sửa chữa.
- `PATCH /api/vehicles/:id/telemetry`: Cập nhật ODO, giờ máy, GPS (tự động tính mốc 250h Xanh/Vàng/Đỏ).

### C. Quản Lý 142 Nông Cụ (`/api/implements`)
- `GET /api/implements`: Danh mục dàn cày, dàn bừa, dàn xới, dàn rải phân, rơ-moóc...
- `POST /api/implements/:id/attach`: Gắn nông cụ vào máy kéo (ghi nhận độ mòn chảo cày `startWearMm`).
- `POST /api/implements/:id/detach`: Tháo nông cụ về kho (ghi nhận độ mòn `endWearMm` & đánh giá bảo trì).

### D. Kế Hoạch Tác Nghiệp & Lô Thửa (`/api/production-plans`)
- `GET /api/production-plans`: Danh sách kế hoạch theo chuỗi Làm đất → Trồng mới → Thu hoạch.
- `PATCH /api/production-plans/:id/plots/:plotId`: Cập nhật tiến độ cày bừa tại lô, giờ máy & dầu tiêu hao.
- `POST /api/production-plans/:id/audit-change`: Lưu vết Audit Trail thay đổi kế hoạch kèm lý do & người duyệt.
- `POST /api/production-plans/:id/settle`: Quyết toán tài chính định mức giờ máy & dầu.

### E. Lệnh Điều Xe Công Tác (`/api/dispatch-orders`)
- `POST /api/dispatch-orders`: Tạo lệnh điều xe mới.
- `PATCH /api/dispatch-orders/:id/approve`: Quản đốc/Tổ trưởng duyệt lệnh.
- `GET /api/dispatch-orders/check-delayed`: Quét và cảnh báo các xe trễ giờ xuất phát.

### F. Logistics Vận Tải Đối Lưu Chuối/NPK (`/api/transport-orders`)
- `POST /api/transport-orders`: Tạo vận đơn xuất khẩu chuối ra cảng Sihanoukville / Cửa khẩu.
- `PATCH /api/transport-orders/:id/return-cargo`: Nhận hàng đối lưu chiều về (22T Phân bón NPK/Thùng carton, tính chi phí tiết kiệm).
- `PATCH /api/transport-orders/:id/telemetry`: Giám sát tốc độ tối đa & cảnh báo lệch lộ trình.

### G. Vận Chuyển Thức Ăn Bò & SLA 3 Đúng (`/api/internal-feed`)
- `POST /api/internal-feed/materials`: Khai báo nhanh nguyên liệu thức ăn & phụ phẩm mới.
- `GET /api/internal-feed/trips`: Danh sách chuyến vận chuyển TMR/Phụ phẩm.
- `PATCH /api/internal-feed/trips/:id/complete`: Xác nhận giao nhận thực tế, kiểm tra SLA Chuẩn 3 Đúng (Loại - Lượng - Thời Gian) & ký nhận điện tử.

### H. Quản Lý Kho Bồn Dầu DO (`/api/fuel`)
- `GET /api/fuel/warehouses`: Tồn kho bồn tĩnh 45.000L & xe bồn lưu động 5.000L.
- `POST /api/fuel/dispense`: Cấp phát dầu qua mã QR, đối chiếu định mức theo giờ máy, cảnh báo vượt định mức.
- `GET /api/fuel/variance-report`: Báo cáo đối soát chênh lệch tiêu hao nhiên liệu.

### I. Bảo Dưỡng 250h & Xưởng Sửa Chữa (`/api/maintenance`, `/api/repairs`)
- `GET /api/maintenance/upcoming-schedule`: Lịch nhắc 3 mốc cảnh báo Xanh / Vàng (<50h) / Đỏ (<20h).
- `POST /api/maintenance/records/:id/complete`: Hoàn thành 12 checklist (**Tự động liên thông tạo Phiếu Sửa Chữa #SC** khi phát hiện hư hỏng).
- `POST /api/maintenance/owed-parts`: Ghi chú nợ phụ tùng lọc tinh/nhớt đợt sau.
- `POST /api/repairs`: Tiếp nhận sửa chữa (Tiểu tu, Trung tu, Đại tu, Cứu hộ SOS).

### J. KPI Năng Suất & Driver App (`/api/driver-kpi`, `/api/mobile/driver`)
- `POST /api/driver-kpi/calculate`: Tính điểm tự động 4 tiêu chí 25% (Chuyến, Km, Giờ máy, Tiết kiệm dầu), xếp loại Hạng A/B/C/D.
- `GET /api/mobile/driver/assigned-tasks`: Lấy danh sách nhiệm vụ được gán cho tài xế.
- `POST /api/mobile/driver/start-trip` & `POST /api/mobile/driver/finish-trip`: Nhập ODO bắt đầu/kết thúc kèm ảnh xác thực.
- `POST /api/mobile/driver/sos-alert`: Báo sự cố khẩn cấp 1 chạm kèm tọa độ GPS và ảnh hiện trường.
