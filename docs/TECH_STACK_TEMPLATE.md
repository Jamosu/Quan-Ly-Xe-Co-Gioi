# 🚀 FULL-STACK BOILERPLATE TEMPLATE (TypeScript + React + NestJS + MySQL)

Tài liệu này tổng hợp toàn bộ Kiến trúc, Danh mục Thư viện (Dependencies), Cấu trúc thư mục và File cấu hình mẫu để bạn có thể sao chép và khởi tạo nhanh một dự án mới tương tự.

---

## 📌 1. TỔNG QUAN CÔNG NGHỆ (TECH STACK)

| Thành phần | Công nghệ / Thư viện | Phiên bản khuyến nghị | Vai trò |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ chung** | **TypeScript** | `^5.x` | Toàn bộ Frontend & Backend |
| **Frontend Framework** | **React** (SPA) | `^18.2.0` | Xây dựng giao diện người dùng |
| **Frontend Bundler** | **Vite** | `^5.0.0` | Máy chủ Dev & đóng gói siêu tốc |
| **CSS Framework** | **Tailwind CSS** | `^3.3.0` | Thiết kế giao diện Utility-first |
| **Client State** | **Zustand** | `^4.4.0` | Quản lý Auth Store, Cart Store (hỗ trợ persist) |
| **Server State** | **@tanstack/react-query** | `^5.14.0` | Caching, sync dữ liệu API, background refetch |
| **Client Routing** | **react-router-dom** | `^6.20.0` | Điều hướng trang & bảo vệ Route (Guards) |
| **Icons & Charts** | **lucide-react**, **recharts**| Mới nhất | Icon trực quan & biểu đồ thống kê |
| **Mobile & Media** | **jsQR**, **tesseract.js** | Mới nhất | Quét QR Code & Nhận diện chữ OCR từ ảnh |
| **Backend Framework** | **NestJS** | `^10.0.0` | Kiến trúc MVC Modular (Controllers, Services) |
| **ORM** | **Prisma ORM** | `^5.7.0` | Quản lý Database Schema & Type-safe query |
| **Database** | **MySQL** / MariaDB | `^8.0` / `^10.x` | Cơ sở dữ liệu quan hệ |
| **Authentication** | **Passport-JWT**, **Bcrypt** | Mới nhất | Xác thực Token JWT & Mã hóa mật khẩu |
| **Validation** | **class-validator**, **class-transformer** | Mới nhất | Kiểm tra và chuẩn hóa DTO |
| **API Docs** | **@nestjs/swagger** | `^7.1.0` | Tự động tạo Swagger UI tương tác tại `/api/docs` |

---

## 📁 2. CẤU TRÚC THƯ MỤC CHUẨN (PROJECT DIRECTORY)

```
my-new-project/
├── package.json                   # Root package điều phối chạy song song
├── .env.example                   # File mẫu biến môi trường
├── backend/                       # NestJS API Server
│   ├── prisma/
│   │   ├── schema.prisma          # Database Schema
│   │   └── seed.ts                # Dữ liệu mẫu ban đầu
│   ├── src/
│   │   ├── auth/                  # Module Đăng nhập / Phân quyền (JWT)
│   │   ├── users/                 # Module Quản lý người dùng
│   │   ├── prisma/                # Prisma Service kết nối DB
│   │   ├── uploads/               # Xử lý upload file / ảnh
│   │   ├── app.module.ts          # Root Module
│   │   └── main.ts                # Điểm khởi chạy NestJS (CORS, Swagger, Pipe)
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── package.json
└── frontend/                      # React + Vite Client
    ├── public/
    ├── src/
    │   ├── api/                   # Cấu hình Axios Client
    │   ├── components/            # UI Components dùng chung
    │   ├── layouts/               # Layout Client / Layout Admin
    │   ├── pages/                 # Các trang giao diện
    │   ├── store/                 # Zustand Stores (authStore, cartStore)
    │   ├── types/                 # Type Definitions chung
    │   ├── App.tsx                # Định nghĩa Router
    │   ├── index.css              # Custom Tailwind CSS
    │   └── main.tsx               # Điểm khởi chạy React
    ├── index.html
    ├── vite.config.ts             # Cấu hình Vite & Proxy API
    ├── tailwind.config.js         # Cấu hình Theme màu & Fonts
    ├── tsconfig.json
    └── package.json
```

---

## 📦 3. DANH MỤC PACKAGE.JSON MẪU (COPY & PASTE)

### 3.1. Root `package.json`
```json
{
  "name": "project-root",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "npx -y concurrently -k -p \"[{name}]\" -n \"Backend,Frontend\" -c \"cyan.bold,yellow.bold\" \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "dev:backend": "npm run dev --prefix backend",
    "dev:frontend": "npm run dev --prefix frontend",
    "db:migrate": "npm run prisma:migrate --prefix backend",
    "db:seed": "npm run prisma:seed --prefix backend"
  }
}
```

### 3.2. Backend `backend/package.json`
```json
{
  "name": "backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\"",
    "dev": "nest start --watch",
    "start:prod": "node dist/main",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/serve-static": "^4.0.0",
    "@nestjs/swagger": "^7.1.17",
    "@prisma/client": "^5.7.1",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "cookie-parser": "^1.4.7",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^4.17.17",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^4.0.0",
    "prisma": "^5.7.1",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  }
}
```

### 3.3. Frontend `frontend/package.json`
```json
{
  "name": "frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.14.2",
    "axios": "^1.6.2",
    "clsx": "^2.0.0",
    "jsqr": "^1.4.0",
    "lucide-react": "^0.294.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "recharts": "^2.10.3",
    "tailwind-merge": "^2.1.0",
    "tesseract.js": "^5.0.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

---

## ⚙️ 4. CÁC FILE CẤU HÌNH QUAN TRỌNG

### 4.1. `frontend/vite.config.ts` (Hỗ trợ Alias `@` và Reverse Proxy API)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

### 4.2. `frontend/tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F5F2A',
          dark: '#0A431E',
          light: '#E7F1EA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
    },
  },
  plugins: [],
};
```

### 4.3. `backend/src/main.ts` (Khởi chạy NestJS + Swagger + Validation + Cookie)
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Backend REST API Specifications')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API Server: http://localhost:${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
```

### 4.4. `backend/prisma/schema.prisma` (Base Prisma Template)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  fullName  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🚀 5. HƯỚNG DẪN TẠO DỰ ÁN MỚI TỪ ĐẦU (QUICK START GUIDE)

### Bước 1: Tạo thư mục dự án
```bash
mkdir my-new-project && cd my-new-project
npm init -y
```

### Bước 2: Tạo Backend (NestJS + Prisma)
```bash
npx @nestjs/cli new backend --package-manager npm --skip-git
cd backend
npm install @prisma/client @nestjs/swagger @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer cookie-parser @nestjs/config
npm install -D prisma @types/bcrypt @types/cookie-parser @types/passport-jwt @types/multer
npx prisma init
cd ..
```

### Bước 3: Tạo Frontend (React + Vite + Tailwind)
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @tanstack/react-query axios zustand react-router-dom lucide-react recharts clsx tailwind-merge jsqr tesseract.js
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
cd ..
```

### Bước 4: Chạy toàn bộ hệ thống
```bash
# Ở thư mục root:
npm run dev
# -> Frontend: http://localhost:5173
# -> Backend:  http://localhost:3001
# -> Swagger:  http://localhost:3001/api/docs
```
