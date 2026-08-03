import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常。
 *
 * 用于携带 5 位业务错误码（>= 10000）与对应的 HTTP 状态码。
 *
 * 继承自 HttpException，因此：
 *   - 任意捕获 HttpException 的路由级/模块级 filter 都能识别它，
 *     `getStatus()` 返回 httpStatus，不会漏成 500；
 *   - AllExceptionFilter 通过 instanceof BizException 优先分支
 *     将其封套为 `{ code: bizCode, message, data? }`，HTTP 状态由 header 表达。
 *
 * `getResponse()` 返回统一封套形状的对象，即便被仅识别 HttpException
 * 的过滤器接管，响应体仍携带业务码，而不会丢失业务语义。
 *
 * 业务码分段见 packages/shared/src/contracts/api-response.ts。
 */
export class BizException extends HttpException {
  readonly bizCode: number;
  readonly details?: unknown;

  constructor(
    bizCode: number,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    // response 直接采用统一封套形状，使仅识别 HttpException 的过滤器也能拿到业务码
    super(
      {
        code: bizCode,
        message,
        ...(details !== undefined && { data: details }),
      },
      httpStatus,
    );
    this.name = 'BizException';

    if (bizCode < 10000) {
      throw new Error(
        `BizException bizCode 必须 >= 10000（收到 ${bizCode}），以避免与 HTTP 状态码冲突`,
      );
    }

    this.bizCode = bizCode;
    this.details = details;
  }
}
