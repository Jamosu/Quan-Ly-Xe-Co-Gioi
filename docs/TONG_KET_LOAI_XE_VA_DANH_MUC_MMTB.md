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

## III. CHUẨN HÓA 21 CHỦNG LOẠI MMTB VÀ ĐỊNH MỨC THEO 4 NHÓM

Hệ thống đã phân nhóm 3.082 thiết bị thành **4 nhóm vận hành lớn** và **21 chủng loại chuẩn hóa**:

```
                                  TỔNG QUY MÔ MMTB (3.082 Thiết bị)
                                                 │
      ┌──────────────────────┬───────────────────┴───────────────────┬──────────────────────┐
      │                      │                                       │                      │
🚜 MÁY CÔNG TRÌNH      🌾 MÁY NÔNG NGHIỆP                      🚛 XE VẬN TẢI & CÔNG VỤ  ⚙️ MÁY PHỤ TRỢ & KHÁC
  (502 thiết bị)         (284 thiết bị)                          (437 thiết bị)           (1.859 thiết bị)
  • Máy đào: 322         • Máy kéo: 277                          • Xe tải thùng: 361      • Máy phát cỏ: 721
  • Máy ủi: 121          • Máy gặt đập: 7                        • Xe tải ben: 6          • Xe máy 2 bánh: 94
  • Máy lu: 47                                                   • Xe bồn téc: 8          • Xe nâng: 41
  • Máy san: 10                                                  • Xe container: 23       • Nông cụ cày bừa: 38
  • Xúc lật: 10                                                  • Xe bán tải: 6          • Máy cưa: 30
                                                                 • Xe công vụ: 17         • Máy phát điện: 12
                                                                 • Chuyên dùng khác: 965  • Máy bơm nước: 14
```

### Bảng Chi tiết 21 Chủng loại & Định mức Kỹ thuật:

| STT | Mã phân loại | Enum Hệ thống | Phân nhóm lớn | Tên chủng loại MMTB | Hãng & Model tiêu biểu | Định mức dầu chuẩn | Quy mô (CSDL) |
|:---:|:---|:---|:---|:---|:---|:---:|:---:|
| 1 | `LX-MAY-DAO` | `MAY_DAO` | Máy công trình | Máy đào bánh xích & bánh lốp | KOBELCO SK200-08, SUMITOMO SH210, PC40, DX140 | 13.0 - 17.0 L/h | **322 xe** |
| 2 | `LX-MAY-UI` | `MAY_UI` | Máy công trình | Máy ủi san gạt mặt bằng | KOMATSU D31P, D60P, D65PX, CAT | 11.0 - 18.0 L/h | **121 xe** |
| 3 | `LX-MAY-LU` | `MAY_LU` | Máy công trình | Máy lu rung & lu tĩnh thủy lợi | BOMAG BW211D-40, DYNAPAC, LIUGONG | 10.0 - 14.0 L/h | **47 xe** |
| 4 | `LX-MAY-SAN` | `MAY_SAN` | Máy công trình | Máy san / ban nền đường nội bộ | KOMATSU GD605A-3, GD511A, CAT | 12.5 - 16.0 L/h | **10 xe** |
| 5 | `LX-MAY-XUC-LAT` | `MAY_XUC_LAT` | Máy công trình | Máy xúc lật nông sản & vật liệu | KOMATSU WA200-5, WA320, ZL50GN | 10.0 - 15.0 L/h | **10 xe** |
| 6 | `LX-MAY-KEO` | `MAY_KEO` | Máy nông nghiệp | Máy kéo nông nghiệp (Cày, bừa, xới) | JOHN DEERE 6140B, KUBOTA M7040, NEW HOLLAND | 18.5 L/ha (Cày) · 12.0 L/ha (Bừa) | **277 xe** |
| 7 | `LX-MAY-GAT-DAP` | `MAY_GAT_DAP` | Máy nông nghiệp | Máy gặt đập liên hợp bắp sinh khối | KUBOTA DC-70G, DC-93, DC-60 | 15.0 L/ha | **7 xe** |
| 8 | `LX-XE-TAI-THUNG`| `XE_TAI` | Xe vận tải | Xe ô tô tải thùng & mui bạt chở chuối | SINOTRUK Howo 4 chân 371HP, Hino 500 (8T) | 22.0 - 30.0 L/100km | **361 xe** |
| 9 | `LX-XE-BEN` | `XE_BEN` | Xe vận tải | Xe tải ben tự đổ chở đất & phân | HYUNDAI HD270 15T, Howo 3 chân | 35.0 L/100km | **6 xe** |
| 10 | `LX-XE-BON` | `XE_BON` | Xe vận tải | Xe téc / bồn nước & cấp dầu lưu động | HINO 500 15m3, DONGFENG 5m3 | 26.0 L/100km · 6.0 L/h | **8 xe** |
| 11 | `LX-XE-CONTAINER`| `XE_CONTAINER` | Xe vận tải | Xe đầu kéo Container xuất khẩu | HOWO A7 420HP, INTERNATIONAL ProStar | 38.0 L/100km | **23 xe** |
| 12 | `LX-XE-BAN-TAI` | `XE_BAN_TAI` | Xe vận tải | Xe bán tải tuần tra nông trường | FORD RANGER XLS, MAZDA BT-50 | 9.5 L/100km | **6 xe** |
| 13 | `LX-XE-CONG-VU` | `XE_CONG_VU` | Xe vận tải | Xe ô tô công vụ & đưa đón CNV | TOYOTA INNOVA, FORTUNER, THACO COUNTY | 11.0 - 18.0 L/100km | **17 xe** |
| 14 | `LX-XE-CHUYEN-DUNG` | `XE_CHUYEN_DUNG` | Xe vận tải | Phương tiện & thiết bị chuyên dùng khác| Xe hút bùn, xe ép rác, xe thang điện | 12.5 L/h | **965 xe** |
| 15 | `LX-MAY-PHAT-CO` | `MAY_PHAT_CO` | Máy phụ trợ | Máy phát cỏ cầm tay nông trường | MARUYAMA CG411, ECHO SRM-420ES | 0.8 - 1.2 L/h | **721 cái** |
| 16 | `LX-XE-MAY-2-BANH` | `XE_MAY_2_BANH` | Máy phụ trợ | Xe máy 2 bánh thu hoạch chuối | HONDA WAVE ALPHA 110cc | 2.0 L/100km | **94 xe** |
| 17 | `LX-XE-NANG` | `XE_NANG` | Máy phụ trợ | Xe nâng hạ hàng hóa xưởng chuối | KOMATSU FD30, FD35, TOYOTA, HELI | 3.5 - 4.8 L/h | **41 xe** |
| 18 | `LX-THIET-BI-NONG-CU` | `THIET_BI_NONG_CU` | Máy phụ trợ | Thiết bị & Nông cụ đính kèm máy kéo | Dàn cày 4 chảo, Dàn bừa 24 chảo, Rơ-moóc 6T | Theo máy kéo | **38 cái** |
| 19 | `LX-MAY-CUA` | `MAY_CUA` | Máy phụ trợ | Máy cưa gỗ cầm tay cắt cành | STIHL MS381, MS250, HUSQVARNA 365 | 1.2 - 1.6 L/h | **30 cái** |
| 20 | `LX-MAY-PHAT-DIEN` | `MAY_PHAT_DIEN` | Máy phụ trợ | Máy phát điện dự phòng trạm bơm | DENYO DCA-150ESK, CUMMINS 250kVA | 18.0 - 45.0 L/h | **12 máy** |
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
