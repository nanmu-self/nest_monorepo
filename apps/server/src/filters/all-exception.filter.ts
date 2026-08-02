import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { BizException } from '@/common/biz-exception';

/**
 * Prisma 已知错误码格式：P + 4 位数字（如 P2002、P2025）。
 *
 * 不能用 `'code' in exception` 判定——Node.js 系统错误全都有 .code
 * （ENOENT / ECONNREFUSED / ETIMEDOUT / ENOTFOUND ...），会被误判为
 * 数据库错误并吞掉 instanceof Error 分支的堆栈日志。
 */
const PRISMA_CODE_RE = /^P\d{4}$/;

function isPrismaKnownError(
  exception: unknown,
): exception is { code: string; meta?: Record<string, unknown> } {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'code' in exception &&
    typeof (exception as { code: unknown }).code === 'string' &&
    PRISMA_CODE_RE.test((exception as { code: string }).code)
  );
}

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
    // 业务码：BizException 时设置（>= 10000），否则响应体 code 取 httpStatus
    let bizCode: number | undefined;

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
    // 处理业务异常：code 取业务码（>= 10000），HTTP 状态由 header 表达
    else if (exception instanceof BizException) {
      httpStatus = exception.httpStatus;
      bizCode = exception.bizCode;
      message = exception.message;
      details = exception.details;
      this.logger.warn(`Business error [${exception.bizCode}]: ${exception.message}`);
    }
    // 处理 Prisma 已知错误（P2002 唯一约束冲突、P2025 记录未找到等）
    else if (isPrismaKnownError(exception)) {
      switch (exception.code) {
        case 'P2002': // 唯一约束冲突
          httpStatus = HttpStatus.CONFLICT;
          message = 'Unique constraint violation';
          details = {
            fields: exception.meta?.target,
          };
          break;
        case 'P2025': // 记录未找到
          httpStatus = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        default:
          message = 'Database error';
      }

      this.logger.error(`Prisma error: ${exception.code} - ${JSON.stringify(exception.meta)}`);
    }
    // 处理普通 Error
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unexpected error: ${exception.message}`, exception.stack);
    }
    // 其他未知异常
    else {
      this.logger.error(`Unknown exception type: ${typeof exception}`);
    }

    // 生产环境隐藏 500 错误的详细信息
    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR && process.env.NODE_ENV === 'production') {
      message = 'Internal Server Error';
      details = undefined;
    }

    // 记录请求日志
    this.logger.warn(`[${httpStatus}] ${request.method} ${request.url} - ${message}`);

    const responseBody: {
      code: number;
      message: string;
      data?: unknown;
    } = {
      code: bizCode ?? httpStatus,
      message,
    };

    // 有详情时返回，无则省略（保持响应简洁）
    if (details) {
      responseBody.data = details;
    }

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
