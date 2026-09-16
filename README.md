# 🚜 THACO AGRI - Hệ Thống Quản Lý Xe Cơ Giới & Phương Tiện Vận Chuyển
> **THACO AGRI Fleet Management System (QLXCG)**  
> Nền tảng số hóa quản lý, giám sát và điều phối toàn diện hơn 3.200 phương tiện cơ giới, nông cụ, nhiên liệu và nhân sự lái xe tại các Khu liên hợp nông nghiệp (Koun Mom, Snoul, Nam Lào).

---

## 📌 Mục Lục
1. [Giới thiệu Tổng quan](#-giới-thiệu-tổng-quan)
2. [Kiến trúc & Công nghệ](#-kiến-trúc--công-nghệ)
3. [Các Phân Hệ Chức Năng Chính (Modules A - K)](#-các-phân-hệ-chức-năng-chính-modules-a---k)
4. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
5. [Hướng Dẫn Cài Đặt & Khởi Chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
6. [Tài Khoản & Phân Quyền Mặc Định](#-tài-khoản--phân-quyền-mặc-định)
7. [Quy Chuẩn Thiết Kế & Lập Trình](#-quy-chuẩn-thiết-kế--lập-trình)

---

## 📖 1. Giới thiệu Tổng quan

Hệ thống **Quản Lý Xe Cơ Giới THACO AGRI** được xây dựng nhằm mục tiêu tối ưu hóa hiệu suất vận hành máy móc thiết bị (MMTB), kiểm soát chặt chẽ nhiên liệu, chuẩn hóa quy trình điều xe, bảo dưỡng định kỳ 250 giờ máy và nâng cao năng suất của lực lượng lái xe/thợ máy tại các Đại dự án nông nghiệp quy mô lớn.

### Mục tiêu trọng tâm:
* **Quản trị tập trung:** Giám sát thời gian thực toàn bộ đội xe cơ giới (máy đào, máy ủi, máy san, máy cày, xe ben, xe bồn, xe chở người...).
* **Điều phối thông minh:** Quản lý lệnh sản xuất Nông nghiệp, Xây dựng làm đất, Vận chuyển nội bộ và Điều động công vụ.
* **Kiểm soát nhiên liệu:** Đối chiếu sai lệch giữa que đo dầu điện tử GPS, định mức kỹ thuật và thực tế cấp phát kho bãi; cảnh báo sụt dầu bất thường.
* **Bảo dưỡng chủ động (BTSC):** Tự động đếm giờ máy tích lũy, phân tầng cảnh báo Xanh / Vàng / Đỏ theo mốc 250h.
* **Minh bạch KPI:** Chấm điểm, xếp hạng thi đua lái xe dựa trên sản lượng thực tế và lịch sử vi phạm.

---

## 🛠️ 2. Kiến trúc & Công nghệ

Hệ thống được thiết kế theo mô hình kiến trúc Client-Server hiện đại, chia tách rõ ràng giữa Frontend SPA, Backend API và Mobile App dành cho tài xế:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         THACO AGRI FLEET SYSTEM                          │
├──────────────────────────┬──────────────────────────────┬────────────────┤
│       Web Frontend       │         Backend API          │   Driver App   │
│   (React 18 + Vite SPA)  │      (NestJS 10 + Node)      │  (React Native)│
├──────────────────────────┴──────────────────────────────┴────────────────┤
│                     Database: MySQL 8.0 + Prisma ORM                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 💻 Frontend (Web Dashboard & Management):
* **Core:** React 18, TypeScript, Vite SPA.
* **Routing & State:** React Router DOM v6, Zustand Store.
* **Styling & UI:** Tailwind CSS, Lucide Icons, Headless UI.
* **Data Visualization:** Recharts (Biểu đồ Donut, Cột phân bổ, Diện tích, Radar).
* **Excel & Report:** ExcelJS, SheetJS (XLSX) xử lý xuất/nhập bảng tính chuẩn UTF-8 BOM.

### ⚙️ Backend (RESTful APIs & Workers):
* **Framework:** NestJS 10, TypeScript.
* **Database Access:** Prisma ORM 5.x kết nối MySQL 8.0.
* **Bảo mật & Xác thực:** Passport JWT, Bcrypt, Roles Guard, Role-based Access Control (RBAC).
* **Validation & DTO:** class-validator, class-transformer.
* **Tài liệu API:** Swagger UI (`/api/docs`).
* **Background Workers:** Cron Jobs tự động quét lệnh trễ xuất bến, tính toán chu kỳ bảo dưỡng 250h.

### 📱 Mobile Driver App:
* **Nền tảng:** React Native (Expo) hỗ trợ tài xế nhận lệnh, bấm xuất bến/hoàn tất, báo cáo sự cố và kích hoạt tín hiệu SOS khẩn cấp.

---

## 🧩 3. Các Phân Hệ Chức Năng Chính (Modules A - K)

### 📊 Module A: Dashboard & Báo Cáo Điều Hành
* **Tổng quan hợp nhất:** Chỉ số KPI sẵn sàng xe (Availability Rate), tỷ lệ hoàn thành lệnh, cảnh báo tồn đọng.
* **Phân bổ chủng loại:** Biểu đồ cơ cấu nhóm máy công trình, máy nông nghiệp, xe vận tải, thiết bị phụ trợ.
* **Giám sát Thiết bị & Tín hiệu GPS:** Phân loại rõ ràng xe đã có GPS và xe chưa lắp GPS; hiển thị vị trí theo đơn vị phân bổ thực tế.
* **Danh sách Lệnh điều xe:** Bộ lọc theo 4 nhóm: **🌾 Nông nghiệp**, **🏗️ Xây dựng**, **🚛 Vận chuyển**, **🔧 Điều động**.

### 🛰️ Module B: Giám Sát GPS & Bản Đồ Thời Gian Thực
* **Live Tracking:** Bản đồ số trực quan theo dõi vị trí, tốc độ, mức dầu và trạng thái di chuyển của xe.
* **Geofence:** Cảnh báo xe ra khỏi ranh giới Nông trường / Xí nghiệp / Lô đất quy định.
* **Lịch sử lộ trình (Playback):** Tua lại hành trình và thời gian làm việc trong ngày.
* **Cảnh báo SOS:** Tiếp nhận và xử lý tín hiệu cứu hộ khẩn cấp từ tài xế gặp nạn/sự cố.

### 📋 Module C: Kế Hoạch Sản Xuất & Điều Động Xe
* **Lập kế hoạch tuần/tháng:** Phân bổ diện tích (Ha), khối lượng đất đào/san và định mức nhiên liệu.
* **Lập lệnh điều xe (LĐX):** Gán xe, tài xế, nông cụ đi kèm, lộ trình và mục đích công việc.
* **Phiếu cân & Nghiệm thu:** Xác nhận khối lượng vận chuyển thực tế và tích hợp biên bản nghiệm thu.

### 🚜 Module D: Quản Lý Đội Xe & Thiết Bị Nông Cụ
* **Hồ sơ xe cơ giới:** Quản lý hơn 3.200 xe (Biển số, Số khung, Số máy, Đơn vị phân bổ, Pháp nhân sở hữu).
* **Nông cụ đi kèm:** Quản lý hơn 1.000 dàn cày, bừa, xới, rải phân...
* **Cảm biến GPS & Que đo:** Quản lý mã thiết bị IMEI, SIM, nhà mạng và chu kỳ truyền dữ liệu.
* **Lịch sử biến động:** Ghi nhận nhật ký điều chuyển nội bộ giữa các Xí nghiệp / Nông trường.

### 👨‍✈️ Module E: Quản Lý Lái Xe & Đánh Giá KPI
* **Hồ sơ nhân sự lái xe:** Phân loại bằng lái (A, B1, B2, C, CE, D1, D2, chứng chỉ máy xúc, máy ủi...).
* **Hạn GPLX & Khám sức khỏe:** Cảnh báo trước 30/60/90 ngày khi giấy tờ lái xe sắp hết hạn.
* **Lịch sử vi phạm:** Ghi nhận vi phạm an toàn, chạy quá tốc độ, hao hụt nhiên liệu.
* **KPI thi đua:** Bảng xếp hạng điểm thưởng/phạt và năng suất tài xế hàng tháng.

### 🔧 Module F: Xưởng Bảo Dưỡng & Sửa Chữa (BTSC)
* **Quy trình bảo dưỡng 250 giờ:** Đếm ngược số giờ máy tích lũy; phân cấp Cảnh báo Bảo dưỡng (Xanh: 0-200h, Vàng: 200-250h, Đỏ: >250h).
* **Phiếu yêu cầu sửa chữa (Work Orders):** Quy trình từ lúc tiếp nhận, phân công thợ, thay thế phụ tùng đến khi nghiệm thu xuất xưởng.
* **Quản lý Đăng kiểm & Bảo hiểm:** Theo dõi hạn kiểm định phương tiện theo luật định.

### ⛽ Module G: Quản Lý Nhiên Liệu
* **Theo dõi que đo bình dầu:** Cập nhật dung tích dầu thực tế gửi từ cảm biến GPS.
* **Định mức tiêu hao:** Cấu hình định mức theo từng chủng loại phương tiện (Lít/giờ máy hoặc Lít/100km).
* **Đối chiếu & Báo cáo:** So sánh đối chiếu giữa Lượng dầu xuất kho vs Lượng dầu tiêu thụ que đo vs Định mức kế hoạch.
* **Cảnh báo sụt dầu:** Tự động phát hiện và cảnh báo hành vi hút trộm / rò rỉ nhiên liệu khi xe đang dừng đỗ.

### 🔔 Module H: Trung Tâm Cảnh Báo Hệ Thống
* Gom tập trung toàn bộ các cảnh báo: Sụt dầu bất thường, SOS tài xế, Quá hạn bảo dưỡng đỏ, Quá tốc độ, Hết hạn GPLX/Đăng kiểm.

### 🗂️ Module I: Danh Mục Dữ Liệu Nền (Master Data)
* Đồng bộ cây cơ cấu tổ chức: Khu liên hợp (KLH) ➔ Xí nghiệp (XN) ➔ Nông trường (NT) ➔ Lô sản xuất.
* Danh mục Chủng loại xe, Danh mục Chức danh lái xe, Danh mục Phụ tùng vật tư, Danh mục Định mức công việc.

### 🔐 Module K: Phân Quyền & Quản Trị Hệ Thống
* Quản lý người dùng, phân quyền chi tiết theo vai trò (ADMIN, BAN_CO_GIOI, DIEU_HANH_XN, QUAN_LY_DOI_XE, LAI_XE...).
* Cô lập dữ liệu theo phạm vi Đơn vị Khu liên hợp (Data Isolation).
* Nhật ký hoạt động (Audit Logs) truy vết mọi thao tác thêm/sửa/xóa trên hệ thống.

---

## 📁 4. Cấu Trúc Thư Mục Dự Án

```
Mockup/
├── .agents/                    # Bộ quy tắc, skills và ngữ cảnh AI Pair Programming
├── backend/                    # Mã nguồn Backend NestJS
│   ├── prisma/
│   │   ├── schema.prisma       # Database Schema (Models, Enums, Relations)
│   │   └── seed.ts             # Dữ liệu mẫu khởi tạo ban đầu
│   ├── scripts/                # Script bảo trì, migrate dữ liệu và import MMTB
│   └── src/
│       ├── auth/               # Module xác thực JWT & Phân quyền
│       ├── dashboard/          # Module tổng quan điều hành KPI
│       ├── dispatch-orders/    # Module quản lý lệnh điều xe & vận chuyển
│       ├── driver-management/  # Module hồ sơ lái xe, GPLX & KPI
│       ├── fuel/               # Module giám sát & đối chiếu nhiên liệu
│       ├── maintenance/        # Module quản lý bảo dưỡng 250h & phụ tùng
│       ├── operational-locations/# Module địa điểm, kho bãi & lô sản xuất
│       ├── production-plans/   # Module kế hoạch sản xuất nông nghiệp/xây dựng
│       ├── users/              # Module tài khoản & phân quyền người dùng
│       ├── vehicles/           # Module hồ sơ xe & thiết bị nông cụ
│       └── workshop/           # Module công việc xưởng BTSC
├── docs/                       # Tài liệu BRD, Excel dữ liệu MMTB gốc
├── frontend/                   # Mã nguồn Frontend React SPA
│   ├── src/
│   │   ├── api/                # Axios Client & API Services
│   │   ├── components/         # UI Components dùng chung (Modal, FilterBar, DataTable...)
│   │   ├── data/               # Dữ liệu nền & cấu hình danh mục
│   │   ├── layouts/            # Sidebar, Topbar, Header điều hướng
│   │   ├── pages/              # Màn hình chức năng theo từng Module (A - K)
│   │   ├── store/              # Zustand Global State
│   │   └── types/              # TypeScript Interfaces & Types
├── Frontend_Driver/            # Ứng dụng di động dành cho Tài xế
├── scripts/                    # Scripts tiện ích (giải phóng cổng mạng, dev tools)
├── .gitignore                  # Cấu hình bỏ qua file rác, file nhị phân & biến môi trường
├── package.json                # Root scripts điều phối toàn bộ dự án
└── README.md                   # Tài liệu hướng dẫn dự án
```

---

## 🚀 5. Hướng Dẫn Cài Đặt & Khởi Chạy

### 📋 Yêu cầu môi trường:
* **Node.js:** Phiên bản `>= 18.x` (khuyên dùng Node.js LTS 20.x).
* **Trình quản lý gói:** `npm` (hoặc `yarn` / `pnpm`).
* **Cơ sở dữ liệu:** MySQL 8.0 trở lên.

### Bước 1: Clone Repository
```bash
git clone https://github.com/Jamosu/Quan-Ly-Xe-Co-Gioi.git
cd Quan-Ly-Xe-Co-Gioi
```

### Bước 2: Cài đặt Dependencies
```bash
# Cài đặt dependencies cho Root
npm install

# Cài đặt dependencies cho Backend
cd backend && npm install

# Cài đặt dependencies cho Frontend
cd ../frontend && npm install
cd ..
```

### Bước 3: Cấu hình Biến Môi Trường (`.env`)
Tạo file `backend/.env` với cấu hình kết nối Database và JWT:
```env
NODE_ENV=development
PORT=3001
APP_NAME="THACO AGRI - QLXCG Backend"
APP_URL=http://localhost:3001

# Chuỗi kết nối MySQL
DATABASE_URL="mysql://root:Password@localhost:3306/thaco_agri_qlxcg"

# JWT Secret Key
JWT_SECRET="THACO_AGRI_KOUN_MOM_SECRET_KEY_2026_VERY_SECURE"
JWT_EXPIRES_IN="7d"

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### Bước 4: Khởi tạo Cơ sở dữ liệu Prisma
```bash
cd backend

# Tạo Prisma Client
npx prisma generate

# Đồng bộ Schema vào Database
npx prisma db push

# Nạp dữ liệu mẫu ban đầu (Seed Data)
npm run prisma:seed

cd ..
```

### Bước 5: Chạy ứng dụng (Development Mode)
Bạn có thể khởi chạy đồng thời cả Backend và Frontend từ thư mục gốc:

```bash
# Khởi chạy đồng thời Backend (Port 3001) và Frontend (Port 5173)
npm run dev:all
```

Hoặc khởi chạy từng thành phần độc lập trong 2 terminal riêng biệt:
```bash
# Terminal 1: Chạy Backend API
npm run dev:backend
# -> API chạy tại: http://localhost:3001
# -> Swagger Docs: http://localhost:3001/api/docs

# Terminal 2: Chạy Frontend React
npm run dev:frontend
# -> Ứng dụng Web mở tại: http://localhost:5173
```

---

## 🔑 6. Tài Khoản & Phân Quyền Mặc Định

Sau khi chạy lệnh `npm run prisma:seed`, hệ thống cung cấp sẵn các tài khoản demo tương ứng với các cấp quản trị:

| Tài khoản (Username) | Mật khẩu | Vai trò (Role) | Phạm vi quản lý |
| :--- | :--- | :--- | :--- |
| `admin` | `Thaco@123` | **ADMIN** | Toàn quyền quản trị hệ thống (Super Admin) |
| `bancogioi` | `Thaco@123` | **BAN_CO_GIOI** | Ban Cơ giới Tập đoàn / Khu liên hợp |
| `dieuhanh_km` | `Thaco@123` | **DIEU_HANH_KLH** | Điều hành sản xuất KLH Koun Mom |
| `quanly_xn1` | `Thaco@123` | **QUAN_LY_XN** | Quản lý Xí nghiệp Chuối DP1 |
| `driver_hung` | `Thaco@123` | **DRIVER** | Lái xe / Thợ máy cơ giới |

---

## 🎨 7. Quy Chuẩn Thiết Kế & Lập Trình

1. **Nhận diện thương hiệu THACO AGRI:**
   - Màu chủ đạo: Xanh lá đậm nông nghiệp (`#007A33` / `bg-emerald-800`), màu nhấn phụ (`#B8D83D` / vàng chanh).
   - Tất cả Biểu mẫu (Modal Popup) đồng bộ **Header xanh chữ trắng** kèm nút đóng nổi bật; hỗ trợ click ra ngoài vùng backdrop để đóng form mượt mà.
2. **Xử lý Dữ liệu Thực & Mock Data:**
   - Tuyệt đối không hard-code số liệu báo cáo nếu đã có API backend kết nối.
   - Khi xe chưa gắn cảm biến GPS thực tế, hệ thống gắn nhãn rõ ràng `Chưa gắn GPS` và lấy vị trí phân bổ theo Xí nghiệp/Nông trường.
3. **Đảm bảo tính tương thích:**
   - Toàn bộ thao tác xuất file Excel/CSV phải sử dụng mã hóa **UTF-8 kèm ký tự BOM (`\uFEFF`)** để mở trên Microsoft Excel Tiếng Việt không bị lỗi font chữ.

---
