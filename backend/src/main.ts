import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie Parser
  app.use(cookieParser());

  // CORS Configuration
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('THACO AGRI - Hệ Thống Số Hóa Quản Lý Xe Cơ Giới & PTVC')
    .setDescription(
      `Bộ tài liệu REST API chuẩn OpenAPI 3.0 phục vụ quản lý 168 Xe Cơ Giới & PTVC, 142 Nông cụ, Kế hoạch tác nghiệp làm đất, Logistics vận tải đối lưu Chuối/NPK, Vận chuyển thức ăn TMR & Kiểm soát SLA 3 Đúng tại Khu Liên Hợp Koun Mom (THACO AGRI).`,
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Nhập JWT Bearer Token lấy từ endpoint /api/auth/login',
    })
    .addTag('Auth - Xác Thực & Phân Quyền', 'Đăng nhập, đăng ký và thông tin hồ sơ tài khoản')
    .addTag('Users - Quản Lý Nhân Sự & Phân Quyền', 'Danh mục nhân sự, quản đốc, tài xế và KTV')
    .addTag('Vehicles - Quản Lý 168 Xe Cơ Giới & PTVC', 'Danh mục xe, GPS telemetry, cảnh báo bảo dưỡng 250h')
    .addTag('Agricultural Implements - Quản Lý 142 Nông Cụ Phụ Trợ', 'Danh mục nông cụ, tháo lắp máy kéo, hao mòn chảo cày')
    .addTag('Production Plans - Kế Hoạch Tác Nghiệp & Quyết Toán Lô Thửa', 'Kế hoạch làm đất vụ chuối, tiến độ lô thửa, Audit Trail')
    .addTag('Dispatch Orders - Lệnh Điều Xe Công Tác Số Hóa', 'Lệnh điều xe, duyệt lệnh, cảnh báo trễ xuất phát')
    .addTag('Transport & Logistics - Vận Tải Xuất Khẩu Chuối & Tuyến Đối Lưu 2 Chiều', 'Vận chuyển chuối Dole & hàng đối lưu NPK chiều về')
    .addTag('Internal Feed - Vận Chuyển Thức Ăn Bò & Kiểm Soát SLA 3 Đúng', 'Vận chuyển phụ phẩm/TMR, nguyên liệu linh hoạt, SLA 3 Đúng')
    .addTag('Fuel Management - Quản Lý Kho Bồn Dầu DO & Cấp Phát QR', 'Kho bồn 45.000L & xe bồn 5.000L, quét QR cấp dầu, đối soát định mức')
    .addTag('Maintenance 250h - Bảo Dưỡng Định Kỳ, 12 Checklist & Nợ Phụ Tùng', 'Nhắc lịch 3 mốc, 12 checklist, liên thông sửa chữa #SC')
    .addTag('Repairs & Workshop - Xưởng Sửa Chữa TT BTSC & Cứu Hộ Hiện Trường', 'Tiếp nhận sửa chữa, phân cấp tiểu/trung/đại tu, xử lý SOS')
    .addTag('Driver KPI - Đánh Giá Năng Suất & Thi Đua Tài Xế', 'Chấm điểm 4 tiêu chí 25%, xếp hạng thi đua Hạng A/B/C/D')
    .addTag('Dashboard - Báo Cáo Hợp Nhất Ban Lãnh Đạo', '5 thẻ KPI Cards, bản đồ vệ tinh Live Fleet toàn KLH')
    .addTag('Mobile Driver App - API Ứng Dụng Di Động Dành Cho Tài Xế', 'API chuyên biệt cho Smartphone tài xế cơ giới')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'THACO AGRI - API Swagger Docs',
    customCss: '.swagger-ui .topbar { background-color: #14532d; }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`=======================================================`);
  console.log(`🚀 THACO AGRI Backend API Server: http://localhost:${port}/api`);
  console.log(`📚 Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  console.log(`=======================================================`);
}

bootstrap();
