# Architecture

## Frontend

`App.tsx` khai báo router tập trung dưới `MainLayout`. Page được nhóm theo domain; reusable UI nằm trong `components/common`, `components/data-display`, `components/filters`, `components/maps`, `components/charts`, `components/kanban`.

State dùng Zustand:

- `useAppStore`: sidebar, KLH selection, emergency count.
- `useFilterStore`: search, status, date range.

`DataTable` thực hiện client-side filter/sort/pagination/export CSV. `api/client.ts` dùng Axios, unwrap response `data`, map Prisma payload sang frontend types và hiện auto-login admin cho demo. Không sao chép auto-login sang production-facing flow.

## Backend

NestJS tổ chức theo feature module: controller -> service -> `PrismaService`. DTO tách trong `dto/`, dùng Swagger decorators và class-validator. Controller gắn `JwtAuthGuard`/`RolesGuard` theo module; `CatalogsController` hiện không có guard.

`main.ts` cấu hình:

- global prefix `/api`;
- CORS credentials;
- global `ValidationPipe` với whitelist + transform;
- `HttpExceptionFilter`;
- `LoggingInterceptor` và `TransformInterceptor`;
- Swagger `/api/docs`.

## Data layer

Prisma schema dùng enums cho role/unit/status và models quan hệ. Services dùng `findMany`, pagination, include/select, transaction và cập nhật trạng thái liên tầng. Xóa hiện chủ yếu là hard delete trong code, dù BRD yêu cầu dữ liệu quan trọng không xóa vĩnh viễn; coi đây là gap, không tự đổi.

## Cross-layer flow

React page -> reusable UI/store -> `apiService` mapper -> Axios `/api/*` -> guarded controller -> validated DTO -> service -> Prisma -> MySQL -> response envelope.

Giữ mapping/enum chuyển đổi explicit tại boundary; không truyền nhãn UI tiếng Việt trực tiếp vào Prisma enum nếu chưa có converter.
