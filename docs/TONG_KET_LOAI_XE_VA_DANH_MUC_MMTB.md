# TỔNG KẾT TRIỂN KHAI: QUẢN LÝ ĐỘI XE & DANH MỤC HỆ THỐNG CHỦNG LOẠI MMTB
**Dự án:** Hệ thống Quản trị Cơ giới Nông nghiệp THACO AGRI (Khu Liên Hợp Koun Mom)  
**Tài liệu tham chiếu:** `00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx` & `BRD_QuanLyXeCoGioi_KLH.docx`  
**Ngày cập nhật:** 31/08/2026  

---

## I. TỔNG QUAN VÀ BỐI CẢNH DỮ LIỆU THỰC TẾ

Hệ thống đã chuẩn hóa toàn bộ dữ liệu từ 20 sheet Excel thực tế của Khu Liên Hợp Koun Mom, bao quát:
- **3.082 Phương tiện, Máy móc và Nông cụ** được quản lý tập trung trong CSDL MySQL (`thaco_agri_qlxcg`).
- **Cấu trúc Đơn vị 3 cấp chuẩn hóa**:
  1. **Cấp 1 (Khu Liên Hợp)**: KLH Koun Mom (Tổng điều hành).
  2. **Cấp 2 (Khu vực / Nông trường lớn)**:
     - Khu vực Daun Penh (`DP`)
     - Khu vực Lumphat (`LP`)
     - Khu vực Andong Meas (`AD`)
  3. **Cấp 3 (Xí nghiệp / Ban chuyên trách - 19 đơn vị)**:
     - Cơ giới Thi công Daun Penh (`CGTC_DP`), Cơ giới Làm đất Daun Penh (`CGLD_DP`)
     - Xí nghiệp Chuối DP1, DP2, DP3, DP4
     - Xí nghiệp Chuối LP1, LP2
     - Xí nghiệp Bò Andong Meas (`XN_BO_AD`)
     - Trung tâm Bảo dưỡng Sửa chữa (`TT_BTSC`), Ban Cơ giới KLH, Ban Ô tô Xe máy, Ban Điện Nước, Tổng kho, v.v.

---

## II. CHUẨN HÓA 23 THUỘC TÍNH MASTER DATA MMTB

Toàn bộ 23 trường thông tin theo đúng yêu cầu đã được ánh xạ đồng bộ xuyên suốt từ Database -> Backend DTO -> Frontend UI:

| STT | Tên trường trong Excel | Tên thuộc tính CSDL / API | Kiểu dữ liệu | Ý nghĩa & Quy chuẩn nghiệp vụ |
|:---:|:---|:---|:---:|:---|
| 1 | **TT** | `stt` / auto-increment | Number | Số thứ tự định danh bản ghi |
| 2 | **Mã MMTB mới** | `code` / `internalCode` | String (Indexed) | Mã định danh duy nhất của MMTB (VD: `MMTB-DP-001`, `KEO-01`) |
| 3 | **Mã MMTB cũ** | `oldCode` | String | Mã quản lý lịch sử trước khi chuẩn hóa |
| 4 | **Mã Bravo** | `bravoCode` | String (Indexed) | Mã hạch toán trên hệ thống ERP Bravo của THACO AGRI |
| 5 | **Biển số xe** | `plate` / `plateNumber` | String (Nullable) | Biển kiểm soát (đối với xe cơ giới đường bộ) |
| 6 | **Tình trạng mua** | `purchaseCondition` | String | Hình thức mua sắm (Mua mới 100%, Mua cũ, Điều chuyển nội bộ) |
| 7 | **Tên MMTB** | `name` / `brandModel` | String | Tên mô tả phương tiện / máy móc kèm chủng loại |
| 8 | **Đơn vị sử dụng** | `assignedUnitCode` / `teamUnit` | String (Indexed) | Xí nghiệp / Ban trực tiếp quản lý và vận hành (Cấp 3) |
| 9 | **Ngày phân bổ** | `allocationDate` | DateTime / String | Ngày bàn giao đưa vào vận hành tại đơn vị |
| 10 | **Tình trạng Hỏng** | `conditionStatus` / `status` | String / Enum | Tình trạng kỹ thuật (Bình thường, Hư hỏng, Đang bảo dưỡng) |
| 11 | **Lịch sử điều chuyển** | `transferHistory` | Text | Nhật ký chuyển giao giữa các Xí nghiệp / Khu vực |
| 12 | **NHÃN HIỆU** | `manufacturer` | String | Thương hiệu chế tạo (Kobelco, Komatsu, John Deere, Kubota, Howo...) |
| 13 | **XUẤT XỨ** | `origin` | String | Quốc gia sản xuất (Nhật Bản, Mỹ, Hàn Quốc, Trung Quốc, Việt Nam) |
| 14 | **NĂM SX** | `manufactureYear` | Number | Năm xuất xưởng của thiết bị |
| 15 | **MODEL** | `modelName` | String | Ký hiệu mã kiểu loại nhà sản xuất (VD: `SK200-08`, `6140B`, `D31P`) |
| 16 | **CÔNG SUẤT** | `powerHp` | String | Công suất động cơ (HP / kW) hoặc dung tích gàu / xi-lanh |
| 17 | **Số khung** | `frameNumber` | String | Số nhận dạng khung xe (Chassis Number / VIN) |
| 18 | **Số máy** | `engineNumber` | String | Số sê-ri khối động cơ (Engine Serial Number) |
| 19 | **Định mức nhiên liệu** | `fuelQuotaRate` & `fuelQuotaUnit` | Float & Enum | Suất tiêu hao dầu: `L_PER_HOUR` (L/h), `L_PER_KM` (L/100km), `L_PER_HA` (L/ha) |
| 20 | **Dung tích thùng dầu** | `fuelTankCapacity` | Float | Thể tích chứa nhiên liệu của bình dầu (Lít) |
| 21 | **NHÀ CUNG CẤP** | `supplier` | String | Đơn vị bán buôn / cung ứng MMTB |
| 22 | **Ghi chú** | `notes` | Text | Các lưu ý đặc thù về vận hành, hư hỏng hoặc đăng ký |
| 23 | **Hình ảnh MMTB** | `imageUrl` | String | Đường dẫn ảnh chụp thực tế phục vụ nhận diện |

---

| 21 | `LX-MAY-BOM` | `MAY_BOM` | Máy phụ trợ | Máy bơm nước chống ngập & cấp tưới | HYUNDAI ENGINE, Bơm dã chiến D200 | 4.5 - 8.0 L/h | **14 máy** |
| **TỔNG CỘNG** | **21 Chủng loại** | **Toàn bộ** | **4 Nhóm lớn** | **Danh mục MMTB KLH Koun Mom** | **Thương hiệu hàng đầu** | **Quy chuẩn kỹ thuật** | **3.082 Thiết bị** |

---

## IV. TỔNG HỢP CÁC THÀNH PHẦN CODE ĐÃ TRIỂN KHAI

### 1. Database Layer (Prisma & MySQL)
- **`backend/prisma/schema.prisma`**:
  - Mở rộng model `Vehicle` với đầy đủ 23 cột trường thông tin.
  - Bổ sung `FuelQuotaUnit` enum (`L_PER_HOUR`, `L_PER_KM`, `L_PER_HA`).
  - Indexing: `code`, `plate`, `bravoCode`, `assignedUnitCode`, `category`.
  - Thực thi thành công `prisma db push` lên database `thaco_agri_qlxcg`.
- **`backend/prisma/import_mmtb.py`**:
  - Script ETL tự động đọc 20 sheet Excel `00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx`.
  - Nhập thành công 3.082 bản ghi (0 lỗi).

### 2. Backend NestJS Layer
- **`backend/src/vehicles/dto/create-vehicle.dto.ts` & `update-vehicle.dto.ts`**:
  - Khai báo đầy đủ 23 thuộc tính với Decorator `class-validator` và Swagger annotations.
- **`backend/src/vehicles/dto/vehicle-filter.dto.ts`**:
  - Hỗ trợ lọc theo `regionCode` (`DP`, `LP`, `AD`), `assignedUnitCode`, `category`, `status`, `bravoCode`, `search`.
- **`backend/src/vehicles/vehicles.service.ts`**:
  - Tìm kiếm đa trường (Full-text keyword matching), phân trang và sắp xếp chuẩn hóa.

### 3. Frontend React Layer
- **`frontend/src/types/index.ts`**:
  - Cập nhật interface `VehicleProfile` với toàn bộ 23 thuộc tính.
- **`frontend/src/api/client.ts`**:
  - Mapper chuyển đổi backend response thành UI model hoàn chỉnh, hỗ trợ 21 chủng loại và 4 nhóm lớn.
- **`frontend/src/pages/fleet/VehiclesPage.tsx` (Quản lý Hồ sơ Đội xe)**:
  - 4 Thẻ KPI động: Tổng MMTB, Máy công trình & nông nghiệp, Xe vận tải, Máy móc phụ trợ.
  - Bộ lọc đa chiều 2 tầng: Khu vực 3 cấp + 4 Nhóm + Dropdown Chủng loại + Dropdown Đơn vị + Dropdown Trạng thái + Tìm kiếm tức thì.
  - Bảng Master Data hiển thị mã, biển số, mã Bravo, chủng loại, model, nhãn hiệu, đơn vị, định mức.
  - Modal Hồ sơ Chi tiết 23 trường (4 khối thông tin chuyên biệt).
  - Tích hợp tính năng **Xuất Excel (`.xlsx`)** dữ liệu lọc trực tiếp từ trình duyệt.
- **`frontend/src/pages/master-data/VehicleTypesPage.tsx` (Danh mục 21 Chủng loại MMTB)**:
  - 4 Thẻ KPI quy mô.
  - Bộ lọc nhóm tabs + Dropdown chủng loại + Dropdown Hãng SX + Dropdown Đơn vị định mức + Ô tìm kiếm + Nút Xóa lọc.
  - Bảng dữ liệu 21 chủng loại chuẩn hóa (Đã xử lý dứt điểm lỗi lặp cột STT, tỷ lệ cột cân đối, không bị tràn viền).
  - Cấu hình `pageSize={25}` hiển thị toàn bộ 21 dòng không bị ngắt trang.
  - Modal Chi tiết Chủng loại tích hợp nút chuyển hướng sang Hồ sơ Đội xe.
  - Tính năng **Xuất Danh Mục Excel (`.xlsx`)**.

---

## V. KẾT QUẢ KIỂM THỬ VÀ TRẠNG THÁI BUILD

- **Backend NestJS**: `npm run build` ➔ **Thành công (0 lỗi)**.
- **Frontend React/Vite**: `npm run build` ➔ **Thành công (0 lỗi, 2301 modules transformed)**.
- **Đường dẫn trải nghiệm**:
  - 🚜 **Hồ sơ Đội xe & MMTB**: [http://localhost:5173/doi-xe/ho-so-xe](http://localhost:5173/doi-xe/ho-so-xe)
  - 📑 **Danh mục 21 Chủng loại MMTB**: [http://localhost:5173/danh-muc/loai-xe](http://localhost:5173/danh-muc/loai-xe)
