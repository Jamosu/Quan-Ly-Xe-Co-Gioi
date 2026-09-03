# Audit phân hệ hồ sơ lái xe / thợ vận hành

Ngày audit: 02/09/2026. Phạm vi: `/lai-xe/ho-so`, `User`, `EmployeeRecord`, phương tiện, lệnh điều xe, KPI, mobile, SOS và catalog đơn vị.

## Kết luận kiến trúc

- `User` là định danh vận hành chính. Tất cả quan hệ xe, lệnh, KPI, mobile, nhiên liệu, sửa chữa và SOS đều trỏ tới `User.id`.
- `EmployeeRecord` là hồ sơ HR độc lập, không có khóa ngoại tới `User`.
- Dữ liệu hiện tại có 25 `User` role `DRIVER` và 19 `EmployeeRecord`; không có bản ghi nào trùng `User.code = EmployeeRecord.empCode`, cũng không có họ tên khớp tuyệt đối. Vì vậy không tự động ghép theo tên hoặc tạo dữ liệu giả.
- Không tạo model `DriverProfile` và không thay đổi Prisma schema trong đợt này. API hồ sơ dùng `User` làm gốc, chỉ ghép `EmployeeRecord` khi mã nhân sự khớp chắc chắn.
- Tiếp nhận hồ sơ mới tạo đồng thời `User` và `EmployeeRecord` cùng mã trong transaction; hồ sơ mới sẽ có liên kết logic ổn định hơn. Việc tạo FK chính thức cần kế hoạch đối soát/backfill dữ liệu cũ riêng.

## Ma trận dữ liệu

| Yêu cầu | Field hiện tại | Model/API nguồn | Tình trạng | Hướng xử lý |
|---|---|---|---|---|
| Mã nhân viên | `code` | `User` | Có, frontend cũ mapping sai `employeeCode` | Dùng trực tiếp `code` |
| Họ tên | `fullName` | `User` | Có | Dùng trực tiếp |
| Điện thoại | `phone` | `User` | Có, frontend cũ mapping sai `phoneNumber` | Sửa mapping |
| Tài khoản | `username`, `isActive` | `User` | Có | Chỉ trả field an toàn, không trả hash |
| Đơn vị hệ thống | `unit` | `User` | Có | Dùng enum hiện tại |
| Khu liên hợp | `complex` | `EmployeeRecord` | Có ở HR nhưng chưa liên kết dữ liệu cũ | Ghép khi `empCode = code`, nếu không hiển thị thiếu |
| Xí nghiệp/đơn vị | `enterprise`, `businessUnit` | `EmployeeRecord` | Có ở HR nhưng chưa liên kết dữ liệu cũ | Như trên |
| Nông trường/Đội | `farm`, `team` | `EmployeeRecord` | Có ở HR nhưng chưa liên kết dữ liệu cũ | Như trên |
| Chức danh | `position` | `EmployeeRecord` | Có ở HR nhưng chưa liên kết dữ liệu cũ | Như trên |
| Ngày vào công ty | `joinedDate` | `User` | Có | API trả về; frontend tính thâm niên |
| Thâm niên | Không lưu | Dẫn xuất | Có thể tính | Tính theo ngày hiện tại hoặc ngày nghỉ việc |
| Trạng thái nhân sự | `employmentStatus` | `User` | Có | Tách khỏi trạng thái ca/hồ sơ |
| Ngày/lý do nghỉ | `resignedDate`, `resignedReason` | `User` | Có | Trả trong chi tiết |
| Trạng thái ca | `currentShiftStatus` | `User` | Có | Tách riêng |
| Vị trí hiện tại | `currentLocation` | `User` | Có | Trả trong tab phương tiện/ca |
| GPLX | `licenseClass`, `licenseNumber`, `licenseExpiryDate` | `User` | Có, API danh sách cũ chưa trả đủ | API hồ sơ trả đủ |
| Nhiều chứng chỉ | Không có | — | Thiếu database | Hiển thị trạng thái thiếu; chưa tạo JSON/mock |
| Hạn sức khỏe | `healthCheckExpiryDate` | `User` | Có | Dùng dữ liệu thật |
| Lần khám/kết luận y tế | Không có | — | Thiếu database | Hiển thị trạng thái thiếu |
| Huấn luyện an toàn | Không có | — | Thiếu database | Hiển thị trạng thái thiếu |
| Xe hiện tại | `assignedVehicleId`, `defaultDriverId`, `secondaryDriverId` | `User`, `Vehicle` | Có ở nhiều quan hệ | Ưu tiên `assignedVehicle`, sau đó xe chính/phụ |
| Lịch sử phân công xe | Không có model lịch sử | — | Thiếu database | Chỉ hiển thị hoạt động xe từ lệnh thực tế, không gọi là lịch sử phân công |
| KPI 6 tháng | `DriverKpi` | `/driver-kpi`, quan hệ `User.kpis` | Có | Tái sử dụng dữ liệu, không tính lại |
| Lệnh điều xe | `DispatchOrder.driverId` | `DispatchOrder` | Có | Include tối đa 20 bản ghi gần nhất |
| Vận chuyển | `TransportOrder.driverId` | `TransportOrder` | Có | Dùng lệch tuyến thực tế nếu có |
| Chuyến nội bộ | `InternalFeedTrip.driverId` | `InternalFeedTrip` | Có | Dùng hoạt động thực tế |
| SOS | `DriverSosAlert.driverId` | Mobile/SOS | Có | Hiển thị lịch sử thực tế |
| Sự cố do tài xế báo | `RepairTicket.reportedByDriverId` | Repairs | Có | Hiển thị lịch sử thực tế |
| Vi phạm tổng hợp | Không có `DriverViolation` | — | Thiếu database | Không dùng mock của frontend |
| CCCD/email | `idCard*`, `email` | `EmployeeRecord` | Có ở HR | Chỉ trả khi liên kết mã chắc chắn |
| Ngày sinh/giới tính/quốc tịch | Không có | — | Thiếu database | Hiển thị thiếu dữ liệu |
| Địa chỉ/liên hệ khẩn cấp | Không có | — | Thiếu database | Hiển thị thiếu dữ liệu |
| Tài liệu đính kèm | Không có model | — | Thiếu database | Không giả lập |
| Nhật ký thay đổi hồ sơ | Không có `AuditLog` | — | Thiếu database | Không giả lập |
| Lương/ngân hàng | Có trong `EmployeeRecord` | Catalog HR | Nhạy cảm | Không trả ở API hồ sơ vận hành |

## API sau triển khai

- `GET /api/users/drivers/profiles`: danh sách gọn, lọc và phân trang.
- `GET /api/users/drivers/profile-options`: dữ liệu lọc và danh sách xe từ database.
- `GET /api/users/drivers/:id/profile`: hồ sơ 360° từ các quan hệ thật.
- `POST /api/users/drivers/profiles`: tiếp nhận nhân sự, validation backend, transaction `User + EmployeeRecord`.
- `PATCH /api/users/drivers/:id/profile`: cập nhật hai nguồn dữ liệu trong transaction.

## Phần cần migration ở giai đoạn sau

Chỉ thực hiện sau khi có quy tắc đối soát dữ liệu cũ: FK `EmployeeRecord.userId`, nhiều GPLX/chứng chỉ, lịch sử công tác, lịch sử phân công xe, lần khám sức khỏe, huấn luyện an toàn, tài liệu và audit log. Migration phải có dry-run, báo cáo bản ghi không ghép được và phương án rollback.
