import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

/**
 * 统一错误响应封套。
 *
 * 捕获所有异常，转换为与成功响应一致的格式：
 * { code: number, message: string, data?: any }
 *
 * code 取值：
 * - HTTP 状态码（400, 401, 403, 404, 500 等）
 * - 0 = 成功（不走此过滤器）
 *
 * 与前端 @short-link/shared/http 的错误处理逻辑配合。
 */
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    // 默认 500 错误
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let details: unknown = undefined;

    // 处理 NestJS HttpException
    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // ValidationPipe 抛出的错误是对象 { message: string[], error: string }
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;

        // 数组消息（如校验错误多条）拼接为字符串
        if (Array.isArray(res.message)) {
          message = res.message.join('; ');
        } else if (typeof res.message === 'string') {
          message = res.message;
        }

        // 保留原始错误详情
        details = exceptionResponse;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = exception.message;
      }
    }
    // 处理 Prisma 已知错误（可扩展更多 Prisma 错误码）
    else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception
    ) {
      const prismaError = exception as Record<string, unknown>;

      // Prisma 错误码映射
      switch (prismaError.code) {
        case 'P2002': // 唯一约束冲突
          httpStatus = HttpStatus.CONFLICT;
          message = 'Unique constraint violation';
          details = {
            fields: (prismaError.meta as Record<string, unknown>)?.target,
          };
          break;
        case 'P2025': // 记录未找到
          httpStatus = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        default:
          message = 'Database error';
      }

      this.logger.error(
        `Prisma error: ${prismaError.code} - ${JSON.stringify(prismaError.meta)}`,
      );
    }
    // 处理普通 Error
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
      );
    }
    // 其他未知异常
    else {
      this.logger.error(`Unknown exception type: ${typeof exception}`);
    }

    // 生产环境隐藏 500 错误的详细信息
    if (
      httpStatus === HttpStatus.INTERNAL_SERVER_ERROR &&
      process.env.NODE_ENV === 'production'
    ) {
      message = 'Internal Server Error';
      details = undefined;
    }

    // 记录请求日志
    this.logger.warn(
      `[${httpStatus}] ${request.method} ${request.url} - ${message}`,
    );

    const responseBody: {
      code: number;
      message: string;
      data?: unknown;
    } = {
      code: httpStatus,
      message,
    };

    // 有详情时返回，无则省略（保持响应简洁）
    if (details) {
      responseBody.data = details;
    }

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
