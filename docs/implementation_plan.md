# Kế Hoạch Triển Khai Toàn Diện: Quy Trình Kế Hoạch → Lệnh Điều Xe & Kiểm Soát Xung Đột Tài Nguyên

## 1. Tổng Quan & Bối Cảnh Nghiệp Vụ

Hệ thống Quản lý Xe cơ giới THACO AGRI đang vận hành quy trình cốt lõi kết nối giữa **Kế hoạch sản xuất** và **Lệnh điều xe tác nghiệp**. Mục tiêu của kế hoạch này là hoàn thiện và chuẩn hóa toàn bộ chu trình từ Kế hoạch → Lệnh điều xe cho cả 3 phân hệ trọng điểm, đồng thời giải quyết triệt để bài toán kiểm soát trùng xe và trùng tài xế trong cùng một khung giờ, từ tầng cơ sở dữ liệu, API backend đến giao diện tương tác người dùng (UI/UX).

### 1.1. Ba Nhóm Nghiệp Vụ Kế Hoạch Cốt Lõi
1. **Nông nghiệp (`AGRICULTURE`)**:
   - Phạm vi: Làm đất (`LAM_DAT`), trồng mới (`TRONG_MOI`), chăm sóc (`CHAM_SOC`), thu hoạch (`THU_HOACH`), sau thu hoạch (`SAU_THU_HOACH`).
   - Tài nguyên: Máy kéo nông nghiệp, máy gặt, máy cày gắn kèm nông cụ (dàn bừa, chảo cày, rơ-moóc).
   - Luồng sinh lệnh: Sinh `DispatchOrder` theo lô/khoảnh, diện tích kế hoạch (ha), định mức nhiên liệu, và yêu cầu loại nông cụ đi kèm.
2. **Công trình (`CONSTRUCTION`)**:
   - Phạm vi: Đào đắp kênh mương, san lấp mặt bằng, ủi đường nội bộ nông trường, lu lèn nền hạ tầng chuồng trại bò/chuối.
   - Tài nguyên: Máy đào, máy ủi, máy san, máy lu, máy xúc lật (`MAY_DAO`, `MAY_UI`, `MAY_SAN`, `MAY_LU`, `MAY_XUC_LAT`).
   - Luồng sinh lệnh: Sinh `DispatchOrder` theo ca máy/giờ máy (machine hours), khối lượng đào đắp hoặc lý trình thi công.
3. **Vận chuyển & Logistics (`TRANSPORT` / `INTERNAL_FEED`)**:
   - Phạm vi: Vận chuyển vật tư phân bón, chuối xuất khẩu ra cảng, vận chuyển nội bộ nguyên liệu thức ăn gia súc (TMR, phụ phẩm chuối, bã bia) giữa nhà máy chế biến thức ăn và các cụm chuồng bò.
   - Hỗ trợ tuyến đối lưu (2 chiều) nhằm giảm chạy xe rỗng và tiết kiệm chi phí.
   - Luồng sinh lệnh: Sinh `TransportOrder` / `InternalFeedTrip` liên kết chặt chẽ qua khung giờ SLA nghiêm ngặt (`slaWindowStart` - `slaWindowEnd`).

---

## 2. Nghiệp Vụ Kiểm Soát Xung Đột Xe & Tài Xế (Resource Conflict Engine)

### 2.1. Quy Tắc Trùng Lịch (Overlapping Rule)
- Một chiếc xe hoặc một tài xế **chỉ được phép thực hiện 1 nhiệm vụ tại một thời điểm**.
- Khung giờ yêu cầu $[T_{start}, T_{end}]$ bị coi là xung đột với một sự kiện đã có $[E_{start}, E_{end}]$ khi và chỉ khi:
  $$\max(T_{start}, E_{start}) < \min(T_{end}, E_{end})$$
- **Buffer time (Thời gian đệm)**: Tùy theo `SchedulingPolicy` của từng Đơn vị/KLH (ví dụ 15 - 30 phút giữa 2 ca để kiểm tra xe, tiếp nhiên liệu hoặc di chuyển giữa các lô/cụm).

### 2.2. Các Loại Sự Kiện Gây Bận Tài Nguyên
1. **Lệnh điều xe / Vận chuyển đang active**: Lệnh ở trạng thái `ASSIGNED`, `DRIVER_ACCEPTED`, `DEPARTED`, `WORKING`, `IN_TRANSIT`.
2. **Bảo dưỡng định kỳ (`MAINTENANCE`)**: Xe đang trong ca bảo dưỡng 250h/500h chưa hoàn thành (`status != COMPLETED`, `cancelledAt == null`).
3. **Sửa chữa xưởng (`REPAIR`)**: Xe đang nằm xưởng sửa chữa (`RECEIVED`, `IN_REPAIR`, `WAITING_PARTS`).
4. **Tạm dừng / Giữ xe (`VEHICLE_UNAVAILABILITY`)**: Xe bị tạm giữ kỹ thuật, hỏng hóc đột xuất (`BREAKDOWN`), hoặc kiểm định (`INSPECTION`).
5. **Tài xế vắng mặt / Nghỉ phép (`DRIVER_UNAVAILABILITY`)**: Nghỉ phép năm, nghỉ ốm, nghỉ phép ca (`NGHI_PHEP_CA`), hoặc GPLX/Khám sức khỏe hết hạn.

---

## 3. Thiết Kế Trải Nghiệm Người Dùng (UI/UX): Hiển Thị & Khóa Chọn Trùng Lịch

### 3.1. Hành Vi Tại Màn Hình Phân Công Lệnh (`DispatchOrdersPage.tsx` / `AssignModal`)
Khi Điều phối viên (Dispatcher) mở modal phân công tài xế và phương tiện cho một lệnh:

1. **Tự Động Quét Lịch Thời Gian Thực (Auto Real-time Availability Scan)**:
   - Khi mở modal hoặc khi điều chỉnh `departureTime` / `plannedEndTime`, frontend tự động debounce (400ms) gọi API:
     `POST /api/availability/search` kèm khoảng thời gian dự kiến và ID lệnh hiện tại (để loại trừ chính nó nếu đang cập nhật).
2. **Quy Tắc Hiển Thị Trong Danh Sách Chọn Xe & Tài Xế (Resource Picker UI)**:
   - **Tài nguyên Sẵn sàng (Available - 🟢)**:
     - Hiển thị bình thường, có huy hiệu xanh lá "Sẵn sàng".
     - Checkbox/Radio button cho phép chọn bình thường.
   - **Tài nguyên Có Cảnh báo (Warning - 🟡)**:
     - Gần sát giờ bảo dưỡng hoặc thời gian đệm giữa 2 ca dưới mức khuyến nghị.
     - Cho phép chọn nhưng hiện cảnh báo vàng để người điều phối cân nhắc.
   - **Tài nguyên Trùng Lịch / Bận (Unavailable / Conflict - 🔴)**:
     - **Vẫn hiển thị trong danh sách** (để người dùng nắm được toàn bộ đội xe và tài xế trong đơn vị, biết rõ xe/người đang ở đâu, không bị biến mất bí ẩn).
     - **Vô hiệu hóa hoàn toàn (Disabled & Not Selectable)**: Checkbox/Row bị mờ (opacity 0.6), con trỏ chuột chuyển thành `not-allowed`, không thể click chọn.
     - **Huy hiệu trực quan màu đỏ**: Tag/Badge `Đang bận` hoặc `Xung đột lịch`.
     - **Tooltip / Popover Chi Tiết Nguyên Nhân (Conflict Details)**: Khi di chuột hoặc hover vào mục bận, hiển thị popup thông tin:
       * **Lý do bận**: Đang thực hiện Lệnh điều xe / Bảo dưỡng xưởng / Nghỉ phép.
       * **Mã công việc liên quan**: Clickable link đến Lệnh điều xe gây trùng (ví dụ: `LDX-NN-P52-I65-20260913-V1`).
       * **Khung giờ trùng**: `07:30 - 11:30 (13/09/2026)`.
       * **Khoảng thời gian giao thoa**: `Bị đè lịch 2 giờ 30 phút`.
3. **Phòng Thủ Hai Lớp (Frontend Lock + Backend 409 Conflict)**:
   - Nút **"Lưu phân công"** sẽ bị vô hiệu hóa nếu người dùng cố tình can thiệp mã DOM để chọn tài nguyên bận.
   - Backend luôn thực thi transaction kiểm tra khóa độc quyền và trả về HTTP `409 Conflict` kèm thông điệp chi tiết nếu xảy ra race condition.

---

## 4. Phân Tích & Chiến Lược Khắc Phục Các Lỗi Hiện Tại (Test Suite & Backend)

### 4.1. Phân Tích Lỗi Test Suite (`test_dispatch_v2.mjs`)
Dựa trên lần chạy kiểm thử gần nhất:
- **TC04 (Tạo Kế Hoạch)**: Bị `400 Bad Request` do DTO `ProductionPlanItemDto.stage` yêu cầu enum:
  `LAM_DAT`, `TRONG_MOI`, `CHAM_SOC`, `THU_HOACH`, `SAU_THU_HOACH`. Test script truyền giá trị cũ không khớp enum.
- **TC08 (Phê Duyệt Lệnh #432)**: Bị `400 Bad Request` với lỗi:
  *"Không thể chuyển lệnh từ APPROVED sang APPROVED"*. Lệnh #432 đã được duyệt từ test run trước đó, dẫn đến việc chuyển trạng thái không hợp lệ. Cần cơ chế chuẩn bị dữ liệu (setup/teardown) hoặc kiểm tra trạng thái trước khi duyệt.
- **TC09, TC15 (Availability Search 500 Crash)**:
  1. `repairTicket.findMany`: Cú pháp filter enum `status: { not: 'COMPLETED' }` hoặc `cancelledAt` gây lỗi Prisma Client runtime. Cần sử dụng chuẩn enum từ `@prisma/client` (`RepairStatus.COMPLETED`, `MaintenanceStatus.COMPLETED`).
  2. `workVehicleAssignment.findMany`: Model quan hệ trong Prisma và filter `operationalWorkOrder` cần được định nghĩa chính xác cú pháp `{ is: null }` và các quan hệ lồng nhau.
- **ECONNRESET / Server Restart**: Do exception unhandled trong truy vấn Prisma làm crash thread xử lý của NestJS. Cần bọc try-catch hoặc xử lý an toàn trong service.

---

## 5. Danh Mục Thay Đổi Đề Xuất (Proposed Changes)

### 5.1. Tầng Backend API & Service

#### [MODIFY] [`availability.service.ts`](file:///d:/ThacoAgri_Code/Mockup/backend/src/availability/availability.service.ts)
- Import đầy đủ các Enum từ `@prisma/client`: `RepairStatus`, `MaintenanceStatus`, `UnavailabilityStatus`, `VehicleStatus`, `DriverEmploymentStatus`, `DriverShiftStatus`.
- Chuẩn hóa các truy vấn tìm khoảng bận:
  ```typescript
  // Truy vấn phiếu bảo dưỡng đang hoạt động
  this.prisma.maintenanceRecord.findMany({
    where: {
      vehicleId: vehicle.id,
      cancelledAt: null,
      status: { not: MaintenanceStatus.COMPLETED }
    }
  });

  // Truy vấn phiếu sửa chữa xưởng
  this.prisma.repairTicket.findMany({
    where: {
      vehicleId: vehicle.id,
      cancelledAt: null,
      status: { not: RepairStatus.COMPLETED }
    }
  });
  ```
- Chuẩn hóa điều kiện lọc quan hệ `operationalWorkOrder: { is: null }` cho cả `DispatchOrder`, `TransportOrder`, và `InternalFeedTrip`.
- Đảm bảo hàm trả về `AvailabilityReason` có cấu trúc đầy đủ (`code`, `severity`, `message`, `relatedId`, `relatedCode`, `conflictInterval`) phục vụ UI tooltip.

#### [MODIFY] [`production-plans.service.ts`](file:///d:/ThacoAgri_Code/Mockup/backend/src/production-plans/production-plans.service.ts)
- Đảm bảo logic sinh lệnh điều xe hỗ trợ đầy đủ 3 loại kế hoạch:
  * `PlanType.AGRICULTURE`: Tạo `DispatchOrder` kèm nông cụ yêu cầu, loại công việc nông nghiệp.
  * `PlanType.CONSTRUCTION`: Tạo `DispatchOrder` loại máy công trình, tính theo ca máy và lý trình.
  * `PlanType.INTERNAL_TRANSPORT`: Tạo `TransportOrder` / `InternalFeedTrip` kèm địa điểm giao - nhận và cung đường.
- Cập nhật cơ chế đối soát và điều chỉnh kế hoạch (`adjust`): Tự động cập nhật lệnh tương ứng hoặc hủy lệnh thừa an toàn.

#### [MODIFY] [`production-plans.controller.ts`](file:///d:/ThacoAgri_Code/Mockup/backend/src/production-plans/production-plans.controller.ts)
- Bổ sung `@HttpCode(HttpStatus.OK)` cho các endpoint chuyển trạng thái: `submit`, `approve`, `reject`, `start`, `complete`, `adjust`, `cancel`.

#### [MODIFY] [`dispatch-orders.controller.ts`](file:///d:/ThacoAgri_Code/Mockup/backend/src/dispatch-orders/dispatch-orders.controller.ts)
- Đồng bộ `@HttpCode(HttpStatus.OK)` cho toàn bộ các endpoint chuyển trạng thái và phân công.

---

### 5.2. Tầng Frontend UI/UX

#### [MODIFY] [`DispatchOrdersPage.tsx`](file:///d:/ThacoAgri_Code/Mockup/frontend/src/pages/DispatchOrdersPage.tsx)
- Cập nhật Modal phân công (`AssignModal`):
  * Tích hợp hook/effect tự động fetch availability khi chọn giờ bắt đầu và thời lượng.
  * Hiển thị bảng chọn phương tiện và tài xế với 3 trạng thái phân minh (🟢 Sẵn sàng, 🟡 Cảnh báo, 🔴 Bận).
  * Vô hiệu hóa checkbox/radio đối với tài nguyên bị xung đột.
  * Bổ sung component inline Tooltip hiển thị: mã lệnh gây xung đột, khoảng thời gian trùng và lý do chi tiết.

#### [MODIFY] [`ProductionPlanPage.tsx`](file:///d:/ThacoAgri_Code/Mockup/frontend/src/pages/ProductionPlanPage.tsx)
- Bổ sung filter chuyển đổi linh hoạt giữa 3 loại kế hoạch: `Nông nghiệp`, `Công trình`, `Vận chuyển`.
- Tab điều hướng trực tiếp xem danh sách Lệnh điều xe đã sinh từ kế hoạch đang chọn.

---

### 5.3. Kịch Bản Kiểm Thử Tự Động (`test_dispatch_v2.mjs`)

#### [MODIFY] [`test_dispatch_v2.mjs`](file:///d:/ThacoAgri_Code/Mockup/backend/scripts/test_dispatch_v2.mjs)
- Cập nhật chuẩn hóa dữ liệu đầu vào:
  * TC04: `stage: 'LAM_DAT'` (enum chuẩn).
  * TC08: Kiểm tra trạng thái hiện tại của lệnh #432; nếu đã `APPROVED` thì reset về `PENDING_APPROVAL` hoặc tạo lệnh mới trong fixture trước khi test approve.
  * TC16: Sử dụng đúng enum `type: 'BREAKDOWN'`.
  * TC25 (Race Condition): Chuẩn bị 2 lệnh ở trạng thái `APPROVED` trước khi kích hoạt 2 request `assign` đồng thời với cùng 1 xe và 1 tài xế.

---

## 6. Kế Hoạch Xác Minh (Verification Plan)

### 6.1. Kiểm Thử Tự Động (Automated Testing)
Chạy kịch bản kiểm thử toàn diện trên backend:
```bash
node backend/scripts/test_dispatch_v2.mjs
```
**Tiêu chí nghiệm thu tự động**:
- Số lượng test case: 25 test cases.
- Tỷ lệ PASS mục tiêu: **100% (25/25 PASS)**.
- Không có lỗi HTTP 500 (Internal Server Error) hay crash kết nối (ECONNRESET).
- Chặn thành công (HTTP 409) các tình huống trùng xe, trùng tài xế, và xử lý race condition nhất quán.

### 6.2. Kiểm Thử Giao Diện Thủ Công (Manual Walkthrough Flow)
1. **Kiểm tra Kế hoạch 3 mảng**:
   - Tạo mới Kế hoạch Nông nghiệp (Làm đất) → Duyệt → Kiểm tra 13 lệnh được sinh ra.
   - Tạo mới Kế hoạch Công trình (Máy đào/ủi) → Duyệt → Kiểm tra lệnh máy công trình được sinh ra.
   - Tạo mới Kế hoạch Vận chuyển đối lưu → Duyệt → Kiểm tra lệnh vận chuyển 2 chiều.
2. **Kiểm tra Giao diện Phân công & Khóa Chọn Trùng Lịch**:
   - Mở modal phân công cho Lệnh A (khung giờ 08:00 - 12:00 ngày 15/09/2026).
   - Gán Xe X và Tài xế Y → Lưu thành công.
   - Mở modal phân công cho Lệnh B (khung giờ 09:00 - 11:00 ngày 15/09/2026 - trùng giờ).
   - **Xác nhận UI**:
     * Xe X và Tài xế Y hiển thị huy hiệu đỏ `Đang bận`.
     * Checkbox của Xe X và Tài xế Y bị **disabled**, không thể click chọn.
     * Rê chuột vào Xe X/Tài xế Y: Hiển thị tooltip *"Đang bận tại Lệnh A từ 08:00 đến 12:00"*.
3. **Kiểm tra Ca Khác Ngày / Khác Giờ (Không Xung Đột)**:
   - Đổi giờ Lệnh B sang 13:00 - 17:00 ngày 15/09/2026 (sau khi Lệnh A kết thúc).
   - **Xác nhận UI**: Xe X và Tài xế Y chuyển sang huy hiệu xanh `Sẵn sàng`, checkbox kích hoạt trở lại và cho phép chọn bình thường.
4. **Kiểm Tra Build Toàn Dự Án**:
   ```powershell
   cd backend; npm run build
   cd frontend; npm run build
   ```
   Cả backend và frontend đều phải build thành công với Exit Code 0, không có lỗi TypeScript hay cú pháp.

---

## 7. Các Điểm Cần Người Dùng Đánh Giá (User Review Required)

> [!IMPORTANT]
> 1. **Cơ chế Override phân công khẩn cấp**: Trong trường hợp khẩn cấp (thiên tai, cứu hộ SOS), vai trò Quản lý cấp cao (`SUPER_ADMIN` / `FARM_MANAGER`) có được phép ghi đè (override) để phân công xe đang bận hay luôn luôn bắt buộc phải chặn 100%? (Hiện tại hệ thống đang chặn 100% trừ khi tạo lệnh ngoại lệ có lý do).
> 2. **Thời gian đệm tối thiểu (Buffer Time)**: Thời gian nghỉ và di chuyển giữa 2 ca của cùng 1 xe hoặc 1 tài xế hiện đang mặc định là 0 phút (chỉ cần không đè giờ). Bạn có muốn kích hoạt thời gian đệm (ví dụ 15 phút hoặc 30 phút) theo chính sách của từng Nông trường không?
