# Business Rules and Evidence Status

## VERIFIED

- Chuỗi sản xuất: Làm đất -> Trồng mới -> Thu hoạch. Source: `docs/BRD_extracted.txt` đoạn [62], [110]; `ProductionStage` trong schema.
- Kế hoạch phải hỗ trợ thay đổi có lý do/audit và xác nhận. Source: BRD [113], Table 2; `ProductionAuditTrail`; `production-plans.service.ts`.
- Xí nghiệp/nông trường trực tiếp điều xe trong phạm vi kế hoạch; Ban Xe cơ giới phân bổ tổng thể và kiểm soát chất lượng. Source: BRD [70], [111], Table 14.
- Lệnh đã duyệt quá giờ xuất phát 30 phút chưa chạy được code đánh dấu trễ. Source: `dispatch-orders.service.ts`. Đây là behavior đã implement, không phải ngưỡng được BRD nêu chi tiết.
- Chu kỳ cơ sở code hiện tại là 250 giờ; RED khi còn <=20h, AMBER khi còn <=50h, còn lại GREEN. Source: `vehicles.service.ts`; `mobile-driver.service.ts`.
- Hoàn tất bảo dưỡng reset `hoursSinceLastService`, chuyển alert GREEN và có thể tạo RepairTicket khi phát hiện lỗi. Source: `maintenance.service.ts`.
- Tạo phiếu sửa chữa chuyển xe sang `SUA_CHUA`; hoàn tất sửa chữa chuyển sang `CHO_PHAN_CONG`. Source: `repairs.service.ts`.
- Cấp phát nhiên liệu ghi actual/quota/variance và trạng thái vượt định mức, đồng thời trừ tồn kho. Source: `fuel.service.ts`, `FuelDispenseTicket`.
- Bắt đầu/kết thúc chuyến cập nhật order/vehicle status; SOS tạo alert + repair ticket trong transaction. Source: `mobile-driver.service.ts`.
- Điểm KPI gồm bốn nhóm 25 điểm trong code. Source: `driver-kpi.service.ts`, `DriverKpi`.
- Workbook xác minh mã MMTB, đơn vị sử dụng, model, công suất, số khung/máy, định mức và tình trạng là các thuộc tính dữ liệu thực tế. Source: workbook các sheet `TỔNG KLH + TN`, `02. MM-KLH`, `XE & MÁY CG AGRI`, `TB CG AGRI`, `08. ĐKĐK`.

## INFERRED / IMPLEMENTED DEMO BEHAVIOR

- Frontend hiển thị nhiều KPI, GPS/fuel values và thông tin hồ sơ hard-code; chỉ coi là mock presentation. Source: `frontend/src/api/client.ts`, `frontend/src/api/mockData.ts`, pages.
- `mobile-driver.service.ts` ước tính giờ máy bằng km/30 khi kết thúc chuyến. Đây là code behavior, không thấy BRD xác nhận.
- Bonus/rank thresholds trong `driver-kpi.service.ts` là implementation hiện tại; BRD chỉ xác nhận trọng số 25% và ghi “Chưa có cách tính điểm KPI”.

## UNKNOWN — requires business confirmation

- Chu kỳ GPS 30 giây là đề xuất/yêu cầu chưa được xác nhận chính thức (BRD [87] mâu thuẫn với Table 6 diễn đạt như requirement).
- Ngưỡng vượt tốc độ và sai lệch lộ trình.
- Định nghĩa “năng suất” xe.
- Quy tắc ưu tiên xe khi nhiều đơn vị cùng nhu cầu.
- Người phê duyệt và loại minh chứng bắt buộc khi đổi kế hoạch.
- Công thức chuyển raw KPI metrics thành điểm và bonus chính thức.
- Mapping đầy đủ giữa 20 sheet workbook và model Vehicle/Implement/Catalog.
- BRD nêu các mốc nhắc 50/30/20; enum/code chỉ có GREEN/AMBER/RED và logic 50/20. Không tự thêm mốc 30.
- BRD yêu cầu phân quyền dữ liệu theo đơn vị; code hiện cho phép filter `unit` nhưng chưa enforce từ `request.user.unit` đồng bộ ở services.
- BRD yêu cầu không xóa vĩnh viễn/audit thao tác quan trọng; nhiều service hiện hard delete và chưa có AuditLog model.
