import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseFormat<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseFormat<T> | T> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // File responses must stay as raw streams. Wrapping StreamableFile in the
        // standard JSON envelope corrupts the downloaded workbook.
        if (data instanceof StreamableFile) {
          return data;
        }

        // Nếu trả về trực tiếp định dạng custom có success
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return {
            statusCode,
            timestamp: new Date().toISOString(),
            ...data,
          };
        }

        return {
          success: true,
          statusCode,
          message: 'Thao tác thành công',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
