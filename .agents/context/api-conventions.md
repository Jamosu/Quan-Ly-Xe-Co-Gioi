# API Conventions

## Routing and envelope

- Base URL: `/api`; Swagger: `/api/docs`.
- Controller dùng plural resource paths (`vehicles`, `dispatch-orders`, `transport-orders`).
- Success mặc định: `{ success, statusCode, message, data, timestamp }` qua `TransformInterceptor`.
- Error: `{ success:false, statusCode, timestamp, path, method, message, error }` qua `HttpExceptionFilter`.

## DTO and validation

- Tách `create-*`, `update-*`, `*-filter` DTO.
- Dùng Swagger decorators + class-validator; filter DTO thường extends `PaginationDto`.
- Global ValidationPipe transform kiểu và whitelist field; `forbidNonWhitelisted` đang false.
- Dùng Prisma enums trong DTO khi API nhận enum canonical.

## Auth

- JWT lấy từ Bearer hoặc cookie `access_token`.
- Controller domain thường gắn `@UseGuards(JwtAuthGuard, RolesGuard)`; endpoint mutation gắn `@Roles`.
- `SUPER_ADMIN` bypass role list.
- Không nhầm role authorization với unit-level row filtering; lớp sau chưa được enforce đồng bộ.

## Service

- Throw Nest exceptions với message tiếng Việt cho not found/conflict/bad request.
- Dùng `findOne` để validate existence trước update/delete khi phù hợp.
- Dùng `$transaction` cho cập nhật nhiều aggregate.
- Giữ trạng thái vehicle đồng bộ với dispatch/maintenance/repair/mobile workflow.

## Frontend client

- Unwrap `res.data?.data` vì backend có response envelope.
- Map backend enums/shape sang UI types tại `frontend/src/api/client.ts`.
- Không sao chép hard-coded demo values (GPS, fuel, inspection, identity) thành dữ liệu thật.
- Không thêm API mới nếu endpoint tương đương đã có.
