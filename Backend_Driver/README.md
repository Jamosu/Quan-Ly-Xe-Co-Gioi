# THACO AGRI Driver Backend

Backend NestJS riêng cho ứng dụng tài xế. Dịch vụ dùng chung MySQL và bảng `users` với backend quản trị hiện tại, vì vậy tài khoản được tạo tại `/phan-quyen/nguoi-dung` có thể đăng nhập ngay khi `role=DRIVER` và `isActive=true`.

## Cấu hình và chạy

1. Khi đặt cạnh thư mục `backend`, dịch vụ tự đọc `../backend/.env` để dùng chung `DATABASE_URL` và `JWT_SECRET`.
2. Nếu triển khai riêng, sao chép `.env.example` thành `.env` rồi đặt hai giá trị này giống backend quản trị.
3. Chạy migration để thêm phiên đăng nhập mobile, nhật ký idempotency và phiên bản lệnh.
4. Khởi động dịch vụ ở cổng mặc định `3002`.

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Swagger: `http://localhost:3002/api/docs`.

Điện thoại thật trong cùng mạng truy cập dịch vụ qua `http://10.23.3.8:3002/api` tại thời điểm bàn giao. Dịch vụ bind `0.0.0.0`; nếu không kết nối được, kiểm tra IP LAN hiện tại và quy tắc firewall cho TCP `3002`.

## API chính

- `POST /api/auth/mobile-login`
- `POST /api/auth/mobile-refresh`
- `GET /api/auth/profile`
- `POST /api/mobile/sync/push`
- `GET /api/mobile/sync/pull?since=...`
- `POST /api/mobile/sync/attachments`

`push` xử lý sự kiện SOS/sự cố trước, chống ghi trùng bằng `eventId` UUID và trả về bản ghi xung đột để thiết bị giữ nguyên dữ liệu đã nhập.
