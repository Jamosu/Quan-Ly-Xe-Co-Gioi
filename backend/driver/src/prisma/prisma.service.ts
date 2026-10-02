import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // Chỉ in log truy vấn khi cấu hình PRISMA_LOG_QUERY=true, bình thường chỉ log 'warn' và 'error' để tránh làm tràn terminal
      log: process.env.PRISMA_LOG_QUERY === 'true' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error: any) {
      console.warn('⚠️ [PrismaService] Chưa thể kết nối ngay tới MySQL Database. Hãy đảm bảo dịch vụ MySQL đang hoạt động tại ' + (process.env.DATABASE_URL || 'localhost:3306'));
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
