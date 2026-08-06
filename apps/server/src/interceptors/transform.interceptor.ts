import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { ApiResponse } from '@short-link/shared';

/**
 * 统一成功响应封套拦截器。
 *
 * 把所有 controller 返回值包装成 `{ code: 0, data: T, message: 'ok' }`，
 * 与前端 createHttp 的 onSuccess 解封套逻辑配合。
 *
 * 注意：
 *   - 错误响应由 AllExceptionFilter 统一封套为 `{ code, message, data }`，不走此拦截器
 *   - 若返回值已是 ApiResponse 形状（含 code/data/message），不再二次包装
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // 已是封套形状则原样返回，避免二次包装。
        // duck-typing 收紧到 code:number + message:string，降低业务对象
        // 恰好含 code/data/message 三字段时的误判概率。
        if (
          data &&
          typeof data === 'object' &&
          typeof (data as Record<string, unknown>).code === 'number' &&
          typeof (data as Record<string, unknown>).message === 'string' &&
          'data' in data
        ) {
          return data as ApiResponse<T>;
        }
        return { code: 0, data, message: 'ok' };
      }),
    );
  }
}
