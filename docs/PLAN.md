# Nâng cấp full-stack Lệnh điều xe & Vận hành

## 1. Kiến trúc dữ liệu và migration

- Giữ `TransportOrder` làm thực thể chuyến vận chuyển hiện hữu, không tạo `TransportTrip` trùng nghĩa; bổ sung ngày yêu cầu/thực hiện, giờ dự kiến kết thúc, đơn vị, số CONT/moóc, hình thức vận chuyển, điểm nhận/giao, định mức–thực tế nhiên liệu, quãng đường, người duyệt và các mốc thời gian thực tế.
- Tạo `TransportItem` quan hệ 1-N với `TransportOrder`, gồm mã vật tư, tên hàng, ĐVT, số lượng kế hoạch/thực tế, nơi nhận/giao và ghi chú. Không dùng `tonnage` cho hàng không có đơn vị khối lượng.
- Chuẩn hóa `RouteType`: `ONE_WAY`, `TWO_WAY`; migration chuyển `ROUND_TRIP` cũ thành `TWO_WAY`.
- Mở rộng `TransportStatus` thành workflow đầy đủ; dữ liệu cũ được backfill:
  - `PENDING` → `PENDING_APPROVAL`
  - `IN_TRANSIT` giữ nguyên
  - `DELIVERED` giữ nguyên
  - `DEVIATED` → `IN_TRANSIT` và giữ `isRouteDeviated=true`.
- Bổ sung `ProductionPlanItem` cho chi tiết theo ngày/ca/lô/giai đoạn/công việc/diện tích/sản lượng/loại máy/số máy/giờ máy/định mức; giữ `ProductionPlotProgress` cho số liệu thực hiện và liên kết về plan item.
- Tạo `ProductionOrder` riêng với kế hoạch, không đồng nhất với `DispatchOrder`; một production order có thể sinh nhiều lệnh điều xe.
- Mở rộng `ProductionPlan` với tuần, KLH/xí nghiệp, người lập–duyệt và trạng thái chuẩn. Backfill `PENDING` → `PENDING_APPROVAL`, `PAUSED` → `ADJUSTED` đồng thời lưu trạng thái cũ vào audit.
- Mở rộng `DispatchOrder` với nguồn lệnh, production order, thiết bị/moóc, thời gian dự kiến–thực tế, thông tin duyệt/giao/nhận/nghiệm thu. Xe và tài xế được phép rỗng khi còn `DRAFT`, nhưng bắt buộc từ bước `ASSIGNED`.
- Dùng `AgriculturalImplement` cho moóc/thiết bị đã có trong master data; giữ trường raw legacy cho số CONT, xe hoặc tài xế Excel chưa đối soát được.
- Thêm `requiredLicenseClass` vào `VehicleType`; xe chưa cấu hình yêu cầu GPLX không được coi là ứng viên hợp lệ.
- Tạo `OperationalAuditLog` dùng chung cho plan, production order, dispatch và transport, lưu actor, action, old/new JSON, lý do, thời gian. Giữ bảng audit sản xuất cũ để tương thích và backfill sang audit chung.
- Tạo `OperationConfirmation` cho phiếu cân và nghiệm thu GPS, hỗ trợ gross/tare/net, diện tích, giờ máy, trạng thái và liên kết đến lệnh/chuyến.
- Migration chỉ thêm/backfill trước rồi mới áp constraint/index; không xóa dữ liệu cũ, không dùng `prisma db push`.

## 2. Backend, workflow và API

- Áp dụng unit scope tại service:
  - `SUPER_ADMIN`, `TOAN_KLH` và dispatcher thuộc `BAN_CO_GIOI` xem toàn bộ.
  - Quản lý/dispatcher đơn vị chỉ xem dữ liệu đơn vị mình.
  - Tài xế chỉ xem và thao tác lệnh được giao.
- Workflow kế hoạch: `DRAFT → PENDING_APPROVAL → APPROVED → IN_PROGRESS → COMPLETED`; hỗ trợ `REJECTED`, `ADJUSTED`, `CANCELLED`. Điều chỉnh sau duyệt bắt buộc lý do, ghi audit và quay lại chờ duyệt.
- Workflow điều xe: `DRAFT → PENDING_APPROVAL → APPROVED → ASSIGNED → DRIVER_ACCEPTED → DEPARTED → WORKING → COMPLETED → ACCEPTED → CLOSED`; hỗ trợ từ chối/hủy đúng trạng thái.
- Workflow vận chuyển: `DRAFT → PENDING_APPROVAL → APPROVED → ASSIGNED → DRIVER_ACCEPTED → AT_PICKUP → LOADING → DEPARTED → IN_TRANSIT → AT_DELIVERY → UNLOADING → DELIVERED → ACCEPTED → COMPLETED`.
- Mọi transition được thực hiện qua endpoint nghiệp vụ riêng, kiểm tra trạng thái nguồn, quyền, xe/tài xế và ghi audit trong cùng transaction.
- Endpoint ứng viên xe/tài xế nhận khoảng thời gian, đơn vị, loại xe/công việc; chỉ trả ứng viên đạt điều kiện. Phân công lại kiểm tra:
  - Xe ở trạng thái chờ phân công, không bảo dưỡng/sửa chữa.
  - Không trùng thời gian với dispatch hoặc transport đang hiệu lực.
  - Tài xế đang làm việc, đang sẵn sàng, không trùng lịch.
  - GPLX và sức khỏe còn hạn; hạng GPLX khớp cấu hình `VehicleType`.
  - Nếu không hợp lệ trả `409` cùng danh sách lý do.
- Định mức nhiên liệu lấy từ Vehicle/VehicleType và dữ liệu kế hoạch giờ/km/ha; thiếu cấu hình hiển thị cảnh báo, không chèn số mặc định.
- Giữ `/transport-orders` là API chuẩn hiện có và sửa frontend đang gọi nhầm `/transport`.
- Bổ sung API:
  - CRUD, submit/approve/reject/start/complete/adjust/cancel cho kế hoạch; CRUD production orders.
  - Assign/accept/depart/start/complete/accept/close/cancel và available-resources cho dispatch.
  - CRUD nested transport items, workflow transport, scheduler query và thống kê theo từng ĐVT.
  - CRUD/confirm cho `OperationConfirmation`.
  - `POST /transport-orders/import/preview` và `/import/commit`.
- Đồng bộ `mobile-driver`: tài xế phải xác nhận trước khi bắt đầu; chỉ thao tác được lệnh của mình; cập nhật xe và audit trong transaction.

## 3. Import Excel có dry-run

- Frontend đọc `.xlsx` bằng thư viện hiện có, giữ số dòng và metadata merge; backend chịu trách nhiệm chuẩn hóa và kiểm tra.
- Mapping đầy đủ 16 cột trong ảnh sang trip/item; chỉ forward-fill các ô thuộc vùng merge của nhóm thông tin chuyến, không tự điền ô trống tùy ý.
- Nhóm các dòng liên tiếp theo anchor merge của ngày/giờ/xe/CONT/tài xế thành một chuyến; mọi dòng vật tư trong nhóm trở thành `TransportItem`.
- Chuẩn hóa:
  - `1 Chiều` → `ONE_WAY`
  - `2 Chiều`, `Đối lưu` → `TWO_WAY`
  - Pallet và “đã cắt moóc” lưu ở trường phụ/ghi chú, không biến thành trạng thái chuyến.
- Preview trả số chuyến, số mặt hàng, dữ liệu chuẩn hóa, cảnh báo, lỗi theo dòng và các master data chưa khớp.
- Commit chạy lại toàn bộ validation trong transaction, lưu import batch/checksum và chống nhập lại cùng file. Dòng chưa khớp xe/tài xế/moóc vẫn được bảo toàn dưới dạng `DRAFT` với giá trị legacy nhưng không thể trình duyệt/phân công cho đến khi đối soát.
- Chưa nạp dữ liệu lịch sử trong đợt này vì chỉ có ảnh; chức năng sẽ sẵn sàng để người dùng chọn file Excel gốc, preview rồi xác nhận ghi.

## 4. Giao diện React

- Giữ nguyên route/sidebar và design system; bổ sung component dùng chung cho view switcher, status timeline, scheduler, Kanban, bảng hàng hóa và phiếu in.
- Kế hoạch sản xuất:
  - Mặc định Calendar 7 ngày, thêm Table chi tiết.
  - Chỉ ba giai đoạn chính: Làm đất → Trồng mới → Thu hoạch.
  - Card hiển thị ngày, ca, lô, công việc, chỉ tiêu, loại/số máy và trạng thái thật.
- Lệnh điều xe:
  - Mặc định Kanban 4 nhóm trạng thái; Table là view phụ.
  - Card có mã lệnh, nguồn lệnh, xe, tài xế, giờ yêu cầu/xuất phát, địa điểm và cảnh báo trễ.
  - Bỏ toàn bộ GPLX, định mức dầu và thời gian duyệt hard-code.
- Lệnh vận chuyển nội bộ:
  - Đổi tên màn hình chung, không mặc định toàn module là luồng ba chặng.
  - Ba view: Scheduler theo giờ/xe, Board bốn nhóm và bảng kê chuyến.
  - Scheduler đánh dấu xung đột nhưng không hỗ trợ kéo-thả.
  - Bảng chính chỉ hiển thị số dòng hàng; modal chi tiết chứa bảng mã VT/ĐVT/SL kế hoạch/SL thực tế/nơi nhận/nơi giao.
  - Banner ba chặng chỉ xuất hiện khi `transportFlowType=LIVESTOCK_FEED_3_LEG`.
  - Thêm modal import Excel: chọn file → preview → xem lỗi/cảnh báo → commit.
- Xác nhận khối lượng & cân lấy dữ liệu API thật, bỏ KPI độ chính xác `99.98%` hard-code; hỗ trợ phiếu cân và nghiệm thu GPS.
- Phiếu điều xe/chuyến có chế độ xem và stylesheet in; “Lưu PDF” sử dụng hộp thoại in của trình duyệt.
- Mở rộng `FilterBar` bằng bộ lọc theo màn hình. Nâng `DataTable` hỗ trợ controlled/server pagination và tắt lọc client khi dữ liệu đã lọc phía server, không làm thay đổi hành vi các trang cũ.
- Các trang có loading, error, empty và refresh rõ ràng; không fallback sang dữ liệu demo khi API lỗi.

## 5. Kiểm thử và tiêu chí nghiệm thu

- Chạy Prisma validate/generate, kiểm tra SQL migration và build backend/frontend; baseline hiện tại đã build thành công.
- Kiểm tra backfill không mất ProductionPlan, DispatchOrder hoặc TransportOrder cũ.
- Test importer với fixture tái hiện ảnh: ô merge, chuyến nhiều mặt hàng, nhiều ĐVT, 1 chiều/đối lưu, dữ liệu master chưa khớp, nhập lại cùng file và rollback khi có lỗi.
- Test API cho từng transition hợp lệ/sai, duplicate code, thiếu xe/tài xế, trùng lịch, GPLX hết hạn/sai hạng, xe sửa chữa và transaction rollback.
- Test RBAC với 401/403, dữ liệu chéo đơn vị, dispatcher Ban Cơ giới, quản lý nông trường và tài xế thao tác lệnh không thuộc mình.
- Test UI cho Calendar/Table, Kanban/Table, Scheduler/Board/Table, chi tiết nhiều hàng, filter/search, import preview, phiếu in, responsive và trạng thái lỗi/rỗng.
- Không triển khai Timeline thứ ba của kế hoạch sản xuất trong đợt này; Calendar + Table là phạm vi đã chốt.
