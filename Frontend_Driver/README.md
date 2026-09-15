# THACO AGRI Driver

Ứng dụng Android dành riêng cho tài xế, xây dựng bằng React Native + Expo SDK 57 và TypeScript.

## Tính năng chính

- Đăng nhập bằng tài khoản có vai trò `DRIVER` từ hệ thống Quản lý người dùng.
- Offline-first với SQLite: xem lệnh, ghi nhận thao tác, GPS và ảnh khi mất mạng.
- Hàng đợi đồng bộ có UUID chống ghi trùng; SOS và sự cố được ưu tiên trước.
- Tự đồng bộ khi có mạng, khi ứng dụng trở lại foreground và qua background task.
- Lưu JWT/refresh token trong SecureStore; xử lý xung đột mà không xóa dữ liệu tài xế.

## Cấu hình

Sao chép `.env.example` thành `.env` và thay IP backend nếu địa chỉ Wi-Fi/LAN của máy chủ thay đổi. Bản APK hiện tại trỏ tới `http://10.23.3.8:3002/api`; máy ảo Android dùng `http://10.0.2.2:3002/api`.

## Chạy và kiểm tra

```bash
npm install
npm run typecheck
npm start
```

Mã native Android được sinh bằng `npx expo prebuild --platform android`. APK kiểm thử nằm trong thư mục `releases`.

## Cài trên điện thoại thật

1. Cho điện thoại và máy chạy backend vào cùng mạng Wi-Fi/LAN.
2. Chạy `npm run dev` trong `Backend_Driver`; dịch vụ phải lắng nghe cổng `3002`.
3. Chép `releases/THACO-AGRI-Driver.apk` sang điện thoại và cho phép cài ứng dụng từ nguồn đã chọn, hoặc bật USB debugging rồi chạy:

```bash
adb install -r releases/THACO-AGRI-Driver.apk
```

4. Đăng nhập bằng tài khoản đang hoạt động có vai trò `DRIVER` tại màn hình Quản lý người dùng.

Nếu IP máy chạy backend không còn là `10.23.3.8`, sửa `EXPO_PUBLIC_API_BASE_URL` trong `.env` rồi build lại APK release.
