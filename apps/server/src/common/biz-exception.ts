import { HttpStatus } from '@nestjs/common';

/**
 * 业务异常。
 *
 * 用于携带 5 位业务错误码（>= 10000）与对应的 HTTP 状态码。
 * AllExceptionFilter 会将其封套为 `{ code: bizCode, message, data? }`，
 * HTTP 响应头的状态码由 httpStatus 控制。
 *
 * 与 HttpException 的区别：
 *   - HttpException 的 code 字段直接取 HTTP 状态码（4xx/5xx），属于传输层语义
 *   - BizException 的 code 字段是业务码（>= 10000），HTTP 状态仅在 header 表达
 *
 * 业务码分段见 packages/shared/src/contracts/api-response.ts。
 */
export class BizException extends Error {
  readonly bizCode: number;
  readonly httpStatus: HttpStatus;
  readonly details?: unknown;

  constructor(
    bizCode: number,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super(message);
    this.name = 'BizException';

    if (bizCode < 10000) {
      throw new Error(
        `BizException bizCode 必须 >= 10000（收到 ${bizCode}），以避免与 HTTP 状态码冲突`,
      );
    }

    this.bizCode = bizCode;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}