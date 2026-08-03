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
import { IS_PRODUCTION } from '@/config/env';

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
 * code 取值（命名空间见 @short-link/shared 的 ApiResponse）：
 * - HTTP 状态码（400, 401, 403, 404, 500 等）：HttpException / Prisma 错误 / 未知 Error
 * - >= 10000：业务错误码，由 BizException 携带，HTTP 状态仍由 header 表达
 * - 0 = 成功（走 TransformInterceptor，不走此过滤器）
 *
 * 与前端 @short-link/shared/http 的错误处理逻辑配合。
 *
 * 日志约定：每个异常只输出一行，包含状态码、业务码、请求方法/路径、
 * 错误原文与分类上下文，便于日志聚合与告警关联。
 * 5xx 用 error 级别并附堆栈，4xx 用 warn 级别不带堆栈。
 * 日志中的 message 始终是脱敏前的原文，与响应体可能不同。
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
    // 仅用于日志的补充上下文（如 Prisma 错误码、异常类型），不进入响应体
    let logContext: string | undefined;
    // 堆栈仅在 5xx 时输出，4xx 属于客户端问题、堆栈是噪音
    let stack: string | undefined;

    // 各分支只做「分类」，不打日志——日志在方法末尾统一输出一行，
    // 避免同一个错误分散成多行、无法关联聚合。
    //
    // 处理业务异常：必须在 HttpException 之前（BizException 继承自 HttpException）。
    // code 取业务码（>= 10000），HTTP 状态由 header 表达。
    if (exception instanceof BizException) {
      httpStatus = exception.getStatus();
      bizCode = exception.bizCode;
      message = exception.message;
      details = exception.details;
    }
    // 处理 NestJS HttpException
    else if (exception instanceof HttpException) {
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

      // 显式抛出的 5xx（如 InternalServerErrorException）保留堆栈
      if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) {
        stack = exception.stack;
      }
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
          // 未识别的 Prisma 码会落到 500，保留堆栈用于定位
          stack = exception instanceof Error ? exception.stack : undefined;
      }

      logContext = `prisma=${exception.code} meta=${JSON.stringify(exception.meta)}`;
    }
    // 处理普通 Error
    else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
      logContext = `type=${exception.name}`;
    }
    // 其他未知异常
    else {
      logContext = `type=${typeof exception} raw=${String(exception)}`;
    }

    // 真实错误信息，在生产脱敏前留存，保证日志始终记录可诊断的原文
    const logMessage = message;

    // 生产环境隐藏 500 错误的详细信息
    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR && IS_PRODUCTION) {
      message = 'Internal Server Error';
      details = undefined;
    }

    // 统一输出单行日志：一个错误一条记录，便于聚合与告警。
    // 5xx 用 error（带堆栈），4xx 用 warn（客户端问题，不需要堆栈噪音）。
    const logLine = [
      `[${httpStatus}]`,
      bizCode !== undefined ? `biz=${bizCode}` : undefined,
      `${request.method} ${request.url}`,
      `- ${logMessage}`,
      logContext,
    ]
      .filter(Boolean)
      .join(' ');

    if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logLine, stack);
    } else {
      this.logger.warn(logLine);
    }

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
