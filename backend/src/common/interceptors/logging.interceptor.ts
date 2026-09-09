import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          // Chỉ in log khi bật HTTP_VERBOSE_LOG=true để tránh tràn terminal khi chạy bình thường
          if (process.env.HTTP_VERBOSE_LOG === 'true') {
            const response = context.switchToHttp().getResponse();
            const { statusCode } = response;
            const delay = Date.now() - now;
            this.logger.log(`[${method}] ${url} ${statusCode} - ${delay}ms`);
          }
        },
        error: (err) => {
          // Luôn ghi log rõ ràng khi có lỗi xảy ra
          const delay = Date.now() - now;
          const status = err?.status || err?.statusCode || 500;
          this.logger.error(`[${method}] ${url} ${status} - ${delay}ms: ${err?.message || 'Lỗi xử lý request'}`);
        },
      }),
    );
  }
}
